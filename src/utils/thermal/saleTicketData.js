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

// Presentación del producto ("X1KG") a partir de `peso`. Si la descripción ya
// la incluye (p. ej. "MANI SALADO X1KG") no se repite en una línea aparte.
export const resolvePresentation = (item) => {
  const descripcion = String(item?.descripcion ?? item?.producto?.descripcion ?? '');
  const peso = item?.peso ?? item?.producto?.peso;
  const cantidad = toFiniteNumber(peso?.cantidad);
  const unidad = typeof peso?.unidad === 'string' ? peso.unidad.trim() : '';
  if (cantidad === null || unidad === '') return '';
  const amount = Number.isInteger(cantidad) ? String(cantidad) : String(cantidad).replace('.', ',');
  const presentacion = `X${amount}${unidad}`.toUpperCase();
  return descripcion.toUpperCase().includes(presentacion) ? '' : presentacion;
};

export const normalizeItem = (item) => ({
  descripcion: String(item?.descripcion ?? item?.producto?.descripcion ?? ''),
  presentacion: resolvePresentation(item),
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
