import type LegacyImportDumpReader from '@backend/contracts/legacy-import/legacy-import-dump-reader.interface';
import type LegacyImportSqlInsertListener from '@backend/contracts/legacy-import/legacy-import-sql-insert-listener.type';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';
import { GESTION_PERMISSIONS } from '@desktop-contracts/configuration/empleados/gestion-permissions.constants';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import LegacyImportMasterDataImporter from '@infrastructure/legacy-import/legacy-import-master-data.importer';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import LegacySqlValueReader from '@infrastructure/legacy-import/legacy-sql-value.reader';
import NodeScryptPasswordHasher from '@infrastructure/security/node-scrypt-password-hasher';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource, QueryRunner } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface ImportedEmployeePermissionRow {
  readonly id_empleado: number;
  readonly id_permiso: number;
}

interface ImportedEmployeeRow {
  readonly id: number;
  readonly password_hash: string;
  readonly password_algorithm: 'scrypt' | 'bcrypt_legacy';
  readonly admin: number;
}

class FakeLegacyImportDumpReader implements LegacyImportDumpReader {
  constructor(private readonly inserts: readonly LegacySqlInsert[]) {}

  /**
   * Emite los INSERT legacy pertenecientes a las tablas
   * solicitadas por el importador.
   */
  read(
    packagePath: string,
    expectedTableRows: Readonly<Record<string, number>>,
    tableNames: readonly string[],
    listener: LegacyImportSqlInsertListener,
  ): Promise<void> {
    void packagePath;
    void expectedTableRows;

    for (const insert of this.inserts) {
      if (tableNames.includes(insert.tableName)) {
        listener(insert);
      }
    }

    return Promise.resolve();
  }
}

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let dataSource: DataSource | null = null;
let queryRunner: QueryRunner | null = null;

describe('LegacyImportMasterDataImporter', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-legacy-master-data-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'legacy-master-data.sqlite'),
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

  it('conserva únicamente los permisos legacy presentes en el dump', async (): Promise<void> => {
    const inserts: readonly LegacySqlInsert[] = [
      createLegacyEmployeeInsert(1, null),
      createLegacyEmployeeInsert(2, '2026-01-15T10:00:00.000Z'),
      createLegacyEmployeeInsert(3, null),

      createLegacyPermissionInsert(1, 18),
      createLegacyPermissionInsert(2, 19),
      createLegacyPermissionInsert(3, GESTION_PERMISSIONS.BACKUPS),
    ];

    const importer: LegacyImportMasterDataImporter = new LegacyImportMasterDataImporter(
      new FakeLegacyImportDumpReader(inserts),
      new LegacySqlValueReader(),
      new LegacyImportPublicIdFactory(),
      new NodeScryptPasswordHasher(),
    );

    const result: LegacyImportPhaseResult = await importer.import(
      requireQueryRunner(),
      createExecutionCommand(inserts.length),
      (progress): void => {
        void progress;
      },
    );

    expect(result).toEqual({
      importedRows: 6,
      skippedRows: 0,
      warningCount: 0,
      defaultedEmployeePasswords: 0,
    });

    expect(await readEmployeePermissions()).toEqual([
      {
        id_empleado: 1,
        id_permiso: 18,
      },
      {
        id_empleado: 2,
        id_permiso: 19,
      },
      {
        id_empleado: 3,
        id_permiso: GESTION_PERMISSIONS.BACKUPS,
      },
    ]);

    const employees: readonly ImportedEmployeeRow[] = await readEmployees();

    expect(
      employees.map(
        (employee: ImportedEmployeeRow): { readonly id: number; readonly admin: number } => ({
          id: employee.id,
          admin: employee.admin,
        }),
      ),
    ).toEqual([
      {
        id: 1,
        admin: 0,
      },
      {
        id: 2,
        admin: 0,
      },
      {
        id: 3,
        admin: 0,
      },
    ]);
  });

  it('convierte en administrador al único empleado legacy activo', async (): Promise<void> => {
    const inserts: readonly LegacySqlInsert[] = [
      createLegacyEmployeeInsert(1, '2026-01-10T10:00:00.000Z'),
      createLegacyEmployeeInsert(2, null),
      createLegacyEmployeeInsert(3, '2026-01-20T10:00:00.000Z'),
    ];

    const importer: LegacyImportMasterDataImporter = new LegacyImportMasterDataImporter(
      new FakeLegacyImportDumpReader(inserts),
      new LegacySqlValueReader(),
      new LegacyImportPublicIdFactory(),
      new NodeScryptPasswordHasher(),
    );

    const result: LegacyImportPhaseResult = await importer.import(
      requireQueryRunner(),
      createExecutionCommand(inserts.length),
      (progress): void => {
        void progress;
      },
    );

    expect(result).toEqual({
      importedRows: 3,
      skippedRows: 0,
      warningCount: 0,
      defaultedEmployeePasswords: 0,
    });

    const employees: readonly ImportedEmployeeRow[] = await readEmployees();

    expect(
      employees.map(
        (employee: ImportedEmployeeRow): { readonly id: number; readonly admin: number } => ({
          id: employee.id,
          admin: employee.admin,
        }),
      ),
    ).toEqual([
      {
        id: 1,
        admin: 0,
      },
      {
        id: 2,
        admin: 1,
      },
      {
        id: 3,
        admin: 0,
      },
    ]);
  });

  it('asigna 123456 con scrypt a empleados legacy sin contraseña utilizable', async (): Promise<void> => {
    const inserts: readonly LegacySqlInsert[] = [
      createLegacyEmployeeInsert(1, null),

      createLegacyEmployeeInsert(2, null, null),

      createLegacyEmployeeInsert(3, null, 'hash-no-valido'),
    ];

    const passwordHasher: NodeScryptPasswordHasher = new NodeScryptPasswordHasher();

    const importer: LegacyImportMasterDataImporter = new LegacyImportMasterDataImporter(
      new FakeLegacyImportDumpReader(inserts),
      new LegacySqlValueReader(),
      new LegacyImportPublicIdFactory(),
      passwordHasher,
    );

    const result: LegacyImportPhaseResult = await importer.import(
      requireQueryRunner(),
      createExecutionCommand(inserts.length),
      (progress): void => {
        void progress;
      },
    );

    expect(result).toEqual({
      importedRows: 3,
      skippedRows: 0,
      warningCount: 2,
      defaultedEmployeePasswords: 2,
    });

    const employees: readonly ImportedEmployeeRow[] = await readEmployees();

    expect(employees[0]?.password_algorithm).toBe('bcrypt_legacy');

    expect(employees[0]?.password_hash).toBe('$2y$10$legacyPasswordHashForImportTest');

    expect(employees[1]?.password_algorithm).toBe('scrypt');

    expect(await passwordHasher.verify('123456', employees[1]?.password_hash ?? '')).toBe(true);

    expect(employees[2]?.password_algorithm).toBe('scrypt');

    expect(await passwordHasher.verify('123456', employees[2]?.password_hash ?? '')).toBe(true);
  });
});

function createLegacyEmployeeInsert(
  id: number,
  deletedAt: string | null,
  passwordHash: string | null = '$2y$10$legacyPasswordHashForImportTest',
): LegacySqlInsert {
  return {
    tableName: 'empleado',
    values: new Map<string, string | null>([
      ['id', String(id)],
      ['nombre', `Empleado ${id}`],
      ['pass', passwordHash],
      ['color', '336699'],
      ['created_at', '2025-01-01T10:00:00.000Z'],
      ['updated_at', '2025-01-01T10:00:00.000Z'],
      ['deleted_at', deletedAt],
    ]),
  };
}

function createLegacyPermissionInsert(employeeId: number, permissionId: number): LegacySqlInsert {
  return {
    tableName: 'empleado_rol',
    values: new Map<string, string | null>([
      ['id_empleado', String(employeeId)],
      ['id_rol', String(permissionId)],
      ['created_at', '2025-01-01T10:00:00.000Z'],
    ]),
  };
}

function createExecutionCommand(sourceRows: number): LegacyImportExecutionCommand {
  return {
    selectionId: 'legacy-master-data-test',
    packagePath: '/tmp/legacy-master-data-test.otpv',
    sourceApplication: 'Osumi TPV',
    sourceVersion: 'legacy',
    sourceSchemaVersion: 'legacy',
    sourceHash: 'a'.repeat(64),
    sourceRows,
    initialSaleNumber: 0,
    initialInvoiceNumber: 0,
    expectedTableRows: {
      empleado: 3,
      empleado_rol: 3,
      tipo_pago: 0,
      categoria: 0,
      marca: 0,
      proveedor: 0,
      comercial: 0,
      proveedor_marca: 0,
    },
    fileInventory: [],
    reviewDecisions: [],
    warningCount: 0,
    startedAt: '2026-09-17T08:00:00.000Z',
  };
}

function requireDataSource(): DataSource {
  if (dataSource === null) {
    throw new Error('La base de datos de la prueba legacy no está inicializada.');
  }

  return dataSource;
}

function requireQueryRunner(): QueryRunner {
  if (queryRunner === null) {
    throw new Error('El QueryRunner de la prueba legacy no está inicializado.');
  }

  return queryRunner;
}

async function readEmployeePermissions(): Promise<readonly ImportedEmployeePermissionRow[]> {
  return (await requireDataSource().query(
    `
      SELECT
        id_empleado,
        id_permiso
      FROM empleado_permiso
      ORDER BY
        id_empleado,
        id_permiso
    `,
  )) as readonly ImportedEmployeePermissionRow[];
}

async function readEmployees(): Promise<readonly ImportedEmployeeRow[]> {
  return (await requireDataSource().query(
    `
      SELECT
        id,
        password_hash,
        password_algorithm,
        admin
      FROM empleado
      ORDER BY id
    `,
  )) as readonly ImportedEmployeeRow[];
}
