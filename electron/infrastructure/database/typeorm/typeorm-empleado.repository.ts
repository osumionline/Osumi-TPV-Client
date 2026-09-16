import type EmpleadoRepository from '@backend/contracts/empleados/empleado.repository.interface';
import type EmpleadoAuthenticationRecord from '@backend/domain/empleados/empleado-authentication-record.interface';
import type EmpleadoRecord from '@backend/domain/empleados/empleado-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import DISABLED_LEGACY_PASSWORD_HASH from '@infrastructure/security/disabled-legacy-password-hash.constant';
import type { DataSource } from 'typeorm';

interface EmpleadoAuthenticationRow {
  readonly id: number;
  readonly password_hash: string;
  readonly password_algorithm: 'scrypt' | 'bcrypt_legacy';
  readonly password_available: number;
}

interface EmpleadoDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly nombre: string;
  readonly has_password: number;
  readonly color: string;
  readonly admin: number;
}

interface EmpleadoPermisoDatabaseRow {
  readonly id_empleado: number;
  readonly id_permiso: number;
}

export default class TypeOrmEmpleadoRepository implements EmpleadoRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  async findAll(): Promise<readonly EmpleadoRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const empleados: readonly EmpleadoDatabaseRow[] = await this.readEmpleados(dataSource);

    if (empleados.length === 0) {
      return [];
    }

    const permisos: readonly EmpleadoPermisoDatabaseRow[] = await this.readPermisos(dataSource);

    const permisosByEmpleado: ReadonlyMap<number, readonly number[]> = this.groupPermisos(permisos);

    return empleados.map((empleado: EmpleadoDatabaseRow): EmpleadoRecord => ({
      id: empleado.id,
      publicId: empleado.public_id,
      nombre: empleado.nombre,
      hasPassword: empleado.has_password === 1,
      color: empleado.color,
      admin: empleado.admin === 1,
      permisos: permisosByEmpleado.get(empleado.id) ?? [],
    }));
  }

  /**
   * Obtiene las credenciales internas de un empleado activo.
   */
  async findAuthenticationById(idEmpleado: number): Promise<EmpleadoAuthenticationRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: EmpleadoAuthenticationRow[] = (await dataSource.query(
      `
      SELECT
        e.id,
        e.password_hash,
        e.password_algorithm,
        CASE
          WHEN
            e.password_algorithm = 'bcrypt_legacy'
            AND e.password_hash = ?
          THEN 0
          ELSE 1
        END AS password_available
      FROM empleado e
      WHERE
        e.id = ?
        AND e.activo = 1
        AND e.deleted_at IS NULL
      LIMIT 1
    `,
      [DISABLED_LEGACY_PASSWORD_HASH, idEmpleado],
    )) as EmpleadoAuthenticationRow[];

    const row: EmpleadoAuthenticationRow | undefined = rows[0];

    if (row === undefined) {
      return null;
    }

    return {
      id: row.id,
      passwordHash: row.password_hash,
      passwordAlgorithm: row.password_algorithm,
      passwordAvailable: row.password_available === 1,
    };
  }

  /**
   * Migra una credencial legacy a scrypt sin sobrescribir
   * una contraseña que haya cambiado concurrentemente.
   */
  async upgradeLegacyPassword(
    idEmpleado: number,
    expectedLegacyHash: string,
    newScryptHash: string,
  ): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await dataSource.query(
      `
      UPDATE empleado
      SET
        password_hash = ?,
        password_algorithm = 'scrypt',
        updated_at = ?
      WHERE
        id = ?
        AND activo = 1
        AND deleted_at IS NULL
        AND password_algorithm = 'bcrypt_legacy'
        AND password_hash = ?
    `,
      [newScryptHash, new Date().toISOString(), idEmpleado, expectedLegacyHash],
    );
  }

  private async readEmpleados(dataSource: DataSource): Promise<readonly EmpleadoDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          e.id,
          e.public_id,
          e.nombre,
          CASE
            WHEN
              e.password_algorithm = 'bcrypt_legacy'
              AND e.password_hash = ?
            THEN 0
            ELSE 1
          END AS has_password,
          e.color,
          e.admin
        FROM empleado e
        WHERE
          e.activo = 1
          AND e.deleted_at IS NULL
        ORDER BY
          e.nombre COLLATE NOCASE,
          e.id
      `,
      [DISABLED_LEGACY_PASSWORD_HASH],
    )) as readonly EmpleadoDatabaseRow[];
  }

  private async readPermisos(
    dataSource: DataSource,
  ): Promise<readonly EmpleadoPermisoDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          ep.id_empleado,
          ep.id_permiso
        FROM empleado_permiso ep
        INNER JOIN empleado e
          ON e.id = ep.id_empleado
          AND e.activo = 1
          AND e.deleted_at IS NULL
        ORDER BY
          ep.id_empleado,
          ep.id_permiso
      `,
    )) as readonly EmpleadoPermisoDatabaseRow[];
  }

  private groupPermisos(
    rows: readonly EmpleadoPermisoDatabaseRow[],
  ): ReadonlyMap<number, readonly number[]> {
    const result: Map<number, number[]> = new Map<number, number[]>();

    for (const row of rows) {
      const current: number[] = result.get(row.id_empleado) ?? [];

      current.push(row.id_permiso);

      result.set(row.id_empleado, current);
    }

    return result;
  }
}
