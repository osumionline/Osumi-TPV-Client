import type EmpleadoAuthenticationRecord from '@backend/domain/empleados/empleado-authentication-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmEmpleadoRepository from '@infrastructure/database/typeorm/typeorm-empleado.repository';
import DISABLED_LEGACY_PASSWORD_HASH from '@infrastructure/security/disabled-legacy-password-hash.constant';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmEmpleadoRepository | null = null;

describe('TypeOrmEmpleadoRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-empleados-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'empleados.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);

    repository = new TypeOrmEmpleadoRepository(applicationDatabase);
  });

  afterEach(async (): Promise<void> => {
    if (applicationDatabase !== null) {
      await applicationDatabase.disconnect();
    }

    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    repository = null;
    applicationDatabase = null;
    tempDirectory = null;
  });

  it('obtiene las credenciales scrypt de un empleado activo', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await insertEmpleado(dataSource, {
      id: 1,
      publicId: 'empleado-1',
      nombre: 'Empleado scrypt',
      passwordHash: 'scrypt-hash',
      passwordAlgorithm: 'scrypt',
    });

    const result: EmpleadoAuthenticationRecord | null =
      await requireRepository().findAuthenticationById(1);

    expect(result).toEqual({
      id: 1,
      passwordHash: 'scrypt-hash',
      passwordAlgorithm: 'scrypt',
      passwordAvailable: true,
    });
  });

  it('obtiene una contraseña bcrypt legacy disponible', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await insertEmpleado(dataSource, {
      id: 1,
      publicId: 'empleado-1',
      nombre: 'Empleado legacy',
      passwordHash: '$2b$12$hash-legacy-valido',
      passwordAlgorithm: 'bcrypt_legacy',
    });

    const result: EmpleadoAuthenticationRecord | null =
      await requireRepository().findAuthenticationById(1);

    expect(result).toEqual({
      id: 1,
      passwordHash: '$2b$12$hash-legacy-valido',
      passwordAlgorithm: 'bcrypt_legacy',
      passwordAvailable: true,
    });
  });

  it('marca como no disponible el sentinel de contraseña legacy', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await insertEmpleado(dataSource, {
      id: 1,
      publicId: 'empleado-1',
      nombre: 'Empleado sin contraseña',
      passwordHash: DISABLED_LEGACY_PASSWORD_HASH,
      passwordAlgorithm: 'bcrypt_legacy',
    });

    const result: EmpleadoAuthenticationRecord | null =
      await requireRepository().findAuthenticationById(1);

    expect(result).toEqual({
      id: 1,
      passwordHash: DISABLED_LEGACY_PASSWORD_HASH,
      passwordAlgorithm: 'bcrypt_legacy',
      passwordAvailable: false,
    });
  });

  it('no devuelve credenciales de empleados inactivos o eliminados', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await insertEmpleado(dataSource, {
      id: 1,
      publicId: 'empleado-inactivo',
      nombre: 'Empleado inactivo',
      activo: 0,
    });

    await insertEmpleado(dataSource, {
      id: 2,
      publicId: 'empleado-eliminado',
      nombre: 'Empleado eliminado',
      deletedAt: '2026-01-01T00:00:00.000Z',
    });

    await expect(requireRepository().findAuthenticationById(1)).resolves.toBeNull();

    await expect(requireRepository().findAuthenticationById(2)).resolves.toBeNull();
  });

  it('migra una contraseña bcrypt legacy a scrypt cuando el hash esperado coincide', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await insertEmpleado(dataSource, {
      id: 1,
      publicId: 'empleado-1',
      nombre: 'Empleado legacy',
      passwordHash: 'hash-legacy-original',
      passwordAlgorithm: 'bcrypt_legacy',
    });

    await requireRepository().upgradeLegacyPassword(1, 'hash-legacy-original', 'hash-scrypt-nuevo');

    const rows: readonly {
      readonly password_hash: string;
      readonly password_algorithm: string;
    }[] = await dataSource.query(
      `
        SELECT
          password_hash,
          password_algorithm
        FROM empleado
        WHERE id = 1
      `,
    );

    expect(rows[0]).toEqual({
      password_hash: 'hash-scrypt-nuevo',
      password_algorithm: 'scrypt',
    });
  });

  it('no sobrescribe una contraseña si el hash legacy ya ha cambiado', async (): Promise<void> => {
    const dataSource: DataSource = await requireDatabase().connect();

    await insertEmpleado(dataSource, {
      id: 1,
      publicId: 'empleado-1',
      nombre: 'Empleado legacy',
      passwordHash: 'hash-legacy-actual',
      passwordAlgorithm: 'bcrypt_legacy',
    });

    await requireRepository().upgradeLegacyPassword(1, 'hash-legacy-antiguo', 'hash-scrypt-nuevo');

    const rows: readonly {
      readonly password_hash: string;
      readonly password_algorithm: string;
    }[] = await dataSource.query(
      `
        SELECT
          password_hash,
          password_algorithm
        FROM empleado
        WHERE id = 1
      `,
    );

    expect(rows[0]).toEqual({
      password_hash: 'hash-legacy-actual',
      password_algorithm: 'bcrypt_legacy',
    });
  });
});

/**
 * Crea el esquema completo sobre la SQLite temporal.
 */
async function createSchema(dataSource: DataSource): Promise<void> {
  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

/**
 * Inserta un empleado para los tests del repository.
 */
async function insertEmpleado(
  dataSource: DataSource,
  values: {
    readonly id: number;
    readonly publicId: string;
    readonly nombre: string;
    readonly passwordHash?: string;
    readonly passwordAlgorithm?: 'scrypt' | 'bcrypt_legacy';
    readonly activo?: 0 | 1;
    readonly deletedAt?: string | null;
  },
): Promise<void> {
  await dataSource.query(
    `
      INSERT INTO empleado (
        id,
        public_id,
        nombre,
        password_hash,
        password_algorithm,
        color,
        admin,
        activo,
        deleted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      values.id,
      values.publicId,
      values.nombre,
      values.passwordHash ?? 'scrypt-hash',
      values.passwordAlgorithm ?? 'scrypt',
      '336699',
      0,
      values.activo ?? 1,
      values.deletedAt ?? null,
    ],
  );
}

/**
 * Devuelve el repository inicializado.
 */
function requireRepository(): TypeOrmEmpleadoRepository {
  if (repository === null) {
    throw new Error('El repository de empleados no está inicializado.');
  }

  return repository;
}

/**
 * Devuelve la base de datos inicializada.
 */
function requireDatabase(): TypeOrmApplicationDatabase {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de empleados no está inicializada.');
  }

  return applicationDatabase;
}
