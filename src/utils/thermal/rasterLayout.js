import { formatDateTime, formatMoney } from './ticket';
import { normalizeTicketConfig } from './ticketConfig';
import { PrintingError } from './printingOperation';

export const createRasterModel = (data, config) => {
  const cfg = normalizeTicketConfig(config);
  if (!Array.isArray(data?.items) || data.items.length > 100) {
    throw new PrintingError('raster', 'Receipts support at most 100 items. Split this sale before printing.');
  }
  const amounts = [data.total, ...data.items.flatMap((item) => [item.total, item.precioUnitario])];
  if (amounts.some((value) => !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER / 100)) {
    throw new PrintingError('raster', 'Receipt amounts exceed the safe monetary range. Check the sale before printing.');
  }
  const items = data.items.map((item) => ({
    description: `${item.cantidad}x ${item.descripcion}`,
    amount: formatMoney(item.total),
    unit: `Unit: ${formatMoney(item.precioUnitario)}`,
  }));
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  if (!Number.isFinite(subtotal) || Math.abs(subtotal) > Number.MAX_SAFE_INTEGER / 100) {
    throw new PrintingError('raster', 'Receipt subtotal exceeds the safe monetary range. Split the sale before printing.');
  }
  const adjustment = Math.round((data.total - subtotal) * 100) / 100;
  if (Math.abs(adjustment) > Number.MAX_SAFE_INTEGER / 100) {
    throw new PrintingError('raster', 'Receipt adjustment exceeds the safe monetary range. Check the sale before printing.');
  }
  return {
    title: 'GOLOZUR', date: `Fecha: ${formatDateTime(data.fecha)}`,
    customer: `Cliente: ${data.cliente}`, items, total: formatMoney(data.total),
    subtotal: adjustment ? formatMoney(subtotal) : null,
    adjustment: adjustment ? formatMoney(adjustment) : null,
    footer: '*NO VALIDO COMO FACTURA',
    size: cfg.mxw01TextSize,
    titleX: cfg.titleWidthMultiplier, titleY: cfg.titleHeightMultiplier,
    headerFont: cfg.headerFont, headerY: cfg.headerHeightMultiplier,
    bodyFont: cfg.bodyFont, bodyY: cfg.bodyHeightMultiplier, bodyBold: cfg.bodyBold,
    footerFont: cfg.footerFont, footerY: cfg.footerHeightMultiplier,
    totalX: cfg.totalWidthMultiplier, totalY: cfg.totalHeightMultiplier,
    spacing: cfg.itemSpacing, feed: 0,
  };
};
