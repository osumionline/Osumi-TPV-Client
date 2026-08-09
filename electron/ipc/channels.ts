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
} as const;

export default IPC_CHANNELS;
