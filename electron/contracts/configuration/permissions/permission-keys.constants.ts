const permissionKeys = {
  ventas: {
    modificarImportes: 'ventas.modificar_importes',
  },
  gestion: {
    ajustes: 'gestion.ajustes',
    tiposPago: 'gestion.tipos_pago',
    empleados: 'gestion.empleados',
    copiasSeguridad: 'gestion.copias_seguridad',
  },
} as const;

export default permissionKeys;
