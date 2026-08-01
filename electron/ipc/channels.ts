const IPC_CHANNELS = {
  systemGetAppInfo: 'system:get-app-info',
  legacyImportSelectPackage: 'legacy-import:select-package',
  configurationInstall: 'configuration:install',
  applicationGetState: 'application:get-state',
} as const;

export default IPC_CHANNELS;
