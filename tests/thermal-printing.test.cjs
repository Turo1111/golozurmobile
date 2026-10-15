const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

// Load only feature modules. Never load the real client, dotenv, native BLE or
// app entrypoint; these are behavioral mocks, not native/hardware verification.
const root = path.resolve(__dirname, '..');
function harness(options = {}) {
  let stored = options.stored ?? null;
  const alerts = [];
  const urls = [];
  const requests = [];
  const permissionRequests = [];
  const appListeners = new Set();
  const cache = new Map();
  const overrides = new Map();
  let bleLoads = 0;
  const storage = {
    async getItem(key) { assert.equal(key, '@golozur_ticket_config'); if (options.storageError) throw new Error('Storage unavailable'); return stored; },
    async setItem(key, value) { assert.equal(key, '@golozur_ticket_config'); stored = value; },
    async removeItem(key) { assert.equal(key, '@golozur_ticket_config'); stored = null; },
  };
  const permissions = {
    PERMISSIONS: { BLUETOOTH_SCAN: 'scan', BLUETOOTH_CONNECT: 'connect', ACCESS_FINE_LOCATION: 'location' },
    RESULTS: { GRANTED: 'granted' },
    async check() { return false; },
    async requestMultiple(names) {
      permissionRequests.push(names);
      return Object.fromEntries(names.map((name) => [name, options.denied ? 'never_ask_again' : 'granted']));
    },
  };
  const rn = {
    Platform: { OS: options.os || 'android', Version: options.api || 33 },
    NativeModules: options.native ? { BlePlx: {} } : {},
    PermissionsAndroid: permissions,
    AppState: {
      currentState: 'active',
      addEventListener(event, listener) { assert.equal(event, 'change'); appListeners.add(listener); return { remove: () => appListeners.delete(listener) }; },
    },
    Alert: { alert: (...args) => alerts.push(args) },
    Linking: { async openURL(url) { urls.push(url); if (options.rawbtError) throw new Error('No handler'); } },
  };
  const client = {
    async get(url) { requests.push(url); if (options.get) return options.get(url); return { data: options.saleResponse }; },
  };
  function load(name) {
    const filename = path.isAbsolute(name) ? name : path.join(root, 'src/utils/thermal', name);
    const basename = path.basename(filename);
    if (overrides.has(basename)) return overrides.get(basename);
    if (cache.has(filename)) return cache.get(filename).exports;
    assert.ok(filename.startsWith(path.join(root, 'src/utils/thermal') + path.sep), 'Only thermal feature code may execute');
    const source = fs.readFileSync(filename, 'utf8');
    const { code } = babel.transformSync(source, {
      filename, babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
    });
    const module = { exports: {} };
    cache.set(filename, module);
    function localRequire(specifier) {
      if (specifier === 'react-native') return rn;
      if (specifier === 'expo-constants') return { appOwnership: options.ownership || 'expo' };
      if (specifier === '@react-native-async-storage/async-storage') return storage;
      if (specifier === 'buffer') return require('buffer');
      if (specifier === '../client') return client;
      if (specifier === 'react-native-ble-plx') {
        bleLoads += 1;
        assert.ok(options.manager, 'Native dependency must be explicitly mocked');
        return { BleManager: class { constructor() { return options.manager; } } };
      }
      if (specifier.startsWith('.')) return load(path.resolve(path.dirname(filename), specifier + '.js'));
      throw new Error(`Unexpected module: ${specifier}`);
    }
    if (options.runtimeContext) {
      vm.runInContext(`(function (require, module, exports) {\n${code}\n})`, options.runtimeContext, { timeout: 1000 })(localRequire, module, module.exports);
    } else if (options.clock) {
      // Lexical injection controls production Date/timers without changing any
      // source bytes, host globals, prototypes or cross-realm object identities.
      new Function('require', 'module', 'exports', 'Date', 'setTimeout', 'clearTimeout', code)(
        localRequire, module, module.exports, options.clock.Date, options.clock.setTimeout, options.clock.clearTimeout,
      );
    } else {
      new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    }
    return module.exports;
  }
  return {
    load, overrides, alerts, urls, requests, permissionRequests, rn, storage, clock: options.clock,
    get stored() { return stored; }, get bleLoads() { return bleLoads; }, get appListenerCount() { return appListeners.size; },
    background() { rn.AppState.currentState = 'background'; appListeners.forEach((listener) => listener('background')); },
  };
}

const mac = 'AA:BB:CC:DD:EE:FF';
const nativeProfile = { printerTransport: 'mxw01', mxw01DeviceId: mac, mxw01DeviceName: 'MXW01' };
const provided = { cliente: 'Test', fecha: new Date(2025, 0, 2, 3, 4), items: [{ cantidad: 1, descripcion: 'Test', total: 12.5 }], total: 12.5 };
const raster = (height = 1) => ({ width: 384, height, bytes: new Uint8Array(height * 48) });
const fastLimits = { setupMs: 0, paceMs: 0, responseMs: 30, transferMs: 5000, completionMs: 30 };

function feedbackHarness() {
  const cache = new Map();
  const timers = [];
  let state;
  const react = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }), useEffect: (effect) => effect(), useState: (value) => [value] };
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] });
    const module = { exports: {} };
    const localRequire = (name) => {
      if (name === 'react') return react;
      if (name === 'react-native') return { StyleSheet: { create: (styles) => styles }, View: 'View', Text: 'Text', Modal: 'Modal', Pressable: 'Pressable', Animated: { Value: class {}, View: 'AnimatedView', timing: () => {}, sequence: () => {}, loop: () => ({ start() {} }) }, Easing: { inOut() {} } };
      if (name === './Logo') return () => null;
      if (name.endsWith('/hook')) return { useAppSelector: (select) => select(state), useAppDispatch: () => dispatch };
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name + '.js')));
      assert.equal(name, '@reduxjs/toolkit');
      return require(name);
    };
    new Function('require', 'module', 'exports', 'React', 'setTimeout', 'clearTimeout', code)(localRequire, module, module.exports, react, (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, () => {});
    cache.set(filename, module.exports);
    return module.exports;
  }
  const loading = load('src/redux/loadingSlice.js');
  const alert = load('src/redux/alertSlice.js');
  state = { loading: loading.default(undefined, {}), alert: alert.default(undefined, {}) };
  function dispatch(action) { state = { loading: loading.default(state.loading, action), alert: alert.default(state.alert, action) }; }
  return { load, loading, alert, dispatch, timers, get state() { return state; } };
}

test('PR3 Loading releases only its token and preserves legacy/unrelated work', () => {
  const h = feedbackHarness();
  const { acquireLoading, releaseLoading, setLoading, clearLoading, getLoading } = h.loading;
  h.dispatch(setLoading({ message: 'Saving sale' }));
  h.dispatch(acquireLoading({ token: 'thermal', message: 'Printing', thermal: true }));
  h.dispatch(acquireLoading({ token: 'other', message: 'Other work' }));
  h.dispatch(releaseLoading('thermal'));
  assert.equal(getLoading(h.state).message, 'Saving sale');
  h.dispatch(clearLoading());
  assert.equal(getLoading(h.state).message, 'Other work');
  h.dispatch(releaseLoading('stale'));
  assert.equal(getLoading(h.state).open, true);
  h.dispatch(releaseLoading('other'));
  assert.equal(getLoading(h.state).open, false);
});

test('PR3 blocking warning survives transient timers and requires ID-owned dismissal', () => {
  const h = feedbackHarness();
  const { setAlert, clearAlert, dismissBlockingAlert, getBlockingAlert } = h.alert;
  assert.equal(typeof dismissBlockingAlert, 'function');
  h.dispatch(setAlert({ id: 'ordinary', message: 'Ordinary', type: 'success' }));
  const Alert = h.load('src/components/Alert.js').default;
  Alert();
  assert.equal(h.timers[0].ms, 3000);
  h.dispatch(setAlert({ id: 'thermal', thermal: true, message: 'Printed', type: 'success' }));
  h.dispatch(setAlert({ id: 'warning', blocking: true, message: 'Check paper', type: 'warning' }));
  h.timers[0].fn();
  assert.equal(h.alert.getAlert(h.state).id, 'thermal');
  h.timers[0].fn();
  assert.equal(h.alert.getAlert(h.state).open, true, 'Old timers cannot dismiss new notices');
  h.dispatch(clearAlert());
  h.dispatch(dismissBlockingAlert('stale'));
  assert.equal(getBlockingAlert(h.state).id, 'warning');
  const tree = Alert();
  const modal = tree.children.flat().find((node) => node?.type === 'Modal');
  assert.equal(modal.props.visible, true);
  modal.props.onRequestClose();
  assert.equal(getBlockingAlert(h.state).id, 'warning');
  const button = modal.children[0].children[0].children.find((node) => node?.type === 'Pressable');
  button.props.onPress();
  assert.equal(getBlockingAlert(h.state), null);
});

test('PR3 workflow admits once globally, presents truthful results and never retries', async () => {
  const h = feedbackHarness();
  const { createThermalPrintWorkflow } = h.load('src/utils/thermal/thermalPrintWorkflow.js');
  const deps = { acquireLoading: (payload) => h.dispatch(h.loading.acquireLoading(payload)), releaseLoading: (id) => h.dispatch(h.loading.releaseLoading(id)), present: (payload) => h.dispatch(h.alert.setAlert(payload)) };
  for (const status of ['printed', 'sent-unconfirmed', 'unknown-signal', 'omitted', 'error', 'rejection', 'cancel']) {
    let resolve, reject, calls = 0, received;
    const print = (request, options) => { calls++; received = { request, options }; return new Promise((yes, no) => { resolve = yes; reject = no; }); };
    const workflow = createThermalPrintWorkflow({ ...deps, print });
    const request = { mode: 'online', saleId: 'original' };
    const run = workflow.start(request);
    assert.equal(workflow.start(request), null);
    assert.equal(createThermalPrintWorkflow({ ...deps, print }).start(request), null);
    assert.equal(calls, 1);
    assert.equal(received.request.saleId, 'original');
    assert.equal(received.options.silent, true);
    h.dispatch(h.loading.setLoading({ message: 'Unrelated' }));
    if (status === 'cancel') {
      const Loading = h.load('src/components/Loading.js').default;
      Loading({}).props.onRequestClose();
      assert.equal(received.options.token.error, null, 'Unrelated Loading cannot cancel thermal work');
      h.dispatch(h.loading.clearLoading());
      Loading({}).props.onRequestClose();
      assert.ok(received.options.token.error);
      assert.equal(h.loading.getLoading(h.state).open, false, 'Cancellation releases immediately');
      assert.equal(workflow.start(request), null, 'Admission stays held until transport settles');
      h.dispatch(h.loading.setLoading({ message: 'Unrelated' }));
    }
    if (status === 'rejection') reject(new Error('Unexpected'));
    else resolve({ status: status === 'cancel' ? 'printed' : status === 'unknown-signal' ? 'sent-unconfirmed' : status, reason: status === 'printed' ? 'rawbt' : undefined, completionSignal: status === 'unknown-signal' ? 'unknown' : undefined });
    const result = await run;
    assert.equal(calls, 1);
    assert.equal(h.loading.getLoading(h.state).message, 'Unrelated');
    h.dispatch(h.loading.clearLoading());
    assert.equal(h.loading.getLoading(h.state).open, false);
    if (status === 'sent-unconfirmed' || status === 'unknown-signal') {
      assert.equal(result.status, 'sent-unconfirmed');
      assert.equal(h.alert.getBlockingAlert(h.state).type, 'warning');
      assert.equal(h.alert.getBlockingAlert(h.state).color, '#EA906C');
      assert.equal(h.alert.getAlert(h.state).open, false);
      assert.equal(h.alert.getBlockingAlert(h.state).message, 'No recibimos confirmación de la impresora. Revisá el ticket; si no salió, reintentá o revisá la conexión.');
      h.dispatch(h.alert.dismissBlockingAlert(h.alert.getBlockingAlert(h.state).id));
    } else if (status === 'cancel') assert.equal(h.alert.getAlert(h.state).open, false);
    else assert.equal(h.alert.getAlert(h.state).type, status === 'printed' ? 'success' : status === 'omitted' ? 'warning' : 'error');
    if (status === 'printed') {
      assert.equal(result.status, 'printed');
      assert.equal(result.reason, 'rawbt', 'Accepted handoff semantics remain untouched');
      const notice = h.alert.getAlert(h.state);
      assert.equal(notice.message, 'Impresión finalizó correctamente');
      assert.equal(notice.blocking, null);
      assert.equal(notice.color, '#B6E2A1');
      assert.equal(h.alert.getBlockingAlert(h.state), null);
      h.load('src/components/Alert.js').default();
      assert.equal(h.timers.at(-1).ms, 3000);
      h.timers.at(-1).fn();
      assert.equal(h.alert.getAlert(h.state).open, false);
    }
    h.dispatch(h.alert.clearAlert());
  }
});

function recoveryHarness(options = {}) {
  const thermal = harness({ stored: JSON.stringify({ printerTransport: 'mxw01', mxw01History: [historyPrinter(1)] }), ...options });
  const feedback = feedbackHarness(), slots = [], effects = [], cleanups = [], events = new Map(), prints = [];
  let cursor = 0, api;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value) => { slots[i] = value; }]; },
    useEffect(effect) { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(effect); } },
  };
  const cache = new Map();
  const navigation = { addListener(event, fn) { events.set(event, fn); return () => events.delete(event); } };
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative);
    const filename = path.join(root, relative), module = { exports: {} };
    const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] });
    new Function('require', 'module', 'exports', code)((name) => {
      if (name === 'react') return react;
      if (name === 'react-native') return { ...thermal.rn, View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Pressable: 'Pressable', Modal: 'Modal', StyleSheet: { create: (value) => value }, BackHandler: { addEventListener(event, fn) { events.set(event, fn); return { remove: () => events.delete(event) }; } } };
      if (name.endsWith('/hook')) return { useAppDispatch: () => feedback.dispatch, useAppSelector: (fn) => fn(feedback.state) };
      if (name.includes('/redux/')) return feedback.load(`src/redux/${path.basename(name)}.js`);
      if (name.endsWith('/thermalPrintWorkflow')) return feedback.load('src/utils/thermal/thermalPrintWorkflow.js');
      if (name.endsWith('/printSaleTicket')) return { printSaleTicket: async (request, opts) => { prints.push({ request, opts }); return options.print ? options.print(thermal, request, opts) : { status: 'printed' }; } };
      if (name.endsWith('/usePermissionCheck')) return { default: () => ({ hasPermission: options.allowed !== false }) , __esModule: true };
      if (name === './ModalContainer') return { default: 'ModalContainer', __esModule: true };
      if (name.startsWith('react-native-vector-icons/')) return { default: 'Icon', __esModule: true };
      if (name.includes('/thermal/')) return thermal.load(`${path.basename(name)}.js`);
      return load(path.relative(root, path.resolve(path.dirname(filename), name + '.js')));
    }, module, module.exports);
    cache.set(relative, module.exports); return module.exports;
  }
  const hook = load('src/hooks/useThermalPrintWorkflow.js');
  const render = () => { cursor = 0; api = hook.default(navigation); effects.splice(0).forEach((fn) => cleanups.push(fn())); return api; };
  render();
  return { thermal, feedback, prints, load, render, events, unmount: () => cleanups.forEach((fn) => fn?.()), get api() { return render(); } };
}
const recoveryFlush = () => new Promise((resolve) => setImmediate(resolve));
const recoveryDevice = { id: mac, name: 'MXW01' };

test('PR5 caller matrix snapshots provided requests and resumes the original ticket once', async () => {
  const parser = require('@babel/parser');
  const extract = (file, name) => {
    const source = fs.readFileSync(path.join(root, 'src/screens', file + '.js'), 'utf8');
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
    const screen = ast.program.body.find((node) => node.type === 'ExportDefaultDeclaration').declaration;
    const fn = screen.body.body.filter((node) => node.type === 'VariableDeclaration').flatMap((node) => node.declarations).find((node) => node.id.name === name)?.init;
    if (fn) return source.slice(fn.start, fn.end);
    const callbacks = [...source.matchAll(/onPrintThermal=\{([^\n]+)\}/g)];
    return callbacks[name].slice(1)[0];
  };
  for (const [file, name, online] of [['NewSale', 'printCreatedSale', true], ['NewSale', 'printCreatedSale', false], ['EditSale', 'printSale', true], ['EditSale', 'printSale', false], ['DetailsSale', 'printThermalSale', true], ['DetailsSale', 'printThermalSale', false], ['Sale', 0, true], ['Sale', 1, false]]) {
    const s = recoveryHarness(), data = { ...provided, _id: 'original', itemsSale: [{ cantidad: 1, descripcion: 'Original', total: 12.5 }] };
    const details = online ? { r: { _id: 'original' } } : data;
    const context = { mode: online ? 'online' : 'provided', ...(online ? { saleId: 'original' } : { provided: data }) };
    const caller = new Function('workflow', 'printContext', 'offline', 'id', 'cliente', 'total', 'saleDetails', 'lineaVenta', 'details', 'item', `return (${extract(file, name)})`)(s.api, context, !online, 'original', { value: 'Test' }, 12.5, null, data.itemsSale, details, data);
    const run = caller(); await recoveryFlush(); assert.equal(s.render().snapshot.phase, 'needs-selection'); assert.equal(s.prints.length, 0);
    data.itemsSale[0].descripcion = 'Changed after print';
    s.thermal.load('mxw01Ble.js').discoverMXW01Printers = async () => [recoveryDevice]; await s.api.scan();
    const selected = s.api.select(recoveryDevice); s.api.select(recoveryDevice); await selected; await run;
    assert.equal(s.prints.length, 1, file); const request = s.prints[0].request;
    assert.equal(request.mode, online ? 'online' : 'provided');
    if (online) assert.equal(request.saleId, 'original'); else assert.equal(request.provided.itemsSale[0].descripcion, 'Original');
    assert.equal((await s.thermal.load('ticketConfig.js').loadTicketConfig()).mxw01DeviceId, mac);
  }
});

test('PR5 post-sale gate, recovery host suspension and close/finish cancel before navigation', () => {
  const nodes = (tree) => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...(tree.children || []).flatMap(nodes)];
  for (const allowed of [true, false]) for (const os of ['android', 'ios']) {
    const s = recoveryHarness({ allowed, os }); let cancelled = 0, printed = 0;
    const workflow = { snapshot: { phase: 'needs-selection' }, cancel: () => cancelled++ };
    const Component = s.load('src/components/AlertPostSale.js').default;
    const props = { open: true, workflow, print: () => printed++, onClose: () => assert.ok(cancelled), post: () => assert.ok(cancelled) };
    const tree = Component(props), buttons = nodes(tree).filter((node) => node.type === 'TouchableOpacity');
    assert.equal(buttons.length, allowed && os === 'android' ? 2 : 1);
    if (buttons.length === 2) assert.equal(buttons[0].props.disabled, true);
    assert.ok(nodes(tree).some((node) => node.props.workflow === workflow));
    tree.props.onClose(); buttons.at(-1).props.onPress(); assert.equal(cancelled, 2); assert.equal(printed, 0);
    s.feedback.dispatch(s.feedback.loading.setLoading({ message: 'Unrelated' })); assert.equal(Component(props).props.openModal, false);
    s.feedback.dispatch(s.feedback.loading.clearLoading()); s.feedback.dispatch(s.feedback.alert.setAlert({ blocking: true, message: 'Warning' }));
    assert.equal(Component(props).props.openModal, false);
    const SaleItem = s.load('src/components/SaleItem.js').default;
    for (const isOffline of [true, false]) {
      const row = SaleItem({ item: { cliente: 'Test' }, isOffline, hasPermissionUpdateSale: allowed, onPrintThermal: props.print });
      const printButtons = nodes(row).filter((node) => node.props.onPress === props.print);
      assert.equal(printButtons.length, allowed && os === 'android' ? 1 : 0);
    }
  }
});

test('PR5 shared feedback uses a cancellable silent facade with one exact warning and no native success', async () => {
  for (const status of ['printed', 'sent-unconfirmed', 'error', 'omitted', 'cancel']) {
    const s = recoveryHarness({ stored: JSON.stringify(nativeProfile), os: status === 'omitted' ? 'ios' : 'android',
      print: (h, request, opts) => h.load('printSaleTicket.js').printSaleTicket(request, opts) });
    let release;
    s.thermal.overrides.set('rasterRenderer.js', { renderMXW01Receipt: async () => raster() });
    s.thermal.overrides.set('mxw01Ble.js', { assertNativeMXW01Available() {}, async requestMXW01Permissions() {},
      async printMXW01Raster(cfg, image, token) {
        if (status === 'cancel') { await new Promise((resolve) => { release = resolve; }); token.check(); }
        if (status === 'error') throw Error('Connection unavailable'); return { status };
      } });
    const run = s.api.start({ mode: 'provided', provided }); await recoveryFlush();
    if (status === 'cancel') { s.api.cancel(); release(); }
    const result = await run; assert.equal(s.thermal.alerts.length, 0, status); assert.equal(s.prints.length, 1);
    assert.equal(s.feedback.loading.getLoading(s.feedback.state).open, false);
    if (status === 'sent-unconfirmed') {
      assert.equal(result.status, status); assert.equal(s.feedback.alert.getBlockingAlert(s.feedback.state).message, 'No recibimos confirmación de la impresora. Revisá el ticket; si no salió, reintentá o revisá la conexión.');
      assert.equal(s.feedback.alert.getAlert(s.feedback.state).open, false);
    } else if (status === 'cancel') assert.equal(s.feedback.alert.getAlert(s.feedback.state).open, false);
    else assert.equal(s.feedback.alert.getAlert(s.feedback.state).type, status === 'printed' ? 'success' : status === 'error' ? 'error' : 'warning');
    if (status === 'printed') {
      assert.equal(result.status, 'printed');
      assert.equal(s.feedback.alert.getAlert(s.feedback.state).message, 'Impresión finalizó correctamente');
      assert.equal(s.feedback.alert.getBlockingAlert(s.feedback.state), null);
    }
    await s.api.retry(); assert.equal(s.prints.length, 1);
  }
  const raw = harness(); assert.equal((await raw.load('printSaleTicket.js').printSaleTicket({ mode: 'provided', provided }, { silent: true })).status, 'printed');
  assert.equal(raw.urls.length, 1); assert.equal(raw.alerts.length, 0);
});

test('PR5 observed AA signal keeps the sale result unconfirmed with a green nonblocking transient toast', async () => {
  const s = recoveryHarness({ stored: JSON.stringify(nativeProfile),
    print: (h, request, opts) => h.load('printSaleTicket.js').printSaleTicket(request, opts) });
  const expected = { status: 'sent-unconfirmed', completionSignal: 'observed-aa-shape' };
  let transfers = 0;
  s.thermal.overrides.set('rasterRenderer.js', { renderMXW01Receipt: async () => raster() });
  s.thermal.overrides.set('mxw01Ble.js', { assertNativeMXW01Available() {}, async requestMXW01Permissions() {},
    async printMXW01Raster() { transfers++; return expected; } });
  const result = await s.api.start({ mode: 'provided', provided });
  assert.deepEqual(result, expected);
  const h = s.feedback, notice = h.alert.getAlert(h.state);
  assert.equal(notice.message, 'Impresión finalizó correctamente');
  assert.equal(notice.type, 'success');
  assert.equal(notice.color, '#B6E2A1');
  assert.equal(notice.open, true);
  assert.equal(notice.blocking, null);
  assert.equal(h.alert.getBlockingAlert(h.state), null);
  assert.equal(h.loading.getLoading(h.state).open, false);
  assert.equal(s.thermal.alerts.length, 0);
  const tree = h.load('src/components/Alert.js').default();
  const modal = tree.children.flat().find((node) => node?.type === 'Modal');
  assert.equal(modal.props.visible, false);
  assert.equal(h.timers[0].ms, 3000);
  h.timers[0].fn();
  assert.equal(h.alert.getAlert(h.state).open, false);
  assert.equal(h.alert.getBlockingAlert(h.state), null);
  await s.api.retry();
  assert.equal(s.prints.length, 1);
  assert.equal(transfers, 1, 'No automatic retry or resend after the transient toast');
});

test('PR5 cancellation during the original online read suppresses RawBT handoff and late feedback', async () => {
  let resolve;
  const s = recoveryHarness({ stored: '{}', get: () => new Promise((yes) => { resolve = yes; }),
    print: (h, request, opts) => h.load('printSaleTicket.js').printSaleTicket(request, opts) });
  const run = s.api.start({ mode: 'online', saleId: 'original' }); await recoveryFlush(); s.events.get('blur')();
  resolve({ data: provided }); await run;
  assert.deepEqual(s.thermal.requests, ['/sale/original']); assert.equal(s.thermal.urls.length + s.thermal.alerts.length, 0);
  assert.equal(s.feedback.alert.getAlert(s.feedback.state).open, false);
});

test('PR4 recovery uses guarded ten-second discovery, deduplicates and requires explicit retry', async () => {
  let callback, scans = 0, stops = 0;
  const clock = controlledClock();
  const manager = { async state() { return 'PoweredOn'; }, startDeviceScan(a, b, fn) { callback = fn; scans++; }, stopDeviceScan() { stops++; }, cancelTransaction() {}, destroy() {} };
  const s = recoveryHarness({ native: true, ownership: 'standalone', manager, clock });
  const run = s.api.start({ mode: 'online', saleId: 'original' }); await recoveryFlush();
  assert.equal(s.api.start({ mode: 'online', saleId: 'competitor' }), null);
  assert.equal(s.render().snapshot.phase, 'needs-selection'); assert.equal(scans, 0); assert.equal(s.prints.length, 0);
  const scan = s.api.scan(); s.api.scan(); await clock.flushMicrotasks(); await clock.settle(scan);
  assert.equal(scans, 1); assert.equal(clock.now, 10150); assert.equal(s.render().snapshot.phase, 'scan-error');
  assert.equal(scans, 1, 'Empty scans never automatically retry');
  const retry = s.api.retry(); await clock.flushMicrotasks(); clock.fireNextTimer(); await clock.flushMicrotasks();
  callback(null, { ...recoveryDevice, id: mac.toLowerCase() }); callback(null, recoveryDevice); callback(null, { id: mac, name: 'Other' });
  await clock.settle(retry); assert.deepEqual(s.render().snapshot.candidates, [recoveryDevice]); assert.ok(stops >= 2);
  s.api.cancel(); await run;
  for (const options of [{ native: true, ownership: 'standalone', manager, denied: true }, { native: true, ownership: 'standalone', manager }]) {
    const guarded = recoveryHarness(options); if (!options.denied) guarded.thermal.rn.AppState.currentState = 'background';
    const pending = guarded.api.start({ mode: 'provided', provided }); await recoveryFlush(); await guarded.api.scan();
    assert.equal(guarded.render().snapshot.phase, 'scan-error'); assert.equal(guarded.prints.length, 0); guarded.api.cancel(); await pending;
  }
});

test('PR4 failed save retains candidate/request; explicit retry saves before exact-once same-ticket resume', async () => {
  const s = recoveryHarness(), cfg = s.thermal.load('ticketConfig.js');
  s.thermal.load('mxw01Ble.js').discoverMXW01Printers = async () => [recoveryDevice];
  const request = { mode: 'provided', provided }, run = s.api.start(request); await recoveryFlush(); await s.api.scan();
  const save = cfg.selectMXW01Printer; let release, saves = 0;
  cfg.selectMXW01Printer = async (device) => { saves++; if (saves === 1) throw Error('Storage unavailable'); await new Promise((resolve) => { release = resolve; }); return save(device); };
  await s.api.select(recoveryDevice); assert.equal(s.render().snapshot.phase, 'save-error'); assert.equal(s.prints.length, 0); assert.equal(saves, 1);
  const retry = s.api.retry(); s.api.retry(); s.api.select(recoveryDevice); await recoveryFlush(); assert.equal(saves, 2); assert.equal(s.prints.length, 0);
  release(); await retry; await run; assert.equal(s.prints.length, 1); assert.equal(s.prints[0].request, request);
  assert.equal((await cfg.loadTicketConfig()).mxw01DeviceId, mac); await s.api.retry(); assert.equal(s.prints.length, 1);
});

test('PR4 cancellation during accepted save persists explicit selection without resume or duplicate output', async () => {
  const s = recoveryHarness(), cfg = s.thermal.load('ticketConfig.js'); let release;
  s.thermal.load('mxw01Ble.js').discoverMXW01Printers = async () => [recoveryDevice];
  const write = s.thermal.storage.setItem;
  s.thermal.storage.setItem = async (...args) => { await new Promise((resolve) => { release = resolve; }); return write(...args); };
  const run = s.api.start({ mode: 'online', saleId: 'original' }); await recoveryFlush(); await s.api.scan();
  const selected = s.api.select(recoveryDevice); await recoveryFlush();
  s.feedback.dispatch(s.feedback.loading.setLoading({ message: 'Unrelated' })); s.api.cancel(); release(); await selected; await run;
  assert.equal((await cfg.loadTicketConfig()).mxw01DeviceId, mac); assert.equal(s.prints.length, 0);
  assert.equal(s.feedback.loading.getLoading(s.feedback.state).message, 'Unrelated'); assert.equal(s.feedback.alert.getAlert(s.feedback.state).open, false);
  await s.api.select(recoveryDevice); await s.api.retry(); assert.equal(s.prints.length, 0);
});

test('PR4 stale selection actions cannot save or resume a newer ticket generation', async () => {
  const s = recoveryHarness();
  s.thermal.load('mxw01Ble.js').discoverMXW01Printers = async () => [recoveryDevice];
  const first = s.api.start({ mode: 'online', saleId: 'old' }); await recoveryFlush(); await s.api.scan();
  const stale = s.api; stale.cancel(); await first;
  const next = s.api.start({ mode: 'online', saleId: 'new' }); await recoveryFlush(); await s.api.scan();
  await stale.select(recoveryDevice); stale.cancel();
  assert.equal(s.render().snapshot.phase, 'selecting'); assert.equal(s.prints.length, 0);
  assert.equal((await s.thermal.load('ticketConfig.js').loadTicketConfig()).mxw01DeviceId, null);
  s.api.cancel(); await next;
});

test('PR4 cancel/back/blur/unmount suppress stale discovery callbacks and clean owned Loading', async () => {
  for (const action of ['cancel', 'hardwareBackPress', 'blur', 'unmount', 'loading-back']) {
    const s = recoveryHarness(); let finish, token;
    s.thermal.load('mxw01Ble.js').discoverMXW01Printers = (opts) => { token = opts.token; return new Promise((resolve) => { finish = resolve; }); };
    const run = s.api.start({ mode: 'online', saleId: 'original' }); await recoveryFlush(); const scan = s.api.scan();
    if (action === 'cancel') s.api.cancel(); else if (action === 'unmount') s.unmount();
    else if (action === 'loading-back') s.feedback.load('src/components/Loading.js').default({}).props.onRequestClose();
    else s.events.get(action)();
    assert.ok(token.error); assert.equal(s.feedback.loading.getLoading(s.feedback.state).open, false);
    finish([recoveryDevice]); await scan; await run; await s.api.select(recoveryDevice);
    assert.equal((await s.thermal.load('ticketConfig.js').loadTicketConfig()).mxw01DeviceId, null); assert.equal(s.prints.length, 0);
  }
});

test('PR4 panel offers actionable Retry/Cancel; modal back cancels and blocking feedback suspends host', () => {
  const s = recoveryHarness(); let cancelled = 0, retried = 0;
  const workflow = { snapshot: { phase: 'save-error', candidates: [], message: 'Save failed' }, cancel: () => cancelled++, retry: () => retried++ };
  const tree = s.load('src/components/ThermalPrintPanel.js').default({ workflow });
  const buttons = tree.children.flat().filter((node) => node?.type === 'Pressable');
  buttons.find((node) => node.children[0]?.children.includes('Reintentar')).props.onPress(); buttons.find((node) => node.children[0]?.children.includes('Cancelar')).props.onPress();
  assert.equal(retried, 1); assert.equal(cancelled, 1);
  const Modal = s.load('src/components/ThermalPrintModal.js').default;
  const modal = Modal({ workflow, visible: true }); assert.equal(modal.props.visible, true); modal.props.onRequestClose(); assert.equal(cancelled, 2);
  s.feedback.dispatch(s.feedback.alert.setAlert({ blocking: true, message: 'Check paper', type: 'warning' }));
  assert.equal(Modal({ workflow, visible: true }).props.visible, false);
});

test('configuration migrates old installs to RawBT and preserves all legacy settings on partial/concurrent saves', async () => {
  const old = { titleWidthMultiplier: 3, headerFont: 'B', headerHeightMultiplier: 2, bodyFont: 'B', bodyBold: true, itemSpacing: 16, footerFont: 'B', totalHeightMultiplier: 2, feedLines: 6, autoCut: false, partialCut: false, useCodePageCommand: true, columns: 48 };
  const h = harness({ stored: JSON.stringify(old) });
  const cfg = h.load('ticketConfig.js');
  assert.equal((await cfg.loadTicketConfig()).printerTransport, 'rawbt');
  await cfg.saveTicketConfig(nativeProfile);
  for (const [key, value] of Object.entries(old)) assert.equal(JSON.parse(h.stored)[key], value, key);
  await Promise.all([cfg.saveTicketConfig({ mxw01TextSize: 14 }), cfg.saveTicketConfig({ feedLines: 7 })]);
  const saved = await cfg.loadTicketConfig();
  assert.equal(saved.mxw01TextSize, 14);
  assert.equal(saved.feedLines, 7);
  assert.equal(saved.titleWidthMultiplier, 3);
  assert.equal(saved.mxw01DeviceId, mac);
  await cfg.resetTicketConfig();
  assert.equal((await cfg.loadTicketConfig()).printerTransport, 'rawbt');
});

test('new profile fields are validated; unknown/corrupt/unreadable settings fail closed', async () => {
  const cfg = harness().load('ticketConfig.js');
  assert.equal(cfg.normalizeTicketConfig({}).printerTransport, 'rawbt');
  assert.equal(cfg.normalizeTicketConfig({ printerTransport: 'funprint' }).printerTransport, 'invalid');
  assert.equal(cfg.normalizeTicketConfig({ ...nativeProfile, mxw01DeviceId: 'anything' }).mxw01DeviceId, null);
  assert.equal(cfg.normalizeTicketConfig({ ...nativeProfile, mxw01DeviceName: 'Other printer' }).mxw01DeviceId, null);
  assert.equal(cfg.normalizeTicketConfig({ ...nativeProfile, mxw01DeviceId: mac.toLowerCase() }).mxw01DeviceId, mac);
  for (const value of [0, 25, '18', Infinity, null]) assert.equal(cfg.normalizeTicketConfig({ mxw01TextSize: value }).mxw01TextSize, 18);
  for (const stored of ['{broken', '[]', 'null']) {
    assert.equal((await harness({ stored }).load('ticketConfig.js').loadTicketConfig()).printerTransport, 'invalid');
  }
  assert.equal((await harness({ storageError: true }).load('ticketConfig.js').loadTicketConfig()).printerTransport, 'invalid');
  const corrupt = harness({ stored: '{broken' });
  await assert.rejects(corrupt.load('ticketConfig.js').saveTicketConfig({ printerTransport: 'rawbt' }), /cannot be safely loaded/);
  assert.equal(corrupt.stored, '{broken', 'A profile patch must not erase unreadable settings');
});

const historyPrinter = (index) => ({ id: `AA:BB:CC:DD:EE:${index.toString(16).padStart(2, '0').toUpperCase()}`, name: 'MXW01' });

test('history migration seeds only valid legacy selection, preserves profiles/formatting and does not write on load', async () => {
  const legacy = { ...nativeProfile, mxw01DeviceId: mac.toLowerCase(), bodyFont: 'B', bodyBold: true, feedLines: 7, mxw01TextSize: 14, futureField: 'preserved' };
  for (const history of [undefined, null, 'invalid', {}, [{ id: 'invalid', name: 'MXW01' }]]) {
    const stored = JSON.stringify({ ...legacy, mxw01History: history });
    const h = harness({ stored });
    const cfg = h.load('ticketConfig.js');
    const loaded = await cfg.loadTicketConfig();
    assert.deepEqual(loaded.mxw01History, [{ id: mac, name: 'MXW01' }]);
    assert.equal(h.stored, stored, 'Migration stays lazy until an explicit write');
    const saved = await cfg.saveTicketConfig({ itemSpacing: 8 });
    for (const [key, value] of Object.entries(legacy)) {
      assert.equal(saved[key], key === 'mxw01DeviceId' ? mac : value, key);
    }
    assert.deepEqual(JSON.parse(h.stored).mxw01History, loaded.mxw01History);
  }
  const cfg = harness().load('ticketConfig.js');
  for (const profile of ['rawbt', 'mxw01', 'corrupt']) {
    const normalized = cfg.normalizeTicketConfig({ printerTransport: profile, mxw01History: [historyPrinter(1)] });
    assert.equal(normalized.mxw01DeviceId, null, 'History must never select a printer');
    assert.equal(normalized.printerTransport, profile === 'corrupt' ? 'invalid' : profile);
  }
  assert.deepEqual(cfg.normalizeTicketConfig({ ...nativeProfile, mxw01History: [] }).mxw01History, []);
  assert.deepEqual(cfg.normalizeTicketConfig({ ...nativeProfile, mxw01DeviceName: 'Other' }).mxw01History, []);
  assert.deepEqual((await cfg.loadTicketConfig()).mxw01History, []);
  assert.deepEqual((await harness({ stored: '{broken' }).load('ticketConfig.js').loadTicketConfig()).mxw01History, []);
});

test('history normalization filters invalid entries, canonicalizes/deduplicates IDs and caps ten while retaining current', () => {
  const cfg = harness().load('ticketConfig.js');
  const devices = Array.from({ length: 11 }, (_, index) => historyPrinter(index));
  const input = [devices[0], { ...devices[0], id: devices[0].id.toLowerCase(), private: 'discard' }, null, { id: mac, name: 'Other' }, { id: 'bad', name: 'MXW01' }, ...devices.slice(1)];
  const before = JSON.stringify(input);
  const normalized = cfg.normalizeTicketConfig({ mxw01History: input });
  assert.deepEqual(normalized.mxw01History, devices.slice(0, 10));
  assert.equal(normalized.mxw01DeviceId, null);
  assert.equal(JSON.stringify(input), before, 'Normalization must not mutate its input');
  const current = devices[10];
  const retained = cfg.normalizeTicketConfig({ mxw01History: input, mxw01DeviceId: current.id, mxw01DeviceName: current.name });
  assert.equal(retained.mxw01History.length, 10);
  assert.ok(retained.mxw01History.some((device) => device.id === current.id));
  assert.equal(retained.mxw01DeviceId, current.id);
});

test('explicit selection maintains newest-first bounded history without changing profile or formatting', async () => {
  const h = harness({ stored: JSON.stringify({ printerTransport: 'rawbt', headerFont: 'B', titleWidthMultiplier: 3, futureField: 42 }) });
  const cfg = h.load('ticketConfig.js');
  const devices = Array.from({ length: 11 }, (_, index) => historyPrinter(index));
  for (const device of devices) await cfg.selectMXW01Printer(device);
  const selected = await cfg.selectMXW01Printer({ ...devices[4], id: devices[4].id.toLowerCase(), serviceUUIDs: ['not-persisted'] });
  assert.deepEqual(selected.mxw01History, [devices[4], ...devices.slice(1).reverse().filter((device) => device.id !== devices[4].id)]);
  assert.equal(selected.mxw01DeviceId, devices[4].id);
  assert.equal(selected.mxw01DeviceName, 'MXW01');
  assert.equal(selected.printerTransport, 'rawbt');
  assert.equal(selected.headerFont, 'B');
  assert.equal(selected.titleWidthMultiplier, 3);
  assert.equal(selected.futureField, 42);
  assert.deepEqual(await cfg.loadTicketConfig(), JSON.parse(h.stored));
});

test('explicit removal clears only matching current selection without history fallback', async () => {
  const h = harness({ stored: JSON.stringify({ ...nativeProfile, bodyBold: true, mxw01History: [{ id: mac, name: 'MXW01' }, historyPrinter(1)] }) });
  const cfg = h.load('ticketConfig.js');
  const otherRemoved = await cfg.removeMXW01Printer(historyPrinter(1).id.toLowerCase());
  assert.equal(otherRemoved.mxw01DeviceId, mac);
  assert.deepEqual(otherRemoved.mxw01History, [{ id: mac, name: 'MXW01' }]);
  await cfg.selectMXW01Printer(historyPrinter(2));
  const removed = await cfg.removeMXW01Printer(historyPrinter(2).id);
  assert.equal(removed.mxw01DeviceId, null);
  assert.equal(removed.mxw01DeviceName, null);
  assert.deepEqual(removed.mxw01History, [{ id: mac, name: 'MXW01' }]);
  assert.equal(removed.printerTransport, 'mxw01');
  assert.equal(removed.bodyBold, true);
  const loaded = await cfg.loadTicketConfig();
  assert.equal(loaded.mxw01DeviceId, null, 'Reload must not select remaining history');
  await cfg.removeMXW01Printer(mac.toLowerCase());
  assert.deepEqual((await cfg.saveTicketConfig({ feedLines: 6 })).mxw01History, []);
  await cfg.resetTicketConfig();
  assert.deepEqual((await cfg.loadTicketConfig()).mxw01History, []);
});

test('queued selection/removal and formatting/profile patches merge latest storage, not stale snapshots', async () => {
  const h = harness({ stored: JSON.stringify({ ...nativeProfile, mxw01History: [{ id: mac, name: 'MXW01' }] }) });
  const cfg = h.load('ticketConfig.js');
  const [first, formatting, second, removed, profile] = await Promise.all([
    cfg.selectMXW01Printer(historyPrinter(1)),
    cfg.saveTicketConfig({ bodyFont: 'B', feedLines: 7, futureField: 'kept' }),
    cfg.selectMXW01Printer(historyPrinter(2)),
    cfg.removeMXW01Printer(historyPrinter(1).id),
    cfg.saveTicketConfig({ printerTransport: 'rawbt' }),
  ]);
  assert.equal(first.mxw01DeviceId, historyPrinter(1).id);
  assert.equal(formatting.mxw01DeviceId, historyPrinter(1).id);
  assert.equal(second.bodyFont, 'B');
  assert.equal(removed.mxw01DeviceId, historyPrinter(2).id);
  assert.equal(profile.futureField, 'kept');
  assert.deepEqual(profile.mxw01History, [historyPrinter(2), { id: mac, name: 'MXW01' }]);
  assert.equal(profile.feedLines, 7);
  assert.deepEqual(await cfg.loadTicketConfig(), profile);
  await Promise.all([cfg.removeMXW01Printer(historyPrinter(2).id), cfg.saveTicketConfig({ mxw01TextSize: 16 })]);
  assert.equal((await cfg.loadTicketConfig()).mxw01DeviceId, null);
  await Promise.all([cfg.resetTicketConfig(), cfg.selectMXW01Printer(historyPrinter(3))]);
  const resetThenSelected = await cfg.loadTicketConfig();
  assert.deepEqual(resetThenSelected.mxw01History, [historyPrinter(3)]);
  assert.equal(resetThenSelected.bodyFont, 'A');
});

test('invalid selection/removal and failed storage preserve bytes and do not poison the write queue', async () => {
  const h = harness({ stored: JSON.stringify(nativeProfile) });
  const cfg = h.load('ticketConfig.js');
  const before = h.stored;
  for (const device of [null, { id: 'invalid', name: 'MXW01' }, { id: mac, name: 'Other' }]) {
    await assert.rejects(cfg.selectMXW01Printer(device), /Invalid MXW01 printer/);
  }
  await assert.rejects(cfg.removeMXW01Printer('invalid'), /Invalid MXW01 printer/);
  assert.equal(h.stored, before);
  assert.equal((await cfg.selectMXW01Printer(historyPrinter(1))).mxw01DeviceId, historyPrinter(1).id);
  const broken = harness({ stored: '{broken' });
  const corrupt = broken.load('ticketConfig.js');
  await assert.rejects(corrupt.selectMXW01Printer(historyPrinter(1)), /cannot be safely loaded/);
  await assert.rejects(corrupt.removeMXW01Printer(mac), /cannot be safely loaded/);
  assert.equal(broken.stored, '{broken');
  await corrupt.resetTicketConfig();
  assert.deepEqual((await corrupt.selectMXW01Printer(historyPrinter(2))).mxw01History, [historyPrinter(2)]);
});

test('RawBT default receipt bytes and URL dispatch are unchanged from the pre-existing dirty implementation', async () => {
  const h = harness();
  const expected = Buffer.concat([
    Buffer.from([0x1b, 0x40, 0x1b, 0x61, 1, 0x1d, 0x21, 0x11]), Buffer.from('GOLOZUR\n'),
    Buffer.from([0x1b, 0x40, 0x1b, 0x61, 0]), Buffer.from('Fecha: 02/01/2025 03:04\nCliente: Test\n'),
    Buffer.from('-'.repeat(32) + '\n'), Buffer.from('1x Test'.padEnd(26) + '$12,50\n'),
    Buffer.from('-'.repeat(32) + '\n' + 'TOTAL'.padEnd(26) + '$12,50\n'),
    Buffer.from([0x1b, 0x61, 1]), Buffer.from('*NO VALIDO COMO FACTURA\n'),
    Buffer.from([0x1b, 0x61, 0, 0x1b, 0x64, 4, 0x1d, 0x56, 0x42, 0]),
  ]);
  assert.deepEqual(Buffer.from(h.load('ticket.js').buildSaleTicket(provided)), expected);
  const result = await h.load('printSaleTicket.js').printSaleTicket({ mode: 'provided', provided });
  assert.deepEqual(result, { status: 'printed' });
  assert.equal(h.urls[0], `rawbt:base64,${expected.toString('base64')}`);
  assert.equal(h.bleLoads, 0);
  assert.equal(h.requests.length, 0);
  assert.equal(h.alerts.length, 0);
});

test('RawBT delivery failure remains an error with its existing installation feedback', async () => {
  const h = harness({ rawbtError: true });
  assert.deepEqual(await h.load('printSaleTicket.js').printSaleTicket({ mode: 'provided', provided }), { status: 'error', reason: 'rawbt' });
  assert.equal(h.alerts.length, 1);
  assert.equal(h.alerts[0][0], 'RawBT no está instalado');
  const { RAWBT_PLAY_STORE_URL } = h.load('rawbt.js');
  assert.equal(h.alerts[0][1], `Instalá RawBT para imprimir en la térmica:\n${RAWBT_PLAY_STORE_URL}`);
  const buttons = h.alerts[0][2];
  assert.deepEqual(buttons[0], { text: 'Cancelar', style: 'cancel' });
  assert.equal(buttons[1].text, 'Instalar');
  buttons[1].onPress();
  assert.equal(h.urls.at(-1), RAWBT_PLAY_STORE_URL);
  assert.equal(h.bleLoads, 0);
});

test('RawBT silent transport failure returns false without a native installation alert', async () => {
  const h = harness({ rawbtError: true });
  const bytes = Buffer.from([0x1b, 0x40]);
  assert.equal(await h.load('rawbt.js').sendToRawBT(bytes, { silent: true }), false);
  assert.equal(h.alerts.length, 0);
  assert.deepEqual(h.urls, [`rawbt:base64,${bytes.toString('base64')}`]);
});

test('PR5 RawBT silent failure presents exactly one shared error alert', async () => {
  const h = harness({ rawbtError: true }), feedback = feedbackHarness(), notices = [];
  const { createThermalPrintWorkflow } = feedback.load('src/utils/thermal/thermalPrintWorkflow.js');
  const workflow = createThermalPrintWorkflow({
    print: h.load('printSaleTicket.js').printSaleTicket,
    acquireLoading: (payload) => feedback.dispatch(feedback.loading.acquireLoading(payload)),
    releaseLoading: (id) => feedback.dispatch(feedback.loading.releaseLoading(id)),
    present: (payload) => { notices.push(payload); feedback.dispatch(feedback.alert.setAlert(payload)); },
  });
  assert.deepEqual(await workflow.start({ mode: 'provided', provided }), { status: 'error', reason: 'rawbt' });
  assert.equal(h.alerts.length, 0);
  assert.equal(notices.length, 1);
  assert.equal(notices.length + h.alerts.length, 1);
  assert.equal(feedback.alert.getAlert(feedback.state).type, 'error');
  assert.equal(feedback.alert.getAlert(feedback.state).open, true);
  assert.equal(feedback.alert.getBlockingAlert(feedback.state), null);
  assert.equal(feedback.loading.getLoading(feedback.state).open, false);
  assert.equal(h.urls.length, 1, 'Failed handoff is not automatically retried');
  assert.equal(h.bleLoads, 0);
});

test('normalization keeps fetched-versus-provided behavior and historical unit prices', async () => {
  const fetched = { r: { _id: 'sale-id', cliente: 'API customer', total: 10, createdAt: '2025-01-02' }, itemsSale: [{ producto: { descripcion: 'Historic product' }, cantidad: '2', total: '10', precio: 999 }] };
  const h = harness({ saleResponse: fetched });
  const data = h.load('saleTicketData.js');
  assert.equal((await data.getSaleTicketData({ mode: 'online', saleId: 'sale-id', provided })).cliente, 'API customer');
  assert.deepEqual(h.requests, ['/sale/sale-id']);
  assert.equal((await data.getSaleTicketData({ mode: 'provided', provided })).cliente, 'Test');
  assert.equal(data.normalizeSale(fetched).items[0].precioUnitario, 5);
  assert.equal(data.resolveUnitPrice({ precioUnitario: 3.25 }), 3.25);
  await assert.rejects(data.getSaleTicketData({ mode: 'online' }));
  await assert.rejects(data.getSaleTicketData({ mode: 'provided' }));
});

test('Android-only facade omits other platforms without storage/API/BLE actions', async () => {
  const h = harness({ os: 'ios', storageError: true });
  assert.deepEqual(await h.load('printSaleTicket.js').printSaleTicket({}), { status: 'omitted', reason: 'platform' });
  assert.equal(h.urls.length + h.requests.length + h.bleLoads + h.alerts.length, 0);
});

test('Expo Go and a development APK missing the module return a clear native requirement without loading BLE', async () => {
  for (const options of [{ ownership: 'expo', native: true }, { ownership: 'standalone', native: false }]) {
    const h = harness({ ...options, stored: JSON.stringify(nativeProfile) });
    const result = await h.load('printSaleTicket.js').printSaleTicket({ mode: 'provided', provided });
    assert.equal(result.status, 'error');
    assert.equal(result.reason, 'native-unavailable');
    assert.match(result.message, /rebuilt Android development APK.*Expo Go/);
    assert.equal(h.bleLoads + h.urls.length + h.requests.length, 0);
  }
});

test('not-selected and invalid profiles block rather than falling back to RawBT', async () => {
  for (const [profile, code] of [[{ printerTransport: 'mxw01' }, 'not-selected'], [{ printerTransport: 'other' }, 'config']]) {
    const h = harness({ native: true, ownership: 'standalone', stored: JSON.stringify(profile) });
    const result = await h.load('printSaleTicket.js').printSaleTicket({ mode: 'provided', provided });
    assert.equal(result.reason, code);
    assert.equal(h.urls.length + h.bleLoads, 0);
    assert.equal(h.alerts.length, 1);
  }
});

test('single facade dispatches normalized native data, reports failures and never selects RawBT as fallback', async () => {
  const h = harness({ stored: JSON.stringify(nativeProfile) });
  const { PrintingError } = h.load('printingOperation.js');
  let normalized;
  h.overrides.set('rasterRenderer.js', { renderMXW01Receipt: async (data) => { normalized = data; return raster(); } });
  h.overrides.set('mxw01Ble.js', {
    assertNativeMXW01Available() {},
    async requestMXW01Permissions() {},
    async printMXW01Raster(cfg) { assert.equal(cfg.mxw01DeviceId, mac); throw new PrintingError('connection', 'Reconnect MXW01 and check paper.'); },
  });
  const result = await h.load('printSaleTicket.js').printSaleTicket({ mode: 'provided', provided });
  assert.equal(normalized.items[0].precioUnitario, 12.5);
  assert.equal(result.reason, 'connection');
  assert.equal(h.urls.length, 0);
  assert.equal(h.appListenerCount, 0);
  assert.equal(h.alerts[0][1], 'Reconnect MXW01 and check paper.');
});

test('facade rejects a concurrent job and releases the lock after completion', async () => {
  let resolve;
  const waiting = new Promise((yes) => { resolve = yes; });
  const h = harness({ get: () => waiting });
  const { printSaleTicket } = h.load('printSaleTicket.js');
  const first = printSaleTicket({ mode: 'online', saleId: 'sale-id' });
  assert.equal((await printSaleTicket({ mode: 'provided', provided })).reason, 'busy');
  resolve({ data: provided });
  assert.equal((await first).status, 'printed');
  assert.equal((await printSaleTicket({ mode: 'provided', provided })).status, 'printed');
  assert.equal(h.urls.length, 2);
});

test('Android runtime permissions distinguish API 30 versus 31+, denial and cancellation', async () => {
  for (const [api, expected] of [[30, ['location']], [31, ['scan', 'connect']]]) {
    const h = harness({ api });
    await h.load('mxw01Ble.js').requestMXW01Permissions(h.load('printingOperation.js').createCancellation());
    assert.deepEqual(h.permissionRequests, [expected]);
  }
  const denied = harness({ denied: true });
  await assert.rejects(denied.load('mxw01Ble.js').requestMXW01Permissions(denied.load('printingOperation.js').createCancellation()), { code: 'permission' });
  const h = harness();
  const token = h.load('printingOperation.js').createCancellation();
  token.cancel();
  await assert.rejects(h.load('mxw01Ble.js').requestMXW01Permissions(token), { code: 'cancelled' });
  assert.equal(h.permissionRequests.length, 0);
  h.rn.PermissionsAndroid.check = async () => true;
  await h.load('mxw01Ble.js').requestMXW01Permissions(h.load('printingOperation.js').createCancellation());
  assert.equal(h.permissionRequests.length, 0, 'Already granted permissions do not reopen the system dialog');
});

test('bounded operations settle on timeout/cancellation and consume late native failures', async () => {
  const { bounded, createCancellation } = harness().load('printingOperation.js');
  await assert.rejects(bounded(new Promise(() => {}), 2, null, 'Connection'), { code: 'timeout' });
  const token = createCancellation();
  let lateReject;
  const promise = bounded(new Promise((resolve, reject) => { lateReject = reject; }), 100, token);
  token.cancel();
  await assert.rejects(promise, { code: 'cancelled' });
  lateReject(new Error('Late native rejection'));
});

test('temporary Android permission Activity is allowed before BLE starts; foreground is then enforced', async () => {
  let destroyed = 0;
  const manager = { async state() { return 'PoweredOff'; }, stopDeviceScan() {}, cancelTransaction() {}, destroy() { destroyed += 1; } };
  const h = harness({ native: true, ownership: 'standalone', manager });
  h.rn.PermissionsAndroid.requestMultiple = async (permissions) => {
    assert.equal(h.appListenerCount, 0, 'No active BLE foreground listener while the permission Activity is open');
    h.background();
    setTimeout(() => { h.rn.AppState.currentState = 'active'; }, 1);
    return Object.fromEntries(permissions.map((permission) => [permission, 'granted']));
  };
  await assert.rejects(h.load('mxw01Ble.js').discoverMXW01Printers(), { code: 'bluetooth-off' });
  assert.equal(destroyed, 1);
  assert.equal(h.appListenerCount, 0);
});

test('discovery only offers named MXW01 candidates, is bounded, deduplicates and stops on cancellation', async () => {
  const h = harness();
  const ble = h.load('mxw01Ble.js');
  const { createCancellation } = h.load('printingOperation.js');
  const uuid = h.load('mxw01Protocol.js').MXW01_UUIDS.services[0];
  assert.equal(ble.isMXW01Candidate({ id: mac, name: 'Other' }), false);
  assert.equal(ble.isMXW01Candidate({ id: mac, name: 'MXW01', serviceUUIDs: ['wrong'] }), false);
  assert.equal(ble.isMXW01Candidate({ id: mac, localName: 'MXW01', serviceUUIDs: [uuid] }), true);
  assert.equal(ble.isMXW01Candidate({ id: 'bad-id', name: 'MXW01' }), false);
  let stopped = 0;
  const manager = {
    startDeviceScan(services, options, callback) {
      callback(null, { id: mac, name: 'Other' });
      callback(null, { id: mac, name: 'MXW01' });
      callback(null, { id: mac, name: 'MXW01' });
    },
    stopDeviceScan() { stopped += 1; },
  };
  assert.deepEqual(await ble.scanMXW01Candidates(manager, createCancellation(), 3), [{ id: mac, name: 'MXW01' }]);
  const token = createCancellation();
  const scan = ble.scanMXW01Candidates(manager, token, 100);
  token.cancel();
  await assert.rejects(scan, { code: 'cancelled' });
  assert.equal(stopped, 2);
});

test('original CRC/framing validates length, CRC, footer and variable notification flag', () => {
  const protocol = harness().load('mxw01Protocol.js');
  assert.equal(protocol.crc8(Buffer.from('123456789')), 0xf4);
  assert.deepEqual([...protocol.commandPacket(0xa1)], [0x22, 0x21, 0xa1, 0, 1, 0, 0, 0, 0xff]);
  const status = protocol.commandPacket(0xa1, new Uint8Array(13));
  status[3] = 3;
  assert.equal(protocol.parseNotification(status).command, 0xa1);
  for (const index of [0, 1, 4, status.length - 2, status.length - 1]) {
    const corrupt = status.slice(); corrupt[index] ^= 1;
    assert.equal(protocol.parseNotification(corrupt), null);
  }
  assert.equal(protocol.parseNotification(status.slice(0, -1)), null);
  assert.equal(protocol.parseNotification(new Uint8Array([...status, 0])), null);
  const received = [];
  const decoder = protocol.createNotificationDecoder((packet) => received.push(packet));
  decoder(status.slice(0, 20));
  assert.equal(received.length, 0);
  decoder(status.slice(20));
  assert.equal(received.length, 1);
});

test('LSB-first raster orientation reverses actual image by 180 degrees then pads to 90 rows', () => {
  const protocol = harness().load('mxw01Protocol.js');
  const image = raster(2);
  image.bytes[0] = 1;
  image.bytes[95] = 2;
  const padded = protocol.orientAndPadRaster(image);
  assert.equal(padded.length, 90 * 48);
  assert.equal(padded[0], 0x40);
  assert.equal(padded[95], 0x80);
  assert.ok(padded.slice(96).every((byte) => byte === 0));
  const request = protocol.parseNotification(protocol.printRequest(2));
  assert.deepEqual([...request.payload], [2, 0, 0x30, 0]);
  assert.throws(() => protocol.orientAndPadRaster({ ...image, width: 385 }), { code: 'raster' });
  assert.throws(() => protocol.orientAndPadRaster(raster(3073)), { code: 'raster' });
});

function mockTransport(protocol, options = {}) {
  let receive;
  let fail;
  const control = [];
  const data = [];
  let removed = 0;
  return {
    mtu: options.mtu || 23, control, data,
    get removed() { return removed; },
    monitor(onReceive, onFail) { receive = onReceive; fail = onFail; return () => { removed += 1; }; },
    async writeControl(bytes) {
      const packet = protocol.parseNotification(bytes);
      control.push(packet.command);
      if (packet.command === 0xa1 && !options.noStatus) {
        const status = new Uint8Array(13); status[12] = options.statusError ? 1 : 0;
        receive(protocol.commandPacket(0xa1, status));
      }
      if (packet.command === 0xa9) {
        if (options.wrongAck) receive(protocol.commandPacket(0xab, new Uint8Array([0])));
        else {
          const ack = protocol.commandPacket(0xa9, new Uint8Array([options.reject ? 1 : 0]));
          if (options.corruptAck) ack[7] ^= 1;
          receive(ack);
        }
      }
      if (packet.command === 0xad && !options.noComplete && !options.completeOnLast) {
        receive(protocol.commandPacket(0xaa, new Uint8Array([options.badComplete ? 1 : 0])));
      }
    },
    async writeData(bytes) {
      assert.ok(bytes.length <= this.mtu - 3);
      data.push(bytes);
      if (options.disconnect) fail(new Error('Disconnected'));
      if (options.completeOnLast && data.reduce((sum, chunk) => sum + chunk.length, 0) === 4320) {
        receive(protocol.commandPacket(0xaa, new Uint8Array([0])));
      }
    },
  };
}

test('session registers notification waits before synchronous writes and respects MTU 23 and minimum padding', async () => {
  const h = harness();
  const transport = mockTransport(h.load('mxw01Protocol.js'));
  const result = await h.load('mxw01Session.js').runMXW01Session(transport, raster(), h.load('printingOperation.js').createCancellation(), fastLimits);
  assert.equal(result.status, 'printed');
  assert.deepEqual(transport.control, [0xa1, 0xa2, 0xa9, 0xad]);
  assert.equal(transport.data.reduce((sum, chunk) => sum + chunk.length, 0), 4320);
  assert.equal(transport.removed, 1);
});

test('completion emitted inside the last data write is not lost', async () => {
  const h = harness();
  const transport = mockTransport(h.load('mxw01Protocol.js'), { mtu: 185, completeOnLast: true });
  assert.equal((await h.load('mxw01Session.js').runMXW01Session(transport, raster(), h.load('printingOperation.js').createCancellation(), fastLimits)).status, 'printed');
  assert.equal(transport.removed, 1);
});

test('rejected, corrupt or unrelated acknowledgements/status stop before any data write and clean up', async () => {
  for (const [options, code] of [[{ reject: true }, 'rejected'], [{ wrongAck: true }, 'timeout'], [{ corruptAck: true }, 'timeout'], [{ noStatus: true }, 'timeout'], [{ statusError: true }, 'status']]) {
    const h = harness();
    const transport = mockTransport(h.load('mxw01Protocol.js'), options);
    await assert.rejects(h.load('mxw01Session.js').runMXW01Session(transport, raster(), h.load('printingOperation.js').createCancellation(), fastLimits), { code });
    assert.equal(transport.data.length, 0);
    assert.equal(transport.removed, 1);
  }
});

test('missing/unrecognized completion and disconnection cannot report printed or automatically retransmit', async () => {
  for (const [options, code] of [[{ noComplete: true }, 'timeout'], [{ badComplete: true }, 'completion'], [{ disconnect: true }, 'connection']]) {
    const h = harness();
    const transport = mockTransport(h.load('mxw01Protocol.js'), { mtu: 185, ...options });
    const session = h.load('mxw01Session.js').runMXW01Session(transport, raster(), h.load('printingOperation.js').createCancellation(), fastLimits);
    if (options.noComplete) assert.equal((await session).status, 'sent-unconfirmed');
    else await assert.rejects(session, { code });
    assert.equal(transport.control.filter((command) => command === 0xa9).length, 1);
    assert.equal(transport.removed, 1);
    if (options.disconnect) assert.equal(transport.data.length, 1);
  }
});

test('cancellation during a pending notification releases the monitor and prevents print request/data', async () => {
  const h = harness();
  const transport = mockTransport(h.load('mxw01Protocol.js'), { noStatus: true });
  const token = h.load('printingOperation.js').createCancellation();
  const session = h.load('mxw01Session.js').runMXW01Session(transport, raster(), token, fastLimits);
  setTimeout(() => token.cancel(), 5);
  await assert.rejects(session, { code: 'cancelled' });
  assert.equal(transport.data.length, 0);
  assert.equal(transport.removed, 1);
});

test('transfer budget and invalid MTU are rejected before subscribing or sending requests', async () => {
  const h = harness();
  const session = h.load('mxw01Session.js').runMXW01Session;
  const token = h.load('printingOperation.js').createCancellation();
  for (const [mtu, limits, code] of [[22, fastLimits, 'mtu'], [23, { ...fastLimits, paceMs: 25, transferMs: 10 }, 'raster']]) {
    const transport = mockTransport(h.load('mxw01Protocol.js'), { mtu });
    await assert.rejects(session(transport, raster(), token, limits), { code });
    assert.equal(transport.control.length + transport.data.length + transport.removed, 0);
  }
});

test('native adapter denial and cancelled connection clean up without loading/sending to another printer', async () => {
  const denied = harness({ denied: true, native: true, ownership: 'standalone' });
  await assert.rejects(denied.load('mxw01Ble.js').printMXW01Raster(nativeProfile, raster(), denied.load('printingOperation.js').createCancellation()), { code: 'permission' });
  assert.equal(denied.bleLoads, 0);
  assert.equal(denied.appListenerCount, 0);
  let token;
  let disconnected = 0;
  let destroyed = 0;
  const manager = {
    async state() { return 'PoweredOn'; },
    connectToDevice(id, options) {
      assert.equal(id, mac); assert.equal(options.autoConnect, false); assert.equal(options.requestMTU, 185);
      token.cancel(); return new Promise(() => {});
    },
    stopDeviceScan() {}, cancelTransaction() {},
    async cancelDeviceConnection(id) { assert.equal(id, mac); disconnected += 1; },
    destroy() { destroyed += 1; },
  };
  const h = harness({ native: true, ownership: 'standalone', manager });
  token = h.load('printingOperation.js').createCancellation();
  await assert.rejects(h.load('mxw01Ble.js').printMXW01Raster(nativeProfile, raster(), token), { code: 'cancelled' });
  assert.equal(disconnected, 1);
  assert.equal(destroyed, 1);
  assert.equal(h.appListenerCount, 0);
});

test('BLE operation is exclusive and aborts/cleans up when app leaves the foreground', async () => {
  let started;
  const scanning = new Promise((resolve) => { started = resolve; });
  let destroyed = 0;
  const manager = {
    async state() { return 'PoweredOn'; }, startDeviceScan() { started(); }, stopDeviceScan() {},
    cancelTransaction() {}, destroy() { destroyed += 1; },
  };
  const h = harness({ native: true, ownership: 'standalone', manager });
  const ble = h.load('mxw01Ble.js');
  const discovery = ble.discoverMXW01Printers();
  await scanning;
  await assert.rejects(ble.discoverMXW01Printers(), { code: 'busy' });
  h.background();
  await assert.rejects(discovery, { code: 'foreground' });
  assert.equal(destroyed, 1);
  assert.equal(h.appListenerCount, 0);
});

test('actual BLE adapter verifies characteristics, uses returned MTU, routes base64 notifications and releases the connection', async () => {
  const protocol = harness().load('mxw01Protocol.js');
  const transport = mockTransport(protocol);
  const cleanup = { disconnected: 0, destroyed: 0, subscriptions: 0 };
  const manager = {
    async state() { return 'PoweredOn'; },
    async connectToDevice(id, options) { assert.equal(id, mac); assert.equal(options.requestMTU, 185); return { id, mtu: 23 }; },
    async discoverAllServicesAndCharacteristicsForDevice(id) { assert.equal(id, mac); },
    async servicesForDevice() { return [{ uuid: protocol.MXW01_UUIDS.services[0] }]; },
    async characteristicsForDevice() { return [
      { uuid: protocol.MXW01_UUIDS.control, isWritableWithoutResponse: true },
      { uuid: protocol.MXW01_UUIDS.data, isWritableWithoutResponse: true },
      { uuid: protocol.MXW01_UUIDS.notify, isNotifiable: true },
    ]; },
    onDeviceDisconnected(id) { assert.equal(id, mac); return { remove() { cleanup.subscriptions += 1; } }; },
    monitorCharacteristicForDevice(id, service, characteristic, listener) {
      assert.equal(id, mac); assert.equal(characteristic, protocol.MXW01_UUIDS.notify);
      const remove = transport.monitor((bytes) => {
        for (let index = 0; index < bytes.length; index += 20) listener(null, { value: Buffer.from(bytes.slice(index, index + 20)).toString('base64') });
      }, (error) => listener(error));
      return { remove };
    },
    async writeCharacteristicWithoutResponseForDevice(id, service, characteristic, value) {
      assert.equal(id, mac);
      const bytes = new Uint8Array(Buffer.from(value, 'base64'));
      assert.ok(bytes.length <= 20, 'Actual MTU is 23 despite requestMTU 185');
      if (characteristic === protocol.MXW01_UUIDS.control) return transport.writeControl(bytes);
      assert.equal(characteristic, protocol.MXW01_UUIDS.data);
      return transport.writeData(bytes);
    },
    stopDeviceScan() {}, cancelTransaction() {},
    async cancelDeviceConnection() { cleanup.disconnected += 1; },
    destroy() { cleanup.destroyed += 1; },
  };
  const h = harness({ native: true, ownership: 'standalone', manager });
  const result = await h.load('mxw01Ble.js').printMXW01Raster(nativeProfile, raster(), h.load('printingOperation.js').createCancellation());
  assert.equal(result.status, 'printed');
  assert.equal(transport.data.length, 216);
  assert.equal(transport.removed, 1);
  assert.deepEqual(cleanup, { disconnected: 1, destroyed: 1, subscriptions: 1 });
  assert.equal(h.appListenerCount, 0);
});

test('a saved ID with incompatible services is disconnected without sending any print', async () => {
  let disconnected = 0;
  let destroyed = 0;
  const manager = {
    async state() { return 'PoweredOn'; }, async connectToDevice() { return { mtu: 185 }; },
    async discoverAllServicesAndCharacteristicsForDevice() {}, async servicesForDevice() { return [{ uuid: 'other-service' }]; },
    stopDeviceScan() {}, cancelTransaction() {}, async cancelDeviceConnection() { disconnected += 1; }, destroy() { destroyed += 1; },
    writeCharacteristicWithoutResponseForDevice() { assert.fail('Wrong service must not receive data'); },
  };
  const h = harness({ native: true, ownership: 'standalone', manager });
  await assert.rejects(h.load('mxw01Ble.js').printMXW01Raster(nativeProfile, raster(), h.load('printingOperation.js').createCancellation()), { code: 'device' });
  assert.equal(disconnected, 1);
  assert.equal(destroyed, 1);
});

test('measured wrapping/aligned amounts retain long names/descriptions and full total/footer', () => {
  const h = harness();
  const data = h.load('saleTicketData.js').normalizeSale({ ...provided, cliente: 'Long customer name '.repeat(12), items: [{ cantidad: 2, descripcion: 'UnbrokenDescription'.repeat(20), total: 1000 }], total: 1200 });
  const { createRasterModel } = h.load('rasterLayout.js');
  // Execute the exact static layout shipped to the WebView, not a native copy.
  const receiptLayoutEngine = () => vm.runInNewContext(
    h.load('rasterProgram.js').RECEIPT_LAYOUT_SOURCE + '\nreceiptLayoutEngine();', {}, { timeout: 1000 },
  );
  const measure = (text, size) => Array.from(text).length * size * 0.55;
  const model = createRasterModel(data, { mxw01TextSize: 14 });
  assert.throws(() => createRasterModel({ ...data, total: 1e21 }, {}), { code: 'raster' });
  const result = receiptLayoutEngine().layout(model, measure);
  assert.equal(result.width, 384);
  assert.ok(result.height <= 3072);
  for (const span of result.spans) assert.ok(span.left + measure(span.text, span.size) * span.x <= 374.001, span.text);
  assert.ok(result.spans.some((span) => span.text === '$1.200,00'));
  assert.ok(result.spans.some((span) => span.text === '*NO VALIDO COMO FACTURA'));
  assert.ok(result.spans.some((span) => span.text === 'Adjustment'));
  const first = result.spans.findIndex((span) => /^2x(?: |$)/.test(span.text));
  const last = result.spans.findIndex((span) => span.text.startsWith('Unit:'));
  const description = result.spans.slice(first, last).filter((span) => span.text !== '$1.000,00');
  assert.equal(description.map((span) => span.text).join('').replace(/^2x\s*/, ''), data.items[0].descripcion);
  assert.throws(() => receiptLayoutEngine().wrap('x'.repeat(2001), (text) => text.length, 20));
  const huge = { ...model, items: Array.from({ length: 100 }, () => ({ description: 'x'.repeat(100), amount: '$1,00', unit: 'Unit: $1,00' })) };
  assert.throws(() => receiptLayoutEngine().layout(huge, measure), /height limit/);
});

test('Bluetooth raster height is independent of RawBT feed-before-cut lines', () => {
  const h = harness();
  const data = h.load('saleTicketData.js').normalizeSale(provided);
  const { createRasterModel } = h.load('rasterLayout.js');
  const receiptLayoutEngine = () => vm.runInNewContext(
    h.load('rasterProgram.js').RECEIPT_LAYOUT_SOURCE + '\nreceiptLayoutEngine();', {}, { timeout: 1000 },
  );
  const measure = (text, size) => Array.from(text).length * size * 0.55;
  const noFeed = createRasterModel(data, { feedLines: 0 });
  const rawbtFeed = createRasterModel(data, { feedLines: 10 });
  assert.equal(noFeed.feed, 0);
  assert.equal(rawbtFeed.feed, 0);
  const noFeedLayout = receiptLayoutEngine().layout(noFeed, measure);
  const rawbtFeedLayout = receiptLayoutEngine().layout(rawbtFeed, measure);
  assert.equal(rawbtFeedLayout.height, noFeedLayout.height);
  assert.equal(JSON.stringify(rawbtFeedLayout), JSON.stringify(noFeedLayout));
});

test('serialized customer text cannot close a script or execute markup; raster bridge validates bounds', async () => {
  const h = harness();
  const renderer = h.load('rasterRenderer.js');
  const value = { text: '</script><img src="https://invalid.test" onerror="evil()">&\u2028\u2029' };
  const serialized = renderer.serializeForScript(value);
  assert.equal(/[<>&\u2028\u2029]/.test(serialized), false);
  assert.deepEqual(JSON.parse(serialized), value);
  for (const message of [
    { width: 383, height: 1, base64: 'A'.repeat(64) },
    { width: 384, height: 3073, base64: '' },
    { width: 384, height: 1, base64: 'A'.repeat(63) },
    { width: 384, height: 1, base64: '?'.repeat(64) },
  ]) assert.throws(() => renderer.validateRasterMessage(message), { code: 'raster' });
  const bridge = renderer.createRasterBridge();
  const detach = bridge.attach((script) => {
    if (script.includes('__renderReceipt')) {
      const context = { window: { __renderReceipt(request) {
        assert.match(request.model.customer, /<\/script>/);
        bridge.receive(JSON.stringify({ type: 'raster', id: request.id + 1, width: 0, height: 0 }));
        bridge.receive(JSON.stringify({ type: 'raster', id: request.id, width: 384, height: 1, base64: 'A'.repeat(64) }));
      } } };
      vm.runInNewContext(script, context);
    }
  });
  bridge.receive('{bad');
  bridge.receive(JSON.stringify({ type: 'ready' }));
  const data = h.load('saleTicketData.js').normalizeSale({ ...provided, cliente: value.text });
  assert.equal((await bridge.render(data, {}, h.load('printingOperation.js').createCancellation())).bytes.length, 48);
  detach();
});

test('renderer startup/render timeouts, cancellation and unmount are bounded and release pending jobs', async () => {
  const h = harness();
  const renderer = h.load('rasterRenderer.js');
  const operation = h.load('printingOperation.js');
  const data = h.load('saleTicketData.js').normalizeSale(provided);
  const bridge = renderer.createRasterBridge();
  const detach = bridge.attach(() => {});
  await assert.rejects(bridge.render(data, {}, operation.createCancellation(), 2), { code: 'timeout' });
  bridge.receive(JSON.stringify({ type: 'ready' }));
  await assert.rejects(bridge.render(data, {}, operation.createCancellation(), 2), { code: 'timeout' });
  const token = operation.createCancellation();
  const pending = bridge.render(data, {}, token, 100);
  await assert.rejects(bridge.render(data, {}, operation.createCancellation(), 2), { code: 'busy' });
  token.cancel();
  await assert.rejects(pending, { code: 'cancelled' });
  const unmounted = bridge.render(data, {}, operation.createCancellation(), 100);
  detach();
  await assert.rejects(unmounted, { code: 'renderer' });
});

function canvasSandbox(messages) {
  const drawn = [];
  const context = {
    font: '18px sans-serif',
    measureText(text) { return { width: text.length * parseFloat(this.font.replace('bold ', '')) * 0.55 }; },
    fillRect() {}, save() {}, restore() {}, translate() {}, scale() {}, fillText(text) { drawn.push(text); },
    getImageData(left, top, width, height) {
      const data = new Uint8ClampedArray(width * height * 4).fill(255);
      for (const pixel of [0, 7, 8, 767]) for (let channel = 0; channel < 3; channel += 1) data[pixel * 4 + channel] = 0;
      return { data };
    },
  };
  const canvas = { width: 1, height: 1, getContext: () => context };
  const sandbox = {
    document: { createElement(tag) { assert.equal(tag, 'canvas'); return canvas; }, body: { appendChild() {} } },
    window: { ReactNativeWebView: { postMessage: (message) => messages.push(JSON.parse(message)) } },
    btoa: (binary) => Buffer.from(binary, 'binary').toString('base64'),
  };
  return { canvas, sandbox, drawn };
}

test('actual embedded original canvas program executes locally and returns LSB-first bounded packed pixels', () => {
  const renderer = harness().load('rasterRenderer.js');
  assert.match(renderer.RASTER_RENDERER_HTML, /connect-src 'none'/);
  assert.equal(renderer.RASTER_RENDERER_HTML.includes('https://'), false);
  const messages = [];
  const { canvas, sandbox } = canvasSandbox(messages);
  vm.runInNewContext(renderer.RASTER_RENDERER_HTML.match(/<script>([\s\S]*?)<\/script>/)[1], sandbox);
  const h = harness();
  const model = h.load('rasterLayout.js').createRasterModel(h.load('saleTicketData.js').normalizeSale(provided), {});
  sandbox.window.__renderReceipt({ id: 1, model });
  const output = messages.find((message) => message.type === 'raster');
  assert.ok(output, 'Canvas must return a raster, not an error');
  const result = renderer.validateRasterMessage(output);
  assert.equal(result.bytes[0], 0x81);
  assert.equal(result.bytes[1], 1);
  assert.equal(result.bytes[95], 0x80);
  assert.equal(canvas.width, 1, 'Canvas data is cleared after rendering');
});

test('R1: actual renderer HTML initializes and prints a raster under the Hermes bytecode toString contract simulation', async () => {
  // Separate native and WebView realms model the real engine boundary. This is
  // contract simulation in Node, NOT execution on Hermes/Android or a printer.
  const hostToString = Object.getOwnPropertyDescriptor(Function.prototype, 'toString');
  const nativeRuntime = vm.createContext({ setTimeout, clearTimeout });
  const original = vm.runInContext('Object.getOwnPropertyDescriptor(Function.prototype, "toString")', nativeRuntime);
  nativeRuntime.originalToString = original;
  let detach = () => {};
  try {
    vm.runInContext(`Object.defineProperty(Function.prototype, 'toString', {
      configurable: true, writable: true,
      value: function () {
        var parameters = [];
        for (var index = 0; index < this.length; index += 1) parameters.push('a' + index);
        return 'function ' + this.name + '(' + parameters.join(', ') + ') { [bytecode] }';
      }
    });`, nativeRuntime);
    assert.equal(vm.runInContext('(function ordinary(x) {}).toString()', nativeRuntime), 'function ordinary(a0) { [bytecode] }');
    // This is the failure mode of the old function-source approach, not a ban
    // that could pass without ever executing the actual corrected HTML.
    const serializedCanary = vm.runInContext('(function ordinary(x) {}).toString()', nativeRuntime);
    assert.throws(() => vm.runInNewContext(`(${serializedCanary})();`), /bytecode is not defined/);

    const h = harness({ runtimeContext: nativeRuntime });
    const renderer = h.load('rasterRenderer.js'); // HTML must be constructed while the override is active.
    assert.equal(vm.runInContext('(function ordinary(x) {}).toString()', nativeRuntime), 'function ordinary(a0) { [bytecode] }');
    const messages = [];
    const { canvas, sandbox, drawn } = canvasSandbox(messages);
    const webView = vm.createContext(sandbox);
    const bridge = renderer.createRasterBridge();
    sandbox.window.ReactNativeWebView.postMessage = (raw) => {
      messages.push(JSON.parse(raw));
      bridge.receive(raw);
    };
    detach = bridge.attach((script) => vm.runInContext(script, webView, { timeout: 1000 }));
    vm.runInContext(renderer.RASTER_RENDERER_HTML.match(/<script>([\s\S]*?)<\/script>/)[1], webView, { timeout: 1000 });
    assert.equal(messages.filter((message) => message.type === 'ready').length, 1);
    assert.equal(typeof sandbox.window.__renderReceipt, 'function');
    assert.equal(typeof sandbox.window.__clearReceipt, 'function');

    const malicious = '</script><script>window.compromised=true</script>';
    const data = h.load('saleTicketData.js').normalizeSale({ ...provided, cliente: malicious });
    const result = await bridge.render(data, {}, h.load('printingOperation.js').createCancellation(), 1000);
    assert.equal(result.width, 384);
    assert.ok(result.height > 0 && result.height <= 3072);
    assert.equal(result.bytes.length, result.height * 48);
    assert.equal(result.bytes[0], 0x81);
    assert.equal(result.bytes[95], 0x80);
    assert.equal(messages.filter((message) => message.type === 'raster').length, 1);
    assert.equal(messages.filter((message) => message.type === 'error').length, 0);
    assert.ok(drawn.join('').includes(malicious), 'Malicious input remains wrapped plain canvas text');
    assert.equal(sandbox.window.compromised, undefined);
    assert.equal(canvas.width, 1);
  } finally {
    try { detach(); }
    finally { vm.runInContext('Object.defineProperty(Function.prototype, "toString", originalToString)', nativeRuntime); }
  }
  assert.equal(vm.runInContext('Function.prototype.toString', nativeRuntime), original.value);
  assert.deepEqual(Object.getOwnPropertyDescriptor(Function.prototype, 'toString'), hostToString, 'Host global override must not leak into other tests');
});

// Independent synthetic wire examples, not commandPacket-produced replies and
// NOT captures from the user's printer. The shorter example deliberately lacks CRC.
const A1_QUERY = [0x22, 0x21, 0xa1, 0, 1, 0, 0, 0, 0xff];
const A1_READY_RX = new Uint8Array([
  0x22, 0x21, 0xa1, 3, 13, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0xff,
]);
const A1_CRC_LESS_RX = new Uint8Array([
  0x22, 0x21, 0xa1, 3, 13, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0xff,
]);
const A1_NOT_READY_RX = new Uint8Array([
  0x22, 0x21, 0xa1, 3, 13, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  7, 0xff,
]);
const b64 = (bytes) => Buffer.from(bytes).toString('base64');
const shortProbe = { windowMs: 40, setupMs: 0 };

function controlledClock() {
  let now = 0;
  let sequence = 0;
  const timers = new Map();
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const clock = {
    Date: ClockDate,
    get now() { return now; },
    get pendingTimers() { return timers.size; },
    setTimeout(callback, milliseconds = 0, ...args) {
      assert.equal(typeof callback, 'function');
      assert.ok(Number.isFinite(milliseconds) && milliseconds >= 0);
      const id = ++sequence;
      timers.set(id, { due: now + milliseconds, callback, args });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    // Simulate an event-loop stall: time passes, but queued callbacks cannot run.
    elapse(milliseconds) { assert.ok(Number.isFinite(milliseconds) && milliseconds >= 0); now += milliseconds; },
    async flushMicrotasks() { await new Promise((resolve) => setImmediate(resolve)); },
    fireNextTimer() {
      const next = [...timers.entries()].sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
      assert.ok(next, 'Controlled operation stalled without an owned timer');
      const [id, timer] = next;
      timers.delete(id);
      now = Math.max(now, timer.due);
      timer.callback(...timer.args);
    },
    async settle(promise) {
      let done = false;
      let result;
      let failure;
      Promise.resolve(promise).then((value) => { result = value; done = true; }, (error) => { failure = error; done = true; });
      for (let turn = 0; turn < 1000 && !done; turn += 1) {
        // A host checkpoint drains real Promise microtasks; host elapsed time
        // never advances this clock or executes a controlled timeout.
        await clock.flushMicrotasks();
        if (done) break;
        clock.fireNextTimer();
      }
      assert.equal(done, true, 'Controlled scheduler must settle within a bounded number of turns');
      if (failure) throw failure;
      return result;
    },
    dispose() { timers.clear(); },
  };
  return clock;
}

function diagnosticHarness() {
  return harness({ clock: controlledClock() });
}

async function controlledProbe(h, transport, limits = shortProbe, token) {
  const cancellation = token || h.load('printingOperation.js').createCancellation();
  const operation = h.load('mxw01Diagnostic.js').runA1Diagnostic(transport, cancellation, undefined, limits);
  const result = await h.clock.settle(operation);
  assert.equal(h.clock.pendingTimers, 0, 'Probe must release pause/write/response timers');
  return result;
}

function diagnosticTransport(values = [], options = {}) {
  let receive;
  let fail;
  let removed = 0;
  const controls = [];
  return {
    mtu: 23, controls,
    get removed() { return removed; },
    monitorRaw(onReceive, onFail) {
      receive = onReceive; fail = onFail;
      if (options.beforeQuery) receive(options.beforeQuery);
      return () => { removed += 1; };
    },
    emit(value, error) { receive(value, error); },
    disconnect(error) { fail(error); },
    async writeControl(bytes) {
      assert.deepEqual([...bytes], A1_QUERY, 'The sole command must be the independent nine-byte A1 query');
      controls.push([...bytes]);
      for (const value of values) receive(value);
      if (options.onWrite) return options.onWrite(this);
    },
    writeData() { assert.fail('A1 diagnostic must never write AE03/raster data'); },
  };
}

test('A1-only probe admits an independent literal ready status with waiter-before-write, one query and no data writes', async () => {
  const h = diagnosticHarness();
  const diagnostic = h.load('mxw01Diagnostic.js');
  const transport = diagnosticTransport([b64(A1_READY_RX)]);
  const result = await controlledProbe(h, transport);
  assert.equal(result.outcome, 'a1-ready');
  assert.equal(result.a1Attempts, 1);
  assert.equal(result.writeQueued, true);
  assert.equal(result.rawCallbacks, 1);
  assert.equal(result.a1FrameAccepted, true);
  assert.equal(result.readyStatus, true);
  assert.equal(result.samples[0].decodedBytes, 21);
  assert.equal(result.samples[0].reason, 'valid-a1-frame');
  assert.equal(transport.controls.length, 1);
  assert.equal(transport.removed, 1);
});

test('CRC-less literal, partial, CRC-rejected, other-command and malformed callbacks remain evidence, never accepted status', async () => {
  const badCRC = A1_READY_RX.slice(); badCRC[19] = 1;
  const other = new Uint8Array([0x22, 0x21, 0xab, 0, 1, 0, 0, 0, 0xff]);
  const rows = [
    [b64(A1_CRC_LESS_RX), 'incomplete-frame'],
    [b64(A1_READY_RX.slice(0, 10)), 'incomplete-frame'],
    [b64(badCRC), 'crc-rejected'], [b64(other), 'other-command'],
    ['not valid base64!', 'invalid-base64'], ['', 'empty-value'], [null, 'invalid-base64'],
  ];
  for (const [value, reason] of rows) {
    const h = diagnosticHarness();
    const transport = diagnosticTransport([value]);
    const result = await controlledProbe(h, transport);
    assert.equal(result.outcome, 'timeout');
    assert.equal(result.rawCallbacks, 1);
    assert.equal(result.a1FrameAccepted, false);
    assert.equal(result.samples[0].reason, reason);
    assert.equal(transport.controls.length, 1);
    assert.equal(transport.removed, 1);
  }
});

test('independent CRC-less shape also reproduces the unchanged printing decoder timeout before any print/data command', async () => {
  const h = diagnosticHarness();
  let receive;
  const controls = [];
  const transport = {
    mtu: 23, monitor(callback) { receive = callback; return () => {}; },
    async writeControl(bytes) { controls.push([...bytes]); receive(A1_CRC_LESS_RX); },
    writeData() { assert.fail('No image transfer before admitted A1'); },
  };
  await assert.rejects(h.clock.settle(h.load('mxw01Session.js').runMXW01Session(transport, raster(), h.load('printingOperation.js').createCancellation(), fastLimits)), { code: 'timeout' });
  assert.equal(h.clock.pendingTimers, 0);
  assert.deepEqual(controls, [A1_QUERY]);
  assert.equal(h.load('mxw01Protocol.js').parseNotification(A1_CRC_LESS_RX), null);
});

test('silence is distinct from rejected callbacks; pre-query samples cannot masquerade as a reply', async () => {
  for (const beforeQuery of [undefined, b64(A1_READY_RX)]) {
    const h = diagnosticHarness();
    const diagnostic = h.load('mxw01Diagnostic.js');
    const transport = diagnosticTransport([], { beforeQuery });
    const result = await controlledProbe(h, transport);
    assert.equal(result.outcome, 'timeout');
    assert.equal(result.rawCallbacks, beforeQuery ? 1 : 0);
    assert.equal(result.a1FrameAccepted, false);
    assert.equal(result.samples.length, beforeQuery ? 1 : 0);
    if (beforeQuery) assert.equal(result.samples[0].beforeQuery, true);
    assert.match(diagnostic.formatA1Diagnostic(result), beforeQuery ? /callbacks were observed/ : /No raw AE02 callback/);
    assert.equal(transport.controls.length, 1);
    assert.equal(transport.removed, 1);
  }
});

test('literal fragments may be individually incomplete while the existing strict decoder admits their assembly', async () => {
  const h = diagnosticHarness();
  const transport = diagnosticTransport([b64(A1_READY_RX.slice(0, 10)), b64(A1_READY_RX.slice(10))]);
  const result = await controlledProbe(h, transport);
  assert.equal(result.outcome, 'a1-ready');
  assert.equal(result.rawCallbacks, 2);
  assert.equal(result.samples[0].reason, 'incomplete-frame');
  assert.equal(transport.controls.length, 1);
});

test('diagnostic retains status rejection without claiming printed, connected or printing proven', async () => {
  const h = diagnosticHarness();
  const transport = diagnosticTransport([b64(A1_NOT_READY_RX)]);
  const diagnostic = h.load('mxw01Diagnostic.js');
  const result = await controlledProbe(h, transport);
  assert.equal(result.outcome, 'status-rejected');
  assert.equal(result.errorCode, 'status');
  assert.equal(result.a1FrameAccepted, true);
  assert.equal(result.readyStatus, false);
  assert.equal(result.samples[0].reason, 'status-rejected');
  assert.equal(result.status, undefined);
  assert.equal(result.connected, undefined);
  assert.match(diagnostic.formatA1Diagnostic(result), /NOT printing proof/);
  assert.equal(transport.controls.length, 1);
  assert.equal(transport.removed, 1);
});

test('diagnostic caps receive window, samples/decoded data/input, saturates counts and rejects oversized valid prefixes', async () => {
  const h = diagnosticHarness();
  const diagnostic = h.load('mxw01Diagnostic.js');
  assert.deepEqual(diagnostic.A1_DIAGNOSTIC_LIMITS, { windowMs: 5000, samples: 4, bytes: 72, inputChars: 96, callbacks: 255 });
  const oversized = b64(A1_READY_RX) + 'A'.repeat(100000);
  const transport = diagnosticTransport([oversized, ...Array(300).fill('!'), b64(A1_READY_RX)]);
  const result = await controlledProbe(h, transport, { windowMs: 100000, setupMs: 0 });
  assert.equal(result.receiveWindowMs, 5000);
  assert.equal(result.rawCallbacks, 255);
  assert.equal(result.callbacksSaturated, true);
  assert.equal(result.samples.length, 4);
  assert.equal(result.samples[0].truncated, true);
  assert.equal(result.samples[0].inputChars, 65535);
  assert.equal(result.samples[0].decodedBytes, 72);
  assert.ok(result.samples.every((sample) => sample.hex.length <= 215));
  assert.equal(result.outcome, 'a1-ready', 'Only the final complete callback may be admitted');
  const onlyOversized = diagnosticTransport([oversized]);
  const rejected = await controlledProbe(h, onlyOversized);
  assert.equal(rejected.a1FrameAccepted, false);
  assert.equal(rejected.outcome, 'timeout');
  assert.equal(rejected.samples[0].reason, 'truncated-input');
});

test('pending probe cancellation and hung/failed write clean up without retransmission or orphan waits', async () => {
  for (const scenario of ['cancel', 'hung', 'write-error']) {
    const h = diagnosticHarness();
    const token = h.load('printingOperation.js').createCancellation();
    const transport = diagnosticTransport([], { onWrite() {
      if (scenario === 'cancel') token.cancel();
      if (scenario === 'hung') return new Promise(() => {});
      if (scenario === 'write-error') throw { errorCode: 401, message: 'PRIVATE_SENTINEL', deviceID: mac };
    } });
    const result = await controlledProbe(h, transport, shortProbe, token);
    assert.equal(result.outcome, scenario === 'cancel' ? 'cancelled' : scenario === 'hung' ? 'timeout' : 'error');
    assert.equal(transport.controls.length, 1);
    assert.equal(transport.removed, 1);
    assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false);
  }
});

test('controlled setup-yield stall distinguishes within-budget A1 evidence from deadline exhaustion before the write', async () => {
  const host = { Date, now: Date.now, setTimeout, clearTimeout };
  for (const [stall, expected] of [[25, 'a1-ready'], [65, 'timeout']]) {
    const h = diagnosticHarness();
    const transport = diagnosticTransport([b64(A1_READY_RX)]);
    const diagnostic = h.load('mxw01Diagnostic.js');
    const token = h.load('printingOperation.js').createCancellation();
    try {
      const pending = diagnostic.runA1Diagnostic(transport, token, undefined, shortProbe);
      assert.equal(h.clock.pendingTimers, 2, 'Real response and pause timers must both be controlled');
      h.clock.elapse(stall);
      const result = await h.clock.settle(pending);
      assert.equal(h.clock.Date.now(), stall);
      assert.equal(result.outcome, expected);
      assert.equal(result.a1Attempts, stall < 40 ? 1 : 0);
      assert.equal(transport.controls.length, stall < 40 ? 1 : 0);
      assert.equal(result.rawCallbacks, stall < 40 ? 1 : 0);
      assert.equal(result.samples.length, stall < 40 ? 1 : 0);
      assert.equal(result.a1FrameAccepted, stall < 40);
      assert.equal(result.readyStatus, stall < 40);
      assert.equal(transport.removed, 1);
      assert.equal(h.clock.pendingTimers, 0, 'Expired pause/window timers must be cleared, not hidden by disposal');
      if (stall < 40) {
        assert.deepEqual(transport.controls, [A1_QUERY]);
        assert.equal(result.samples[0].reason, 'valid-a1-frame');
      } else {
        assert.equal(result.errorCode, 'timeout');
        assert.equal(result.writeQueued, false);
      }
    } finally { h.clock.dispose(); }
  }
  assert.equal(globalThis.Date, host.Date);
  assert.equal(Date.now, host.now);
  assert.equal(globalThis.setTimeout, host.setTimeout);
  assert.equal(globalThis.clearTimeout, host.clearTimeout);
});

test('unchanged production 5000ms/250ms policy admits the same literal after a controlled 65ms stall without printing', async () => {
  const h = diagnosticHarness();
  const transport = diagnosticTransport([b64(A1_READY_RX)]);
  const diagnostic = h.load('mxw01Diagnostic.js');
  try {
    const pending = diagnostic.runA1Diagnostic(transport, h.load('printingOperation.js').createCancellation());
    h.clock.elapse(65);
    const result = await h.clock.settle(pending);
    assert.equal(h.clock.now, 250, 'Default setup delay remains exactly 250ms in the shared controlled clock');
    assert.equal(result.receiveWindowMs, 5000);
    assert.equal(result.outcome, 'a1-ready');
    assert.equal(result.a1Attempts, 1);
    assert.equal(result.rawCallbacks, 1);
    assert.equal(result.samples.length, 1);
    assert.equal(result.samples[0].decodedBytes, 21);
    assert.deepEqual(transport.controls, [A1_QUERY]);
    assert.equal(transport.removed, 1);
    assert.equal(h.clock.pendingTimers, 0);
  } finally { h.clock.dispose(); }
});

test('A1 report projection exposes only bounded public fields, never native messages, device IDs or injected sale data', () => {
  const diagnostic = harness().load('mxw01Diagnostic.js');
  const report = {
    ...diagnostic.createA1DiagnosticReport(), outcome: 'printed', errorCode: 'PRIVATE_SENTINEL', mtu: 999999,
    receiveWindowMs: 999999, a1Attempts: 999999, rawCallbacks: 999999,
    deviceID: mac, name: 'PRIVATE_SENTINEL', message: 'PRIVATE_SENTINEL', customer: 'PRIVATE_SENTINEL', sale: { private: 'PRIVATE_SENTINEL' },
    samples: Array(12).fill({ hex: mac, inputChars: 999999, decodedBytes: 999999, reason: 'PRIVATE_SENTINEL', nativeError: 'PRIVATE_SENTINEL' }),
  };
  const text = diagnostic.formatA1Diagnostic(report);
  assert.equal(text.includes('PRIVATE_SENTINEL'), false);
  assert.equal(text.includes(mac), false);
  const safe = diagnostic.projectA1Diagnostic(report);
  assert.equal(safe.outcome, 'error');
  assert.equal(safe.mtu, null);
  assert.equal(safe.samples.length, 4);
  assert.ok(safe.samples.every((sample) => sample.hex === '' && sample.decodedBytes === 72));
  assert.equal(diagnostic.safeA1ErrorCode({ errorCode: 403, message: mac }), 'ble-403');
  assert.equal(diagnostic.safeA1ErrorCode({ errorCode: 999999, code: mac, reason: 'PRIVATE_SENTINEL' }), 'native-error');
});

function diagnosticManager(options = {}) {
  let listener;
  let disconnect;
  let started;
  const queried = new Promise((resolve) => { started = resolve; });
  const controls = [];
  const cleanup = { monitor: 0, disconnectedListener: 0, disconnect: 0, destroyed: 0 };
  const uuids = harness().load('mxw01Protocol.js').MXW01_UUIDS;
  const manager = {
    controls, cleanup, queried,
    async state() { return 'PoweredOn'; },
    async connectToDevice() {
      if (options.connectError) throw { errorCode: 200, message: 'PRIVATE_SENTINEL', deviceID: mac };
      return { mtu: options.mtu ?? 23, id: mac, name: 'PRIVATE_SENTINEL' };
    },
    async discoverAllServicesAndCharacteristicsForDevice() {},
    async servicesForDevice() { return [{ uuid: uuids.services[0] }]; },
    async characteristicsForDevice() { return [
      { uuid: uuids.control, isWritableWithoutResponse: true },
      { uuid: uuids.notify, isNotifiable: true }, // No AE03 is needed for a status-only probe.
    ]; },
    onDeviceDisconnected(id, callback) { disconnect = callback; return { remove() { cleanup.disconnectedListener += 1; } }; },
    monitorCharacteristicForDevice(id, service, characteristic, callback) {
      assert.equal(characteristic, uuids.notify);
      listener = callback;
      return { remove() { cleanup.monitor += 1; } };
    },
    emit(value, error = null) { listener(error, { value, deviceID: mac, name: 'PRIVATE_SENTINEL', customer: 'PRIVATE_SENTINEL' }); },
    disconnectEvent() { disconnect(); },
    async writeCharacteristicWithoutResponseForDevice(id, service, characteristic, value) {
      assert.equal(characteristic, uuids.control, 'Diagnostic must never address AE03');
      const bytes = [...Buffer.from(value, 'base64')];
      assert.deepEqual(bytes, A1_QUERY);
      controls.push(bytes); started();
      if (options.notifyError) this.emit(undefined, { errorCode: 403, message: 'PRIVATE_SENTINEL', deviceID: mac });
      else if (!options.silent) this.emit(b64(options.statusReply || A1_READY_RX));
    },
    startDeviceScan() { if (options.onScan) options.onScan(); else assert.fail('Diagnostic must not scan'); },
    stopDeviceScan() {}, cancelTransaction() {},
    async cancelDeviceConnection() { cleanup.disconnect += 1; },
    destroy() { cleanup.destroyed += 1; },
  };
  return manager;
}

test('public saved-profile A1 diagnostic uses raw callbacks before filtering, sends one query, and releases all native/job resources', async () => {
  for (const notifyError of [false, true]) {
    const manager = diagnosticManager({ notifyError });
    const stored = JSON.stringify(nativeProfile);
    const h = harness({ stored, manager, native: true, ownership: 'standalone' });
    h.rn.PermissionsAndroid.check = async () => true;
    h.overrides.set('mxw01Session.js', { runMXW01Session() { assert.fail('Diagnostic must not enter printing session'); } });
    const result = await h.load('mxw01Ble.js').testMXW01Connection();
    assert.equal(result.outcome, notifyError ? 'error' : 'a1-ready');
    assert.equal(result.errorCode, notifyError ? 'ble-403' : null);
    assert.equal(result.rawCallbacks, 1);
    assert.equal(result.samples[0].reason, notifyError ? 'subscription-error' : 'valid-a1-frame');
    assert.equal(result.sessionEnded, true);
    assert.equal(result.mtu, 23);
    assert.deepEqual(manager.controls, [A1_QUERY]);
    assert.deepEqual(manager.cleanup, { monitor: 1, disconnectedListener: 1, disconnect: 1, destroyed: 1 });
    assert.equal(h.appListenerCount, 0);
    assert.equal(h.requests.length + h.urls.length, 0);
    assert.equal(h.stored, stored, 'Probe must not change saved settings');
    assert.equal(JSON.stringify(result).includes(mac), false);
    assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false);
    const next = h.load('printJob.js').beginPrintJob(); next.finish();
  }
});

test('dirty, unselected, RawBT, invalid config, Expo Go and denied permission diagnostics are clearly blocked before any query', async () => {
  const rows = [
    [{ stored: JSON.stringify(nativeProfile) }, { dirty: true }, 'unsaved'],
    [{ stored: JSON.stringify({ printerTransport: 'mxw01' }) }, {}, 'not-selected'],
    [{ stored: null }, {}, 'profile'],
    [{ stored: '{invalid' }, {}, 'config'],
    [{ stored: JSON.stringify(nativeProfile), ownership: 'expo' }, {}, 'native-unavailable'],
    [{ stored: JSON.stringify(nativeProfile), denied: true }, {}, 'permission'],
  ];
  for (const [options, arguments_, code] of rows) {
    const h = harness({ native: true, ownership: 'standalone', ...options });
    const result = await h.load('mxw01Ble.js').testMXW01Connection(arguments_);
    assert.equal(result.errorCode, code);
    assert.equal(result.a1Attempts, 0);
    assert.equal(result.rawCallbacks, 0);
    assert.equal(result.sessionEnded, true);
    assert.equal(h.bleLoads + h.requests.length + h.urls.length, 0);
    assert.equal(h.appListenerCount, 0);
    const next = h.load('printJob.js').beginPrintJob(); next.finish();
  }
});

test('connection failures return sanitized useful evidence and release the manager/locks without querying', async () => {
  const manager = diagnosticManager({ connectError: true });
  const h = harness({ stored: JSON.stringify(nativeProfile), manager, native: true, ownership: 'standalone' });
  h.rn.PermissionsAndroid.check = async () => true;
  const result = await h.load('mxw01Ble.js').testMXW01Connection();
  assert.equal(result.errorCode, 'ble-200');
  assert.equal(result.phase, 'connection-discovery');
  assert.equal(result.a1Attempts, 0);
  assert.equal(manager.controls.length, 0);
  assert.equal(manager.cleanup.disconnect, 1);
  assert.equal(manager.cleanup.destroyed, 1);
  assert.equal(h.appListenerCount, 0);
  assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false);
  const next = h.load('printJob.js').beginPrintJob(); next.finish();
});

test('diagnostic double/busy jobs cannot overlap print or discovery; cancellation releases locks and ignores late callbacks', async () => {
  const manager = diagnosticManager({ silent: true });
  const h = harness({ stored: JSON.stringify(nativeProfile), manager, native: true, ownership: 'standalone' });
  h.rn.PermissionsAndroid.check = async () => true;
  const ble = h.load('mxw01Ble.js');
  const token = h.load('printingOperation.js').createCancellation();
  const first = ble.testMXW01Connection({ token });
  assert.equal((await ble.testMXW01Connection()).errorCode, 'busy');
  await manager.queried;
  await assert.rejects(ble.discoverMXW01Printers(), { code: 'busy' });
  assert.equal((await h.load('printSaleTicket.js').printSaleTicket({ mode: 'provided', provided })).reason, 'busy');
  token.cancel();
  const result = await first;
  assert.equal(result.outcome, 'cancelled');
  assert.deepEqual(manager.controls, [A1_QUERY]);
  manager.emit(b64(A1_READY_RX)); // An old callback must not mutate returned evidence.
  assert.equal(result.rawCallbacks, 0);
  assert.equal(result.a1FrameAccepted, false);
  assert.equal(manager.cleanup.monitor, 1);
  assert.equal(manager.cleanup.disconnect, 1);
  assert.equal(manager.cleanup.destroyed, 1);
  assert.equal(h.requests.length + h.urls.length + h.appListenerCount, 0);
  const next = h.load('printJob.js').beginPrintJob(); next.finish();
});

test('leaving foreground or disconnection cancels the diagnostic and always requests native cleanup', async () => {
  for (const event of ['background', 'disconnect']) {
    const manager = diagnosticManager({ silent: true });
    const h = harness({ stored: JSON.stringify(nativeProfile), manager, native: true, ownership: 'standalone' });
    h.rn.PermissionsAndroid.check = async () => true;
    const probe = h.load('mxw01Ble.js').testMXW01Connection();
    await manager.queried;
    if (event === 'background') h.background(); else manager.disconnectEvent();
    const result = await probe;
    assert.equal(result.errorCode, event === 'background' ? 'foreground' : 'connection');
    assert.equal(result.sessionEnded, true);
    assert.equal(manager.controls.length, 1);
    assert.deepEqual(manager.cleanup, { monitor: 1, disconnectedListener: 1, disconnect: 1, destroyed: 1 });
    assert.equal(h.appListenerCount, 0);
  }
});

test('Settings keeps read_user access and navigates landing, printer administration and ticket format', async () => {
  const allowed = await settingsHarness(nativeProfile);
  assert.ok(allowed.text(allowed.render()).includes('Configuraciones'));
  assert.ok(allowed.button('Abrir configuración de impresora'));
  allowed.button('Abrir configuración de impresora').props.onPress();
  assert.ok(allowed.text(allowed.render()).includes('Perfil de impresión'));
  assert.ok(allowed.button('Abrir formato del ticket'));
  allowed.button('Abrir formato del ticket').props.onPress();
  assert.ok(allowed.text(allowed.render()).includes('Guardar cambios'));
  allowed.button('Volver a impresora').props.onPress();
  assert.ok(allowed.text(allowed.render()).includes('Perfil de impresión'));
  assert.equal((await settingsHarness(nativeProfile, false)).render(), null);
});

test('public default receive-window timeout preserves pre-filter CRC-less/malformed evidence and disconnects after one A1', async () => {
  const manager = diagnosticManager({ silent: true });
  const h = harness({ stored: JSON.stringify(nativeProfile), manager, native: true, ownership: 'standalone' });
  h.rn.PermissionsAndroid.check = async () => true;
  const probe = h.load('mxw01Ble.js').testMXW01Connection();
  await manager.queried;
  manager.emit(b64(A1_CRC_LESS_RX));
  manager.emit('malformed base64!');
  const result = await probe;
  assert.equal(result.receiveWindowMs, 5000);
  assert.equal(result.outcome, 'timeout');
  assert.equal(result.a1FrameAccepted, false);
  assert.equal(result.rawCallbacks, 2);
  assert.equal(result.samples[0].decodedBytes, 20);
  assert.equal(result.samples[0].reason, 'incomplete-frame');
  assert.equal(result.samples[1].reason, 'invalid-base64');
  assert.equal(result.sessionEnded, true);
  assert.deepEqual(manager.controls, [A1_QUERY]);
  assert.deepEqual(manager.cleanup, { monitor: 1, disconnectedListener: 1, disconnect: 1, destroyed: 1 });
  assert.equal(h.appListenerCount, 0);
  const next = h.load('printJob.js').beginPrintJob(); next.finish();
});

test('an already-running discovery owns its BLE lock when a diagnostic is rejected as busy', async () => {
  let started;
  const scanning = new Promise((resolve) => { started = resolve; });
  const manager = diagnosticManager({ onScan: started });
  const h = harness({ stored: JSON.stringify(nativeProfile), manager, native: true, ownership: 'standalone' });
  h.rn.PermissionsAndroid.check = async () => true;
  const ble = h.load('mxw01Ble.js');
  const token = h.load('printingOperation.js').createCancellation();
  const discovery = ble.discoverMXW01Printers({ token });
  await scanning;
  const result = await ble.testMXW01Connection();
  assert.equal(result.errorCode, 'busy');
  assert.equal(result.a1Attempts, 0);
  assert.equal(manager.controls.length, 0);
  assert.equal(manager.cleanup.destroyed, 0, 'A busy diagnostic must not destroy the scan owner');
  token.cancel();
  await assert.rejects(discovery, { code: 'cancelled' });
  assert.equal(manager.cleanup.destroyed, 1);
  assert.equal(h.appListenerCount, 0);
  const next = h.load('printJob.js').beginPrintJob(); next.finish();
});

// Literal user-labeled physical A1 captures. A9/AA fixtures below are synthetic
// strict-envelope test controls, NOT observations from this printer.
const OBSERVED_A1_WITH_PAPER = new Uint8Array([0x22, 0x21, 0xa1, 3, 10, 0, 0, 0, 0, 0x5d, 0x13, 0, 0, 0, 0xad, 0, 0]);
const OBSERVED_A1_WITHOUT_PAPER = new Uint8Array([0x22, 0x21, 0xa1, 3, 10, 0, 0, 0, 0, 0x5d, 0x13, 0, 0, 0, 0xaa, 0, 0]);
const OBSERVED_A1_B0_SIGNATURE = new Uint8Array([0x22, 0x21, 0xa1, 3, 10, 0, 0, 0, 0, 0x5f, 0x12, 0, 0, 0, 0xb0, 0, 0]);
const SYNTHETIC_A9_OK = new Uint8Array([0x22, 0x21, 0xa9, 0, 1, 0, 0, 0, 0xff]);
const SYNTHETIC_A9_REJECTED = new Uint8Array([0x22, 0x21, 0xa9, 0, 1, 0, 1, 7, 0xff]);
const SYNTHETIC_AA_OK = new Uint8Array([0x22, 0x21, 0xaa, 0, 1, 0, 0, 0, 0xff]);
const OBSERVED_UNVERIFIED_AA_SIGNALS = [
  new Uint8Array([0x22, 0x21, 0xaa, 0, 3, 0, 0, 0xc7, 0xc7, 0]),
  new Uint8Array([0x22, 0x21, 0xaa, 0, 3, 0, 0, 0x35, 0x35, 0]),
];
const OBSERVED_UNVERIFIED_AA = OBSERVED_UNVERIFIED_AA_SIGNALS[0];

test('both physical A1 literals expose the same idle/no-reported-error with unverified integrity and UNKNOWN paper', () => {
  const protocol = harness().load('mxw01Protocol.js');
  for (const bytes of [OBSERVED_A1_WITH_PAPER, OBSERVED_A1_WITHOUT_PAPER]) {
    assert.equal(bytes.length, 17);
    assert.equal(protocol.parseNotification(bytes), null, 'Global strict parser must not be weakened');
    const packet = protocol.parseObservedShortA1(bytes);
    assert.equal(packet.variant, 'observed-short17');
    assert.equal(packet.integrity, 'unverified');
    assert.equal(packet.provenance, 'user-captures/community-status-layout');
    assert.deepEqual(packet.status, { state: 0, battery: 93, temperature: 19, flag: 0, error: 0, paper: 'unknown' });
    protocol.assertA1Ready(packet);
    assert.equal(packet.payload, undefined, 'Do not invent a payload/CRC/footer interpretation');
  }
});

test('exact user A1 B0 response is only admitted by its eligible deadline fallback and keeps paper UNKNOWN', async () => {
  const protocol = harness().load('mxw01Protocol.js');
  assert.equal(protocol.parseNotification(OBSERVED_A1_B0_SIGNATURE), null, 'Global strict parser must not be weakened');
  const packet = protocol.parseObservedShortA1(OBSERVED_A1_B0_SIGNATURE);
  assert.equal(packet.variant, 'observed-short17');
  assert.equal(packet.integrity, 'unverified');
  assert.equal(packet.status.battery, 95);
  assert.equal(packet.status.temperature, 18);
  assert.equal(packet.status.paper, 'unknown', 'Loaded paper does not establish this signature as a paper sensor');

  const h = diagnosticHarness();
  const transport = diagnosticTransport([b64(OBSERVED_A1_B0_SIGNATURE)]); transport.mtu = 512;
  const result = await controlledProbe(h, transport);
  assert.equal(h.clock.now, 40, 'The whole callback is admitted only at the existing A1 deadline');
  assert.equal(result.outcome, 'a1-ready');
  assert.equal(result.a1Variant, 'observed-short17');
  assert.equal(result.a1Integrity, 'unverified');
  assert.equal(result.paperPresence, 'unknown');
  assert.equal(result.rawCallbacks, 1);
  assert.deepEqual(transport.controls, [A1_QUERY]);
});

test('observed A1 candidate is resolved only at its window end, never by callback arrival or padding', () => {
  const h = diagnosticHarness();
  const protocol = h.load('mxw01Protocol.js');
  const packets = [];
  const decoder = protocol.createMXW01ReceiveDecoder((packet) => packets.push(packet));
  decoder.beginA1(40);
  decoder.push(OBSERVED_A1_WITH_PAPER);
  assert.equal(packets.length, 0, 'A17 prefix must not be admitted prematurely');
  assert.equal(decoder.resolveObservedA1(), null, 'Even an explicit early resolution call must not admit a candidate');
  h.clock.elapse(40);
  const compatible = decoder.resolveObservedA1();
  assert.equal(compatible.variant, 'observed-short17');
  assert.equal(decoder.resolveObservedA1(), null, 'Only one fallback per A1 window');
  decoder.push(SYNTHETIC_A9_OK);
  assert.equal(packets.length, 1, 'Resolved isolated candidate must not eat the following strict ACK');
  assert.equal(packets[0].command, 0xa9);
  assert.deepEqual([...packets[0].payload], [0]);
});

test('fragmented/coalesced/extra/second-callback A1 data cannot use compatibility; subsequent strict frames survive', () => {
  const h = diagnosticHarness();
  const protocol = h.load('mxw01Protocol.js');
  const join = (...chunks) => new Uint8Array(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  for (const chunks of [
    [OBSERVED_A1_WITH_PAPER.slice(0, 8), OBSERVED_A1_WITH_PAPER.slice(8)],
    [join(OBSERVED_A1_WITH_PAPER, SYNTHETIC_A9_OK)],
    [OBSERVED_A1_WITH_PAPER, SYNTHETIC_A9_OK],
    [join(OBSERVED_A1_WITH_PAPER, new Uint8Array([0]))],
    [OBSERVED_A1_WITH_PAPER, new Uint8Array([0xff])], // A bad strict18 must not downgrade to short17.
    [OBSERVED_A1_WITH_PAPER, OBSERVED_A1_WITH_PAPER],
  ]) {
    const packets = [];
    const decoder = protocol.createMXW01ReceiveDecoder((packet) => packets.push(packet));
    decoder.beginA1(h.clock.now + 40);
    chunks.forEach((chunk) => decoder.push(chunk));
    h.clock.elapse(40);
    assert.equal(decoder.resolveObservedA1(), null);
    assert.equal(packets.some((packet) => packet.variant === 'observed-short17'), false);
    if (chunks.some((chunk) => chunk === SYNTHETIC_A9_OK || chunk.length === 26)) {
      assert.equal(packets.find((packet) => packet.command === 0xa9)?.payload[0], 0);
    }
  }
  const decoder = protocol.createMXW01ReceiveDecoder(() => {});
  decoder.beginA1(h.clock.now + 40); decoder.push(OBSERVED_A1_WITH_PAPER); decoder.invalidateA1Fallback();
  h.clock.elapse(40);
  assert.equal(decoder.resolveObservedA1(), null, 'Malformed/filtered callbacks also disqualify fallback');
});

test('unrelated opcode/header/tag/length/reserved/tail and truncated variants are not short A1', () => {
  const protocol = harness().load('mxw01Protocol.js');
  for (const [index, value] of [[0, 0x21], [1, 0x22], [2, 0xa9], [2, 0xaa], [3, 0], [4, 9], [5, 1], [7, 1], [8, 1], [11, 1], [14, 0xab], [15, 1], [16, 0xff]]) {
    const mutated = OBSERVED_A1_WITH_PAPER.slice(); mutated[index] = value;
    assert.equal(protocol.parseObservedShortA1(mutated), null);
  }
  for (let length = 0; length < 17; length += 1) assert.equal(protocol.parseObservedShortA1(OBSERVED_A1_WITH_PAPER.slice(0, length)), null);
  assert.equal(protocol.parseObservedShortA1(new Uint8Array([...OBSERVED_A1_WITH_PAPER, 0])), null);
});

test('synthetic CRC-valid strict18 prefix17 remains ambiguous and cannot be accepted as observed short', () => {
  const h = diagnosticHarness();
  const protocol = h.load('mxw01Protocol.js');
  // Independent synthetic literal: battery byte33 makes the ten-byte payload CRC00.
  const strict18 = new Uint8Array([0x22, 0x21, 0xa1, 3, 10, 0, 0, 0, 0, 0x33, 0x13, 0, 0, 0, 0xad, 0, 0, 0xff]);
  assert.ok(protocol.parseNotification(strict18));
  assert.equal(protocol.parseObservedShortA1(strict18.slice(0, 17)), null);
  const packets = [];
  const decoder = protocol.createMXW01ReceiveDecoder((packet) => packets.push(packet));
  decoder.beginA1(40); decoder.push(strict18.slice(0, 17));
  assert.equal(packets.length, 0);
  h.clock.elapse(40);
  assert.equal(decoder.resolveObservedA1(), null);
  // Keep the existing strict CRC assertions in a fresh in-budget A1 window;
  // the separate deadline regressions below reject the overdue continuation.
  decoder.beginA1(h.clock.now + 40);
  decoder.push(strict18.slice(0, 17));
  decoder.push(strict18.slice(17));
  assert.equal(packets[0].variant, 'strict-crc');
  assert.equal(packets[0].integrity, 'crc-verified');
  assert.throws(() => protocol.assertA1Ready(packets[0]), { code: 'status' }, 'Legacy strict10 status is still unsupported, not silently remapped');
});

test('legacy strict A1 CRC positives/negatives keep their framing and interpretation', () => {
  const h = diagnosticHarness();
  const protocol = h.load('mxw01Protocol.js');
  const packets = [];
  const decoder = protocol.createMXW01ReceiveDecoder((packet) => packets.push(packet));
  decoder.beginA1(40); decoder.push(A1_READY_RX.slice(0, 12)); decoder.push(A1_READY_RX.slice(12));
  assert.equal(packets.length, 1);
  assert.equal(packets[0].variant, 'strict-crc');
  protocol.assertA1Ready(packets[0]);
  const bad = A1_READY_RX.slice(); bad[19] = 1;
  decoder.beginA1(40); decoder.push(bad);
  h.clock.elapse(40);
  assert.equal(decoder.resolveObservedA1(), null);
  assert.equal(packets.length, 1);
});

test('community-inferred synthetic busy/error/unknown short statuses reject consistently without claiming paper detection', () => {
  const protocol = harness().load('mxw01Protocol.js');
  for (const [index, value] of [[6, 1], [6, 2], [6, 3], [6, 4], [6, 255], [12, 1], [13, 1], [12, 4], [13, 9]]) {
    const synthetic = OBSERVED_A1_WITH_PAPER.slice(); synthetic[index] = value;
    const packet = protocol.parseObservedShortA1(synthetic);
    assert.ok(packet, 'Fixture layout is inferred community evidence, not a new physical capture');
    assert.equal(packet.status.paper, 'unknown');
    assert.throws(() => protocol.assertA1Ready(packet), { code: 'status' });
  }
});

test('same physical A1 literals enter diagnostic compatibility at the deadline with one query and no printing', async () => {
  for (const bytes of [OBSERVED_A1_WITH_PAPER, OBSERVED_A1_WITHOUT_PAPER]) {
    const h = diagnosticHarness();
    const transport = diagnosticTransport([b64(bytes)]); transport.mtu = 512;
    const result = await controlledProbe(h, transport);
    assert.equal(h.clock.now, 40, 'No arbitrary quiet timer or immediate short-frame acceptance');
    assert.equal(result.outcome, 'a1-ready');
    assert.equal(result.a1Variant, 'observed-short17');
    assert.equal(result.a1Integrity, 'unverified');
    assert.equal(result.a1Provenance, 'user-captures/community-status-layout');
    assert.equal(result.paperPresence, 'unknown');
    assert.equal(result.mtu, 512);
    assert.equal(result.rawCallbacks, 1);
    assert.equal(result.samples[0].decodedBytes, 17);
    assert.equal(result.samples[0].reason, 'observed-a1-candidate');
    assert.deepEqual(transport.controls, [A1_QUERY]);
    assert.equal(transport.removed, 1);
    assert.match(h.load('mxw01Diagnostic.js').formatA1Diagnostic(result), /Paper presence is UNKNOWN/);
  }
});

test('short A1 followed by malformed/extra callbacks or cancellation never activates diagnostic fallback', async () => {
  for (const tail of ['invalid base64!', b64(new Uint8Array([0xff]))]) {
    const h = diagnosticHarness();
    const result = await controlledProbe(h, diagnosticTransport([b64(OBSERVED_A1_WITH_PAPER), tail]));
    assert.equal(result.outcome, 'timeout');
    assert.equal(result.a1FrameAccepted, false);
    assert.equal(result.rawCallbacks, 2);
  }
  const h = diagnosticHarness();
  const token = h.load('printingOperation.js').createCancellation();
  const transport = diagnosticTransport([b64(OBSERVED_A1_WITH_PAPER)], { onWrite() { token.cancel(); } });
  const result = await controlledProbe(h, transport, shortProbe, token);
  assert.equal(result.outcome, 'cancelled');
  assert.equal(result.a1FrameAccepted, false);
  assert.equal(transport.removed, 1);
});

function observedPrintTransport(status, options = {}) {
  let receive;
  let rejectCallback;
  let removed = 0;
  let dataWrites = 0;
  const controls = [];
  return {
    mtu: 512, controls,
    get removed() { return removed; }, get dataWrites() { return dataWrites; },
    monitor(callback, fail, rejected) { receive = callback; rejectCallback = rejected; return () => { removed += 1; }; },
    async writeControl(bytes) {
      controls.push([...bytes]);
      if (bytes[2] === 0xa1) {
        assert.deepEqual([...bytes], A1_QUERY);
        receive(status);
        if (options.extraA1) rejectCallback();
        if (options.hungA1) return new Promise(() => {});
      }
      if (bytes[2] === 0xa9 && !options.noAck) receive(options.ack || SYNTHETIC_A9_OK);
      if (bytes[2] === 0xad && !options.noComplete) receive(options.complete || SYNTHETIC_AA_OK);
    },
    async writeData() {
      assert.equal(controls.filter((packet) => packet[2] === 0xa9).length, 1);
      assert.ok(!options.noAck && (!options.ack || options.ack === SYNTHETIC_A9_OK), 'No data before a zero strict A9 ACK');
      dataWrites += 1;
    },
  };
}

test('full session proceeds from observed A1 only after fallback/status, strict A9 zero ACK and strict AA completion', async () => {
  for (const bytes of [OBSERVED_A1_WITH_PAPER, OBSERVED_A1_WITHOUT_PAPER, OBSERVED_A1_B0_SIGNATURE]) {
    const h = diagnosticHarness();
    const transport = observedPrintTransport(bytes);
    const result = await h.clock.settle(h.load('mxw01Session.js').runMXW01Session(transport, raster(), h.load('printingOperation.js').createCancellation(), fastLimits));
    assert.equal(result.status, 'printed', 'Later ACK/completion here are synthetic controls, not hardware proof');
    assert.equal(result.a1Variant, 'observed-short17');
    assert.equal(result.a1Integrity, 'unverified');
    assert.equal(result.paperPresence, 'unknown');
    assert.equal(transport.dataWrites, 90);
    assert.deepEqual(transport.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9, 0xad]);
    assert.equal(transport.removed, 1);
    assert.equal(h.clock.pendingTimers, 0);
  }
});

test('physical A1 does not relax rejected/missing/invalid A9; no AE03 transfer or retransmission follows', async () => {
  const badCRC = new Uint8Array([0x22, 0x21, 0xa9, 0, 1, 0, 0, 1, 0xff]);
  const twoBytes = new Uint8Array([0x22, 0x21, 0xa9, 0, 2, 0, 0, 0, 0, 0xff]);
  // The newly observed whole8 literal now has its own positive/deferred tests;
  // retain this negative's no-data meaning with a genuinely truncated seven-byte ACK.
  for (const [options, code] of [[{ ack: SYNTHETIC_A9_REJECTED }, 'rejected'], [{ noAck: true }, 'timeout'], [{ ack: badCRC }, 'timeout'], [{ ack: twoBytes }, 'rejected'], [{ ack: SYNTHETIC_A9_OK.slice(0, 7) }, 'timeout']]) {
    const h = diagnosticHarness();
    const transport = observedPrintTransport(OBSERVED_A1_WITH_PAPER, options);
    await assert.rejects(h.clock.settle(h.load('mxw01Session.js').runMXW01Session(transport, raster(), h.load('printingOperation.js').createCancellation(), fastLimits)), { code });
    assert.equal(transport.dataWrites, 0);
    assert.deepEqual(transport.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9]);
    assert.equal(transport.removed, 1);
    assert.equal(h.clock.pendingTimers, 0);
  }
});

test('physical A1 keeps strict AA validation: absent/invalid frames are sent-unconfirmed, nonzero payload remains an error', async () => {
  const badCRC = new Uint8Array([0x22, 0x21, 0xaa, 0, 1, 0, 0, 1, 0xff]);
  const nonzero = new Uint8Array([0x22, 0x21, 0xaa, 0, 1, 0, 1, 7, 0xff]);
  for (const [options, resultKind] of [[{ noComplete: true }, 'sent-unconfirmed'], [{ complete: badCRC }, 'sent-unconfirmed'], [{ complete: SYNTHETIC_AA_OK.slice(0, 8) }, 'sent-unconfirmed'], [{ complete: nonzero }, 'completion']]) {
    const h = diagnosticHarness();
    const transport = observedPrintTransport(OBSERVED_A1_WITH_PAPER, options);
    const session = h.clock.settle(h.load('mxw01Session.js').runMXW01Session(transport, raster(), h.load('printingOperation.js').createCancellation(), fastLimits));
    if (resultKind === 'sent-unconfirmed') assert.equal((await session).status, resultKind);
    else await assert.rejects(session, { code: resultKind });
    assert.equal(transport.dataWrites, 90);
    assert.deepEqual(transport.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9, 0xad]);
    assert.equal(transport.removed, 1);
    assert.equal(h.clock.pendingTimers, 0);
  }
});

test('synthetic busy/error/unknown A1, rejected raw callback or unqueued A1 write stops before intensity/request/data', async () => {
  const busy = OBSERVED_A1_WITH_PAPER.slice(); busy[6] = 1;
  const error = OBSERVED_A1_WITH_PAPER.slice(); error[12] = 1; error[13] = 9;
  const unknown = OBSERVED_A1_WITH_PAPER.slice(); unknown[6] = 4;
  for (const [bytes, options, code] of [[busy, {}, 'status'], [error, {}, 'status'], [unknown, {}, 'status'], [OBSERVED_A1_WITH_PAPER, { extraA1: true }, 'timeout'], [OBSERVED_A1_WITH_PAPER, { hungA1: true }, 'timeout']]) {
    const h = diagnosticHarness();
    const transport = observedPrintTransport(bytes, options);
    await assert.rejects(h.clock.settle(h.load('mxw01Session.js').runMXW01Session(transport, raster(), h.load('printingOperation.js').createCancellation(), fastLimits)), { code });
    assert.deepEqual(transport.controls, [A1_QUERY]);
    assert.equal(transport.dataWrites, 0);
    assert.equal(transport.removed, 1);
    assert.equal(h.clock.pendingTimers, 0);
  }
});

test('native diagnostic wrapper shares observed A1 admission and closes the sole saved-device status run', async () => {
  const manager = diagnosticManager({ mtu: 512, statusReply: OBSERVED_A1_WITHOUT_PAPER });
  const stored = JSON.stringify(nativeProfile);
  const h = harness({ stored, manager, native: true, ownership: 'standalone', clock: controlledClock() });
  h.rn.PermissionsAndroid.check = async () => true;
  const result = await h.clock.settle(h.load('mxw01Ble.js').testMXW01Connection());
  assert.equal(result.outcome, 'a1-ready');
  assert.equal(result.a1Variant, 'observed-short17');
  assert.equal(result.a1Integrity, 'unverified');
  assert.equal(result.paperPresence, 'unknown', 'The user-labeled no-paper capture must not produce paper-present assurance');
  assert.equal(result.receiveWindowMs, 5000);
  assert.equal(result.mtu, 512);
  assert.equal(result.rawCallbacks, 1);
  assert.equal(result.samples[0].decodedBytes, 17);
  assert.deepEqual(manager.controls, [A1_QUERY]);
  assert.deepEqual(manager.cleanup, { monitor: 1, disconnectedListener: 1, disconnect: 1, destroyed: 1 });
  assert.equal(h.appListenerCount, 0);
  assert.equal(h.clock.pendingTimers, 0);
  assert.equal(h.stored, stored);
  assert.equal(h.requests.length + h.urls.length, 0);
  assert.equal(JSON.stringify(result).includes(mac), false);
  assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false);
});

const CANONICAL_OBSERVED_A1_BASE64 = 'IiGhAwoAAAAAXRMAAACtAAA=';
const NONCANONICAL_OBSERVED_A1_BASE64 = 'IiGhAwoAAAAAXRMAAACtAAB='; // Nonzero unused pad bits; permissive Buffer yields the same17 bytes.

function nativeSessionManager(clock, options = {}) {
  let listener;
  let disconnect;
  const uuids = harness().load('mxw01Protocol.js').MXW01_UUIDS;
  const controls = [];
  const trace = [];
  const cleanup = { monitor: 0, disconnectedListener: 0, disconnect: 0, destroyed: 0 };
  let queuedAt = null;
  let dataWrites = 0;
  return {
    controls, cleanup, trace,
    get queuedAt() { return queuedAt; }, get dataWrites() { return dataWrites; },
    async state() { return 'PoweredOn'; },
    async connectToDevice() { return { mtu: options.mtu ?? 512 }; },
    async discoverAllServicesAndCharacteristicsForDevice() {},
    async servicesForDevice() { return [{ uuid: uuids.services[0] }]; },
    async characteristicsForDevice() { return [
      { uuid: uuids.control, isWritableWithoutResponse: true },
      { uuid: uuids.notify, isNotifiable: true },
      { uuid: uuids.data, isWritableWithoutResponse: true },
    ]; },
    onDeviceDisconnected(id, callback) { disconnect = callback; return { remove() { cleanup.disconnectedListener += 1; } }; },
    monitorCharacteristicForDevice(id, service, characteristic, callback) {
      assert.equal(characteristic, uuids.notify);
      listener = callback;
      return { remove() { cleanup.monitor += 1; } };
    },
    emit(value, error = null) { listener(error, { value, deviceID: mac, name: 'PRIVATE_SENTINEL' }); },
    disconnectEvent(error = null) { disconnect(error, { id: mac, name: 'PRIVATE_SENTINEL' }); },
    async writeCharacteristicWithoutResponseForDevice(id, service, characteristic, value) {
      const bytes = [...Buffer.from(value, 'base64')];
      trace.push({ characteristic, value, at: clock.now }); // Synthetic mock I/O only, never a production report/log.
      if (characteristic === uuids.data) {
        assert.equal(controls.filter((packet) => packet[2] === 0xa9).length, 1, 'No image before A9 request/strict synthetic ACK');
        dataWrites += 1;
        if (options.onData) return options.onData(this, bytes, dataWrites);
        return;
      }
      assert.equal(characteristic, uuids.control);
      controls.push(bytes);
      if (bytes[2] === 0xa1) {
        assert.deepEqual(bytes, A1_QUERY); queuedAt = clock.now;
        if (options.autoA1) this.emit(options.a1Value || b64(A1_READY_RX));
      }
      // Later frames are independent synthetic strict test controls, never real device evidence.
      if (bytes[2] === 0xa9) {
        for (const value of options.a9Values ?? [b64(SYNTHETIC_A9_OK)]) this.emit(value);
        if (options.onA9) return options.onA9(this);
      }
      if (bytes[2] === 0xad && !options.noComplete) this.emit(options.completeValue ?? b64(SYNTHETIC_AA_OK));
      if (options.onControl) return options.onControl(this, bytes);
    },
    startDeviceScan() { assert.fail('No test may scan'); }, stopDeviceScan() {}, cancelTransaction() {},
    async cancelDeviceConnection() { cleanup.disconnect += 1; }, destroy() { cleanup.destroyed += 1; },
  };
}

async function queuedNativeRun(mode) {
  const clock = controlledClock();
  const manager = nativeSessionManager(clock);
  const stored = JSON.stringify(nativeProfile);
  const h = harness({ stored, clock, manager, native: true, ownership: 'standalone' });
  h.rn.PermissionsAndroid.check = async () => true;
  const ble = h.load('mxw01Ble.js');
  const operation = mode === 'diagnostic' ? ble.testMXW01Connection()
    : ble.printMXW01Raster(nativeProfile, raster(), h.load('printingOperation.js').createCancellation());
  // Own the setup turn separately from the receive-window timer so callbacks can
  // arrive with an overdue timeout still queued, as in the independent finding.
  await clock.flushMicrotasks();
  assert.equal(manager.queuedAt, null);
  assert.equal(clock.pendingTimers, mode === 'diagnostic' ? 2 : 1);
  clock.fireNextTimer();
  await clock.flushMicrotasks();
  assert.equal(clock.now, 250);
  assert.equal(manager.queuedAt, 250);
  assert.deepEqual(manager.controls, [A1_QUERY]);
  assert.equal(clock.pendingTimers, 1, 'Receive timer is still queued and has not fired');
  return { h, clock, manager, operation, stored, deadline: mode === 'diagnostic' ? 5000 : 5250 };
}

function assertNativeRunClean(run, expectedRequests = 0) {
  assert.deepEqual(run.manager.cleanup, { monitor: 1, disconnectedListener: 1, disconnect: 1, destroyed: 1 });
  assert.equal(run.h.appListenerCount, 0);
  assert.equal(run.clock.pendingTimers, 0);
  assert.equal(run.h.requests.length, expectedRequests);
  assert.equal(run.h.urls.length, 0);
  assert.equal(run.h.stored, run.stored);
}

test('actual native adapter/session accepts only A1 arrivals before the deadline, not equality/overdue-timer callbacks', async () => {
  for (const [value, variant] of [[CANONICAL_OBSERVED_A1_BASE64, 'observed-short17'], [b64(A1_READY_RX), 'strict-crc']]) {
    for (const arrival of [5249, 5250, 5251]) {
      const run = await queuedNativeRun('printing');
      try {
        run.clock.elapse(arrival - run.clock.now);
        assert.equal(run.clock.pendingTimers, 1, 'Overdue window timer has deliberately NOT executed');
        run.manager.emit(value); // Real production Base64 adapter -> real production session/receiver.
        if (arrival < run.deadline) {
          const result = await run.clock.settle(run.operation);
          assert.equal(result.status, 'printed', 'Synthetic A9/AA only; not hardware proof');
          assert.equal(result.a1Variant, variant);
          assert.equal(result.paperPresence, 'unknown');
          assert.equal(run.manager.dataWrites, 90);
          assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9, 0xad]);
        } else {
          await assert.rejects(run.clock.settle(run.operation), { code: 'timeout' });
          assert.equal(run.manager.dataWrites, 0);
          assert.deepEqual(run.manager.controls, [A1_QUERY], 'Late A1 must not advance to intensity or A9');
        }
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  }
});

test('strict A1 fragments completing at the deadline cannot resolve a printing waiter; other late strict commands still stream', async () => {
  const run = await queuedNativeRun('printing');
  try {
    run.clock.elapse(4999 - run.clock.now);
    run.manager.emit(b64(A1_READY_RX.slice(0, 12)));
    run.clock.elapse(5250 - run.clock.now);
    run.manager.emit(b64(A1_READY_RX.slice(12)));
    await assert.rejects(run.clock.settle(run.operation), { code: 'timeout' });
    assert.equal(run.manager.dataWrites, 0);
    assert.deepEqual(run.manager.controls, [A1_QUERY]);
    assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
  const h = diagnosticHarness();
  const packets = [];
  const decoder = h.load('mxw01Protocol.js').createMXW01ReceiveDecoder((packet) => packets.push(packet));
  decoder.beginA1(40);
  h.clock.elapse(40);
  decoder.push(new Uint8Array([...A1_READY_RX, ...SYNTHETIC_A9_OK, ...SYNTHETIC_AA_OK]));
  assert.deepEqual(packets.map((packet) => packet.command), [0xa9, 0xaa], 'Drop late A1 only, not the remaining strict stream');
  assert.equal(decoder.resolveObservedA1(), null);
});

test('actual diagnostic adapter shares exclusive A1 arrival boundary before/equal/after its window', async () => {
  for (const value of [CANONICAL_OBSERVED_A1_BASE64, b64(A1_READY_RX)]) {
    for (const arrival of [4999, 5000, 5001]) {
      const run = await queuedNativeRun('diagnostic');
      try {
        run.clock.elapse(arrival - run.clock.now);
        run.manager.emit(value);
        const result = await run.clock.settle(run.operation);
        assert.equal(result.outcome, arrival < run.deadline ? 'a1-ready' : 'timeout');
        assert.equal(result.a1FrameAccepted, arrival < run.deadline);
        assert.equal(result.rawCallbacks, arrival < run.deadline ? 1 : 0);
        assert.equal(result.receiveWindowMs, 5000);
        assert.equal(run.manager.dataWrites, 0);
        assert.deepEqual(run.manager.controls, [A1_QUERY]);
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  }
});

test('shared canonical decoder rejects nonzero padding bits and oversized/malformed input before any protocol feed', () => {
  const protocol = harness().load('mxw01Protocol.js');
  assert.deepEqual([...Buffer.from(CANONICAL_OBSERVED_A1_BASE64, 'base64')], [...OBSERVED_A1_WITH_PAPER]);
  assert.deepEqual([...Buffer.from(NONCANONICAL_OBSERVED_A1_BASE64, 'base64')], [...OBSERVED_A1_WITH_PAPER], 'Permissive decoder alone is insufficient');
  assert.deepEqual([...protocol.decodeCanonicalNotificationValue(CANONICAL_OBSERVED_A1_BASE64)], [...OBSERVED_A1_WITH_PAPER]);
  for (const value of [NONCANONICAL_OBSERVED_A1_BASE64, 'invalid base64!', null, CANONICAL_OBSERVED_A1_BASE64 + 'A'.repeat(1000), 'AB==']) {
    assert.equal(protocol.decodeCanonicalNotificationValue(value), null);
    assert.equal(protocol.decodeCanonicalNotificationValue(value, 72), null);
  }
  assert.equal(protocol.decodeCanonicalNotificationValue('A'.repeat(684)), null, '513 decoded bytes exceed the512-byte default bound');
  assert.equal(protocol.decodeCanonicalNotificationValue('A'.repeat(100000), 72), null);
});

test('actual printing and diagnostic adapters agree on canonical versus noncanonical observed A1', async () => {
  for (const mode of ['printing', 'diagnostic']) {
    for (const value of [CANONICAL_OBSERVED_A1_BASE64, NONCANONICAL_OBSERVED_A1_BASE64]) {
      const run = await queuedNativeRun(mode);
      try {
        run.manager.emit(value);
        if (mode === 'printing') {
          if (value === CANONICAL_OBSERVED_A1_BASE64) {
            assert.equal((await run.clock.settle(run.operation)).a1Variant, 'observed-short17');
            assert.equal(run.manager.dataWrites, 90);
          } else {
            await assert.rejects(run.clock.settle(run.operation), { code: 'timeout' });
            assert.equal(run.manager.dataWrites, 0);
            assert.deepEqual(run.manager.controls, [A1_QUERY]);
          }
        } else {
          const result = await run.clock.settle(run.operation);
          assert.equal(result.outcome, value === CANONICAL_OBSERVED_A1_BASE64 ? 'a1-ready' : 'timeout');
          assert.equal(result.samples[0].reason, value === CANONICAL_OBSERVED_A1_BASE64 ? 'observed-a1-candidate' : 'invalid-base64');
          assert.equal(result.samples[0].decodedBytes, value === CANONICAL_OBSERVED_A1_BASE64 ? 17 : 0);
          assert.equal(run.manager.dataWrites, 0);
          assert.deepEqual(run.manager.controls, [A1_QUERY]);
        }
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  }
});

test('a second noncanonical/malformed callback invalidates an eligible observed candidate in both actual adapters', async () => {
  for (const mode of ['printing', 'diagnostic']) {
    for (const invalid of [NONCANONICAL_OBSERVED_A1_BASE64, 'bad!', null]) {
      const run = await queuedNativeRun(mode);
      try {
        run.manager.emit(CANONICAL_OBSERVED_A1_BASE64);
        run.manager.emit(invalid);
        if (mode === 'printing') await assert.rejects(run.clock.settle(run.operation), { code: 'timeout' });
        else {
          const result = await run.clock.settle(run.operation);
          assert.equal(result.outcome, 'timeout');
          assert.equal(result.a1FrameAccepted, false);
          assert.equal(result.rawCallbacks, 2);
          assert.equal(result.samples[1].reason, 'invalid-base64');
        }
        assert.equal(run.manager.dataWrites, 0);
        assert.deepEqual(run.manager.controls, [A1_QUERY]);
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  }
});

test('late invalid callbacks cannot preserve an older observed fallback after the exclusive deadline', async () => {
  for (const mode of ['printing', 'diagnostic']) {
    const run = await queuedNativeRun(mode);
    try {
      run.manager.emit(CANONICAL_OBSERVED_A1_BASE64);
      run.clock.elapse(run.deadline - run.clock.now);
      run.manager.emit(NONCANONICAL_OBSERVED_A1_BASE64);
      if (mode === 'printing') await assert.rejects(run.clock.settle(run.operation), { code: 'timeout' });
      else assert.equal((await run.clock.settle(run.operation)).outcome, 'timeout');
      assert.equal(run.manager.dataWrites, 0);
      assert.deepEqual(run.manager.controls, [A1_QUERY]);
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

async function evidenceNativeRun(options = {}, observer) {
  const clock = controlledClock();
  const manager = nativeSessionManager(clock, { autoA1: true, ...options });
  const stored = JSON.stringify(nativeProfile);
  const h = harness({ clock, manager, stored, native: true, ownership: 'standalone' });
  h.rn.PermissionsAndroid.check = async () => true;
  const token = h.load('printingOperation.js').createCancellation();
  const operation = h.load('mxw01Ble.js').printMXW01Raster(nativeProfile, raster(), token, observer);
  return { clock, manager, h, token, operation, stored };
}

test('passive A9 evidence on/off has identical bytes, sequence and virtual pacing for valid/rejected/corrupt/missing ACKs', async () => {
  const badCRC = new Uint8Array([0x22, 0x21, 0xa9, 0, 1, 0, 0, 1, 0xff]);
  for (const [options, expected] of [
    [{}, 'printed'], [{ a9Values: [b64(SYNTHETIC_A9_REJECTED)] }, 'rejected'],
    [{ a9Values: [b64(badCRC)] }, 'timeout'], [{ a9Values: [] }, 'timeout'],
  ]) {
    const reports = [];
    const off = await evidenceNativeRun(options);
    const on = await evidenceNativeRun(options, (report) => { assert.equal(on.manager.cleanup.destroyed, 1); reports.push(report); });
    try {
      for (const run of [off, on]) {
        if (expected === 'printed') assert.equal((await run.clock.settle(run.operation)).status, 'printed');
        else await assert.rejects(run.clock.settle(run.operation), { code: expected });
        assertNativeRunClean(run);
        assert.equal(run.manager.controls.filter((packet) => packet[2] === 0xa1).length, 1);
        assert.equal(run.manager.controls.filter((packet) => packet[2] === 0xa9).length, 1);
        assert.equal(run.manager.dataWrites, expected === 'printed' ? 90 : 0);
      }
      assert.deepEqual(on.manager.trace, off.manager.trace, 'Observer cannot add writes, change bytes or virtual timing');
      assert.equal(reports.length, 1);
      assert.equal(reports[0].a1Passed, true);
      assert.equal(reports[0].a9WriteQueued, true);
      assert.equal(reports[0].a9AckAccepted, expected === 'printed');
      assert.equal(reports[0].imageTransferStarted, expected === 'printed');
      assert.equal(reports[0].imageWriteAttempts, expected === 'printed' ? 90 : 0);
      assert.equal(reports[0].imageWritesResolved, expected === 'printed' ? 90 : 0);
      assert.equal(reports[0].imageBytesQueued, expected === 'printed' ? 4320 : 0);
      assert.equal(reports[0].rawA9AckToFirstImageWriteMs, expected === 'printed' ? 0 : null);
      assert.equal(reports[0].completionValidated, expected === 'printed');
      assert.equal(reports[0].attemptEnded, true);
      assert.equal(reports[0].errorCode, expected === 'printed' ? null : expected);
      assert.equal(reports[0].samples[0]?.classification, expected === 'printed' ? 'strict-a9-zero' : expected === 'rejected' ? 'strict-a9-rejected' : options.a9Values.length ? 'crc-rejected' : undefined);
    } finally { off.clock.dispose(); on.clock.dispose(); }
  }
});

test('passive A9 raw metadata precedes canonical/frame rejection and stays within4/72/96/255/5000 bounds', async () => {
  const badCRC = new Uint8Array([0x22, 0x21, 0xa9, 0, 1, 0, 0, 1, 0xff]);
  const short = new Uint8Array([0x22, 0x21, 0xa9, 3, 1, 0, 0, 0]); // Synthetic incomplete example; real A9 is unknown.
  const oversized = b64(SYNTHETIC_A9_OK) + 'A'.repeat(100000);
  const reports = [];
  const run = await evidenceNativeRun({ a9Values: ['bad!', b64(short), b64(badCRC), oversized, ...Array(300).fill('!')] }, (report) => reports.push(report));
  try {
    await assert.rejects(run.clock.settle(run.operation), { code: 'timeout' });
    const report = reports[0];
    assert.equal(report.receiveWindowMs, 5000);
    assert.equal(report.rawCallbacks, 255);
    assert.equal(report.callbacksSaturated, true);
    assert.equal(report.samples.length, 4);
    assert.deepEqual(report.samples.map((sample) => sample.classification), ['invalid-base64', 'incomplete-frame', 'crc-rejected', 'truncated-input']);
    assert.equal(report.samples[3].decodedBytes, 72);
    assert.equal(report.samples[3].inputChars, 65535);
    assert.equal(report.samples[3].truncated, true);
    assert.ok(report.samples.every((sample) => sample.hex.length <= 215));
    assert.equal(report.a9AckAccepted, false);
    assert.equal(run.manager.dataWrites, 0);
    assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9]);
    assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
});

test('fragment classifications are passive: literal fragmented zero ACK still permits the existing intended print', async () => {
  const reports = [];
  const run = await evidenceNativeRun({ a9Values: [b64(SYNTHETIC_A9_OK.slice(0, 5)), b64(SYNTHETIC_A9_OK.slice(5))] }, (report) => reports.push(report));
  try {
    assert.equal((await run.clock.settle(run.operation)).status, 'printed');
    assert.equal(reports[0].rawCallbacks, 2);
    assert.equal(reports[0].a9AckAccepted, true);
    assert.equal(reports[0].samples[0].classification, 'incomplete-frame');
    assert.equal(run.manager.dataWrites, 90);
    assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
});

test('sync/async observer failures or an unmounted consumer cannot alter ACK admission, print trace or cleanup', async () => {
  const off = await evidenceNativeRun();
  try {
    await off.clock.settle(off.operation);
    for (const observer of [() => { throw new Error('PRIVATE_SENTINEL'); }, async () => { throw new Error('PRIVATE_SENTINEL'); }, () => {}]) {
      const run = await evidenceNativeRun({}, observer);
      try {
        assert.equal((await run.clock.settle(run.operation)).status, 'printed');
        await run.clock.flushMicrotasks(); // Consume rejected observer Promise without an unhandled rejection.
        assert.deepEqual(run.manager.trace, off.manager.trace);
        assert.equal(run.manager.dataWrites, 90);
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  } finally { off.clock.dispose(); }
});

test('passive A9 window ignores equality/late callbacks even with timeout dispatch overdue, without extending the request', async () => {
  for (const lateAt of [5250, 5251]) {
    const reports = [];
    const run = await evidenceNativeRun({ a9Values: [] }, (report) => reports.push(report));
    try {
      await run.clock.flushMicrotasks();
      run.clock.fireNextTimer(); // Existing250ms setup; strict synthetic A1 is immediate.
      await run.clock.flushMicrotasks();
      assert.equal(run.clock.now, 250);
      assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9]);
      assert.equal(run.clock.pendingTimers, 1);
      run.clock.elapse(4999 - run.clock.now);
      run.manager.emit('bad!');
      run.clock.elapse(lateAt - run.clock.now);
      run.manager.emit('another bad value!'); // Never a valid ACK; no validation policy change is tested/implied.
      await assert.rejects(run.clock.settle(run.operation), { code: 'timeout' });
      assert.equal(reports[0].rawCallbacks, 1);
      assert.equal(reports[0].receiveWindowMs, 5000);
      assert.equal(reports[0].a9AckAccepted, false);
      assert.equal(run.manager.dataWrites, 0);
      assert.equal(run.manager.controls.filter((packet) => packet[2] === 0xa9).length, 1);
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('foreground/cancel and missing AA retain useful A9 evidence without retries or false success', async () => {
  for (const scenario of ['cancel', 'foreground', 'missing-aa']) {
    const reports = [];
    const run = await evidenceNativeRun(scenario === 'missing-aa' ? { noComplete: true } : { a9Values: [] }, (report) => reports.push(report));
    try {
      if (scenario !== 'missing-aa') {
        await run.clock.flushMicrotasks(); run.clock.fireNextTimer(); await run.clock.flushMicrotasks();
        if (scenario === 'cancel') run.token.cancel(); else run.h.background();
      }
      if (scenario === 'missing-aa') assert.equal((await run.clock.settle(run.operation)).status, 'sent-unconfirmed');
      else await assert.rejects(run.clock.settle(run.operation), { code: scenario === 'cancel' ? 'cancelled' : 'foreground' });
      assert.equal(reports.length, 1);
      assert.equal(reports[0].a9AckAccepted, scenario === 'missing-aa');
      assert.equal(reports[0].imageTransferStarted, scenario === 'missing-aa');
      assert.equal(reports[0].completionValidated, false);
      assert.equal(reports[0].printResult, scenario === 'missing-aa' ? 'sent-unconfirmed' : 'error');
      assert.equal(run.manager.dataWrites, scenario === 'missing-aa' ? 90 : 0);
      assert.equal(run.manager.controls.filter((packet) => packet[2] === 0xa9).length, 1);
      assert.equal(run.manager.controls.filter((packet) => packet[2] === 0xad).length, scenario === 'missing-aa' ? 1 : 0);
      assert.match(run.h.load('mxw01A9Evidence.js').formatA9Evidence(reports[0]), /paper may already exist/);
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('A9 projection excludes identities/native objects/sales/raster/URL values and observer owns no timers or commands', () => {
  const h = diagnosticHarness();
  const evidence = h.load('mxw01A9Evidence.js');
  const report = {
    ...evidence.createA9EvidenceReport(), phase: 'PRIVATE_SENTINEL', errorCode: 'PRIVATE_SENTINEL', mtu: 99999,
    receiveWindowMs: 99999, rawCallbacks: 99999,
    deviceID: mac, name: 'PRIVATE_SENTINEL', sale: 'PRIVATE_SENTINEL', raster: 'PRIVATE_SENTINEL', url: 'https://private.invalid',
    samples: Array(10).fill({ inputChars: 999999, decodedBytes: 999999, classification: 'PRIVATE_SENTINEL', hex: mac, nativeMessage: 'PRIVATE_SENTINEL' }),
  };
  const projected = evidence.projectA9Evidence(report);
  const text = evidence.formatA9Evidence(report);
  assert.equal(text.includes(mac) || text.includes('PRIVATE_SENTINEL') || text.includes('https://private.invalid'), false);
  assert.equal(projected.samples.length, 4);
  assert.ok(projected.samples.every((sample) => sample.decodedBytes === 72 && sample.hex === ''));
  assert.equal(projected.rawCallbacks, 255);
  assert.equal(projected.receiveWindowMs, 5000);
  const collector = evidence.createA9EvidenceCollector(512);
  collector.a1Passed(); collector.begin(100000); collector.observe('bad!'); collector.queued();
  assert.equal(h.clock.pendingTimers, 0);
  assert.equal(collector.finish().receiveWindowMs, 5000);
  assert.equal(collector.writeControl, undefined);
  assert.equal(collector.writeData, undefined);
  assert.equal(collector.resolve, undefined);
});

test('fixed Settings synthetic entry alone enables A9 capture; normal online/provided sale flags cannot opt in', async () => {
  for (const mode of ['online', 'provided', 'synthetic']) {
    const clock = controlledClock();
    const manager = nativeSessionManager(clock, { autoA1: true });
    const reports = [];
    let rendered;
    const h = harness({ clock, manager, stored: JSON.stringify(nativeProfile), native: true, ownership: 'standalone', saleResponse: { ...provided, cliente: 'PRIVATE_SENTINEL' } });
    h.rn.PermissionsAndroid.check = async () => true;
    h.overrides.set('rasterRenderer.js', { async renderMXW01Receipt(data) { rendered = data; return raster(); } });
    const facade = h.load('printSaleTicket.js');
    try {
      const callback = (report) => reports.push(report);
      const operation = mode === 'synthetic' ? facade.printSyntheticTicketWithA9Evidence({ onA9Evidence: callback, saleId: 'ignored', mode: 'online', provided: { cliente: 'PRIVATE_SENTINEL' } })
        : facade.printSaleTicket({ mode, saleId: 'sale-id', provided: { ...provided, cliente: 'PRIVATE_SENTINEL' }, onA9Evidence: callback });
      assert.equal((await clock.settle(operation)).status, 'printed');
      assert.equal(reports.length, mode === 'synthetic' ? 1 : 0);
      assert.equal(h.requests.length, mode === 'online' ? 1 : 0);
      assert.equal(rendered.cliente, mode === 'synthetic' ? 'SYNTHETIC TEST — NO CUSTOMER DATA' : 'PRIVATE_SENTINEL');
      if (mode === 'synthetic') assert.equal(JSON.stringify(reports[0]).includes('PRIVATE_SENTINEL') || JSON.stringify(reports[0]).includes(mac), false);
      assert.equal(manager.controls.filter((packet) => packet[2] === 0xa9).length, 1);
      assert.equal(clock.pendingTimers, 0);
      assert.equal(h.appListenerCount, 0);
    } finally { clock.dispose(); }
  }
});

test('synthetic dirty/busy/cancel guards produce only safe pre-A9 evidence and no queries', async () => {
  for (const scenario of ['dirty', 'busy', 'cancel']) {
    const h = harness({ stored: JSON.stringify(nativeProfile) });
    const token = h.load('printingOperation.js').createCancellation();
    const reports = [];
    const owned = scenario === 'busy' ? h.load('printJob.js').beginPrintJob() : null;
    if (scenario === 'cancel') token.cancel();
    try {
      const result = await h.load('printSaleTicket.js').printSyntheticTicketWithA9Evidence({ dirty: scenario === 'dirty', token, onA9Evidence: (report) => reports.push(report) });
      assert.equal(result.status, 'error');
      assert.equal(reports.length, 1);
      assert.equal(reports[0].a9Attempted, false);
      assert.equal(reports[0].rawCallbacks, 0);
      assert.equal(reports[0].phase, 'before-a9');
      assert.equal(h.bleLoads + h.requests.length + h.urls.length, 0);
    } finally { owned?.finish(); }
  }
});

test('Settings fixed test retains confirmation/double-tap/saved/unmount guards without evidence controls', () => {
  const source = fs.readFileSync(path.join(root, 'src/screens/Settings.js'), 'utf8');
  assert.ok(source.includes('¿Imprimir un ticket de prueba?'));
  assert.ok(source.includes('if (started) return;'));
  assert.ok(source.includes('syntheticToken.current = token;'));
  assert.ok(source.includes('dirty || cfg.printerTransport'));
  assert.ok(source.includes('syntheticToken.current?.cancel();'));
  assert.ok(source.includes('printSyntheticTicketWithA9Evidence({ dirty, token'));
  const handler = source.slice(source.indexOf('const printSyntheticTest ='), source.indexOf('const handleReset ='));
  assert.equal(handler.includes('console.') || handler.includes('saveTicketConfig(') || handler.includes('discoverMXW01Printers('), false);
});

// Execute the Settings component with isolated hooks/native controls and real
// queued storage operations. This is not a React Native/device rendering test.
async function settingsHarness(config, allowed = true) {
  const h = harness({ stored: JSON.stringify(config), native: true, ownership: 'standalone' });
  const slots = [], effects = [], prints = [];
  let cursor = 0;
  const react = {
    createElement(type, props, ...children) { return typeof type === 'function' ? type({ ...props, children }) : { type, props: props || {}, children }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect(effect) { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(effect); } },
    useCallback(fn) { cursor++; return fn; },
  };
  const module = { exports: {} };
  const filename = path.join(root, 'src/screens/Settings.js');
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] });
  new Function('require', 'module', 'exports', code)((name) => {
    if (name === 'react') return react;
     if (name === 'react-native') return { ...h.rn, StyleSheet: { create: (styles) => styles }, ...Object.fromEntries(['ActivityIndicator', 'Pressable', 'ScrollView', 'Switch', 'Text', 'TouchableOpacity', 'View'].map((type) => [type, type])) };
    if (name === 'react-native-vector-icons/MaterialCommunityIcons') return 'Icon';
    if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
    if (name === '../hooks/usePermissionCheck') return (permission) => { assert.equal(permission, 'read_user'); return { hasPermission: allowed, isLoading: false }; };
    if (name === '../utils/thermal/printSaleTicket') return { printSyntheticTicketWithA9Evidence: async (options) => { prints.push(options); return { status: 'printed' }; } };
    return h.load(path.basename(name) + '.js');
  }, module, module.exports);
  const render = () => { cursor = 0; return module.exports.default({ navigation }); };
  const navigation = { goBack() {}, addListener() { return () => {}; } };
  render(); effects.splice(0).forEach((effect) => effect());
  await new Promise((resolve) => setImmediate(resolve));
  function nodes(node) { return !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.children)]; }
  function text(node) { return !node ? '' : Array.isArray(node) ? node.map(text).join('') : typeof node === 'object' ? text(node.children) : String(node); }
  const controls = () => nodes(render()).filter((node) => node.type === 'TouchableOpacity' || node.type === 'Pressable');
  const button = (label) => { const node = controls().find((node) => node.props.accessibilityLabel === label || text(node) === label); assert.ok(node, label); return node; };
  const row = (label) => nodes(render()).find((node) => node.type === 'View' && text(node.children?.[0]).startsWith(label));
  const openPrinterSettings = () => button('Abrir configuración de impresora').props.onPress();
  return { h, prints, render, controls, button, text, row, nodes, openPrinterSettings, config: h.load('ticketConfig.js') };
}

test('Settings history opens with three of ten retained entries and expands without automatic selection', async () => {
  const history = Array.from({ length: 11 }, (_, index) => historyPrinter(index));
  const s = await settingsHarness({ printerTransport: 'mxw01', mxw01History: history });
  s.openPrinterSettings();
  const entries = () => s.controls().filter((node) => node.props.accessibilityLabel?.startsWith('Seleccionar MXW01'));
  assert.equal(entries().length, 3);
  assert.ok(s.text(s.render()).includes('Sin impresora seleccionada'));
  assert.equal((await s.config.loadTicketConfig()).mxw01DeviceId, null);
  s.button('Mostrar más').props.onPress();
  assert.equal(entries().length, 10);
  await s.button(`Seleccionar MXW01 ${history[4].id}`).props.onPress();
  assert.equal((await s.config.loadTicketConfig()).mxw01DeviceId, history[4].id);
});

test('Settings cancellation changes nothing; confirmed removal clears only current with no fallback', async () => {
  const other = historyPrinter(1);
  const s = await settingsHarness({ ...nativeProfile, mxw01History: [{ id: mac, name: 'MXW01' }, other] });
  s.openPrinterSettings();
  s.button(`Eliminar MXW01 ${mac}`).props.onPress();
  const cancelled = s.h.alerts.at(-1);
  assert.equal(cancelled[2][0].style, 'cancel');
  cancelled[2][0].onPress?.();
  assert.equal((await s.config.loadTicketConfig()).mxw01DeviceId, mac);
  await cancelled[2][1].onPress();
  assert.equal((await s.config.loadTicketConfig()).mxw01DeviceId, null);
  assert.deepEqual((await s.config.loadTicketConfig()).mxw01History, [other]);
  assert.ok(s.text(s.render()).includes('Sin impresora seleccionada'));
});

test('Settings immediate selection/removal preserves unsaved format and saving does not restore stale history', async () => {
  const other = historyPrinter(1);
  const s = await settingsHarness({ ...nativeProfile, mxw01History: [{ id: mac, name: 'MXW01' }, other] });
  s.openPrinterSettings();
  s.button('Abrir formato del ticket').props.onPress();
  // The existing title-width stepper starts at two.
  s.nodes(s.row('Ancho del título')).find((node) => node.children?.some((child) => child?.props?.name === 'plus')).props.onPress();
  s.button('Volver a impresora').props.onPress();
  await s.button(`Seleccionar MXW01 ${other.id}`).props.onPress();
  s.button(`Eliminar MXW01 ${mac}`).props.onPress();
  await s.h.alerts.at(-1)[2][1].onPress();
  s.button('Abrir formato del ticket').props.onPress();
  await s.button('Guardar cambios').props.onPress();
  const saved = await s.config.loadTicketConfig();
  assert.equal(saved.titleWidthMultiplier, 3);
  assert.equal(saved.mxw01DeviceId, other.id);
  assert.deepEqual(saved.mxw01History, [other]);
});

test('Settings removing another printer preserves current; saving formatting after current removal keeps selection empty', async () => {
  const other = historyPrinter(1);
  const s = await settingsHarness({ ...nativeProfile, mxw01History: [{ id: mac, name: 'MXW01' }, other] });
  s.openPrinterSettings();
  s.button('Abrir formato del ticket').props.onPress();
  s.nodes(s.row('Ancho del título')).find((node) => node.children?.some((child) => child?.props?.name === 'plus')).props.onPress();
  s.button('Volver a impresora').props.onPress();
  s.button(`Eliminar MXW01 ${other.id}`).props.onPress();
  await s.h.alerts.at(-1)[2][1].onPress();
  assert.equal((await s.config.loadTicketConfig()).mxw01DeviceId, mac);
  s.button(`Eliminar MXW01 ${mac}`).props.onPress();
  await s.h.alerts.at(-1)[2][1].onPress();
  s.button('Abrir formato del ticket').props.onPress();
  await s.button('Guardar cambios').props.onPress();
  const saved = await s.config.loadTicketConfig();
  assert.equal(saved.mxw01DeviceId, null);
  assert.deepEqual(saved.mxw01History, []);
  assert.equal(saved.titleWidthMultiplier, 3);
});

test('Settings pending selection prevents overlapping test/removal and a failed save preserves selection', async () => {
  const other = historyPrinter(1);
  const s = await settingsHarness({ ...nativeProfile, mxw01History: [{ id: mac, name: 'MXW01' }, other] });
  s.openPrinterSettings();
  let reject, calls = 0;
  s.config.selectMXW01Printer = () => { calls++; return new Promise((resolve, fail) => { reject = fail; }); };
  const select = s.button(`Seleccionar MXW01 ${other.id}`).props.onPress;
  const remove = s.button(`Eliminar MXW01 ${mac}`).props.onPress;
  const print = s.button('Imprimir prueba').props.onPress;
  const pending = select(); select(); remove(); print();
  assert.equal(calls, 1);
  assert.equal(s.h.alerts.length + s.prints.length, 0);
  reject(new Error('Storage unavailable')); await pending;
  assert.equal((await s.config.loadTicketConfig()).mxw01DeviceId, mac);
  assert.equal(s.h.alerts.at(-1)[0], 'Error');
  assert.equal(s.button(`Seleccionar MXW01 ${other.id}`).props.disabled, false);
});

test('Settings exposes exactly one confirmed fixed test without passing customer/sale data and denies forbidden access', async () => {
  const s = await settingsHarness(nativeProfile);
  s.openPrinterSettings();
  assert.equal(s.controls().filter((node) => s.text(node) === 'Imprimir prueba').length, 1);
  s.button('Imprimir prueba').props.onPress();
  assert.equal(s.prints.length, 0);
  const confirmation = s.h.alerts.at(-1);
  await confirmation[2][1].onPress(); await confirmation[2][1].onPress();
  assert.equal(s.prints.length, 1);
  assert.deepEqual(Object.keys(s.prints[0]).sort(), ['dirty', 'token']);
  assert.equal(s.h.requests.length, 0);
  assert.equal((await settingsHarness(nativeProfile, false)).render(), null);
});

test('raw AE02 subscription errors during A9 retain only the public code and never write image data', async () => {
  const reports = [];
  const run = await evidenceNativeRun({ a9Values: [], onA9(manager) { manager.emit(undefined, { errorCode: 403, message: 'PRIVATE_SENTINEL', deviceID: mac }); } }, (report) => reports.push(report));
  try {
    await assert.rejects(run.clock.settle(run.operation), { code: 'connection' });
    assert.equal(reports[0].errorCode, 'ble-403');
    assert.equal(reports[0].failureOrigin, 'monitor');
    assert.equal(reports[0].nativeErrorCode, 403);
    assert.equal(reports[0].rawCallbacks, 1);
    assert.equal(reports[0].samples[0].classification, 'subscription-error');
    assert.equal(reports[0].samples[0].decodedBytes, 0);
    assert.equal(reports[0].a9AckAccepted, false);
    assert.equal(run.manager.dataWrites, 0);
    assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9]);
    assert.equal(JSON.stringify(reports[0]).includes('PRIVATE_SENTINEL') || JSON.stringify(reports[0]).includes(mac), false);
    assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
});

// Literal physical A9 capture supplied by the user; AA below stays a SYNTHETIC
// strict test control. No physical completion/printing result is asserted.
const OBSERVED_A9_SHORT8 = new Uint8Array([0x22, 0x21, 0xa9, 0, 1, 0, 0, 0]);

test('physical zero A9 short8 is a CRC-consistent strict9 prefix, not a globally verified frame', () => {
  const protocol = harness().load('mxw01Protocol.js');
  assert.equal(protocol.parseNotification(OBSERVED_A9_SHORT8), null);
  const packet = protocol.parseObservedShortA9(OBSERVED_A9_SHORT8);
  assert.deepEqual([...packet.payload], [0]);
  assert.equal(packet.variant, 'observed-short8');
  assert.equal(packet.integrity, 'unverified');
  assert.equal(packet.provenance, 'user-a9-capture');
  assert.equal(protocol.crc8(OBSERVED_A9_SHORT8.slice(6, 7)), OBSERVED_A9_SHORT8[7]);
  assert.ok(protocol.parseNotification(new Uint8Array([...OBSERVED_A9_SHORT8, 0xff])), 'Do not apply the A1 CRC-prefix exclusion to every actual A9');
  for (const [index, value] of [[0, 0], [1, 0], [2, 0xa1], [2, 0xaa], [3, 3], [4, 2], [5, 1], [6, 1], [7, 1]]) {
    const bad = OBSERVED_A9_SHORT8.slice(); bad[index] = value;
    assert.equal(protocol.parseObservedShortA9(bad), null);
  }
  for (let n = 0; n < 8; n += 1) assert.equal(protocol.parseObservedShortA9(OBSERVED_A9_SHORT8.slice(0, n)), null);
  assert.equal(protocol.parseObservedShortA9(SYNTHETIC_A9_OK), null);
});

test('whole observed A9 stays unresolved until deadline; timely FF continuation wins as strict9', () => {
  const h = diagnosticHarness();
  const packets = [];
  const decoder = h.load('mxw01Protocol.js').createMXW01ReceiveDecoder((packet) => packets.push(packet));
  decoder.beginA9(40); decoder.push(OBSERVED_A9_SHORT8);
  assert.equal(packets.length, 0);
  assert.equal(decoder.resolveObservedA9(), null);
  h.clock.elapse(39);
  assert.equal(decoder.resolveObservedA9(), null);
  h.clock.elapse(1);
  const short = decoder.resolveObservedA9();
  assert.equal(short.variant, 'observed-short8');
  assert.deepEqual([...short.payload], [0]);
  assert.equal(decoder.resolveObservedA9(), null);
  decoder.push(SYNTHETIC_AA_OK);
  assert.equal(packets[0].command, 0xaa, 'Resolving only the isolated8 candidate must not eat AA');

  decoder.beginA9(h.clock.now + 40); decoder.push(OBSERVED_A9_SHORT8);
  h.clock.elapse(39); decoder.push(new Uint8Array([0xff]));
  assert.equal(packets[1].variant, 'strict-crc');
  assert.equal(packets[1].integrity, 'crc-verified');
  assert.deepEqual([...packets[1].payload], [0]);
  h.clock.elapse(1);
  assert.equal(decoder.resolveObservedA9(), null);
});

test('fragmented/coalesced/extra/nonzero/corrupt/multiple A9 callbacks cannot use short fallback or downgrade bad strict9', () => {
  const h = diagnosticHarness();
  const protocol = h.load('mxw01Protocol.js');
  const join = (...parts) => new Uint8Array(Buffer.concat(parts.map((part) => Buffer.from(part))));
  const badStrict = new Uint8Array([0x22, 0x21, 0xa9, 0, 1, 0, 0, 1, 0xff]);
  const rejectedShort = new Uint8Array([0x22, 0x21, 0xa9, 0, 1, 0, 1, 7]);
  for (const chunks of [
    [OBSERVED_A9_SHORT8.slice(0, 4), OBSERVED_A9_SHORT8.slice(4)],
    [join(OBSERVED_A9_SHORT8, SYNTHETIC_AA_OK)],
    [join(OBSERVED_A9_SHORT8, OBSERVED_A9_SHORT8)],
    [join(OBSERVED_A9_SHORT8, new Uint8Array([0]))],
    [OBSERVED_A9_SHORT8, new Uint8Array([0])],
    [OBSERVED_A9_SHORT8, OBSERVED_A9_SHORT8],
    [badStrict], [badStrict.slice(0, 8), badStrict.slice(8)], [rejectedShort],
  ]) {
    const packets = [];
    const decoder = protocol.createMXW01ReceiveDecoder((packet) => packets.push(packet));
    decoder.beginA9(h.clock.now + 40); chunks.forEach((chunk) => decoder.push(chunk));
    h.clock.elapse(40);
    assert.equal(decoder.resolveObservedA9(), null);
    assert.equal(packets.some((packet) => packet.command === 0xa9), false);
    if (chunks[0].length === 17) assert.equal(packets[0].command, 0xaa, 'Coalesced strict AA survives, but never acts as an ACK');
  }
  const decoder = protocol.createMXW01ReceiveDecoder(() => {});
  decoder.beginA9(h.clock.now + 40); decoder.push(OBSERVED_A9_SHORT8); decoder.invalidateA9Fallback();
  h.clock.elapse(40);
  assert.equal(decoder.resolveObservedA9(), null);
});

test('full production adapter/session admits physical A9 only at eligible resolution before data and still needs synthetic strict AA', async () => {
  const reports = [];
  const run = await evidenceNativeRun({ a9Values: [b64(OBSERVED_A9_SHORT8)] }, (report) => reports.push(report));
  try {
    await run.clock.flushMicrotasks(); run.clock.fireNextTimer(); await run.clock.flushMicrotasks();
    assert.equal(run.clock.now, 250);
    assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9]);
    assert.equal(run.manager.dataWrites, 0);
    run.clock.elapse(4999);
    await run.clock.flushMicrotasks();
    assert.equal(run.clock.now, 5249);
    assert.equal(run.manager.dataWrites, 0, 'No immediate ACK/quiet-delay guess');
    const result = await run.clock.settle(run.operation);
    assert.equal(result.status, 'printed', 'SYNTHETIC strict AA control, not physical completion proof');
    assert.equal(result.a9Variant, 'observed-short8');
    assert.equal(result.a9Integrity, 'unverified');
    assert.equal(result.paperPresence, 'unknown');
    assert.equal(run.manager.dataWrites, 90);
    const dataUuid = run.h.load('mxw01Protocol.js').MXW01_UUIDS.data;
    assert.equal(run.manager.trace.find((entry) => entry.characteristic === dataUuid).at, 5250);
    assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9, 0xad]);
    assert.equal(reports[0].a9Variant, 'observed-short8');
    assert.equal(reports[0].a9Integrity, 'unverified');
    assert.equal(reports[0].a9Provenance, 'user-a9-capture');
    assert.equal(reports[0].a9WriteQueued, true);
    assert.equal(reports[0].a9AckAccepted, true);
    assert.equal(reports[0].samples[0].classification, 'observed-a9-candidate');
    assert.equal(reports[0].samples[0].decodedBytes, 8);
    assert.equal(reports[0].completionValidated, true);
    assert.equal(reports[0].rawA9AckToFirstImageWriteMs, 5000, 'Measure actual raw reception, not deadline admission');
    assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
});

test('physical A1 plus actual A9 fixture shares the original sequence; later AA remains synthetic and strict', async () => {
  const run = await evidenceNativeRun({ a1Value: b64(OBSERVED_A1_WITH_PAPER), a9Values: [b64(OBSERVED_A9_SHORT8)] });
  try {
    const result = await run.clock.settle(run.operation);
    assert.equal(result.a1Variant, 'observed-short17');
    assert.equal(result.a9Variant, 'observed-short8');
    assert.equal(result.status, 'printed', 'Only a mocked strict completion was supplied');
    const dataUuid = run.h.load('mxw01Protocol.js').MXW01_UUIDS.data;
    assert.equal(run.manager.trace.find((entry) => entry.characteristic === dataUuid).at, 10250);
    assert.equal(run.manager.dataWrites, 90);
    assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9, 0xad]);
    assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
});

test('standard strict9 split ACK wins over an initial matching8 prefix without waiting for compatibility', async () => {
  const reports = [];
  const run = await evidenceNativeRun({ a9Values: [b64(OBSERVED_A9_SHORT8), b64(new Uint8Array([0xff]))] }, (report) => reports.push(report));
  try {
    const result = await run.clock.settle(run.operation);
    assert.equal(result.a9Variant, 'strict-crc');
    assert.equal(result.a9Integrity, 'crc-verified');
    assert.equal(reports[0].rawCallbacks, 2);
    assert.equal(reports[0].a9Provenance, 'strict-framing');
    const dataUuid = run.h.load('mxw01Protocol.js').MXW01_UUIDS.data;
    assert.equal(run.manager.trace.find((entry) => entry.characteristic === dataUuid).at, 250);
    assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
});

test('actual A9 before/equal/after the exclusive deadline cannot create late fallback or strict ACK admission', async () => {
  for (const value of [b64(OBSERVED_A9_SHORT8), b64(SYNTHETIC_A9_OK)]) {
    for (const arrival of [5249, 5250, 5251]) {
      const run = await evidenceNativeRun({ a9Values: [] });
      try {
        await run.clock.flushMicrotasks(); run.clock.fireNextTimer(); await run.clock.flushMicrotasks();
        run.clock.elapse(arrival - run.clock.now);
        assert.equal(run.clock.pendingTimers, 1, 'Overdue timer has not dispatched yet');
        run.manager.emit(value);
        if (arrival < 5250) {
          const result = await run.clock.settle(run.operation);
          assert.equal(result.status, 'printed', 'Only synthetic strict AA permits this mock success');
          assert.equal(run.manager.dataWrites, 90);
        } else {
          await assert.rejects(run.clock.settle(run.operation), { code: 'timeout' });
          assert.equal(run.manager.dataWrites, 0);
          assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9]);
        }
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  }
});

test('pre-query/stale A9, invalid filters/extra callbacks and failed/unqueued/hung writes never enable image transfer', async () => {
  const rejectedShort = new Uint8Array([0x22, 0x21, 0xa9, 0, 1, 0, 1, 7]);
  for (const options of [
    { a9Values: [b64(rejectedShort)] },
    { a9Values: [b64(OBSERVED_A9_SHORT8), 'bad!'] },
    { a9Values: [b64(OBSERVED_A9_SHORT8), b64(OBSERVED_A9_SHORT8)] },
    { a9Values: [b64(new Uint8Array([...OBSERVED_A9_SHORT8, 0]))] },
    { a9Values: [b64(OBSERVED_A9_SHORT8)], onA9() { return new Promise(() => {}); } },
    { a9Values: [b64(OBSERVED_A9_SHORT8)], onA9() { throw { errorCode: 401, message: 'PRIVATE_SENTINEL' }; } },
  ]) {
    const run = await evidenceNativeRun(options);
    try {
      await assert.rejects(run.clock.settle(run.operation));
      assert.equal(run.manager.dataWrites, 0);
      assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9]);
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
  const run = await evidenceNativeRun({ a9Values: [] });
  try {
    await run.clock.flushMicrotasks(); // Subscription exists, setup250ms has not run and no A9 waiter exists.
    run.manager.emit(b64(OBSERVED_A9_SHORT8));
    run.clock.fireNextTimer(); await run.clock.flushMicrotasks();
    await assert.rejects(run.clock.settle(run.operation), { code: 'timeout' });
    assert.equal(run.manager.dataWrites, 0);
    assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9]);
    assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
});

test('actual A9 admission preserves strict AA: missing/short/badCRC becomes unconfirmed, nonzero AA remains rejected', async () => {
  const aaBad = new Uint8Array([0x22, 0x21, 0xaa, 0, 1, 0, 0, 1, 0xff]);
  const aaNonzero = new Uint8Array([0x22, 0x21, 0xaa, 0, 1, 0, 1, 7, 0xff]);
  // Use the existing pure transport only to inject independent synthetic AA controls.
  for (const [complete, resultKind] of [[null, 'sent-unconfirmed'], [SYNTHETIC_AA_OK.slice(0, 8), 'sent-unconfirmed'], [aaBad, 'sent-unconfirmed'], [aaNonzero, 'completion']]) {
    const h = diagnosticHarness();
    const transport = observedPrintTransport(A1_READY_RX, { ack: OBSERVED_A9_SHORT8, noComplete: complete === null, complete });
    // This fixture's writeData assertion previously allowed strict ACK only. Record
    // the actual new zero-ACK gate while keeping all later AA controls strict.
    let writes = 0;
    transport.writeData = async () => { assert.equal(transport.controls.filter((packet) => packet[2] === 0xa9).length, 1); writes += 1; };
    const session = h.clock.settle(h.load('mxw01Session.js').runMXW01Session(transport, raster(), h.load('printingOperation.js').createCancellation(), fastLimits));
    if (resultKind === 'sent-unconfirmed') assert.equal((await session).status, resultKind);
    else await assert.rejects(session, { code: resultKind });
    assert.equal(writes, 90);
    assert.deepEqual(transport.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9, 0xad]);
    assert.equal(transport.removed, 1);
    assert.equal(h.clock.pendingTimers, 0);
  }
});

test('cancel/foreground during an eligible short8 window cannot turn timeout into ACK or duplicate a request', async () => {
  for (const event of ['cancel', 'foreground']) {
    const reports = [];
    const run = await evidenceNativeRun({ a9Values: [b64(OBSERVED_A9_SHORT8)] }, (report) => reports.push(report));
    try {
      await run.clock.flushMicrotasks(); run.clock.fireNextTimer(); await run.clock.flushMicrotasks();
      if (event === 'cancel') run.token.cancel(); else run.h.background();
      await assert.rejects(run.clock.settle(run.operation), { code: event === 'cancel' ? 'cancelled' : 'foreground' });
      assert.equal(run.manager.dataWrites, 0);
      assert.equal(reports[0].a9AckAccepted, false);
      assert.equal(reports[0].a9Variant, null);
      assert.equal(run.manager.controls.filter((packet) => packet[2] === 0xa9).length, 1);
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('transfer telemetry distinguishes first-write rejection from 144 queued bytes and preserves the original error/I/O', async () => {
  for (const failAt of [1, 4]) {
    const failure = { errorCode: 401, message: 'PRIVATE_SENTINEL', deviceID: mac };
    const options = { onData(manager, bytes, attempt) { if (attempt === failAt) throw failure; } };
    const reports = [];
    const off = await evidenceNativeRun(options);
    const on = await evidenceNativeRun(options, (report) => reports.push(report));
    try {
      for (const run of [off, on]) {
        await assert.rejects(run.clock.settle(run.operation), (error) => error === failure);
        assert.equal(run.manager.dataWrites, failAt);
        assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9]);
        assertNativeRunClean(run);
      }
      assert.deepEqual(on.manager.trace, off.manager.trace);
      assert.equal(reports.length, 1);
      const report = reports[0];
      assert.equal(report.imageTransferStarted, true, 'Legacy flag means pre-await start, not queue success');
      assert.equal(report.imageWriteAttempts, failAt);
      assert.equal(report.imageWritesResolved, failAt - 1);
      assert.equal(report.imageBytesQueued, (failAt - 1) * 48);
      assert.equal(report.rawA9AckToFirstImageWriteMs, 0);
      assert.equal(report.failureOrigin, 'image-write');
      assert.equal(report.nativeErrorCode, 401);
      assert.equal(report.errorCode, 'ble-401');
      assert.equal(report.printResult, 'error');
      assert.equal(report.completionValidated, false);
      assert.equal(JSON.stringify(report).includes(mac) || JSON.stringify(report).includes('PRIVATE_SENTINEL'), false);
    } finally { off.clock.dispose(); on.clock.dispose(); }
  }
});

test('transfer telemetry retains the first monitor/disconnect cause through generic connection and later write errors', async () => {
  for (const [origin, nativeCode, failAt] of [['monitor', 403, 1], ['monitor', 403, 4], ['disconnect', 205, 4], ['disconnect', 999999, 1], ['disconnect', null, 1]]) {
    const failure = { errorCode: nativeCode, message: 'PRIVATE_SENTINEL', deviceID: mac };
    const options = { onData(manager, bytes, attempt) {
      if (attempt !== failAt) return;
      if (origin === 'monitor') manager.emit(undefined, failure); else manager.disconnectEvent(failure);
      // First cancellation/error still wins, even with another native event and rejection in the same turn.
      if (origin === 'monitor') manager.disconnectEvent({ errorCode: 205 }); else manager.emit(undefined, { errorCode: 403 });
      throw { errorCode: 401, message: 'PRIVATE_SENTINEL' };
    } };
    const reports = [];
    const off = await evidenceNativeRun(options);
    const on = await evidenceNativeRun(options, (report) => reports.push(report));
    try {
      const errors = [];
      for (const run of [off, on]) {
        await assert.rejects(run.clock.settle(run.operation), (error) => { errors.push(error); return error.code === 'connection'; });
        assertNativeRunClean(run);
      }
      assert.equal(errors[0].message, errors[1].message);
      assert.deepEqual(on.manager.trace, off.manager.trace);
      const report = reports[0];
      assert.equal(report.errorCode, 'connection', 'Existing generic classification is unchanged');
      assert.equal(report.failureOrigin, origin);
      assert.equal(report.nativeErrorCode, nativeCode === 999999 ? null : nativeCode);
      assert.equal(report.imageWriteAttempts, failAt);
      assert.equal(report.imageWritesResolved, failAt - 1);
      assert.equal(report.imageBytesQueued, (failAt - 1) * 48);
      assert.equal(report.rawCallbacks, 1, 'Transfer errors do not expand the raw A9 capture window');
      assert.equal(JSON.stringify(report).includes(mac) || JSON.stringify(report).includes('PRIVATE_SENTINEL'), false);
    } finally { off.clock.dispose(); on.clock.dispose(); }
  }
});

test('transfer telemetry captures control-write rejection with zero image attempts and no fabricated ACK delta', async () => {
  const failure = { errorCode: 405, message: 'PRIVATE_SENTINEL', deviceID: mac };
  const reports = [];
  const run = await evidenceNativeRun({ a9Values: [b64(OBSERVED_A9_SHORT8)], onA9() { throw failure; } }, (report) => reports.push(report));
  try {
    await assert.rejects(run.clock.settle(run.operation), (error) => error === failure);
    const report = reports[0];
    assert.equal(report.failureOrigin, 'control-write');
    assert.equal(report.nativeErrorCode, 405);
    assert.equal(report.a9WriteQueued, false);
    assert.equal(report.a9AckAccepted, false);
    assert.equal(report.imageWriteAttempts + report.imageWritesResolved + report.imageBytesQueued, 0);
    assert.equal(report.rawA9AckToFirstImageWriteMs, null);
    assert.equal(run.manager.dataWrites, 0);
    assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
});

test('transfer telemetry counts all queued image bytes at returned MTU 23/512 but still requires strict AA', async () => {
  for (const [mtu, noComplete] of [[512, false], [23, false], [512, true]]) {
    const reports = [];
    const run = await evidenceNativeRun({ mtu, noComplete }, (report) => reports.push(report));
    try {
      if (noComplete) assert.equal((await run.clock.settle(run.operation)).status, 'sent-unconfirmed');
      else assert.equal((await run.clock.settle(run.operation)).status, 'printed', 'Mocked strict AA, not paper proof');
      const report = reports[0];
      const writes = mtu === 23 ? 216 : 90;
      assert.equal(report.imageWriteAttempts, writes);
      assert.equal(report.imageWritesResolved, writes);
      assert.equal(report.imageBytesQueued, 4320);
      assert.equal(report.rawA9AckToFirstImageWriteMs, 0);
      assert.equal(report.completionValidated, !noComplete);
      assert.equal(report.printResult, noComplete ? 'sent-unconfirmed' : 'printed');
      assert.equal(report.failureOrigin, null);
      assert.equal(report.nativeErrorCode, null);
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('transfer telemetry anchors strict/fragmented/sample-capped and short8 deltas to actual raw ACK reception', async () => {
  for (const shape of ['strict', 'split-strict', 'strict-after-sample-cap', 'observed-short8']) {
    let queued;
    const reports = [];
    const run = await evidenceNativeRun({ a9Values: [], onA9() { return new Promise((resolve) => { queued = resolve; }); } }, (report) => reports.push(report));
    try {
      await run.clock.flushMicrotasks(); run.clock.fireNextTimer(); await run.clock.flushMicrotasks();
      assert.equal(run.clock.now, 250);
      assert.equal(typeof queued, 'function');
      run.clock.elapse(37);
      if (shape === 'strict-after-sample-cap') for (let index = 0; index < 4; index += 1) run.manager.emit('bad!');
      if (shape === 'split-strict') {
        run.manager.emit(b64(OBSERVED_A9_SHORT8));
        run.clock.elapse(19);
        run.manager.emit(b64(new Uint8Array([0xff])));
      } else run.manager.emit(b64(shape === 'observed-short8' ? OBSERVED_A9_SHORT8 : SYNTHETIC_A9_OK));
      const rawAckAt = run.clock.now; // Synthetic test clock only; no production timestamp in the report.
      assert.equal(run.manager.dataWrites, 0);
      run.clock.elapse(13);
      queued();
      const result = await run.clock.settle(run.operation);
      assert.equal(result.a9Variant, shape === 'observed-short8' ? 'observed-short8' : 'strict-crc');
      const dataUuid = run.h.load('mxw01Protocol.js').MXW01_UUIDS.data;
      const firstAttemptAt = run.manager.trace.find((entry) => entry.characteristic === dataUuid).at;
      const delta = shape === 'observed-short8' ? 5250 - rawAckAt : 13;
      assert.equal(firstAttemptAt - rawAckAt, delta);
      assert.equal(reports[0].rawA9AckToFirstImageWriteMs, delta);
      if (shape === 'observed-short8') assert.equal(firstAttemptAt, 5250, 'Same existing deadline; no added wait or immediate short8 admission');
      if (shape === 'strict-after-sample-cap') {
        assert.equal(reports[0].rawCallbacks, 5);
        // Public retention now reserves the same four-sample TOTAL budget for closing; admission/count stay unchanged.
        assert.equal(reports[0].samples.length, 2);
        assert.deepEqual(reports[0].samples.map((sample) => sample.stage), ['a9-wait', 'completion']);
      }
      assert.equal(reports[0].rawAckAt, undefined);
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('transfer telemetry ignores late native resolutions/callbacks before and after cancellation/finalization', async () => {
  for (const event of ['cancel', 'foreground', 'timeout']) {
    for (const late of ['resolve', 'reject']) {
      let resolveWrite;
      let rejectWrite;
      const reports = [];
      const run = await evidenceNativeRun({ onData() { return new Promise((resolve, reject) => { resolveWrite = resolve; rejectWrite = reject; }); } }, (report) => reports.push(report));
      try {
        await run.clock.flushMicrotasks(); run.clock.fireNextTimer(); await run.clock.flushMicrotasks();
        assert.equal(run.manager.dataWrites, 1);
        const settleLate = () => late === 'resolve' ? resolveWrite() : rejectWrite({ errorCode: 401, message: 'PRIVATE_SENTINEL', deviceID: mac });
        if (event !== 'timeout') {
          if (event === 'cancel') run.token.cancel(); else run.h.background();
          run.manager.emit(undefined, { errorCode: 403 }); run.manager.disconnectEvent({ errorCode: 205 });
          settleLate(); // Must not change counters even before the cancelled session's catch/finally resumes.
        }
        const code = event === 'cancel' ? 'cancelled' : event;
        await assert.rejects(run.clock.settle(run.operation), { code });
        const report = reports[0];
        assert.equal(report.failureOrigin, code);
        assert.equal(report.nativeErrorCode, null);
        assert.equal(report.imageWriteAttempts, 1);
        assert.equal(report.imageWritesResolved, 0);
        assert.equal(report.imageBytesQueued, 0);
        const snapshot = JSON.stringify(report);
        if (event === 'timeout') settleLate();
        run.manager.emit(b64(SYNTHETIC_A9_OK)); run.manager.emit(undefined, { errorCode: 403 }); run.manager.disconnectEvent({ errorCode: 205 });
        await run.clock.flushMicrotasks();
        assert.equal(reports.length, 1);
        assert.equal(JSON.stringify(report), snapshot);
        assert.equal(run.manager.dataWrites, 1, 'No extra attempts or retry after disposal');
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  }
});

test('transfer telemetry remains trace/error/cleanup-identical with throwing or rejecting consumers', async () => {
  for (const event of ['write-error', 'cancel', 'foreground']) {
    const failure = { errorCode: 401, message: 'PRIVATE_SENTINEL' };
    const options = { onData() { if (event === 'write-error') throw failure; return new Promise(() => {}); } };
    let baseline;
    for (const observer of [undefined, () => { throw new Error('PRIVATE_SENTINEL'); }, async () => { throw new Error('PRIVATE_SENTINEL'); }]) {
      const run = await evidenceNativeRun(options, observer);
      try {
        if (event !== 'write-error') {
          await run.clock.flushMicrotasks(); run.clock.fireNextTimer(); await run.clock.flushMicrotasks();
          if (event === 'cancel') run.token.cancel(); else run.h.background();
        }
        let caught;
        await assert.rejects(run.clock.settle(run.operation), (error) => { caught = error; return event === 'write-error' ? error === failure : error.code === (event === 'cancel' ? 'cancelled' : event); });
        await run.clock.flushMicrotasks();
        const actual = { trace: run.manager.trace, code: caught.code, errorCode: caught.errorCode, message: caught.message, now: run.clock.now };
        if (!baseline) baseline = actual; else assert.deepEqual(actual, baseline);
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  }
});

test('transfer telemetry adapter sidecars preserve native Promise identity and consume observer errors', async () => {
  for (const observer of [undefined, () => { throw new Error('PRIVATE_SENTINEL'); }, async () => { throw new Error('PRIVATE_SENTINEL'); }]) {
    const clock = controlledClock();
    const manager = nativeSessionManager(clock);
    const promises = new Map();
    const failure = { errorCode: 401, message: 'PRIVATE_SENTINEL' };
    manager.writeCharacteristicWithoutResponseForDevice = (id, service, characteristic) => {
      const promise = Promise.reject(failure);
      promises.set(characteristic, promise);
      return promise;
    };
    const h = harness({ clock, manager, stored: JSON.stringify(nativeProfile), native: true, ownership: 'standalone' });
    h.rn.PermissionsAndroid.check = async () => true;
    const uuids = h.load('mxw01Protocol.js').MXW01_UUIDS;
    // Isolate the actual native adapter's Promise contract; no print admission/success is inferred.
    h.overrides.set('mxw01Session.js', { async runMXW01Session(transport) {
      const remove = transport.monitor(() => {}, () => {}, () => {}, undefined, observer);
      try {
        for (const [characteristic, write] of [[uuids.control, transport.writeControl], [uuids.data, transport.writeData]]) {
          const returned = write(new Uint8Array([0]));
          assert.equal(returned, promises.get(characteristic));
          await assert.rejects(returned, (error) => error === failure);
        }
      } finally { remove(); }
      return { status: 'contract-checked' };
    } });
    try {
      const operation = h.load('mxw01Ble.js').printMXW01Raster(nativeProfile, raster(), h.load('printingOperation.js').createCancellation());
      assert.equal((await clock.settle(operation)).status, 'contract-checked');
      await clock.flushMicrotasks();
      assertNativeRunClean({ h, clock, manager, stored: JSON.stringify(nativeProfile) });
    } finally { clock.dispose(); }
  }
});

test('transfer telemetry projection caps finite counters/delta, closes origins/codes and retains no private objects/timestamps', () => {
  const h = diagnosticHarness();
  const evidence = h.load('mxw01A9Evidence.js');
  assert.deepEqual(evidence.TRANSFER_TELEMETRY_LIMITS, { writes: 65535, bytes: 147456, elapsedMs: 120000 });
  const unsafe = {
    ...evidence.createA9EvidenceReport(), failureOrigin: 'PRIVATE_SENTINEL', nativeErrorCode: 999999,
    imageWriteAttempts: 1e20, imageWritesResolved: 1e20, imageBytesQueued: 1e20, rawA9AckToFirstImageWriteMs: 1e20,
    rawAckAt: 12345678, timestamp: 12345678, nativeError: { deviceID: mac, message: 'PRIVATE_SENTINEL' },
  };
  const safe = evidence.projectA9Evidence(unsafe);
  assert.equal(safe.failureOrigin, null); assert.equal(safe.nativeErrorCode, null);
  assert.equal(safe.imageWriteAttempts, 65535); assert.equal(safe.imageWritesResolved, 65535);
  assert.equal(safe.imageBytesQueued, 147456); assert.equal(safe.rawA9AckToFirstImageWriteMs, 120000);
  assert.equal(safe.rawAckAt, undefined); assert.equal(safe.timestamp, undefined); assert.equal(safe.nativeError, undefined);
  for (const value of [undefined, null, -1, 0.5, NaN, Infinity, '403', { private: 'PRIVATE_SENTINEL' }]) {
    const projected = evidence.projectA9Evidence({ imageWriteAttempts: value, imageWritesResolved: value, imageBytesQueued: value, rawA9AckToFirstImageWriteMs: value, nativeErrorCode: value });
    assert.equal(projected.imageWriteAttempts + projected.imageWritesResolved + projected.imageBytesQueued, 0);
    assert.equal(projected.rawA9AckToFirstImageWriteMs, null); assert.equal(projected.nativeErrorCode, null);
  }
  for (const origin of ['preflight', 'monitor', 'disconnect', 'image-write', 'control-write', 'timeout', 'cancelled', 'foreground', 'validation', 'session']) {
    assert.equal(evidence.projectA9Evidence({ failureOrigin: origin, nativeErrorCode: 0 }).failureOrigin, origin);
    assert.equal(evidence.projectA9Evidence({ failureOrigin: origin, nativeErrorCode: 0 }).nativeErrorCode, 0);
  }
  assert.equal(evidence.failedA9Evidence({ errorCode: 200, message: 'PRIVATE_SENTINEL' }).failureOrigin, 'preflight');
  assert.equal(evidence.failedA9Evidence({ errorCode: 200 }).nativeErrorCode, 200);
  const collector = evidence.createA9EvidenceCollector(512);
  collector.cause('monitor', { errorCode: 403, message: 'PRIVATE_SENTINEL', deviceID: mac });
  const report = collector.finish();
  const snapshot = JSON.stringify(report);
  collector.cause('disconnect', { errorCode: 205 }); collector.imageAttempted(); collector.imageResolved(48); collector.observe('bad!');
  assert.deepEqual(collector.finish(), report);
  assert.equal(JSON.stringify(report), snapshot);
  assert.equal(report.failureOrigin, 'monitor'); assert.equal(report.nativeErrorCode, 403);
  assert.equal(h.clock.pendingTimers, 0, 'The collector creates no timers');
  const text = evidence.formatA9Evidence(unsafe);
  assert.equal(text.includes('PRIVATE_SENTINEL') || text.includes(mac) || text.includes('12345678'), false);
  assert.match(text, /software queueing ONLY/);
});

test('transfer telemetry preserves synchronous native control/data errors and accurately records attempted-only writes', async () => {
  for (const origin of ['control-write', 'image-write']) {
    const failure = { errorCode: 401, message: 'PRIVATE_SENTINEL', deviceID: mac };
    const reports = [];
    let baseline;
    for (const observer of [undefined, (report) => reports.push(report)]) {
      const run = await evidenceNativeRun({}, observer);
      const nativeWrite = run.manager.writeCharacteristicWithoutResponseForDevice.bind(run.manager);
      const calls = [];
      const uuids = run.h.load('mxw01Protocol.js').MXW01_UUIDS;
      run.manager.writeCharacteristicWithoutResponseForDevice = (...args) => {
        const [, , characteristic, value] = args;
        calls.push({ characteristic, value, at: run.clock.now });
        if ((origin === 'image-write' && characteristic === uuids.data) ||
            (origin === 'control-write' && characteristic === uuids.control && Buffer.from(value, 'base64')[2] === 0xa9)) throw failure;
        return nativeWrite(...args);
      };
      try {
        await assert.rejects(run.clock.settle(run.operation), (error) => error === failure);
        if (!baseline) baseline = calls; else assert.deepEqual(calls, baseline);
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
    assert.equal(reports.length, 1);
    assert.equal(reports[0].failureOrigin, origin); assert.equal(reports[0].nativeErrorCode, 401);
    assert.equal(reports[0].imageWriteAttempts, origin === 'image-write' ? 1 : 0);
    assert.equal(reports[0].imageWritesResolved + reports[0].imageBytesQueued, 0);
    assert.equal(reports[0].rawA9AckToFirstImageWriteMs, origin === 'image-write' ? 0 : null);
  }
});

test('transfer telemetry retains monitor-registration failure without changing its error or cleanup', async () => {
  const failure = { errorCode: 403, message: 'PRIVATE_SENTINEL', deviceID: mac };
  const reports = [];
  const run = await evidenceNativeRun({}, (report) => reports.push(report));
  run.manager.monitorCharacteristicForDevice = () => { throw failure; };
  try {
    await assert.rejects(run.clock.settle(run.operation), (error) => error === failure);
    assert.equal(reports[0].failureOrigin, 'monitor'); assert.equal(reports[0].nativeErrorCode, 403);
    assert.equal(reports[0].a9Attempted, false);
    assert.equal(reports[0].imageWriteAttempts + reports[0].imageWritesResolved + reports[0].imageBytesQueued, 0);
    assert.equal(reports[0].rawA9AckToFirstImageWriteMs, null);
    assert.deepEqual(run.manager.controls, []);
    assert.deepEqual(run.manager.cleanup, { monitor: 0, disconnectedListener: 1, disconnect: 1, destroyed: 1 });
    assert.equal(run.clock.pendingTimers, 0); assert.equal(run.h.appListenerCount, 0);
    assert.equal(JSON.stringify(reports[0]).includes(mac) || JSON.stringify(reports[0]).includes('PRIVATE_SENTINEL'), false);
  } finally { run.clock.dispose(); }
});

test('transfer telemetry authored files have clean whitespace even when they are untracked', () => {
  for (const file of ['src/utils/thermal/mxw01A9Evidence.js', 'src/utils/thermal/mxw01Session.js', 'src/utils/thermal/mxw01Ble.js', 'src/utils/thermal/printingOperation.js', 'src/utils/thermal/printSaleTicket.js', 'tests/thermal-printing.test.cjs', 'docs/printing-mxw01.md']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.equal(/[\t ]+\r?$/m.test(source), false, `${file}: no trailing whitespace`);
    assert.ok(source.endsWith('\n') && !source.endsWith('\n\n'), `${file}: exactly one final newline`);
  }
});

async function pendingImageCauseRun(ackMode, observer) {
  const options = { onData() { return new Promise(() => {}); } };
  if (ackMode === 'observed17/8') {
    options.a1Value = b64(OBSERVED_A1_WITH_PAPER);
    options.a9Values = [b64(OBSERVED_A9_SHORT8)];
  }
  const run = await evidenceNativeRun(options, observer);
  for (let turn = 0; turn < 4; turn += 1) {
    await run.clock.flushMicrotasks();
    if (run.manager.dataWrites) break;
    run.clock.fireNextTimer(); // Setup, then only the existing A1/A9 compatibility deadlines if needed.
  }
  assert.equal(run.manager.dataWrites, 1);
  assert.equal(run.clock.now, ackMode === 'observed17/8' ? 10250 : 250);
  assert.equal(run.clock.pendingTimers, 1, 'The sole remaining timer is the pending first image-write bound');
  return run;
}

function emitCauseEvent(run, origin) {
  const error = { errorCode: origin === 'monitor' ? 403 : 205, message: 'PRIVATE_SENTINEL', deviceID: mac };
  if (origin === 'monitor') run.manager.emit(undefined, error);
  else run.manager.disconnectEvent(error);
}

test('terminal-first image timeout beats a later monitor/disconnect callback before catch for strict and observed17/8 ACKs', async (t) => {
  const observed = [];
  const expected = [];
  for (const ackMode of ['strict', 'observed17/8']) {
    for (const origin of ['monitor', 'disconnect']) {
      const reports = [];
      const off = await pendingImageCauseRun(ackMode);
      const on = await pendingImageCauseRun(ackMode, (report) => reports.push(report));
      try {
        const outcomes = [];
        for (const run of [off, on]) {
          const before = run.clock.now;
          assert.equal(run.token.error, null);
          run.clock.fireNextTimer(); // FIRST: bounded image timeout dispatch rejects its Promise.
          assert.equal(run.clock.now, before + 5000);
          assert.equal(run.token.error, null);
          assert.equal(run.clock.pendingTimers, 0);
          assert.equal(reports.length, 0, 'The async catch/publication has not resumed');
          emitCauseEvent(run, origin); // SECOND: same stack, deliberately no await/checkpoint before this event.
          await assert.rejects(run.clock.settle(run.operation), (error) => {
            outcomes.push({ name: error.name, code: error.code, message: error.message });
            return error.code === 'timeout';
          });
          assertNativeRunClean(run);
        }
        assert.deepEqual(outcomes[0], outcomes[1]);
        assert.deepEqual(on.manager.trace, off.manager.trace);
        assert.equal(reports.length, 1);
        const report = reports[0];
        assert.equal(report.errorCode, 'timeout');
        assert.equal(report.imageWriteAttempts, 1); assert.equal(report.imageWritesResolved, 0); assert.equal(report.imageBytesQueued, 0);
        assert.equal(report.rawA9AckToFirstImageWriteMs, ackMode === 'observed17/8' ? 5000 : 0);
        assert.equal(JSON.stringify(report).includes(mac) || JSON.stringify(report).includes('PRIVATE_SENTINEL'), false);
        observed.push({ ackMode, callback: origin, failureOrigin: report.failureOrigin, nativeErrorCode: report.nativeErrorCode });
        expected.push({ ackMode, callback: origin, failureOrigin: 'timeout', nativeErrorCode: null });
      } finally { off.clock.dispose(); on.clock.dispose(); }
    }
  }
  t.diagnostic(JSON.stringify(observed)); // Only test-case labels and projected public primitives.
  assert.deepEqual(observed, expected);
});

test('terminal-first inverse native ordering retains monitor/disconnect attribution and cancels the pending image timer', async () => {
  for (const ackMode of ['strict', 'observed17/8']) {
    for (const origin of ['monitor', 'disconnect']) {
      const reports = [];
      const off = await pendingImageCauseRun(ackMode);
      const on = await pendingImageCauseRun(ackMode, (report) => reports.push(report));
      try {
        const outcomes = [];
        for (const run of [off, on]) {
          run.clock.elapse(5000); // Timer is overdue but has NOT dispatched; native callback is FIRST.
          assert.equal(run.clock.pendingTimers, 1);
          emitCauseEvent(run, origin);
          assert.equal(run.clock.pendingTimers, 0, 'Existing cancellation removes the timer, rather than changing the deadline');
          await assert.rejects(run.clock.settle(run.operation), (error) => {
            outcomes.push({ name: error.name, code: error.code, message: error.message });
            return error.code === 'connection';
          });
          assertNativeRunClean(run);
        }
        assert.deepEqual(outcomes[0], outcomes[1]); assert.deepEqual(on.manager.trace, off.manager.trace);
        const report = reports[0];
        assert.equal(report.failureOrigin, origin); assert.equal(report.nativeErrorCode, origin === 'monitor' ? 403 : 205);
        assert.equal(report.imageWriteAttempts, 1); assert.equal(report.imageWritesResolved, 0); assert.equal(report.imageBytesQueued, 0);
        const snapshot = JSON.stringify(report);
        emitCauseEvent(on, origin === 'monitor' ? 'disconnect' : 'monitor');
        await on.clock.flushMicrotasks();
        assert.equal(reports.length, 1); assert.equal(JSON.stringify(report), snapshot);
      } finally { off.clock.dispose(); on.clock.dispose(); }
    }
  }
});

test('terminal-first settlement observer preserves original rejection identity, isolation and one-shot timing', async () => {
  for (const failureMode of ['timeout', 'native-reject', 'cancel']) {
    for (const observerMode of ['off', 'sync-throw', 'async-reject']) {
      const h = diagnosticHarness();
      const { bounded, createCancellation, PrintingError } = h.load('printingOperation.js');
      const token = createCancellation();
      let rejectNative;
      const native = new Promise((resolve, reject) => { rejectNative = reject; });
      const seen = [];
      const sources = [];
      const observer = observerMode === 'off' ? undefined : (error, source) => {
        seen.push(error); sources.push(source);
        if (observerMode === 'sync-throw') throw new Error('PRIVATE_SENTINEL');
        return Promise.reject(new Error('PRIVATE_SENTINEL'));
      };
      const original = failureMode === 'cancel' ? new PrintingError('cancelled', 'Synthetic cancellation') : { errorCode: 401 };
      const pending = bounded(native, 5000, token, 'Synthetic settlement', observer);
      let resumed = false;
      pending.catch(() => { resumed = true; });
      try {
        if (failureMode === 'timeout') {
          h.clock.fireNextTimer();
          assert.equal(resumed, false, 'Observer runs during dispatch, before the await/catch checkpoint');
          assert.equal(seen.length, observerMode === 'off' ? 0 : 1);
        } else if (failureMode === 'cancel') token.cancel(original);
        else rejectNative(original);
        await assert.rejects(h.clock.settle(pending), (error) => {
          if (observerMode !== 'off') assert.equal(error, seen[0], 'Observer gets the SAME error, not a parallel rejection');
          return failureMode === 'timeout' ? error.code === 'timeout' : error === original;
        });
        assert.equal(seen.length, observerMode === 'off' ? 0 : 1);
        if (observerMode !== 'off') assert.equal(sources[0], failureMode === 'timeout' ? 'deadline' : failureMode === 'cancel' ? 'cancellation' : 'promise');
        assert.equal(h.clock.now, failureMode === 'timeout' ? 5000 : 0);
        rejectNative({ errorCode: 403 }); token.cancel();
        await h.clock.flushMicrotasks();
        assert.equal(seen.length, observerMode === 'off' ? 0 : 1, 'Late signals never invoke the settlement observer again');
        assert.equal(h.clock.pendingTimers, 0);
      } finally { h.clock.dispose(); }
    }
  }
  const h = diagnosticHarness();
  let observed = false;
  const result = await h.clock.settle(h.load('printingOperation.js').bounded(Promise.resolve(7), 5000, null, 'Success', () => { observed = true; }));
  assert.equal(result, 7); assert.equal(observed, false); assert.equal(h.clock.now, 0); assert.equal(h.clock.pendingTimers, 0);
});

test('terminal-first observation excludes successful short17/short8 expiry and still requires strict AA', async () => {
  for (const ackMode of ['strict', 'observed17/8']) {
    for (const noComplete of [false, true]) {
      const options = { noComplete };
      if (ackMode === 'observed17/8') { options.a1Value = b64(OBSERVED_A1_WITH_PAPER); options.a9Values = [b64(OBSERVED_A9_SHORT8)]; }
      const reports = [];
      const off = await evidenceNativeRun(options);
      const on = await evidenceNativeRun(options, (report) => reports.push(report));
      try {
        for (const run of [off, on]) {
          if (noComplete) assert.equal((await run.clock.settle(run.operation)).status, 'sent-unconfirmed');
          else assert.equal((await run.clock.settle(run.operation)).status, 'printed', 'Synthetic strict AA only; no physical proof');
          assertNativeRunClean(run);
        }
        assert.deepEqual(on.manager.trace, off.manager.trace);
        const report = reports[0];
        assert.equal(report.failureOrigin, null);
        assert.equal(report.nativeErrorCode, null);
        assert.equal(report.imageWriteAttempts, 90); assert.equal(report.imageWritesResolved, 90); assert.equal(report.imageBytesQueued, 4320);
        assert.equal(report.rawA9AckToFirstImageWriteMs, ackMode === 'observed17/8' ? 5000 : 0);
        assert.equal(report.completionValidated, !noComplete);
        if (ackMode === 'observed17/8') assert.equal(report.a9Variant, 'observed-short8');
      } finally { off.clock.dispose(); on.clock.dispose(); }
    }
  }
});

test('terminal-first timeout race remains outcome/trace-identical with throwing and rejecting evidence consumers', async () => {
  for (const ackMode of ['strict', 'observed17/8']) {
    for (const origin of ['monitor', 'disconnect']) {
      let baseline;
      for (const observer of [undefined, () => { throw new Error('PRIVATE_SENTINEL'); }, async () => { throw new Error('PRIVATE_SENTINEL'); }]) {
        const run = await pendingImageCauseRun(ackMode, observer);
        try {
          run.clock.fireNextTimer(); emitCauseEvent(run, origin); // Exact timeout -> callback -> catch race, no added await.
          let caught;
          await assert.rejects(run.clock.settle(run.operation), (error) => { caught = error; return error.code === 'timeout'; });
          await run.clock.flushMicrotasks();
          const actual = { trace: run.manager.trace, name: caught.name, code: caught.code, message: caught.message, at: run.clock.now, attempts: run.manager.dataWrites };
          if (!baseline) baseline = actual; else assert.deepEqual(actual, baseline);
          assertNativeRunClean(run);
        } finally { run.clock.dispose(); }
      }
    }
  }
});

async function syntheticTimingRun(options = {}, observer, route = 'synthetic', injected = {}) {
  const clock = controlledClock();
  const manager = nativeSessionManager(clock, { autoA1: true, ...options });
  const stored = JSON.stringify({ ...nativeProfile, ...injected });
  const h = harness({ clock, manager, stored, native: true, ownership: 'standalone', saleResponse: provided });
  h.rn.PermissionsAndroid.check = async () => true;
  let rendered;
  h.overrides.set('rasterRenderer.js', { async renderMXW01Receipt(data) { rendered = data; return raster(); } });
  const actualSession = h.load('mxw01Session.js').runMXW01Session;
  const sessionLimits = [];
  h.overrides.set('mxw01Session.js', { runMXW01Session(...args) {
    sessionLimits.push(args[3]);
    return actualSession(...args); // Inspect plumbing while executing the actual production session, not a replacement.
  } });
  const token = h.load('printingOperation.js').createCancellation();
  const facade = h.load('printSaleTicket.js');
  const operation = route === 'direct'
    ? h.load('mxw01Ble.js').printMXW01Raster({ ...nativeProfile, ...injected }, raster(), token, observer)
    : route === 'synthetic'
      ? facade.printSyntheticTicketWithA9Evidence({ ...injected, token, onA9Evidence: observer })
      : facade.printSaleTicket({ ...injected, mode: route, saleId: 'sale-id', provided, onA9Evidence: observer });
  return { clock, manager, stored, h, token, operation, sessionLimits, get rendered() { return rendered; } };
}

async function reachTimingA9(run) {
  for (let turn = 0; turn < 4; turn += 1) {
    await run.clock.flushMicrotasks();
    if (run.manager.controls.some((packet) => packet[2] === 0xa9)) return;
    run.clock.fireNextTimer();
  }
  assert.fail('Existing setup/A1 policy must reach the sole A9 query within a bounded number of turns');
}

test('synthetic A9 500ms facade selects only the private trial with no/throwing/rejecting observer; normal/direct remain 5000', async () => {
  const injected = { a9ReceiveMs: 1, responseMs: 1, limits: { a9ReceiveMs: 500 }, synthetic: { a9ReceiveMs: 500 } };
  let wireBaseline;
  let syntheticTrace;
  for (const route of ['direct', 'provided', 'online', 'synthetic']) {
    for (const observerMode of ['none', 'collect', 'sync-throw', 'async-reject']) {
      const reports = [];
      const observer = observerMode === 'none' ? undefined : (report) => {
        reports.push(report);
        if (observerMode === 'sync-throw') throw new Error('PRIVATE_SENTINEL');
        if (observerMode === 'async-reject') return Promise.reject(new Error('PRIVATE_SENTINEL'));
      };
      const run = await syntheticTimingRun({ a9Values: [b64(OBSERVED_A9_SHORT8)] }, observer, route, injected);
      try {
        const result = await run.clock.settle(run.operation);
        await run.clock.flushMicrotasks();
        assert.equal(result.status, 'printed', 'Synthetic strict AA control only');
        const trial = route === 'synthetic';
        assert.deepEqual(run.sessionLimits, [trial ? { a9ReceiveMs: 500 } : undefined]);
        const dataUuid = run.h.load('mxw01Protocol.js').MXW01_UUIDS.data;
        const data = run.manager.trace.filter((entry) => entry.characteristic === dataUuid);
        assert.equal(data[0].at, trial ? 750 : 5250);
        assert.equal(data.length, 90);
        assert.ok(data.every((entry, index) => Buffer.from(entry.value, 'base64').length === 48 && entry.at === data[0].at + index * 25));
        const normalized = run.manager.trace.map((entry, index) => ({ ...entry, at: index < 3 ? entry.at : entry.at - data[0].at }));
        if (!wireBaseline) wireBaseline = normalized; else assert.deepEqual(normalized, wireBaseline, 'Only the A9 window shifts image/AD timing; bytes, chunking and pacing are identical');
        if (trial) {
          if (!syntheticTrace) syntheticTrace = run.manager.trace; else assert.deepEqual(run.manager.trace, syntheticTrace);
          assert.equal(run.rendered.cliente, 'SYNTHETIC TEST — NO CUSTOMER DATA'); assert.equal(run.rendered.total, 1291.2);
        }
        const captured = ['synthetic', 'direct'].includes(route) && observerMode !== 'none';
        assert.equal(reports.length, captured ? 1 : 0, 'Normal sale flags cannot opt into capture or the trial');
        if (captured) {
          assert.equal(reports[0].receiveWindowMs, trial ? 500 : 5000);
          assert.equal(reports[0].rawA9AckToFirstImageWriteMs, trial ? 500 : 5000);
          assert.equal(reports[0].failureOrigin, null); assert.equal(reports[0].nativeErrorCode, null);
          assert.equal(JSON.stringify(reports[0]).includes(mac) || JSON.stringify(reports[0]).includes('PRIVATE_SENTINEL'), false);
        }
        assertNativeRunClean(run, route === 'online' ? 1 : 0);
      } finally { run.clock.dispose(); }
    }
  }
});

test('sent-unconfirmed terminates at the existing AA timeout, returns a distinct status and shows one informational sale-facade alert', async () => {
  for (const [route, observerMode] of [['synthetic', 'collect'], ['synthetic', 'none'], ['online', 'collect'], ['provided', 'collect']]) {
    const reports = [];
    const run = await syntheticTimingRun({ noComplete: true }, observerMode === 'collect' ? (report) => reports.push(report) : undefined, route);
    try {
      const result = await run.clock.settle(run.operation);
      assert.equal(result.status, 'sent-unconfirmed'); assert.equal(result.reason, undefined);
      assert.equal(result.completionSignal, undefined, 'Timeout-only completion has no observed-signal discriminator');
      const dataUuid = run.h.load('mxw01Protocol.js').MXW01_UUIDS.data;
      const lastDataAt = run.manager.trace.filter((entry) => entry.characteristic === dataUuid).at(-1).at;
      assert.equal(run.clock.now, lastDataAt + 50025, 'No new wait: existing50.025s AA deadline from last-data enrollment');
      assert.equal(run.manager.controls.filter((packet) => packet[2] === 0xa9).length, 1);
      assert.equal(run.manager.controls.filter((packet) => packet[2] === 0xad).length, 1);
      assert.equal(run.manager.dataWrites, 90);
      assert.deepEqual(run.h.alerts, [['Impresión no confirmada', 'Datos enviados; impresión no confirmada. Revise el papel antes de reintentar.']]);
      assert.equal(run.h.alerts.some(([title]) => title === 'Printing unavailable'), false);
      assert.equal(reports.length, observerMode === 'collect' && route === 'synthetic' ? 1 : 0);
      if (reports.length) {
        const report = reports[0];
        assert.equal(report.printResult, 'sent-unconfirmed'); assert.equal(report.completionValidated, false);
        assert.equal(report.imageWritesResolved, 90); assert.equal(report.imageBytesQueued, 4320);
        assert.equal(report.adWriteAttempted, true); assert.equal(report.adWriteQueued, true);
        assert.equal(report.closingFailureScope, 'aa-wait');
        assert.equal(report.errorCode, null); assert.equal(report.failureOrigin, null); assert.equal(report.nativeErrorCode, null);
        assert.equal(JSON.stringify(report).includes(mac), false);
      }
      if (route === 'online') assert.deepEqual(run.h.requests, ['/sale/sale-id']);
      else assert.equal(run.h.requests.length, 0);
      assertNativeRunClean(run, route === 'online' ? 1 : 0);
    } finally { run.clock.dispose(); }
  }
});

test('both observed malformed AA signals close the active completion wait only after resolved AD, without validating completion', async () => {
  const protocol = harness().load('mxw01Protocol.js');
  for (const signal of OBSERVED_UNVERIFIED_AA_SIGNALS) {
    let resolveAD;
    const reports = [];
    const run = await syntheticTimingRun({ noComplete: true, onControl(manager, bytes) {
      if (bytes[2] !== 0xad) return;
      manager.emit(b64(signal));
      return new Promise((resolve) => { resolveAD = resolve; });
    } }, (report) => reports.push(report), 'synthetic');
    try {
      for (let turn = 0; turn < 100 && !run.manager.controls.some((packet) => packet[2] === 0xad); turn += 1) {
        await run.clock.flushMicrotasks();
        if (!run.manager.controls.some((packet) => packet[2] === 0xad)) run.clock.fireNextTimer();
      }
      assert.equal(run.manager.dataWrites, 90);
      assert.equal(typeof resolveAD, 'function');
      assert.equal(run.clock.pendingTimers > 0, true, 'AA timer remains active until AD write success is known');
      assert.equal(run.h.alerts.length, 0, 'No user-facing outcome is projected while AD is pending');
      resolveAD();
      const result = await run.clock.settle(run.operation);
      assert.equal(result.status, 'sent-unconfirmed');
      assert.equal(result.completionSignal, 'observed-aa-shape');
      assert.equal(result.paperPresence, 'unknown');
      const lastDataAt = run.manager.trace.filter((entry) => entry.characteristic === run.h.load('mxw01Protocol.js').MXW01_UUIDS.data).at(-1).at;
      assert.ok(run.clock.now < lastDataAt + 50025, 'The observed signal closes before the unchanged AA deadline');
      assert.equal(run.manager.controls.filter((packet) => packet[2] === 0xad).length, 1);
      assert.deepEqual(run.h.alerts, [['Ciclo de impresión finalizado', 'Se detectó la señal de fin de ciclo. Revise que el recibo haya salido completo; la impresora no envió una confirmación validada.']]);
      assert.equal(reports[0].printResult, 'sent-unconfirmed');
      assert.equal(reports[0].completionValidated, false);
      assert.equal(reports[0].closingFailureScope, 'aa-wait');
      const sample = reports[0].samples.find((item) => item.aaTagged);
      assert.equal(sample.classification, 'incomplete-frame');
      assert.equal(sample.completesStrictAA, false);
      assert.equal(protocol.parseNotification(signal), null, 'Malformed observed signals never enter strict AA admission');
      assert.equal(protocol.isObservedUnverifiedAACompletionSignal(signal), true);
      assertNativeRunClean(run);
      const lockProbe = run.h.load('printJob.js').beginPrintJob();
      lockProbe.finish();
    } finally { run.clock.dispose(); }
  }
  const wrongFixedBytes = [0, 1, 2, 3, 4, 5, 6, 9].map((index) => {
    const candidate = OBSERVED_UNVERIFIED_AA.slice(); candidate[index] ^= 1; return candidate;
  });
  const mismatch = OBSERVED_UNVERIFIED_AA.slice(); mismatch[8] ^= 1;
  const wrongLengths = [OBSERVED_UNVERIFIED_AA.slice(0, 9), new Uint8Array([...OBSERVED_UNVERIFIED_AA, 0])];
  for (const candidate of [mismatch, ...wrongFixedBytes, ...wrongLengths]) {
    assert.equal(protocol.isObservedUnverifiedAACompletionSignal(candidate), false);
    assert.equal(protocol.parseNotification(candidate), null, 'Malformed variants remain rejected by strict framing');
  }
  assert.equal(protocol.parseNotification(SYNTHETIC_AA_OK)?.command, 0xaa, 'Strict valid AA remains parseable');
  const strictRun = await syntheticTimingRun({}, undefined, 'direct');
  try {
    assert.equal((await strictRun.clock.settle(strictRun.operation)).status, 'printed', 'Only the existing strict valid AA path reports printed');
    assertNativeRunClean(strictRun);
  } finally { strictRun.clock.dispose(); }
});

test('the observed malformed AA signal detector remains active on an ordinary print without passive evidence', async () => {
  for (const signal of OBSERVED_UNVERIFIED_AA_SIGNALS) {
    const run = await syntheticTimingRun({ noComplete: true, onControl(manager, bytes) {
      if (bytes[2] === 0xad) manager.emit(b64(signal));
    } }, undefined, 'direct');
    try {
      const result = await run.clock.settle(run.operation);
      assert.equal(result.status, 'sent-unconfirmed');
      const lastDataAt = run.manager.trace.filter((entry) => entry.characteristic === run.h.load('mxw01Protocol.js').MXW01_UUIDS.data).at(-1).at;
      assert.ok(run.clock.now < lastDataAt + 50025);
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('an observed malformed AA signal cannot suppress a rejected AD write', async () => {
  for (const signal of OBSERVED_UNVERIFIED_AA_SIGNALS) {
    const failure = new Error('synthetic AD rejection');
    const reports = [];
    const run = await syntheticTimingRun({ noComplete: true, onControl(manager, bytes) {
      if (bytes[2] !== 0xad) return;
      manager.emit(b64(signal));
      return Promise.reject(failure);
    } }, (report) => reports.push(report), 'direct');
    try {
      await assert.rejects(run.clock.settle(run.operation), (error) => error === failure);
      assert.equal(reports[0].printResult, 'error');
      assert.equal(reports[0].completionValidated, false);
      assert.equal(reports[0].adWriteQueued, false);
      assert.equal(reports[0].closingFailureScope, 'final-command');
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('a latched observed malformed AA signal cannot suppress cancellation while AD is pending', async () => {
  for (const signal of OBSERVED_UNVERIFIED_AA_SIGNALS) {
    let run;
    const reports = [];
    const { PrintingError } = harness().load('printingOperation.js');
    const original = new PrintingError('cancelled', 'Cancel while the observed AD write is pending');
    run = await syntheticTimingRun({ noComplete: true, onControl(manager, bytes) {
      if (bytes[2] !== 0xad) return;
      manager.emit(b64(signal));
      run.clock.setTimeout(() => run.token.cancel(original), 100);
      return new Promise(() => {});
    } }, (report) => reports.push(report), 'direct');
    try {
      await assert.rejects(run.clock.settle(run.operation), (error) => error === original);
      assert.equal(run.manager.dataWrites, 90);
      assert.equal(reports[0].imageWritesResolved, 90);
      assert.equal(reports[0].adWriteAttempted, true);
      assert.equal(reports[0].adWriteQueued, false);
      assert.equal(reports[0].printResult, 'error');
      assert.equal(reports[0].completionValidated, false);
      assert.equal(reports[0].failureOrigin, 'cancelled');
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('an observed malformed AA signal before AD, before image resolution, or outside the AA wait is ignored', async () => {
  const cases = [
    { name: 'before AD attempt', options: { noComplete: true, onData(manager, bytes, attempt) { if (attempt === 90) manager.emit(b64(OBSERVED_UNVERIFIED_AA)); } } },
    { name: 'before full image resolution', options: { noComplete: true, onData(manager, bytes, attempt) { if (attempt === 90) { manager.emit(b64(OBSERVED_UNVERIFIED_AA)); return new Promise(() => {}); } } } },
    { name: 'outside AA wait', options: { noComplete: true, onControl(manager, bytes) { if (bytes[2] === 0xa9) manager.emit(b64(OBSERVED_UNVERIFIED_AA)); } } },
  ];
  for (const scenario of cases) {
    const run = await syntheticTimingRun(scenario.options);
    try {
      const result = await run.clock.settle(run.operation);
      if (scenario.name === 'before AD attempt' || scenario.name === 'outside AA wait') {
        assert.equal(result.status, 'sent-unconfirmed', scenario.name);
        assert.equal(run.manager.controls.some((packet) => packet[2] === 0xad), true);
        const lastDataAt = run.manager.trace.filter((entry) => entry.characteristic === run.h.load('mxw01Protocol.js').MXW01_UUIDS.data).at(-1).at;
        assert.equal(run.clock.now, lastDataAt + 50025, 'Unmatched sample retains the existing AA timeout');
      } else {
        assert.equal(result.status, 'error', scenario.name);
        assert.notEqual(result.status, 'sent-unconfirmed', scenario.name);
        assert.equal(run.manager.controls.some((packet) => packet[2] === 0xad), false);
      }
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('AA timeout-coded external cancellation after resolved image and AD is not the AA deadline', async () => {
  for (const route of ['direct', 'synthetic']) {
    let run;
    const { PrintingError } = harness().load('printingOperation.js');
    const original = new PrintingError('timeout', 'External synthetic cancellation, not AA deadline expiry');
    const reports = [];
    run = await syntheticTimingRun({ noComplete: true, onControl(manager, bytes) {
      if (bytes[2] === 0xad) run.clock.setTimeout(() => run.token.cancel(original), 100);
    } }, (report) => reports.push(report), route);
    try {
      if (route === 'direct') await assert.rejects(run.clock.settle(run.operation), (error) => error === original);
      else {
        const result = await run.clock.settle(run.operation);
        assert.equal(result.status, 'error'); assert.equal(result.reason, 'timeout');
      }
      assert.equal(run.manager.dataWrites, 90);
      assert.equal(run.manager.controls.some((packet) => packet[2] === 0xad), true);
      assert.equal(reports[0].imageWritesResolved, 90); assert.equal(reports[0].imageBytesQueued, 4320);
      assert.equal(reports[0].adWriteAttempted, true); assert.equal(reports[0].adWriteQueued, true);
      assert.equal(reports[0].printResult, 'error'); assert.equal(reports[0].failureOrigin, 'timeout');
      assert.equal(reports[0].errorCode, 'timeout'); assert.notEqual(reports[0].printResult, 'sent-unconfirmed');
      assert.equal(reports[0].closingFailureScope, 'aa-wait'); assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('timeout-coded cancellation before image completion or before AD queue never becomes sent-unconfirmed', async () => {
  for (const stage of ['last-image-write', 'ad-pending', 'ad-native-timeout-rejection']) {
    let baseline;
    for (const capture of [true, false]) {
      let run;
      const { PrintingError } = harness().load('printingOperation.js');
      const original = new PrintingError('timeout', `External timeout-coded cancellation at ${stage}`);
      const reports = [];
      const options = stage === 'last-image-write' ? { noComplete: true,
        a9Values: [b64(OBSERVED_A9_SHORT8)],
        onData(manager, bytes, attempt) { if (attempt === 90) run.token.cancel(original); },
      } : {
        noComplete: true,
        a9Values: [b64(OBSERVED_A9_SHORT8)],
        onControl(manager, bytes) {
          if (bytes[2] === 0xad) {
            if (stage === 'ad-native-timeout-rejection') return Promise.reject(original);
            run.clock.setTimeout(() => run.token.cancel(original), 100);
            if (stage === 'ad-pending') return new Promise(() => {});
          }
        },
      };
      run = await syntheticTimingRun(options, capture ? (report) => reports.push(report) : undefined, 'direct');
      try {
        await assert.rejects(run.clock.settle(run.operation), (error) => error === original);
        const report = reports[0];
        if (capture) {
          assert.equal(report.printResult, 'error'); assert.equal(report.errorCode, 'timeout');
          assert.equal(report.failureOrigin, stage === 'ad-native-timeout-rejection' ? 'control-write' : 'timeout');
          assert.notEqual(report.printResult, 'sent-unconfirmed');
          assert.equal(report.adWriteAttempted, stage !== 'last-image-write');
          assert.equal(report.adWriteQueued, false);
          assert.equal(report.closingFailureScope, stage === 'ad-native-timeout-rejection' ? 'final-command' : 'aa-wait', stage);
          if (stage === 'last-image-write') {
            assert.equal(report.imageWriteAttempts, 90); assert.equal(report.imageWritesResolved, 89);
            assert.equal(report.imageBytesQueued, 4272);
          } else { assert.equal(report.imageWritesResolved, 90); assert.equal(report.imageBytesQueued, 4320); }
        } else assert.equal(report, undefined);
        assert.deepEqual(run.manager.controls.map((packet) => packet[2]), stage === 'last-image-write' ? [0xa1, 0xa2, 0xa9] : [0xa1, 0xa2, 0xa9, 0xad]);
        const actual = { trace: run.manager.trace, status: 'rejected', code: original.code, message: original.message, now: run.clock.now };
        if (!baseline) baseline = actual; else assert.deepEqual(actual, baseline);
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  }
});

test('synthetic A9 500ms sole8 waits until deadline with raw latency delta; strict9 and timely8+FF take priority', async () => {
  for (const shape of ['observed8', 'strict9', 'split8+FF']) {
    const reports = [];
    const run = await syntheticTimingRun({ a9Values: [] }, (report) => reports.push(report));
    try {
      await reachTimingA9(run); assert.equal(run.clock.now, 250);
      run.clock.elapse(77);
      run.manager.emit(b64(shape === 'strict9' ? SYNTHETIC_A9_OK : OBSERVED_A9_SHORT8));
      const rawAt = run.clock.now;
      if (shape !== 'strict9') {
        await run.clock.flushMicrotasks(); assert.equal(run.manager.dataWrites, 0);
        run.clock.elapse(422); // 499ms after the request, still BEFORE the exclusive deadline.
        if (shape === 'split8+FF') run.manager.emit(b64(new Uint8Array([0xff])));
        else { await run.clock.flushMicrotasks(); assert.equal(run.manager.dataWrites, 0); }
      }
      const result = await run.clock.settle(run.operation);
      assert.equal(result.status, 'printed');
      const dataUuid = run.h.load('mxw01Protocol.js').MXW01_UUIDS.data;
      const first = run.manager.trace.find((entry) => entry.characteristic === dataUuid).at;
      assert.equal(first, shape === 'observed8' ? 750 : shape === 'strict9' ? rawAt : 749);
      assert.equal(reports[0].rawA9AckToFirstImageWriteMs, shape === 'observed8' ? 423 : 0);
      assert.equal(reports[0].receiveWindowMs, 500);
      assert.equal(reports[0].a9Variant, shape === 'observed8' ? 'observed-short8' : 'strict-crc');
      assert.equal(reports[0].a9Integrity, shape === 'observed8' ? 'unverified' : 'crc-verified');
      assert.equal(reports[0].a9Provenance, shape === 'observed8' ? 'user-a9-capture' : 'strict-framing');
      assert.equal(result.paperPresence, 'unknown'); assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('synthetic A9 500ms exclusive arrival boundary rejects equality/late strict or observed ACKs with overdue timers', async () => {
  for (const value of [b64(OBSERVED_A9_SHORT8), b64(SYNTHETIC_A9_OK)]) {
    for (const arrival of [499, 500, 501]) {
      const reports = [];
      const run = await syntheticTimingRun({ a9Values: [] }, (report) => reports.push(report));
      try {
        await reachTimingA9(run); run.clock.elapse(arrival);
        assert.equal(run.clock.pendingTimers, 1, 'Reply timer has NOT dispatched before this raw arrival');
        run.manager.emit(value);
        const result = await run.clock.settle(run.operation);
        assert.equal(result.status, arrival < 500 ? 'printed' : 'error');
        if (arrival >= 500) assert.equal(result.reason, 'timeout');
        assert.equal(run.manager.dataWrites, arrival < 500 ? 90 : 0);
        assert.equal(reports[0].receiveWindowMs, 500); assert.equal(reports[0].rawCallbacks, arrival < 500 ? 1 : 0);
        assert.equal(run.manager.controls.filter((packet) => packet[2] === 0xa9).length, 1);
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  }
});

test('synthetic A9 500ms invalid/extra/fragmented/coalesced/prequery/subscription/cancel input remains fail-closed', async () => {
  const short = b64(OBSERVED_A9_SHORT8);
  const badCRC = b64(new Uint8Array([0x22, 0x21, 0xa9, 0, 1, 0, 0, 1, 0xff]));
  const rows = [
    [[short, 'bad!'], 'timeout'], [[short, short], 'timeout'],
    [[b64(OBSERVED_A9_SHORT8.slice(0, 4)), b64(OBSERVED_A9_SHORT8.slice(4))], 'timeout'],
    [[b64(new Uint8Array([...OBSERVED_A9_SHORT8, ...SYNTHETIC_AA_OK]))], 'timeout'],
    [[b64(new Uint8Array([...OBSERVED_A9_SHORT8, 0]))], 'timeout'], [[badCRC], 'timeout'],
    [[b64(new Uint8Array([0x22, 0x21, 0xa9, 0, 1, 0, 1, 7]))], 'timeout'],
    [[b64(SYNTHETIC_A9_REJECTED)], 'rejected'], [[], 'prequery'], [[short], 'late-invalid'],
    [[short], 'subscription'], [[short], 'cancel'], [[short], 'foreground'],
  ];
  for (const [values, scenario] of rows) {
    const reports = [];
    const run = await syntheticTimingRun({ a9Values: values }, (report) => reports.push(report));
    try {
      if (scenario === 'prequery') {
        await run.clock.flushMicrotasks(); run.manager.emit(short); // Subscription ready, no query/waiter yet.
      }
      await reachTimingA9(run);
      if (scenario === 'late-invalid') { run.clock.elapse(500); run.manager.emit('bad!'); }
      if (scenario === 'subscription') run.manager.emit(undefined, { errorCode: 403, message: 'PRIVATE_SENTINEL', deviceID: mac });
      if (scenario === 'cancel') run.token.cancel();
      if (scenario === 'foreground') run.h.background();
      const result = await run.clock.settle(run.operation);
      assert.equal(result.status, 'error');
      const code = scenario === 'subscription' ? 'connection' : scenario === 'cancel' ? 'cancelled'
        : ['foreground', 'rejected'].includes(scenario) ? scenario : 'timeout';
      assert.equal(result.reason, code); assert.equal(run.manager.dataWrites, 0);
      assert.equal(reports[0].a9AckAccepted, false); assert.equal(reports[0].receiveWindowMs, 500);
      assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9]);
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('synthetic A9 500ms does not shorten any control-write bound or admit data before a delayed/failed/hung request queues', async () => {
  for (const opcode of [0xa1, 0xa2, 0xa9, 0xad]) {
    for (const outcome of ['delayed', 'failed', 'hung']) {
      let run;
      let queuedAt;
      const reports = [];
      const failure = { errorCode: 401, message: 'PRIVATE_SENTINEL' };
      const options = { a9Values: [b64(OBSERVED_A9_SHORT8)], onControl(manager, bytes) {
        if (bytes[2] !== opcode) return;
        if (outcome === 'hung') return new Promise(() => {});
        return new Promise((resolve, reject) => run.clock.setTimeout(() => {
          queuedAt = run.clock.now;
          if (outcome === 'failed') reject(failure); else resolve();
        }, 700));
      } };
      run = await syntheticTimingRun(options, (report) => reports.push(report));
      try {
        if (opcode === 0xa9) {
          await reachTimingA9(run); run.clock.fireNextTimer(); // 500ms reply expiry, NOT the 5000ms request-write bound.
          await run.clock.flushMicrotasks(); assert.equal(run.clock.now, 750); assert.equal(run.manager.dataWrites, 0);
        }
        const result = await run.clock.settle(run.operation);
        assert.equal(result.status, outcome === 'delayed' ? 'printed' : 'error');
        const controlUuid = run.h.load('mxw01Protocol.js').MXW01_UUIDS.control;
        const start = run.manager.trace.find((entry) => entry.characteristic === controlUuid && Buffer.from(entry.value, 'base64')[2] === opcode).at;
        if (outcome === 'hung') { assert.equal(result.reason, 'timeout'); assert.equal(run.clock.now - start, 5000); }
        else assert.equal(queuedAt - start, 700);
        if (opcode === 0xa9) {
          assert.equal(reports[0].receiveWindowMs, 500);
          assert.equal(reports[0].a9WriteQueued, outcome === 'delayed');
          assert.equal(run.manager.dataWrites, outcome === 'delayed' ? 90 : 0);
          if (outcome === 'delayed') assert.equal(reports[0].rawA9AckToFirstImageWriteMs, 700, 'The original queued-write gate may delay data beyond 500ms');
        }
        if (outcome !== 'delayed') assert.equal(reports[0].failureOrigin, outcome === 'hung' ? 'timeout' : 'control-write');
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  }
});

test('synthetic A9 500ms preserves A1 reply/status compatibility and its exclusive 5000ms boundary', async () => {
  for (const status of [A1_READY_RX, OBSERVED_A1_WITH_PAPER]) {
    for (const arrival of [4999, 5000, 5001]) {
      const reports = [];
      const run = await syntheticTimingRun({ autoA1: false, a9Values: [b64(OBSERVED_A9_SHORT8)] }, (report) => reports.push(report));
      try {
        await run.clock.flushMicrotasks(); run.clock.fireNextTimer(); await run.clock.flushMicrotasks();
        assert.equal(run.clock.now, 250); assert.deepEqual(run.manager.controls, [A1_QUERY]);
        run.clock.elapse(arrival); run.manager.emit(b64(status));
        const result = await run.clock.settle(run.operation);
        assert.equal(result.status, arrival < 5000 ? 'printed' : 'error');
        assert.equal(reports[0].a1Passed, arrival < 5000);
        if (arrival < 5000) {
          assert.equal(reports[0].receiveWindowMs, 500);
          const requestAt = run.manager.trace.find((entry) => Buffer.from(entry.value, 'base64')[2] === 0xa9).at;
          assert.equal(requestAt, status === OBSERVED_A1_WITH_PAPER ? 5250 : 5249);
        } else { assert.equal(result.reason, 'timeout'); assert.deepEqual(run.manager.controls, [A1_QUERY]); }
        assertNativeRunClean(run);
      } finally { run.clock.dispose(); }
    }
  }
});

test('synthetic A9 500ms retains strict AA and 0 vs 144 byte progress without claiming hardware success', async () => {
  const rows = [
    [{ noComplete: true }, 'sent-unconfirmed', 'sent-unconfirmed', 90, 90, 4320],
    [{ completeValue: b64(SYNTHETIC_AA_OK.slice(0, 8)) }, 'sent-unconfirmed', 'sent-unconfirmed', 90, 90, 4320],
    [{ completeValue: b64(new Uint8Array([0x22, 0x21, 0xaa, 0, 1, 0, 0, 1, 0xff])) }, 'sent-unconfirmed', 'sent-unconfirmed', 90, 90, 4320],
    [{ completeValue: b64(new Uint8Array([0x22, 0x21, 0xaa, 0, 1, 0, 1, 7, 0xff])) }, 'completion', 'error', 90, 90, 4320],
    ...[1, 4].map((failAt) => [{ onData(manager, bytes, attempt) { if (attempt === failAt) throw { errorCode: 401 }; } }, 'data', 'error', failAt, failAt - 1, (failAt - 1) * 48]),
  ];
  for (const [options, reason, status, attempted, resolved, bytes] of rows) {
    const reports = [];
    const run = await syntheticTimingRun({ a9Values: [b64(OBSERVED_A9_SHORT8)], ...options }, (report) => reports.push(report));
    try {
      const result = await run.clock.settle(run.operation);
      assert.equal(result.status, status); assert.equal(result.reason, status === 'sent-unconfirmed' ? undefined : reason);
      const report = reports[0];
      assert.equal(report.receiveWindowMs, 500); assert.equal(report.a9AckAccepted, true);
      assert.equal(report.completionValidated, false); assert.equal(report.imageWriteAttempts, attempted);
      assert.equal(report.imageWritesResolved, resolved); assert.equal(report.imageBytesQueued, bytes);
      assert.equal(run.manager.controls.filter((packet) => packet[2] === 0xa9).length, 1);
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('synthetic A9 500ms preserves image 5000ms terminal-first/inverse attribution and finalized report immutability', async () => {
  for (const compatibility of [false, true]) {
    for (const origin of ['monitor', 'disconnect']) {
      for (const first of ['timeout', 'native']) {
        const reports = [];
        const options = { onData() { return new Promise(() => {}); } };
        if (compatibility) { options.a1Value = b64(OBSERVED_A1_WITH_PAPER); options.a9Values = [b64(OBSERVED_A9_SHORT8)]; }
        const run = await syntheticTimingRun(options, (report) => reports.push(report));
        try {
          for (let turn = 0; turn < 4; turn += 1) {
            await run.clock.flushMicrotasks(); if (run.manager.dataWrites) break; run.clock.fireNextTimer();
          }
          assert.equal(run.manager.dataWrites, 1); assert.equal(run.clock.now, compatibility ? 5750 : 250);
          const start = run.clock.now;
          if (first === 'timeout') run.clock.fireNextTimer(); else run.clock.elapse(5000);
          assert.equal(run.clock.now - start, 5000);
          emitCauseEvent(run, origin); // No checkpoint between timeout dispatch/native event and catch resumption.
          const result = await run.clock.settle(run.operation);
          assert.equal(result.reason, first === 'timeout' ? 'timeout' : 'connection');
          const report = reports[0];
          assert.equal(report.failureOrigin, first === 'timeout' ? 'timeout' : origin);
          assert.equal(report.nativeErrorCode, first === 'timeout' ? null : origin === 'monitor' ? 403 : 205);
          assert.equal(report.receiveWindowMs, 500); assert.equal(report.imageWritesResolved + report.imageBytesQueued, 0);
          const snapshot = JSON.stringify(report);
          emitCauseEvent(run, origin === 'monitor' ? 'disconnect' : 'monitor'); await run.clock.flushMicrotasks();
          assert.equal(JSON.stringify(report), snapshot); assert.equal(reports.length, 1); assertNativeRunClean(run);
        } finally { run.clock.dispose(); }
      }
    }
  }
});

async function connectionLifetimeRun(route = 'synthetic', options = {}) {
  const clock = controlledClock();
  const manager = nativeSessionManager(clock, { autoA1: true, a9Values: [b64(OBSERVED_A9_SHORT8)], noComplete: options.noComplete });
  const connectionOptions = [];
  const cuts = [];
  let lifetimeTimer;
  manager.connectToDevice = (id, supplied) => {
    assert.equal(id, mac);
    connectionOptions.push({ ...supplied });
    const effective = options.oldOptionControl ? { ...supplied, timeout: 12000 } : supplied;
    // Source-faithful JS MODEL only: bridge numeric option -> nullable adapter timeout.
    // Rx timeout restarts after the sole connection emission; GATT writes are NOT new connection emissions.
    const nativeTimeout = Object.hasOwn(effective, 'timeout') && typeof effective.timeout === 'number' ? effective.timeout : null;
    const arm = () => {
      clock.clearTimeout(lifetimeTimer);
      if (nativeTimeout !== null) lifetimeTimer = clock.setTimeout(() => {
        cuts.push(clock.now);
        manager.disconnectEvent(null); // Installed bridge hardcodes null; initial Promise already succeeded.
      }, nativeTimeout);
    };
    arm(); // Initial emission deadline, then successful connection/MTU emission at this same test-clock tick.
    arm();
    return Promise.resolve({ mtu: 512 }); // SafeExecutor succeeds once; later observable failure cannot reject it again.
  };
  const disconnect = manager.cancelDeviceConnection.bind(manager);
  manager.cancelDeviceConnection = (...args) => { clock.clearTimeout(lifetimeTimer); return disconnect(...args); };
  const destroy = manager.destroy.bind(manager);
  manager.destroy = () => { clock.clearTimeout(lifetimeTimer); destroy(); };
  const stored = JSON.stringify(nativeProfile);
  const h = harness({ clock, manager, stored, native: true, ownership: 'standalone', saleResponse: provided });
  h.rn.PermissionsAndroid.check = async () => true;
  // Deliberately long MOCK raster, not an observation or modification of the fixed UI fixture/pixels.
  h.overrides.set('rasterRenderer.js', { async renderMXW01Receipt() { return raster(600); } });
  const token = h.load('printingOperation.js').createCancellation();
  const reports = [];
  const observer = options.observer === 'off' ? undefined : (report) => reports.push(report);
  const facade = h.load('printSaleTicket.js');
  const operation = route === 'synthetic' ? facade.printSyntheticTicketWithA9Evidence({ token, onA9Evidence: observer })
    : route === 'normal' ? facade.printSaleTicket({ mode: 'provided', provided })
      : route === 'diagnostic' ? h.load('mxw01Ble.js').testMXW01Connection({ token })
        : h.load('mxw01Ble.js').printMXW01Raster(nativeProfile, raster(600), token, observer);
  return { clock, manager, h, stored, token, operation, reports, connectionOptions, cuts };
}

test('native connection lifetime timeout does not cut a long active production session after its first emission', async (t) => {
  const observed = [];
  for (const route of ['synthetic', 'normal']) {
    const run = await connectionLifetimeRun(route);
    try {
      const result = await run.clock.settle(run.operation);
      const dataUuid = run.h.load('mxw01Protocol.js').MXW01_UUIDS.data;
      const data = run.manager.trace.filter((entry) => entry.characteristic === dataUuid);
      observed.push({ route, status: result.status, reason: result.reason ?? null, cuts: run.cuts, writes: data.length });
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
  t.diagnostic(JSON.stringify(observed)); // Safe test-case primitives only, not native/image/customer logs.
  assert.deepEqual(observed, ['synthetic', 'normal'].map((route) => ({ route, status: 'printed', reason: null, cuts: [], writes: 600 })));
});

test('native connection lifetime source audit confirms omission skips the installed numeric timeout operator', () => {
  const sdk = 'node_modules/react-native-ble-plx';
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, sdk, 'package.json'), 'utf8')).version, '3.1.2');
  const readSDK = (file) => fs.readFileSync(path.join(root, sdk, file), 'utf8');
  const bridge = readSDK('android/src/main/java/com/bleplx/BlePlxModule.java');
  assert.match(bridge, /Integer timeout = null;/);
  assert.match(bridge, /options\.hasKey\("timeout"\) && options\.getType\("timeout"\) == ReadableType\.Number/);
  assert.match(bridge, /timeout != null \? timeout\.longValue\(\) : null/);
  const adapter = readSDK('android/src/main/java/com/bleplx/adapter/BleModule.java');
  assert.match(adapter, /if \(timeout != null\) \{\s*connect = connect\.timeout\(timeout, TimeUnit\.MILLISECONDS\);/);
  assert.match(adapter, /\.establishConnection\(autoConnect\)[\s\S]*?\.doFinally\(/);
  assert.match(adapter, /connectingDevices\.replaceSubscription\(device\.getMacAddress\(\), subscription\)/);
  assert.match(bridge, /connectionState == ConnectionState\.DISCONNECTED[\s\S]*?event\.pushNull\(\)/);
  const safe = readSDK('android/src/main/java/com/bleplx/adapter/utils/SafeExecutor.java');
  assert.equal((safe.match(/wasExecuted\.compareAndSet\(false, true\)/g) || []).length, 2);
  assert.match(readSDK('src/BleManager.js'), /BleModule\.connectToDevice\(deviceIdentifier, options\)/);
  // Read-only source evidence for the model; Java/Rx/native code is never loaded or executed here.
});

test('native connection lifetime old-option negative control still cuts at 12s despite ongoing GATT writes', async () => {
  for (const route of ['synthetic', 'normal']) {
    const run = await connectionLifetimeRun(route, { oldOptionControl: true });
    try {
      const result = await run.clock.settle(run.operation);
      assert.equal(result.status, 'error'); assert.equal(result.reason, 'connection');
      assert.deepEqual(run.connectionOptions, [{ autoConnect: false, requestMTU: 185 }]);
      assert.deepEqual(run.cuts, [12000]);
      assert.equal(run.manager.dataWrites, route === 'synthetic' ? 450 : 270);
      assert.equal(run.manager.controls.some((packet) => packet[2] === 0xad), false);
      if (route === 'synthetic') {
        assert.equal(run.reports[0].failureOrigin, 'disconnect'); assert.equal(run.reports[0].nativeErrorCode, null);
        assert.equal(run.reports[0].completionValidated, false);
      }
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

async function pendingConnectionRun(route = 'synthetic', hangDisconnect = false) {
  const clock = controlledClock();
  const manager = nativeSessionManager(clock);
  const connectionOptions = [];
  const lifecycle = [];
  let resolveConnect;
  let rejectConnect;
  manager.state = async () => { lifecycle.push('state'); return 'PoweredOn'; };
  manager.connectToDevice = (id, supplied) => {
    assert.equal(id, mac); connectionOptions.push({ ...supplied }); lifecycle.push('connect');
    return new Promise((resolve, reject) => { resolveConnect = resolve; rejectConnect = reject; });
  };
  manager.discoverAllServicesAndCharacteristicsForDevice = () => assert.fail('Abandoned connection must not start discovery');
  manager.stopDeviceScan = () => lifecycle.push('stop-scan');
  manager.cancelTransaction = (id) => lifecycle.push(id);
  manager.cancelDeviceConnection = async () => {
    lifecycle.push('disconnect'); manager.cleanup.disconnect += 1;
    if (hangDisconnect) return new Promise(() => {});
  };
  manager.destroy = () => { lifecycle.push('destroy'); manager.cleanup.destroyed += 1; };
  const stored = JSON.stringify(nativeProfile);
  const h = harness({ clock, manager, stored, native: true, ownership: 'standalone' });
  h.rn.PermissionsAndroid.check = async () => true;
  h.overrides.set('rasterRenderer.js', { async renderMXW01Receipt() { return raster(); } });
  const token = h.load('printingOperation.js').createCancellation();
  const reports = [];
  const observer = (report) => reports.push(report);
  const operation = route === 'direct' ? h.load('mxw01Ble.js').printMXW01Raster(nativeProfile, raster(), token, observer)
    : h.load('printSaleTicket.js').printSyntheticTicketWithA9Evidence({ token, onA9Evidence: observer });
  await clock.flushMicrotasks();
  assert.equal(connectionOptions.length, 1); assert.equal(clock.now, 0); assert.equal(clock.pendingTimers, 1);
  return { h, clock, manager, stored, token, operation, reports, connectionOptions, lifecycle,
    resolveConnect: () => resolveConnect({ mtu: 512 }), rejectConnect: () => rejectConnect({ errorCode: 200, message: 'PRIVATE_SENTINEL', deviceID: mac }) };
}

function assertAbandonedConnectionClean(run) {
  assert.deepEqual(run.connectionOptions, [{ autoConnect: false, requestMTU: 185 }]);
  assert.equal(Object.hasOwn(run.connectionOptions[0], 'timeout'), false, 'Omit the property entirely, not 0/null/undefined');
  assert.deepEqual(run.lifecycle, ['state', 'connect', 'stop-scan', 'golozur-mxw01-io', 'golozur-mxw01-notify', 'disconnect', 'destroy']);
  assert.deepEqual(run.manager.cleanup, { monitor: 0, disconnectedListener: 0, disconnect: 1, destroyed: 1 });
  assert.equal(run.manager.controls.length + run.manager.dataWrites, 0);
  assert.equal(run.clock.pendingTimers + run.h.appListenerCount + run.h.requests.length + run.h.urls.length, 0);
  assert.equal(run.h.stored, run.stored);
}

test('connection establishment remains bounded without a native lifetime timeout', async () => {
  const run = await pendingConnectionRun('direct');
  let resumed = false;
  run.operation.catch(() => { resumed = true; });
  try {
    run.clock.elapse(14999); await run.clock.flushMicrotasks();
    assert.equal(resumed, false); assert.deepEqual(run.manager.controls, []);
    run.clock.fireNextTimer(); assert.equal(run.clock.now, 15000);
    await assert.rejects(run.clock.settle(run.operation), (error) => error.code === 'timeout' && /^Printer connection timed out\./.test(error.message));
    assertAbandonedConnectionClean(run);
    run.resolveConnect(); await run.clock.flushMicrotasks();
    assertAbandonedConnectionClean(run);
    const cancelled = run.h.load('printingOperation.js').createCancellation(); cancelled.cancel();
    await assert.rejects(run.h.load('mxw01Ble.js').discoverMXW01Printers({ token: cancelled }), { code: 'cancelled' });
    assert.equal(run.connectionOptions.length, 1, 'BLE lock released without starting another native connection');
  } finally { run.clock.dispose(); }
  const cancelledRun = await pendingConnectionRun('direct');
  try {
    const { PrintingError } = cancelledRun.h.load('printingOperation.js');
    const original = new PrintingError('cancelled', 'Synthetic cancellation during connection opening');
    cancelledRun.token.cancel(original);
    await assert.rejects(cancelledRun.clock.settle(cancelledRun.operation), (error) => error === original);
    cancelledRun.rejectConnect(); await cancelledRun.clock.flushMicrotasks();
    assertAbandonedConnectionClean(cancelledRun);
  } finally { cancelledRun.clock.dispose(); }
});

test('connection cancellation/late outcomes preserve finalized evidence and 3s hung-disconnect cleanup/lock release', async () => {
  for (const ending of ['timeout', 'cancel', 'foreground']) {
    for (const late of ['resolve', 'reject']) {
      for (const hangDisconnect of [false, true]) {
        const run = await pendingConnectionRun('synthetic', hangDisconnect);
        try {
          if (ending === 'timeout') run.clock.fireNextTimer();
          else if (ending === 'cancel') run.token.cancel(); else run.h.background();
          const stoppedAt = run.clock.now;
          const result = await run.clock.settle(run.operation);
          assert.equal(result.status, 'error'); assert.equal(result.reason, ending === 'cancel' ? 'cancelled' : ending);
          assert.equal(run.clock.now, stoppedAt + (hangDisconnect ? 3000 : 0));
          assert.equal(run.reports.length, 1); assert.equal(run.reports[0].a9Attempted, false);
          const snapshot = JSON.stringify(run.reports[0]);
          if (late === 'resolve') run.resolveConnect(); else run.rejectConnect();
          await run.clock.flushMicrotasks();
          assert.equal(run.reports.length, 1); assert.equal(JSON.stringify(run.reports[0]), snapshot);
          assert.equal(snapshot.includes('PRIVATE_SENTINEL') || snapshot.includes(mac), false);
          assertAbandonedConnectionClean(run);
          const next = run.h.load('printJob.js').beginPrintJob(); next.finish();
          run.h.rn.AppState.currentState = 'active';
          const cancelled = run.h.load('printingOperation.js').createCancellation(); cancelled.cancel();
          await assert.rejects(run.h.load('mxw01Ble.js').discoverMXW01Printers({ token: cancelled }), { code: 'cancelled' });
          assert.equal(run.connectionOptions.length, 1);
        } finally { run.clock.dispose(); }
      }
    }
  }
});

test('native connection lifetime omission is shared with A1-only diagnostics while RawBT never loads BLE', async () => {
  const run = await connectionLifetimeRun('diagnostic');
  try {
    const result = await run.clock.settle(run.operation);
    assert.equal(result.outcome, 'a1-ready'); assert.deepEqual(run.connectionOptions, [{ autoConnect: false, requestMTU: 185 }]);
    assert.deepEqual(run.manager.controls, [A1_QUERY]); assert.equal(run.manager.dataWrites, 0);
    assert.deepEqual(run.cuts, []); assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
  const h = harness();
  assert.equal((await h.load('printSaleTicket.js').printSaleTicket({ mode: 'provided', provided })).status, 'printed');
  assert.equal(h.bleLoads, 0); assert.equal(h.urls.length, 1); assert.equal(h.requests.length, 0);
});

test('native connection lifetime removal preserves long transfer on/off traces and never prints without strict AA', async () => {
  for (const route of ['synthetic', 'direct']) {
    for (const noComplete of [false, true]) {
      const on = await connectionLifetimeRun(route, { noComplete });
      const off = await connectionLifetimeRun(route, { noComplete, observer: 'off' });
      try {
        for (const run of [on, off]) {
          assert.equal((await run.clock.settle(run.operation)).status, noComplete ? 'sent-unconfirmed' : 'printed', 'Mocked strict AA only, not physical proof');
          assert.equal(run.manager.dataWrites, 600); assert.deepEqual(run.cuts, []);
          assert.deepEqual(run.connectionOptions, [{ autoConnect: false, requestMTU: 185 }]);
          const uuid = run.h.load('mxw01Protocol.js').MXW01_UUIDS.data;
          const data = run.manager.trace.filter((entry) => entry.characteristic === uuid);
          assert.equal(data[0].at, route === 'synthetic' ? 750 : 5250);
          assert.ok(data.every((entry, index) => Buffer.from(entry.value, 'base64').length === 48 && entry.at === data[0].at + index * 25));
          assert.equal(data.at(-1).at - data[0].at, 14975, 'Transfer itself exceeds 12s, not just setup/ACK waiting');
          assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9, 0xad]);
          assertNativeRunClean(run);
        }
        assert.deepEqual(on.manager.trace, off.manager.trace); assert.equal(off.reports.length, 0);
        assert.equal(on.reports[0].receiveWindowMs, route === 'synthetic' ? 500 : 5000);
        assert.equal(on.reports[0].imageBytesQueued, 28800); assert.equal(on.reports[0].completionValidated, !noComplete);
        if (noComplete) {
          assert.equal(on.reports[0].failureOrigin, null);
          assert.equal(on.reports[0].closingFailureScope, 'aa-wait');
        }
      } finally { on.clock.dispose(); off.clock.dispose(); }
    }
  }
});

test('passive closing AD attempt/queue and first failed bound distinguish final-command from aa-wait without changing traces', async () => {
  for (const scenario of ['ad-hung', 'ad-error', 'aa-absent', 'aa-valid', 'aa-rejected']) {
    const failure = { errorCode: 401, message: 'PRIVATE_SENTINEL', deviceID: mac };
    const options = { noComplete: scenario !== 'aa-valid', onControl(manager, bytes) {
      if (bytes[2] !== 0xad) return;
      if (scenario === 'ad-hung') return new Promise(() => {});
      if (scenario === 'ad-error') throw failure;
      if (scenario === 'aa-rejected') manager.emit(b64(new Uint8Array([0x22, 0x21, 0xaa, 0, 1, 0, 1, 7, 0xff])));
    } };
    const reports = [];
    const off = await syntheticTimingRun(options);
    const on = await syntheticTimingRun(options, (report) => reports.push(report));
    try {
      const results = [];
      for (const run of [off, on]) {
        results.push(await run.clock.settle(run.operation));
        assertNativeRunClean(run);
      }
      assert.deepEqual(results[0], results[1]); assert.deepEqual(on.manager.trace, off.manager.trace);
      assert.equal(on.clock.now, off.clock.now);
      const report = reports[0];
      assert.equal(report.adWriteAttempted, true);
      assert.equal(report.adWriteQueued, !['ad-hung', 'ad-error'].includes(scenario));
      assert.equal(report.aaWaitRegistered, true);
      assert.equal(report.closingFailureScope, scenario.startsWith('ad-') ? 'final-command' : scenario === 'aa-absent' ? 'aa-wait' : null);
      assert.equal(report.completionValidated, scenario === 'aa-valid');
      assert.equal(report.imageWriteAttempts, 90); assert.equal(report.imageWritesResolved, 90); assert.equal(report.imageBytesQueued, 4320);
      assert.equal(report.receiveWindowMs, 500); assert.equal(report.rawA9AckToFirstImageWriteMs, 0);
      const adAt = on.manager.trace.at(-1).at;
      if (scenario === 'ad-hung') assert.equal(on.clock.now - adAt, 5000);
      if (scenario === 'aa-absent') {
        const dataUuid = on.h.load('mxw01Protocol.js').MXW01_UUIDS.data;
        assert.equal(on.clock.now, on.manager.trace.filter((entry) => entry.characteristic === dataUuid).at(-1).at + 50025, 'Existing AA wait is enrolled before the last data write');
      }
      if (scenario === 'ad-error') assert.equal(report.nativeErrorCode, 401);
      if (scenario === 'aa-absent') {
        assert.equal(results[1].status, 'sent-unconfirmed');
        assert.equal(report.printResult, 'sent-unconfirmed'); assert.equal(report.failureOrigin, null); assert.equal(report.errorCode, null);
      }
      if (scenario === 'aa-valid') assert.equal(results[1].status, 'printed');
      if (scenario === 'aa-rejected') { assert.equal(results[1].status, 'error'); assert.equal(results[1].reason, 'completion'); }
      if (scenario === 'ad-hung') { assert.equal(results[1].status, 'error'); assert.equal(results[1].reason, 'timeout'); }
      if (scenario === 'ad-error') assert.deepEqual(results[1], { status: 'error', reason: 'data', message: 'Printing failed. Check the sale data, Bluetooth permissions, printer connection and paper before retrying. Nothing is resent automatically.' });
      assert.ok(report.samples.length <= 4);
    } finally { off.clock.dispose(); on.clock.dispose(); }
  }
});

test('passive closing sees AA before wait registration, in last data before AD, and after AD queue without replaying early AA', async () => {
  for (const arrival of ['early-transfer', 'last-data', 'after-ad-queue']) {
    let run;
    const reports = [];
    const options = { noComplete: true, onData(manager, bytes, attempt) {
      if ((arrival === 'early-transfer' && attempt === 1) || (arrival === 'last-data' && attempt === 90)) manager.emit(b64(SYNTHETIC_AA_OK));
    }, onControl(manager, bytes) {
      if (arrival === 'after-ad-queue' && bytes[2] === 0xad) run.clock.setTimeout(() => manager.emit(b64(SYNTHETIC_AA_OK)), 100);
    } };
    run = await syntheticTimingRun(options, (report) => reports.push(report));
    try {
      const result = await run.clock.settle(run.operation);
      assert.equal(result.status, arrival === 'early-transfer' ? 'sent-unconfirmed' : 'printed');
      if (arrival === 'early-transfer') assert.equal(reports[0].aaBeforeWaitObserved, true, 'CRC-valid early AA is still dropped, not replayed into a later waiter');
      const report = reports[0];
      const aa = report.samples.find((sample) => sample.aaTagged);
      assert.equal(report.aaBeforeWaitObserved, arrival === 'early-transfer');
      assert.equal(aa.stage, arrival === 'after-ad-queue' ? 'completion' : 'transfer');
      assert.equal(aa.aaWaitRegistered, arrival !== 'early-transfer'); assert.equal(aa.completesStrictAA, true);
      assert.equal(aa.classification, 'strict-aa-zero'); assert.equal(report.closingRawCallbacks, 1);
      assert.equal(report.adWriteQueued, true); assert.equal(report.rawCallbacks, 1);
      assert.deepEqual(run.manager.controls.map((packet) => packet[2]), [0xa1, 0xa2, 0xa9, 0xad]);
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('passive closing retains malformed/noncanonical/footerless/fragments/unexpected control input without changing strict admission', async () => {
  const footerless = b64(SYNTHETIC_AA_OK.slice(0, 8));
  const noncanonical = footerless.slice(0, -2) + 'B=';
  for (const [values, classifications, succeeds] of [
    [[footerless], ['incomplete-frame'], false], [[noncanonical], ['invalid-base64'], false],
    [['bad!'], ['invalid-base64'], false],
    [[b64(new Uint8Array([0x22, 0x21, 0xab, 0, 1, 0, 0, 0, 0xff]))], ['strict-other-command'], false],
    [[b64(SYNTHETIC_AA_OK.slice(0, 5)), b64(SYNTHETIC_AA_OK.slice(5))], ['incomplete-frame', 'incomplete-frame'], true],
  ]) {
    const reports = [];
    const run = await syntheticTimingRun({ noComplete: true, onControl(manager, bytes) { if (bytes[2] === 0xad) values.forEach((value) => manager.emit(value)); } }, (report) => reports.push(report));
    try {
      assert.equal((await run.clock.settle(run.operation)).status, succeeds ? 'printed' : 'sent-unconfirmed');
      const samples = reports[0].samples.filter((sample) => sample.stage === 'completion');
      assert.deepEqual(samples.map((sample) => sample.classification), classifications);
      assert.equal(reports[0].closingRawCallbacks, values.length);
      assert.equal(reports[0].completionValidated, succeeds); assert.equal(reports[0].aaBeforeWaitObserved, false);
      if (succeeds) assert.equal(samples.at(-1).completesStrictAA, true, 'Actual stream assembly fact only; raw fragment remains incomplete');
      assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('passive closing aggregate four-sample budget protects actual A9 and first early AA under bounded noise', async () => {
  const reports = [];
  const other = b64(new Uint8Array([0x22, 0x21, 0xab, 0, 1, 0, 0, 0, 0xff]));
  const run = await syntheticTimingRun({ a9Values: [...Array(300).fill('bad!'), b64(SYNTHETIC_A9_OK)], onData(manager, bytes, attempt) {
    if (attempt !== 1) return;
    for (let index = 0; index < 300; index += 1) manager.emit(other);
    manager.emit(b64(SYNTHETIC_AA_OK)); // First AA before registration, then more noise must not evict it.
    for (let index = 0; index < 300; index += 1) manager.emit('bad!');
  } }, (report) => reports.push(report));
  try {
    assert.equal((await run.clock.settle(run.operation)).status, 'printed', 'Only the later mocked strict AA permits success');
    const report = reports[0];
    assert.equal(report.samples.length, 4); assert.equal(report.samples[0].classification, 'strict-a9-zero');
    assert.equal(report.rawCallbacks, 255); assert.equal(report.closingRawCallbacks, 255);
    assert.equal(report.callbacksSaturated, true); assert.equal(report.closingCallbacksSaturated, true);
    assert.equal(report.aaBeforeWaitObserved, true);
    const firstAA = report.samples.find((sample) => sample.aaTagged);
    assert.equal(firstAA.stage, 'transfer'); assert.equal(firstAA.aaWaitRegistered, false); assert.equal(firstAA.completesStrictAA, true);
    assert.ok(report.samples.some((sample) => sample.classification === 'strict-other-command'));
    assert.ok(report.samples.every((sample) => sample.decodedBytes <= 72 && sample.hex.length <= 215));
    assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
});

test('passive closing capture is deadline/disposal bounded and projection rejects private fields and unbounded metadata', () => {
  const h = diagnosticHarness();
  const evidence = h.load('mxw01A9Evidence.js');
  const protocol = h.load('mxw01Protocol.js');
  const collector = evidence.createA9EvidenceCollector(512);
  collector.begin(500); collector.observe(b64(OBSERVED_A9_SHORT8)); collector.queued();
  collector.accepted(protocol.parseObservedShortA9(OBSERVED_A9_SHORT8)); collector.transferWindow(120000);
  h.clock.elapse(119999); collector.observe('bad!', null, false);
  h.clock.elapse(1); collector.observe('bad!', null, false); // Exclusive transfer deadline.
  collector.aaWaitStarted(170025); collector.completionStarted();
  h.clock.elapse(50024); collector.observe('bad!', null, true);
  h.clock.elapse(1); collector.observe('bad!', null, true); // Exclusive AA deadline; no new timer extends it.
  const finished = collector.finish(); assert.equal(finished.closingRawCallbacks, 2);
  collector.observe(b64(SYNTHETIC_AA_OK)); collector.adQueued(); collector.closingFailed('aa-wait', { errorCode: 403 });
  assert.deepEqual(collector.finish(), finished); assert.equal(h.clock.pendingTimers, 0);
  const unsafe = { ...finished, closingFailureScope: 'PRIVATE_SENTINEL', closingRawCallbacks: 1e20, adWriteQueued: 'true',
    aaBeforeWaitObserved: 'true', timestamp: 123456789, nativeError: { message: 'PRIVATE_SENTINEL', deviceID: mac },
    samples: Array(20).fill({ inputChars: 1e20, decodedBytes: 1e20, hex: mac, stage: 'PRIVATE_SENTINEL', aaTagged: {}, completesStrictAA: 'true' }) };
  const safe = evidence.projectA9Evidence(unsafe);
  assert.equal(safe.closingFailureScope, null); assert.equal(safe.closingRawCallbacks, 255); assert.equal(safe.adWriteQueued, false);
  assert.equal(safe.aaBeforeWaitObserved, false); assert.equal(safe.samples.length, 4);
  assert.ok(safe.samples.every((sample) => sample.decodedBytes === 72 && sample.inputChars === 65535 && sample.hex === '' && !sample.aaTagged && !sample.completesStrictAA));
  const text = evidence.formatA9Evidence(unsafe);
  assert.equal(text.includes('PRIVATE_SENTINEL') || text.includes(mac) || text.includes('123456789'), false);
  assert.match(text, /FOUR CONTROL samples TOTAL/);
});

async function reachedClosingBound(hungAD, observer) {
  let resolveAD;
  let rejectAD;
  const run = await syntheticTimingRun({ noComplete: true, onControl(manager, bytes) {
    if (hungAD && bytes[2] === 0xad) return new Promise((resolve, reject) => { resolveAD = resolve; rejectAD = reject; });
  } }, observer);
  for (let turn = 0; turn < 100; turn += 1) {
    await run.clock.flushMicrotasks();
    if (run.manager.controls.some((packet) => packet[2] === 0xad)) break;
    run.clock.fireNextTimer();
  }
  assert.equal(run.manager.dataWrites, 90); assert.equal(run.clock.now, 2500);
  return { ...run, resolveAD, rejectAD };
}

test('passive closing first terminal settlement records scope before later native/catch and ignores late AD outcomes', async () => {
  for (const hungAD of [false, true]) {
    for (const origin of ['monitor', 'disconnect']) {
      for (const first of ['timeout', 'native']) {
        const reports = [];
        const run = await reachedClosingBound(hungAD, (report) => reports.push(report));
        try {
          if (first === 'timeout') run.clock.fireNextTimer();
          emitCauseEvent(run, origin); // Deliberately no microtask between dispatch and native event.
          const result = await run.clock.settle(run.operation);
          const sentUnconfirmed = first === 'timeout' && !hungAD;
          assert.equal(result.status, sentUnconfirmed ? 'sent-unconfirmed' : 'error');
          if (!sentUnconfirmed) assert.equal(result.reason, first === 'timeout' ? 'timeout' : 'connection');
          const report = reports[0];
          assert.equal(report.closingFailureScope, first === 'timeout' && hungAD ? 'final-command' : 'aa-wait', 'Native cancellation settles enrolled AA wait first');
          assert.equal(report.failureOrigin, sentUnconfirmed ? null : first === 'timeout' ? 'timeout' : origin);
          assert.equal(report.nativeErrorCode, sentUnconfirmed || first === 'timeout' ? null : origin === 'monitor' ? 403 : 205);
          const snapshot = JSON.stringify(report);
          if (hungAD) { run.resolveAD(); run.rejectAD({ errorCode: 401, message: 'PRIVATE_SENTINEL' }); }
          run.manager.emit(b64(SYNTHETIC_AA_OK)); await run.clock.flushMicrotasks();
          assert.equal(JSON.stringify(report), snapshot); assert.equal(reports.length, 1); assertNativeRunClean(run);
        } finally { run.clock.dispose(); }
      }
    }
  }
});

test('AA timeout before all image writes resolve remains an error and never becomes sent-unconfirmed', async () => {
  const h = diagnosticHarness();
  const protocol = h.load('mxw01Protocol.js');
  let receive;
  let removed = 0;
  let dataAttempts = 0;
  let adAttempts = 0;
  const reports = [];
  const transport = {
    mtu: 512,
    monitor(callback) { receive = callback; return () => { removed += 1; }; },
    async writeControl(bytes) {
      if (bytes[2] === 0xa1) receive(A1_READY_RX);
      if (bytes[2] === 0xa9) receive(SYNTHETIC_A9_OK);
      if (bytes[2] === 0xad) adAttempts += 1;
    },
    writeData() { dataAttempts += 1; return dataAttempts === 90 ? new Promise(() => {}) : Promise.resolve(); },
  };
  const session = h.load('mxw01Session.js').runMXW01Session(transport, raster(), h.load('printingOperation.js').createCancellation(), undefined, (report) => reports.push(report));
  await assert.rejects(h.clock.settle(session), { code: 'timeout' });
  assert.equal(h.clock.now, 7475, 'The existing last-image-write bound rejects well before the AA deadline');
  assert.equal(dataAttempts, 90); assert.equal(adAttempts, 0); assert.equal(removed, 1);
  assert.equal(reports[0].printResult, 'error'); assert.equal(reports[0].failureOrigin, 'timeout');
  assert.equal(reports[0].closingFailureScope, null); assert.equal(reports[0].adWriteAttempted, false);
  assert.equal(reports[0].imageWritesResolved, 89); assert.equal(reports[0].imageBytesQueued, 4272);
  assert.equal(protocol.parseNotification(SYNTHETIC_AA_OK)?.command, 0xaa, 'Fixture remains a strict AA control only');
  assert.equal(h.clock.pendingTimers, 0);
});

test('passive closing throwing/rejecting consumers preserve the same synthetic timing, errors and cleanup', async () => {
  let baseline;
  for (const observer of [undefined, () => { throw new Error('PRIVATE_SENTINEL'); }, async () => { throw new Error('PRIVATE_SENTINEL'); }]) {
    const run = await syntheticTimingRun({ noComplete: true, onData(manager, bytes, attempt) { if (attempt === 1) manager.emit(b64(SYNTHETIC_AA_OK)); } }, observer);
    try {
      const result = await run.clock.settle(run.operation); await run.clock.flushMicrotasks();
      const actual = { result, trace: run.manager.trace, at: run.clock.now };
      if (!baseline) baseline = actual; else assert.deepEqual(actual, baseline);
      assert.equal(result.status, 'sent-unconfirmed'); assertNativeRunClean(run);
    } finally { run.clock.dispose(); }
  }
});

test('passive closing preserves original native AD rejection identity and retains oversized evidence only within raw caps', async () => {
  const failure = { errorCode: 401, message: 'PRIVATE_SENTINEL', deviceID: mac };
  const reports = [];
  const options = { noComplete: true, onControl(manager, bytes) { if (bytes[2] === 0xad) throw failure; } };
  const off = await evidenceNativeRun(options);
  const on = await evidenceNativeRun(options, (report) => reports.push(report));
  try {
    for (const run of [off, on]) { await assert.rejects(run.clock.settle(run.operation), (error) => error === failure); assertNativeRunClean(run); }
    assert.deepEqual(on.manager.trace, off.manager.trace);
    assert.equal(reports[0].closingFailureScope, 'final-command'); assert.equal(reports[0].adWriteQueued, false);
  } finally { off.clock.dispose(); on.clock.dispose(); }
  const oversizedReports = [];
  const run = await syntheticTimingRun({ noComplete: true, onControl(manager, bytes) {
    if (bytes[2] === 0xad) manager.emit(b64(SYNTHETIC_AA_OK) + 'A'.repeat(100000));
  } }, (report) => oversizedReports.push(report));
  try {
    assert.equal((await run.clock.settle(run.operation)).status, 'sent-unconfirmed');
    const sample = oversizedReports[0].samples.find((item) => item.stage === 'completion');
    assert.equal(sample.truncated, true); assert.equal(sample.decodedBytes, 72); assert.equal(sample.inputChars, 65535);
    assert.equal(sample.classification, 'truncated-input'); assert.ok(sample.hex.length <= 215);
    assert.equal(sample.completesStrictAA, false); assert.equal(oversizedReports[0].completionValidated, false);
    assertNativeRunClean(run);
  } finally { run.clock.dispose(); }
});
