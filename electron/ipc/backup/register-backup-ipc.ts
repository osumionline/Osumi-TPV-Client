import type BackupRestoreSelectionService from '@backend/application/backup/backup-restore-selection.service';
import type BackupService from '@backend/application/backup/backup.service';
import type OtpvV3RestoreFinalizeService from '@backend/application/backup/otpv-v3-restore-finalize.service';
import type OtpvV3RestoreUnlockService from '@backend/application/backup/otpv-v3-restore-unlock.service';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type BackupRestoreFinalizeResult from '@desktop-contracts/backup/backup-restore-finalize-result.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import type BackupRestoreUnlockCommand from '@desktop-contracts/backup/backup-restore-unlock-command.interface';
import type BackupRestoreUnlockResult from '@desktop-contracts/backup/backup-restore-unlock-result.interface';
import { assertTrustedSender, type MainWindowProvider } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los casos de uso de copias de seguridad.
 */
export default function registerBackupIpc(
  getMainWindow: MainWindowProvider,
  backupService: BackupService,
  backupRestoreSelectionService: BackupRestoreSelectionService,
  restoreUnlockService: OtpvV3RestoreUnlockService,
  restoreFinalizeService: OtpvV3RestoreFinalizeService,
): void {
  ipcMain.handle(IPC_CHANNELS.backupCreateLocal, async (event): Promise<BackupCreateResult> => {
    assertTrustedSender(event, getMainWindow);

    return backupService.createLocal();
  });

  ipcMain.handle(
    IPC_CHANNELS.backupSelectRestorePackage,
    async (event): Promise<BackupRestorePackageSelectionResult> => {
      assertTrustedSender(event, getMainWindow);

      return backupRestoreSelectionService.selectPackage();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.backupUnlockRestorePackage,
    async (event, command: BackupRestoreUnlockCommand): Promise<BackupRestoreUnlockResult> => {
      assertTrustedSender(event, getMainWindow);

      return restoreUnlockService.unlock(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.backupFinalizeRestorePackage,
    async (event, selectionId: string): Promise<BackupRestoreFinalizeResult> => {
      assertTrustedSender(event, getMainWindow);

      return restoreFinalizeService.finalize(selectionId);
    },
  );
}
