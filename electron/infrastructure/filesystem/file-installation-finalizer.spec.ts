import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import FileInstallationFinalizer from '@infrastructure/filesystem/file-installation-finalizer';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let paths: ApplicationPaths;
let finalizer: FileInstallationFinalizer;

describe('FileInstallationFinalizer', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-installation-finalizer-'));

    paths = createApplicationPaths(requireTempDirectory());

    await Promise.all([
      mkdir(paths.configDirectory, {
        recursive: true,
      }),

      mkdir(paths.assetsDirectory, {
        recursive: true,
      }),

      mkdir(paths.databaseDirectory, {
        recursive: true,
      }),

      mkdir(paths.secretsDirectory, {
        recursive: true,
      }),

      mkdir(paths.stagingFilesDirectory, {
        recursive: true,
      }),
    ]);

    finalizer = new FileInstallationFinalizer(paths);
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

  it('elimina el estado automático anterior al finalizar una nueva instalación', async (): Promise<void> => {
    await prepareCompleteStaging();

    await writeFile(
      paths.backupAutomaticStateFile,
      '{"schemaVersion":1,"lastSuccessfulAt":"2026-10-07T01:05:00.000Z"}',
      {
        encoding: 'utf8',
      },
    );

    await writeFile(`${paths.backupAutomaticStateFile}.tmp`, 'estado temporal', {
      encoding: 'utf8',
    });

    await finalizer.finalize();

    await expect(access(paths.backupAutomaticStateFile)).rejects.toThrow();

    await expect(access(`${paths.backupAutomaticStateFile}.tmp`)).rejects.toThrow();

    await expect(access(paths.appDataFile)).resolves.toBeUndefined();
  });

  it('conserva el estado automático de una instalación ya completada durante recover', async (): Promise<void> => {
    const stateContent: string =
      '{"schemaVersion":1,"lastSuccessfulAt":"2026-10-07T01:05:00.000Z"}';

    await writeFile(paths.appDataFile, '{}', {
      encoding: 'utf8',
    });

    await writeFile(paths.backupAutomaticStateFile, stateContent, {
      encoding: 'utf8',
    });

    await finalizer.recover();

    await expect(
      readFile(paths.backupAutomaticStateFile, {
        encoding: 'utf8',
      }),
    ).resolves.toBe(stateContent);
  });

  /**
   * Construye todos los recursos necesarios
   * para que el staging pueda promocionarse.
   */
  async function prepareCompleteStaging(): Promise<void> {
    await Promise.all([
      writeFile(paths.stagingDatabaseFile, 'database', {
        encoding: 'utf8',
      }),

      writeFile(paths.stagingLogoFile, 'logo', {
        encoding: 'utf8',
      }),

      writeFile(paths.stagingSecretsFile, 'secrets', {
        encoding: 'utf8',
      }),

      writeFile(paths.stagingAppDataFile, '{}', {
        encoding: 'utf8',
      }),
    ]);
  }
});

/**
 * Construye las rutas utilizadas por el finalizador.
 */
function createApplicationPaths(rootDirectory: string): ApplicationPaths {
  const configDirectory: string = join(rootDirectory, 'config');
  const assetsDirectory: string = join(rootDirectory, 'assets');
  const filesDirectory: string = join(assetsDirectory, 'files');
  const databaseDirectory: string = join(rootDirectory, 'database');
  const backupsDirectory: string = join(rootDirectory, 'backups');
  const logsDirectory: string = join(rootDirectory, 'logs');
  const secretsDirectory: string = join(rootDirectory, 'secrets');
  const stagingDirectory: string = join(rootDirectory, 'staging');
  const stagingFilesDirectory: string = join(stagingDirectory, 'files');

  return {
    rootDirectory,
    configDirectory,
    assetsDirectory,
    filesDirectory,
    databaseDirectory,
    backupsDirectory,
    logsDirectory,
    secretsDirectory,
    stagingDirectory,
    stagingFilesDirectory,

    appDataFile: join(configDirectory, 'app_data.json'),
    printingSettingsFile: join(configDirectory, 'printing_settings.json'),
    backupAutomaticStateFile: join(configDirectory, 'backup_automatic_state.json'),
    logoFile: join(assetsDirectory, 'logo.webp'),
    databaseFile: join(databaseDirectory, 'osumi-tpv.sqlite'),
    secretsFile: join(secretsDirectory, 'secrets.json'),
    backupRemoteCredentialsFile: join(secretsDirectory, 'backup_remote_credentials.json'),

    stagingAppDataFile: join(stagingDirectory, 'app_data.json'),
    stagingLogoFile: join(stagingDirectory, 'logo.webp'),
    stagingSecretsFile: join(stagingDirectory, 'secrets.json'),
    stagingDatabaseFile: join(stagingDirectory, 'osumi-tpv.sqlite'),
  };
}

/**
 * Devuelve obligatoriamente el directorio
 * temporal activo.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal del test no está inicializado.');
  }

  return tempDirectory;
}
