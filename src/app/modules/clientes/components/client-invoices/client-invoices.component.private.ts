import type { ClienteFacturaEstado } from '@desktop-contracts/clientes/cliente-factura.interface';

const ESTADO_LABELS: Readonly<Record<ClienteFacturaEstado, string>> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  anulada: 'Anulada',
};

export default ESTADO_LABELS;
