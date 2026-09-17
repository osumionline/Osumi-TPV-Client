import type ActualizarEmpleadoRecordCommand from '@backend/contracts/empleados/actualizar-empleado-record-command.interface';
import type CrearEmpleadoRecordCommand from '@backend/contracts/empleados/crear-empleado-record-command.interface';
import type EmpleadoRepository from '@backend/contracts/empleados/empleado.repository.interface';
import type EmpleadoAuthenticationRecord from '@backend/domain/empleados/empleado-authentication-record.interface';
import type EmpleadoRecord from '@backend/domain/empleados/empleado-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import DISABLED_LEGACY_PASSWORD_HASH from '@infrastructure/security/disabled-legacy-password-hash.constant';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

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

interface EmpleadoIdRow {
  readonly id: number;
}

interface CountRow {
  readonly total: number;
}

export default class TypeOrmEmpleadoRepository implements EmpleadoRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Obtiene todos los empleados activos
   * junto con sus permisos.
   */
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
   * Obtiene un empleado activo por
   * su identificador interno.
   */
  async findById(idEmpleado: number): Promise<EmpleadoRecord | null> {
    const empleados: readonly EmpleadoRecord[] = await this.findAll();

    return (
      empleados.find((empleado: EmpleadoRecord): boolean => empleado.id === idEmpleado) ?? null
    );
  }

  /**
   * Comprueba si existe otro empleado activo
   * con el nombre indicado.
   */
  async existsActiveByName(nombre: string, excludeId: number | null): Promise<boolean> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly EmpleadoIdRow[] = (await dataSource.query(
      `
          SELECT id
          FROM empleado
          WHERE
            nombre = ? COLLATE NOCASE
            AND activo = 1
            AND deleted_at IS NULL
            AND (
              ? IS NULL
              OR id <> ?
            )
          LIMIT 1
        `,
      [nombre, excludeId, excludeId],
    )) as readonly EmpleadoIdRow[];

    return rows.length > 0;
  }

  /**
   * Cuenta los administradores
   * actualmente activos.
   */
  async countActiveAdmins(): Promise<number> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly CountRow[] = (await dataSource.query(`
        SELECT COUNT(*) AS total
        FROM empleado
        WHERE
          admin = 1
          AND activo = 1
          AND deleted_at IS NULL
      `)) as readonly CountRow[];

    return rows[0]?.total ?? 0;
  }

  /**
   * Crea un empleado no administrador
   * junto con sus permisos.
   */
  async create(command: CrearEmpleadoRecordCommand): Promise<EmpleadoRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const queryRunner: QueryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now: string = new Date().toISOString();

      await queryRunner.query(
        `
          INSERT INTO empleado (
            public_id,
            nombre,
            password_hash,
            password_algorithm,
            color,
            admin,
            activo,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            0,
            1,
            ?,
            ?,
            NULL
          )
        `,
        [randomUUID(), command.nombre, command.passwordHash, 'scrypt', command.color, now, now],
      );

      const rows: readonly EmpleadoIdRow[] = (await queryRunner.query(
        `
            SELECT
              last_insert_rowid() AS id
          `,
      )) as readonly EmpleadoIdRow[];

      const idEmpleado: number | undefined = rows[0]?.id;

      if (idEmpleado === undefined) {
        throw new Error('No se ha podido obtener el identificador del empleado creado.');
      }

      await this.replacePermissions(queryRunner, idEmpleado, command.permisos);

      await queryRunner.commitTransaction();

      const created: EmpleadoRecord | null = await this.findById(idEmpleado);

      if (created === null) {
        throw new Error('No se ha podido recuperar el empleado creado.');
      }

      return created;
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Actualiza los datos y permisos de
   * un empleado activo.
   */
  async update(
    idEmpleado: number,
    command: ActualizarEmpleadoRecordCommand,
  ): Promise<EmpleadoRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const queryRunner: QueryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now: string = new Date().toISOString();

      if (command.passwordHash !== null) {
        await queryRunner.query(
          `
            UPDATE empleado
            SET
              nombre = ?,
              password_hash = ?,
              password_algorithm = 'scrypt',
              color = ?,
              updated_at = ?
            WHERE
              id = ?
              AND activo = 1
              AND deleted_at IS NULL
          `,
          [command.nombre, command.passwordHash, command.color, now, idEmpleado],
        );
      } else {
        /*
         * passwordHash=null conserva exactamente
         * la contraseña actualmente persistida.
         */
        await queryRunner.query(
          `
            UPDATE empleado
            SET
              nombre = ?,
              color = ?,
              updated_at = ?
            WHERE
              id = ?
              AND activo = 1
              AND deleted_at IS NULL
          `,
          [command.nombre, command.color, now, idEmpleado],
        );
      }

      await this.replacePermissions(queryRunner, idEmpleado, command.permisos);

      await queryRunner.commitTransaction();

      const updated: EmpleadoRecord | null = await this.findById(idEmpleado);

      if (updated === null) {
        throw new Error('No se ha podido recuperar el empleado actualizado.');
      }

      return updated;
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Da de baja lógicamente un empleado
   * y elimina sus permisos activos.
   */
  async deactivate(idEmpleado: number): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const queryRunner: QueryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now: string = new Date().toISOString();

      await queryRunner.query(
        `
          UPDATE empleado
          SET
            activo = 0,
            updated_at = ?,
            deleted_at = ?
          WHERE
            id = ?
            AND activo = 1
            AND deleted_at IS NULL
        `,
        [now, now, idEmpleado],
      );

      await queryRunner.query(
        `
          DELETE FROM empleado_permiso
          WHERE id_empleado = ?
        `,
        [idEmpleado],
      );

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene las credenciales internas
   * de un empleado activo.
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
   * Migra una credencial legacy a scrypt
   * sin sobrescribir una contraseña que
   * haya cambiado concurrentemente.
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

  private async replacePermissions(
    queryRunner: QueryRunner,
    idEmpleado: number,
    permisos: readonly number[],
  ): Promise<void> {
    await queryRunner.query(
      `
        DELETE FROM empleado_permiso
        WHERE id_empleado = ?
      `,
      [idEmpleado],
    );

    const createdAt: string = new Date().toISOString();

    for (const idPermiso of permisos) {
      await queryRunner.query(
        `
          INSERT INTO empleado_permiso (
            id_empleado,
            id_permiso,
            created_at
          )
          VALUES (?, ?, ?)
        `,
        [idEmpleado, idPermiso, createdAt],
      );
    }
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
