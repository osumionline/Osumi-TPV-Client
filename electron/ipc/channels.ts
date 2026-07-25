const IPC_CHANNELS = {
  systemGetAppInfo: 'system:get-app-info',
  configurationIsConfigured: 'configuration:is-configured',
  configurationInstall: 'configuration:install',
} as const;

export default IPC_CHANNELS;
