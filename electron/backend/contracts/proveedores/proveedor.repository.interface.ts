import type ActualizarComercialRecordCommand from '@backend/contracts/proveedores/actualizar-comercial-record-command.interface';
import type ActualizarProveedorRecordCommand from '@backend/contracts/proveedores/actualizar-proveedor-record-command.interface';
import type CrearComercialRecordCommand from '@backend/contracts/proveedores/crear-comercial-record-command.interface';
import type CrearProveedorRecordCommand from '@backend/contracts/proveedores/crear-proveedor-record-command.interface';
import type ComercialRecord from '@backend/domain/proveedores/comercial-record.interface';
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

  /**
   * Crea un Comercial perteneciente a un
   * Proveedor que debe seguir activo.
   */
  createComercial(command: CrearComercialRecordCommand): Promise<ComercialRecord>;

  /**
   * Actualiza un Comercial activo comprobando
   * que pertenezca al Proveedor indicado.
   */
  updateComercial(
    idProveedor: number,
    idComercial: number,
    command: ActualizarComercialRecordCommand,
  ): Promise<ComercialRecord>;

  /**
   * Da de baja lógicamente un Comercial activo
   * perteneciente al Proveedor indicado.
   */
  deactivateComercial(idProveedor: number, idComercial: number): Promise<void>;
}
