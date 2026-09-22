// Configuración ESC/POS del ticket térmico (rollo 58 mm, Font A).
// Único punto de ajuste del formato físico: los cambios que surjan de Fase 0
// (ancho de papel, página de códigos, variante de corte) se aplican solo acá.

// Mapa CP850/CP437 para los caracteres del español (ambas páginas coinciden).
export const CP850_MAP = {
  'á': 0xa0,
  'é': 0x82,
  'í': 0xa1,
  'ó': 0xa2,
  'ú': 0xa3,
  'ñ': 0xa4,
  'Ñ': 0xa5,
  '¿': 0xa8,
  '°': 0xf8,
};

// Comandos ESC/POS (RFC §8).
export const ESC_POS_COMMANDS = {
  init: [0x1b, 0x40],
  alignLeft: [0x1b, 0x61, 0x00],
  alignCenter: [0x1b, 0x61, 0x01],
  feed: [0x1b, 0x64],
  partialCut: [0x1d, 0x56, 0x42, 0x00],
  // ESC t 2 (PC850). Solo se emite si `useCodePageCommand` está activo.
  codePagePC850: [0x1b, 0x74, 0x02],
};

export const PAPER_58MM = {
  id: '58mm',
  columns: 32, // Font A: 384 puntos / 12 puntos por carácter
  feedLines: 4,
  // Fase 0 pendiente: activar si la impresora no usa PC850 por defecto.
  useCodePageCommand: false,
};
