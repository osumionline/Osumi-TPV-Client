const IPC_CHANNELS = {
  systemGetAppInfo: 'system:get-app-info',

  legacyImportSelectPackage: 'legacy-import:select-package',
  legacyImportAnalyzePackage: 'legacy-import:analyze-package',
  legacyImportConfirmReviewDecisions: 'legacy-import:confirm-review-decisions',
  legacyImportStart: 'legacy-import:start',
  legacyImportProgress: 'legacy-import:progress',

  configurationGetAppData: 'configuration:get-app-data',
  configurationInstall: 'configuration:install',

  printingGetPrinters: 'printing:get-printers',
  printingGetSettings: 'printing:get-settings',
  printingSetTicketPrinter: 'printing:set-ticket-printer',
  printingRenderPdf: 'printing:render-pdf',
  printingPrintTicket: 'printing:print-ticket',
  printingPrintPdf: 'printing:print-pdf',

  applicationGetState: 'application:get-state',

  marcasGetAll: 'marcas:get-all',
  marcasCreate: 'marcas:create',

  proveedoresGetAll: 'proveedores:get-all',
  proveedoresCreate: 'proveedores:create',

  empleadosGetAll: 'empleados:get-all',

  clientesGetAll: 'clientes:get-all',
  clientesCreate: 'clientes:create',
  clientesUpdate: 'clientes:update',
  clientesDeactivate: 'clientes:deactivate',
  clientesGetFacturas: 'clientes:get-facturas',
  clientesGetFacturaVentasDisponibles: 'clientes:get-factura-ventas-disponibles',
  clientesGetEstadisticas: 'clientes:get-estadisticas',
  clientesGetEstadisticasGenerales: 'clientes:get-estadisticas-generales',
  clientesGetConsumoMensual: 'clientes:get-consumo-mensual',

  categoriasGetAll: 'categorias:get-all',

  articulosGetById: 'articulos:get-by-id',
  articulosResolveByCode: 'articulos:resolve-by-code',
  articulosGetAccesosDirectos: 'articulos:get-accesos-directos',
  articulosSetAccesoDirecto: 'articulos:set-acceso-directo',
  articulosGetHistorico: 'articulos:get-historico',
  articulosGetEstadisticas: 'articulos:get-estadisticas',
  articulosSave: 'articulos:save',
  articulosDeactivate: 'articulos:deactivate',

  filesStageArticleImage: 'files:stage-article-image',
  filesDiscardStagedImage: 'files:discard-staged-image',

  cajaOpen: 'caja:open',

  reservasCreate: 'reservas:create',
  reservasGetAll: 'reservas:get-all',
  reservasDeleteLinea: 'reservas:delete-linea',
  reservasDelete: 'reservas:delete',

  ventasGetContext: 'ventas:get-context',
  ventasResolveArticulo: 'ventas:resolve-articulo',
  ventasSearchArticulos: 'ventas:search-articulos',
  ventasGetAccesosDirectos: 'ventas:get-accesos-directos',
  ventasGetDevolucion: 'ventas:get-devolucion',
  ventasGetHistorico: 'ventas:get-historico',
  ventasGetHistoricoDetalle: 'ventas:get-historico-detalle',
  ventasCambiarCliente: 'ventas:cambiar-cliente',
  ventasCambiarTipoPago: 'ventas:cambiar-tipo-pago',
  ventasGetTicket: 'ventas:get-ticket',
  ventasGetTicketPdf: 'ventas:get-ticket-pdf',
  ventasSaveTicketPdf: 'ventas:save-ticket-pdf',
  ventasSendTicketEmail: 'ventas:send-ticket-email',
  ventasProcessTicketBai: 'ventas:process-ticket-bai',
  ventasReconcileTicketBai: 'ventas:reconcile-ticket-bai',
  ventasRetryTicketBai: 'ventas:retry-ticket-bai',
  ventasSave: 'ventas:save',
} as const;

export default IPC_CHANNELS;
