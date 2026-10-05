import type { BackupRemoteCredentials } from '@backend/contracts/backup/backup-remote-client.interface';
import ElectronSafeStorageBackupRemoteCredentialStorage from '@infrastructure/electron/electron-safe-storage-backup-remote-credential-storage';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', (): object => ({
  safeStorage: {
    /**
     * Simula disponibilidad de almacenamiento seguro.
     */
    isAsyncEncryptionAvailable: async (): Promise<boolean> => true,

    /**
     * Simula el cifrado usado por los tests.
     */
    encryptStringAsync: async (value: string): Promise<Buffer> => Buffer.from(value, 'utf8'),

    /**
     * Simula el descifrado usado por los tests.
     */
    decryptStringAsync: async (
      value: Buffer,
    ): Promise<{
      readonly result: string;
      readonly shouldReEncrypt: boolean;
    }> => ({
      result: value.toString('utf8'),
      shouldReEncrypt: false,
    }),
  },
}));

describe('ElectronSafeStorageBackupRemoteCredentialStorage', (): void => {
  let directory: string;
  let filePath: string;
  let storage: ElectronSafeStorageBackupRemoteCredentialStorage;

  beforeEach(async (): Promise<void> => {
    directory = await mkdtemp(join(tmpdir(), 'osumi-tpv-backup-remote-'));

    filePath = join(directory, 'backup_remote_credentials.json');

    storage = new ElectronSafeStorageBackupRemoteCredentialStorage(filePath);
  });

  afterEach(async (): Promise<void> => {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  });

  it('devuelve null cuando no existen credenciales almacenadas', async (): Promise<void> => {
    await expect(storage.exists()).resolves.toBe(false);
    await expect(storage.load()).resolves.toBeNull();
  });

  it('guarda y recupera las credenciales remotas', async (): Promise<void> => {
    const credentials: BackupRemoteCredentials = {
      keyId: 'remote-key-id',
      secret: 'remote-secret',
    };

    await storage.save(credentials);

    await expect(storage.exists()).resolves.toBe(true);

    await expect(storage.load()).resolves.toEqual(credentials);

    const storedContent: string = await readFile(filePath, {
      encoding: 'utf8',
    });

    expect(storedContent).not.toContain('remote-key-id');
    expect(storedContent).not.toContain('remote-secret');
  });

  it('elimina las credenciales almacenadas', async (): Promise<void> => {
    await storage.save({
      keyId: 'remote-key-id',
      secret: 'remote-secret',
    });

    await storage.delete();

    await expect(storage.exists()).resolves.toBe(false);
    await expect(storage.load()).resolves.toBeNull();
  });

  it('rechaza credenciales descifradas con estructura no válida', async (): Promise<void> => {
    const invalidCredentials: string = JSON.stringify({
      keyId: '',
      secret: '',
    });

    await writeFile(
      filePath,
      JSON.stringify({
        schemaVersion: 1,
        encryptedData: Buffer.from(invalidCredentials, 'utf8').toString('base64'),
      }),
      {
        encoding: 'utf8',
      },
    );

    await expect(storage.load()).rejects.toThrow(
      'Las credenciales almacenadas de TPV Backup no son válidas.',
    );
  });
});
