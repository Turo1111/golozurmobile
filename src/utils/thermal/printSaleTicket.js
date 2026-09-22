import { Platform } from 'react-native';
import { getSaleTicketData } from './saleTicketData';
import { buildSaleTicket } from './ticket';
import { sendToRawBT } from './rawbt';

// Fachada única de impresión térmica: plataforma → datos → bytes → transporte.
// Resultado: { status: 'printed' | 'omitted' | 'error', reason? }.
export const printSaleTicket = async ({ mode, saleId, provided } = {}) => {
  // RawBT es Android-only: en iOS no se intenta imprimir (las pantallas ocultan la acción).
  if (Platform.OS !== 'android') {
    return { status: 'omitted', reason: 'platform' };
  }

  try {
    const ticketData = await getSaleTicketData({ mode, saleId, provided });
    const bytes = buildSaleTicket(ticketData);
    const sent = await sendToRawBT(bytes);
    return sent ? { status: 'printed' } : { status: 'error', reason: 'rawbt' };
  } catch (error) {
    return { status: 'error', reason: 'data' };
  }
};
