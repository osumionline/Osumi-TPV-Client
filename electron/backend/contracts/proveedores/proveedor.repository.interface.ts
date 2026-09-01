import type CrearProveedorRecordCommand from '@backend/contracts/proveedores/crear-proveedor-record-command.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';

export default interface ProveedorRepository {
  findAll(): Promise<readonly ProveedorRecord[]>;
  create(command: CrearProveedorRecordCommand): Promise<ProveedorRecord>;
}
