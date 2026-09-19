import type ActualizarTipoPagoRecordCommand from '@backend/contracts/tipos-pago/actualizar-tipo-pago-record-command.interface';
import type CrearTipoPagoRecordCommand from '@backend/contracts/tipos-pago/crear-tipo-pago-record-command.interface';
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
   * Da de baja lógicamente un tipo de pago
   * conservando sus referencias históricas.
   */
  deactivate(id: number): Promise<void>;
}
