const IPC_CHANNELS = {
  systemGetAppInfo: 'system:get-app-info',
  legacyImportSelectPackage: 'legacy-import:select-package',
  legacyImportAnalyzePackage: 'legacy-import:analyze-package',
  legacyImportConfirmReviewDecisions: 'legacy-import:confirm-review-decisions',
  legacyImportStart: 'legacy-import:start',
  legacyImportProgress: 'legacy-import:progress',
  configurationInstall: 'configuration:install',
  applicationGetState: 'application:get-state',
  marcasGetAll: 'marcas:get-all',
  proveedoresGetAll: 'proveedores:get-all',
  empleadosGetAll: 'empleados:get-all',
  clientesGetAll: 'clientes:get-all',
  categoriasGetAll: 'categorias:get-all',
  cajaOpen: 'caja:open',
  ventasGetContext: 'ventas:get-context',
  ventasResolveArticulo: 'ventas:resolve-articulo',
  ventasSearchArticulos: 'ventas:search-articulos',
  ventasGetAccesosDirectos: 'ventas:get-accesos-directos',
} as const;

export default IPC_CHANNELS;
