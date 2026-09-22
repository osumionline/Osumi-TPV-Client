import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';

export default interface EmpleadoRecord {
  readonly id: number;
  readonly publicId: string;
  readonly nombre: string;
  readonly hasPassword: boolean;
  readonly color: string;
  readonly admin: boolean;
  readonly permisos: readonly PermissionId[];
}
