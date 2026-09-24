import type BackupService from '@backend/application/backup/backup.service';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import { assertTrustedSender, type MainWindowProvider } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los casos de uso de copias de seguridad.
 */
export default function registerBackupIpc(
  getMainWindow: MainWindowProvider,
  backupService: BackupService,
): void {
  ipcMain.handle(IPC_CHANNELS.backupCreateLocal, async (event): Promise<BackupCreateResult> => {
    assertTrustedSender(event, getMainWindow);

    return backupService.createLocal();
  });
}
