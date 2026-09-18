import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';

export default interface TipoPagoRepository {
  /**
   * Recupera todos los tipos de pago activos
   * ordenados según su prioridad configurada.
   */
  findAll(): Promise<readonly TipoPagoRecord[]>;
}
