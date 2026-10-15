import { createCancellation } from './printingOperation';

let active = null;
let sequence = 0;
export const cancelThermalPrint = (id) => { if (active?.id === id) active.cancel(); };
export const UNCONFIRMED_MESSAGE = 'No recibimos confirmación de la impresora. Revisá el ticket; si no salió, reintentá o revisá la conexión.';

// Dependencies bind Redux and the silent facade without importing UI or sale state.
export const createThermalPrintWorkflow = ({ print, acquireLoading, releaseLoading, present }) => {
  let current = null;
  let snapshot = { phase: 'idle' };
  const listeners = new Set();
  const publish = (value) => { snapshot = value; listeners.forEach((listener) => listener(snapshot)); };
  const cancel = () => {
    if (!current || current.token.error) return;
    current.token.cancel();
    releaseLoading(current.id);
    publish({ phase: 'settled', cancelled: true });
  };
  return {
    subscribe(listener) { listeners.add(listener); listener(snapshot); return () => listeners.delete(listener); },
    cancel,
    start(request) {
      if (active) return null;
      const run = { id: `thermal-${++sequence}`, token: createCancellation(), cancel };
      active = current = run;
      return (async () => {
        let result;
        try {
          acquireLoading({ token: run.id, message: 'Imprimiendo...', thermal: true });
          publish({ phase: 'printing', id: run.id });
          run.token.check();
          result = await print(request, { token: run.token, silent: true });
        } catch (error) {
          result = { status: 'error', message: error?.message };
        } finally {
          releaseLoading(run.id);
          if (active === run) active = null;
          if (current === run) current = null;
        }
        if (run.token.error) return { status: 'omitted', reason: 'cancelled' };
        if (!result || !['printed', 'sent-unconfirmed', 'omitted', 'error'].includes(result.status)) result = { status: 'error' };
        const status = result.status;
        const observedSignal = status === 'sent-unconfirmed' && result.completionSignal === 'observed-aa-shape';
        const successPresentation = status === 'printed' || observedSignal;
        present({ id: run.id, thermal: true, blocking: status === 'sent-unconfirmed' && !observedSignal,
          type: successPresentation ? 'success' : status === 'error' ? 'error' : 'warning',
          message: successPresentation ? 'Impresión finalizó correctamente' : status === 'sent-unconfirmed' ? UNCONFIRMED_MESSAGE : status === 'omitted' ? 'Impresión omitida' : result.message || 'No se pudo imprimir. Revisá la conexión antes de reintentar.' });
        publish({ phase: 'settled', result });
        return result;
      })();
    },
  };
};
