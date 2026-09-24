import type OtpvV3RequiredContentPaths from '@backend/contracts/backup/otpv-v3-required-content-paths.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import {
  DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
  DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
} from '@desktop-contracts/configuration/ticket-email-config.interface';
import FileOtpvV3RequiredContentValidator from '@infrastructure/backup/file-otpv-v3-required-content.validator';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import completeDatabaseSchemaTables from '@infrastructure/database/schema/complete-database-schema.tables';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import JsonAppDataRepository from '@infrastructure/filesystem/json-app-data.repository';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import type { DataSource, QueryRunner } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let paths: OtpvV3RequiredContentPaths;
let dataSourceFactory: TypeOrmDataSourceFactory;
let databaseSchemaService: DatabaseSchemaService;
let validator: FileOtpvV3RequiredContentValidator;

describe('FileOtpvV3RequiredContentValidator', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-required-validator-'));

    paths = createPaths();

    dataSourceFactory = new TypeOrmDataSourceFactory();

    databaseSchemaService = new DatabaseSchemaService(
      completeDatabaseSchema,
      completeDatabaseSchemaTables,
    );

    validator = new FileOtpvV3RequiredContentValidator(dataSourceFactory, databaseSchemaService);

    await createValidFixture();
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

  it('acepta los cuatro recursos obligatorios válidos sin modificar la SQLite', async (): Promise<void> => {
    const databaseBefore: Buffer = await readFile(paths.databaseFile);

    const hashBefore: string = sha256(databaseBefore);

    await validator.validate(paths);

    const databaseAfter: Buffer = await readFile(paths.databaseFile);

    expect(sha256(databaseAfter)).toBe(hashBefore);
  });

  it('rechaza una SQLite que no pertenece a Osumi TPV', async (): Promise<void> => {
    await writeFile(paths.databaseFile, 'esto no es una base sqlite', {
      encoding: 'utf8',
    });

    await expect(validator.validate(paths)).rejects.toThrow(
      'La base de datos incluida en la copia no es válida.',
    );
  });

  it('rechaza un app_data.json con estructura inválida', async (): Promise<void> => {
    await writeFile(
      paths.appDataFile,
      JSON.stringify(
        {
          schemaVersion: 1,
        },
        null,
        2,
      ),
      {
        encoding: 'utf8',
      },
    );

    await expect(validator.validate(paths)).rejects.toThrow(
      'config/app_data.json no contiene una configuración válida.',
    );
  });

  it('rechaza secretos portables que incluyan backupApiKey', async (): Promise<void> => {
    await writeFile(
      paths.portableSecretsFile,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          secretApi: 'secret-api',
          backupApiKey: 'no-debe-estar-aqui',
          emailSmtpPass: null,
          ticketBaiToken: null,
        },
        null,
        2,
      )}\n`,
      {
        encoding: 'utf8',
      },
    );

    await expect(validator.validate(paths)).rejects.toThrow(
      'secrets/secrets.json no tiene la estructura exacta esperada.',
    );
  });

  it('rechaza un logo que no sea realmente WebP', async (): Promise<void> => {
    await writeFile(paths.logoFile, 'esto no es una imagen', {
      encoding: 'utf8',
    });

    await expect(validator.validate(paths)).rejects.toThrow(
      'assets/logo.webp no contiene una imagen válida.',
    );
  });
});

/**
 * Construye todos los recursos válidos
 * requeridos por el validador.
 */
async function createValidFixture(): Promise<void> {
  await Promise.all([
    mkdir(dirname(paths.databaseFile), {
      recursive: true,
    }),

    mkdir(dirname(paths.appDataFile), {
      recursive: true,
    }),

    mkdir(dirname(paths.logoFile), {
      recursive: true,
    }),

    mkdir(dirname(paths.portableSecretsFile), {
      recursive: true,
    }),
  ]);

  await createValidDatabase();

  const appDataRepository: JsonAppDataRepository = new JsonAppDataRepository(paths.appDataFile);

  await appDataRepository.save(createValidAppData());

  await writeFile(
    paths.portableSecretsFile,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        secretApi: 'secret-api',
        emailSmtpPass: null,
        ticketBaiToken: null,
      },
      null,
      2,
    )}\n`,
    {
      encoding: 'utf8',
      mode: 0o600,
    },
  );

  await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: {
        r: 255,
        g: 255,
        b: 255,
        alpha: 1,
      },
    },
  })
    .webp()
    .toFile(paths.logoFile);
}

/**
 * Crea una SQLite real utilizando exactamente
 * el esquema actual de Osumi TPV Client.
 */
async function createValidDatabase(): Promise<void> {
  const dataSource: DataSource = dataSourceFactory.create(paths.databaseFile);

  let queryRunner: QueryRunner | null = null;

  try {
    await dataSource.initialize();

    queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();

    await databaseSchemaService.create(queryRunner, {
      applicationVersion: '1.0.0-test',
      installationType: 'new',
      createdAt: '2026-09-24T10:00:00.000Z',
      importedAt: null,
    });

    /*
     * Materializamos cualquier escritura pendiente
     * antes de cerrar el fixture.
     */
    await queryRunner.query('PRAGMA wal_checkpoint(TRUNCATE)');

    /*
     * El snapshot real del backup es autocontenido.
     * Dejamos también el fixture sin dependencia
     * de WAL/SHM.
     */
    await queryRunner.query('PRAGMA journal_mode = DELETE');
  } finally {
    await closeDatabase(queryRunner, dataSource);
  }

  await Promise.all([
    rm(`${paths.databaseFile}-wal`, {
      force: true,
    }),

    rm(`${paths.databaseFile}-shm`, {
      force: true,
    }),
  ]);
}

/**
 * Cierra de forma segura la SQLite utilizada
 * para construir el fixture.
 */
async function closeDatabase(
  queryRunner: QueryRunner | null,
  dataSource: DataSource,
): Promise<void> {
  if (queryRunner !== null && !queryRunner.isReleased) {
    await queryRunner.release();
  }

  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}

/**
 * Construye un app_data.json actual válido.
 */
function createValidAppData(): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-09-24T10:00:00.000Z',

    nombre: 'Empresa de prueba',
    nombreComercial: 'Comercio de prueba',
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
      subjectTemplate: DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
      bodyTemplate: DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
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
 * Construye las rutas del fixture.
 */
function createPaths(): OtpvV3RequiredContentPaths {
  const rootDirectory: string = requireTempDirectory();

  return {
    databaseFile: join(rootDirectory, 'database', 'osumi-tpv.sqlite'),

    appDataFile: join(rootDirectory, 'config', 'app_data.json'),

    logoFile: join(rootDirectory, 'assets', 'logo.webp'),

    portableSecretsFile: join(rootDirectory, 'secrets', 'secrets.json'),
  };
}

/**
 * Calcula SHA-256 para comprobar
 * que la validación no modifica SQLite.
 */
function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
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
