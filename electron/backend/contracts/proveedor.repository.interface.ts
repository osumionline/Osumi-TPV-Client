import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';

export default interface ProveedorRepository {
  findAll(): Promise<readonly ProveedorRecord[]>;
}
