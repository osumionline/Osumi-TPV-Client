import type ConfigurationService from '@backend/application/configuration/configuration.service';
import type InstallationService from '@backend/application/configuration/installation.service';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';
import { assertTrustedSender, type MainWindowProvider } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los casos de uso de Configuración expuestos al renderer.
 */
export default function registerConfigurationIpc(
  getMainWindow: MainWindowProvider,
  configurationService: ConfigurationService,
  installationService: InstallationService,
): void {
  ipcMain.handle(IPC_CHANNELS.configurationGetAppData, async (event): Promise<AppData | null> => {
    assertTrustedSender(event, getMainWindow);

    return configurationService.load();
  });

  ipcMain.handle(
    IPC_CHANNELS.configurationInstall,
    async (event, command: unknown): Promise<InstallationResult> => {
      assertTrustedSender(event, getMainWindow);

      return installationService.install(command);
    },
  );
}
