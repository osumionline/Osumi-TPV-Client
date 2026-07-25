import Role from '@backend/domain/permissions/role.interface';

export default interface RoleGroup {
  readonly name: string;
  readonly roles: Readonly<Record<string, Role>>;
}
