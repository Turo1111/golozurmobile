import { PAPER_58MM } from './constants';
import { align, concatBytes, cut, feed, init, separator, size, text, twoColumns } from './escpos';

const COLUMNS = PAPER_58MM.columns;
const ITEM_LEFT_WIDTH = 22; // columna izquierda de la fila de ítem (precio a la derecha)
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

// Envuelve `{cantidad}x {descripción}` en la columna izquierda de 22 columnas.
// Las continuaciones suman 3 espacios de indentación: 3 + hasta 19.
export const wrapItemLines = (item) => {
  const cantidad = item?.cantidad ?? 0;
  const descripcion = item?.descripcion ?? '';
  const title = `${cantidad}x ${descripcion}`.trimEnd();
  const lines = [title.slice(0, ITEM_LEFT_WIDTH)];
  const rest = title.slice(ITEM_LEFT_WIDTH);
  const continuationWidth = ITEM_LEFT_WIDTH - CONTINUATION_INDENT;
  for (let index = 0; index < rest.length; index += continuationWidth) {
    lines.push(' '.repeat(CONTINUATION_INDENT) + rest.slice(index, index + continuationWidth));
  }
  return lines;
};

// Layout del ticket de venta (RFC §7.5): encabezado centrado, fecha/hora, cliente,
// ítems continuos (sin chunks ni "Ticket X de Y"), TOTAL, leyenda y corte parcial.
export const buildSaleTicket = (ticketData) => {
  const data = ticketData ?? {};
  const items = Array.isArray(data.items) ? data.items : [];

  const parts = [
    init(),
    align('center'),
    size(2, 2),
    text('GOLOZUR'),
    size(1, 1),
    align('left'),
    text(`Fecha: ${formatDateTime(data.fecha)}`),
    text(`Cliente: ${data.cliente ?? ''}`),
    separator(),
  ];

  items.forEach((item) => {
    wrapItemLines(item).forEach((line, index) => {
      if (index === 0) {
        parts.push(twoColumns(line, formatMoney(item?.total)));
      } else {
        parts.push(text(line.padEnd(COLUMNS)));
      }
    });
  });

  parts.push(separator());
  parts.push(twoColumns('TOTAL', formatMoney(data.total)));
  parts.push(align('center'));
  parts.push(text('*NO VALIDO COMO FACTURA'));
  parts.push(align('left'));
  parts.push(feed(4));
  parts.push(cut());

  return concatBytes(parts);
};
