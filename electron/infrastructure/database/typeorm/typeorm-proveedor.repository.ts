import type ActualizarComercialRecordCommand from '@backend/contracts/proveedores/actualizar-comercial-record-command.interface';
import type ActualizarProveedorRecordCommand from '@backend/contracts/proveedores/actualizar-proveedor-record-command.interface';
import type CrearComercialRecordCommand from '@backend/contracts/proveedores/crear-comercial-record-command.interface';
import type CrearProveedorRecordCommand from '@backend/contracts/proveedores/crear-proveedor-record-command.interface';
import type ProveedorRepository from '@backend/contracts/proveedores/proveedor.repository.interface';
import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';
import type ComercialRecord from '@backend/domain/proveedores/comercial-record.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';
import { getLastInsertId } from '@infrastructure/database/typeorm/sqlite.utils';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import insertArchivo from '@infrastructure/database/typeorm/typeorm-archivo.utils';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

interface ProveedorDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_archivo: number | null;
  readonly nombre: string;
  readonly direccion: string | null;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly web: string | null;
  readonly observaciones: string | null;
  readonly foto_relative_path: string | null;
}

interface ProveedorLogoPersistence {
  readonly idArchivo: number | null;
  readonly relativePath: string | null;
}

interface ProveedorMarcaDatabaseRow {
  readonly id_proveedor: number;
  readonly id_marca: number;
}

interface ComercialDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_proveedor: number;
  readonly nombre: string;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly observaciones: string | null;
}

export default class TypeOrmProveedorRepository implements ProveedorRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  async findAll(): Promise<readonly ProveedorRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const proveedores: readonly ProveedorDatabaseRow[] = await this.readProveedores(dataSource);

    if (proveedores.length === 0) {
      return [];
    }

    const marcas: readonly ProveedorMarcaDatabaseRow[] = await this.readMarcas(dataSource);

    const comerciales: readonly ComercialDatabaseRow[] = await this.readComerciales(dataSource);

    const marcasByProveedor: ReadonlyMap<number, readonly number[]> = this.groupMarcas(marcas);

    const comercialesByProveedor: ReadonlyMap<number, readonly ComercialRecord[]> =
      this.groupComerciales(comerciales);

    return proveedores.map((proveedor: ProveedorDatabaseRow): ProveedorRecord =>
      this.toRecord(
        proveedor,
        marcasByProveedor.get(proveedor.id) ?? [],
        comercialesByProveedor.get(proveedor.id) ?? [],
      ),
    );
  }

  /**
   * Recupera un proveedor activo por su identificador interno.
   */
  async findById(id: number): Promise<ProveedorRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ProveedorDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          p.id,
          p.public_id,
          p.id_archivo,
          p.nombre,
          p.direccion,
          p.telefono,
          p.email,
          p.web,
          p.observaciones,
          a.relative_path
            AS foto_relative_path
        FROM proveedor p

        LEFT JOIN archivo a
          ON a.id = p.id_archivo
          AND a.deleted_at IS NULL

        WHERE
          p.id = ?
          AND p.deleted_at IS NULL

        LIMIT 1
      `,
      [id],
    )) as readonly ProveedorDatabaseRow[];

    const proveedor: ProveedorDatabaseRow | undefined = rows[0];

    if (proveedor === undefined) {
      return null;
    }

    const marcas: readonly ProveedorMarcaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          pm.id_proveedor,
          pm.id_marca
        FROM proveedor_marca pm

        INNER JOIN marca m
          ON m.id = pm.id_marca
          AND m.deleted_at IS NULL

        WHERE
          pm.id_proveedor = ?

        ORDER BY
          m.nombre COLLATE NOCASE,
          pm.id_marca
      `,
      [id],
    )) as readonly ProveedorMarcaDatabaseRow[];

    const comerciales: readonly ComercialDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          c.id,
          c.public_id,
          c.id_proveedor,
          c.nombre,
          c.telefono,
          c.email,
          c.observaciones
        FROM comercial c

        WHERE
          c.id_proveedor = ?
          AND c.deleted_at IS NULL

        ORDER BY
          c.nombre COLLATE NOCASE,
          c.id
      `,
      [id],
    )) as readonly ComercialDatabaseRow[];

    return this.toRecord(
      proveedor,
      marcas.map((row: ProveedorMarcaDatabaseRow): number => row.id_marca),
      comerciales.map((row: ComercialDatabaseRow): ComercialRecord => this.toComercialRecord(row)),
    );
  }

  /**
   * Comprueba si existe otro proveedor activo
   * con el mismo nombre.
   */
  async existsActiveByName(nombre: string, excludeId: number | null): Promise<boolean> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly {
      readonly total: number;
    }[] = (await dataSource.query(
      `
        SELECT
          COUNT(*) AS total
        FROM proveedor
        WHERE
          deleted_at IS NULL
          AND nombre = ? COLLATE NOCASE
          AND (
            ? IS NULL
            OR id <> ?
          )
      `,
      [nombre, excludeId, excludeId],
    )) as readonly {
      readonly total: number;
    }[];

    return (rows[0]?.total ?? 0) > 0;
  }

  /**
   * Crea un proveedor, su logo opcional y sus relaciones
   * activas con marcas dentro de una única transacción.
   */
  async create(command: CrearProveedorRecordCommand): Promise<ProveedorRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const publicId: string = randomUUID();
    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<ProveedorRecord> => {
        for (const idMarca of command.idsMarcas) {
          await this.requireActiveMarca(queryRunner, idMarca);
        }

        let idArchivo: number | null = null;

        if (command.nuevoLogo !== null) {
          this.validateNewProviderImage(command.nuevoLogo);

          idArchivo = await insertArchivo(queryRunner, command.nuevoLogo);
        }

        await queryRunner.query(
          `
          INSERT INTO proveedor (
            public_id,
            id_archivo,
            nombre,
            direccion,
            telefono,
            email,
            web,
            observaciones,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            publicId,
            idArchivo,
            command.nombre,
            command.direccion,
            command.telefono,
            command.email,
            command.web,
            command.observaciones,
            timestamp,
            timestamp,
          ],
        );

        const idProveedor: number = await getLastInsertId(
          queryRunner,
          'No se ha podido obtener el identificador del proveedor creado.',
        );

        for (const idMarca of command.idsMarcas) {
          await queryRunner.query(
            `
            INSERT INTO proveedor_marca (
              id_proveedor,
              id_marca,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?)
          `,
            [idProveedor, idMarca, timestamp, timestamp],
          );
        }

        return {
          id: idProveedor,
          publicId,
          nombre: command.nombre,
          fotoRelativePath: command.nuevoLogo?.relativePath ?? null,
          direccion: command.direccion,
          telefono: command.telefono,
          email: command.email,
          web: command.web,
          observaciones: command.observaciones,
          marcas: [...command.idsMarcas],
          comerciales: [],
        };
      },
    );
  }

  /**
   * Actualiza los datos, logo y relaciones activas
   * de un proveedor dentro de una única transacción.
   *
   * Las relaciones con marcas eliminadas permanecen
   * físicamente intactas.
   */
  async update(id: number, command: ActualizarProveedorRecordCommand): Promise<ProveedorRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const timestamp: string = new Date().toISOString();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      const current: ProveedorDatabaseRow = await this.requireActiveProveedor(
        queryRunner,
        id,
        'El proveedor que se intenta actualizar no existe.',
      );

      for (const idMarca of command.idsMarcas) {
        await this.requireActiveMarca(queryRunner, idMarca);
      }

      const logo: ProveedorLogoPersistence = await this.resolveLogoUpdate(
        queryRunner,
        current,
        command.logo,
      );

      await queryRunner.query(
        `
          UPDATE proveedor
          SET
            id_archivo = ?,
            nombre = ?,
            direccion = ?,
            telefono = ?,
            email = ?,
            web = ?,
            observaciones = ?,
            updated_at = ?
          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [
          logo.idArchivo,
          command.nombre,
          command.direccion,
          command.telefono,
          command.email,
          command.web,
          command.observaciones,
          timestamp,
          id,
        ],
      );

      await this.syncActiveMarcas(queryRunner, id, command.idsMarcas, timestamp);
    });

    const updated: ProveedorRecord | null = await this.findById(id);

    if (updated === null) {
      throw new Error('No se ha podido recuperar el proveedor actualizado.');
    }

    return updated;
  }

  /**
   * Da de baja lógicamente un proveedor y todos sus
   * comerciales activos dentro de una única transacción.
   *
   * No se modifican sus marcas, artículos, pedidos,
   * archivos ni ninguna otra referencia histórica.
   */
  async deactivate(id: number): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const timestamp: string = new Date().toISOString();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      await this.requireActiveProveedor(
        queryRunner,
        id,
        'El proveedor que se intenta eliminar no existe o ya está dado de baja.',
      );

      await queryRunner.query(
        `
          UPDATE proveedor
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [timestamp, timestamp, id],
      );

      await queryRunner.query(
        `
          UPDATE comercial
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE
            id_proveedor = ?
            AND deleted_at IS NULL
        `,
        [timestamp, timestamp, id],
      );
    });
  }

  /**
   * Crea un Comercial bajo un Proveedor activo.
   */
  async createComercial(command: CrearComercialRecordCommand): Promise<ComercialRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const publicId: string = randomUUID();

    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<ComercialRecord> => {
        await this.requireActiveProveedor(
          queryRunner,
          command.idProveedor,
          'El proveedor indicado no existe o ya no está activo.',
        );

        await queryRunner.query(
          `
            INSERT INTO comercial (
              public_id,
              id_proveedor,
              nombre,
              telefono,
              email,
              observaciones,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            publicId,
            command.idProveedor,
            command.nombre,
            command.telefono,
            command.email,
            command.observaciones,
            timestamp,
            timestamp,
          ],
        );

        const idComercial: number = await getLastInsertId(
          queryRunner,
          'No se ha podido obtener el identificador del comercial creado.',
        );

        return {
          id: idComercial,
          publicId,
          idProveedor: command.idProveedor,
          nombre: command.nombre,
          telefono: command.telefono,
          email: command.email,
          observaciones: command.observaciones,
        };
      },
    );
  }

  /**
   * Actualiza un Comercial activo sin permitir
   * cambiar el Proveedor al que pertenece.
   */
  async updateComercial(
    idProveedor: number,
    idComercial: number,
    command: ActualizarComercialRecordCommand,
  ): Promise<ComercialRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const timestamp: string = new Date().toISOString();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<ComercialRecord> => {
        const current: ComercialDatabaseRow = await this.requireActiveComercial(
          queryRunner,
          idProveedor,
          idComercial,
          'El comercial indicado no existe, ya no está activo o no pertenece al proveedor.',
        );

        await queryRunner.query(
          `
            UPDATE comercial
            SET
              nombre = ?,
              telefono = ?,
              email = ?,
              observaciones = ?,
              updated_at = ?
            WHERE
              id = ?
              AND id_proveedor = ?
              AND deleted_at IS NULL
          `,
          [
            command.nombre,
            command.telefono,
            command.email,
            command.observaciones,
            timestamp,
            idComercial,
            idProveedor,
          ],
        );

        return this.toComercialRecord({
          ...current,
          nombre: command.nombre,
          telefono: command.telefono,
          email: command.email,
          observaciones: command.observaciones,
        });
      },
    );
  }

  /**
   * Da de baja lógicamente un Comercial
   * perteneciente a un Proveedor activo.
   */
  async deactivateComercial(idProveedor: number, idComercial: number): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const timestamp: string = new Date().toISOString();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      await this.requireActiveComercial(
        queryRunner,
        idProveedor,
        idComercial,
        'El comercial que se intenta eliminar no existe, ya está dado de baja o no pertenece al proveedor.',
      );

      await queryRunner.query(
        `
            UPDATE comercial
            SET
              deleted_at = ?,
              updated_at = ?
            WHERE
              id = ?
              AND id_proveedor = ?
              AND deleted_at IS NULL
          `,
        [timestamp, timestamp, idComercial, idProveedor],
      );
    });
  }

  /**
   * Recupera un Comercial activo comprobando
   * también que su Proveedor siga activo y que
   * la relación entre ambos sea la esperada.
   */
  private async requireActiveComercial(
    queryRunner: QueryRunner,
    idProveedor: number,
    idComercial: number,
    errorMessage: string,
  ): Promise<ComercialDatabaseRow> {
    const rows: readonly ComercialDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            c.id,
            c.public_id,
            c.id_proveedor,
            c.nombre,
            c.telefono,
            c.email,
            c.observaciones
          FROM comercial c

          INNER JOIN proveedor p
            ON p.id = c.id_proveedor
            AND p.deleted_at IS NULL

          WHERE
            c.id = ?
            AND c.id_proveedor = ?
            AND c.deleted_at IS NULL

          LIMIT 1
        `,
      [idComercial, idProveedor],
    )) as readonly ComercialDatabaseRow[];

    const row: ComercialDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      throw new Error(errorMessage);
    }

    return row;
  }

  /**
   * Sincroniza las marcas activas de un proveedor.
   *
   * Las relaciones existentes con marcas que ya están
   * dadas de baja no se eliminan ni se modifican.
   */
  private async syncActiveMarcas(
    queryRunner: QueryRunner,
    idProveedor: number,
    idsMarcas: readonly number[],
    timestamp: string,
  ): Promise<void> {
    if (idsMarcas.length === 0) {
      await queryRunner.query(
        `
          DELETE FROM proveedor_marca
          WHERE
            id_proveedor = ?
            AND id_marca IN (
              SELECT id
              FROM marca
              WHERE deleted_at IS NULL
            )
        `,
        [idProveedor],
      );
    } else {
      const placeholders: string = idsMarcas.map((): string => '?').join(', ');

      await queryRunner.query(
        `
          DELETE FROM proveedor_marca
          WHERE
            id_proveedor = ?
            AND id_marca IN (
              SELECT id
              FROM marca
              WHERE deleted_at IS NULL
            )
            AND id_marca NOT IN (${placeholders})
        `,
        [idProveedor, ...idsMarcas],
      );
    }

    for (const idMarca of idsMarcas) {
      await queryRunner.query(
        `
          INSERT INTO proveedor_marca (
            id_proveedor,
            id_marca,
            created_at,
            updated_at
          )
          SELECT
            ?,
            ?,
            ?,
            ?
          WHERE NOT EXISTS (
            SELECT 1
            FROM proveedor_marca
            WHERE
              id_proveedor = ?
              AND id_marca = ?
          )
        `,
        [idProveedor, idMarca, timestamp, timestamp, idProveedor, idMarca],
      );
    }
  }

  /**
   * Resuelve qué archivo de logo debe quedar enlazado
   * después de actualizar el Proveedor.
   */
  private async resolveLogoUpdate(
    queryRunner: QueryRunner,
    current: ProveedorDatabaseRow,
    logo: ActualizarProveedorRecordCommand['logo'],
  ): Promise<ProveedorLogoPersistence> {
    switch (logo.action) {
      case 'keep':
        return {
          idArchivo: current.id_archivo,
          relativePath: current.foto_relative_path,
        };

      case 'remove':
        return {
          idArchivo: null,
          relativePath: null,
        };

      case 'replace':
        this.validateNewProviderImage(logo.nuevoArchivo);

        return {
          idArchivo: await insertArchivo(queryRunner, logo.nuevoArchivo),
          relativePath: logo.nuevoArchivo.relativePath,
        };
    }
  }

  /**
   * Comprueba que un archivo nuevo sea un WebP
   * preparado específicamente para Proveedores.
   */
  private validateNewProviderImage(archivo: ArchivoCreateRecord): void {
    if (
      archivo.purpose !== 'provider_image' ||
      archivo.mimeType !== 'image/webp' ||
      !archivo.relativePath.startsWith('files/providers/')
    ) {
      throw new Error('El logo nuevo no pertenece al almacenamiento de imágenes de Proveedores.');
    }
  }

  /**
   * Recupera un proveedor activo dentro de la
   * transacción o lanza el error indicado.
   */
  private async requireActiveProveedor(
    queryRunner: QueryRunner,
    idProveedor: number,
    errorMessage: string,
  ): Promise<ProveedorDatabaseRow> {
    const rows: readonly ProveedorDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          p.id,
          p.public_id,
          p.id_archivo,
          p.nombre,
          p.direccion,
          p.telefono,
          p.email,
          p.web,
          p.observaciones,
          a.relative_path
            AS foto_relative_path
        FROM proveedor p

        LEFT JOIN archivo a
          ON a.id = p.id_archivo
          AND a.deleted_at IS NULL

        WHERE
          p.id = ?
          AND p.deleted_at IS NULL

        LIMIT 1
      `,
      [idProveedor],
    )) as readonly ProveedorDatabaseRow[];

    const row: ProveedorDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      throw new Error(errorMessage);
    }

    return row;
  }

  /**
   * Comprueba que una marca seleccionada siga activa.
   */
  private async requireActiveMarca(queryRunner: QueryRunner, idMarca: number): Promise<void> {
    const rows: readonly {
      readonly id: number;
    }[] = (await queryRunner.query(
      `
        SELECT id
        FROM marca
        WHERE
          id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [idMarca],
    )) as readonly {
      readonly id: number;
    }[];

    if (rows.length === 0) {
      throw new Error('Una de las marcas seleccionadas no existe.');
    }
  }

  private async readProveedores(dataSource: DataSource): Promise<readonly ProveedorDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          p.id,
          p.public_id,
          p.id_archivo,
          p.nombre,
          p.direccion,
          p.telefono,
          p.email,
          p.web,
          p.observaciones,
          a.relative_path
            AS foto_relative_path
        FROM proveedor p
        LEFT JOIN archivo a
          ON a.id = p.id_archivo
          AND a.deleted_at IS NULL
        WHERE
          p.deleted_at IS NULL
        ORDER BY
          p.nombre COLLATE NOCASE,
          p.id
      `,
    )) as readonly ProveedorDatabaseRow[];
  }

  private async readMarcas(dataSource: DataSource): Promise<readonly ProveedorMarcaDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          pm.id_proveedor,
          pm.id_marca
        FROM proveedor_marca pm
        INNER JOIN proveedor p
          ON p.id = pm.id_proveedor
          AND p.deleted_at IS NULL
        INNER JOIN marca m
          ON m.id = pm.id_marca
          AND m.deleted_at IS NULL
        ORDER BY
          pm.id_proveedor,
          m.nombre COLLATE NOCASE,
          pm.id_marca
      `,
    )) as readonly ProveedorMarcaDatabaseRow[];
  }

  private async readComerciales(dataSource: DataSource): Promise<readonly ComercialDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          c.id,
          c.public_id,
          c.id_proveedor,
          c.nombre,
          c.telefono,
          c.email,
          c.observaciones
        FROM comercial c
        INNER JOIN proveedor p
          ON p.id = c.id_proveedor
          AND p.deleted_at IS NULL
        WHERE
          c.deleted_at IS NULL
        ORDER BY
          c.id_proveedor,
          c.nombre COLLATE NOCASE,
          c.id
      `,
    )) as readonly ComercialDatabaseRow[];
  }

  private groupMarcas(
    rows: readonly ProveedorMarcaDatabaseRow[],
  ): ReadonlyMap<number, readonly number[]> {
    const result: Map<number, number[]> = new Map<number, number[]>();

    for (const row of rows) {
      const current: number[] = result.get(row.id_proveedor) ?? [];

      current.push(row.id_marca);

      result.set(row.id_proveedor, current);
    }

    return result;
  }

  private groupComerciales(
    rows: readonly ComercialDatabaseRow[],
  ): ReadonlyMap<number, readonly ComercialRecord[]> {
    const result: Map<number, ComercialRecord[]> = new Map<number, ComercialRecord[]>();

    for (const row of rows) {
      const current: ComercialRecord[] = result.get(row.id_proveedor) ?? [];

      current.push(this.toComercialRecord(row));

      result.set(row.id_proveedor, current);
    }

    return result;
  }

  /**
   * Convierte una fila de proveedor y sus relaciones
   * activas al modelo de dominio.
   */
  private toRecord(
    proveedor: ProveedorDatabaseRow,
    marcas: readonly number[],
    comerciales: readonly ComercialRecord[],
  ): ProveedorRecord {
    return {
      id: proveedor.id,
      publicId: proveedor.public_id,
      nombre: proveedor.nombre,
      fotoRelativePath: proveedor.foto_relative_path,
      direccion: proveedor.direccion,
      telefono: proveedor.telefono,
      email: proveedor.email,
      web: proveedor.web,
      observaciones: proveedor.observaciones,
      marcas: [...marcas],
      comerciales: [...comerciales],
    };
  }

  /**
   * Convierte una fila de comercial al modelo de dominio.
   */
  private toComercialRecord(row: ComercialDatabaseRow): ComercialRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      idProveedor: row.id_proveedor,
      nombre: row.nombre,
      telefono: row.telefono,
      email: row.email,
      observaciones: row.observaciones,
    };
  }
}
