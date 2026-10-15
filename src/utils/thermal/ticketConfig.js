import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@golozur_ticket_config';

// Default values that match the current hardcoded behaviour.
export const TICKET_CONFIG_DEFAULTS = {
  // Paper
  columns: 32,              // characters per line (58mm Font A = 32, 80mm Font A = 48)
  fontBColumns: 42,         // characters per line when Font B is active (58mm ≈ 42)
  // Title block (GOLOZUR)
  titleWidthMultiplier: 2,  // GS! width  1–4
  titleHeightMultiplier: 2, // GS! height 1–4
  // Header info section (Fecha / Cliente)
  headerFont: 'A',          // 'A' = normal | 'B' = condensed (smaller)
  headerHeightMultiplier: 1, // GS! height 1–4 (width stays 1 to preserve layout)
  // Body / items section
  bodyFont: 'A',            // 'A' = normal | 'B' = condensed (smaller, more chars/line)
  bodyHeightMultiplier: 1,  // GS! height 1–4 (width stays 1 to preserve layout)
  bodyBold: false,          // ESC E 1
  itemSpacing: 0,           // extra paper advance between items in dots (ESC J n).
                            // 0 = compact, ~8 = subtle gap (~1mm), ~24 = ~3mm.
                            // Step of 4 in the UI ≈ 0.5mm per step.
  // Total line
  totalWidthMultiplier: 1,  // 1 = normal, 2 = double-wide
  totalHeightMultiplier: 1,
  // Footer ("NO VALIDO COMO FACTURA")
  footerFont: 'A',          // 'A' = normal | 'B' = condensed
  footerHeightMultiplier: 1, // GS! height 1–4
  // Feed & cut
  feedLines: 4,             // lines before cut
  autoCut: true,            // whether to emit a cut command at all
  partialCut: true,         // true = partial cut (GS V B 0), false = full cut (GS V 0)
  // Encoding
  useCodePageCommand: false, // emit ESC t 2 (CP850) at init
  // Transport is app-local; old installations continue to use RawBT.
  printerTransport: 'rawbt',
  mxw01DeviceId: null,
  mxw01DeviceName: null,
  mxw01History: [],         // newest explicit selection first; never a fallback
  mxw01TextSize: 18,         // canvas pixels at the fixed 384-dot reference width
};

export const isMXW01DeviceId = (value) =>
  typeof value === 'string' && /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(value);

const normalizeMXW01Printer = (device) =>
  device && isMXW01DeviceId(device.id) && device.name === 'MXW01'
    ? { id: device.id.toUpperCase(), name: 'MXW01' } : null;

const normalizeMXW01History = (history, current) => {
  const printers = [];
  const seen = new Set();
  if (Array.isArray(history)) history.forEach((entry) => {
    const printer = normalizeMXW01Printer(entry);
    if (!printer || seen.has(printer.id)) return;
    seen.add(printer.id);
    printers.push(printer);
  });
  // An explicitly empty list stays empty, even with a legacy current printer.
  if (Array.isArray(history) && history.length === 0) return [];
  if (current && !seen.has(current.id)) printers.push(current);
  const bounded = printers.slice(0, 10);
  if (current && !bounded.some((printer) => printer.id === current.id)) {
    return [...bounded.slice(0, 9), current];
  }
  return bounded;
};

export const normalizeTicketConfig = (stored) => {
  const input = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  const next = { ...TICKET_CONFIG_DEFAULTS, ...input };
  const ranges = {
    columns: [24, 48], fontBColumns: [24, 64],
    titleWidthMultiplier: [1, 4], titleHeightMultiplier: [1, 4],
    headerHeightMultiplier: [1, 4], bodyHeightMultiplier: [1, 4],
    footerHeightMultiplier: [1, 4], totalWidthMultiplier: [1, 2], totalHeightMultiplier: [1, 2],
    itemSpacing: [0, 48], feedLines: [0, 10], mxw01TextSize: [12, 24],
  };
  Object.entries(ranges).forEach(([key, [min, max]]) => {
    if (!Number.isInteger(next[key]) || next[key] < min || next[key] > max) {
      next[key] = TICKET_CONFIG_DEFAULTS[key];
    }
  });
  ['headerFont', 'bodyFont', 'footerFont'].forEach((key) => {
    if (!['A', 'B'].includes(next[key])) next[key] = TICKET_CONFIG_DEFAULTS[key];
  });
  ['bodyBold', 'autoCut', 'partialCut', 'useCodePageCommand'].forEach((key) => {
    if (typeof next[key] !== 'boolean') next[key] = TICKET_CONFIG_DEFAULTS[key];
  });
  // Unknown/corrupt profiles must NOT silently route a job to a different printer.
  if (!['rawbt', 'mxw01'].includes(next.printerTransport)) next.printerTransport = 'invalid';
  if (!isMXW01DeviceId(next.mxw01DeviceId) || next.mxw01DeviceName !== 'MXW01') {
    next.mxw01DeviceId = null;
    next.mxw01DeviceName = null;
  } else {
    next.mxw01DeviceId = next.mxw01DeviceId.toUpperCase();
  }
  next.mxw01History = normalizeMXW01History(input.mxw01History,
    normalizeMXW01Printer({ id: next.mxw01DeviceId, name: next.mxw01DeviceName }));
  return next;
};

/**
 * Load ticket config from AsyncStorage.
 * Missing keys fall back to TICKET_CONFIG_DEFAULTS so old stored objects
 * stay valid after we add new fields.
 */
const readTicketConfig = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return normalizeTicketConfig({});
  const stored = JSON.parse(raw);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid settings');
  return normalizeTicketConfig(stored);
};

export const loadTicketConfig = async () => {
  try {
    return await readTicketConfig();
  } catch {
    return normalizeTicketConfig({ printerTransport: 'invalid' });
  }
};

/**
 * Persist ticket config to AsyncStorage.
 * Merges with the stored configuration, not only defaults, to retain typography.
 */
let saveQueue = Promise.resolve();
const updateTicketConfig = (patch) => {
  const write = saveQueue.then(async () => {
    let current;
    try { current = await readTicketConfig(); }
    catch { throw new Error('Stored printer settings cannot be safely loaded. Try again, or reset settings explicitly before saving.'); }
    const next = normalizeTicketConfig({ ...current, ...patch(current) });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  });
  saveQueue = write.catch(() => {});
  return write;
};

export const saveTicketConfig = (partial) => updateTicketConfig(() => partial);

/** Persist an explicit selection without overwriting unrelated settings. */
export const selectMXW01Printer = async (device) => {
  const printer = normalizeMXW01Printer(device);
  if (!printer) throw new Error('Invalid MXW01 printer');
  return updateTicketConfig((current) => ({
    mxw01DeviceId: printer.id,
    mxw01DeviceName: printer.name,
    mxw01History: [printer, ...current.mxw01History.filter((entry) => entry.id !== printer.id)],
  }));
};

/** Call only after confirmed removal; never select a replacement from history. */
export const removeMXW01Printer = async (id) => {
  if (!isMXW01DeviceId(id)) throw new Error('Invalid MXW01 printer');
  const printerId = id.toUpperCase();
  return updateTicketConfig((current) => ({
    mxw01History: current.mxw01History.filter((entry) => entry.id !== printerId),
    ...(current.mxw01DeviceId === printerId ? { mxw01DeviceId: null, mxw01DeviceName: null } : {}),
  }));
};

/** Reset to factory defaults. */
export const resetTicketConfig = () => {
  const reset = saveQueue.then(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return normalizeTicketConfig({});
  });
  saveQueue = reset.catch(() => {});
  return reset;
};
