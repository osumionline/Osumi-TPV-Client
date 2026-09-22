import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';
import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';
import { describe, expect, it } from 'vitest';

describe('permissionKeys', (): void => {
  it('define exactamente los cinco permisos de la aplicación', (): void => {
    const permissionIds: readonly PermissionId[] = [
      permissionKeys.ventas.modificarImportes,
      permissionKeys.gestion.ajustes,
      permissionKeys.gestion.tiposPago,
      permissionKeys.gestion.empleados,
      permissionKeys.gestion.copiasSeguridad,
    ];

    expect(permissionIds).toEqual([
      'ventas.modificar_importes',
      'gestion.ajustes',
      'gestion.tipos_pago',
      'gestion.empleados',
      'gestion.copias_seguridad',
    ]);
  });

  it('no contiene identificadores duplicados', (): void => {
    const permissionIds: readonly PermissionId[] = [
      permissionKeys.ventas.modificarImportes,
      permissionKeys.gestion.ajustes,
      permissionKeys.gestion.tiposPago,
      permissionKeys.gestion.empleados,
      permissionKeys.gestion.copiasSeguridad,
    ];

    expect(new Set<PermissionId>(permissionIds).size).toBe(permissionIds.length);
  });
});
