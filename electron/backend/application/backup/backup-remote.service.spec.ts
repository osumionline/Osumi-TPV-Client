import BackupRemoteService from '@backend/application/backup/backup-remote.service';
import { BackupRemoteClientError } from '@backend/contracts/backup/backup-remote-client.error';
import type {
  BackupRemoteClient,
  BackupRemoteSession,
} from '@backend/contracts/backup/backup-remote-client.interface';
import type BackupRemoteCredentialStorage from '@backend/contracts/backup/backup-remote-credential-storage.interface';
import {
  BackupRemoteBackup,
  BackupRemoteConnection,
  BackupRemoteCredentials,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';
import { beforeEach, describe, expect, it } from 'vitest';

const NOW = 1_800_000_000;

let client: TestBackupRemoteClient;
let credentialStorage: TestBackupRemoteCredentialStorage;
let service: BackupRemoteService;

describe('BackupRemoteService', (): void => {
  beforeEach((): void => {
    client = new TestBackupRemoteClient();
    credentialStorage = new TestBackupRemoteCredentialStorage();
    service = new BackupRemoteService(client, credentialStorage, (): number => NOW);
  });

  it('valida las credenciales antes de persistirlas', async (): Promise<void> => {
    const result: BackupRemoteConnection = await service.configure({
      keyId: '  remote-key-id  ',
      secret: ' remote-secret ',
    });

    expect(client.authenticateCalls).toEqual([
      {
        keyId: 'remote-key-id',
        secret: ' remote-secret ',
      },
    ]);

    expect(credentialStorage.value).toEqual({
      keyId: 'remote-key-id',
      secret: ' remote-secret ',
    });

    expect(result).toEqual({
      expiresAt: NOW + 3600,
      installation: {
        publicId: 'installation-public-id',
        name: 'Tienda',
      },
      subscription: {
        publicId: 'subscription-public-id',
        name: 'Indomables',
        status: 'active',
      },
      canUpload: true,
    });

    expect('token' in result).toBe(false);
  });

  it('rechaza una estructura de credenciales inválida antes de contactar con el API', async (): Promise<void> => {
    await expect(
      service.configure({
        keyId: '',
        secret: 123,
      }),
    ).rejects.toThrow('Las credenciales de TPV Backup no son válidas.');

    expect(client.authenticateCalls).toHaveLength(0);
    expect(credentialStorage.saveCalls).toBe(0);
  });

  it('no reemplaza las credenciales si la autenticación falla', async (): Promise<void> => {
    credentialStorage.value = {
      keyId: 'current-key-id',
      secret: 'current-secret',
    };

    client.authenticateError = new BackupRemoteClientError(
      'unauthorized',
      'Invalid installation credentials.',
      401,
    );

    await expect(
      service.configure({
        keyId: 'new-key-id',
        secret: 'new-secret',
      }),
    ).rejects.toBe(client.authenticateError);

    expect(credentialStorage.value).toEqual({
      keyId: 'current-key-id',
      secret: 'current-secret',
    });

    expect(credentialStorage.saveCalls).toBe(0);
  });

  it('reutiliza la sesión mientras continúa siendo válida', async (): Promise<void> => {
    credentialStorage.value = {
      keyId: 'remote-key-id',
      secret: 'remote-secret',
    };

    const firstResult: readonly BackupRemoteBackup[] = await service.list();
    const secondResult: readonly BackupRemoteBackup[] = await service.list();

    expect(firstResult).toEqual(client.backups);
    expect(secondResult).toEqual(client.backups);
    expect(client.authenticateCalls).toHaveLength(1);
    expect(client.listTokens).toEqual(['test-token', 'test-token']);
  });

  it('renueva una sesión que está próxima a caducar', async (): Promise<void> => {
    credentialStorage.value = {
      keyId: 'remote-key-id',
      secret: 'remote-secret',
    };

    client.sessions = [
      createSession(NOW + 20, 'first-token'),
      createSession(NOW + 3600, 'second-token'),
    ];

    await service.getConnection();
    await service.list();

    expect(client.authenticateCalls).toHaveLength(2);
    expect(client.listTokens).toEqual(['second-token']);
  });

  it('renueva una vez el JWT si el servidor rechaza anticipadamente la sesión', async (): Promise<void> => {
    credentialStorage.value = {
      keyId: 'remote-key-id',
      secret: 'remote-secret',
    };

    client.sessions = [
      createSession(NOW + 3600, 'first-token'),
      createSession(NOW + 3600, 'second-token'),
    ];

    client.rejectTokenOnce = 'first-token';

    const result: readonly BackupRemoteBackup[] = await service.list();

    expect(result).toEqual(client.backups);
    expect(client.authenticateCalls).toHaveLength(2);
    expect(client.listTokens).toEqual(['first-token', 'second-token']);
  });

  it('devuelve null si no existen credenciales configuradas', async (): Promise<void> => {
    await expect(service.getConnection()).resolves.toBeNull();

    expect(client.authenticateCalls).toHaveLength(0);
  });

  it('rechaza el listado cuando no existen credenciales configuradas', async (): Promise<void> => {
    await expect(service.list()).rejects.toThrow(
      'La instalación no tiene configuradas las credenciales de TPV Backup.',
    );

    expect(client.authenticateCalls).toHaveLength(0);
  });

  it('sube una copia utilizando una sesión autorizada', async (): Promise<void> => {
    credentialStorage.value = {
      keyId: 'remote-key-id',
      secret: 'remote-secret',
    };

    const result: BackupRemoteUploadResult = await service.upload(
      'C:\\backups\\backup.otpv',
      'backup.otpv',
    );

    expect(result).toEqual(client.uploadResult);

    expect(client.uploadCalls).toEqual([
      {
        token: 'test-token',
        filePath: 'C:\\backups\\backup.otpv',
        fileName: 'backup.otpv',
      },
    ]);
  });

  it('no inicia una subida si la suscripción no permite crear copias', async (): Promise<void> => {
    credentialStorage.value = {
      keyId: 'remote-key-id',
      secret: 'remote-secret',
    };

    client.sessions = [
      {
        ...createSession(NOW + 3600, 'expired-token'),
        subscription: {
          publicId: 'subscription-public-id',
          name: 'Indomables',
          status: 'expired',
        },
        canUpload: false,
      },
    ];

    await expect(service.upload('C:\\backups\\backup.otpv', 'backup.otpv')).rejects.toMatchObject({
      kind: 'forbidden',
    });

    expect(client.uploadCalls).toHaveLength(0);
  });

  it('renueva una vez el JWT si el servidor rechaza la sesión durante la subida', async (): Promise<void> => {
    credentialStorage.value = {
      keyId: 'remote-key-id',
      secret: 'remote-secret',
    };

    client.sessions = [
      createSession(NOW + 3600, 'first-token'),

      createSession(NOW + 3600, 'second-token'),
    ];

    client.rejectUploadTokenOnce = 'first-token';

    await service.upload('C:\\backups\\backup.otpv', 'backup.otpv');

    expect(client.authenticateCalls).toHaveLength(2);

    expect(client.uploadCalls.map((call): string => call.token)).toEqual([
      'first-token',
      'second-token',
    ]);
  });

  it('elimina la configuración remota persistida', async (): Promise<void> => {
    credentialStorage.value = {
      keyId: 'remote-key-id',
      secret: 'remote-secret',
    };

    await service.getConnection();

    expect(client.authenticateCalls).toHaveLength(1);

    await service.removeConfiguration();

    expect(credentialStorage.deleteCalls).toBe(1);
    expect(credentialStorage.value).toBeNull();

    await expect(service.getConnection()).resolves.toBeNull();
  });
});

/**
 * Crea una sesión remota de prueba.
 */
function createSession(expiresAt: number, token: string): BackupRemoteSession {
  return {
    token,
    expiresAt,
    installation: {
      publicId: 'installation-public-id',
      name: 'Tienda',
    },
    subscription: {
      publicId: 'subscription-public-id',
      name: 'Indomables',
      status: 'active',
    },

    canUpload: true,
  };
}

/**
 * Cliente remoto controlado utilizado por los tests.
 */
class TestBackupRemoteClient implements BackupRemoteClient {
  readonly authenticateCalls: BackupRemoteCredentials[] = [];
  readonly listTokens: string[] = [];

  readonly backups: readonly BackupRemoteBackup[] = [
    {
      publicId: 'backup-public-id',
      backupId: '123e4567-e89b-42d3-a456-426614174000',
      createdAtClient: '2026-10-05 07:18:39',
      formatVersion: 3,
      applicationVersion: '0.0.0',
      databaseSchemaVersion: 1,
      originalFilename: 'backup.otpv',
      sizeBytes: 18_985_903,
      sha256: '6bbab7ae745310e03a8a6b07d6fb7e01e94e4017c9f7355bf695eb5aab3a71b8',
      createdAt: '2026-10-05 09:20:58',
    },
  ];

  sessions: BackupRemoteSession[] = [createSession(NOW + 3600, 'test-token')];

  authenticateError: Error | null = null;
  rejectTokenOnce: string | null = null;

  readonly uploadCalls: {
    readonly token: string;
    readonly filePath: string;
    readonly fileName: string;
  }[] = [];

  readonly uploadResult: BackupRemoteUploadResult = {
    publicId: 'uploaded-public-id',
    backupId: '123e4567-e89b-42d3-a456-426614174001',
    createdAtClient: '2026-10-05 16:00:00',
    originalFilename: 'uploaded.otpv',
    sizeBytes: 4096,
    sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  };

  rejectUploadTokenOnce: string | null = null;

  /**
   * Simula la autenticación remota.
   */
  async authenticate(credentials: BackupRemoteCredentials): Promise<BackupRemoteSession> {
    this.authenticateCalls.push({
      ...credentials,
    });

    if (this.authenticateError !== null) {
      throw this.authenticateError;
    }

    const session: BackupRemoteSession | undefined = this.sessions.shift();

    if (session === undefined) {
      throw new Error('No hay más sesiones de prueba configuradas.');
    }

    return {
      ...session,
      installation: {
        ...session.installation,
      },
      subscription: {
        ...session.subscription,
      },
    };
  }

  /**
   * Simula el listado remoto de copias.
   */
  async list(token: string): Promise<readonly BackupRemoteBackup[]> {
    this.listTokens.push(token);

    if (this.rejectTokenOnce !== null && this.rejectTokenOnce === token) {
      this.rejectTokenOnce = null;

      throw new BackupRemoteClientError('forbidden', 'Invalid installation access token.', 403);
    }

    return this.backups.map((backup: BackupRemoteBackup): BackupRemoteBackup => ({
      ...backup,
    }));
  }

  /**
   * Simula la subida de una copia remota.
   */
  async upload(
    token: string,
    filePath: string,
    fileName: string,
  ): Promise<BackupRemoteUploadResult> {
    this.uploadCalls.push({
      token,
      filePath,
      fileName,
    });

    if (this.rejectUploadTokenOnce !== null && this.rejectUploadTokenOnce === token) {
      this.rejectUploadTokenOnce = null;

      throw new BackupRemoteClientError('forbidden', 'Invalid installation access token.', 403);
    }

    return {
      ...this.uploadResult,
    };
  }
}

/**
 * Storage de credenciales controlado
 * utilizado por los tests.
 */
class TestBackupRemoteCredentialStorage implements BackupRemoteCredentialStorage {
  value: BackupRemoteCredentials | null = null;
  saveCalls = 0;
  deleteCalls = 0;

  /**
   * Indica si existen credenciales de prueba.
   */
  async exists(): Promise<boolean> {
    return this.value !== null;
  }

  /**
   * Recupera las credenciales de prueba.
   */
  async load(): Promise<BackupRemoteCredentials | null> {
    return this.value === null
      ? null
      : {
          ...this.value,
        };
  }

  /**
   * Guarda las credenciales de prueba.
   */
  async save(credentials: BackupRemoteCredentials): Promise<void> {
    this.saveCalls++;

    this.value = {
      ...credentials,
    };
  }

  /**
   * Elimina las credenciales de prueba.
   */
  async delete(): Promise<void> {
    this.deleteCalls++;

    this.value = null;
  }
}
