import type BackupRemoteCredentialStorage from '@backend/contracts/backup/backup-remote-credential-storage.interface';
import { BackupRemoteCredentials } from '@desktop-contracts/backup/backup-remote.interface';
import { safeStorage } from 'electron';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';

interface EncryptedBackupRemoteCredentialsFile {
  readonly schemaVersion: 1;
  readonly encryptedData: string;
}

/**
 * Persiste la credencial remota de TPV Backup
 * utilizando el almacenamiento seguro del sistema operativo.
 */
export default class ElectronSafeStorageBackupRemoteCredentialStorage implements BackupRemoteCredentialStorage {
  /**
   * Crea el almacenamiento para el fichero indicado.
   */
  constructor(private readonly filePath: string) {}

  /**
   * Indica si existe una credencial remota válida almacenada.
   */
  async exists(): Promise<boolean> {
    const credentials: BackupRemoteCredentials | null = await this.load();

    return credentials !== null;
  }

  /**
   * Recupera y descifra la credencial remota.
   */
  async load(): Promise<BackupRemoteCredentials | null> {
    try {
      const content: string = await readFile(this.filePath, {
        encoding: 'utf8',
      });

      const parsedFile: unknown = JSON.parse(content);

      if (!this.isEncryptedFile(parsedFile)) {
        throw new Error('El archivo de credenciales de TPV Backup no tiene una estructura válida.');
      }

      const encryptedBuffer: Buffer = Buffer.from(parsedFile.encryptedData, 'base64');

      const decryptedResult: {
        readonly result: string;
        readonly shouldReEncrypt: boolean;
      } = await safeStorage.decryptStringAsync(encryptedBuffer);

      const parsedCredentials: unknown = JSON.parse(decryptedResult.result);

      if (!this.isCredentials(parsedCredentials)) {
        throw new Error('Las credenciales almacenadas de TPV Backup no son válidas.');
      }

      const credentials: BackupRemoteCredentials = {
        keyId: parsedCredentials.keyId,
        secret: parsedCredentials.secret,
      };

      if (decryptedResult.shouldReEncrypt) {
        await this.save(credentials);
      }

      return credentials;
    } catch (error: unknown) {
      if (this.isFileNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Cifra y guarda de forma atómica la credencial remota.
   */
  async save(credentials: BackupRemoteCredentials): Promise<void> {
    if (!this.isCredentials(credentials)) {
      throw new Error('Las credenciales de TPV Backup no son válidas.');
    }

    const encryptionAvailable: boolean = await safeStorage.isAsyncEncryptionAvailable();

    if (!encryptionAvailable) {
      throw new Error('El sistema operativo no ofrece almacenamiento seguro.');
    }

    const plainText: string = JSON.stringify(credentials);

    const encryptedBuffer: Buffer = await safeStorage.encryptStringAsync(plainText);

    const encryptedFile: EncryptedBackupRemoteCredentialsFile = {
      schemaVersion: 1,
      encryptedData: encryptedBuffer.toString('base64'),
    };

    const temporaryFilePath: string = `${this.filePath}.tmp`;

    await writeFile(temporaryFilePath, `${JSON.stringify(encryptedFile, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });

    await rename(temporaryFilePath, this.filePath);
  }

  /**
   * Elimina la credencial remota almacenada.
   */
  async delete(): Promise<void> {
    await rm(this.filePath, {
      force: true,
    });
  }

  /**
   * Comprueba la estructura del contenedor cifrado.
   */
  private isEncryptedFile(value: unknown): value is EncryptedBackupRemoteCredentialsFile {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const data: Record<string, unknown> = value as Record<string, unknown>;

    return data['schemaVersion'] === 1 && typeof data['encryptedData'] === 'string';
  }

  /**
   * Comprueba la estructura de una credencial remota.
   */
  private isCredentials(value: unknown): value is BackupRemoteCredentials {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const data: Record<string, unknown> = value as Record<string, unknown>;

    return (
      typeof data['keyId'] === 'string' &&
      data['keyId'].trim() !== '' &&
      typeof data['secret'] === 'string' &&
      data['secret'] !== ''
    );
  }

  /**
   * Identifica un error de fichero inexistente.
   */
  private isFileNotFoundError(error: unknown): boolean {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT';
  }
}
