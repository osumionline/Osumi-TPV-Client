import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';

export default interface Role {
  readonly id: PermissionId;
  readonly name: string;
  readonly description: string;
}
