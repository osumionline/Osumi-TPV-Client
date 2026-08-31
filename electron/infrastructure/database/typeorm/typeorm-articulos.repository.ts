import type ArticulosRepository from '@backend/contracts/articulos/articulos.repository.interface';
import type {
  ArticuloCodigoBarrasRecord,
  ArticuloFotoRecord,
  ArticuloRecord,
} from '@backend/domain/articulos/articulo-record.interface';
import type {
  ArticuloFotoSaveRecord,
  ArticuloSaveRecord,
} from '@backend/domain/articulos/articulo-save-record.interface';
import HISTORICO_ARTICULO_TIPO from '@backend/domain/articulos/historico-articulo.constants';
import { MONEY_SCALE, UNIT_PRICE_SCALE } from '@backend/domain/database/database-schema.constants';
import { generateArticuloLocalizador } from '@backend/utils/articulo-localizador.utils';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';
import insertArchivo from '@infrastructure/database/typeorm/typeorm-archivo.utils';
import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';

interface ArticuloArchivoDatabaseRow {
  readonly id_archivo: number;
}

interface ArticuloUpdateDatabaseRow {
  readonly id: number;
  readonly localizador: number;
  readonly stock: number;
}

interface ArticuloAdditionalBarcodeDatabaseRow {
  readonly id: number;
  readonly codigo: string;
}

interface DatabaseIdRow {
  readonly id: number;
}

interface ArticuloDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly localizador: number;
  readonly nombre: string;
  readonly id_marca: number;
  readonly id_proveedor: number | null;
  readonly referencia: string | null;
  readonly palb_micros: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly pvp_descuento_cents: number | null;
  readonly iva_bps: number;
  readonly re_bps: number;
  readonly margen_microporcentaje: number;
  readonly margen_descuento_microporcentaje: number | null;
  readonly stock: number;
  readonly stock_min: number;
  readonly stock_max: number;
  readonly lote_optimo: number;
  readonly venta_online: number;
  readonly mostrar_en_web: number;
  readonly descripcion_corta: string | null;
  readonly descripcion: string | null;
  readonly observaciones: string | null;
  readonly mostrar_observaciones_pedidos: number;
  readonly mostrar_observaciones_ventas: number;
  readonly acceso_directo: number | null;
}

interface ArticuloIdDatabaseRow {
  readonly id: number;
}

interface ArticuloCategoriaDatabaseRow {
  readonly id_categoria: number;
}

interface ArticuloCodigoBarrasDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly codigo: string;
  readonly por_defecto: number;
}

interface ArticuloFotoDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly original_name: string | null;
  readonly relative_path: string;
  readonly mime_type: string;
  readonly size_bytes: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly orden: number;
  readonly principal: number;
}

/**
 * Obtiene desde SQLite los datos de gestión de Artículos.
 */
export default class TypeOrmArticulosRepository implements ArticulosRepository {
  /**
   * Crea el repository sobre la base de datos principal.
   */
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Obtiene el detalle completo de un artículo activo.
   */
  async findById(idArticulo: number): Promise<ArticuloRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ArticuloDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          a.id,
          a.public_id,
          a.localizador,
          a.nombre,
          a.id_marca,
          a.id_proveedor,
          a.referencia,
          a.palb_micros,
          a.puc_micros,
          a.pvp_cents,
          a.pvp_descuento_cents,
          a.iva_bps,
          a.re_bps,
          a.margen_microporcentaje,
          a.margen_descuento_microporcentaje,
          a.stock,
          a.stock_min,
          a.stock_max,
          a.lote_optimo,
          a.venta_online,
          a.mostrar_en_web,
          a.descripcion_corta,
          a.descripcion,
          a.observaciones,
          a.mostrar_observaciones_pedidos,
          a.mostrar_observaciones_ventas,
          a.acceso_directo
        FROM articulo a
        WHERE
          a.id = ?
          AND a.deleted_at IS NULL
        LIMIT 1
      `,
      [idArticulo],
    )) as readonly ArticuloDatabaseRow[];

    const row: ArticuloDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      return null;
    }

    const idsCategorias: readonly number[] = await this.findCategoryIds(dataSource, idArticulo);
    const codigosBarras: readonly ArticuloCodigoBarrasRecord[] = await this.findBarcodes(
      dataSource,
      idArticulo,
    );
    const fotos: readonly ArticuloFotoRecord[] = await this.findPhotos(dataSource, idArticulo);

    return this.mapArticulo(row, idsCategorias, codigosBarras, fotos);
  }

  /**
   * Resuelve un localizador, acceso directo o código de barras
   * y devuelve el identificador del artículo activo.
   */
  async resolveIdByCode(codigo: string, codigoNumerico: number | null): Promise<number | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly ArticuloIdDatabaseRow[] =
      codigoNumerico === null
        ? await this.resolveBarcode(dataSource, codigo)
        : await this.resolveNumericCode(dataSource, codigo, codigoNumerico);

    return rows[0]?.id ?? null;
  }

  /**
   * Crea un artículo completo dentro de una única transacción.
   */
  async create(command: ArticuloSaveRecord): Promise<number> {
    if (command.id !== null) {
      throw new Error('No se puede crear un artículo que ya tiene identificador.');
    }

    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<number> => {
        await this.requireActiveReference(
          queryRunner,
          'marca',
          command.idMarca,
          'La marca seleccionada no existe.',
        );

        if (command.idProveedor !== null) {
          await this.requireActiveReference(
            queryRunner,
            'proveedor',
            command.idProveedor,
            'El proveedor seleccionado no existe.',
          );
        }

        for (const idCategoria of new Set<number>(command.idsCategorias)) {
          await this.requireActiveReference(
            queryRunner,
            'categoria',
            idCategoria,
            'Una de las categorías seleccionadas no existe.',
          );
        }

        await this.requireAvailableName(queryRunner, command.nombre);

        const localizador: number = await generateArticuloLocalizador(
          async (candidate: number): Promise<boolean> =>
            this.isCommercialNumericCodeOccupied(queryRunner, candidate, command.accesoDirecto),
        );

        await this.validateAdditionalBarcodes(queryRunner, command, localizador);
        this.validatePhotosForCreate(command.fotos);

        const timestamp: string = new Date().toISOString();
        const slug: string = this.createSlug(command.nombre, localizador);

        await queryRunner.query(
          `
          INSERT INTO articulo (
            public_id,
            localizador,
            nombre,
            slug,
            id_marca,
            id_proveedor,
            referencia,
            palb_micros,
            puc_micros,
            pvp_cents,
            pvp_descuento_cents,
            iva_bps,
            re_bps,
            margen_microporcentaje,
            margen_descuento_microporcentaje,
            stock,
            stock_min,
            stock_max,
            lote_optimo,
            venta_online,
            mostrar_en_web,
            descripcion_corta,
            descripcion,
            observaciones,
            mostrar_observaciones_pedidos,
            mostrar_observaciones_ventas,
            acceso_directo,
            created_at,
            updated_at
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?
          )
        `,
          [
            randomUUID(),
            localizador,
            command.nombre,
            slug,
            command.idMarca,
            command.idProveedor,
            command.referencia,
            command.precioAlbaranMicros,
            command.pucMicros,
            command.pvpCents,
            command.pvpDescuentoCents,
            command.ivaBps,
            command.reBps,
            command.margenMicroporcentaje,
            command.margenDescuentoMicroporcentaje,
            command.stock,
            command.stockMin,
            command.stockMax,
            command.loteOptimo,
            command.ventaOnline ? 1 : 0,
            command.mostrarEnWeb ? 1 : 0,
            command.descripcionCorta,
            command.descripcionLarga,
            command.observaciones,
            command.mostrarObservacionesPedidos ? 1 : 0,
            command.mostrarObservacionesVentas ? 1 : 0,
            command.accesoDirecto,
            timestamp,
            timestamp,
          ],
        );

        const idArticulo: number = await this.readLastInsertedId(queryRunner);

        await this.insertCategories(queryRunner, idArticulo, command.idsCategorias, timestamp);

        await this.insertDefaultBarcode(queryRunner, idArticulo, localizador, timestamp);

        await this.insertAdditionalBarcodes(queryRunner, idArticulo, command, timestamp);

        await this.insertPhotos(queryRunner, idArticulo, command.fotos, timestamp);

        return idArticulo;
      },
    );
  }

  /**
   * Actualiza un artículo completo dentro de una única transacción.
   */
  async update(command: ArticuloSaveRecord): Promise<void> {
    if (command.id === null) {
      throw new Error('No se puede actualizar un artículo sin identificador.');
    }

    const idArticulo: number = command.id;
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      const current: ArticuloUpdateDatabaseRow = await this.requireActiveArticleForUpdate(
        queryRunner,
        idArticulo,
      );

      await this.requireActiveReference(
        queryRunner,
        'marca',
        command.idMarca,
        'La marca seleccionada no existe.',
      );

      if (command.idProveedor !== null) {
        await this.requireActiveReference(
          queryRunner,
          'proveedor',
          command.idProveedor,
          'El proveedor seleccionado no existe.',
        );
      }

      for (const idCategoria of new Set<number>(command.idsCategorias)) {
        await this.requireActiveReference(
          queryRunner,
          'categoria',
          idCategoria,
          'Una de las categorías seleccionadas no existe.',
        );
      }

      await this.requireAvailableNameForUpdate(queryRunner, idArticulo, command.nombre);

      await this.validateAdditionalBarcodesForUpdate(queryRunner, command, current.localizador);

      await this.validatePhotosForUpdate(queryRunner, idArticulo, command.fotos);

      const timestamp: string = new Date().toISOString();

      await this.syncCategories(queryRunner, idArticulo, command.idsCategorias, timestamp);

      await this.syncAdditionalBarcodes(
        queryRunner,
        idArticulo,
        command.codigosBarrasAdicionales,
        timestamp,
      );

      await this.syncPhotos(queryRunner, idArticulo, command.fotos, timestamp);

      await this.requireAvailableAccessCode(queryRunner, idArticulo, command.accesoDirecto);

      const slug: string = this.createSlug(command.nombre, current.localizador);

      await queryRunner.query(
        `
          UPDATE articulo
          SET
            nombre = ?,
            slug = ?,
            id_marca = ?,
            id_proveedor = ?,
            referencia = ?,
            palb_micros = ?,
            puc_micros = ?,
            pvp_cents = ?,
            pvp_descuento_cents = ?,
            iva_bps = ?,
            re_bps = ?,
            margen_microporcentaje = ?,
            margen_descuento_microporcentaje = ?,
            stock = ?,
            stock_min = ?,
            stock_max = ?,
            lote_optimo = ?,
            venta_online = ?,
            mostrar_en_web = ?,
            descripcion_corta = ?,
            descripcion = ?,
            observaciones = ?,
            mostrar_observaciones_pedidos = ?,
            mostrar_observaciones_ventas = ?,
            acceso_directo = ?,
            updated_at = ?
          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [
          command.nombre,
          slug,
          command.idMarca,
          command.idProveedor,
          command.referencia,
          command.precioAlbaranMicros,
          command.pucMicros,
          command.pvpCents,
          command.pvpDescuentoCents,
          command.ivaBps,
          command.reBps,
          command.margenMicroporcentaje,
          command.margenDescuentoMicroporcentaje,
          command.stock,
          command.stockMin,
          command.stockMax,
          command.loteOptimo,
          command.ventaOnline ? 1 : 0,
          command.mostrarEnWeb ? 1 : 0,
          command.descripcionCorta,
          command.descripcionLarga,
          command.observaciones,
          command.mostrarObservacionesPedidos ? 1 : 0,
          command.mostrarObservacionesVentas ? 1 : 0,
          command.accesoDirecto,
          timestamp,
          command.id,
        ],
      );

      await this.ensureDefaultBarcode(queryRunner, idArticulo, current.localizador, timestamp);

      if (current.stock !== command.stock) {
        await this.insertManualStockHistory(queryRunner, command, current.stock, timestamp);
      }
    });
  }

  /**
   * Da de baja un artículo y sus códigos comerciales
   * dentro de una única transacción.
   */
  async deactivate(idArticulo: number): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      await this.requireActiveArticleForUpdate(queryRunner, idArticulo);

      const timestamp: string = new Date().toISOString();

      await queryRunner.query(
        `
          UPDATE codigo_barras
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE
            id_articulo = ?
            AND deleted_at IS NULL
        `,
        [timestamp, timestamp, idArticulo],
      );

      await queryRunner.query(
        `
          UPDATE articulo
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [timestamp, timestamp, idArticulo],
      );
    });
  }

  /**
   * Valida las fotos recibidas al crear un artículo.
   */
  private validatePhotosForCreate(fotos: readonly ArticuloFotoSaveRecord[]): void {
    this.validatePhotoCollection(fotos);

    for (const foto of fotos) {
      if (foto.idArchivo !== null || foto.nuevoArchivo === null) {
        throw new Error(
          'Un artículo nuevo solo puede guardar fotos nuevas preparadas desde staging.',
        );
      }

      this.validateNewArticleImage(foto.nuevoArchivo);
    }
  }

  /**
   * Valida orden, principal y estructura de una colección de fotos.
   */
  private validatePhotoCollection(fotos: readonly ArticuloFotoSaveRecord[]): void {
    let principalCount: number = 0;

    for (const foto of fotos) {
      if (!Number.isSafeInteger(foto.orden) || foto.orden < 0) {
        throw new Error('El orden de una foto no es válido.');
      }

      const hasPersistedFile: boolean = foto.idArchivo !== null;
      const hasNewFile: boolean = foto.nuevoArchivo !== null;

      if (hasPersistedFile === hasNewFile) {
        throw new Error(
          'Cada foto debe referenciar un archivo persistido o un archivo nuevo, pero no ambos.',
        );
      }

      if (foto.principal) {
        principalCount++;
      }
    }

    if (principalCount > 1) {
      throw new Error('Un artículo no puede tener más de una foto principal.');
    }
  }

  /**
   * Comprueba que un archivo nuevo sea una imagen WebP
   * preparada para el almacenamiento de Artículos.
   */
  private validateNewArticleImage(archivo: ArchivoCreateRecord): void {
    if (
      archivo.purpose !== 'article_image' ||
      archivo.mimeType !== 'image/webp' ||
      !archivo.relativePath.startsWith('files/articles/')
    ) {
      throw new Error('La foto nueva no pertenece al almacenamiento de imágenes de Artículos.');
    }
  }

  /**
   * Inserta los archivos y relaciones de las fotos
   * pertenecientes a un artículo nuevo.
   */
  private async insertPhotos(
    queryRunner: QueryRunner,
    idArticulo: number,
    fotos: readonly ArticuloFotoSaveRecord[],
    timestamp: string,
  ): Promise<void> {
    let principalId: number | null = null;

    for (const foto of fotos) {
      if (foto.nuevoArchivo === null) {
        throw new Error('Una foto nueva no contiene los datos de su archivo.');
      }

      const idArchivo: number = await insertArchivo(queryRunner, foto.nuevoArchivo);

      await this.insertArticleImageRelation(
        queryRunner,
        idArticulo,
        idArchivo,
        foto.orden,
        timestamp,
      );

      if (foto.principal) {
        principalId = idArchivo;
      }
    }

    if (principalId !== null) {
      await this.setPrincipalPhoto(queryRunner, idArticulo, principalId, timestamp);
    }
  }

  /**
   * Relaciona una imagen persistida con un artículo.
   */
  private async insertArticleImageRelation(
    queryRunner: QueryRunner,
    idArticulo: number,
    idArchivo: number,
    orden: number,
    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO articulo_archivo (
        id_articulo,
        id_archivo,
        tipo,
        orden,
        principal,
        created_at,
        updated_at
      )
      VALUES (?, ?, 'imagen', ?, 0, ?, ?)
    `,
      [idArticulo, idArchivo, orden, timestamp, timestamp],
    );
  }

  /**
   * Marca una foto como principal del artículo.
   */
  private async setPrincipalPhoto(
    queryRunner: QueryRunner,
    idArticulo: number,
    idArchivo: number,
    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
      UPDATE articulo_archivo
      SET
        principal = 1,
        updated_at = ?
      WHERE
        id_articulo = ?
        AND id_archivo = ?
        AND tipo = 'imagen'
    `,
      [timestamp, idArticulo, idArchivo],
    );
  }

  /**
   * Valida las fotos de un artículo existente
   * y comprueba la propiedad de las persistidas.
   */
  private async validatePhotosForUpdate(
    queryRunner: QueryRunner,
    idArticulo: number,
    fotos: readonly ArticuloFotoSaveRecord[],
  ): Promise<void> {
    this.validatePhotoCollection(fotos);

    const idsArchivo: Set<number> = new Set<number>();

    const publicIds: Set<string> = new Set<string>();

    for (const foto of fotos) {
      if (foto.idArchivo !== null) {
        if (idsArchivo.has(foto.idArchivo)) {
          throw new Error('Hay fotos persistidas repetidas en el artículo.');
        }

        idsArchivo.add(foto.idArchivo);

        await this.requireOwnedArticlePhoto(queryRunner, idArticulo, foto.idArchivo);

        continue;
      }

      if (foto.nuevoArchivo === null) {
        throw new Error('Una foto nueva no contiene los datos de su archivo.');
      }

      this.validateNewArticleImage(foto.nuevoArchivo);

      if (publicIds.has(foto.nuevoArchivo.publicId)) {
        throw new Error('Hay fotos nuevas repetidas en el artículo.');
      }

      publicIds.add(foto.nuevoArchivo.publicId);
    }
  }

  /**
   * Comprueba que una foto persistida pertenezca
   * actualmente al artículo editado.
   */
  private async requireOwnedArticlePhoto(
    queryRunner: QueryRunner,
    idArticulo: number,
    idArchivo: number,
  ): Promise<void> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
        SELECT ar.id
        FROM articulo_archivo aa
        INNER JOIN archivo ar
          ON ar.id = aa.id_archivo
        WHERE
          aa.id_articulo = ?
          AND aa.id_archivo = ?
          AND aa.tipo = 'imagen'
          AND ar.purpose = 'article_image'
          AND ar.deleted_at IS NULL
        LIMIT 1
      `,
      [idArticulo, idArchivo],
    )) as readonly DatabaseIdRow[];

    if (rows.length === 0) {
      throw new Error('Una de las fotos no pertenece al artículo editado.');
    }
  }

  /**
   * Sincroniza las fotos persistidas y nuevas
   * manteniendo orden y foto principal.
   */
  private async syncPhotos(
    queryRunner: QueryRunner,
    idArticulo: number,
    fotos: readonly ArticuloFotoSaveRecord[],
    timestamp: string,
  ): Promise<void> {
    const currentRows: readonly ArticuloArchivoDatabaseRow[] = (await queryRunner.query(
      `
          SELECT id_archivo
          FROM articulo_archivo
          WHERE
            id_articulo = ?
            AND tipo = 'imagen'
        `,
      [idArticulo],
    )) as readonly ArticuloArchivoDatabaseRow[];

    const retainedIds: Set<number> = new Set<number>(
      fotos.flatMap((foto: ArticuloFotoSaveRecord): readonly number[] =>
        foto.idArchivo === null ? [] : [foto.idArchivo],
      ),
    );

    for (const current of currentRows) {
      if (!retainedIds.has(current.id_archivo)) {
        await queryRunner.query(
          `
          DELETE FROM articulo_archivo
          WHERE
            id_articulo = ?
            AND id_archivo = ?
            AND tipo = 'imagen'
        `,
          [idArticulo, current.id_archivo],
        );
      }
    }

    await queryRunner.query(
      `
      UPDATE articulo_archivo
      SET
        principal = 0,
        updated_at = ?
      WHERE
        id_articulo = ?
        AND tipo = 'imagen'
    `,
      [timestamp, idArticulo],
    );

    let principalId: number | null = null;

    for (const foto of fotos) {
      let idArchivo: number;

      if (foto.idArchivo !== null) {
        idArchivo = foto.idArchivo;

        await queryRunner.query(
          `
          UPDATE articulo_archivo
          SET
            orden = ?,
            updated_at = ?
          WHERE
            id_articulo = ?
            AND id_archivo = ?
            AND tipo = 'imagen'
        `,
          [foto.orden, timestamp, idArticulo, idArchivo],
        );
      } else {
        if (foto.nuevoArchivo === null) {
          throw new Error('Una foto nueva no contiene los datos de su archivo.');
        }

        idArchivo = await insertArchivo(queryRunner, foto.nuevoArchivo);

        await this.insertArticleImageRelation(
          queryRunner,
          idArticulo,
          idArchivo,
          foto.orden,
          timestamp,
        );
      }

      if (foto.principal) {
        principalId = idArchivo;
      }
    }

    if (principalId !== null) {
      await this.setPrincipalPhoto(queryRunner, idArticulo, principalId, timestamp);
    }
  }

  /**
   * Obtiene los datos necesarios para editar un artículo activo.
   */
  private async requireActiveArticleForUpdate(
    queryRunner: QueryRunner,
    idArticulo: number,
  ): Promise<ArticuloUpdateDatabaseRow> {
    const rows: readonly ArticuloUpdateDatabaseRow[] = (await queryRunner.query(
      `
      SELECT
        id,
        localizador,
        stock
      FROM articulo
      WHERE
        id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
      [idArticulo],
    )) as readonly ArticuloUpdateDatabaseRow[];

    const article: ArticuloUpdateDatabaseRow | undefined = rows[0];

    if (article === undefined) {
      throw new Error('El artículo que se intenta actualizar no existe.');
    }

    return article;
  }

  /**
   * Comprueba que el nombre no pertenezca a otro artículo activo.
   */
  private async requireAvailableNameForUpdate(
    queryRunner: QueryRunner,
    idArticulo: number,
    nombre: string,
  ): Promise<void> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
      SELECT id
      FROM articulo
      WHERE
        id <> ?
        AND nombre = ? COLLATE NOCASE
        AND deleted_at IS NULL
      LIMIT 1
    `,
      [idArticulo, nombre],
    )) as readonly DatabaseIdRow[];

    if (rows.length > 0) {
      throw new Error('Ya existe otro artículo activo con ese nombre.');
    }
  }

  /**
   * Sincroniza las categorías manteniendo intactas
   * las relaciones que continúan seleccionadas.
   */
  private async syncCategories(
    queryRunner: QueryRunner,
    idArticulo: number,
    idsCategorias: readonly number[],
    timestamp: string,
  ): Promise<void> {
    const currentRows: readonly ArticuloCategoriaDatabaseRow[] = (await queryRunner.query(
      `
        SELECT id_categoria
        FROM articulo_categoria
        WHERE id_articulo = ?
      `,
      [idArticulo],
    )) as readonly ArticuloCategoriaDatabaseRow[];

    const currentIds: Set<number> = new Set<number>(
      currentRows.map((row: ArticuloCategoriaDatabaseRow): number => row.id_categoria),
    );

    const nextIds: Set<number> = new Set<number>(idsCategorias);

    for (const idCategoria of currentIds) {
      if (!nextIds.has(idCategoria)) {
        await queryRunner.query(
          `
          DELETE FROM articulo_categoria
          WHERE
            id_articulo = ?
            AND id_categoria = ?
        `,
          [idArticulo, idCategoria],
        );
      }
    }

    for (const idCategoria of nextIds) {
      if (!currentIds.has(idCategoria)) {
        await queryRunner.query(
          `
          INSERT INTO articulo_categoria (
            id_articulo,
            id_categoria,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?)
        `,
          [idArticulo, idCategoria, timestamp, timestamp],
        );
      }
    }
  }

  /**
   * Valida los códigos adicionales enviados al editar
   * y evita cualquier ambigüedad comercial.
   */
  private async validateAdditionalBarcodesForUpdate(
    queryRunner: QueryRunner,
    command: ArticuloSaveRecord,
    localizador: number,
  ): Promise<void> {
    if (command.id === null) {
      throw new Error('No se pueden validar códigos de una edición sin artículo.');
    }

    const codes: Set<string> = new Set<string>();
    const ids: Set<number> = new Set<number>();

    for (const barcode of command.codigosBarrasAdicionales) {
      const code: string = barcode.codigo.trim();

      if (code.length === 0) {
        throw new Error('Los códigos de barras no pueden estar vacíos.');
      }

      if (codes.has(code)) {
        throw new Error('Hay códigos de barras repetidos en el artículo.');
      }

      codes.add(code);

      if (barcode.id !== null) {
        if (ids.has(barcode.id)) {
          throw new Error('Hay códigos de barras repetidos en el artículo.');
        }

        ids.add(barcode.id);

        await this.requireOwnedAdditionalBarcode(queryRunner, command.id, barcode.id);
      }

      const numericCode: number | null =
        /^\d+$/.test(code) && Number.isSafeInteger(Number(code)) ? Number(code) : null;

      if (numericCode === localizador || numericCode === command.accesoDirecto) {
        throw new Error(
          'Un código de barras no puede coincidir con el localizador o acceso directo.',
        );
      }

      const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
        `
        SELECT cb.id
        FROM codigo_barras cb
        WHERE
          cb.codigo = ?
          AND cb.deleted_at IS NULL
          AND (
            ? IS NULL
            OR cb.id <> ?
          )

        UNION ALL

        SELECT a.id
        FROM articulo a
        WHERE
          a.deleted_at IS NULL
          AND a.id <> ?
          AND ? IS NOT NULL
          AND (
            a.localizador = ?
            OR a.acceso_directo = ?
          )

        LIMIT 1
      `,
        [code, barcode.id, barcode.id, command.id, numericCode, numericCode, numericCode],
      )) as readonly DatabaseIdRow[];

      if (rows.length > 0) {
        throw new Error(`El código "${code}" ya está siendo utilizado.`);
      }
    }
  }

  /**
   * Comprueba que un código persistido sea un código
   * adicional activo del artículo editado.
   */
  private async requireOwnedAdditionalBarcode(
    queryRunner: QueryRunner,
    idArticulo: number,
    idBarcode: number,
  ): Promise<void> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
      SELECT id
      FROM codigo_barras
      WHERE
        id = ?
        AND id_articulo = ?
        AND por_defecto = 0
        AND deleted_at IS NULL
      LIMIT 1
    `,
      [idBarcode, idArticulo],
    )) as readonly DatabaseIdRow[];

    if (rows.length === 0) {
      throw new Error('Uno de los códigos de barras no pertenece al artículo editado.');
    }
  }

  /**
   * Sincroniza códigos adicionales manteniendo los registros
   * existentes y dando de baja lógicamente los eliminados.
   */
  private async syncAdditionalBarcodes(
    queryRunner: QueryRunner,
    idArticulo: number,
    barcodes: ArticuloSaveRecord['codigosBarrasAdicionales'],
    timestamp: string,
  ): Promise<void> {
    const currentRows: readonly ArticuloAdditionalBarcodeDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          id,
          codigo
        FROM codigo_barras
        WHERE
          id_articulo = ?
          AND por_defecto = 0
          AND deleted_at IS NULL
      `,
      [idArticulo],
    )) as readonly ArticuloAdditionalBarcodeDatabaseRow[];

    const retainedIds: Set<number> = new Set<number>(
      barcodes.flatMap((barcode): readonly number[] => (barcode.id === null ? [] : [barcode.id])),
    );

    for (const current of currentRows) {
      if (!retainedIds.has(current.id)) {
        await queryRunner.query(
          `
          UPDATE codigo_barras
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE id = ?
        `,
          [timestamp, timestamp, current.id],
        );
      }
    }

    for (const barcode of barcodes) {
      const code: string = barcode.codigo.trim();

      if (barcode.id === null) {
        await queryRunner.query(
          `
          INSERT INTO codigo_barras (
            public_id,
            id_articulo,
            codigo,
            por_defecto,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, 0, ?, ?)
        `,
          [randomUUID(), idArticulo, code, timestamp, timestamp],
        );

        continue;
      }

      await queryRunner.query(
        `
        UPDATE codigo_barras
        SET
          codigo = ?,
          updated_at = ?
        WHERE id = ?
      `,
        [code, timestamp, barcode.id],
      );
    }
  }

  /**
   * Comprueba que el acceso directo no entre en conflicto
   * con códigos comerciales que seguirán activos.
   */
  private async requireAvailableAccessCode(
    queryRunner: QueryRunner,
    idArticulo: number,
    accesoDirecto: number | null,
  ): Promise<void> {
    if (accesoDirecto === null) {
      return;
    }

    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
      SELECT a.id
      FROM articulo a
      WHERE
        a.id <> ?
        AND a.deleted_at IS NULL
        AND (
          a.localizador = ?
          OR a.acceso_directo = ?
        )

      UNION ALL

      SELECT cb.id
      FROM codigo_barras cb
      WHERE
        cb.deleted_at IS NULL
        AND cb.codigo NOT GLOB '*[^0-9]*'
        AND CAST(cb.codigo AS INTEGER) = ?

      LIMIT 1
    `,
      [idArticulo, accesoDirecto, accesoDirecto, accesoDirecto],
    )) as readonly DatabaseIdRow[];

    if (rows.length > 0) {
      throw new Error('El acceso directo ya está siendo utilizado como código de otro artículo.');
    }
  }

  /**
   * Garantiza que exista un único código por defecto activo
   * y que siga correspondiendo al localizador del artículo.
   */
  private async ensureDefaultBarcode(
    queryRunner: QueryRunner,
    idArticulo: number,
    localizador: number,
    timestamp: string,
  ): Promise<void> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
      SELECT id
      FROM codigo_barras
      WHERE
        id_articulo = ?
        AND por_defecto = 1
        AND deleted_at IS NULL
      LIMIT 1
    `,
      [idArticulo],
    )) as readonly DatabaseIdRow[];

    const existingId: number | undefined = rows[0]?.id;

    if (existingId === undefined) {
      await this.insertDefaultBarcode(queryRunner, idArticulo, localizador, timestamp);

      return;
    }

    await queryRunner.query(
      `
      UPDATE codigo_barras
      SET
        codigo = ?,
        updated_at = ?
      WHERE id = ?
    `,
      [String(localizador), timestamp, existingId],
    );
  }

  /**
   * Registra en el histórico una modificación manual
   * del stock realizada desde la ficha de Artículos.
   */
  private async insertManualStockHistory(
    queryRunner: QueryRunner,
    command: ArticuloSaveRecord,
    previousStock: number,
    timestamp: string,
  ): Promise<void> {
    if (command.id === null) {
      throw new Error('No se puede registrar stock de un artículo sin id.');
    }

    const pvpMicros: number = (command.pvpCents * UNIT_PRICE_SCALE) / MONEY_SCALE;

    await queryRunner.query(
      `
      INSERT INTO historico_articulo (
        public_id,
        id_articulo,
        tipo,
        stock_previo,
        diferencia,
        stock_final,
        puc_micros,
        pvp_micros,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        randomUUID(),
        command.id,
        HISTORICO_ARTICULO_TIPO.ARTICULO,
        previousStock,
        command.stock - previousStock,
        command.stock,
        command.pucMicros,
        pvpMicros,
        timestamp,
        timestamp,
      ],
    );
  }

  /**
   * Obtiene las categorías relacionadas con un artículo.
   */
  private async findCategoryIds(
    dataSource: DataSource,
    idArticulo: number,
  ): Promise<readonly number[]> {
    const rows: readonly ArticuloCategoriaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          ac.id_categoria
        FROM articulo_categoria ac
        WHERE ac.id_articulo = ?
        ORDER BY ac.id_categoria
      `,
      [idArticulo],
    )) as readonly ArticuloCategoriaDatabaseRow[];

    return rows.map((row: ArticuloCategoriaDatabaseRow): number => row.id_categoria);
  }

  /**
   * Obtiene los códigos de barras activos de un artículo.
   */
  private async findBarcodes(
    dataSource: DataSource,
    idArticulo: number,
  ): Promise<readonly ArticuloCodigoBarrasRecord[]> {
    const rows: readonly ArticuloCodigoBarrasDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          cb.id,
          cb.public_id,
          cb.codigo,
          cb.por_defecto
        FROM codigo_barras cb
        WHERE
          cb.id_articulo = ?
          AND cb.deleted_at IS NULL
        ORDER BY
          cb.por_defecto DESC,
          cb.id
      `,
      [idArticulo],
    )) as readonly ArticuloCodigoBarrasDatabaseRow[];

    return rows.map((row: ArticuloCodigoBarrasDatabaseRow): ArticuloCodigoBarrasRecord => ({
      id: row.id,
      publicId: row.public_id,
      codigo: row.codigo,
      porDefecto: row.por_defecto === 1,
    }));
  }

  /**
   * Obtiene las imágenes activas relacionadas con un artículo.
   */
  private async findPhotos(
    dataSource: DataSource,
    idArticulo: number,
  ): Promise<readonly ArticuloFotoRecord[]> {
    const rows: readonly ArticuloFotoDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          ar.id,
          ar.public_id,
          ar.original_name,
          ar.relative_path,
          ar.mime_type,
          ar.size_bytes,
          ar.width,
          ar.height,
          aa.orden,
          aa.principal
        FROM articulo_archivo aa
        INNER JOIN archivo ar
          ON ar.id = aa.id_archivo
        WHERE
          aa.id_articulo = ?
          AND aa.tipo = 'imagen'
          AND ar.deleted_at IS NULL
        ORDER BY
          aa.orden,
          ar.id
      `,
      [idArticulo],
    )) as readonly ArticuloFotoDatabaseRow[];

    return rows.map((row: ArticuloFotoDatabaseRow): ArticuloFotoRecord => ({
      id: row.id,
      publicId: row.public_id,
      originalName: row.original_name,
      relativePath: row.relative_path,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      width: row.width,
      height: row.height,
      orden: row.orden,
      principal: row.principal === 1,
    }));
  }

  /**
   * Resuelve un código numérico priorizando acceso directo,
   * localizador y finalmente código de barras.
   */
  private async resolveNumericCode(
    dataSource: DataSource,
    codigo: string,
    codigoNumerico: number,
  ): Promise<readonly ArticuloIdDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          a.id
        FROM articulo a
        WHERE
          a.deleted_at IS NULL
          AND (
            a.acceso_directo = ?
            OR a.localizador = ?
            OR EXISTS (
              SELECT 1
              FROM codigo_barras cb
              WHERE
                cb.id_articulo = a.id
                AND cb.codigo = ?
                AND cb.deleted_at IS NULL
            )
          )
        ORDER BY
          CASE
            WHEN a.acceso_directo = ? THEN 0
            WHEN a.localizador = ? THEN 1
            ELSE 2
          END,
          a.id
        LIMIT 1
      `,
      [codigoNumerico, codigoNumerico, codigo, codigoNumerico, codigoNumerico],
    )) as readonly ArticuloIdDatabaseRow[];
  }

  /**
   * Resuelve un código no numérico exclusivamente como código de barras.
   */
  private async resolveBarcode(
    dataSource: DataSource,
    codigo: string,
  ): Promise<readonly ArticuloIdDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          a.id
        FROM articulo a
        WHERE
          a.deleted_at IS NULL
          AND EXISTS (
            SELECT 1
            FROM codigo_barras cb
            WHERE
              cb.id_articulo = a.id
              AND cb.codigo = ?
              AND cb.deleted_at IS NULL
          )
        ORDER BY a.id
        LIMIT 1
      `,
      [codigo],
    )) as readonly ArticuloIdDatabaseRow[];
  }

  /**
   * Comprueba que una referencia seleccionada exista y esté activa.
   */
  private async requireActiveReference(
    queryRunner: QueryRunner,
    tableName: 'marca' | 'proveedor' | 'categoria',
    id: number,
    errorMessage: string,
  ): Promise<void> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
      SELECT id
      FROM ${tableName}
      WHERE
        id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
      [id],
    )) as readonly DatabaseIdRow[];

    if (rows.length === 0) {
      throw new Error(errorMessage);
    }
  }

  /**
   * Comprueba que el nombre no pertenezca ya a otro artículo activo.
   */
  private async requireAvailableName(queryRunner: QueryRunner, nombre: string): Promise<void> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
      SELECT id
      FROM articulo
      WHERE
        nombre = ? COLLATE NOCASE
        AND deleted_at IS NULL
      LIMIT 1
    `,
      [nombre],
    )) as readonly DatabaseIdRow[];

    if (rows.length > 0) {
      throw new Error('Ya existe un artículo activo con ese nombre.');
    }
  }

  /**
   * Comprueba si un número ya pertenece al espacio de códigos
   * comerciales de algún artículo activo.
   */
  private async isCommercialNumericCodeOccupied(
    queryRunner: QueryRunner,
    codigo: number,
    reservedAccessCode: number | null,
  ): Promise<boolean> {
    if (reservedAccessCode === codigo) {
      return true;
    }

    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
      SELECT a.id
      FROM articulo a
      WHERE
        a.deleted_at IS NULL
        AND (
          a.localizador = ?
          OR a.acceso_directo = ?
        )

      UNION ALL

      SELECT cb.id
      FROM codigo_barras cb
      WHERE
        cb.deleted_at IS NULL
        AND cb.codigo NOT GLOB '*[^0-9]*'
        AND CAST(cb.codigo AS INTEGER) = ?

      LIMIT 1
    `,
      [codigo, codigo, codigo],
    )) as readonly DatabaseIdRow[];

    return rows.length > 0;
  }

  /**
   * Valida que los códigos adicionales no generen
   * identificadores ambiguos en la aplicación.
   */
  private async validateAdditionalBarcodes(
    queryRunner: QueryRunner,
    command: ArticuloSaveRecord,
    localizador: number,
  ): Promise<void> {
    const codes: Set<string> = new Set<string>();

    for (const barcode of command.codigosBarrasAdicionales) {
      if (barcode.id !== null) {
        throw new Error('Un artículo nuevo no puede reutilizar códigos de barras persistidos.');
      }

      const code: string = barcode.codigo.trim();

      if (code.length === 0) {
        throw new Error('Los códigos de barras no pueden estar vacíos.');
      }

      if (codes.has(code)) {
        throw new Error('Hay códigos de barras repetidos en el artículo.');
      }

      codes.add(code);

      const numericCode: number | null =
        /^\d+$/.test(code) && Number.isSafeInteger(Number(code)) ? Number(code) : null;

      if (numericCode === localizador || numericCode === command.accesoDirecto) {
        throw new Error(
          'Un código de barras no puede coincidir con el localizador o acceso directo.',
        );
      }

      const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
        `
        SELECT cb.id
        FROM codigo_barras cb
        WHERE
          cb.codigo = ?
          AND cb.deleted_at IS NULL

        UNION ALL

        SELECT a.id
        FROM articulo a
        WHERE
          a.deleted_at IS NULL
          AND ? IS NOT NULL
          AND (
            a.localizador = ?
            OR a.acceso_directo = ?
          )

        LIMIT 1
      `,
        [code, numericCode, numericCode, numericCode],
      )) as readonly DatabaseIdRow[];

      if (rows.length > 0) {
        throw new Error(`El código "${code}" ya está siendo utilizado.`);
      }
    }
  }

  /**
   * Inserta las categorías seleccionadas del artículo.
   */
  private async insertCategories(
    queryRunner: QueryRunner,
    idArticulo: number,
    idsCategorias: readonly number[],
    timestamp: string,
  ): Promise<void> {
    for (const idCategoria of new Set<number>(idsCategorias)) {
      await queryRunner.query(
        `
        INSERT INTO articulo_categoria (
          id_articulo,
          id_categoria,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?)
      `,
        [idArticulo, idCategoria, timestamp, timestamp],
      );
    }
  }

  /**
   * Crea el código obligatorio derivado del localizador.
   */
  private async insertDefaultBarcode(
    queryRunner: QueryRunner,
    idArticulo: number,
    localizador: number,
    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO codigo_barras (
        public_id,
        id_articulo,
        codigo,
        por_defecto,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 1, ?, ?)
    `,
      [randomUUID(), idArticulo, String(localizador), timestamp, timestamp],
    );
  }

  /**
   * Inserta los códigos adicionales de un artículo nuevo.
   */
  private async insertAdditionalBarcodes(
    queryRunner: QueryRunner,
    idArticulo: number,
    command: ArticuloSaveRecord,
    timestamp: string,
  ): Promise<void> {
    for (const barcode of command.codigosBarrasAdicionales) {
      await queryRunner.query(
        `
        INSERT INTO codigo_barras (
          public_id,
          id_articulo,
          codigo,
          por_defecto,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, 0, ?, ?)
      `,
        [randomUUID(), idArticulo, barcode.codigo.trim(), timestamp, timestamp],
      );
    }
  }

  /**
   * Obtiene el id autoincremental insertado en la conexión actual.
   */
  private async readLastInsertedId(queryRunner: QueryRunner): Promise<number> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
      SELECT last_insert_rowid() AS id
    `,
    )) as readonly DatabaseIdRow[];

    const id: number | undefined = rows[0]?.id;

    if (id === undefined) {
      throw new Error('No se ha podido obtener el id del nuevo artículo.');
    }

    return id;
  }

  /**
   * Genera el slug interno del artículo.
   */
  private createSlug(nombre: string, localizador: number): string {
    const normalizedName: string = nombre
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLocaleLowerCase('es-ES')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 190);

    const baseSlug: string = normalizedName.length > 0 ? normalizedName : 'articulo';

    return `${baseSlug}-${localizador}`;
  }

  /**
   * Convierte las filas SQLite en el record completo de Artículos.
   */
  private mapArticulo(
    row: ArticuloDatabaseRow,
    idsCategorias: readonly number[],
    codigosBarras: readonly ArticuloCodigoBarrasRecord[],
    fotos: readonly ArticuloFotoRecord[],
  ): ArticuloRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      localizador: row.localizador,
      nombre: row.nombre,
      idMarca: row.id_marca,
      idProveedor: row.id_proveedor,
      idsCategorias,
      referencia: row.referencia,
      precioAlbaranMicros: row.palb_micros,
      pucMicros: row.puc_micros,
      pvpCents: row.pvp_cents,
      pvpDescuentoCents: row.pvp_descuento_cents,
      ivaBps: row.iva_bps,
      reBps: row.re_bps,
      margenMicroporcentaje: row.margen_microporcentaje,
      margenDescuentoMicroporcentaje: row.margen_descuento_microporcentaje,
      stock: row.stock,
      stockMin: row.stock_min,
      stockMax: row.stock_max,
      loteOptimo: row.lote_optimo,
      ventaOnline: row.venta_online === 1,
      mostrarEnWeb: row.mostrar_en_web === 1,
      descripcionCorta: row.descripcion_corta,
      descripcionLarga: row.descripcion,
      observaciones: row.observaciones,
      mostrarObservacionesPedidos: row.mostrar_observaciones_pedidos === 1,
      mostrarObservacionesVentas: row.mostrar_observaciones_ventas === 1,
      accesoDirecto: row.acceso_directo,
      codigosBarras,
      fotos,
    };
  }
}
