import PermissionsService from '@backend/domain/permissions/permission.service';
import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';
import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';
import { beforeEach, describe, expect, it } from 'vitest';

let service: PermissionsService;

describe('PermissionsService', (): void => {
  beforeEach((): void => {
    service = new PermissionsService();
  });

  it('expone exactamente los cinco permisos actuales', (): void => {
    expect(service.getAllRoleIds()).toEqual([
      permissionKeys.ventas.modificarImportes,
      permissionKeys.gestion.ajustes,
      permissionKeys.gestion.tiposPago,
      permissionKeys.gestion.empleados,
      permissionKeys.gestion.copiasSeguridad,
    ]);
  });

  it('permite a un administrador usar cualquier permiso del catálogo', (): void => {
    const permissionIds: readonly PermissionId[] = service.getAllRoleIds();

    for (const permissionId of permissionIds) {
      expect(
        service.hasPermission(
          {
            admin: true,
            roleIds: [],
          },
          permissionId,
        ),
      ).toBe(true);
    }
  });

  it('permite a un empleado únicamente los permisos asignados', (): void => {
    const employee = {
      admin: false,
      roleIds: [permissionKeys.ventas.modificarImportes, permissionKeys.gestion.tiposPago],
    } satisfies {
      readonly admin: boolean;
      readonly roleIds: readonly PermissionId[];
    };

    expect(service.hasPermission(employee, permissionKeys.ventas.modificarImportes)).toBe(true);

    expect(service.hasPermission(employee, permissionKeys.gestion.tiposPago)).toBe(true);

    expect(service.hasPermission(employee, permissionKeys.gestion.ajustes)).toBe(false);

    expect(service.hasPermission(employee, permissionKeys.gestion.empleados)).toBe(false);

    expect(service.hasPermission(employee, permissionKeys.gestion.copiasSeguridad)).toBe(false);
  });

  it('deniega todos los permisos a un empleado sin permisos asignados', (): void => {
    const permissionIds: readonly PermissionId[] = service.getAllRoleIds();

    for (const permissionId of permissionIds) {
      expect(
        service.hasPermission(
          {
            admin: false,
            roleIds: [],
          },
          permissionId,
        ),
      ).toBe(false);
    }
  });
});
