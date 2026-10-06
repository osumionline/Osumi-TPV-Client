import BackupRemoteDownloadService from '@backend/application/backup/backup-remote-download.service';
import BackupRemoteService from '@backend/application/backup/backup-remote.service';
import type {
  BackupRemoteClient,
  BackupRemoteDownloadTransferResult,
  BackupRemoteSession,
} from '@backend/contracts/backup/backup-remote-client.interface';
import type BackupRemoteCredentialStorage from '@backend/contracts/backup/backup-remote-credential-storage.interface';
import type {
  BackupRemoteBackup,
  BackupRemoteCredentials,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const NOW: number = 1_800_000_000;

const BACKUP_CONTENT: Buffer = Buffer.from('remote-otpv-content', 'utf8');

const BACKUP_SHA256: string = createHash('sha256').update(BACKUP_CONTENT).digest('hex');

let tempDirectory: string | null = null;
let client: TestBackupRemoteClient;
let remoteService: BackupRemoteService;
let service: BackupRemoteDownloadService;

describe('BackupRemoteDownloadService', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-remote-download-service-'));

    client = new TestBackupRemoteClient();

    remoteService = new BackupRemoteService(
      client,
      new TestBackupRemoteCredentialStorage(),
      (): number => NOW,
    );

    service = new BackupRemoteDownloadService(tempDirectory, remoteService);
  });

  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
  });

  it('descarga, valida y promociona una copia remota', async (): Promise<void> => {
    const result = await service.download('backup-public-id');

    expect(result.publicId).toBe('backup-public-id');

    expect(result.backupId).toBe('123e4567-e89b-42d3-a456-426614174000');

    expect(result.originalFilename).toBe('original.otpv');

    expect(result.fileName).toMatch(/^osumi-tpv-backup-remote-[0-9a-f-]{36}\.otpv$/i);

    expect(result.sizeBytes).toBe(BACKUP_CONTENT.length);

    expect(result.sha256).toBe(BACKUP_SHA256);

    expect(await readFile(join(requireTempDirectory(), result.fileName))).toEqual(BACKUP_CONTENT);

    expect(await readdir(requireTempDirectory())).toEqual([result.fileName]);
  });

  it('elimina la descarga si el hash no coincide', async (): Promise<void> => {
    client.downloadContent = Buffer.from('remote-otpv-corrupt', 'utf8');

    await expect(service.download('backup-public-id')).rejects.toMatchObject({
      kind: 'invalid-backup',
    });

    expect(await readdir(requireTempDirectory())).toEqual([]);
  });

  it('rechaza un publicId que no pertenece al listado remoto', async (): Promise<void> => {
    await expect(service.download('missing-backup')).rejects.toMatchObject({
      kind: 'not-found',
    });

    expect(client.downloadCalls).toHaveLength(0);
  });
});

/**
 * Cliente remoto controlado para probar
 * la promoción e integridad de descargas.
 */
class TestBackupRemoteClient implements BackupRemoteClient {
  readonly downloadCalls: {
    readonly token: string;
    readonly publicId: string;
    readonly destinationFile: string;
  }[] = [];

  downloadContent: Buffer = BACKUP_CONTENT;

  /**
   * Devuelve una sesión remota válida.
   */
  async authenticate(credentials: BackupRemoteCredentials): Promise<BackupRemoteSession> {
    void credentials;

    return {
      token: 'test-token',
      expiresAt: NOW + 3600,
      installation: {
        publicId: 'installation-public-id',
        name: 'Tienda',
      },
      subscription: {
        publicId: 'subscription-public-id',
        name: 'Suscripción',
        status: 'active',
      },
      canUpload: true,
    };
  }

  /**
   * Devuelve el listado remoto autoritativo.
   */
  async list(token: string): Promise<readonly BackupRemoteBackup[]> {
    void token;

    return [
      {
        publicId: 'backup-public-id',
        backupId: '123e4567-e89b-42d3-a456-426614174000',
        createdAtClient: '2026-10-05 20:30:00',
        formatVersion: 3,
        applicationVersion: '0.0.0',
        databaseSchemaVersion: 1,
        originalFilename: 'original.otpv',
        sizeBytes: BACKUP_CONTENT.length,
        sha256: BACKUP_SHA256,
        createdAt: '2026-10-05 20:31:00',
      },
    ];
  }

  /**
   * No se utiliza durante estos tests.
   */
  async upload(
    token: string,
    filePath: string,
    fileName: string,
  ): Promise<BackupRemoteUploadResult> {
    void token;
    void filePath;
    void fileName;

    throw new Error('Upload no esperado en este test.');
  }

  /**
   * Escribe la copia simulada en el destino
   * solicitado por el servicio de aplicación.
   */
  async download(
    token: string,
    publicId: string,
    destinationFile: string,
  ): Promise<BackupRemoteDownloadTransferResult> {
    this.downloadCalls.push({
      token,
      publicId,
      destinationFile,
    });

    await writeFile(destinationFile, this.downloadContent);

    return {
      sizeBytes: this.downloadContent.length,

      sha256: createHash('sha256').update(this.downloadContent).digest('hex'),
    };
  }
}

/**
 * Storage de credenciales mínimo
 * utilizado durante los tests.
 */
class TestBackupRemoteCredentialStorage implements BackupRemoteCredentialStorage {
  /**
   * Indica que existen credenciales.
   */
  async exists(): Promise<boolean> {
    return true;
  }

  /**
   * Devuelve las credenciales simuladas.
   */
  async load(): Promise<BackupRemoteCredentials> {
    return {
      keyId: 'remote-key-id',
      secret: 'remote-secret',
    };
  }

  /**
   * No se utiliza durante estos tests.
   */
  save(credentials: BackupRemoteCredentials): Promise<void> {
    void credentials;

    return Promise.resolve();
  }

  /**
   * No se utiliza durante estos tests.
   */
  delete(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Devuelve el directorio temporal
 * inicializado para el test actual.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return tempDirectory;
}
