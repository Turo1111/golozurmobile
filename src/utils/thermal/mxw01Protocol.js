import { PrintingError } from './printingOperation';
import { Buffer } from 'buffer';

// Native RX values must be canonical before either receive path sees bytes.
export const decodeCanonicalNotificationValue = (value, maxBytes = 512) => {
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 512 ||
      typeof value !== 'string' || value.length > 4 * Math.ceil(maxBytes / 3) ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length > maxBytes || bytes.toString('base64') !== value) return null;
  return new Uint8Array(bytes);
};

export const MXW01_WIDTH = 384;
export const MXW01_ROW_BYTES = 48;
export const MXW01_MAX_HEIGHT = 3072;
const uuid = (short) => `0000${short}-0000-1000-8000-00805f9b34fb`;
export const MXW01_UUIDS = {
  services: [uuid('ae30'), uuid('af30')],
  control: uuid('ae01'), notify: uuid('ae02'), data: uuid('ae03'),
};

// CRC-8, MSB first, polynomial 0x07, initial 0; no copied lookup table.
export const crc8 = (payload) => {
  let crc = 0;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = ((crc << 1) ^ ((crc & 0x80) ? 0x07 : 0)) & 0xff;
    }
  }
  return crc;
};

export const commandPacket = (command, payload = new Uint8Array([0])) => {
  if (!Number.isInteger(command) || command < 0 || command > 255 ||
      !(payload instanceof Uint8Array) || payload.length > 64) throw new Error('Invalid command');
  return new Uint8Array([
    0x22, 0x21, command, 0, payload.length & 0xff, payload.length >> 8,
    ...payload, crc8(payload), 0xff,
  ]);
};

export const parseNotification = (bytes) => {
  if (!(bytes instanceof Uint8Array) || bytes.length < 8 || bytes.length > 72) return null;
  const length = bytes[4] | (bytes[5] << 8);
  if (bytes[0] !== 0x22 || bytes[1] !== 0x21 || length > 64 ||
      bytes.length !== length + 8 || bytes[bytes.length - 1] !== 0xff) return null;
  const payload = bytes.slice(6, 6 + length);
  if (crc8(payload) !== bytes[6 + length]) return null;
  // Notification byte 3 is documented as variable (unlike command byte 3).
  return { command: bytes[2], payload };
};

// ATT may fragment a status response at MTU 23. Reassemble with a small fixed bound.
export const createNotificationDecoder = (receive) => {
  let pending = new Uint8Array(0);
  return (fragment) => {
    if (!(fragment instanceof Uint8Array) || !fragment.length || fragment.length > 512) return;
    if (pending.length + fragment.length > 1024) pending = new Uint8Array(0);
    const joined = new Uint8Array(pending.length + fragment.length);
    joined.set(pending); joined.set(fragment, pending.length);
    pending = joined;
    while (pending.length >= 8) {
      if (pending[0] !== 0x22 || pending[1] !== 0x21 || (pending[4] | (pending[5] << 8)) > 64) {
        pending = pending.slice(1);
        continue;
      }
      const size = 8 + (pending[4] | (pending[5] << 8));
      if (pending.length < size) return;
      const packet = parseNotification(pending.slice(0, size));
      pending = pending.slice(packet ? size : 1);
      if (packet) receive(packet);
    }
  };
};

export const validateRaster = (raster) => {
  if (raster?.width !== MXW01_WIDTH || !Number.isInteger(raster.height) ||
      raster.height < 1 || raster.height > MXW01_MAX_HEIGHT ||
      !(raster.bytes instanceof Uint8Array) || raster.bytes.length !== raster.height * MXW01_ROW_BYTES) {
    throw new PrintingError('raster', 'Invalid or oversized receipt. Reduce the text size or split the sale before printing.');
  }
  return raster;
};

export const orientAndPadRaster = (raster) => {
  validateRaster(raster);
  const result = new Uint8Array(Math.max(90, raster.height) * MXW01_ROW_BYTES);
  // Reverse byte order and bits: 180 degrees over the actual image, THEN pad.
  for (let index = 0; index < raster.bytes.length; index += 1) {
    let value = raster.bytes[raster.bytes.length - 1 - index];
    let reversed = 0;
    for (let bit = 0; bit < 8; bit += 1) { reversed = (reversed << 1) | (value & 1); value >>= 1; }
    result[index] = reversed;
  }
  return result;
};

export const printRequest = (height) => {
  if (!Number.isInteger(height) || height < 1 || height > MXW01_MAX_HEIGHT) throw new Error('Invalid height');
  return commandPacket(0xa9, new Uint8Array([height & 0xff, height >> 8, 0x30, 0]));
};

export const assertReadyStatus = (payload) => {
  if (payload.length < 13) throw new PrintingError('status', 'Unsupported MXW01 status response. No print request was sent.');
  if (payload[12] !== 0) {
    const problem = { 1: 'Load paper', 9: 'Load paper', 4: 'Let the printer cool down', 8: 'Charge the printer' }[payload[13]];
    throw new PrintingError('status', `${problem || 'Check the printer'} and try again. The printer reported an error.`);
  }
  if (payload[6] !== 0) throw new PrintingError('status', 'The printer is not idle. Wait for it to finish before retrying.');
};

// User-observed A1 envelope only. AD/AA/B0 are opaque signatures, NOT paper flags.
// The final 00 bytes have no established integrity/footer meaning.
export const parseObservedShortA1 = (bytes) => {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 17 ||
      bytes[0] !== 0x22 || bytes[1] !== 0x21 || bytes[2] !== 0xa1 ||
      bytes[3] !== 0x03 || bytes[4] !== 0x0a || bytes[5] !== 0 ||
      ![7, 8, 11, 15, 16].every((index) => bytes[index] === 0) ||
      ![0xad, 0xaa, 0xb0].includes(bytes[14])) return null;
  // Counterfactual ambiguity check only: do not accept a prefix that could gain
  // FF and become a CRC-valid strict18 frame. This does not verify short integrity.
  if (crc8(bytes.slice(6, 16)) === bytes[16]) return null;
  return {
    command: 0xa1, variant: 'observed-short17', integrity: 'unverified',
    provenance: 'user-captures/community-status-layout',
    status: { state: bytes[6], battery: bytes[9], temperature: bytes[10], flag: bytes[12], error: bytes[13], paper: 'unknown' },
  };
};

// Literal observed zero ACK without FF. Byte7 is CRC-consistent, but its role
// and frame integrity are not vendor-certified. Unlike A1, this IS a valid
// strict9 prefix, so only deadline resolution of a sole whole reply can admit it.
export const parseObservedShortA9 = (bytes) => {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 8 ||
      bytes[0] !== 0x22 || bytes[1] !== 0x21 || bytes[2] !== 0xa9 ||
      bytes[3] !== 0 || bytes[4] !== 1 || bytes[5] !== 0 ||
      bytes[6] !== 0 || bytes[7] !== crc8(bytes.slice(6, 7))) return null;
  return { command: 0xa9, payload: bytes.slice(6, 7), variant: 'observed-short8', integrity: 'unverified', provenance: 'user-a9-capture' };
};

// Owner-observed malformed AA signal shape only. This is deliberately not a
// parser/admission path and does not relax strict AA or establish completion.
export const isObservedUnverifiedAACompletionSignal = (bytes) => bytes instanceof Uint8Array &&
  bytes.length === 10 && bytes[0] === 0x22 && bytes[1] === 0x21 && bytes[2] === 0xaa &&
  bytes[3] === 0 && bytes[4] === 3 && bytes[5] === 0 && bytes[6] === 0 &&
  bytes[7] === bytes[8] && bytes[9] === 0;

// Strict streaming remains the primary path. A short candidate is not emitted
// during a callback: only the caller's A1 deadline can resolve a sole whole reply.
export const createMXW01ReceiveDecoder = (receive) => {
  let armed = false;
  let chunks = 0;
  let candidate = null;
  let expiresAt = Infinity;
  let a9Armed = false;
  let a9Chunks = 0;
  let a9Candidate = null;
  let a9ExpiresAt = Infinity;
  const onStrict = (packet) => {
    if (packet.command === 0xa1) {
      if (!armed || Date.now() >= expiresAt) return; // Arrival deadline is exclusive, not timer-dispatch dependent.
      armed = false; candidate = null;
      receive({ ...packet, variant: 'strict-crc', integrity: 'crc-verified', provenance: 'strict-framing' });
    } else if (packet.command === 0xa9) {
      if (Date.now() >= a9ExpiresAt) return;
      a9Armed = false; a9Candidate = null;
      receive({ ...packet, variant: 'strict-crc', integrity: 'crc-verified', provenance: 'strict-framing' });
    } else receive(packet);
  };
  let strict = createNotificationDecoder(onStrict);
  return {
    beginA1(deadline) {
      armed = true; chunks = 0; candidate = null;
      expiresAt = Number.isFinite(deadline) ? deadline : Infinity;
      strict = createNotificationDecoder(onStrict); // No pre-query partial/stale A1.
    },
    push(fragment) {
      if (armed) {
        if (Date.now() >= expiresAt) { chunks = 2; candidate = null; }
        else {
          chunks = Math.min(2, chunks + 1);
          candidate = chunks === 1 ? parseObservedShortA1(fragment) : null;
        }
      }
      if (a9Armed) {
        if (Date.now() >= a9ExpiresAt) { a9Chunks = 2; a9Candidate = null; }
        else {
          a9Chunks = Math.min(2, a9Chunks + 1);
          a9Candidate = a9Chunks === 1 ? parseObservedShortA9(fragment) : null;
        }
      }
      // Continue strict streaming so rejecting late A1 does not swallow other commands.
      strict(fragment);
    },
    invalidateA1Fallback() { if (armed) { chunks = 2; candidate = null; } },
    resolveObservedA1() {
      if (!armed || Date.now() < expiresAt) return null;
      const packet = armed && chunks === 1 ? candidate : null;
      armed = false; candidate = null;
      if (packet) strict = createNotificationDecoder(onStrict); // Discard only the isolated17 candidate, never next-frame bytes.
      return packet;
    },
    endA1() { armed = false; candidate = null; },
    beginA9(deadline) {
      a9Armed = true; a9Chunks = 0; a9Candidate = null;
      a9ExpiresAt = Number.isFinite(deadline) ? deadline : Infinity;
      strict = createNotificationDecoder(onStrict); // Discard pre-query/stale partial ACKs, not current-window fragments.
    },
    invalidateA9Fallback() { if (a9Armed) { a9Chunks = 2; a9Candidate = null; } },
    resolveObservedA9() {
      if (!a9Armed || Date.now() < a9ExpiresAt) return null;
      const packet = a9Chunks === 1 ? a9Candidate : null;
      a9Armed = false; a9Candidate = null;
      if (packet) strict = createNotificationDecoder(onStrict); // Only the isolated8 candidate is cleared before AA/data phase.
      return packet;
    },
    endA9() { a9Armed = false; a9Candidate = null; },
  };
};

export const assertA1Ready = (packet) => {
  if (packet?.command !== 0xa1) throw new PrintingError('status', 'Unexpected status opcode. No print request was sent.');
  if (packet?.variant !== 'observed-short17') {
    assertReadyStatus(packet?.payload ?? new Uint8Array(0)); // Preserve legacy strict A1 interpretation.
    return;
  }
  const { state, flag, error } = packet.status;
  if (state > 3) throw new PrintingError('status', 'Unknown MXW01 state. No print request was sent. Paper presence is unknown.');
  if (flag !== 0 || error !== 0) throw new PrintingError('status', 'MXW01 reported an error. Inspect the printer before retrying; paper presence is unknown.');
  if (state !== 0) throw new PrintingError('status', 'MXW01 is printing, feeding or ejecting. Wait before retrying; paper presence is unknown.');
};
