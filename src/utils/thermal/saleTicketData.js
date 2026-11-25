import apiClient from '../client';

export const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const roundToTwoDecimals = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// Precio unitario: total/cantidad → item.precio → item.precioUnitario → 0.
// Solo usa valores de la venta: nunca el precio vigente del catálogo.
export const resolveUnitPrice = (item) => {
  const cantidad = toFiniteNumber(item?.cantidad);
  const total = toFiniteNumber(item?.total);
  if (total !== null && cantidad !== null && cantidad > 0) {
    return roundToTwoDecimals(total / cantidad);
  }
  const precio = toFiniteNumber(item?.precio);
  if (precio !== null) return roundToTwoDecimals(precio);
  const precioUnitario = toFiniteNumber(item?.precioUnitario);
  if (precioUnitario !== null) return roundToTwoDecimals(precioUnitario);
  return 0;
};

export const normalizeItem = (item) => ({
  descripcion: String(item?.descripcion ?? item?.producto?.descripcion ?? ''),
  cantidad: toFiniteNumber(item?.cantidad) ?? 0,
  precioUnitario: resolveUnitPrice(item),
  total: toFiniteNumber(item?.total) ?? 0,
});

// Acepta la respuesta de la API (`{ r, itemsSale }`) o una venta ya cargada en memoria.
export const normalizeSale = (source) => {
  const raw = source?.r
    ? { ...source.r, itemsSale: source.itemsSale ?? source.r.itemsSale }
    : (source ?? {});
  const rawItems = Array.isArray(raw.itemsSale)
    ? raw.itemsSale
    : (Array.isArray(raw.items) ? raw.items : []);

  return {
    id: raw._id ?? raw.id,
    cliente: String(raw.cliente ?? ''),
    fecha: raw.createdAt ?? raw.fecha ?? '',
    items: rawItems.map(normalizeItem),
    total: toFiniteNumber(raw.total) ?? 0,
  };
};

// `online` resuelve por `_id`; `provided` usa la venta cargada en memoria.
// Nunca busca la venta por nombre de cliente.
export const getSaleTicketData = async ({ mode, saleId, provided } = {}) => {
  if (mode === 'online') {
    if (!saleId) throw new Error('getSaleTicketData: saleId es obligatorio en modo online');
    const response = await apiClient.get(`/sale/${saleId}`);
    return normalizeSale(response.data);
  }
  if (mode === 'provided') {
    if (!provided) throw new Error('getSaleTicketData: provided es obligatorio en modo provided');
    return normalizeSale(provided);
  }
  throw new Error(`getSaleTicketData: modo no soportado (${mode})`);
};
