import roleCatalog from '@backend/domain/permissions/role-catalog';
import RoleGroup from '@backend/domain/permissions/role-group.interface';
import Role from '@backend/domain/permissions/role.interface';

interface PermissionHolder {
  readonly admin: boolean;
  readonly roleIds: readonly number[];
}

export default class PermissionsService {
  private readonly availableRoleIds: ReadonlySet<number>;

  constructor() {
    this.availableRoleIds = new Set<number>(this.getAllRoleIds());
  }

  getCatalog(): Readonly<Record<string, RoleGroup>> {
    return roleCatalog;
  }

  getAllRoleIds(): number[] {
    const groups: RoleGroup[] = Object.values(roleCatalog);

    return groups.flatMap((group: RoleGroup): number[] => {
      const roles: Role[] = Object.values(group.roles);

      return roles.map((role: Role): number => role.id);
    });
  }

  hasPermission(employee: PermissionHolder, roleId: number): boolean {
    if (!this.availableRoleIds.has(roleId)) {
      return false;
    }

    if (employee.admin) {
      return true;
    }

    return employee.roleIds.includes(roleId);
  }
}
