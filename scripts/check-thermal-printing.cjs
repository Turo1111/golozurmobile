const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const parser = require('@babel/parser');

const root = path.resolve(__dirname, '..');
const callers = ['NewSale', 'EditSale', 'DetailsSale', 'Sale'];
const files = [
  'App.js', 'app.config.js', 'src/screens/Settings.js', 'src/components/ThermalReceiptRenderer.js',
  ...callers.map((name) => `src/screens/${name}.js`),
  'src/components/AlertPostSale.js', 'src/components/SaleItem.js', 'src/hooks/useThermalPrintWorkflow.js',
  'src/components/ThermalPrintPanel.js', 'src/components/ThermalPrintModal.js',
  'src/redux/alertSlice.js', 'src/redux/loadingSlice.js', 'src/components/Alert.js', 'src/components/Loading.js',
  ...fs.readdirSync(path.join(root, 'src/utils/thermal')).filter((name) => name.endsWith('.js')).map((name) => `src/utils/thermal/${name}`),
];
assert.ok(files.includes('src/utils/thermal/mxw01Diagnostic.js'), 'The A1-only diagnostic must be syntax checked');
assert.ok(files.includes('src/utils/thermal/mxw01A9Evidence.js'), 'Passive A9 evidence must be syntax checked');
for (const file of files) {
  parser.parse(fs.readFileSync(path.join(root, file), 'utf8'), { sourceType: 'unambiguous', plugins: ['jsx'] });
}

// Validate the executable code inside the static strings too. Only literal text
// concatenation is allowed here; there is no native-runtime source recovery/eval.
const programAst = parser.parse(fs.readFileSync(path.join(root, 'src/utils/thermal/rasterProgram.js'), 'utf8'), { sourceType: 'module' });
const strings = new Map();
function staticText(node) {
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'Identifier') { assert.ok(strings.has(node.name)); return strings.get(node.name); }
  if (node.type === 'BinaryExpression' && node.operator === '+') return staticText(node.left) + staticText(node.right);
  assert.equal(node.type, 'TaggedTemplateExpression');
  assert.equal(node.tag.type, 'MemberExpression');
  assert.equal(node.tag.object.name, 'String');
  assert.equal(node.tag.property.name, 'raw');
  assert.equal(node.quasi.expressions.length, 0);
  return node.quasi.quasis[0].value.raw;
}
for (const statement of programAst.program.body) {
  assert.equal(statement.type, 'ExportNamedDeclaration');
  for (const declaration of statement.declaration.declarations) strings.set(declaration.id.name, staticText(declaration.init));
}
assert.ok(strings.has('RECEIPT_LAYOUT_SOURCE') && strings.has('RASTER_RENDERER_SCRIPT'));
parser.parse(strings.get('RASTER_RENDERER_SCRIPT'), { sourceType: 'script' });

// Evaluate declarative config with an EMPTY environment and a no-op dotenv
// import. Never load .env, the Expo CLI, auth sessions, or print full config/extra.
const source = fs.readFileSync(path.join(root, 'app.config.js'), 'utf8');
const { code } = babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] });
const configModule = { exports: {} };
vm.runInNewContext(code, {
  module: configModule, exports: configModule.exports, process: { env: Object.freeze({}) },
  require(name) { assert.equal(name, 'dotenv/config'); return {}; },
}, { timeout: 1000 });
const config = configModule.exports.default().expo;
const plugins = config.plugins.filter((entry) => Array.isArray(entry) && entry[0] === 'react-native-ble-plx');
assert.equal(plugins.length, 1);
const options = plugins[0][1];
assert.equal(options.isBackgroundEnabled, false);
assert.equal(options.neverForLocation, true);
assert.equal(options.bluetoothAlwaysPermission, false);
assert.equal(options.modes.length, 0);
// Explicit SCAN would defeat the pinned plugin's neverForLocation flag insertion.
assert.ok(!config.android.permissions.includes('android.permission.BLUETOOTH_SCAN'));
const manifestHelpers = require('react-native-ble-plx/plugin/build/withBLEAndroidManifest');
const manifest = { manifest: { $: {} } };
manifestHelpers.addLocationPermissionToManifest(manifest, options.neverForLocation);
manifestHelpers.addScanPermissionToManifest(manifest, options.neverForLocation);
assert.equal(manifest.manifest['uses-permission'].find((entry) => entry.$['android:name'] === 'android.permission.BLUETOOTH_SCAN').$['android:usesPermissionFlags'], 'neverForLocation');
assert.ok(manifest.manifest['uses-permission-sdk-23'].every((entry) => entry.$['android:maxSdkVersion'] === '30'));

const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
assert.equal(eas.build.development.developmentClient, true);
assert.equal(eas.build.development.distribution, 'internal');
assert.equal(eas.build.development.android.buildType, 'apk');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.dependencies['react-native-ble-plx'], '3.1.2');
assert.equal(pkg.dependencies.expo, '~49.0.15');
assert.equal(pkg.dependencies['react-native'], '^0.72.10');
assert.equal(pkg.dependencies['expo-dev-client'], '~2.4.13');
assert.equal(pkg.license, 'UNLICENSED');
assert.equal(pkg.scripts['dev:client'], 'expo start --dev-client');
assert.equal(require('react-native-ble-plx/package.json').version, '3.1.2');
const app = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
assert.equal((app.match(/<ThermalReceiptRenderer\s*\/>/g) || []).length, 1);
const component = fs.readFileSync(path.join(root, 'src/components/ThermalReceiptRenderer.js'), 'utf8');
for (const guard of ['allowFileAccess={false}', 'allowUniversalAccessFromFileURLs={false}', 'mixedContentMode="never"', "request.url === 'about:blank'", 'domStorageEnabled={false}']) assert.ok(component.includes(guard));
const settings = fs.readFileSync(path.join(root, 'src/screens/Settings.js'), 'utf8');
assert.ok(settings.includes("'read_user'") && settings.includes('if (!hasPermission) return null'));
for (const removed of ['testMXW01Connection', 'A1 diagnostic result', 'Passive A9 evidence result', 'onA9Evidence']) assert.ok(!settings.includes(removed));
assert.equal((settings.match(/'Imprimir prueba'/g) || []).length, 1);
for (const control of ['slice(0, historyExpanded ? 10 : 3)', 'Mostrar más', 'confirmRemoval', 'selectMXW01Printer', 'removeMXW01Printer', 'Formato del ticket']) assert.ok(settings.includes(control), control);
for (const caller of callers) {
  const source = fs.readFileSync(path.join(root, `src/screens/${caller}.js`), 'utf8');
  assert.ok(source.includes('useThermalPrintWorkflow(navigation)') && source.includes('workflow.start('), caller);
  assert.ok(!source.includes('printSaleTicket('), `${caller} must not bypass shared feedback`);
  assert.ok(source.includes('workflow={workflow}'), `${caller} must bind a recovery host`);
  assert.ok(source.includes('JSON.parse(JSON.stringify('), `${caller} must snapshot provided content`);
  const permissions = caller === 'NewSale' ? ['create_sale'] : caller === 'Sale' ? ['read_sale', 'create_sale', 'update_sale'] : ['update_sale'];
  for (const permission of permissions) assert.ok(source.includes(`usePermissionCheck('${permission}'`));
  assert.ok(source.includes(caller === 'NewSale' || caller === 'EditSale' ? '<AlertPostSale' : '<ThermalPrintModal'));
}
// Verify thermal handlers remain nested under the original platform/permission gates.
for (const [file, handler, permission] of [['src/components/AlertPostSale.js', 'print', 'hasPermissionUpdateSale'], ['src/screens/DetailsSale.js', 'printThermalSale', 'hasPermissionEditSale'], ['src/components/SaleItem.js', 'onPrintThermal', 'hasPermissionUpdateSale']]) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] }); let found = 0;
  function walk(node, gates = []) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'LogicalExpression') { walk(node.left, gates); walk(node.right, [...gates, source.slice(node.left.start, node.left.end)]); return; }
    if (node.type === 'JSXAttribute' && node.name.name === 'onPress' && node.value?.expression?.name === handler) {
      assert.ok(gates.some((gate) => gate.includes(permission)), file);
      assert.ok(gates.some((gate) => gate.includes("Platform.OS === 'android'")), file); found++;
    }
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach((child) => walk(child, gates)); else if (value && typeof value === 'object') walk(value, gates);
  }
  walk(ast); assert.ok(found > 0, file);
}
const postSale = fs.readFileSync(path.join(root, 'src/components/AlertPostSale.js'), 'utf8');
for (const binding of ['workflow.cancel(); onClose()', 'workflow.cancel(); post()', '<ThermalPrintPanel workflow={workflow}', 'open && !blocking && !loading.open']) assert.ok(postSale.includes(binding));
const facade = fs.readFileSync(path.join(root, 'src/utils/thermal/printSaleTicket.js'), 'utf8');
assert.ok(facade.includes('request = {}, options = {}') && facade.includes('cancellation.subscribe'));
assert.ok(facade.includes("!silent && result.status === 'sent-unconfirmed'") && facade.includes("if (!silent) Alert.alert('Printing unavailable'"));
const workflow = fs.readFileSync(path.join(root, 'src/utils/thermal/thermalPrintWorkflow.js'), 'utf8');
assert.ok(workflow.includes('No recibimos confirmación de la impresora. Revisá el ticket; si no salió, reintentá o revisá la conexión.'));
const workflowCode = babel.transformSync(workflow, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
const workflowModule = { exports: {} };
new Function('require', 'module', 'exports', workflowCode)((name) => {
  assert.equal(name, './printingOperation');
  return { createCancellation: () => ({ error: null, check() {} }) };
}, workflowModule, workflowModule.exports);
const createThermalPrintWorkflow = workflowModule.exports.createThermalPrintWorkflow;
async function verifyWorkflowPresentations() {
for (const [result, expectedType, expectedBlocking, expectedMessage] of [
  [{ status: 'printed' }, 'success', false, 'Impresión finalizó correctamente'],
  [{ status: 'sent-unconfirmed', completionSignal: 'observed-aa-shape' }, 'success', false, 'Impresión finalizó correctamente'],
  [{ status: 'sent-unconfirmed' }, 'warning', true, 'No recibimos confirmación de la impresora. Revisá el ticket; si no salió, reintentá o revisá la conexión.'],
  [{ status: 'omitted' }, 'warning', false, 'Impresión omitida'],
  [{ status: 'error', message: 'Transport failed' }, 'error', false, 'Transport failed'],
]) {
  let calls = 0, receivedOptions, presentation;
  const resultPromise = createThermalPrintWorkflow({
    print: async (_request, options) => { calls++; receivedOptions = options; return result; },
    acquireLoading() {}, releaseLoading() {}, present(value) { presentation = value; },
  }).start({ mode: 'provided' });
  assert.ok(resultPromise, 'A workflow should admit the single print attempt');
  assert.deepEqual(await resultPromise, result);
  assert.equal(calls, 1, 'The workflow must never retry or resend automatically');
  assert.equal(receivedOptions.silent, true, 'The shared workflow owns user-facing feedback');
  assert.equal(presentation.type, expectedType);
  assert.equal(presentation.blocking, expectedBlocking);
  assert.equal(presentation.message, expectedMessage);
}
}
const diagnosticAst = parser.parse(fs.readFileSync(path.join(root, 'src/utils/thermal/mxw01Diagnostic.js'), 'utf8'), { sourceType: 'module' });
for (const statement of diagnosticAst.program.body.filter((node) => node.type === 'ImportDeclaration')) {
  assert.ok(['buffer', './mxw01Protocol', './printingOperation'].includes(statement.source.value), 'Diagnostic must not import sales, renderer, storage writers or a print facade');
}
const evidenceAst = parser.parse(fs.readFileSync(path.join(root, 'src/utils/thermal/mxw01A9Evidence.js'), 'utf8'), { sourceType: 'module' });
for (const statement of evidenceAst.program.body.filter((node) => node.type === 'ImportDeclaration')) {
  assert.ok(['./mxw01Protocol', './mxw01Diagnostic'].includes(statement.source.value), 'Passive evidence must not import writers, BLE manager, sales, storage or renderer');
}
verifyWorkflowPresentations().then(() => {
  console.log(`PASS: syntax (${files.length} feature/entry files), caller recovery/feedback and preserved gates, production Settings controls, semantic workflow presentations, static embedded renderer, pinned BLE permission flags, development APK profile, renderer mount/guards. No environment, build, network or hardware execution.`);
}).catch((error) => { console.error(error); process.exitCode = 1; });
