import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type { CajaCierreRecord } from '@backend/domain/caja/caja-cierre-record.interface';
import type SalidaCajaRecord from '@backend/domain/caja/salida-caja-record.interface';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type { CerrarCajaCommand } from '@desktop-contracts/caja/cerrar-caja-command.interface';
import type {
  ActualizarSalidaCajaCommand,
  CrearSalidaCajaCommand,
  EliminarSalidaCajaCommand,
} from '@desktop-contracts/caja/salida-caja-command.interface';

export default interface CajaRepository {
  open(command: AbrirCajaCommand): Promise<CajaAbiertaRecord>;

  /**
   * Recupera las salidas de caja de un intervalo temporal absoluto.
   *
   * El límite inicial es inclusivo y el final exclusivo.
   */
  findSalidasByPeriod(desde: string, hastaExclusive: string): Promise<readonly SalidaCajaRecord[]>;

  /**
   * Crea una salida asociada a una caja todavía abierta.
   */
  createSalida(command: CrearSalidaCajaCommand): Promise<SalidaCajaRecord>;

  /**
   * Actualiza una salida perteneciente a la caja abierta indicada.
   */
  updateSalida(command: ActualizarSalidaCajaCommand): Promise<SalidaCajaRecord>;

  /**
   * Da de baja lógicamente una salida perteneciente a la caja abierta indicada.
   */
  deleteSalida(command: EliminarSalidaCajaCommand): Promise<void>;

  /**
   * Obtiene el snapshot económico canónico de una caja todavía abierta.
   */
  findCierre(cajaPublicId: string): Promise<CajaCierreRecord | null>;

  /**
   * Consolida y cierra transaccionalmente una caja todavía abierta.
   */
  close(command: CerrarCajaCommand): Promise<void>;
}
