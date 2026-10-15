import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { useAppDispatch } from '../redux/hook';
import { acquireLoading, releaseLoading } from '../redux/loadingSlice';
import { setAlert } from '../redux/alertSlice';
import { createThermalPrintWorkflow } from '../utils/thermal/thermalPrintWorkflow';
import { discoverMXW01Printers } from '../utils/thermal/mxw01Ble';
import { isMXW01DeviceId, loadTicketConfig, selectMXW01Printer } from '../utils/thermal/ticketConfig';
import { printSaleTicket } from '../utils/thermal/printSaleTicket';

// Keep recovery inside PR3 admission: its dispatch awaits explicit selection.
const createRecovery = (dispatch) => {
  let pending = null, snapshot = { phase: 'idle' }, owner;
  const listeners = new Set();
  const publish = (value) => {
    snapshot = { id: owner, candidates: [], ...value };
    listeners.forEach((listener) => listener(snapshot));
  };
  const release = () => dispatch(releaseLoading(owner));
  const loading = (message) => dispatch(acquireLoading({ token: owner, message, thermal: true }));
  const valid = (id) => pending && id === owner && !pending.token.error;
  const workflow = createThermalPrintWorkflow({
    acquireLoading(payload) { owner = payload.token; dispatch(acquireLoading(payload)); },
    releaseLoading: (id) => dispatch(releaseLoading(id)),
    present: (notice) => dispatch(setAlert(notice)),
    async print(request, options) {
      const run = { token: options.token };
      pending = run;
      publish({ phase: 'preparing' });
      try {
        const cfg = await loadTicketConfig();
        run.token.check();
        if (cfg.printerTransport === 'mxw01' && !isMXW01DeviceId(cfg.mxw01DeviceId)) {
          await new Promise((resolve, reject) => {
            run.resume = resolve;
            run.unsubscribe = run.token.subscribe(reject);
            release();
             publish({ phase: 'needs-selection', message: 'Seleccione una impresora. Busque impresoras cercanas.' });
          });
        }
        run.token.check();
        loading('Imprimiendo...');
        publish({ phase: 'printing' });
        return await printSaleTicket(request, options);
      } finally {
        run.unsubscribe?.();
        if (pending === run) pending = null;
      }
    },
  });
  workflow.subscribe((value) => {
    if (value.phase === 'settled') publish(value);
  });
  const scan = async (id) => {
    if (!valid(id) || !['needs-selection', 'scan-error', 'selecting'].includes(snapshot.phase)) return;
    const run = pending;
   publish({ phase: 'scanning', message: 'Buscando impresoras compatibles durante 10 segundos...' });
   loading('Buscando impresoras...');
    try {
      const candidates = await discoverMXW01Printers({ token: run.token });
      if (pending !== run || run.token.error) return;
      publish({ phase: candidates.length ? 'selecting' : 'scan-error', candidates,
       message: candidates.length ? 'Seleccione una impresora para continuar.' : 'No se encontraron impresoras compatibles. Encienda la impresora y vuelva a intentarlo.' });
    } catch (error) {
     if (pending === run && !run.token.error) publish({ phase: 'scan-error', message: error.message || 'No se pudo realizar la búsqueda. Revise Bluetooth y vuelva a intentarlo.' });
    } finally { if (pending === run) release(); }
  };
  const select = async (device, id) => {
    if (!valid(id) || !['selecting', 'save-error'].includes(snapshot.phase)) return;
    const candidate = snapshot.candidates.find((item) => item.id === device?.id);
    if (!candidate) return;
    const run = pending, candidates = snapshot.candidates;
    run.candidate = candidate;
   publish({ phase: 'saving', candidates, message: 'Guardando impresora...' });
    try {
      // This explicit preference survives print cancellation; never compensate.
      await selectMXW01Printer(candidate);
      if (pending !== run || run.token.error) return;
      publish({ phase: 'resuming' });
      run.resume();
    } catch {
      if (pending === run && !run.token.error) publish({ phase: 'save-error', candidates,
       message: 'No se pudo guardar. Revise el almacenamiento y vuelva a intentarlo o cancele.' });
    }
  };
  return {
    start: workflow.start,
    cancel(id) { if (valid(id)) workflow.cancel(); },
    scan, select,
    retry(id) {
      if (!valid(id)) return;
      return snapshot.phase === 'save-error' ? select(pending.candidate, id) : snapshot.phase === 'scan-error' ? scan(id) : undefined;
    },
    subscribe(listener) { listeners.add(listener); listener(snapshot); return () => listeners.delete(listener); },
  };
};

export default function useThermalPrintWorkflow(navigation) {
  const dispatch = useAppDispatch();
  const ref = useRef(null);
  if (!ref.current) ref.current = createRecovery(dispatch);
  const controller = ref.current;
  const [snapshot, setSnapshot] = useState({ phase: 'idle' });
  const latest = useRef(snapshot);
  latest.current = snapshot;
  useEffect(() => {
    const unsubscribe = controller.subscribe((value) => { latest.current = value; setSnapshot(value); });
    const cancel = () => controller.cancel(latest.current.id);
    const blur = navigation?.addListener('blur', cancel);
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (['idle', 'settled'].includes(latest.current.phase)) return false;
      cancel(); return true;
    });
    return () => { cancel(); unsubscribe(); blur?.(); back.remove(); };
  }, [controller, navigation]);
  return { snapshot, start: controller.start, cancel: () => controller.cancel(snapshot.id),
    scan: () => controller.scan(snapshot.id), select: (device) => controller.select(device, snapshot.id), retry: () => controller.retry(snapshot.id) };
}
