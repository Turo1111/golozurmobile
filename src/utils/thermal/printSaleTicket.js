import { Alert, AppState, Platform } from 'react-native';
import { getSaleTicketData } from './saleTicketData';
import { buildSaleTicket } from './ticket';
import { sendToRawBT } from './rawbt';
import { loadTicketConfig } from './ticketConfig';
import { assertNativeMXW01Available, printMXW01Raster, requestMXW01Permissions } from './mxw01Ble';
import { renderMXW01Receipt } from './rasterRenderer';
import { beginPrintJob } from './printJob';
import { bounded, PrintingError } from './printingOperation';
import { failedA9Evidence, publishA9Evidence } from './mxw01A9Evidence';

// Fachada única de impresión térmica: plataforma → datos → bytes → transporte.
// Resultado: { status: 'printed' | 'sent-unconfirmed' | 'omitted' | 'error', reason? }.
const runPrintTicket = async ({ mode, saleId, provided } = {}, synthetic = null, { token, silent = false } = {}) => {
  // RawBT es Android-only: en iOS no se intenta imprimir (las pantallas ocultan la acción).
  if (Platform.OS !== 'android') {
    return { status: 'omitted', reason: 'platform' };
  }

  let job;
  let foreground;
  let unsubscribe = () => {};
  let evidencePublished = false;
  let evidenceEnabled = typeof synthetic?.onA9Evidence === 'function';
  const receiveEvidence = (report) => { evidencePublished = true; publishA9Evidence(synthetic?.onA9Evidence, report); };
  try {
    if (synthetic?.dirty) throw new PrintingError('unsaved', 'Save Settings before the synthetic attempt.');
    job = beginPrintJob();
    const cancellation = token || synthetic?.token;
    if (cancellation) unsubscribe = cancellation.subscribe((error) => job.token.cancel(error));
    job.token.check();
    const cfg = await bounded(loadTicketConfig(), 5000, job.token, 'Printer settings');
    if (!['rawbt', 'mxw01'].includes(cfg.printerTransport)) {
      throw new PrintingError('config', 'Printer settings could not be read or contain an unknown profile. Open Settings and select/save the intended profile, or explicitly reset corrupt settings before printing.');
    }
    job.select(cfg.printerTransport);
    if (cfg.printerTransport === 'rawbt') evidenceEnabled = false;
    if (cfg.printerTransport === 'mxw01') {
      assertNativeMXW01Available();
      if (!cfg.mxw01DeviceId) throw new PrintingError('not-selected', 'Select and save an MXW01 printer in Settings before printing.');
      if (AppState.currentState !== 'active') throw new PrintingError('foreground', 'Keep Golozur open to print with MXW01.');
      await requestMXW01Permissions(job.token);
      if (AppState.currentState !== 'active') throw new PrintingError('foreground', 'Return to Golozur before printing with MXW01.');
      foreground = AppState.addEventListener('change', (state) => {
        if (state !== 'active') job.token.cancel(new PrintingError('foreground', 'Golozur left the foreground. Check the paper before retrying.'));
      });
    }
    const ticketData = await bounded(getSaleTicketData({ mode, saleId, provided }), 30000, job.token, 'Sale loading');
    job.token.check();
    if (cfg.printerTransport === 'rawbt') {
      const bytes = buildSaleTicket(ticketData, cfg);
      const sent = await sendToRawBT(bytes, { silent });
      // Legacy contract: printed means RawBT accepted the URL, not a hardware ACK.
      return sent ? { status: 'printed' } : { status: 'error', reason: 'rawbt' };
    }
    const raster = await renderMXW01Receipt(ticketData, cfg, job.token);
    // Only this private fixed-synthetic context selects the trial, never the observer or request/config fields.
    const result = await printMXW01Raster(cfg, raster, job.token, evidenceEnabled ? receiveEvidence : undefined, synthetic ? 500 : undefined);
    if (!silent && result.status === 'sent-unconfirmed') {
      const observedSignal = result.completionSignal === 'observed-aa-shape';
      const title = observedSignal ? 'Ciclo de impresión finalizado' : 'Impresión no confirmada';
      const message = observedSignal
        ? 'Se detectó la señal de fin de ciclo. Revise que el recibo haya salido completo; la impresora no envió una confirmación validada.'
        : 'Datos enviados; impresión no confirmada. Revise el papel antes de reintentar.';
      try { Alert.alert(title, message); }
      catch { /* Informational UI failure cannot turn an unconfirmed send into a print error. */ }
    }
    return result;
  } catch (error) {
    if (evidenceEnabled && !evidencePublished) receiveEvidence(failedA9Evidence(error));
    const message = error instanceof PrintingError ? error.message
      : 'Printing failed. Check the sale data, Bluetooth permissions, printer connection and paper before retrying. Nothing is resent automatically.';
    if (!silent) Alert.alert('Printing unavailable', message);
    return { status: 'error', reason: error.code || 'data', message };
  } finally {
    unsubscribe();
    foreground?.remove();
    job?.finish();
  }
};

export const printSaleTicket = async (request = {}, options = {}) => runPrintTicket(request, null, options);

// Fixed provided fixture only. Normal sale callers cannot enable capture by adding options.
export const printSyntheticTicketWithA9Evidence = async ({ dirty = false, token, onA9Evidence } = {}) =>
  runPrintTicket({ mode: 'provided', provided: {
    cliente: 'SYNTHETIC TEST — NO CUSTOMER DATA', createdAt: new Date().toISOString(),
    itemsSale: [
      { cantidad: 2, descripcion: 'Café and a long product description to check measured wrapping and accents', total: 1234.5 },
      { cantidad: 1, descripcion: 'Second item', total: 56.7 },
    ], total: 1291.2,
  } }, { dirty, token, onA9Evidence });
