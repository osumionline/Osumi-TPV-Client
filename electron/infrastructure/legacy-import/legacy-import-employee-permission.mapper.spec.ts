import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';
import mapLegacyEmployeePermission from '@infrastructure/legacy-import/legacy-import-employee-permission.mapper';
import { describe, expect, it } from 'vitest';

describe('mapLegacyEmployeePermission', (): void => {
  it('convierte los permisos legacy que siguen existiendo', (): void => {
    expect(mapLegacyEmployeePermission(1)).toBe(permissionKeys.ventas.modificarImportes);
    expect(mapLegacyEmployeePermission(18)).toBe(permissionKeys.gestion.ajustes);
    expect(mapLegacyEmployeePermission(19)).toBe(permissionKeys.gestion.tiposPago);
    expect(mapLegacyEmployeePermission(20)).toBe(permissionKeys.gestion.empleados);
    expect(mapLegacyEmployeePermission(25)).toBe(permissionKeys.gestion.copiasSeguridad);
  });

  it('descarta los antiguos permisos 21 a 24 de Empleados', (): void => {
    expect(mapLegacyEmployeePermission(21)).toBeNull();
    expect(mapLegacyEmployeePermission(22)).toBeNull();
    expect(mapLegacyEmployeePermission(23)).toBeNull();
    expect(mapLegacyEmployeePermission(24)).toBeNull();
  });

  it('descarta cualquier otro identificador legacy', (): void => {
    const discardedPermissionIds: readonly number[] = [
      -1, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 26, 100,
    ];

    for (const permissionId of discardedPermissionIds) {
      expect(mapLegacyEmployeePermission(permissionId)).toBeNull();
    }
  });
});
