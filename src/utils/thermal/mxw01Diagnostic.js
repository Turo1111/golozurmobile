import { assertA1Ready, assertReadyStatus, createMXW01ReceiveDecoder, decodeCanonicalNotificationValue, parseNotification, parseObservedShortA1 } from './mxw01Protocol';
import { bounded, pause, PrintingError } from './printingOperation';

export const A1_DIAGNOSTIC_LIMITS = Object.freeze({ windowMs: 5000, samples: 4, bytes: 72, inputChars: 96, callbacks: 255 });
const { windowMs: MAX_WINDOW_MS, samples: MAX_SAMPLES, bytes: MAX_BYTES, inputChars: MAX_INPUT_CHARS, callbacks: MAX_CALLBACKS } = A1_DIAGNOSTIC_LIMITS;
const errorCodes = new Set(['unsaved', 'profile', 'config', 'not-selected', 'native-unavailable', 'platform', 'permission', 'bluetooth-off', 'device', 'mtu', 'busy', 'timeout', 'cancelled', 'foreground', 'connection', 'status', 'native-error']);
// Public, platform-independent BLE PLX 3.1.2 codes only; never messages/reasons/IDs.
const nativeCodes = new Set([0, 1, 2, 3, 4, 5, 100, 101, 102, 103, 104, 105, 200, 201, 202, 203, 204, 205, 206, 300, 301, 302, 303, 400, 401, 402, 403, 404, 405, 406, 500, 501, 502, 503, 504, 505, 506, 600, 601]);
const reasons = new Set(['subscription-error', 'invalid-base64', 'empty-value', 'truncated-input', 'incomplete-frame', 'framing-rejected', 'length-rejected', 'extra-bytes', 'footer-rejected', 'crc-rejected', 'other-command', 'valid-a1-frame', 'status-rejected', 'observed-a1-candidate']);
const outcomes = new Set(['blocked', 'error', 'timeout', 'cancelled', 'a1-ready', 'status-rejected']);
const phases = new Set(['guard', 'settings', 'permissions-bluetooth', 'connection-discovery', 'a1-window']);
const integer = (value, max) => Number.isInteger(value) && value >= 0 ? Math.min(value, max) : 0;

export const safeA1ErrorCode = (error) => errorCodes.has(error?.code) ? error.code
  : nativeCodes.has(error?.errorCode) ? `ble-${error.errorCode}` : 'native-error';

export const createA1DiagnosticReport = () => ({
  outcome: 'blocked', phase: 'guard', errorCode: null, mtu: null,
  receiveWindowMs: MAX_WINDOW_MS, a1Attempts: 0, writeQueued: false, a1FrameAccepted: false,
  readyStatus: false, rawCallbacks: 0, callbacksSaturated: false, samples: [], sessionEnded: false,
  a1Variant: null, a1Integrity: null, a1Provenance: null, paperPresence: 'unknown',
});

export const recordA1Failure = (report, error) => {
  report.errorCode = safeA1ErrorCode(error);
  report.outcome = report.errorCode === 'timeout' ? 'timeout'
    : ['cancelled', 'foreground'].includes(report.errorCode) ? 'cancelled'
      : report.errorCode === 'status' ? 'status-rejected'
        : ['unsaved', 'profile', 'config', 'not-selected', 'native-unavailable', 'platform', 'busy'].includes(report.errorCode) ? 'blocked' : 'error';
};

// A second explicit projection at the UI boundary excludes any unexpected fields.
export const projectA1Diagnostic = (report) => ({
  outcome: outcomes.has(report?.outcome) ? report.outcome : 'error',
  phase: phases.has(report?.phase) ? report.phase : 'guard',
  errorCode: report?.errorCode === null ? null : safeA1ErrorCode({
    code: report?.errorCode,
    errorCode: typeof report?.errorCode === 'string' && /^ble-\d{1,3}$/.test(report.errorCode) ? Number(report.errorCode.slice(4)) : null,
  }),
  mtu: Number.isInteger(report?.mtu) && report.mtu >= 23 && report.mtu <= 517 ? report.mtu : null,
  receiveWindowMs: integer(report?.receiveWindowMs, MAX_WINDOW_MS),
  a1Attempts: integer(report?.a1Attempts, 1), writeQueued: report?.writeQueued === true,
  a1FrameAccepted: report?.a1FrameAccepted === true, readyStatus: report?.readyStatus === true,
  a1Variant: ['strict-crc', 'observed-short17'].includes(report?.a1Variant) ? report.a1Variant : null,
  a1Integrity: ['crc-verified', 'unverified'].includes(report?.a1Integrity) ? report.a1Integrity : null,
  a1Provenance: ['strict-framing', 'user-captures/community-status-layout'].includes(report?.a1Provenance) ? report.a1Provenance : null,
  paperPresence: 'unknown',
  rawCallbacks: integer(report?.rawCallbacks, MAX_CALLBACKS), callbacksSaturated: report?.callbacksSaturated === true,
  samples: (Array.isArray(report?.samples) ? report.samples.slice(0, MAX_SAMPLES) : []).map((sample) => ({
    inputChars: integer(sample?.inputChars, 65535), decodedBytes: integer(sample?.decodedBytes, MAX_BYTES),
    truncated: sample?.truncated === true, beforeQuery: sample?.beforeQuery === true,
    reason: reasons.has(sample?.reason) ? sample.reason : 'invalid-base64',
    hex: typeof sample?.hex === 'string' && sample.hex.length <= MAX_BYTES * 3 - 1 && /^(?:[0-9A-F]{2}(?: [0-9A-F]{2}){0,71})?$/.test(sample.hex) ? sample.hex : '',
  })),
  sessionEnded: report?.sessionEnded === true,
});

export const formatA1Diagnostic = (report) => {
  const safe = projectA1Diagnostic(report);
  const actions = {
    unsaved: 'Save Settings first; this test uses only the saved profile.',
    profile: 'Select MXW01 and save before testing. RawBT was not probed.',
    config: 'Repair or explicitly reset invalid saved settings before testing.',
    'not-selected': 'Select and save the intended MXW01 first. Nothing was scanned or selected automatically.',
    'native-unavailable': 'Use the existing BLE development APK and Metro. Expo Go cannot run this test.',
    platform: 'This diagnostic is Android-only.',
    permission: 'Allow Android Nearby devices (or Location on Android 6–11).',
    'bluetooth-off': 'Enable Android Bluetooth; Android 6–11 also needs Location services.',
    busy: 'Wait for or cancel the current print/discovery/test before starting another.',
    foreground: 'The test stopped when Golozur left the foreground.',
    cancelled: 'The test was cancelled. Nothing is retransmitted.',
  };
  const evidence = safe.rawCallbacks === 0 ? 'No raw AE02 callback was observed.'
    : safe.a1FrameAccepted ? `An A1 frame was admitted (${safe.a1Variant}, ${safe.a1Integrity}); this is NOT printing proof.`
      : 'Raw AE02 callbacks were observed, but no A1 frame was admitted. This does not identify the wire-format cause.';
  return 'A1-only diagnostic — no receipt/image/paper commands.\n' +
    (actions[safe.errorCode] || evidence) + '\nPaper presence is UNKNOWN. Load paper before any print test.\nSession ended; cleanup/disconnect attempted for any opened connection.\n' + JSON.stringify(safe, null, 2);
};

const inspectValue = (value, error, beforeQuery) => {
  const sample = { inputChars: typeof value === 'string' ? Math.min(value.length, 65535) : 0, decodedBytes: 0, truncated: false, beforeQuery, reason: 'invalid-base64', hex: '' };
  if (error) { sample.reason = 'subscription-error'; return { sample }; }
  if (typeof value !== 'string') return { sample };
  if (!value.length) { sample.reason = 'empty-value'; return { sample }; }
  sample.truncated = value.length > MAX_INPUT_CHARS;
  const prefix = value.slice(0, MAX_INPUT_CHARS);
  const bytes = decodeCanonicalNotificationValue(prefix, MAX_BYTES);
  if (!bytes) return { sample };
  sample.decodedBytes = bytes.length;
  sample.hex = Array.from(bytes, (byte) => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  if (sample.truncated) { sample.reason = 'truncated-input'; return { sample }; }
  if (parseObservedShortA1(bytes)) { sample.reason = 'observed-a1-candidate'; return { sample, bytes }; }
  const expected = bytes.length >= 6 ? 8 + (bytes[4] | (bytes[5] << 8)) : 8;
  if (bytes.length < 6) sample.reason = 'incomplete-frame';
  else if (bytes[0] !== 0x22 || bytes[1] !== 0x21) sample.reason = 'framing-rejected';
  else if (expected > MAX_BYTES) sample.reason = 'length-rejected';
  else if (bytes.length < expected) sample.reason = 'incomplete-frame';
  else if (bytes.length > expected) sample.reason = 'extra-bytes';
  else if (bytes[bytes.length - 1] !== 0xff) sample.reason = 'footer-rejected';
  else {
    const packet = parseNotification(bytes);
    if (!packet) sample.reason = 'crc-rejected';
    else if (packet.command !== 0xa1) sample.reason = 'other-command';
    else {
      sample.reason = 'valid-a1-frame';
      try { assertReadyStatus(packet.payload); } catch { sample.reason = 'status-rejected'; }
    }
  }
  return { sample, bytes };
};

// Only the status query is available here. No sale, renderer, data-write or print session.
export const runA1Diagnostic = async (transport, token, report = createA1DiagnosticReport(), limits = {}) => {
  const windowMs = Number.isInteger(limits.windowMs) ? Math.max(1, Math.min(MAX_WINDOW_MS, limits.windowMs)) : MAX_WINDOW_MS;
  const setupMs = Number.isInteger(limits.setupMs) ? Math.max(0, Math.min(250, limits.setupMs)) : 250;
  report.phase = 'a1-window';
  report.receiveWindowMs = windowMs;
  report.mtu = transport.mtu;
  let closed = false;
  let queryStarted = false;
  let remove = () => {};
  let resolve;
  let reject;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const deadline = Date.now() + windowMs;
  const response = bounded(pending, windowMs, token, 'A1 diagnostic window');
  response.catch(() => {});
  const admit = (packet) => {
    report.a1FrameAccepted = true;
    report.a1Variant = packet.variant;
    report.a1Integrity = packet.integrity;
    report.a1Provenance = packet.provenance;
    assertA1Ready(packet);
    report.readyStatus = true;
  };
  const decoder = createMXW01ReceiveDecoder((packet) => {
    if (closed || !queryStarted || packet.command !== 0xa1) return;
    try { admit(packet); resolve(); }
    catch (error) { reject(error); }
  });
  const fail = (error) => { if (!closed) { reject(error); token.cancel(error); } };
  try {
    token.check();
    if (!Number.isInteger(transport.mtu) || transport.mtu < 23 || transport.mtu > 517) throw new PrintingError('mtu', 'Invalid diagnostic MTU');
    // Waiter/deadline precede subscription and write; the whole RX window is <=5s.
    remove = transport.monitorRaw((value, error) => {
      if (closed) return;
      if (Date.now() >= deadline) { if (queryStarted) decoder.invalidateA1Fallback(); return; }
      report.rawCallbacks = Math.min(MAX_CALLBACKS, report.rawCallbacks + 1);
      report.callbacksSaturated = report.rawCallbacks === MAX_CALLBACKS;
      const inspected = inspectValue(value, error, !queryStarted);
      if (report.samples.length < MAX_SAMPLES) report.samples.push(inspected.sample);
      if (error) fail(error);
      else if (queryStarted) {
        if (inspected.bytes) decoder.push(inspected.bytes);
        else decoder.invalidateA1Fallback();
      }
    }, fail);
    await pause(Math.min(setupMs, windowMs - 1), token);
    token.check();
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new PrintingError('timeout', 'A1 diagnostic window ended');
    queryStarted = true;
    decoder.beginA1(deadline);
    report.a1Attempts = 1;
    await bounded(transport.writeControl(new Uint8Array([0x22, 0x21, 0xa1, 0, 1, 0, 0, 0, 0xff])), remaining, token, 'A1 diagnostic write');
    report.writeQueued = true; // Queued is not a printer acknowledgement.
    try { await response; }
    catch (error) {
      if (error.code !== 'timeout' || token.error) throw error;
      const packet = decoder.resolveObservedA1();
      if (!packet) throw error;
      admit(packet);
    }
    token.check();
    report.outcome = 'a1-ready';
  } catch (error) {
    recordA1Failure(report, error);
  } finally {
    closed = true;
    decoder.endA1();
    reject(new PrintingError('cancelled', 'A1 diagnostic ended'));
    try { remove(); } catch { /* The adapter also cancels its transaction and destroys the manager. */ }
  }
  return projectA1Diagnostic(report);
};
