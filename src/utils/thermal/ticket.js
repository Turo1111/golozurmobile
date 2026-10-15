import { PAPER_58MM } from './constants';
import { align, bold, concatBytes, cut, feed, fontSelect, fullCut, init, paperFeed, separator, size, text, twoColumns } from './escpos';
import { loadTicketConfig, TICKET_CONFIG_DEFAULTS } from './ticketConfig';

// Kept for unit-test usage.
const ITEM_LEFT_WIDTH = 22;
const CONTINUATION_INDENT = 3;

// Formato determinista es-AR: no depende de Intl ni de la configuración del teléfono,
// así el mismo ticket produce los mismos bytes en cualquier dispositivo.
export const formatMoney = (value) => {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  const sign = safe < 0 ? '-' : '';
  const [integerPart, decimalPart] = Math.abs(safe).toFixed(2).split('.');
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}$${withThousands},${decimalPart}`;
};

// Fecha del ticket en hora local: dd/mm/aaaa hh:mm.
export const formatDateTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Exported for unit tests; runtime uses buildSaleTicket which computes columns dynamically.
export const wrapItemLines = (item, firstLineWidth = ITEM_LEFT_WIDTH) => {
  const cantidad = item?.cantidad ?? 0;
  const descripcion = item?.descripcion ?? '';
  const title = `${cantidad}x ${descripcion}`.trimEnd();
  const numericWidth = Number(firstLineWidth);
  const width = Number.isFinite(numericWidth) ? Math.max(0, Math.trunc(numericWidth)) : ITEM_LEFT_WIDTH;
  const lines = [title.slice(0, width)];
  const rest = title.slice(width);
  const continuationWidth = ITEM_LEFT_WIDTH - CONTINUATION_INDENT;
  for (let index = 0; index < rest.length; index += continuationWidth) {
    lines.push(' '.repeat(CONTINUATION_INDENT) + rest.slice(index, index + continuationWidth));
  }
  return lines;
};

// ── helpers ──────────────────────────────────────────────────────────────────

// Returns the effective column count for a given font letter ('A' | 'B').
const columnsForFont = (font, cfg) =>
  font === 'B'
    ? (cfg.fontBColumns ?? PAPER_58MM.fontBColumns)
    : (cfg.columns ?? PAPER_58MM.columns);

// Emit font + height commands for a section; returns [fontCmd, sizeCmd] or [].
// Width is always kept at 1x so column math is preserved.
const sectionStart = (font, heightMult) => {
  const parts = [];
  if (font === 'B') parts.push(fontSelect('B'));
  if (heightMult > 1) parts.push(size(1, heightMult));
  return parts;
};

// Reset font and size back to defaults (Font A, 1×1).
// Does NOT emit init() to avoid resetting alignment unnecessarily.
const sectionEnd = (font, heightMult) => {
  const parts = [];
  if (heightMult > 1) parts.push(size(1, 1));
  if (font === 'B') parts.push(fontSelect('A'));
  return parts;
};

// ── layout ───────────────────────────────────────────────────────────────────

// Layout del ticket de venta: encabezado centrado, fecha/hora, cliente,
// ítems continuos, TOTAL, leyenda y corte.
// Acepta un objeto `cfg` con los parámetros de ticketConfig para permitir
// preview en tiempo real desde la pantalla de Settings.
export const buildSaleTicket = (ticketData, cfg = TICKET_CONFIG_DEFAULTS) => {
  const data = ticketData ?? {};
  const items = Array.isArray(data.items) ? data.items : [];

  // Font A column count is the paper width reference (used for separators and the total line).
  const COLUMNS = cfg.columns ?? PAPER_58MM.columns;

  // Column count when the body section uses Font B.
  const bodyColumns = columnsForFont(cfg.bodyFont ?? 'A', cfg);
  const bodyItemLeftWidth = Math.min(22, bodyColumns - 8);
  const bodyContinuationWidth = bodyItemLeftWidth - CONTINUATION_INDENT;

  const parts = [
    // ── Title ───────────────────────────────────────────────────────────────
    init(cfg),
    align('center'),
    size(cfg.titleWidthMultiplier, cfg.titleHeightMultiplier),
    text('GOLOZUR'),
    init(cfg), // full reset after big title — prevents buffer issues on cheap printers

    // ── Header info section (Fecha / Cliente) ────────────────────────────
    align('left'),
    ...sectionStart(cfg.headerFont ?? 'A', cfg.headerHeightMultiplier ?? 1),
    text(`Fecha: ${formatDateTime(data.fecha)}`),
    text(`Cliente: ${data.cliente ?? ''}`),
    ...sectionEnd(cfg.headerFont ?? 'A', cfg.headerHeightMultiplier ?? 1),

    // Separator always in Font A so its width is consistent with the paper.
    separator(COLUMNS),
  ];

  // ── Items section ─────────────────────────────────────────────────────────
  parts.push(...sectionStart(cfg.bodyFont ?? 'A', cfg.bodyHeightMultiplier ?? 1));
  if (cfg.bodyBold) parts.push(bold(true));

  items.forEach((item) => {
    const right = formatMoney(item?.total);
    const firstLineWidth = Math.min(bodyItemLeftWidth, bodyColumns - right.length);

    const wrapLines = (it, firstW) => {
      const cantidad = it?.cantidad ?? 0;
      const descripcion = it?.descripcion ?? '';
      const title = `${cantidad}x ${descripcion}`.trimEnd();
      const w = Number.isFinite(Number(firstW)) ? Math.max(0, Math.trunc(Number(firstW))) : bodyItemLeftWidth;
      const lines = [title.slice(0, w)];
      const rest = title.slice(w);
      for (let i = 0; i < rest.length; i += bodyContinuationWidth) {
        lines.push(' '.repeat(CONTINUATION_INDENT) + rest.slice(i, i + bodyContinuationWidth));
      }
      return lines;
    };

    wrapLines(item, firstLineWidth).forEach((line, index) => {
      if (index === 0) {
        parts.push(twoColumns(line, right, bodyColumns));
      } else {
        parts.push(text(line.padEnd(bodyColumns)));
      }
    });

    // Extra paper advance between items (not after the last). ESC J n: sub-line precision.
    const spacing = cfg.itemSpacing ?? 0;
    if (spacing > 0 && items.indexOf(item) < items.length - 1) {
      parts.push(paperFeed(spacing));
    }
  });

  if (cfg.bodyBold) parts.push(bold(false));
  parts.push(...sectionEnd(cfg.bodyFont ?? 'A', cfg.bodyHeightMultiplier ?? 1));

  // Separator back in Font A.
  parts.push(separator(COLUMNS));

  // ── Total line ────────────────────────────────────────────────────────────
  if (cfg.totalWidthMultiplier > 1 || cfg.totalHeightMultiplier > 1) {
    parts.push(size(cfg.totalWidthMultiplier, cfg.totalHeightMultiplier));
  }
  parts.push(twoColumns('TOTAL', formatMoney(data.total), COLUMNS));
  if (cfg.totalWidthMultiplier > 1 || cfg.totalHeightMultiplier > 1) {
    parts.push(size(1, 1));
  }

  // ── Footer section ────────────────────────────────────────────────────────
  parts.push(align('center'));
  parts.push(...sectionStart(cfg.footerFont ?? 'A', cfg.footerHeightMultiplier ?? 1));
  parts.push(text('*NO VALIDO COMO FACTURA'));
  parts.push(...sectionEnd(cfg.footerFont ?? 'A', cfg.footerHeightMultiplier ?? 1));

  parts.push(align('left'));
  parts.push(feed(cfg.feedLines));

  if (cfg.autoCut) {
    parts.push(cfg.partialCut ? cut() : fullCut());
  }

  return concatBytes(parts);
};

// Convenience: load config from AsyncStorage then build.
export const buildSaleTicketFromStorage = async (ticketData) => {
  const cfg = await loadTicketConfig();
  return buildSaleTicket(ticketData, cfg);
};
