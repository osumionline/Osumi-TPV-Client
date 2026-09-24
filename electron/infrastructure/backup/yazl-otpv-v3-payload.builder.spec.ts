import type DatabaseSnapshot from '@backend/contracts/backup/database-snapshot.interface';
import type { OtpvV3EncryptionResult } from '@backend/contracts/backup/otpv-v3-crypto.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import NodeOtpvV3Crypto from '@infrastructure/backup/node-otpv-v3-crypto';
import YazlOtpvV3PayloadBuilder from '@infrastructure/backup/yazl-otpv-v3-payload.builder';
import BetterSqlite3DatabaseSnapshot from '@infrastructure/database/better-sqlite3/better-sqlite3-database-snapshot';
import JsonAppDataRepository from '@infrastructure/filesystem/json-app-data.repository';
import Database from 'better-sqlite3';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import type { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Entry, ZipFile } from 'yauzl';
import { open } from 'yauzl';

const BACKUP_API_KEY: string = 'backup-key-for-payload-builder-tests';

const AUTHENTICATED_DATA: Buffer = Buffer.from(
  '{"formatVersion":3,"backupId":"payload-test"}',
  'utf8',
);

let tempDirectory: string | null = null;

let paths: ApplicationPaths | null = null;

let sourceDatabase: Database.Database | null = null;

describe('YazlOtpvV3PayloadBuilder', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-payload-'));

    paths = createApplicationPaths(tempDirectory);

    await mkdir(requirePaths().configDirectory, {
      recursive: true,
    });

    await mkdir(requirePaths().assetsDirectory, {
      recursive: true,
    });

    await mkdir(requirePaths().databaseDirectory, {
      recursive: true,
    });

    await mkdir(requirePaths().secretsDirectory, {
      recursive: true,
    });

    await mkdir(join(requirePaths().filesDirectory, 'articles'), {
      recursive: true,
    });

    await mkdir(join(requirePaths().filesDirectory, 'orders'), {
      recursive: true,
    });

    await writeFile(requirePaths().logoFile, Buffer.from('logo-webp'));

    await writeFile(
      join(requirePaths().filesDirectory, 'articles', 'photo.webp'),
      Buffer.from('article-photo'),
    );

    await writeFile(
      join(requirePaths().filesDirectory, 'orders', 'order.pdf'),
      Buffer.from('order-pdf'),
    );

    await writeFile(requirePaths().printingSettingsFile, '{"ticketPrinterDeviceName":"LOCAL"}\n', {
      encoding: 'utf8',
    });

    await writeFile(requirePaths().secretsFile, '{"encryptedData":"LOCAL-SAFE-STORAGE"}\n', {
      encoding: 'utf8',
    });

    const appDataRepository: JsonAppDataRepository = new JsonAppDataRepository(
      requirePaths().appDataFile,
    );

    await appDataRepository.save(createAppData());

    sourceDatabase = new Database(requirePaths().databaseFile);

    sourceDatabase.pragma('journal_mode = WAL');

    sourceDatabase.exec(`
          CREATE TABLE example (
            id INTEGER PRIMARY KEY,
            value TEXT NOT NULL
          )
        `);

    sourceDatabase
      .prepare(
        `
              INSERT INTO example (
                id,
                value
              )
              VALUES (
                ?,
                ?
              )
            `,
      )
      .run(1, 'snapshot-data');
  });

  afterEach(async (): Promise<void> => {
    if (sourceDatabase !== null) {
      sourceDatabase.close();
    }

    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,

        force: true,
      });
    }

    sourceDatabase = null;
    paths = null;
    tempDirectory = null;
  });

  it('genera un payload cifrado con todo el estado portable de la instalación', async (): Promise<void> => {
    const currentPaths: ApplicationPaths = requirePaths();
    const appDataRepository: JsonAppDataRepository = new JsonAppDataRepository(
      currentPaths.appDataFile,
    );
    const secretStorage: TestSecretStorage = new TestSecretStorage(createSecrets());
    const crypto: NodeOtpvV3Crypto = new NodeOtpvV3Crypto();
    const databaseSnapshot: RecordingDatabaseSnapshot = new RecordingDatabaseSnapshot(
      new BetterSqlite3DatabaseSnapshot(currentPaths.databaseFile),
    );

    const builder: YazlOtpvV3PayloadBuilder = new YazlOtpvV3PayloadBuilder(
      currentPaths,
      databaseSnapshot,
      appDataRepository,
      secretStorage,
      crypto,
    );

    const payloadFile: string = join(currentPaths.backupsDirectory, 'payload.enc');

    const encryption: OtpvV3EncryptionResult = await builder.create({
      backupApiKey: BACKUP_API_KEY,
      authenticatedData: AUTHENTICATED_DATA,
      destinationFile: payloadFile,
    });

    expect(databaseSnapshot.destinationFile).not.toBeNull();

    const snapshotTemporaryName: string = basename(databaseSnapshot.destinationFile ?? '');

    expect(snapshotTemporaryName).toMatch(
      /^\.snapshot-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.sqlite$/i,
    );

    expect(snapshotTemporaryName).not.toContain('payload.enc');

    const backupDirectoryEntries: string[] = await readdir(currentPaths.backupsDirectory);

    expect(backupDirectoryEntries).toEqual(['payload.enc']);

    const restoredZip: string = join(requireTempDirectory(), 'restored-payload.zip');

    await crypto.decryptFile({
      backupApiKey: BACKUP_API_KEY,
      authenticatedData: AUTHENTICATED_DATA,
      kdf: encryption.kdf,
      keyWrap: encryption.keyWrap,
      payload: encryption.payload,
      sourceFile: payloadFile,
      destinationFile: restoredZip,
    });

    const entries: ReadonlyMap<string, Buffer> = await readZipEntries(restoredZip);

    expect([...entries.keys()].sort()).toEqual([
      'assets/logo.webp',
      'config/app_data.json',
      'database/osumi-tpv.sqlite',
      'files/articles/photo.webp',
      'files/orders/order.pdf',
      'secrets/secrets.json',
    ]);

    expect(entries.get('assets/logo.webp')).toEqual(Buffer.from('logo-webp'));
    expect(entries.get('files/articles/photo.webp')).toEqual(Buffer.from('article-photo'));
    expect(entries.get('files/orders/order.pdf')).toEqual(Buffer.from('order-pdf'));

    const portableAppData: unknown = JSON.parse(
      requireEntry(entries, 'config/app_data.json').toString('utf8'),
    );

    expect(portableAppData).toEqual(createAppData());

    const portableSecrets: unknown = JSON.parse(
      requireEntry(entries, 'secrets/secrets.json').toString('utf8'),
    );

    expect(portableSecrets).toEqual({
      schemaVersion: 1,
      secretApi: 'secret-api',
      emailSmtpPass: 'smtp-password',
      ticketBaiToken: null,
    });
    expect(portableSecrets).not.toHaveProperty('backupApiKey');

    expect(entries.has('config/printing_settings.json')).toBe(false);

    const restoredDatabaseFile: string = join(requireTempDirectory(), 'restored.sqlite');

    await writeFile(restoredDatabaseFile, requireEntry(entries, 'database/osumi-tpv.sqlite'));

    const restoredDatabase: Database.Database = new Database(restoredDatabaseFile, {
      readonly: true,
      fileMustExist: true,
    });

    try {
      const row:
        | {
            readonly value: string;
          }
        | undefined = restoredDatabase
        .prepare(
          `
                    SELECT value
                    FROM example
                    WHERE id = 1
                  `,
        )
        .get() as
        | {
            readonly value: string;
          }
        | undefined;

      expect(row).toEqual({
        value: 'snapshot-data',
      });
    } finally {
      restoredDatabase.close();
    }
  });

  it('admite una instalación sin assets/files', async (): Promise<void> => {
    const currentPaths: ApplicationPaths = requirePaths();

    await rm(currentPaths.filesDirectory, {
      recursive: true,

      force: true,
    });

    const crypto: NodeOtpvV3Crypto = new NodeOtpvV3Crypto();

    const builder: YazlOtpvV3PayloadBuilder = new YazlOtpvV3PayloadBuilder(
      currentPaths,
      new BetterSqlite3DatabaseSnapshot(currentPaths.databaseFile),
      new JsonAppDataRepository(currentPaths.appDataFile),
      new TestSecretStorage(createSecrets()),
      crypto,
    );

    const payloadFile: string = join(currentPaths.backupsDirectory, 'empty-files.enc');

    const encryption: OtpvV3EncryptionResult = await builder.create({
      backupApiKey: BACKUP_API_KEY,
      authenticatedData: AUTHENTICATED_DATA,
      destinationFile: payloadFile,
    });

    const restoredZip: string = join(requireTempDirectory(), 'empty-files.zip');

    await crypto.decryptFile({
      backupApiKey: BACKUP_API_KEY,
      authenticatedData: AUTHENTICATED_DATA,
      kdf: encryption.kdf,
      keyWrap: encryption.keyWrap,
      payload: encryption.payload,
      sourceFile: payloadFile,
      destinationFile: restoredZip,
    });

    const entries: ReadonlyMap<string, Buffer> = await readZipEntries(restoredZip);

    expect([...entries.keys()].sort()).toEqual([
      'assets/logo.webp',
      'config/app_data.json',
      'database/osumi-tpv.sqlite',
      'secrets/secrets.json',
    ]);
  });
});

/**
 * Implementación de secretos en memoria
 * utilizada únicamente por los tests.
 */
class TestSecretStorage implements SecretStorage {
  /**
   * Crea el almacenamiento con los secretos indicados.
   */
  constructor(private secrets: InstallationSecretsData | null) {}

  /**
   * Indica si existen secretos.
   */
  async exists(): Promise<boolean> {
    return this.secrets !== null;
  }

  /**
   * Devuelve los secretos actuales.
   */
  async load(): Promise<InstallationSecretsData | null> {
    return this.secrets;
  }

  /**
   * Sustituye los secretos actuales.
   */
  async save(secrets: InstallationSecretsData): Promise<void> {
    this.secrets = secrets;
  }

  /**
   * Elimina los secretos actuales.
   */
  async delete(): Promise<void> {
    this.secrets = null;
  }
}

/**
 * Crea los secretos de la instalación
 * utilizados por los tests.
 */
function createSecrets(): InstallationSecretsData {
  return {
    secretApi: 'secret-api',
    backupApiKey: BACKUP_API_KEY,
    emailSmtpPass: 'smtp-password',
    ticketBaiToken: null,
  };
}

/**
 * Crea app_data.json completo
 * para los tests del payload.
 */
function createAppData(): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-09-24T08:00:00.000Z',
    nombre: 'Empresa',
    nombreComercial: 'Comercio',
    cif: 'B12345678',
    telefono: '944000000',
    direccion: 'Gran Vía 1',
    poblacion: 'Bilbao',
    email: 'tienda@example.com',
    twitter: '',
    facebook: '',
    instagram: '',
    web: '',
    frasesTicket: [],
    ticketEmail: {
      subjectTemplate: 'Ticket',
      bodyTemplate: 'Contenido',
    },
    tipoIva: 'iva',
    ivaList: [21],
    reList: [],
    marginList: [30],
    ventaOnline: false,
    urlApi: '',
    emailSmtp: null,
    ticketBai: null,
    fechaCad: false,
  };
}

/**
 * Construye el árbol de rutas de aplicación
 * usado por el fixture.
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
 * Lee todos los ficheros regulares
 * de un ZIP pequeño utilizado en tests.
 */
function readZipEntries(zipPath: string): Promise<ReadonlyMap<string, Buffer>> {
  return new Promise<ReadonlyMap<string, Buffer>>(
    (
      resolve: (entries: ReadonlyMap<string, Buffer>) => void,

      reject: (reason?: unknown) => void,
    ): void => {
      open(
        zipPath,
        {
          lazyEntries: true,
          autoClose: true,
          decodeStrings: true,
          validateEntrySizes: true,
          strictFileNames: true,
        },

        (error: Error | null, zipFile?: ZipFile): void => {
          if (error !== null) {
            reject(error);

            return;
          }

          if (zipFile === undefined) {
            reject(new Error('No se ha podido abrir el ZIP de prueba.'));

            return;
          }

          const result: Map<string, Buffer> = new Map<string, Buffer>();

          zipFile.once(
            'error',

            (zipError: Error): void => {
              reject(zipError);
            },
          );

          zipFile.once(
            'end',

            (): void => {
              resolve(result);
            },
          );

          zipFile.on(
            'entry',

            (entry: Entry): void => {
              zipFile.openReadStream(
                entry,
                (streamError: Error | null, stream?: Readable): void => {
                  if (streamError !== null) {
                    reject(streamError);

                    return;
                  }
                  if (stream === undefined) {
                    reject(new Error(`No se ha podido leer ${entry.fileName}.`));

                    return;
                  }

                  const chunks: Buffer[] = [];

                  stream.on('data', (chunk: Buffer | string): void => {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                  });

                  stream.once('error', (entryError: Error): void => {
                    reject(entryError);
                  });

                  stream.once('end', (): void => {
                    result.set(
                      entry.fileName,

                      Buffer.concat(chunks),
                    );

                    zipFile.readEntry();
                  });
                },
              );
            },
          );

          zipFile.readEntry();
        },
      );
    },
  );
}

/**
 * Obtiene una entrada obligatoria
 * del ZIP utilizado en tests.
 */
function requireEntry(entries: ReadonlyMap<string, Buffer>, entryName: string): Buffer {
  const entry: Buffer | undefined = entries.get(entryName);

  if (entry === undefined) {
    throw new Error(`No se ha encontrado ${entryName}.`);
  }

  return entry;
}

/**
 * Devuelve las rutas inicializadas
 * del fixture.
 */
function requirePaths(): ApplicationPaths {
  if (paths === null) {
    throw new Error('Las rutas de aplicación no están inicializadas.');
  }

  return paths;
}

/**
 * Devuelve el directorio temporal
 * inicializado del fixture.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return tempDirectory;
}

class RecordingDatabaseSnapshot implements DatabaseSnapshot {
  destinationFile: string | null = null;

  /**
   * Crea el wrapper alrededor del proveedor
   * real de snapshots.
   */
  constructor(private readonly delegate: DatabaseSnapshot) {}

  /**
   * Registra el destino solicitado y delega
   * la creación real del snapshot.
   */
  async create(destinationFile: string): Promise<void> {
    this.destinationFile = destinationFile;

    await this.delegate.create(destinationFile);
  }
}
