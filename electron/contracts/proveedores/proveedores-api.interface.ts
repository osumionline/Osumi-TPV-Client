import type ActualizarProveedorCommand from '@desktop-contracts/proveedores/actualizar-proveedor-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type { ProveedorInterface } from '@desktop-contracts/proveedores/proveedor.interface';

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
}
