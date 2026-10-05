import type { BackupRemoteCredentials } from '@backend/contracts/backup/backup-remote-client.interface';

export default interface BackupRemoteCredentialStorage {
  /**
   * Indica si existe una credencial remota almacenada.
   */
  exists(): Promise<boolean>;

  /**
   * Obtiene la credencial remota almacenada.
   */
  load(): Promise<BackupRemoteCredentials | null>;

  /**
   * Guarda la credencial remota indicada.
   */
  save(credentials: BackupRemoteCredentials): Promise<void>;

  /**
   * Elimina la credencial remota almacenada.
   */
  delete(): Promise<void>;
}
