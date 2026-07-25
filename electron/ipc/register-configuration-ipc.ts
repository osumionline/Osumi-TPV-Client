import type { ConfigurationService } from '@backend/application/configuration/configuration.service';
import { assertTrustedSender, type MainWindowProvider } from '@ipc/assert-trusted-sender';
import { IPC_CHANNELS } from '@ipc/channels';
import { ipcMain } from 'electron';

export function registerConfigurationIpc(
  getMainWindow: MainWindowProvider,
  configurationService: ConfigurationService,
): void {
  ipcMain.handle(IPC_CHANNELS.configurationIsConfigured, (event) => {
    assertTrustedSender(event, getMainWindow);

    return configurationService.isConfigured();
  });
}
