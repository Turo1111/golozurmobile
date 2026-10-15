import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import usePermissionCheck from '../hooks/usePermissionCheck';
import {
  loadTicketConfig,
  resetTicketConfig,
  saveTicketConfig,
  selectMXW01Printer,
  removeMXW01Printer,
  TICKET_CONFIG_DEFAULTS,
} from '../utils/thermal/ticketConfig';
import { assertNativeMXW01Available, discoverMXW01Printers } from '../utils/thermal/mxw01Ble';
import { createCancellation } from '../utils/thermal/printingOperation';
import { printSyntheticTicketWithA9Evidence } from '../utils/thermal/printSaleTicket';

// ─── helpers ────────────────────────────────────────────────────────────────

const SECTION_ACCENT = '#3b5998';
const HEADER_BLUE = '#2563eb';

/** Single-row setting with a label + description on the left and a control on the right. */
const SettingRow = ({ label, description, control }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingInfo}>
      <Text style={styles.settingLabel}>{label}</Text>
      {description ? <Text style={styles.settingDescription}>{description}</Text> : null}
    </View>
    <View style={styles.settingControl}>{control}</View>
  </View>
);

/** Numeric stepper control (integer, clamped to [min, max]). */
const Stepper = ({ value, min, max, step = 1, label, onChange }) => (
  <View style={styles.stepper}>
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Disminuir ${label}`}
      style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
      onPress={() => onChange(Math.max(min, value - step))}
      disabled={value <= min}
    >
      <Icon name="minus" size={16} color={value <= min ? '#ccc' : '#fff'} />
    </TouchableOpacity>
    <Text style={styles.stepValue}>{value}</Text>
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Aumentar ${label}`}
      style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
      onPress={() => onChange(Math.min(max, value + step))}
      disabled={value >= max}
    >
      <Icon name="plus" size={16} color={value >= max ? '#ccc' : '#fff'} />
    </TouchableOpacity>
  </View>
);

/** Segmented picker for a small set of labelled options. */
const SegmentedPicker = ({ options, value, onChange }) => (
  <View style={styles.segmented}>
    {options.map((opt) => (
      <TouchableOpacity
        key={opt.value}
        accessibilityRole="radio"
        accessibilityState={{ selected: value === opt.value }}
        style={[styles.segment, value === opt.value && styles.segmentActive]}
        onPress={() => onChange(opt.value)}
      >
        <Text style={[styles.segmentText, value === opt.value && styles.segmentTextActive]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── screen ─────────────────────────────────────────────────────────────────

export default function Settings({ navigation }) {
  const { hasPermission, isLoading: permLoading } = usePermissionCheck(
    'read_user',
    () => navigation.goBack(),
  );

  const [cfg, setCfg] = useState(TICKET_CONFIG_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [printerSectionOpen, setPrinterSectionOpen] = useState(false);
  const [formatSectionOpen, setFormatSectionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [scanMessage, setScanMessage] = useState('');
  const scanToken = useRef(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const settingsBusy = useRef(false);
  const formatPatch = useRef({});
  const syntheticToken = useRef(null);
  const [syntheticRunning, setSyntheticRunning] = useState(false);
  const mounted = useRef(true);
  const selectedPrinter = cfg.mxw01History.find((printer) => printer.id === cfg.mxw01DeviceId);

  useEffect(() => {
    mounted.current = true;
    const cancelOperations = () => { scanToken.current?.cancel(); syntheticToken.current?.cancel(); };
    const unsubscribe = navigation.addListener('blur', cancelOperations);
    return () => { mounted.current = false; cancelOperations(); unsubscribe(); };
  }, [navigation]);

  // Load persisted config on mount.
  useEffect(() => {
    loadTicketConfig()
      .then((stored) => { if (mounted.current) setCfg(stored); })
      .finally(() => { if (mounted.current) setLoading(false); });
  }, []);

  const update = useCallback((key, value) => {
    if (settingsBusy.current || syntheticToken.current) return;
    formatPatch.current = { ...formatPatch.current, [key]: value };
    setCfg((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (settingsBusy.current || syntheticToken.current || scanToken.current) return;
    settingsBusy.current = true;
    setSaving(true);
    try {
      const stored = await saveTicketConfig(formatPatch.current);
      setCfg(stored);
      formatPatch.current = {};
      setDirty(false);
      Alert.alert('Guardado', 'La configuración del ticket fue actualizada.');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo guardar la configuración.');
    } finally {
      settingsBusy.current = false;
      setSaving(false);
    }
  };

  const selectTransport = (transport) => {
    if (settingsBusy.current || syntheticToken.current || transport === cfg.printerTransport) return;
    scanToken.current?.cancel();
    if (transport === 'mxw01') {
      try { assertNativeMXW01Available(); }
      catch (error) { Alert.alert('Bluetooth no disponible', error.message); return; }
    }
    settingsBusy.current = true;
    setSaving(true);
    saveTicketConfig({ printerTransport: transport })
      .then((stored) => {
        if (mounted.current) setCfg({ ...stored, ...formatPatch.current });
      })
      .catch((error) => Alert.alert('Error', error.message || 'No se pudo guardar el perfil de impresora.'))
      .finally(() => {
        settingsBusy.current = false;
        if (mounted.current) setSaving(false);
      });
  };

  const scanPrinters = async () => {
    if (scanToken.current || settingsBusy.current || syntheticToken.current) return;
    const token = createCancellation();
    scanToken.current = token;
    setScanning(true);
    setPrinters([]);
    setScanMessage('Buscando impresoras compatibles durante 10 segundos…');
    try {
      const found = await discoverMXW01Printers({ token });
      if (mounted.current) {
        setPrinters(found);
         setScanMessage(found.length ? 'Seleccione una impresora para guardarla.' : 'No se encontraron impresoras compatibles. Encienda la impresora, acérquela y cierre otras conexiones.');
      }
    } catch (error) {
      if (mounted.current) setScanMessage(error.code === 'cancelled' ? 'Búsqueda cancelada.' : (error.message || 'Revise Bluetooth y los permisos de Android.'));
    } finally {
      scanToken.current = null;
      if (mounted.current) setScanning(false);
    }
  };

  const changePrinter = async (operation) => {
    if (settingsBusy.current || syntheticToken.current || scanToken.current) return;
    settingsBusy.current = true;
    setSaving(true);
    try {
      const stored = await operation();
      if (mounted.current) setCfg({ ...stored, ...formatPatch.current });
    } catch (error) {
      if (mounted.current) Alert.alert('Error', error.message || 'No se pudo actualizar la impresora.');
    } finally {
      settingsBusy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const confirmRemoval = (printer) => {
    if (settingsBusy.current || syntheticToken.current || scanToken.current) return;
    Alert.alert('Eliminar impresora', `¿Eliminar ${printer.name || 'la impresora'} (${printer.id})? Si es la actual, quedará sin selección.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => changePrinter(() => removeMXW01Printer(printer.id)) },
    ]);
  };

  const printSyntheticTest = () => {
    if (settingsBusy.current || syntheticToken.current || scanToken.current || saving) return;
    if (dirty || cfg.printerTransport === 'invalid') { Alert.alert('Guarde la configuración primero', 'Use un perfil de impresora válido y guardado antes de realizar el único intento de impresión de prueba.'); return; }
    if (cfg.printerTransport === 'mxw01' && !cfg.mxw01DeviceId) { Alert.alert('Seleccione la impresora deseada', 'Seleccione y guarde una impresora antes de imprimir. No se seleccionará ninguna automáticamente.'); return; }
    const token = createCancellation();
    syntheticToken.current = token; // Also guards overlapping confirmation/double taps.
    setSyntheticRunning(true);
    let started = false;
    const release = () => {
      if (syntheticToken.current !== token) return;
      syntheticToken.current = null;
      if (mounted.current) setSyntheticRunning(false);
    };
    const cancel = () => { token.cancel(); if (!started) release(); };
    const run = async () => {
      if (started) return;
      if (token.error || syntheticToken.current !== token) { release(); return; }
      started = true;
      try {
        await printSyntheticTicketWithA9Evidence({ dirty, token });
      } catch {
        // Result presentation stays in the existing printing facade.
      } finally { release(); }
    };
    Alert.alert('¿Imprimir un ticket de prueba?', 'Inserte papel. Se imprimirá una sola prueba fija, sin datos de ventas ni clientes. Revise el papel antes de repetir.', [
      { text: 'Cancelar', style: 'cancel', onPress: cancel },
      { text: 'Imprimir una vez', onPress: run },
    ], { cancelable: true, onDismiss: () => { if (!started) cancel(); } });
  };

  const handleReset = () => {
    Alert.alert(
      'Restablecer toda la configuración',
      'Se restablecerán el perfil de impresión, las impresoras guardadas y su historial, y el formato del ticket.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer toda la configuración',
          style: 'destructive',
          onPress: async () => {
            if (settingsBusy.current || syntheticToken.current) return;
            scanToken.current?.cancel();
            settingsBusy.current = true;
            setSaving(true);
            try {
              const defaults = await resetTicketConfig();
              setCfg(defaults);
              formatPatch.current = {};
              setDirty(false);
            } catch { Alert.alert('Error', 'No se pudo restablecer la configuración de la impresora.'); }
            finally {
              settingsBusy.current = false;
              if (mounted.current) setSaving(false);
            }
          },
        },
      ],
    );
  };

  // ── render guards ──────────────────────────────────────────────────────────
  if (permLoading || (printerSectionOpen && loading)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={SECTION_ACCENT} />
      </View>
    );
  }

  if (!hasPermission) return null; // onNoPermission already navigated back

  // ── main UI ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={formatSectionOpen ? 'Volver a impresora' : printerSectionOpen ? 'Volver a ajustes' : 'Volver'}
              onPress={() => {
                if (formatSectionOpen) setFormatSectionOpen(false);
                else if (printerSectionOpen) setPrinterSectionOpen(false);
                else navigation.goBack();
              }}
              style={styles.backButton}
            >
              <Icon name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>{formatSectionOpen ? 'Formato del ticket' : printerSectionOpen ? 'Impresora' : 'Configuraciones'}</Text>
              <Text style={styles.headerSubtitle}>
                {formatSectionOpen ? 'Personaliza el diseño del ticket' : printerSectionOpen ? 'Configuración de impresora' : 'Ajustes del sistema'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {!printerSectionOpen ? (
        <ScrollView contentContainerStyle={styles.landingBody}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir configuración de impresora"
            style={styles.moduleCard}
            onPress={() => setPrinterSectionOpen(true)}
          >
            <View style={[styles.moduleIconContainer, { backgroundColor: `${SECTION_ACCENT}20` }]}>
              <Icon name="printer-outline" size={30} color={SECTION_ACCENT} />
            </View>
            <Text style={styles.moduleCardTitle}>IMPRESORA</Text>
            <Text style={styles.moduleCardSubtitle}>Configura la impresora y el formato del ticket.</Text>
            <Text style={styles.moduleDots}>...</Text>
          </Pressable>
        </ScrollView>
      ) : !formatSectionOpen ? (
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.printerSection}>
          <Text style={styles.settingLabel}>Perfil de impresión</Text>
          <Text style={styles.settingDescription}>RawBT es el perfil predeterminado. El perfil Bluetooth requiere la aplicación Android nativa; no funciona en Expo Go.</Text>
          {Platform.OS === 'android' ? (
            <>
              <SegmentedPicker
                options={[{ label: 'RawBT', value: 'rawbt' }, { label: 'Bluetooth', value: 'mxw01' }]}
                value={cfg.printerTransport}
                onChange={selectTransport}
              />
              {saving && <ActivityIndicator style={styles.inlineActivity} size="small" color={SECTION_ACCENT} />}
              {cfg.printerTransport === 'invalid' && <Text style={styles.settingLabel}>Seleccione el perfil deseado o restablezca explícitamente la configuración dañada. La impresión permanecerá bloqueada hasta entonces.</Text>}
            </>
          ) : <Text style={styles.settingDescription}>La impresión térmica solo está disponible en Android.</Text>}
        </View>
        {Platform.OS === 'android' && <View style={styles.printerSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Impresora</Text>
          </View>
          <Text style={styles.settingDescription}>Actual: {selectedPrinter ? `${selectedPrinter.name || 'Impresora'} · ${selectedPrinter.id}` : 'Sin impresora seleccionada'}. La selección siempre es manual.</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={scanning ? 'Cancelar búsqueda de impresoras' : 'Sincronizar dispositivo nuevo'} style={[styles.syncButton, (saving || syntheticRunning) && styles.actionDisabled]} onPress={scanning ? () => scanToken.current?.cancel() : scanPrinters} disabled={saving || syntheticRunning}>
            {scanning ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="sync" size={20} color="#fff" />}
            <Text style={styles.syncButtonText}>{scanning ? 'Cancelar búsqueda' : 'Sincronizar dispositivo nuevo'}</Text>
          </TouchableOpacity>
          {!!scanMessage && <Text style={styles.scanMessage}>{scanMessage}</Text>}
          {printers.map((printer) => (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Seleccionar ${printer.name || 'impresora'} ${printer.id}`} accessibilityState={{ selected: cfg.mxw01DeviceId === printer.id }} key={printer.id} style={styles.discoveredPrinter} disabled={saving || scanning || syntheticRunning} onPress={() => changePrinter(() => selectMXW01Printer(printer))}>
              <View style={styles.settingInfo}><Text style={styles.settingLabel}>{printer.name || 'Impresora'} · {printer.id}</Text><Text style={styles.settingDescription}>Impresora encontrada · toque para seleccionar</Text></View>
              {cfg.mxw01DeviceId === printer.id && <Icon name="check-circle" size={22} color={SECTION_ACCENT} />}
            </TouchableOpacity>
          ))}
          <Text style={styles.groupLabel}>IMPRESORAS GUARDADAS</Text>
          {cfg.mxw01History.length === 0 ? <Text style={styles.settingDescription}>Todavía no hay impresoras guardadas. Busque impresoras cercanas para empezar.</Text> : cfg.mxw01History.slice(0, historyExpanded ? 10 : 3).map((printer) => (
            <View key={printer.id} style={styles.deviceRow}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Seleccionar ${printer.name || 'impresora'} ${printer.id}${cfg.mxw01DeviceId === printer.id ? ', impresora actual' : ''}`} accessibilityState={{ selected: cfg.mxw01DeviceId === printer.id }} style={styles.deviceSelect} disabled={saving || scanning || syntheticRunning} onPress={() => changePrinter(() => selectMXW01Printer(printer))}>
                <View style={styles.settingInfo}><Text style={styles.settingLabel}>{printer.name || 'Impresora'} · {printer.id}</Text><Text style={styles.settingDescription}>{cfg.mxw01DeviceId === printer.id ? 'Impresora actual' : 'Toque para seleccionar'}</Text></View>
                {cfg.mxw01DeviceId === printer.id && <Icon name="check-circle" size={22} color={SECTION_ACCENT} />}
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Eliminar ${printer.name || 'impresora'} ${printer.id}`} disabled={saving || scanning || syntheticRunning} onPress={() => confirmRemoval(printer)} style={styles.removeDeviceButton}>
                <Icon name="trash-can-outline" size={22} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}
          {cfg.mxw01History.length > 3 && <TouchableOpacity accessibilityRole="button" style={styles.moreButton} onPress={() => setHistoryExpanded((expanded) => !expanded)}><Text style={styles.moreButtonText}>{historyExpanded ? 'Mostrar menos' : 'Mostrar más'}</Text></TouchableOpacity>}
        </View>}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Abrir formato del ticket" style={styles.formatCard} onPress={() => setFormatSectionOpen(true)}>
          <View style={styles.formatCardIcon}><Icon name="receipt-text-outline" size={23} color={SECTION_ACCENT} /></View>
          <View style={styles.formatCardInfo}><Text style={styles.formatCardTitle}>Formato del ticket</Text><Text style={styles.settingDescription}>Personaliza el diseño y la impresión</Text></View>
          <Icon name="chevron-right" size={24} color="#888" />
        </TouchableOpacity>
        {Platform.OS === 'android' && <TouchableOpacity accessibilityRole="button" style={[styles.testButton, (dirty || scanning || saving || (cfg.printerTransport === 'invalid' && !syntheticRunning)) && styles.actionDisabled]} onPress={syntheticRunning ? () => syntheticToken.current?.cancel() : printSyntheticTest} disabled={dirty || scanning || saving || (cfg.printerTransport === 'invalid' && !syntheticRunning)}>
          {syntheticRunning ? <ActivityIndicator size="small" color={SECTION_ACCENT} /> : <Icon name="printer-check" size={18} color={SECTION_ACCENT} />}
          <Text style={styles.testButtonText}>{syntheticRunning ? 'Cancelar prueba' : 'Imprimir prueba'}</Text>
        </TouchableOpacity>}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Restablecer toda la configuración" style={styles.resetBtn} onPress={handleReset} disabled={saving || scanning || syntheticRunning}>
          <Icon name="restore" size={16} color="#e74c3c" />
          <Text style={styles.resetBtnText}>Restablecer toda la configuración</Text>
        </TouchableOpacity>
      </ScrollView>
      ) : (
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="receipt" size={20} color={SECTION_ACCENT} />
            <Text style={styles.sectionTitle}>Formato del ticket</Text>
          </View>

          {cfg.printerTransport === 'mxw01' && <SettingRow label="Tamaño de texto" description="12–24 píxeles, ancho fijo de 384 puntos. Verifique el tamaño en papel."
            control={<Stepper value={cfg.mxw01TextSize} min={12} max={24} label="tamaño de texto" onChange={(value) => update('mxw01TextSize', value)} />}
          />}
          <Text style={styles.settingDescription}>La tipografía se comparte entre perfiles. Columnas, avance antes del corte, codificación y corte se aplican a RawBT.</Text>
          {/* Papel */}
          <Text style={styles.groupLabel}>PAPEL</Text>
          <SettingRow
            label="Ancho del papel (columnas)"
            description="58 mm Font A = 32 · 80 mm Font A = 48"
            control={
              <SegmentedPicker
                options={[
                  { label: '32', value: 32 },
                  { label: '40', value: 40 },
                  { label: '48', value: 48 },
                ]}
                value={cfg.columns}
                onChange={(v) => update('columns', v)}
              />
            }
          />

          {/* Título */}
          <Text style={styles.groupLabel}>TÍTULO (GOLOZUR)</Text>
          <SettingRow
            label="Ancho del título"
            description="Multiplicador horizontal 1x–4x"
            control={
              <Stepper
                value={cfg.titleWidthMultiplier}
                min={1}
                max={4}
                label="ancho del título"
                onChange={(v) => update('titleWidthMultiplier', v)}
              />
            }
          />
          <SettingRow
            label="Alto del título"
            description="Multiplicador vertical 1x–4x"
            control={
              <Stepper
                value={cfg.titleHeightMultiplier}
                min={1}
                max={4}
                label="alto del título"
                onChange={(v) => update('titleHeightMultiplier', v)}
              />
            }
          />

          {/* Header info */}
          <Text style={styles.groupLabel}>ENCABEZADO (FECHA / CLIENTE)</Text>
          <SettingRow
            label="Fuente"
            description="Font A = normal · Font B = condensada (más chica)"
            control={
              <SegmentedPicker
                options={[
                  { label: 'A (normal)', value: 'A' },
                  { label: 'B (chica)', value: 'B' },
                ]}
                value={cfg.headerFont ?? 'A'}
                onChange={(v) => update('headerFont', v)}
              />
            }
          />
          <SettingRow
            label="Alto de las letras"
            description="Multiplicador vertical 1x–4x (el ancho no cambia)"
            control={
              <Stepper
                value={cfg.headerHeightMultiplier ?? 1}
                min={1}
                max={4}
                label="alto del encabezado"
                onChange={(v) => update('headerHeightMultiplier', v)}
              />
            }
          />

          {/* Items */}
          <Text style={styles.groupLabel}>LISTADO DE ÍTEMS</Text>
          <SettingRow
            label="Fuente"
            description="Font B = más chica y caben más caracteres por línea"
            control={
              <SegmentedPicker
                options={[
                  { label: 'A (normal)', value: 'A' },
                  { label: 'B (chica)', value: 'B' },
                ]}
                value={cfg.bodyFont ?? 'A'}
                onChange={(v) => update('bodyFont', v)}
              />
            }
          />
          <SettingRow
            label="Alto de las letras"
            description="Multiplicador vertical 1x–4x"
            control={
              <Stepper
                value={cfg.bodyHeightMultiplier ?? 1}
                min={1}
                max={4}
                label="alto del listado de ítems"
                onChange={(v) => update('bodyHeightMultiplier', v)}
              />
            }
          />
          <SettingRow
            label="Texto en negrita"
            description="Aplica ESC E al listado de ítems"
            control={
              <Switch
                value={cfg.bodyBold}
                onValueChange={(v) => update('bodyBold', v)}
                trackColor={{ false: '#ddd', true: '#3b5998' }}
                thumbColor={cfg.bodyBold ? '#fff' : '#f4f3f4'}
              />
            }
          />
          <SettingRow
            label="Espacio entre ítems"
            description={`Avance de papel en puntos (≈ 0.125 mm/pt) · actual: ${cfg.itemSpacing ?? 0} pt ≈ ${((cfg.itemSpacing ?? 0) * 0.125).toFixed(1)} mm`}
            control={
              <Stepper
                value={cfg.itemSpacing ?? 0}
                min={0}
                max={48}
                step={4}
                label="espacio entre ítems"
                onChange={(v) => update('itemSpacing', v)}
              />
            }
          />

          {/* Footer */}
          <Text style={styles.groupLabel}>PIE DEL TICKET</Text>
          <SettingRow
            label="Fuente"
            description="Font A = normal · Font B = condensada (más chica)"
            control={
              <SegmentedPicker
                options={[
                  { label: 'A (normal)', value: 'A' },
                  { label: 'B (chica)', value: 'B' },
                ]}
                value={cfg.footerFont ?? 'A'}
                onChange={(v) => update('footerFont', v)}
              />
            }
          />
          <SettingRow
            label="Alto de las letras"
            description="Multiplicador vertical 1x–4x"
            control={
              <Stepper
                value={cfg.footerHeightMultiplier ?? 1}
                min={1}
                max={4}
                label="alto del pie del ticket"
                onChange={(v) => update('footerHeightMultiplier', v)}
              />
            }
          />

          {/* Total */}
          <Text style={styles.groupLabel}>LÍNEA DE TOTAL</Text>
          <SettingRow
            label="Ancho del total"
            description="1x = normal · 2x = doble ancho"
            control={
              <Stepper
                value={cfg.totalWidthMultiplier}
                min={1}
                max={2}
                label="ancho del total"
                onChange={(v) => update('totalWidthMultiplier', v)}
              />
            }
          />
          <SettingRow
            label="Alto del total"
            description="1x = normal · 2x = doble alto"
            control={
              <Stepper
                value={cfg.totalHeightMultiplier}
                min={1}
                max={2}
                label="alto del total"
                onChange={(v) => update('totalHeightMultiplier', v)}
              />
            }
          />

          {/* Corte */}
          <Text style={styles.groupLabel}>ALIMENTACIÓN Y CORTE</Text>
          <SettingRow
            label="Líneas de avance antes del corte"
            description="Espacio entre el ticket y el corte (0–10)"
            control={
              <Stepper
                value={cfg.feedLines}
                min={0}
                max={10}
                label="líneas de avance antes del corte"
                onChange={(v) => update('feedLines', v)}
              />
            }
          />
          <SettingRow
            label="Corte automático"
            description="La impresora corta el papel al terminar"
            control={
              <Switch
                value={cfg.autoCut}
                onValueChange={(v) => update('autoCut', v)}
                trackColor={{ false: '#ddd', true: '#3b5998' }}
                thumbColor={cfg.autoCut ? '#fff' : '#f4f3f4'}
              />
            }
          />
          {cfg.autoCut && (
            <SettingRow
              label="Tipo de corte"
              description="El corte parcial deja una pequeña unión"
              control={
                <SegmentedPicker
                  options={[
                    { label: 'Parcial', value: true },
                    { label: 'Total', value: false },
                  ]}
                  value={cfg.partialCut}
                  onChange={(v) => update('partialCut', v)}
                />
              }
            />
          )}

          {/* Codificación */}
          <Text style={styles.groupLabel}>CODIFICACIÓN</Text>
          <SettingRow
            label="Comando de página de códigos CP850"
            description="Activar si los acentos no salen bien (ESC t 2)"
            control={
              <Switch
                value={cfg.useCodePageCommand}
                onValueChange={(v) => update('useCodePageCommand', v)}
                trackColor={{ false: '#ddd', true: '#3b5998' }}
                thumbColor={cfg.useCodePageCommand ? '#fff' : '#f4f3f4'}
              />
            }
          />
        </View>

        {/* ── ACTIONS ──────────────────────────────────────────────────── */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Guardar cambios de formato del ticket"
          style={[styles.saveBtn, !dirty && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!dirty || saving || scanning || syntheticRunning}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="content-save" size={18} color="#fff" />
          )}
          <Text style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
        </TouchableOpacity>

      </ScrollView>
      )}
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  headerContainer: {
    backgroundColor: HEADER_BLUE,
    paddingTop: 40,
    paddingBottom: 18,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
  },
  headerSubtitle: {
    color: '#dbeafe',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
  },

  // Body
  body: { padding: 16, paddingBottom: 40 },
  landingBody: {
    padding: 16,
    paddingBottom: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  moduleIconContainer: {
    borderRadius: 50,
    padding: 15,
    marginBottom: 10,
  },
  moduleCardTitle: {
    color: '#333',
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
  },
  moduleCardSubtitle: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    textAlign: 'center',
  },
  moduleDots: {
    color: '#ccc',
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    marginTop: 5,
  },

  // Section card
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  printerSection: { marginBottom: 20 },
  inlineActivity: { alignSelf: 'flex-start', marginTop: 10 },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: SECTION_ACCENT,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  syncButtonText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 14 },
  scanMessage: { color: '#555', fontFamily: 'Cairo-Regular', fontSize: 12, marginTop: 10 },
  discoveredPrinter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingLeft: 12,
    marginTop: 8,
  },
  deviceSelect: { flex: 1, minHeight: 58, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  removeDeviceButton: { padding: 12 },
  moreButton: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 2 },
  moreButtonText: { color: SECTION_ACCENT, fontFamily: 'Cairo-Bold', fontSize: 13 },
  formatCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  formatCardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: `${SECTION_ACCENT}18`, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  formatCardInfo: { flex: 1 },
  formatCardTitle: { color: '#222', fontSize: 15, fontFamily: 'Cairo-Bold' },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 13,
    marginBottom: 12,
  },
  testButtonText: { color: SECTION_ACCENT, fontFamily: 'Cairo-Bold', fontSize: 14 },
  actionDisabled: { opacity: 0.55 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#222',
    marginLeft: 8,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: 'Cairo-Bold',
    color: '#999',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 4,
  },

  // Setting row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 14, fontFamily: 'Cairo-Bold', color: '#333' },
  settingDescription: { fontSize: 11, fontFamily: 'Cairo-Regular', color: '#999', marginTop: 2 },
  settingControl: { flexShrink: 0 },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    backgroundColor: SECTION_ACCENT,
    borderRadius: 6,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnDisabled: { backgroundColor: '#ddd' },
  stepValue: {
    width: 32,
    textAlign: 'center',
    fontFamily: 'Cairo-Bold',
    fontSize: 15,
    color: '#333',
  },

  // Segmented
  segmented: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SECTION_ACCENT,
    overflow: 'hidden',
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  segmentActive: { backgroundColor: SECTION_ACCENT },
  segmentText: { fontFamily: 'Cairo-Regular', fontSize: 12, color: SECTION_ACCENT },
  segmentTextActive: { color: '#fff', fontFamily: 'Cairo-Bold' },

  // Buttons
  saveBtn: {
    backgroundColor: SECTION_ACCENT,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  saveBtnDisabled: { backgroundColor: '#b0b8d1' },
  saveBtnText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 15 },

  resetBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    padding: 12,
  },
  resetBtnText: { color: '#e74c3c', fontFamily: 'Cairo-Regular', fontSize: 13 },
});
