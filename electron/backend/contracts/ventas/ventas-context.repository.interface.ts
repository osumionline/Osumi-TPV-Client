import type { VentasContextRecord } from '@backend/domain/ventas/ventas-context-record.interface';

export default interface VentasContextRepository {
  get(): Promise<VentasContextRecord>;
}
