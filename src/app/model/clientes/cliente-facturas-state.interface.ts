import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';

export default interface ClienteFacturasState {
  readonly data: readonly ClienteFacturaInterface[] | null;
  readonly loading: boolean;
  readonly error: string | null;
}
