import type BackupRemoteCredentialStorage from '@backend/contracts/backup/backup-remote-credential-storage.interface';
import type { BackupRemoteCredentials } from '@desktop-contracts/backup/backup-remote.interface';

/**
 * Mantiene credenciales de TPV Backup exclusivamente
 * en memoria durante el proceso actual.
 */
export default class InMemoryBackupRemoteCredentialStorage implements BackupRemoteCredentialStorage {
  private credentials: BackupRemoteCredentials | null = null;

  /**
   * Indica si existen credenciales temporales.
   */
  async exists(): Promise<boolean> {
    return this.credentials !== null;
  }

  /**
   * Recupera las credenciales temporales.
   */
  async load(): Promise<BackupRemoteCredentials | null> {
    if (this.credentials === null) {
      return null;
    }

    return {
      keyId: this.credentials.keyId,
      secret: this.credentials.secret,
    };
  }

  /**
   * Guarda las credenciales únicamente en memoria.
   */
  async save(credentials: BackupRemoteCredentials): Promise<void> {
    this.credentials = {
      keyId: credentials.keyId,
      secret: credentials.secret,
    };
  }

  /**
   * Elimina las credenciales temporales.
   */
  async delete(): Promise<void> {
    this.credentials = null;
  }
}
