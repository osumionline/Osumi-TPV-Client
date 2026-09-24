import BackupService from '@backend/application/backup/backup.service';
import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';
import type {
  OtpvV3BuildPackageCommand,
  OtpvV3PackageBuilder,
  OtpvV3PackageBuildResult,
} from '@backend/contracts/backup/otpv-v3-package-builder.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

let secretStorage: MemorySecretStorage;
let packageBuilder: TestPackageBuilder;
let service: BackupService;

describe('BackupService', (): void => {
  beforeEach((): void => {
    secretStorage = new MemorySecretStorage({
      secretApi: 'api-secret',
      backupApiKey: 'backup-secret',
      emailSmtpPass: null,
      ticketBaiToken: null,
    });

    packageBuilder = new TestPackageBuilder();
    service = new BackupService('/backups', secretStorage, packageBuilder);
  });

  it('crea una copia local utilizando la TPV Backup key almacenada', async (): Promise<void> => {
    const result = await service.createLocal();

    expect(packageBuilder.command).not.toBeNull();
    expect(packageBuilder.command?.backupApiKey).toBe('backup-secret');
    expect(
      packageBuilder.command?.destinationFile.startsWith(join('/backups', 'osumi-tpv-backup-')),
    ).toBe(true);
    expect(packageBuilder.command?.destinationFile.endsWith('.otpv')).toBe(true);

    expect(result).toEqual({
      backupId: '123e4567-e89b-42d3-a456-426614174000',
      createdAt: '2026-09-24T08:00:00.000Z',
      fileName: packageBuilder.command?.destinationFile.split(/[\\/]/).pop(),
      sizeBytes: 12345,
    });
  });

  it('rechaza crear una copia sin TPV Backup key', async (): Promise<void> => {
    secretStorage.value = {
      secretApi: '',
      backupApiKey: '',
      emailSmtpPass: null,
      ticketBaiToken: null,
    };

    await expect(service.createLocal()).rejects.toThrow(
      'La instalación no tiene configurada una TPV Backup key.',
    );

    expect(packageBuilder.command).toBeNull();
  });

  it('rechaza crear una copia si no existen secretos de instalación', async (): Promise<void> => {
    secretStorage.value = null;

    await expect(service.createLocal()).rejects.toThrow(
      'La instalación no tiene configurada una TPV Backup key.',
    );

    expect(packageBuilder.command).toBeNull();
  });
});

class MemorySecretStorage implements SecretStorage {
  /**
   * Crea el almacenamiento en memoria.
   */
  constructor(public value: InstallationSecretsData | null) {}

  /**
   * Indica si existen secretos.
   */
  async exists(): Promise<boolean> {
    return this.value !== null;
  }

  /**
   * Devuelve los secretos almacenados.
   */
  async load(): Promise<InstallationSecretsData | null> {
    return this.value === null ? null : structuredClone(this.value);
  }

  /**
   * Guarda los secretos indicados.
   */
  async save(secrets: InstallationSecretsData): Promise<void> {
    this.value = structuredClone(secrets);
  }

  /**
   * Elimina los secretos almacenados.
   */
  async delete(): Promise<void> {
    this.value = null;
  }
}

class TestPackageBuilder implements OtpvV3PackageBuilder {
  command: OtpvV3BuildPackageCommand | null = null;

  /**
   * Simula la generación de un `.otpv`.
   */
  async create(command: OtpvV3BuildPackageCommand): Promise<OtpvV3PackageBuildResult> {
    this.command = command;

    return {
      manifest: createManifest(),
      destinationFile: command.destinationFile,
      sizeBytes: 12345,
    };
  }
}

/**
 * Construye un manifest de prueba compatible
 * con el contrato v3.
 */
function createManifest(): OtpvV3Manifest {
  return {
    formatVersion: 3,
    application: 'Osumi TPV Client',
    applicationVersion: '0.0.0',
    databaseSchemaVersion: 1,
    backupId: '123e4567-e89b-42d3-a456-426614174000',
    createdAt: '2026-09-24T08:00:00.000Z',
    cryptoSuite: 'otpv3-hkdf-sha256-aes-256-gcm',
    authenticatedData: 'e30=',
    kdf: {
      algorithm: 'hkdf-sha256',
      salt: Buffer.alloc(32, 1).toString('base64'),
      info: 'osumi-tpv-backup:v3:kek',
      length: 32,
    },
    keyWrap: {
      algorithm: 'aes-256-gcm',
      iv: Buffer.alloc(12, 2).toString('base64'),
      authTag: Buffer.alloc(16, 3).toString('base64'),
      wrappedDek: Buffer.alloc(32, 4).toString('base64'),
    },
    payload: {
      entry: 'payload.enc',
      format: 'zip',
      algorithm: 'aes-256-gcm',
      iv: Buffer.alloc(12, 5).toString('base64'),
      authTag: Buffer.alloc(16, 6).toString('base64'),
    },
  };
}
