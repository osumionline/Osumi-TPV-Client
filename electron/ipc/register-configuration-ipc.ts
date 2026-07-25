import type ConfigurationService from '@backend/application/configuration/configuration.service';
import type InstallationService from '@backend/application/configuration/installation.service';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';
import { assertTrustedSender, type MainWindowProvider } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerConfigurationIpc(
  getMainWindow: MainWindowProvider,
  configurationService: ConfigurationService,
  installationService: InstallationService,
): void {
  ipcMain.handle(IPC_CHANNELS.configurationIsConfigured, async (event): Promise<boolean> => {
    assertTrustedSender(event, getMainWindow);

    return configurationService.isConfigured();
  });

  ipcMain.handle(
    IPC_CHANNELS.configurationInstall,
    async (event, command: unknown): Promise<InstallationResult> => {
      assertTrustedSender(event, getMainWindow);

      return installationService.install(command);
    },
  );
}
