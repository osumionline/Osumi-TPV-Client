import type { ProveedorInterface } from '@desktop-contracts/proveedores/proveedor.interface';

export default interface ProveedoresApi {
  getAll(): Promise<readonly ProveedorInterface[]>;
}
