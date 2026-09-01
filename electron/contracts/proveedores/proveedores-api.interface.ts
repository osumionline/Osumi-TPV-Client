import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type { ProveedorInterface } from '@desktop-contracts/proveedores/proveedor.interface';

export default interface ProveedoresApi {
  getAll(): Promise<readonly ProveedorInterface[]>;
  create(command: CrearProveedorCommand): Promise<ProveedorInterface>;
}
