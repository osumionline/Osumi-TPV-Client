import type { GuardarVentaRecordCommand } from '@backend/contracts/ventas/guardar-venta-record-command.interface';
import type VentaPersistidaRecord from '@backend/domain/ventas/venta-persistida-record.interface';

export default interface VentasPersistenciaRepository {
  save(command: GuardarVentaRecordCommand): Promise<VentaPersistidaRecord>;
}
