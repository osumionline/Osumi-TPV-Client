import RoleGroup from '@backend/domain/permissions/role-group.interface';
import permissionIds from '@desktop-contracts/permissions/permission-ids.constants';

const roleCatalog: Readonly<Record<string, RoleGroup>> = {
  ventas: {
    name: 'Ventas',
    roles: {
      modificarImportes: {
        id: permissionIds.ventas.modificarImportes,
        name: 'Modificar importes, descuentos o descuentos directos.',
        description:
          'Indica si un empleado puede modificar el importe directo de un artículo en una venta o si puede aplicar descuentos directos.',
      },
    },
  },

  marca: {
    name: 'Marcas',
    roles: {
      crear: {
        id: 2,
        name: 'Crear nuevas marcas.',
        description: 'Permite al empleado crear una nueva marca.',
      },
      modificar: {
        id: 3,
        name: 'Modificar datos de una marca.',
        description:
          'Permite al empleado modificar los datos de una marca como la foto, datos de contacto u observaciones.',
      },
      borrar: {
        id: 4,
        name: 'Borrar una marca.',
        description:
          'Permite al empleado borrar una marca. No se borrarán los artículos de esa marca, pero todos los artículos de esa marca dejarán de estar disponibles para venta hasta que no se les asigne una marca nueva.',
      },
      estadisticas: {
        id: 5,
        name: 'Consultar estadísticas de una marca.',
        description:
          'Permite al empleado consultar las estadísticas de ventas y reposiciones de artículos de una marca.',
      },
    },
  },

  proveedor: {
    name: 'Proveedores',
    roles: {
      crear: {
        id: 6,
        name: 'Crear nuevos proveedores.',
        description: 'Permite al empleado crear un nuevo proveedor.',
      },
      modificar: {
        id: 7,
        name: 'Modificar datos de un proveedor.',
        description:
          'Permite al empleado modificar los datos de un proveedor como la foto, datos de contacto u observaciones.',
      },
      borrar: {
        id: 8,
        name: 'Borrar un proveedor.',
        description:
          'Permite al empleado borrar un proveedor. Las marcas asociadas al proveedor no se borrarán, pero sí se borrarán sus comerciales asociados.',
      },
      estadisticas: {
        id: 9,
        name: 'Consultar estadísticas de un proveedor.',
        description:
          'Permite al empleado consultar las estadísticas de ventas y reposiciones de artículos de un proveedor.',
      },
    },
  },

  articulos: {
    name: 'Artículos',
    roles: {
      crear: {
        id: 10,
        name: 'Crear nuevos artículos.',
        description: 'Permite al empleado crear un nuevo artículo.',
      },
      modificar: {
        id: 11,
        name: 'Modificar datos de un artículo.',
        description:
          'Permite al empleado modificar los datos de un artículo como sus precios, stocks, marca o proveedor.',
      },
      borrar: {
        id: 12,
        name: 'Borrar un artículo.',
        description:
          'Permite al empleado borrar un artículo. Las ventas asociadas al artículo no se borrarán, pero el artículo dejará de estar disponible para su venta.',
      },
      estadisticas: {
        id: 13,
        name: 'Consultar estadísticas de un artículo.',
        description:
          'Permite al empleado consultar las estadísticas de ventas y reposiciones de un artículo.',
      },
      modificarObservaciones: {
        id: 14,
        name: 'Modificar observaciones de un artículo.',
        description:
          'Permite al empleado modificar las observaciones de un artículo, así como indicar cuándo o dónde deben mostrarse estas observaciones.',
      },
    },
  },

  clientes: {
    name: 'Clientes',
    roles: {
      crear: {
        id: 15,
        name: 'Crear nuevos clientes.',
        description: 'Permite al empleado crear un nuevo cliente.',
      },
      modificar: {
        id: 16,
        name: 'Modificar datos de un cliente.',
        description:
          'Permite al empleado modificar los datos de un cliente como su dirección, datos de contacto u observaciones.',
      },
      borrar: {
        id: 17,
        name: 'Borrar un cliente.',
        description:
          'Permite al empleado borrar un cliente. Las ventas asociadas al cliente no se borrarán, pero dejarán de estar vinculadas a un cliente concreto.',
      },
    },
  },

  gestion: {
    name: 'Gestión',
    roles: {
      modificarAjustesIniciales: {
        id: 18,
        name: 'Modificar ajustes generales de la aplicación.',
        description:
          'Permite al empleado modificar los ajustes generales de la aplicación como datos del negocio, IVAs a usar, márgenes de beneficio o datos de la tienda online.',
      },
      tiposPago: {
        id: 19,
        name: 'Modificar tipos de pago.',
        description: 'Permite al empleado modificar los tipos de pago de la aplicación.',
      },
    },
  },

  empleados: {
    name: 'Empleados',
    roles: {
      crear: {
        id: 20,
        name: 'Crear nuevos empleados.',
        description: 'Permite al empleado crear un nuevo empleado.',
      },
      modificar: {
        id: 21,
        name: 'Modificar datos de un empleado.',
        description:
          'Permite al empleado modificar los datos de un empleado como su nombre, contraseña o color.',
      },
      borrar: {
        id: 22,
        name: 'Borrar un empleado.',
        description:
          'Permite al empleado borrar a otro empleado. Las ventas asociadas al empleado no se borrarán, pero dejarán de estar vinculadas a un empleado concreto.',
      },
      roles: {
        id: 23,
        name: 'Modificar permisos de un empleado.',
        description:
          'Permite al empleado modificar los permisos que tienen los otros empleados. Esto les permitirá acceder a distintos apartados o realizar distintas acciones.',
      },
      estadisticas: {
        id: 24,
        name: 'Consultar estadísticas de un empleado.',
        description:
          'Permite al empleado consultar sus estadísticas de ventas y las de otros empleados.',
      },
    },
  },
};

export default roleCatalog;
