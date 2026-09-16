import type ActualizarProveedorRecordCommand from '@backend/contracts/proveedores/actualizar-proveedor-record-command.interface';
import type CrearProveedorRecordCommand from '@backend/contracts/proveedores/crear-proveedor-record-command.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';

export default interface ProveedorRepository {
  /**
   * Recupera todos los proveedores activos ordenados
   * para su uso como maestro.
   */
  findAll(): Promise<readonly ProveedorRecord[]>;

  /**
   * Recupera un proveedor activo por su identificador interno.
   */
  findById(id: number): Promise<ProveedorRecord | null>;

  /**
   * Comprueba si existe otro proveedor activo
   * con el nombre indicado.
   */
  existsActiveByName(nombre: string, excludeId: number | null): Promise<boolean>;

  /**
   * Crea un proveedor junto con sus relaciones
   * activas con marcas.
   */
  create(command: CrearProveedorRecordCommand): Promise<ProveedorRecord>;

  /**
   * Actualiza un proveedor activo y sincroniza
   * sus relaciones activas con marcas.
   */
  update(id: number, command: ActualizarProveedorRecordCommand): Promise<ProveedorRecord>;

  /**
   * Da de baja lógicamente un proveedor activo
   * y sus comerciales activos.
   */
  deactivate(id: number): Promise<void>;
}
