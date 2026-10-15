import { Buffer } from 'buffer';
import { createRasterModel } from './rasterLayout';
import { RASTER_RENDERER_SCRIPT } from './rasterProgram';
import { MXW01_MAX_HEIGHT, MXW01_WIDTH, validateRaster } from './mxw01Protocol';
import { bounded, PrintingError } from './printingOperation';

export const serializeForScript = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

// No external fonts, assets, scripts or Web Bluetooth. CSP blocks subresources
// and connections; native navigation guards block navigation/popups as well.
export const RASTER_RENDERER_HTML = '<!doctype html><html><head>' +
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; connect-src \'none\'; base-uri \'none\'; form-action \'none\'">' +
  '</head><body><script>' + RASTER_RENDERER_SCRIPT + '</script></body></html>';

export const validateRasterMessage = (message) => {
  const height = message?.height;
  const base64 = message?.base64;
  if (message?.width !== MXW01_WIDTH || !Number.isInteger(height) || height < 1 || height > MXW01_MAX_HEIGHT ||
      typeof base64 !== 'string' || base64.length !== height * 48 / 3 * 4 || !/^[A-Za-z0-9+/]+$/.test(base64)) {
    throw new PrintingError('raster', 'Invalid receipt raster from the local renderer. Try again without sending a print.');
  }
  const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  return validateRaster({ width: message.width, height, bytes });
};

export const createRasterBridge = () => {
  let inject = null;
  let ready = false;
  let pending = null;
  let sequence = 0;
  const readyListeners = new Set();
  const unavailable = () => new PrintingError('renderer', 'The local receipt renderer is unavailable. Reopen Golozur and try again.');
  const fail = (error = unavailable()) => {
    ready = false;
    pending?.reject(error);
    readyListeners.forEach(({ reject }) => reject(error));
    readyListeners.clear();
  };
  return {
    attach(sender) {
      if (inject) throw new Error('Only one receipt renderer may be mounted');
      inject = sender;
      return () => { fail(); inject = null; };
    },
    fail,
    receive(raw) {
      if (typeof raw !== 'string' || raw.length > MXW01_MAX_HEIGHT * 64 + 512) return;
      let message;
      try { message = JSON.parse(raw); } catch { return; }
      if (message?.type === 'ready' && inject) {
        ready = true;
        readyListeners.forEach(({ resolve }) => resolve());
        readyListeners.clear();
        return;
      }
      if (!pending || message?.id !== pending.id) return;
      if (message.type === 'error') {
        pending.reject(new PrintingError('raster', 'Receipt rendering failed or exceeded its bounds. Reduce text size or split the sale.'));
      } else if (message.type === 'raster') {
        try { pending.resolve(validateRasterMessage(message)); } catch (error) { pending.reject(error); }
      }
    },
    async render(data, cfg, token, timeoutMs = 10000) {
      if (pending) throw new PrintingError('busy', 'The receipt renderer is busy. Wait for the current print job.');
      if (!inject) throw unavailable();
      const request = { id: ++sequence, model: createRasterModel(data, cfg) };
      const serialized = serializeForScript(request);
      if (serialized.length > 128000) throw new PrintingError('raster', 'Receipt data is too large. Split the sale before printing.');
      let resolve;
      let reject;
      const raster = new Promise((yes, no) => { resolve = yes; reject = no; });
      raster.catch(() => {});
      pending = { id: request.id, resolve, reject };
      try {
        token.check();
        if (!ready) {
          let listener;
          const loaded = new Promise((yes, no) => { listener = { resolve: yes, reject: no }; readyListeners.add(listener); });
          try { await bounded(loaded, timeoutMs, token, 'Receipt renderer startup'); }
          finally { readyListeners.delete(listener); }
        }
        token.check();
        // Install the native waiter before injection: a fast canvas can reply synchronously.
        const response = bounded(raster, timeoutMs, token, 'Receipt rendering');
        response.catch(() => {});
        inject(`window.__renderReceipt(${serialized}); true;`);
        return await response;
      } finally {
        pending = null;
        if (ready && inject) {
          try { inject('window.__clearReceipt(); true;'); } catch { /* WebView may already be gone. */ }
        }
      }
    },
  };
};

export const rasterBridge = createRasterBridge();
export const renderMXW01Receipt = (data, cfg, token) => rasterBridge.render(data, cfg, token);
