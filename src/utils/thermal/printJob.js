import { createCancellation, PrintingError } from './printingOperation';

let active = null;
const listeners = new Set();
const publish = () => listeners.forEach((listener) => listener(active ? { profile: active.profile, phase: active.phase } : null));

export const subscribePrintJob = (listener) => {
  listeners.add(listener);
  listener(active ? { profile: active.profile, phase: active.phase } : null);
  return () => listeners.delete(listener);
};

export const cancelActivePrint = () => active?.token.cancel();

export const beginPrintJob = () => {
  if (active) throw new PrintingError('busy', 'A print job is already running. Wait or cancel it before printing again.');
  const job = {
    token: createCancellation(), profile: null, phase: 'Preparing receipt',
    select(profile) { job.profile = profile; publish(); },
    finish() { if (active === job) { active = null; publish(); } },
  };
  active = job;
  publish();
  return job;
};
