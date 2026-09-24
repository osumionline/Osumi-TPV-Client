import type OtpvV3RestoreWorkspace from '@backend/contracts/backup/otpv-v3-restore-workspace.interface';

export default interface OtpvV3RestoreStagingPreparer {
  /**
   * Convierte el contenido portable ya validado
   * en el staging canónico listo para promoción.
   */
  prepare(workspace: OtpvV3RestoreWorkspace, backupApiKey: string): Promise<void>;

  /**
   * Elimina cualquier staging canónico
   * perteneciente a una restauración v3 preparada.
   */
  clear(): Promise<void>;
}
