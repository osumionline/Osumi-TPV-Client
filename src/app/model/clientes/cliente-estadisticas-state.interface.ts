import type { ClienteEstadisticasInterface } from '@desktop-contracts/clientes/cliente-estadisticas.interface';

export default interface ClienteEstadisticasState {
  readonly data: ClienteEstadisticasInterface | null;
  readonly loading: boolean;
  readonly error: string | null;
}
