import Constants from 'expo-constants';
import { AppState, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
import { bounded, createCancellation, pause, PrintingError } from './printingOperation';
import { isMXW01DeviceId, loadTicketConfig } from './ticketConfig';
import { decodeCanonicalNotificationValue, MXW01_UUIDS } from './mxw01Protocol';
import { runMXW01Session } from './mxw01Session';
import { beginPrintJob } from './printJob';
import { createA1DiagnosticReport, projectA1Diagnostic, recordA1Failure, runA1Diagnostic } from './mxw01Diagnostic';
import { publishA9Evidence } from './mxw01A9Evidence';

const DEVELOPMENT_BUILD_MESSAGE = 'MXW01 needs a rebuilt Android development APK with Bluetooth support. Expo Go cannot use this printer. Select RawBT in Settings to keep using the older printer.';
let activeOperation = false;

export const assertNativeMXW01Available = () => {
  if (Platform.OS !== 'android') throw new PrintingError('platform', 'Native MXW01 printing is Android-only.');
  if (Constants.appOwnership === 'expo' || !NativeModules.BlePlx) {
    throw new PrintingError('native-unavailable', DEVELOPMENT_BUILD_MESSAGE);
  }
};

const createManager = () => {
  assertNativeMXW01Available();
  // Importing/constructing BLE at module scope would break RawBT in Expo Go.
  try {
    const { BleManager } = require('react-native-ble-plx');
    return new BleManager();
  } catch {
    throw new PrintingError('native-unavailable', DEVELOPMENT_BUILD_MESSAGE);
  }
};

export const requestMXW01Permissions = async (token) => {
  token.check();
  const api = Number(Platform.Version);
  if (!Number.isInteger(api) || api < 23) throw new PrintingError('permission', 'This Android version is not supported for MXW01 printing.');
  const permissions = api >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  if (permissions.some((permission) => !permission)) throw new PrintingError('native-unavailable', DEVELOPMENT_BUILD_MESSAGE);
  const existing = await bounded(Promise.all(permissions.map((permission) => PermissionsAndroid.check(permission))), 3000, token, 'Bluetooth permission check');
  if (existing.every(Boolean)) { token.check(); return; }
  const result = await bounded(PermissionsAndroid.requestMultiple(permissions), 45000, token, 'Bluetooth permission request');
  if (!permissions.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED)) {
    throw new PrintingError('permission', api >= 31
      ? 'Allow Nearby devices in Android app settings, then scan again. No print was sent.'
      : 'Allow Location permission and enable Android Location services to scan on Android 6–11. No print was sent.');
  }
  // System permission Activities may temporarily background Android. No BLE is
  // active yet; let the host resume, then the caller enforces foreground-only work.
  await pause(150, token);
  token.check();
};

const safely = (action) => { try { action(); } catch { /* Continue releasing the other resources. */ } };

const withBLEOperation = async (token, deviceId, work) => {
  if (activeOperation) throw new PrintingError('busy', 'Bluetooth printing or discovery is already running. Wait or cancel it first.');
  activeOperation = true;
  let manager;
  let foreground;
  try {
    assertNativeMXW01Available();
    if (AppState.currentState !== 'active') throw new PrintingError('foreground', 'Keep Golozur in the foreground while using MXW01.');
    await requestMXW01Permissions(token);
    if (AppState.currentState !== 'active') throw new PrintingError('foreground', 'Return to Golozur before using MXW01. No Bluetooth operation was started.');
    foreground = AppState.addEventListener('change', (state) => {
      if (state !== 'active') token.cancel(new PrintingError('foreground', 'Printing stopped because Golozur left the foreground. Check the paper before retrying.'));
    });
    manager = createManager();
    const state = await bounded(manager.state(), 3000, token, 'Bluetooth state');
    if (state !== 'PoweredOn') throw new PrintingError('bluetooth-off', 'Turn on Bluetooth in Android settings, then try again. On Android 6–11 also enable Location services.');
    return await work(manager);
  } finally {
    safely(() => foreground?.remove());
    if (manager) {
      safely(() => manager.stopDeviceScan());
      ['golozur-mxw01-io', 'golozur-mxw01-notify'].forEach((id) => safely(() => manager.cancelTransaction(id)));
      try {
        if (deviceId) await bounded(manager.cancelDeviceConnection(deviceId), 3000, null, 'Disconnect');
      } catch { /* destroy() also cancels native operations; never retry a print. */ }
      safely(() => manager.destroy());
    }
    activeOperation = false;
  }
};

export const isMXW01Candidate = (device) => {
  const name = String(device?.localName || device?.name || '').trim().toUpperCase();
  if (name !== 'MXW01' || !isMXW01DeviceId(device?.id) || device.isConnectable === false) return false;
  const advertised = device.serviceUUIDs;
  return !Array.isArray(advertised) || advertised.length === 0 ||
    advertised.some((service) => MXW01_UUIDS.services.includes(String(service).toLowerCase()));
};

export const scanMXW01Candidates = (manager, token, durationMs = 10000) => new Promise((resolve, reject) => {
  const devices = new Map();
  let unsubscribe = () => {};
  let settled = false;
  const finish = (error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    unsubscribe();
    safely(() => manager.stopDeviceScan());
    if (error) reject(error);
    else resolve([...devices.values()]);
  };
  const timer = setTimeout(() => finish(), Math.min(10000, Math.max(1, durationMs)));
  unsubscribe = token.subscribe(finish);
  if (settled) return;
  try {
    // Some MXW01 advertisements omit the service. Name filtering is strict here;
    // actual services/characteristics are verified on every print connection.
    manager.startDeviceScan(null, { scanMode: 2 }, (error, device) => {
      if (settled) return;
      if (error) return finish(new PrintingError('scan', 'Bluetooth scan failed. Enable Bluetooth and required permissions; close other printer apps.'));
      if (isMXW01Candidate(device)) {
        const id = device.id.toUpperCase();
        if (devices.has(id) || devices.size < 8) devices.set(id, { id, name: 'MXW01' });
      }
    });
  } catch (error) { finish(error); }
});

export const discoverMXW01Printers = ({ token = createCancellation() } = {}) =>
  withBLEOperation(token, null, (manager) => scanMXW01Candidates(manager, token));

const createTransport = async (manager, deviceId, token, statusOnly = false) => {
  // BLE PLX 3.1.2's native timeout can also end an established link; bound opening in JS only.
  const device = await bounded(manager.connectToDevice(deviceId, {
    autoConnect: false, requestMTU: 185,
  }), 15000, token, 'Printer connection');
  await bounded(manager.discoverAllServicesAndCharacteristicsForDevice(deviceId, 'golozur-mxw01-io'), 10000, token, 'Printer service discovery');
  const services = await bounded(manager.servicesForDevice(deviceId), 5000, token, 'Printer services');
  const service = services.find((entry) => MXW01_UUIDS.services.includes(entry.uuid.toLowerCase()))?.uuid;
  if (!service) throw new PrintingError('device', 'The selected device does not expose the MXW01 service. Select the correct MXW01 in Settings.');
  const characteristics = await bounded(manager.characteristicsForDevice(deviceId, service), 5000, token, 'Printer characteristics');
  const find = (id) => characteristics.find((entry) => entry.uuid.toLowerCase() === id);
  if (!find(MXW01_UUIDS.control)?.isWritableWithoutResponse ||
      (!statusOnly && !find(MXW01_UUIDS.data)?.isWritableWithoutResponse) || !find(MXW01_UUIDS.notify)?.isNotifiable) {
    throw new PrintingError('device', 'This device does not have the expected MXW01 characteristics. No print was sent.');
  }
  let failureObserver = null;
  const noteFailure = (origin, error) => {
    if (token.error) return; // A later native event cannot replace cancellation's first cause.
    try {
      if (typeof failureObserver === 'function') {
        const result = failureObserver(origin, error);
        if (result && typeof result.then === 'function') Promise.resolve(result).catch(() => {});
      }
    } catch { /* Passive failure metadata cannot alter errors or cancellation. */ }
  };
  const write = (characteristic, bytes) => {
    token.check();
    if (bytes.length > device.mtu - 3) throw new PrintingError('mtu', 'Bluetooth packet exceeds the negotiated MTU. No automatic retry.');
    const origin = characteristic === MXW01_UUIDS.data ? 'image-write' : 'control-write';
    let promise;
    try {
      promise = manager.writeCharacteristicWithoutResponseForDevice(
        deviceId, service, characteristic, Buffer.from(bytes).toString('base64'), 'golozur-mxw01-io',
      );
    } catch (error) { noteFailure(origin, error); throw error; }
    if (failureObserver) Promise.resolve(promise).then(undefined, (error) => noteFailure(origin, error)).catch(() => {});
    return promise; // Same native Promise and error precedence as before telemetry.
  };
  const monitorRaw = (receive, fail) => {
    const disconnected = manager.onDeviceDisconnected(deviceId, (error) => {
      noteFailure('disconnect', error);
      fail(new PrintingError('connection', 'MXW01 disconnected. Check the paper, keep it nearby and close other printer apps before retrying.'));
    });
    let monitor;
    try {
      monitor = manager.monitorCharacteristicForDevice(deviceId, service, MXW01_UUIDS.notify, (error, characteristic) => {
        if (error) noteFailure('monitor', error);
        receive(characteristic?.value, error);
        if (error) fail(error);
      }, 'golozur-mxw01-notify');
    } catch (error) { noteFailure('monitor', error); failureObserver = null; disconnected.remove(); throw error; }
    return () => {
      failureObserver = null;
      safely(() => disconnected.remove());
      safely(() => monitor.remove());
    };
  };
  const transport = {
    mtu: device.mtu,
    writeControl: (bytes) => write(MXW01_UUIDS.control, bytes),
    monitorRaw,
    monitor(receive, fail, rejected = () => {}, rawObserver, onFailure) {
      failureObserver = onFailure || null;
      return monitorRaw((value, error) => {
        try { if (typeof rawObserver === 'function') rawObserver(value, error); } catch { /* Passive observer cannot affect printing. */ }
        if (error) return;
        const bytes = decodeCanonicalNotificationValue(value);
        if (!bytes) { rejected(); return; }
        receive(bytes);
      }, fail);
    },
  };
  if (!statusOnly) transport.writeData = (bytes) => write(MXW01_UUIDS.data, bytes);
  return transport;
};

export const printMXW01Raster = async (cfg, raster, token, onA9Evidence, a9ReceiveMs) => {
  if (!isMXW01DeviceId(cfg.mxw01DeviceId) || cfg.mxw01DeviceName !== 'MXW01') {
    throw new PrintingError('not-selected', 'Select and save an MXW01 printer in Settings before printing.');
  }
  let report = null;
  try {
    return await withBLEOperation(token, cfg.mxw01DeviceId, async (manager) => {
      const transport = await createTransport(manager, cfg.mxw01DeviceId, token);
      const collect = typeof onA9Evidence === 'function' ? (value) => { report = value; } : undefined;
      const limits = a9ReceiveMs === undefined ? undefined : { a9ReceiveMs };
      return runMXW01Session(transport, raster, token, limits, collect);
    });
  } finally { if (report) publishA9Evidence(onA9Evidence, report); } // Publish only after existing connection cleanup.
};

export const testMXW01Connection = async ({ dirty = false, token } = {}) => {
  const report = createA1DiagnosticReport();
  let job;
  let unsubscribe = () => {};
  try {
    if (dirty) throw new PrintingError('unsaved', 'Unsaved settings');
    job = beginPrintJob(); // Same lock as printing; do not select a print profile/modal.
    if (token) unsubscribe = token.subscribe((error) => job.token.cancel(error));
    const cancellation = job.token;
    cancellation.check();
    report.phase = 'settings';
    const cfg = await bounded(loadTicketConfig(), 5000, cancellation, 'Diagnostic settings');
    if (cfg.printerTransport === 'invalid') throw new PrintingError('config', 'Invalid saved profile');
    if (cfg.printerTransport !== 'mxw01') throw new PrintingError('profile', 'Saved profile is not MXW01');
    if (!isMXW01DeviceId(cfg.mxw01DeviceId) || cfg.mxw01DeviceName !== 'MXW01') throw new PrintingError('not-selected', 'No saved MXW01');
    report.phase = 'permissions-bluetooth';
    await withBLEOperation(cancellation, cfg.mxw01DeviceId, async (manager) => {
      report.phase = 'connection-discovery';
      const transport = await createTransport(manager, cfg.mxw01DeviceId, cancellation, true);
      await runA1Diagnostic(transport, cancellation, report);
    });
  } catch (error) {
    recordA1Failure(report, error); // Never copy native messages, characteristics or IDs.
  } finally {
    unsubscribe();
    job?.finish();
    report.sessionEnded = true;
  }
  return projectA1Diagnostic(report);
};
