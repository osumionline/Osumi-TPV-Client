import roleCatalog from '@backend/domain/permissions/role-catalog';
import type RoleGroup from '@backend/domain/permissions/role-group.interface';
import type Role from '@backend/domain/permissions/role.interface';
import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';

interface PermissionHolder {
  readonly admin: boolean;
  readonly roleIds: readonly PermissionId[];
}

export default class PermissionsService {
  private readonly availableRoleIds: ReadonlySet<PermissionId>;

  constructor() {
    this.availableRoleIds = new Set<PermissionId>(this.getAllRoleIds());
  }

  getCatalog(): Readonly<Record<string, RoleGroup>> {
    return roleCatalog;
  }

  getAllRoleIds(): PermissionId[] {
    const groups: RoleGroup[] = Object.values(roleCatalog);

    return groups.flatMap((group: RoleGroup): PermissionId[] => {
      const roles: Role[] = Object.values(group.roles);

      return roles.map((role: Role): PermissionId => role.id);
    });
  }

  hasPermission(employee: PermissionHolder, roleId: PermissionId): boolean {
    if (!this.availableRoleIds.has(roleId)) {
      return false;
    }

    if (employee.admin) {
      return true;
    }

    return employee.roleIds.includes(roleId);
  }
}
