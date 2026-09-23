import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';
import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';

export interface EmpleadoPermissionDefinition {
  readonly id: PermissionId;
  readonly name: string;
  readonly description: string;
}

export interface EmpleadoPermissionGroup {
  readonly key: string;
  readonly name: string;
  readonly permissions: readonly EmpleadoPermissionDefinition[];
}

export const EMPLEADO_PERMISSION_GROUPS = [
  {
    key: 'ventas',
    name: 'Ventas',
    permissions: [
      {
        id: permissionKeys.ventas.modificarImportes,
        name: 'Modificar importes y descuentos.',
        description:
          'Permite al empleado modificar importes manuales y descuentos de una venta, incluidos los descuentos porcentuales, directos y la retirada de descuentos promocionales.',
      },
    ],
  },
  {
    key: 'gestion',
    name: 'Gestión',
    permissions: [
      {
        id: permissionKeys.gestion.ajustes,
        name: 'Modificar ajustes generales de la aplicación.',
        description:
          'Permite al empleado modificar los ajustes generales de la aplicación como datos del negocio, IVAs a usar, márgenes de beneficio o datos de la tienda online.',
      },
      {
        id: permissionKeys.gestion.tiposPago,
        name: 'Modificar tipos de pago.',
        description: 'Permite al empleado modificar los tipos de pago de la aplicación.',
      },
      {
        id: permissionKeys.gestion.empleados,
        name: 'Gestionar empleados.',
        description:
          'Permite al empleado crear, modificar y eliminar empleados, así como gestionar sus permisos.',
      },
      {
        id: permissionKeys.gestion.copiasSeguridad,
        name: 'Gestionar copias de seguridad.',
        description:
          'Permite al empleado acceder y gestionar las copias de seguridad de la aplicación.',
      },
    ],
  },
] as const satisfies readonly EmpleadoPermissionGroup[];
