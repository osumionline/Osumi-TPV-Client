import type BackupRemoteCreateService from '@backend/application/backup/backup-remote-create.service';
import type BackupRemoteDownloadService from '@backend/application/backup/backup-remote-download.service';
import type BackupRemoteService from '@backend/application/backup/backup-remote.service';
import type BackupRestoreSelectionService from '@backend/application/backup/backup-restore-selection.service';
import type BackupService from '@backend/application/backup/backup.service';
import type OtpvV3RestoreFinalizeService from '@backend/application/backup/otpv-v3-restore-finalize.service';
import type OtpvV3RestoreUnlockService from '@backend/application/backup/otpv-v3-restore-unlock.service';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type {
  BackupRemoteBackup,
  BackupRemoteConnection,
  BackupRemoteDownloadResult,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';
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
  backupRemoteService: BackupRemoteService,
  backupRemoteCreateService: BackupRemoteCreateService,
  backupRemoteDownloadService: BackupRemoteDownloadService,
  backupRestoreSelectionService: BackupRestoreSelectionService,
  restoreUnlockService: OtpvV3RestoreUnlockService,
  restoreFinalizeService: OtpvV3RestoreFinalizeService,
): void {
  ipcMain.handle(IPC_CHANNELS.backupCreateLocal, async (event): Promise<BackupCreateResult> => {
    assertTrustedSender(event, getMainWindow);

    return backupService.createLocal();
  });

  ipcMain.handle(
    IPC_CHANNELS.backupRemoteConfigure,
    async (event, credentials: unknown): Promise<BackupRemoteConnection> => {
      assertTrustedSender(event, getMainWindow);

      return backupRemoteService.configure(credentials);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.backupRemoteGetConnection,
    async (event): Promise<BackupRemoteConnection | null> => {
      assertTrustedSender(event, getMainWindow);

      return backupRemoteService.getConnection();
    },
  );

  ipcMain.handle(IPC_CHANNELS.backupRemoteRemoveConfiguration, async (event): Promise<void> => {
    assertTrustedSender(event, getMainWindow);

    await backupRemoteService.removeConfiguration();
  });

  ipcMain.handle(
    IPC_CHANNELS.backupRemoteGetBackups,
    async (event): Promise<readonly BackupRemoteBackup[]> => {
      assertTrustedSender(event, getMainWindow);

      return backupRemoteService.list();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.backupRemoteCreate,
    async (event): Promise<BackupRemoteUploadResult> => {
      assertTrustedSender(event, getMainWindow);

      return backupRemoteCreateService.create();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.backupRemoteDownload,
    async (event, publicId: unknown): Promise<BackupRemoteDownloadResult> => {
      assertTrustedSender(event, getMainWindow);

      return backupRemoteDownloadService.download(publicId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.backupRemoteDelete,
    async (event, publicId: unknown): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await backupRemoteService.delete(publicId);
    },
  );

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
