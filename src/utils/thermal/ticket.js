import { PAPER_58MM } from './constants';
import { align, bold, concatBytes, cut, feed, fontSelect, fullCut, init, paperFeed, separator, size, text, twoColumns } from './escpos';
import { loadTicketConfig, TICKET_CONFIG_DEFAULTS } from './ticketConfig';

// Kept for unit-test usage.
const ITEM_LEFT_WIDTH = 22;
const CONTINUATION_INDENT = 3;
// La dirección del cliente sigue debajo del nombre con una sangría corta.
const CUSTOMER_INDENT = 2;
// La leyenda legal se imprime en un bloque angosto para que corte en dos líneas.
const DISCLAIMER_COLUMNS = 22;

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

// Fecha del ticket en hora local, solo día: aaaa-mm-dd.
export const formatDateOnly = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Importes de ítem: sin separador de miles y sin decimales cuando son enteros.
export const formatShortMoney = (value) => {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  const sign = safe < 0 ? '-' : '';
  const [integerPart, decimalPart] = Math.abs(safe).toFixed(2).split('.');
  const decimals = decimalPart === '00' ? '' : `,${decimalPart}`;
  return `${sign}$${integerPart}${decimals}`;
};

// Importe sin símbolo: el `$` va en la etiqueta ("Total Neto $").
export const formatAmount = (value) => formatMoney(value).replace('$', '');

// Corta texto por palabras con sangría en las líneas de continuación.
export const wrapIndented = (value, width, indent = 0) => {
  const clean = String(value ?? '').replace(/\s+/g, ' ').trim();
  const safeWidth = Math.max(1, Math.trunc(Number(width) || 1));
  const safeIndent = Math.max(0, Math.trunc(Number(indent) || 0));
  const lines = [];
  let line = '';
  let limit = safeWidth;
  const nextLimit = () => Math.max(1, safeWidth - safeIndent);

  clean.split(' ').forEach((word) => {
    if (word === '') return;
    let rest = word;
    if (line === '') {
      while (rest.length > limit) {
        lines.push(rest.slice(0, limit));
        rest = rest.slice(limit);
        limit = nextLimit();
      }
      line = rest;
      return;
    }
    if (line.length + 1 + rest.length <= limit) {
      line += ` ${rest}`;
      return;
    }
    lines.push(line);
    line = '';
    limit = nextLimit();
    while (rest.length > limit) {
      lines.push(rest.slice(0, limit));
      rest = rest.slice(limit);
      limit = nextLimit();
    }
    line = rest;
  });

  if (line !== '' || lines.length === 0) {
    lines.push(line);
  }
  return lines.map((text, index) => (index === 0 ? text : ' '.repeat(safeIndent) + text));
};

// Exported for unit tests; runtime uses buildSaleTicket which computes columns dynamically.
export const wrapItemLines = (item, firstLineWidth = ITEM_LEFT_WIDTH) => {
  const cantidad = item?.cantidad ?? 0;
  const descripcion = item?.descripcion ?? '';
  const title = `${cantidad} ${descripcion}`.trimEnd();
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
  const headerColumns = columnsForFont(cfg.headerFont ?? 'A', cfg);
  const footerColumns = columnsForFont(cfg.footerFont ?? 'A', cfg);
  const customerLines = wrapIndented(`Cliente: ${data.cliente ?? ''}`, headerColumns, CUSTOMER_INDENT);

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
    text(`Fecha: ${formatDateOnly(data.fecha)}`),
    ...customerLines.map((line) => text(line)),
    ...sectionEnd(cfg.headerFont ?? 'A', cfg.headerHeightMultiplier ?? 1),

    // ── Invoice disclaimer ────────────────────────────────────────────────
    // Sits above the dashed separator at the operator's request.
    align('center'),
    ...sectionStart(cfg.footerFont ?? 'A', cfg.footerHeightMultiplier ?? 1),
    ...wrapIndented('*NO VALIDO COMO FACTURA', Math.min(footerColumns, DISCLAIMER_COLUMNS), 0).map((line) => text(line)),
    ...sectionEnd(cfg.footerFont ?? 'A', cfg.footerHeightMultiplier ?? 1),
    align('left'),

    // Separator always in Font A so its width is consistent with the paper.
    separator(COLUMNS),
  ];

  // ── Items section ─────────────────────────────────────────────────────────
  parts.push(...sectionStart(cfg.bodyFont ?? 'A', cfg.bodyHeightMultiplier ?? 1));
  if (cfg.bodyBold) parts.push(bold(true));

  items.forEach((item, index) => {
    // Nombre en mayúsculas, en su propia línea (con corte por ancho).
    const description = String(item?.descripcion ?? '').toUpperCase();
    wrapIndented(description, bodyColumns, 0).forEach((line) => parts.push(text(line)));

    // Presentación ("X1KG") en su propia línea cuando el nombre no la incluye.
    const presentation = String(item?.presentacion ?? '');
    if (presentation !== '') {
      parts.push(text(presentation));
    }

    // Renglón de precio: cantidad x unitario a la izquierda, total a la derecha.
    const quantity = `${item?.cantidad ?? 0}x${formatShortMoney(item?.precioUnitario)}`;
    parts.push(twoColumns(quantity, formatShortMoney(item?.total), bodyColumns));

    // Extra paper advance between items (not after the last). ESC J n: sub-line precision.
    const spacing = cfg.itemSpacing ?? 0;
    if (spacing > 0 && index < items.length - 1) {
      parts.push(paperFeed(spacing));
    }
  });

  if (cfg.bodyBold) parts.push(bold(false));
  parts.push(...sectionEnd(cfg.bodyFont ?? 'A', cfg.bodyHeightMultiplier ?? 1));

  // Separator back in Font A.
  parts.push(separator(COLUMNS));

  // ── Total block ───────────────────────────────────────────────────────────
  const totalScaled = cfg.totalWidthMultiplier > 1 || cfg.totalHeightMultiplier > 1;
  if (totalScaled) {
    parts.push(size(cfg.totalWidthMultiplier, cfg.totalHeightMultiplier));
  }
  parts.push(text('Total Neto $'));
  parts.push(align('center'));
  parts.push(text(formatAmount(data.total)));
  parts.push(align('left'));
  if (totalScaled) {
    parts.push(size(1, 1));
  }

  // ── Feed & cut ────────────────────────────────────────────────────────────
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
