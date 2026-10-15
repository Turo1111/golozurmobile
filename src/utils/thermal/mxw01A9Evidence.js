import { decodeCanonicalNotificationValue, MXW01_MAX_HEIGHT, MXW01_ROW_BYTES, parseNotification, parseObservedShortA9 } from './mxw01Protocol';
import { A1_DIAGNOSTIC_LIMITS, safeA1ErrorCode } from './mxw01Diagnostic';

const limits = A1_DIAGNOSTIC_LIMITS;
const phases = new Set(['before-a9', 'a9-wait', 'transfer', 'completion']);
const extraErrors = new Set(['rejected', 'completion', 'raster', 'renderer', 'data', 'rawbt']);
const classifications = new Set(['subscription-error', 'invalid-base64', 'empty-value', 'truncated-input', 'incomplete-frame', 'framing-rejected', 'length-rejected', 'extra-bytes', 'footer-rejected', 'crc-rejected', 'strict-other-command', 'strict-a9-zero', 'strict-a9-rejected', 'observed-a9-candidate', 'strict-aa-zero', 'strict-aa-empty', 'strict-aa-other-payload']);
const closingStages = new Set(['transfer', 'completion']);
const closingScopes = new Set(['final-command', 'aa-wait']);
const isA9ReplySample = (sample) => ['strict-a9-zero', 'observed-a9-candidate'].includes(sample.classification);
const integer = (value, max) => Number.isInteger(value) && value >= 0 ? Math.min(value, max) : 0;
const errorCode = (error) => extraErrors.has(error?.code) ? error.code : safeA1ErrorCode(error);
export const TRANSFER_TELEMETRY_LIMITS = Object.freeze({ writes: 65535, bytes: MXW01_MAX_HEIGHT * MXW01_ROW_BYTES, elapsedMs: 120000 });
const failureOrigins = new Set(['preflight', 'monitor', 'disconnect', 'image-write', 'control-write', 'timeout', 'cancelled', 'foreground', 'validation', 'session']);
const publicNativeCode = (error) => {
  const code = safeA1ErrorCode({ errorCode: error?.errorCode });
  return /^ble-\d{1,3}$/.test(code) ? Number(code.slice(4)) : null;
};

export const createA9EvidenceReport = () => ({
  phase: 'before-a9', mtu: null, receiveWindowMs: 0, a1Passed: false,
  a9Attempted: false, a9WriteQueued: false, a9AckAccepted: false,
  imageTransferStarted: false, completionValidated: false,
  rawCallbacks: 0, callbacksSaturated: false, samples: [], errorCode: null,
  attemptEnded: false, printResult: null,
  a9Variant: null, a9Integrity: null, a9Provenance: null,
  failureOrigin: null, nativeErrorCode: null,
  imageWriteAttempts: 0, imageWritesResolved: 0, imageBytesQueued: 0,
  rawA9AckToFirstImageWriteMs: null,
  adWriteAttempted: false, adWriteQueued: false, closingFailureScope: null,
  aaWaitRegistered: false, aaBeforeWaitObserved: false,
  closingRawCallbacks: 0, closingCallbacksSaturated: false,
});

export const projectA9Evidence = (report) => ({
  phase: phases.has(report?.phase) ? report.phase : 'before-a9',
  mtu: Number.isInteger(report?.mtu) && report.mtu >= 23 && report.mtu <= 517 ? report.mtu : null,
  receiveWindowMs: integer(report?.receiveWindowMs, limits.windowMs),
  a1Passed: report?.a1Passed === true, a9Attempted: report?.a9Attempted === true,
  a9WriteQueued: report?.a9WriteQueued === true, a9AckAccepted: report?.a9AckAccepted === true,
  a9Variant: ['strict-crc', 'observed-short8'].includes(report?.a9Variant) ? report.a9Variant : null,
  a9Integrity: ['crc-verified', 'unverified'].includes(report?.a9Integrity) ? report.a9Integrity : null,
  a9Provenance: ['strict-framing', 'user-a9-capture'].includes(report?.a9Provenance) ? report.a9Provenance : null,
  failureOrigin: failureOrigins.has(report?.failureOrigin) ? report.failureOrigin : null,
  nativeErrorCode: publicNativeCode({ errorCode: report?.nativeErrorCode }),
  imageWriteAttempts: integer(report?.imageWriteAttempts, TRANSFER_TELEMETRY_LIMITS.writes),
  imageWritesResolved: integer(report?.imageWritesResolved, TRANSFER_TELEMETRY_LIMITS.writes),
  imageBytesQueued: integer(report?.imageBytesQueued, TRANSFER_TELEMETRY_LIMITS.bytes),
  rawA9AckToFirstImageWriteMs: Number.isInteger(report?.rawA9AckToFirstImageWriteMs) && report.rawA9AckToFirstImageWriteMs >= 0
    ? Math.min(report.rawA9AckToFirstImageWriteMs, TRANSFER_TELEMETRY_LIMITS.elapsedMs) : null,
  imageTransferStarted: report?.imageTransferStarted === true, completionValidated: report?.completionValidated === true,
  adWriteAttempted: report?.adWriteAttempted === true, adWriteQueued: report?.adWriteQueued === true,
  closingFailureScope: closingScopes.has(report?.closingFailureScope) ? report.closingFailureScope : null,
  aaWaitRegistered: report?.aaWaitRegistered === true, aaBeforeWaitObserved: report?.aaBeforeWaitObserved === true,
  closingRawCallbacks: integer(report?.closingRawCallbacks, limits.callbacks), closingCallbacksSaturated: report?.closingCallbacksSaturated === true,
  rawCallbacks: integer(report?.rawCallbacks, limits.callbacks), callbacksSaturated: report?.callbacksSaturated === true,
  samples: (Array.isArray(report?.samples) ? report.samples.slice(0, limits.samples) : []).map((sample) => ({
    inputChars: integer(sample?.inputChars, 65535), decodedBytes: integer(sample?.decodedBytes, limits.bytes),
    truncated: sample?.truncated === true,
    classification: classifications.has(sample?.classification) ? sample.classification : 'invalid-base64',
    stage: ['a9-wait', 'transfer', 'completion'].includes(sample?.stage) ? sample.stage : 'a9-wait',
    aaWaitRegistered: sample?.aaWaitRegistered === true, aaTagged: sample?.aaTagged === true,
    completesStrictAA: sample?.completesStrictAA === true,
    hex: typeof sample?.hex === 'string' && sample.hex.length <= 215 && /^(?:[0-9A-F]{2}(?: [0-9A-F]{2}){0,71})?$/.test(sample.hex) ? sample.hex : '',
  })),
  errorCode: report?.errorCode === null ? null : errorCode({
    code: report?.errorCode,
    errorCode: typeof report?.errorCode === 'string' && /^ble-\d{1,3}$/.test(report.errorCode) ? Number(report.errorCode.slice(4)) : null,
  }),
  attemptEnded: report?.attemptEnded === true,
  printResult: ['printed', 'sent-unconfirmed', 'error', 'omitted'].includes(report?.printResult) ? report.printResult : null,
});

export const publishA9Evidence = (callback, report) => {
  try {
    if (typeof callback === 'function') {
      const result = callback(projectA9Evidence(report));
      if (result && typeof result.then === 'function') Promise.resolve(result).catch(() => {});
    }
  } catch { /* Evidence consumer exceptions must never affect printing or cleanup. */ }
};

export const failedA9Evidence = (error) => {
  const report = createA9EvidenceReport();
  report.errorCode = errorCode(error);
  report.failureOrigin = 'preflight';
  report.nativeErrorCode = publicNativeCode(error);
  report.attemptEnded = true;
  report.printResult = 'error';
  return projectA9Evidence(report);
};

export const formatA9Evidence = (report) => {
  const safe = projectA9Evidence(report);
  return 'PASSIVE A9 + AD/AA closing evidence from ONE synthetic print attempt WITH PAPER.\n' +
    'Capture does not force printing, prevent an already-valid print, or change validation.\n' +
    'A1 passed/write queued/raw callbacks are NOT an ACK. Image data requires an admitted zero ACK: strict CRC or sole observed-short8 at the deadline with UNVERIFIED frame integrity.\n' +
    'The last observed byte is only CRC-consistent; no FF/vendor frame guarantee is claimed. AA remains STRICT and its real format is UNKNOWN.\n' +
    'Image attempts are not resolved writes. Resolved writes/queued bytes mean software queueing ONLY, not peripheral receipt or paper proof. ACK-to-first-write is elapsed RAW reception time, not delayed admission.\n' +
    'AD attempt is not AD queue success or printer receipt. Closing scope records the first failed bound. At most FOUR CONTROL samples TOTAL cover A9/transfer/completion; captured/classified bytes are NOT admitted packets. An early streamed strict AA is only observed, never replayed into a later wait.\n' +
    '`sent-unconfirmed` means every image write and AD write resolved but no valid AA completion was accepted; it may follow the existing AA deadline or the observed 10-byte AA signal shape with two equal dynamic bytes. The signal is unverified and does not establish completion. It is NOT `printed`. No extra wait or automatic retry is added.\n' +
    'If image transfer started, paper may already exist even when AA/completion failed. STOP and inspect before any manual retry.\n' +
    'Paper presence remains UNKNOWN. Copy only this result, not a sale/profile screenshot.\n' + JSON.stringify(safe, null, 2);
};

const sampleValue = (value, error) => {
  const sample = { inputChars: typeof value === 'string' ? Math.min(value.length, 65535) : 0, decodedBytes: 0, truncated: false, classification: 'invalid-base64', hex: '', aaTagged: false, completesStrictAA: false };
  if (error) { sample.classification = 'subscription-error'; return sample; }
  if (typeof value !== 'string') return sample;
  if (!value.length) { sample.classification = 'empty-value'; return sample; }
  sample.truncated = value.length > limits.inputChars;
  const bytes = decodeCanonicalNotificationValue(value.slice(0, limits.inputChars), limits.bytes);
  if (!bytes) return sample;
  sample.decodedBytes = bytes.length;
  sample.aaTagged = bytes.length >= 3 && bytes[0] === 0x22 && bytes[1] === 0x21 && bytes[2] === 0xaa;
  sample.hex = Array.from(bytes, (byte) => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  if (sample.truncated) { sample.classification = 'truncated-input'; return sample; }
  if (parseObservedShortA9(bytes)) { sample.classification = 'observed-a9-candidate'; return sample; }
  const expected = bytes.length >= 6 ? 8 + (bytes[4] | (bytes[5] << 8)) : 8;
  if (bytes.length < 6) sample.classification = 'incomplete-frame';
  else if (bytes[0] !== 0x22 || bytes[1] !== 0x21) sample.classification = 'framing-rejected';
  else if (expected > 72) sample.classification = 'length-rejected';
  else if (bytes.length < expected) sample.classification = 'incomplete-frame';
  else if (bytes.length > expected) sample.classification = 'extra-bytes';
  else if (bytes[bytes.length - 1] !== 0xff) sample.classification = 'footer-rejected';
  else {
    const packet = parseNotification(bytes);
    if (!packet) sample.classification = 'crc-rejected';
    else if (packet.command === 0xaa) sample.classification = packet.payload.length === 0 ? 'strict-aa-empty'
      : packet.payload.length === 1 && packet.payload[0] === 0 ? 'strict-aa-zero' : 'strict-aa-other-payload';
    else if (packet.command !== 0xa9) sample.classification = 'strict-other-command';
    else sample.classification = packet.payload.length === 1 && packet.payload[0] === 0 ? 'strict-a9-zero' : 'strict-a9-rejected';
  }
  return sample;
};

// Passive: no timers, promises, writes, waiter resolution or transaction ownership.
export const createA9EvidenceCollector = (mtu) => {
  const report = createA9EvidenceReport();
  report.mtu = mtu;
  let deadline = 0;
  let ended = false;
  let lastRawCallbackAt = null;
  let observedRawAckAt = null;
  let strictRawAckAt = null;
  let admittedRawAckAt = null;
  let transferDeadline = 0;
  let aaDeadline = 0;
  let lastClosingSample = null; // Alias of a retained sample, never an extra sample buffer.
  const guard = (action) => (...args) => { try { if (!ended) action(...args); } catch { /* Observation cannot affect admission. */ } };
  const cause = guard((origin, error) => {
    if (report.printResult === 'sent-unconfirmed' || report.failureOrigin !== null || !failureOrigins.has(origin)) return;
    report.failureOrigin = origin;
    report.nativeErrorCode = publicNativeCode(error); // Primitives only; no native object/message retained.
  });
  const closingActive = () => closingStages.has(report.phase) && Date.now() < (report.phase === 'transfer'
    ? Math.min(transferDeadline, aaDeadline || Infinity) : aaDeadline);
  const fail = guard((error) => {
    if (report.printResult === 'sent-unconfirmed') return;
    deadline = 0; transferDeadline = 0; aaDeadline = 0; lastClosingSample = null;
    report.errorCode = report.errorCode || errorCode(error); report.printResult = 'error';
    const code = errorCode(error);
    cause(code === 'timeout' ? 'timeout' : code === 'cancelled' ? 'cancelled' : code === 'foreground' ? 'foreground'
      : ['status', 'rejected', 'completion', 'raster'].includes(code) ? 'validation' : 'session', error);
  });
  const retain = (sample) => {
    if (report.samples.length < limits.samples) { report.samples.push(sample); return true; }
    if (sample.stage === 'a9-wait') {
      if (isA9ReplySample(sample) && !report.samples.some(isA9ReplySample)) { report.samples[limits.samples - 1] = sample; return true; }
      return false;
    }
    // Keep the selected A9 sample and first AA evidence; otherwise rotate only a closing slot.
    let slot = -1;
    for (let index = report.samples.length - 1; index >= 0; index -= 1) {
      const item = report.samples[index];
      if (closingStages.has(item.stage) && !item.aaTagged && !item.completesStrictAA) { slot = index; break; }
    }
    if (slot < 0) return false;
    if (sample.aaTagged && report.samples.some((item) => closingStages.has(item.stage) && (item.aaTagged || item.completesStrictAA))) return false;
    report.samples[slot] = sample;
    return true;
  };
  return {
    cause,
    a1Passed: guard(() => { report.a1Passed = true; }),
    begin: guard((windowMs) => {
      report.phase = 'a9-wait'; report.a9Attempted = true;
      report.receiveWindowMs = Number.isInteger(windowMs) ? Math.max(0, Math.min(limits.windowMs, windowMs)) : limits.windowMs;
      deadline = Date.now() + report.receiveWindowMs;
    }),
    observe: guard((value, error, aaWaitRegistered = false) => {
      const a9 = report.phase === 'a9-wait' && Date.now() < deadline;
      if (!a9 && !closingActive()) return;
      const sample = sampleValue(value, error);
      sample.stage = report.phase; sample.aaWaitRegistered = aaWaitRegistered === true;
      if (a9) {
        lastRawCallbackAt = Date.now(); // Private anchor, never projected as a timestamp.
        report.rawCallbacks = Math.min(limits.callbacks, report.rawCallbacks + 1);
        report.callbacksSaturated = report.rawCallbacks === limits.callbacks;
        if (observedRawAckAt === null && sample.classification === 'observed-a9-candidate' && !sample.truncated) observedRawAckAt = lastRawCallbackAt;
        retain(sample);
        if (error) report.errorCode = errorCode(error); // Preserve existing A9-only error classification.
      } else {
        report.closingRawCallbacks = Math.min(limits.callbacks, report.closingRawCallbacks + 1);
        report.closingCallbacksSaturated = report.closingRawCallbacks === limits.callbacks;
        lastClosingSample = retain(sample) ? sample : null;
      }
    }),
    receivedA9: guard((packet) => {
      if (report.phase !== 'a9-wait' || packet.variant !== 'strict-crc' ||
          packet.payload.length !== 1 || packet.payload[0] !== 0 || strictRawAckAt !== null) return;
      strictRawAckAt = lastRawCallbackAt ?? Date.now(); // Last raw callback completing a strict streamed ACK.
    }),
    queued: guard(() => { report.a9WriteQueued = true; }),
    accepted: guard((packet) => {
      report.a9AckAccepted = true; report.phase = 'transfer';
      report.a9Variant = packet.variant; report.a9Integrity = packet.integrity; report.a9Provenance = packet.provenance;
      admittedRawAckAt = packet.variant === 'observed-short8' ? observedRawAckAt : strictRawAckAt;
      const replySample = report.samples.find(isA9ReplySample) || report.samples[0];
      report.samples = replySample ? [replySample] : []; // Same TOTAL four-sample budget, reserve closing space.
    }),
    transferWindow: guard((until) => { transferDeadline = Number.isFinite(until) ? Math.min(until, Date.now() + 120000) : 0; }),
    aaWaitStarted: guard((until) => {
      report.aaWaitRegistered = true;
      aaDeadline = Number.isFinite(until) ? Math.min(until, Date.now() + 50025) : 0;
    }),
    receivedAA: guard((waitRegistered) => {
      if (!closingActive()) return;
      if (waitRegistered !== true) report.aaBeforeWaitObserved = true;
      if (lastClosingSample) lastClosingSample.completesStrictAA = true; // Existing stream parser fact, not a success gate.
    }),
    adAttempted: guard(() => { report.adWriteAttempted = true; }),
    adQueued: guard(() => { if (report.printResult !== 'error') report.adWriteQueued = true; }),
    sentUnconfirmed: guard(() => {
      report.closingFailureScope = 'aa-wait';
      report.errorCode = null; report.failureOrigin = null; report.nativeErrorCode = null;
      report.completionValidated = false; report.printResult = 'sent-unconfirmed';
      deadline = 0; transferDeadline = 0; aaDeadline = 0; lastClosingSample = null;
    }),
    closingFailed: guard((scope, error) => {
      if (report.closingFailureScope === null && closingScopes.has(scope)) report.closingFailureScope = scope;
      fail(error); // Existing first cause remains immutable; no message parsing or error replacement.
    }),
    imageAttempted: guard(() => {
      if (report.imageWriteAttempts === 0 && admittedRawAckAt !== null) {
        const elapsed = Date.now() - admittedRawAckAt;
        if (Number.isFinite(elapsed) && elapsed >= 0) report.rawA9AckToFirstImageWriteMs = Math.min(TRANSFER_TELEMETRY_LIMITS.elapsedMs, Math.trunc(elapsed));
      }
      report.imageTransferStarted = true; // Preserve legacy pre-await meaning, now distinguished by counters.
      report.imageWriteAttempts = Math.min(TRANSFER_TELEMETRY_LIMITS.writes, report.imageWriteAttempts + 1);
    }),
    imageResolved: guard((bytes) => {
      report.imageWritesResolved = Math.min(TRANSFER_TELEMETRY_LIMITS.writes, report.imageWritesResolved + 1);
      report.imageBytesQueued = Math.min(TRANSFER_TELEMETRY_LIMITS.bytes, report.imageBytesQueued + integer(bytes, TRANSFER_TELEMETRY_LIMITS.bytes));
    }),
    completionStarted: guard(() => { report.phase = 'completion'; }),
    completed: guard(() => { aaDeadline = 0; transferDeadline = 0; report.completionValidated = true; report.printResult = 'printed'; }),
    fail,
    finish() { ended = true; lastClosingSample = null; report.attemptEnded = true; return projectA9Evidence(report); },
  };
};
