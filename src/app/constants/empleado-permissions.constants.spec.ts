import {
  EMPLEADO_PERMISSION_GROUPS,
  type EmpleadoPermissionDefinition,
  type EmpleadoPermissionGroup,
} from '@constants/empleado-permissions.constants';
import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';
import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';

describe('EMPLEADO_PERMISSION_GROUPS', (): void => {
  it('contiene exactamente los cinco permisos actuales una única vez', (): void => {
    const permissions: readonly EmpleadoPermissionDefinition[] = EMPLEADO_PERMISSION_GROUPS.flatMap(
      (group: EmpleadoPermissionGroup): readonly EmpleadoPermissionDefinition[] =>
        group.permissions,
    );

    const ids: readonly PermissionId[] = permissions.map(
      (permission: EmpleadoPermissionDefinition): PermissionId => permission.id,
    );

    expect(ids).toEqual([
      permissionKeys.ventas.modificarImportes,
      permissionKeys.gestion.ajustes,
      permissionKeys.gestion.tiposPago,
      permissionKeys.gestion.empleados,
      permissionKeys.gestion.copiasSeguridad,
    ]);

    expect(new Set<PermissionId>(ids).size).toBe(ids.length);
  });

  it('define nombre y descripción para todos los permisos', (): void => {
    for (const group of EMPLEADO_PERMISSION_GROUPS) {
      expect(group.name.trim()).not.toBe('');

      for (const permission of group.permissions) {
        expect(permission.name.trim()).not.toBe('');

        expect(permission.description.trim()).not.toBe('');
      }
    }
  });

  it('agrupa el permiso de Ventas en su propio grupo', (): void => {
    const group: EmpleadoPermissionGroup | undefined = EMPLEADO_PERMISSION_GROUPS.find(
      (item: EmpleadoPermissionGroup): boolean => item.key === 'ventas',
    );

    expect(group).toBeDefined();

    expect(group?.permissions).toEqual([
      expect.objectContaining({
        id: permissionKeys.ventas.modificarImportes,
      }),
    ]);
  });

  it('agrupa los cuatro permisos de Gestión en el grupo gestion', (): void => {
    const group: EmpleadoPermissionGroup | undefined = EMPLEADO_PERMISSION_GROUPS.find(
      (item: EmpleadoPermissionGroup): boolean => item.key === 'gestion',
    );

    expect(group).toBeDefined();

    expect(
      group?.permissions.map(
        (permission: EmpleadoPermissionDefinition): PermissionId => permission.id,
      ),
    ).toEqual([
      permissionKeys.gestion.ajustes,
      permissionKeys.gestion.tiposPago,
      permissionKeys.gestion.empleados,
      permissionKeys.gestion.copiasSeguridad,
    ]);
  });
});
