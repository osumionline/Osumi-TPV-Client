import type ActualizarTipoPagoRecordCommand from '@backend/contracts/tipos-pago/actualizar-tipo-pago-record-command.interface';
import type CrearTipoPagoRecordCommand from '@backend/contracts/tipos-pago/crear-tipo-pago-record-command.interface';
import type TipoPagoEstadisticasRepositoryQuery from '@backend/contracts/tipos-pago/tipo-pago-estadisticas-query.interface';
import type { TipoPagoEstadisticasRepositoryResult } from '@backend/domain/tipos-pago/tipo-pago-estadisticas-record.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';

export default interface TipoPagoRepository {
  /**
   * Recupera todos los tipos de pago activos
   * ordenados según su prioridad configurada.
   */
  findAll(): Promise<readonly TipoPagoRecord[]>;

  /**
   * Recupera un tipo de pago activo por su
   * identificador interno.
   */
  findById(id: number): Promise<TipoPagoRecord | null>;

  /**
   * Recupera los agregados históricos de cobros
   * correspondientes a un tipo de pago.
   */
  findEstadisticas(
    query: TipoPagoEstadisticasRepositoryQuery,
  ): Promise<TipoPagoEstadisticasRepositoryResult>;

  /**
   * Comprueba si existe otro tipo de pago activo
   * con el slug indicado.
   */
  existsActiveBySlug(slug: string, excludeId: number | null): Promise<boolean>;

  /**
   * Crea un nuevo tipo de pago al final
   * del orden actualmente configurado.
   */
  create(command: CrearTipoPagoRecordCommand): Promise<TipoPagoRecord>;

  /**
   * Actualiza los datos editables de un
   * tipo de pago activo.
   */
  update(id: number, command: ActualizarTipoPagoRecordCommand): Promise<TipoPagoRecord>;

  /**
   * Persiste el orden completo de los tipos de pago
   * configurables activos y devuelve el maestro actualizado.
   *
   * Efectivo conserva su posición estructural.
   */
  reorder(ids: readonly number[]): Promise<readonly TipoPagoRecord[]>;

  /**
   * Da de baja lógicamente un tipo de pago
   * conservando sus referencias históricas.
   */
  deactivate(id: number): Promise<void>;
}
