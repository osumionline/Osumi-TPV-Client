import BackupRemoteRestoreSelectionService from '@backend/application/backup/backup-remote-restore-selection.service';
import type BackupRemoteDownloader from '@backend/contracts/backup/backup-remote-downloader.interface';
import type BackupRestorePackageSelector from '@backend/contracts/backup/backup-restore-package-selector.interface';
import type { BackupRemoteDownloadResult } from '@desktop-contracts/backup/backup-remote.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

type NativeRestoreSelection = Extract<
  BackupRestorePackageSelectionResult,
  {
    readonly status: 'selected';
    readonly mode: 'native-restore';
  }
>;

const BACKUP_ID: string = '11111111-1111-4111-8111-111111111111';

let tempDirectory: string | null = null;

describe('BackupRemoteRestoreSelectionService', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-remote-restore-selection-'));
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

  it('entrega la copia descargada al selector nativo', async (): Promise<void> => {
    const downloader = new TestRemoteDownloader();

    const selector = new TestPackageSelector();

    const service = new BackupRemoteRestoreSelectionService(
      requireTempDirectory(),
      downloader,
      selector,
    );

    const result = await service.select('backup-public-id');

    expect(downloader.publicIds).toEqual(['backup-public-id']);

    expect(selector.packagePath).toBe(join(requireTempDirectory(), 'downloaded.otpv'));

    expect(selector.fileName).toBe('original.otpv');

    expect(result).toMatchObject({
      status: 'selected',
      mode: 'native-restore',
      backupId: BACKUP_ID,
    });
  });

  it('rechaza una selección cuyo backupId no coincide', async (): Promise<void> => {
    const selector = new TestPackageSelector();

    selector.result = {
      ...createSelection(),
      backupId: '22222222-2222-4222-8222-222222222222',
    };

    const service = new BackupRemoteRestoreSelectionService(
      requireTempDirectory(),
      new TestRemoteDownloader(),
      selector,
    );

    await expect(service.select('backup-public-id')).rejects.toMatchObject({
      kind: 'invalid-backup',
    });
  });
});

/**
 * Downloader remoto controlado.
 */
class TestRemoteDownloader implements BackupRemoteDownloader {
  readonly publicIds: unknown[] = [];

  /**
   * Devuelve una descarga remota simulada.
   */
  async download(value: unknown): Promise<BackupRemoteDownloadResult> {
    this.publicIds.push(value);

    return {
      publicId: 'backup-public-id',
      backupId: BACKUP_ID,
      originalFilename: 'original.otpv',
      fileName: 'downloaded.otpv',
      sizeBytes: 4096,
      sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  }
}

/**
 * Selector de paquetes controlado.
 */
class TestPackageSelector implements BackupRestorePackageSelector {
  packagePath: string | null = null;
  fileName: string | null = null;

  result: BackupRestorePackageSelectionResult = createSelection();

  /**
   * Registra los datos recibidos.
   */
  async selectPackagePath(
    packagePath: string,
    fileName?: string,
  ): Promise<BackupRestorePackageSelectionResult> {
    this.packagePath = packagePath;

    this.fileName = fileName ?? null;

    return this.result;
  }
}

/**
 * Construye una selección nativa válida.
 */
function createSelection(): NativeRestoreSelection {
  return {
    status: 'selected',
    mode: 'native-restore',
    selectionId: 'selection-id',
    formatVersion: 3,
    fileName: 'original.otpv',
    backupId: BACKUP_ID,
    applicationVersion: '1.0.0',
    databaseSchemaVersion: 1,
    createdAt: '2026-10-06T12:00:00.000Z',
  };
}

/**
 * Devuelve el directorio temporal del test.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return tempDirectory;
}
