import type ActualizarTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/actualizar-tipo-pago-command.interface';
import type CrearTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/crear-tipo-pago-command.interface';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';

export default interface TiposPagoApi {
  /**
   * Obtiene todos los tipos de pago activos
   * disponibles en el maestro global.
   */
  getAll(): Promise<readonly TipoPagoInterface[]>;

  /**
   * Crea un nuevo tipo de pago configurable.
   */
  create(command: CrearTipoPagoCommand): Promise<TipoPagoInterface>;

  /**
   * Actualiza un tipo de pago configurable.
   */
  update(id: number, command: ActualizarTipoPagoCommand): Promise<TipoPagoInterface>;

  /**
   * Da de baja lógicamente un tipo
   * de pago configurable.
   */
  deactivate(id: number): Promise<void>;
}
