// TEMPORAL — trigger de desarrollo (RFC §9, Fase 1). No es parte del flujo real:
// sirve para imprimir un ticket de muestra desde el dispositivo y compararlo con
// el golden de Fase 0. Eliminar en batch 2, tarea 8.1 (junto con el botón de Sale.js).
import { Alert } from 'react-native';
import { printSaleTicket } from './printSaleTicket';

const SAMPLE_SALE = {
  cliente: 'María Fernández',
  createdAt: new Date().toISOString(),
  total: 8750,
  itemsSale: [
    { descripcion: 'Pan francés', cantidad: 2, total: 1500 },
    { descripcion: 'Gaseosa 1.5L', cantidad: 1, total: 2300 },
    { descripcion: 'Yerba 500g', cantidad: 3, total: 4950 },
  ],
};

export const printSampleTicket = async () => {
  const result = await printSaleTicket({ mode: 'provided', provided: SAMPLE_SALE });
  if (result.status !== 'printed') {
    Alert.alert(
      'Impresión térmica (dev)',
      `Resultado: ${result.status}${result.reason ? ` (${result.reason})` : ''}`,
    );
  }
};
