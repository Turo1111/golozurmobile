import { bounded, pause, PrintingError } from './printingOperation';
import { assertA1Ready, commandPacket, createMXW01ReceiveDecoder, decodeCanonicalNotificationValue, isObservedUnverifiedAACompletionSignal, orientAndPadRaster, printRequest } from './mxw01Protocol';
import { createA9EvidenceCollector, publishA9Evidence } from './mxw01A9Evidence';

const UNVERIFIED_AA_COMPLETION = Symbol('unverified-aa-completion');

// Transport is injected so ordering and cleanup can be tested without native hardware.
export const runMXW01Session = async (transport, raster, token, limits = {}, onA9Evidence) => {
  const responseMs = limits.responseMs ?? 5000;
  const a9ReceiveMs = limits.a9ReceiveMs ?? responseMs; // Reply-only override; all control writes retain responseMs.
  const transferMs = limits.transferMs ?? 120000;
  const completionMs = limits.completionMs ?? 45000;
  const paceMs = limits.paceMs ?? 25;
  const image = orientAndPadRaster(raster);
  const chunkSize = Math.min(48, Math.floor(transport.mtu) - 3);
  if (!Number.isInteger(transport.mtu) || transport.mtu > 517 || chunkSize < 20) throw new PrintingError('mtu', 'Invalid Bluetooth MTU. Reconnect the printer.');
  if (Math.ceil(image.length / chunkSize) * paceMs >= transferMs) {
    throw new PrintingError('raster', 'This receipt is too long for the negotiated Bluetooth speed. Reduce text size or split the sale.');
  }
  const waiters = new Map();
  let closed = false;
  let imageTransferResolved = false;
  let adWriteAttempted = false;
  let adWriteResolved = false;
  let exactUnverifiedAACandidate = false;
  let aaTimeoutAfterQueuedSend = false;
  let removeMonitor = () => {};
  const evidence = typeof onA9Evidence === 'function' ? createA9EvidenceCollector(transport.mtu) : null;
  const waitFor = (command, timeout) => {
    let resolve;
    let reject;
    const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
    waiters.set(command, { resolve, reject });
    if (command === 0xaa) evidence?.aaWaitStarted(Date.now() + timeout); // Marker only; enrollment/timer unchanged.
    const promise = bounded(
      pending, timeout, token, `MXW01 ${command.toString(16).toUpperCase()} notification`,
      command === 0xaa ? (error, source) => {
        // Error code alone is ambiguous: only this bound's own timer authorizes the unconfirmed result.
        if (source === 'deadline' && error.code === 'timeout' && imageTransferResolved && adWriteResolved) {
          aaTimeoutAfterQueuedSend = true;
          evidence?.sentUnconfirmed(); // Settlement-time gate: never convert partial image or unqueued AD.
        } else evidence?.closingFailed('aa-wait', error);
      } : undefined, // A1/A9 expiry can still admit compatibility.
    ).finally(() => waiters.delete(command));
    // A completion wait may reject while a write is in progress. Consume it now too.
    promise.catch(() => {});
    return promise;
  };
  const receive = createMXW01ReceiveDecoder((packet) => {
    if (!closed) {
      if (packet.command === 0xa9) evidence?.receivedA9(packet);
      if (packet.command === 0xaa && !token.error) evidence?.receivedAA(waiters.has(0xaa));
      waiters.get(packet.command)?.resolve([0xa1, 0xa9].includes(packet.command) ? packet : packet.payload);
    }
  });
  const send = (packet) => bounded(transport.writeControl(packet), responseMs, token, 'Printer command', evidence?.fail);
  const fail = (error) => {
    if (closed) return;
    token.cancel(error instanceof PrintingError ? error : new PrintingError(
      'connection', 'Bluetooth disconnected. Keep the printer nearby and close other printer apps. Check the paper before retrying.',
    ));
  };
  try {
    token.check();
    const rawObserver = (value, error) => {
      if (closed || token.error) return;
      const bytes = error ? null : decodeCanonicalNotificationValue(value);
      if (bytes && isObservedUnverifiedAACompletionSignal(bytes) && imageTransferResolved && adWriteAttempted && waiters.has(0xaa)) {
        exactUnverifiedAACandidate = true;
        if (adWriteResolved) waiters.get(0xaa)?.resolve(UNVERIFIED_AA_COMPLETION);
      }
      evidence?.observe(value, error, waiters.has(0xaa));
    };
    removeMonitor = transport.monitor(receive.push, fail, () => { receive.invalidateA1Fallback(); receive.invalidateA9Fallback(); }, rawObserver, evidence?.cause);
    // BLE PLX has no CCCD-ready promise. Allow setup time; the status exchange then
    // proves notifications are working. A lost status aborts (never retransmits).
    await pause(limits.setupMs ?? 250, token);
    receive.beginA1(Date.now() + responseMs);
    let statusPacket;
    try {
      const reply = waitFor(0xa1, responseMs);
      await send(commandPacket(0xa1)); // Failed/unqueued writes never trigger compatibility.
      try { statusPacket = await reply; }
      catch (error) {
        if (error.code !== 'timeout' || token.error) throw error;
        statusPacket = receive.resolveObservedA1();
        if (!statusPacket) throw error;
      }
    } finally { receive.endA1(); }
    assertA1Ready(statusPacket);
    evidence?.a1Passed();
    await send(commandPacket(0xa2, new Uint8Array([0x5d])));
    evidence?.begin(a9ReceiveMs);
    receive.beginA9(Date.now() + a9ReceiveMs);
    let ackPacket;
    try {
      const reply = waitFor(0xa9, a9ReceiveMs); // Register before the SAME single request.
      await send(printRequest(raster.height)); // Failed/unqueued/hung writes cannot fall back.
      evidence?.queued();
      try { ackPacket = await reply; }
      catch (error) {
        if (error.code !== 'timeout' || token.error) throw error;
        ackPacket = receive.resolveObservedA9();
        if (!ackPacket) throw error;
      }
    } finally { receive.endA9(); }
    const ack = ackPacket.payload;
    if (ack.length !== 1 || ack[0] !== 0) throw new PrintingError('rejected', 'MXW01 rejected the print request. Check paper, battery and printer state.');
    evidence?.accepted(ackPacket);
    const deadline = Date.now() + transferMs;
    evidence?.transferWindow(deadline);
    let complete;
    for (let offset = 0; offset < image.length; offset += chunkSize) {
      token.check();
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new PrintingError('timeout', 'Image transfer timed out. Check the paper before retrying.');
      // Some firmware can notify as soon as the last data write arrives, before AD.
      if (offset + chunkSize >= image.length) complete = waitFor(0xaa, completionMs + responseMs + paceMs);
      const chunk = image.slice(offset, offset + chunkSize);
      evidence?.imageAttempted();
      let write;
      try { write = transport.writeData(chunk); }
      catch (error) { if (!token.error) evidence?.cause('image-write', error); throw error; }
      // Observe the original queue Promise, never replace it or await an observer.
      if (evidence) Promise.resolve(write).then(
        () => { if (!closed && !token.error) evidence.imageResolved(chunk.length); },
        (error) => { if (!closed && !token.error) evidence.cause('image-write', error); },
      ).catch(() => {});
      await bounded(write, Math.min(responseMs, remaining), token, 'Image transfer', evidence?.fail);
      await pause(paceMs, token); // Sequential, paced writes; never an unbounded queue.
      if (Date.now() >= deadline) throw new PrintingError('timeout', 'Image transfer timed out. Check the paper before retrying.');
    }
    imageTransferResolved = true;
    evidence?.completionStarted();
    evidence?.adAttempted();
    adWriteAttempted = true;
    let finalWrite;
    try { finalWrite = transport.writeControl(commandPacket(0xad)); }
    catch (error) { evidence?.closingFailed('final-command', error); throw error; }
    if (evidence) Promise.resolve(finalWrite).then(
      () => { if (!closed && !token.error) evidence.adQueued(); },
      () => {},
    ).catch(() => {});
    await bounded(finalWrite, responseMs, token, 'Printer command', evidence ? (error) => evidence.closingFailed('final-command', error) : undefined);
    adWriteResolved = true;
    evidence?.adQueued();
    if (exactUnverifiedAACandidate) waiters.get(0xaa)?.resolve(UNVERIFIED_AA_COMPLETION);
    let result;
    try { result = await complete; }
    catch (error) {
      if (aaTimeoutAfterQueuedSend && error.code === 'timeout' && imageTransferResolved && adWriteResolved) {
        return { status: 'sent-unconfirmed', transport: 'mxw01', a1Variant: statusPacket.variant, a1Integrity: statusPacket.integrity,
          a9Variant: ackPacket.variant, a9Integrity: ackPacket.integrity, paperPresence: 'unknown' };
      }
      throw error;
    }
    if (result === UNVERIFIED_AA_COMPLETION) {
      evidence?.sentUnconfirmed();
      return { status: 'sent-unconfirmed', transport: 'mxw01', a1Variant: statusPacket.variant, a1Integrity: statusPacket.integrity,
        a9Variant: ackPacket.variant, a9Integrity: ackPacket.integrity, paperPresence: 'unknown', completionSignal: 'observed-aa-shape' };
    }
    // AA payload meaning is undocumented; accept only an empty or single zero payload.
    if (result.length > 1 || (result.length === 1 && result[0] !== 0)) {
      throw new PrintingError('completion', 'Unrecognized completion status. Check the paper; do not assume the receipt printed.');
    }
    token.check();
    evidence?.completed();
    return { status: 'printed', transport: 'mxw01', a1Variant: statusPacket.variant, a1Integrity: statusPacket.integrity, a9Variant: ackPacket.variant, a9Integrity: ackPacket.integrity, paperPresence: 'unknown' };
  } catch (error) {
    evidence?.fail(error);
    throw error;
  } finally {
    closed = true;
    receive.endA1();
    receive.endA9();
    waiters.forEach(({ reject }) => reject(new PrintingError('cancelled', 'Printer session ended.')));
    waiters.clear();
    try { removeMonitor(); }
    finally { if (evidence) publishA9Evidence(onA9Evidence, evidence.finish()); }
  }
};
