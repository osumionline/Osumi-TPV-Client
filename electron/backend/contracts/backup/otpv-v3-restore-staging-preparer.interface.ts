import type OtpvV3RestoreWorkspace from '@backend/contracts/backup/otpv-v3-restore-workspace.interface';
import type { BackupRemoteCredentials } from '@desktop-contracts/backup/backup-remote.interface';

export default interface OtpvV3RestoreStagingPreparer {
  /**
   * Convierte el contenido portable ya validado
   * en el staging canónico listo para promoción.
   *
   * Devuelve las credenciales remotas portables
   * que deberán restaurarse al finalizar.
   */
  prepare(
    workspace: OtpvV3RestoreWorkspace,
    backupApiKey: string,
  ): Promise<BackupRemoteCredentials | null>;

  /**
   * Elimina cualquier staging canónico
   * perteneciente a una restauración v3 preparada.
   */
  clear(): Promise<void>;
}
