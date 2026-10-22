import type GuardarVentaOnlineRecordCommand from '@backend/contracts/ventas/guardar-venta-online-record-command.interface';
import type { GuardarVentaRecordCommand } from '@backend/contracts/ventas/guardar-venta-record-command.interface';
import type VentaPersistidaRecord from '@backend/domain/ventas/venta-persistida-record.interface';

export default interface VentasPersistenciaRepository {
  save(command: GuardarVentaRecordCommand): Promise<VentaPersistidaRecord>;

  /**
   * Persiste una venta online ya validada y normalizada.
   * Repetir un pedido existente no duplica la venta.
   */
  saveOnline(command: GuardarVentaOnlineRecordCommand): Promise<VentaPersistidaRecord>;
}
