export interface EmpleadoPermissionDefinition {
  readonly id: number;
  readonly name: string;
  readonly description: string;
}

export interface EmpleadoPermissionGroup {
  readonly key: string;
  readonly name: string;
  readonly permissions: readonly EmpleadoPermissionDefinition[];
}

/**
 * Catálogo completo de permisos disponibles
 * para los empleados de la aplicación.
 *
 * Los permisos 1-24 conservan la definición
 * utilizada por el TPV anterior.
 */
export const EMPLEADO_PERMISSION_GROUPS = [
  {
    key: 'ventas',
    name: 'Ventas',
    permissions: [
      {
        id: 1,
        name: 'Modificar importes, descuentos o descuentos directos.',
        description:
          'Indica si un empleado puede modificar el importe directo de un artículo en una venta o si puede aplicar descuentos directos.',
      },
    ],
  },
  {
    key: 'marcas',
    name: 'Marcas',
    permissions: [
      {
        id: 2,
        name: 'Crear nuevas marcas.',
        description: 'Permite al empleado crear una nueva marca.',
      },
      {
        id: 3,
        name: 'Modificar datos de una marca.',
        description:
          'Permite al empleado modificar los datos de una marca como la foto, datos de contacto u observaciones.',
      },
      {
        id: 4,
        name: 'Borrar una marca',
        description:
          'Permite al empleado borrar una marca. No se borrarán los artículos de esa marca, pero todos los artículos de esa marca dejarán de estar disponibles para venta hasta que no se les asigne una marca nueva.',
      },
      {
        id: 5,
        name: 'Consultar estadísticas de una marca',
        description:
          'Permite al empleado consultar las estadísticas de ventas y reposiciones de artículos de una marca.',
      },
    ],
  },
  {
    key: 'proveedores',
    name: 'Proveedores',
    permissions: [
      {
        id: 6,
        name: 'Crear nuevos proveedores.',
        description: 'Permite al empleado crear un nuevo proveedor.',
      },
      {
        id: 7,
        name: 'Modificar datos de un proveedor.',
        description:
          'Permite al empleado modificar los datos de un proveedor como la foto, datos de contacto u observaciones.',
      },
      {
        id: 8,
        name: 'Borrar un proveedor',
        description:
          'Permite al empleado borrar un proveedor. Las marcas asociadas al proveedor no se borrarán, pero si se borrarán sus comerciales asociados.',
      },
      {
        id: 9,
        name: 'Consultar estadísticas de un proveedor',
        description:
          'Permite al empleado consultar las estadísticas de ventas y reposiciones de artículos de un proveedor.',
      },
    ],
  },
  {
    key: 'articulos',
    name: 'Artículos',
    permissions: [
      {
        id: 10,
        name: 'Crear nuevos artículos.',
        description: 'Permite al empleado crear un nuevo artículo.',
      },
      {
        id: 11,
        name: 'Modificar datos de un artículo.',
        description:
          'Permite al empleado modificar los datos de un artículo como sus precios, stocks, marca, proveedor...',
      },
      {
        id: 12,
        name: 'Borrar un artículo',
        description:
          'Permite al empleado borrar un artículo. Las ventas asociadas al artículo no se borrarán, pero el artículo dejará de estar disponible para su venta.',
      },
      {
        id: 13,
        name: 'Consultar estadísticas de un artículo',
        description:
          'Permite al empleado consultar las estadísticas de ventas y reposiciones de un artículo.',
      },
      {
        id: 14,
        name: 'Modificar observaciones de un artículo',
        description:
          'Permite al empleado modificar las observaciones de un artículo, asi como indicar cuando o donde deben mostrarse estas observaciones.',
      },
    ],
  },
  {
    key: 'clientes',
    name: 'Clientes',
    permissions: [
      {
        id: 15,
        name: 'Crear nuevos clientes.',
        description: 'Permite al empleado crear un nuevo cliente.',
      },
      {
        id: 16,
        name: 'Modificar datos de un cliente.',
        description:
          'Permite al empleado modificar los datos de un cliente como su dirección, datos de contacto u observaciones.',
      },
      {
        id: 17,
        name: 'Borrar un cliente',
        description:
          'Permite al empleado borrar un cliente. Las ventas asociadas al cliente no se borrarán, pero dejarán de estar vinculadas a un cliente concreto.',
      },
    ],
  },
  {
    key: 'gestion',
    name: 'Gestión',
    permissions: [
      {
        id: 18,
        name: 'Modificar ajustes generales de la aplicación.',
        description:
          'Permite al empleado modificar los ajustes generales de la aplicación como datos del negocio, IVAs a usar, márgenes de beneficio, datos de la tienda online...',
      },
      {
        id: 19,
        name: 'Modificar tipos de pago.',
        description: 'Permite al empleado modificar los tipos de pago de la aplicación.',
      },
    ],
  },
  {
    key: 'empleados',
    name: 'Empleados',
    permissions: [
      {
        id: 20,
        name: 'Crear nuevos empleados.',
        description: 'Permite al empleado crear un nuevo empleado.',
      },
      {
        id: 21,
        name: 'Modificar datos de un empleado.',
        description:
          'Permite al empleado modificar los datos de un empleado como su nombre, contraseña o color.',
      },
      {
        id: 22,
        name: 'Borrar un empleado',
        description:
          'Permite al empleado borrar a otro empleado. Las ventas asociadas al empleado no se borrarán, pero dejarán de estar vinculadas a un empleado concreto.',
      },
      {
        id: 23,
        name: 'Modificar permisos de un empleado',
        description:
          'Permite al empleado modificar los permisos que tienen los otros empleados. Esto les permitirá acceder a distintos apartados o realizar distintas acciones.',
      },
      {
        id: 24,
        name: 'Consultar estadísticas de un empleado',
        description:
          'Permite al empleado consultar sus estadísticas de ventas y las de otros empleados.',
      },
    ],
  },
  {
    key: 'copias',
    name: 'Copias de seguridad',
    permissions: [
      {
        id: 25,
        name: 'Gestionar copias de seguridad.',
        description:
          'Permite al empleado acceder y gestionar las copias de seguridad de la aplicación.',
      },
    ],
  },
] as const satisfies readonly EmpleadoPermissionGroup[];
