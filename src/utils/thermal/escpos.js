import { CP850_MAP, ESC_POS_COMMANDS, PAPER_58MM } from './constants';

const NEWLINE = 0x0a;
const UNMAPPED_BYTE = 0x3f; // '?': todo carácter no mapeado se sustituye, nunca se emite un byte inválido
const MIN_LEFT_WIDTH = 10; // si la columna derecha no deja 10 columnas libres, se emiten dos líneas

// Une varios Uint8Array en uno solo.
export const concatBytes = (chunks) => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
};

// Codifica texto a bytes ESC/POS: ASCII directo, acentos por CP850, no mapeados → '?'.
export const encodeText = (value) => {
  const source = value === undefined || value === null ? '' : String(value);
  const bytes = new Uint8Array(source.length);
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const code = source.charCodeAt(i);
    if (char === '\n') {
      bytes[i] = NEWLINE;
    } else if (code >= 0x20 && code <= 0x7e) {
      bytes[i] = code;
    } else if (Object.prototype.hasOwnProperty.call(CP850_MAP, char)) {
      bytes[i] = CP850_MAP[char];
    } else {
      bytes[i] = UNMAPPED_BYTE;
    }
  }
  return bytes;
};

// Reset de impresora. Fase 0 puede requerir `ESC t 2` (se centraliza en constants.js).
export const init = () => {
  const parts = [new Uint8Array(ESC_POS_COMMANDS.init)];
  if (PAPER_58MM.useCodePageCommand) {
    parts.push(new Uint8Array(ESC_POS_COMMANDS.codePagePC850));
  }
  return concatBytes(parts);
};

export const align = (value = 'left') => {
  const command = value === 'center' ? ESC_POS_COMMANDS.alignCenter : ESC_POS_COMMANDS.alignLeft;
  return new Uint8Array(command);
};

// GS ! n: nibble bajo = alto de carácter, nibble alto = ancho (1x…8x).
export const size = (width = 1, height = 1) => {
  const clamp = (value) => Math.min(8, Math.max(1, Math.trunc(Number(value) || 1)));
  const n = ((clamp(width) - 1) << 4) | (clamp(height) - 1);
  return new Uint8Array([0x1d, 0x21, n]);
};

// Línea de texto terminada en salto de línea.
export const text = (value = '') => concatBytes([encodeText(value), new Uint8Array([NEWLINE])]);

// Dos columnas en una línea de `columns` (decisión 1.3):
// izquierda = columns - right.length; si right > columns - 10 → dos líneas.
export const twoColumns = (left = '', right = '') => {
  const leftText = String(left);
  const rightText = String(right);
  const { columns } = PAPER_58MM;

  if (rightText.length > columns - MIN_LEFT_WIDTH) {
    // Ninguna línea puede superar el ancho del papel.
    return concatBytes([
      text(leftText.slice(0, columns)),
      text(rightText.slice(0, columns)),
    ]);
  }

  const leftWidth = columns - rightText.length;
  const clippedLeft = leftText.length > leftWidth ? leftText.slice(0, leftWidth) : leftText;
  return text(clippedLeft.padEnd(leftWidth) + rightText);
};

// Separador de ancho completo (32 guiones).
export const separator = () => text('-'.repeat(PAPER_58MM.columns));

export const feed = (lines = PAPER_58MM.feedLines) => {
  const safeLines = Math.max(0, Math.min(255, Math.trunc(Number(lines) || 0)));
  return new Uint8Array([...ESC_POS_COMMANDS.feed, safeLines]);
};

export const cut = () => new Uint8Array(ESC_POS_COMMANDS.partialCut);
