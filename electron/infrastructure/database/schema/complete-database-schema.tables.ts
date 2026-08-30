const completeDatabaseSchemaTables: readonly string[] = [
  'application_metadata',
  'legacy_import',
  'terminal',
  'archivo',

  'empleado',
  'empleado_permiso',

  'tipo_pago',
  'secuencia_documento',
  'caja',
  'caja_tipo',
  'caja_recuento',
  'movimiento_caja',

  'categoria',
  'marca',
  'proveedor',
  'comercial',
  'proveedor_marca',
  'articulo',
  'articulo_categoria',
  'codigo_barras',
  'etiqueta',
  'articulo_etiqueta',
  'etiqueta_web',
  'articulo_etiqueta_web',
  'articulo_archivo',
  'merma_caducidad',
  'pedido',
  'linea_pedido',
  'pedido_archivo',
  'vista_pedido',

  'cliente',
  'reserva',
  'linea_reserva',

  'venta',
  'venta_pago',
  'linea_venta',
  'venta_reserva',
  'venta_ticketbai',

  'factura',
  'factura_venta',

  'historico_articulo',
  'historico_almacen',
];

export default completeDatabaseSchemaTables;
