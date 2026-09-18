import {
  EMPLEADO_PERMISSION_GROUPS,
  type EmpleadoPermissionDefinition,
  type EmpleadoPermissionGroup,
} from '@constants/empleado-permissions.constants';

describe('EMPLEADO_PERMISSION_GROUPS', (): void => {
  it('contiene los permisos del 1 al 25 una única vez', (): void => {
    const permissions: readonly EmpleadoPermissionDefinition[] = EMPLEADO_PERMISSION_GROUPS.flatMap(
      (group: EmpleadoPermissionGroup): readonly EmpleadoPermissionDefinition[] =>
        group.permissions,
    );

    const ids: number[] = permissions
      .map((permission: EmpleadoPermissionDefinition): number => permission.id)
      .sort((first: number, second: number): number => first - second);

    expect(ids).toEqual(
      Array.from(
        {
          length: 25,
        },
        (_: unknown, index: number): number => index + 1,
      ),
    );
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

  it('mantiene el permiso 23 dentro del grupo Empleados', (): void => {
    const group = EMPLEADO_PERMISSION_GROUPS.find(
      (item: EmpleadoPermissionGroup): boolean => item.key === 'empleados',
    );

    expect(group).toBeDefined();

    expect(
      group?.permissions.some(
        (permission: EmpleadoPermissionDefinition): boolean => permission.id === 23,
      ),
    ).toBe(true);
  });

  it('incluye el permiso 25 para las copias de seguridad', (): void => {
    const group = EMPLEADO_PERMISSION_GROUPS.find(
      (item: EmpleadoPermissionGroup): boolean => item.key === 'copias',
    );

    expect(group).toBeDefined();

    expect(group?.permissions).toEqual([
      expect.objectContaining({
        id: 25,
      }),
    ]);
  });
});
