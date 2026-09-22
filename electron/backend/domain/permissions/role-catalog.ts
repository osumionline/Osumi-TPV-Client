import type RoleGroup from '@backend/domain/permissions/role-group.interface';
import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';

const roleCatalog: Readonly<Record<string, RoleGroup>> = {
  ventas: {
    name: 'Ventas',
    roles: {
      modificarImportes: {
        id: permissionKeys.ventas.modificarImportes,
        name: 'Modificar importes, descuentos o descuentos directos.',
        description:
          'Indica si un empleado puede modificar el importe directo de un artículo en una venta o si puede aplicar descuentos directos.',
      },
    },
  },

  gestion: {
    name: 'Gestión',
    roles: {
      ajustes: {
        id: permissionKeys.gestion.ajustes,
        name: 'Modificar ajustes generales de la aplicación.',
        description:
          'Permite al empleado modificar los ajustes generales de la aplicación como datos del negocio, IVAs a usar, márgenes de beneficio o datos de la tienda online.',
      },

      tiposPago: {
        id: permissionKeys.gestion.tiposPago,
        name: 'Modificar tipos de pago.',
        description: 'Permite al empleado modificar los tipos de pago de la aplicación.',
      },

      empleados: {
        id: permissionKeys.gestion.empleados,
        name: 'Gestionar empleados.',
        description:
          'Permite al empleado crear, modificar y eliminar empleados, así como gestionar sus permisos.',
      },

      copiasSeguridad: {
        id: permissionKeys.gestion.copiasSeguridad,
        name: 'Gestionar copias de seguridad.',
        description:
          'Permite al empleado acceder y gestionar las copias de seguridad de la aplicación.',
      },
    },
  },
};

export default roleCatalog;
