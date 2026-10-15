export class PrintingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PrintingError';
    this.code = code;
  }
}

export const createCancellation = () => {
  let error = null;
  const listeners = new Set();
  return {
    get error() { return error; },
    check() { if (error) throw error; },
    subscribe(listener) {
      if (error) listener(error);
      else listeners.add(listener);
      return () => listeners.delete(listener);
    },
    cancel(reason = new PrintingError('cancelled', 'Printing cancelled. Check the paper before retrying.')) {
      if (error) return;
      error = reason;
      listeners.forEach((listener) => listener(error));
      listeners.clear();
    },
  };
};

// Also consumes late resolutions/rejections of native promises after cancellation.
export const bounded = (promise, milliseconds, token, label = 'Printer operation', onReject) =>
  new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe = () => {};
    const finish = (fn, value, source) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      // Optional passive observation at settlement, with source identity (deadline/promise/cancellation).
      // The source is internal metadata; it never replaces the rejection reason or changes settlement.
      if (fn === reject && typeof onReject === 'function') {
        try {
          const observed = onReject(value, source);
          if (observed && typeof observed.then === 'function') Promise.resolve(observed).catch(() => {});
        } catch { /* Observer failures cannot replace the original rejection. */ }
      }
      fn(value);
    };
    const timer = setTimeout(() => finish(reject, new PrintingError(
      'timeout', `${label} timed out. Check the printer and paper before retrying; nothing is resent automatically.`,
    ), 'deadline'), milliseconds);
    Promise.resolve(promise).then((value) => finish(resolve, value, 'promise'), (error) => finish(reject, error, 'promise'));
    if (token) unsubscribe = token.subscribe((error) => finish(reject, error, 'cancellation'));
  });

export const pause = (milliseconds, token) => new Promise((resolve, reject) => {
  let unsubscribe = () => {};
  const timer = setTimeout(() => { unsubscribe(); resolve(); }, milliseconds);
  if (token) unsubscribe = token.subscribe((error) => { clearTimeout(timer); unsubscribe(); reject(error); });
});
