import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import NewInstallationDataService from '@infrastructure/database/initial-data/new-installation-data.service';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource, QueryRunner } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface InstalledEmployeeRow {
  readonly nombre: string;
  readonly admin: number;
  readonly activo: number;
}

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let dataSource: DataSource | null = null;
let queryRunner: QueryRunner | null = null;

describe('NewInstallationDataService', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-new-installation-data-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'new-installation.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    dataSource = await applicationDatabase.connect();

    for (const schema of completeDatabaseSchema) {
      for (const statement of schema.statements) {
        await dataSource.query(statement);
      }
    }

    queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
  });

  afterEach(async (): Promise<void> => {
    if (queryRunner !== null && !queryRunner.isReleased) {
      await queryRunner.release();
    }

    if (applicationDatabase !== null) {
      await applicationDatabase.disconnect();
    }

    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    queryRunner = null;
    dataSource = null;
    applicationDatabase = null;
    tempDirectory = null;
  });

  it('crea como administrador al empleado inicial de una nueva instalación', async (): Promise<void> => {
    const service: NewInstallationDataService = new NewInstallationDataService();

    await service.create(
      requireQueryRunner(),
      createInstallationCommand(),
      'scrypt-hash-inicial',
      '2026-09-22T12:00:00.000Z',
    );

    const employees: readonly InstalledEmployeeRow[] = (await requireDataSource().query(
      `
        SELECT
          nombre,
          admin,
          activo
        FROM empleado
        ORDER BY id
      `,
    )) as readonly InstalledEmployeeRow[];

    expect(employees).toEqual([
      {
        nombre: 'Iñigo',
        admin: 1,
        activo: 1,
      },
    ]);
  });
});

function createInstallationCommand(): InstallationCommand {
  return {
    negocio: {
      nombre: 'Negocio de prueba',
      nombreComercial: '',
      cif: '',
      telefono: '',
      email: '',
      direccion: '',
      poblacion: '',
    },

    empleadoInicial: {
      nombre: '  Iñigo  ',
      password: 'secreto',
      color: '#336699',
    },

    redes: {
      twitter: '',
      facebook: '',
      instagram: '',
      web: '',
    },

    ticket: {
      frases: [],
    },

    valoresIniciales: {
      cajaInicial: 0,
      ticketInicial: 1,
      facturaInicial: 1,
    },

    fiscalidad: {
      tipoIva: 'iva',
      ivaList: [21],
      reList: [],
      marginList: [30],
    },

    ventaOnline: {
      active: false,
      urlApi: '',
    },

    emailSmtp: {
      active: false,
      host: '',
      port: 587,
      secure: 'tls',
      user: '',
    },

    ticketEmail: {
      subjectTemplate: '',
      bodyTemplate: '',
    },

    ticketBai: {
      active: false,
      nif: '',
    },

    opciones: {
      fechaCaducidad: false,
    },

    secretos: {
      secretApi: '',
      backupApiKey: '',
      emailSmtpPass: null,
      ticketBaiToken: null,
    },

    logo: {
      fileName: 'logo.png',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,AA==',
    },
  };
}

function requireDataSource(): DataSource {
  if (dataSource === null) {
    throw new Error('La base de datos de la prueba no está inicializada.');
  }

  return dataSource;
}

function requireQueryRunner(): QueryRunner {
  if (queryRunner === null) {
    throw new Error('El QueryRunner de la prueba no está inicializado.');
  }

  return queryRunner;
}
