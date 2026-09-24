import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import FileOtpvV3RestoreStagingPreparer from '@infrastructure/backup/file-otpv-v3-restore-staging.preparer';
import FileOtpvV3RestoreWorkspace from '@infrastructure/backup/file-otpv-v3-restore-workspace';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const BACKUP_KEY: string = '  backup-key-exacta-con-espacios  ';

let tempDirectory: string | null = null;

describe('FileOtpvV3RestoreStagingPreparer', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-restore-staging-'));
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

  it('prepara el staging canónico y reconstruye los secretos con la clave exacta', async (): Promise<void> => {
    const paths: ApplicationPaths = createApplicationPaths();

    const workspace = new FileOtpvV3RestoreWorkspace(join(paths.stagingDirectory, 'restore-work'));

    await createWorkspaceFixture(workspace);

    const secretStorage = new TestSecretStorage(paths.stagingSecretsFile, paths.stagingAppDataFile);

    const preparer = new FileOtpvV3RestoreStagingPreparer(paths, secretStorage);

    await preparer.prepare(workspace, BACKUP_KEY);

    expect(secretStorage.savedSecrets).toEqual({
      secretApi: 'secret-api',
      backupApiKey: BACKUP_KEY,
      emailSmtpPass: 'smtp-password',
      ticketBaiToken: 'ticketbai-token',
    });

    expect(secretStorage.appDataExistedWhenSaved).toBe(false);

    expect(
      await readFile(paths.stagingDatabaseFile, {
        encoding: 'utf8',
      }),
    ).toBe('database');

    expect(
      await readFile(paths.stagingLogoFile, {
        encoding: 'utf8',
      }),
    ).toBe('logo');

    expect(
      await readFile(paths.stagingAppDataFile, {
        encoding: 'utf8',
      }),
    ).toBe('app-data');

    expect(
      await readFile(join(paths.stagingFilesDirectory, 'clientes', 'factura.pdf'), {
        encoding: 'utf8',
      }),
    ).toBe('pdf');

    expect(await fileExists(join(paths.stagingDirectory, 'restore-work'))).toBe(false);
  });

  it('limpia staging y restore-work si falla la reconstrucción de secretos', async (): Promise<void> => {
    const paths: ApplicationPaths = createApplicationPaths();

    const workspace = new FileOtpvV3RestoreWorkspace(join(paths.stagingDirectory, 'restore-work'));

    await createWorkspaceFixture(workspace);

    const secretStorage = new TestSecretStorage(paths.stagingSecretsFile, paths.stagingAppDataFile);

    secretStorage.saveError = new Error('No se ha podido usar safeStorage.');

    const preparer = new FileOtpvV3RestoreStagingPreparer(paths, secretStorage);

    await expect(preparer.prepare(workspace, BACKUP_KEY)).rejects.toThrow(
      'No se ha podido usar safeStorage.',
    );

    expect(await fileExists(paths.stagingDatabaseFile)).toBe(false);

    expect(await fileExists(paths.stagingFilesDirectory)).toBe(false);

    expect(await fileExists(paths.stagingLogoFile)).toBe(false);

    expect(await fileExists(paths.stagingSecretsFile)).toBe(false);

    expect(await fileExists(paths.stagingAppDataFile)).toBe(false);

    expect(await fileExists(join(paths.stagingDirectory, 'restore-work'))).toBe(false);
  });
});

/**
 * Crea el contenido portable previamente
 * validado por las fases anteriores.
 */
async function createWorkspaceFixture(workspace: FileOtpvV3RestoreWorkspace): Promise<void> {
  await workspace.reset();

  await Promise.all([
    mkdir(dirname(workspace.databaseFile), {
      recursive: true,
    }),

    mkdir(dirname(workspace.appDataFile), {
      recursive: true,
    }),

    mkdir(dirname(workspace.logoFile), {
      recursive: true,
    }),

    mkdir(dirname(workspace.portableSecretsFile), {
      recursive: true,
    }),

    mkdir(join(workspace.filesDirectory, 'clientes'), {
      recursive: true,
    }),
  ]);

  await Promise.all([
    writeFile(workspace.databaseFile, 'database', {
      encoding: 'utf8',
    }),

    writeFile(workspace.appDataFile, 'app-data', {
      encoding: 'utf8',
    }),

    writeFile(workspace.logoFile, 'logo', {
      encoding: 'utf8',
    }),

    writeFile(
      workspace.portableSecretsFile,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          secretApi: 'secret-api',
          emailSmtpPass: 'smtp-password',
          ticketBaiToken: 'ticketbai-token',
        },
        null,
        2,
      )}\n`,
      {
        encoding: 'utf8',
      },
    ),

    writeFile(join(workspace.filesDirectory, 'clientes', 'factura.pdf'), 'pdf', {
      encoding: 'utf8',
    }),
  ]);
}

/**
 * Construye las rutas de aplicación
 * utilizadas por el test.
 */
function createApplicationPaths(): ApplicationPaths {
  const baseDirectory: string = requireTempDirectory();

  const rootDirectory: string = join(baseDirectory, 'osumi-tpv');

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

    logoFile: join(assetsDirectory, 'logo.webp'),

    databaseFile: join(databaseDirectory, 'osumi-tpv.sqlite'),

    secretsFile: join(secretsDirectory, 'secrets.json'),

    stagingAppDataFile: join(stagingDirectory, 'app_data.json'),

    stagingLogoFile: join(stagingDirectory, 'logo.webp'),

    stagingSecretsFile: join(stagingDirectory, 'secrets.json'),

    stagingDatabaseFile: join(stagingDirectory, 'osumi-tpv.sqlite'),
  };
}

/**
 * Comprueba la existencia física
 * de una ruta.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
}

/**
 * Devuelve el directorio temporal activo.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal del test no está inicializado.');
  }

  return tempDirectory;
}

/**
 * SecretStorage controlado que permite comprobar
 * la reconstrucción de secretos.
 */
class TestSecretStorage implements SecretStorage {
  savedSecrets: InstallationSecretsData | null = null;

  saveError: Error | null = null;

  appDataExistedWhenSaved: boolean | null = null;

  /**
   * Crea el storage de prueba.
   */
  constructor(
    private readonly filePath: string,
    private readonly appDataFile: string,
  ) {}

  /**
   * Indica si existen secretos guardados.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(this.savedSecrets !== null);
  }

  /**
   * Devuelve los secretos guardados.
   */
  load(): Promise<InstallationSecretsData | null> {
    return Promise.resolve(this.savedSecrets);
  }

  /**
   * Simula el guardado seguro de secretos.
   */
  async save(secrets: InstallationSecretsData): Promise<void> {
    this.appDataExistedWhenSaved = await fileExists(this.appDataFile);

    if (this.saveError !== null) {
      throw this.saveError;
    }

    this.savedSecrets = {
      ...secrets,
    };

    await mkdir(dirname(this.filePath), {
      recursive: true,
    });

    await writeFile(this.filePath, 'encrypted-secrets', {
      encoding: 'utf8',
    });
  }

  /**
   * Elimina los secretos simulados.
   */
  async delete(): Promise<void> {
    this.savedSecrets = null;

    await rm(this.filePath, {
      force: true,
    });
  }
}
