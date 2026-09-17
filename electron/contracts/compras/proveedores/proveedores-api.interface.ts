import type ActualizarComercialCommand from '@desktop-contracts/compras/proveedores/actualizar-comercial-command.interface';
import type ActualizarProveedorCommand from '@desktop-contracts/compras/proveedores/actualizar-proveedor-command.interface';
import type CrearComercialCommand from '@desktop-contracts/compras/proveedores/crear-comercial-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/compras/proveedores/crear-proveedor-command.interface';
import type {
  ComercialInterface,
  ProveedorInterface,
} from '@desktop-contracts/compras/proveedores/proveedor.interface';

export default interface ProveedoresApi {
  /**
   * Obtiene todos los proveedores activos.
   */
  getAll(): Promise<readonly ProveedorInterface[]>;

  /**
   * Recupera un proveedor activo por su identificador interno.
   */
  getById(id: number): Promise<ProveedorInterface | null>;

  /**
   * Crea un nuevo proveedor.
   */
  create(command: CrearProveedorCommand): Promise<ProveedorInterface>;

  /**
   * Actualiza un proveedor activo.
   */
  update(id: number, command: ActualizarProveedorCommand): Promise<ProveedorInterface>;

  /**
   * Da de baja lógicamente un proveedor activo.
   */
  deactivate(id: number): Promise<void>;

  /**
   * Crea un Comercial dentro de un
   * Proveedor activo.
   */
  createComercial(idProveedor: number, command: CrearComercialCommand): Promise<ComercialInterface>;

  /**
   * Actualiza un Comercial perteneciente
   * al Proveedor indicado.
   */
  updateComercial(
    idProveedor: number,
    idComercial: number,
    command: ActualizarComercialCommand,
  ): Promise<ComercialInterface>;

  /**
   * Da de baja un Comercial perteneciente
   * al Proveedor indicado.
   */
  deactivateComercial(idProveedor: number, idComercial: number): Promise<void>;
}
