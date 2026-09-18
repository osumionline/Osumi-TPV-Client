import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';

export default interface TiposPagoApi {
  /**
   * Obtiene todos los tipos de pago activos
   * disponibles en el maestro global.
   */
  getAll(): Promise<readonly TipoPagoInterface[]>;
}
