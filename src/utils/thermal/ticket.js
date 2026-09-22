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
// `firstLineWidth` permite acortar solo la primera línea cuando la columna derecha
// (precio) deja menos espacio útil; la cola continúa en las líneas normales de
// continuación, así ningún carácter se pierde. Las continuaciones suman 3 espacios
// de indentación: 3 + hasta 19.
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
    const right = formatMoney(item?.total);
    // La primera línea de la descripción debe convivir con el precio: si el precio
    // ocupa más de 10 columnas, la primera línea se acorta y la cola se derrama a
    // las continuaciones (3 espacios dentro de 22). Ningún carácter se recorta.
    const firstLineWidth = Math.min(ITEM_LEFT_WIDTH, COLUMNS - right.length);
    wrapItemLines(item, firstLineWidth).forEach((line, index) => {
      if (index === 0) {
        parts.push(twoColumns(line, right));
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
