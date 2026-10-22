import type LegacyImportDumpReader from '@backend/contracts/legacy-import/legacy-import-dump-reader.interface';
import type LegacyImportSqlInsertListener from '@backend/contracts/legacy-import/legacy-import-sql-insert-listener.type';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';
import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';
import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import LegacyImportMasterDataImporter from '@infrastructure/legacy-import/legacy-import-master-data.importer';
import LegacyImportNumberConverter from '@infrastructure/legacy-import/legacy-import-number.converter';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import LegacyImportSalesDataImporter from '@infrastructure/legacy-import/legacy-import-sales-data.importer';
import LegacySqlValueReader from '@infrastructure/legacy-import/legacy-sql-value.reader';
import DISABLED_LEGACY_PASSWORD_HASH from '@infrastructure/security/disabled-legacy-password-hash.constant';
import NodeScryptPasswordHasher from '@infrastructure/security/node-scrypt-password-hasher';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource, QueryRunner } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface ImportedEmployeePermissionRow {
  readonly id_empleado: number;
  readonly permiso: PermissionId;
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

  it('convierte los permisos legacy existentes a sus identificadores actuales', async (): Promise<void> => {
    const inserts: readonly LegacySqlInsert[] = [
      createLegacyEmployeeInsert(1, null),
      createLegacyEmployeeInsert(2, '2026-01-15T10:00:00.000Z'),
      createLegacyEmployeeInsert(3, null),

      createLegacyPermissionInsert(1, 1),
      createLegacyPermissionInsert(1, 18),
      createLegacyPermissionInsert(2, 19),
      createLegacyPermissionInsert(3, 20),
      createLegacyPermissionInsert(3, 25),
    ];

    const importer: LegacyImportMasterDataImporter = new LegacyImportMasterDataImporter(
      new FakeLegacyImportDumpReader(inserts),
      new LegacySqlValueReader(),
      new LegacyImportPublicIdFactory(),
      new NodeScryptPasswordHasher(),
    );

    const result: LegacyImportPhaseResult = await importer.import(
      requireQueryRunner(),
      createExecutionCommand(inserts),
      (progress): void => {
        void progress;
      },
    );

    expect(result).toEqual({
      importedRows: 8,
      skippedRows: 0,
      warningCount: 0,
      defaultedEmployeePasswords: 0,
    });

    expect(await readEmployeePermissions()).toEqual([
      {
        id_empleado: 1,
        permiso: permissionKeys.gestion.ajustes,
      },
      {
        id_empleado: 1,
        permiso: permissionKeys.ventas.modificarImportes,
      },
      {
        id_empleado: 2,
        permiso: permissionKeys.gestion.tiposPago,
      },
      {
        id_empleado: 3,
        permiso: permissionKeys.gestion.copiasSeguridad,
      },
      {
        id_empleado: 3,
        permiso: permissionKeys.gestion.empleados,
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

  it('descarta los permisos legacy que ya no existen', async (): Promise<void> => {
    const inserts: readonly LegacySqlInsert[] = [
      createLegacyEmployeeInsert(1, null),
      createLegacyEmployeeInsert(2, null),
      createLegacyEmployeeInsert(3, null),

      createLegacyPermissionInsert(1, 2),
      createLegacyPermissionInsert(1, 17),
      createLegacyPermissionInsert(2, 21),
      createLegacyPermissionInsert(2, 22),
      createLegacyPermissionInsert(3, 23),
      createLegacyPermissionInsert(3, 24),
    ];

    const importer: LegacyImportMasterDataImporter = new LegacyImportMasterDataImporter(
      new FakeLegacyImportDumpReader(inserts),
      new LegacySqlValueReader(),
      new LegacyImportPublicIdFactory(),
      new NodeScryptPasswordHasher(),
    );

    const result: LegacyImportPhaseResult = await importer.import(
      requireQueryRunner(),
      createExecutionCommand(inserts),
      (progress): void => {
        void progress;
      },
    );

    expect(result).toEqual({
      importedRows: 3,
      skippedRows: 6,
      warningCount: 0,
      defaultedEmployeePasswords: 0,
    });

    expect(await readEmployeePermissions()).toEqual([]);
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
      createExecutionCommand(inserts),
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
      createExecutionCommand(inserts),
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

  it('crea el empleado estructural al importar datos maestros legacy', async (): Promise<void> => {
    const inserts: readonly LegacySqlInsert[] = [
      createLegacyEmployeeInsert(1, null),
      createLegacyEmployeeInsert(2, null),
      createLegacyPermissionInsert(1, 18),
    ];

    const importer: LegacyImportMasterDataImporter = new LegacyImportMasterDataImporter(
      new FakeLegacyImportDumpReader(inserts),
      new LegacySqlValueReader(),
      new LegacyImportPublicIdFactory(),
      new NodeScryptPasswordHasher(),
    );

    const command: LegacyImportExecutionCommand = createExecutionCommand(inserts);

    const result: LegacyImportPhaseResult = await importer.import(
      requireQueryRunner(),
      command,
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

    interface EmployeeRow {
      readonly id: number;
      readonly public_id: string;
      readonly nombre: string;
      readonly password_hash: string;
      readonly password_algorithm: string;
      readonly admin: number;
      readonly sistema: number;
      readonly activo: number;
    }

    const employees: readonly EmployeeRow[] = (await requireDataSource().query(
      `
        SELECT
          id,
          public_id,
          nombre,
          password_hash,
          password_algorithm,
          admin,
          sistema,
          activo
        FROM empleado
        ORDER BY id
      `,
    )) as readonly EmployeeRow[];

    const humanEmployees: readonly EmployeeRow[] = employees.filter(
      (employee: EmployeeRow): boolean => employee.sistema === 0,
    );

    expect(humanEmployees.map((employee: EmployeeRow): number => employee.id)).toEqual([1, 2]);

    expect(humanEmployees.every((employee: EmployeeRow): boolean => employee.activo === 1)).toBe(
      true,
    );

    const systemEmployees: readonly EmployeeRow[] = employees.filter(
      (employee: EmployeeRow): boolean => employee.sistema === 1,
    );

    expect(systemEmployees).toHaveLength(1);

    const onlineEmployee: EmployeeRow | undefined = systemEmployees[0];

    expect(onlineEmployee).toBeDefined();
    expect(onlineEmployee?.nombre).toBe('Tienda online');
    expect(onlineEmployee?.admin).toBe(0);
    expect(onlineEmployee?.activo).toBe(1);
    expect(onlineEmployee?.password_algorithm).toBe('bcrypt_legacy');
    expect(onlineEmployee?.password_hash).toBe(DISABLED_LEGACY_PASSWORD_HASH);

    expect(onlineEmployee?.public_id).toBe(
      new LegacyImportPublicIdFactory().create(command.sourceHash, 'empleado_sistema', 1),
    );

    const systemPermissions: readonly ImportedEmployeePermissionRow[] =
      (await requireDataSource().query(
        `
          SELECT
            id_empleado,
            permiso
          FROM empleado_permiso
          WHERE id_empleado = ?
        `,
        [onlineEmployee?.id],
      )) as readonly ImportedEmployeePermissionRow[];

    expect(systemPermissions).toEqual([]);

    expect(await readEmployeePermissions()).toEqual([
      {
        id_empleado: 1,
        permiso: permissionKeys.gestion.ajustes,
      },
    ]);
  });

  it('asocia ventas legacy sin empleado válido a un empleado humano', async (): Promise<void> => {
    const employeeInserts: readonly LegacySqlInsert[] = [createLegacyEmployeeInsert(10, null)];

    const masterImporter: LegacyImportMasterDataImporter = new LegacyImportMasterDataImporter(
      new FakeLegacyImportDumpReader(employeeInserts),
      new LegacySqlValueReader(),
      new LegacyImportPublicIdFactory(),
      new NodeScryptPasswordHasher(),
    );

    await masterImporter.import(
      requireQueryRunner(),
      createExecutionCommand(employeeInserts),
      (progress): void => {
        void progress;
      },
    );

    const dataSource: DataSource = requireDataSource();

    await dataSource.query(
      `
        INSERT INTO caja (
          public_id,
          id_terminal,
          id_empleado_apertura,
          apertura
        )
        VALUES (?, ?, ?, ?)
      `,
      ['caja-legacy-test', 1, 10, '2025-01-01T00:00:00.000Z'],
    );

    const saleInserts: readonly LegacySqlInsert[] = [
      {
        tableName: 'venta',
        values: new Map<string, string | null>([
          ['id', '50'],
          ['num_venta', '1'],
          ['id_empleado', '999'],
          ['id_cliente', null],
          ['total', '10'],
          ['created_at', '2025-01-02T10:00:00.000Z'],
          ['updated_at', '2025-01-02T10:00:00.000Z'],
          ['deleted_at', null],
        ]),
      },
    ];

    const salesImporter: LegacyImportSalesDataImporter = new LegacyImportSalesDataImporter(
      new FakeLegacyImportDumpReader(saleInserts),
      new LegacySqlValueReader(),
      new LegacyImportNumberConverter(),
      new LegacyImportPublicIdFactory(),
    );

    const result: LegacyImportPhaseResult = await salesImporter.import(
      requireQueryRunner(),
      createExecutionCommand(saleInserts),
      (progress): void => {
        void progress;
      },
    );

    expect(result).toEqual({
      importedRows: 1,
      skippedRows: 0,
      warningCount: 1,
    });

    interface ImportedSaleRow {
      readonly id: number;
      readonly id_empleado: number;
      readonly sistema: number;
    }

    const sales: readonly ImportedSaleRow[] = (await dataSource.query(
      `
        SELECT
          v.id,
          v.id_empleado,
          e.sistema
        FROM venta v
        INNER JOIN empleado e
          ON e.id = v.id_empleado
        WHERE v.id = 50
      `,
    )) as readonly ImportedSaleRow[];

    expect(sales).toEqual([
      {
        id: 50,
        id_empleado: 10,
        sistema: 0,
      },
    ]);
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

function createExecutionCommand(inserts: readonly LegacySqlInsert[]): LegacyImportExecutionCommand {
  const expectedTableRows: Record<string, number> = {
    empleado: 0,
    empleado_rol: 0,
    tipo_pago: 0,
    categoria: 0,
    marca: 0,
    proveedor: 0,
    comercial: 0,
    proveedor_marca: 0,
  };

  for (const insert of inserts) {
    if (insert.tableName in expectedTableRows) {
      expectedTableRows[insert.tableName]++;
    }
  }

  return {
    selectionId: 'legacy-master-data-test',
    packagePath: '/tmp/legacy-master-data-test.otpv',
    sourceApplication: 'Osumi TPV',
    sourceVersion: 'legacy',
    sourceSchemaVersion: 'legacy',
    sourceHash: 'a'.repeat(64),
    sourceRows: inserts.length,
    initialSaleNumber: 0,
    initialInvoiceNumber: 0,
    expectedTableRows,
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
        permiso
      FROM empleado_permiso
      ORDER BY
        id_empleado,
        permiso
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
      WHERE sistema = 0
      ORDER BY id
    `,
  )) as readonly ImportedEmployeeRow[];
}
