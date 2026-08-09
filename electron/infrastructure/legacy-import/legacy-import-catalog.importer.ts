import type LegacyImportCatalogNormalizer from '@backend/contracts/legacy-import/legacy-import-catalog-normalizer.interface';
import type LegacyImportCatalogReader from '@backend/contracts/legacy-import/legacy-import-catalog-reader.interface';
import type LegacyImportCatalogValidator from '@backend/contracts/legacy-import/legacy-import-catalog-validator.interface';
import type LegacyImportPhaseImporter from '@backend/contracts/legacy-import/legacy-import-phase-importer.interface';
import type LegacyImportProgressListener from '@backend/contracts/legacy-import/legacy-import-progress-listener.type';
import type LegacyImportCatalogSnapshot from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportNormalizedCatalog from '@backend/domain/legacy-import/legacy-import-normalized-catalog';
import type {
  LegacyImportCatalogNormalizationContext,
  LegacyImportNormalizedArticle,
  LegacyImportNormalizedBarcode,
  LegacyImportNormalizedExpiration,
  LegacyImportNormalizedTag,
} from '@backend/domain/legacy-import/legacy-import-normalized-catalog';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import type { QueryRunner } from 'typeorm';

type ReferenceTable = 'categoria' | 'marca' | 'proveedor';

interface IdRow {
  readonly id: number;
}

interface MaximumIdRow {
  readonly maximumId: number;
}

export default class LegacyImportCatalogImporter implements LegacyImportPhaseImporter {
  constructor(
    private readonly catalogReader: LegacyImportCatalogReader,
    private readonly catalogValidator: LegacyImportCatalogValidator,
    private readonly catalogNormalizer: LegacyImportCatalogNormalizer,
    private readonly publicIdFactory: LegacyImportPublicIdFactory,
  ) {}

  async import(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
  ): Promise<LegacyImportPhaseResult> {
    this.reportProgress(
      command,
      progressListener,
      'reading-catalog',
      70,
      'Leyendo artículos, códigos de barras y etiquetas…',
    );

    const snapshot: LegacyImportCatalogSnapshot = await this.catalogReader.read(
      command.packagePath,
      command.expectedTableRows,
    );

    this.reportProgress(
      command,
      progressListener,
      'validating-catalog',
      74,
      'Validando las relaciones del catálogo…',
    );

    this.catalogValidator.validate(snapshot);

    await queryRunner.startTransaction();

    try {
      const categoryIds: ReadonlySet<number> = await this.readIdSet(queryRunner, 'categoria');

      const brandIds: Set<number> = await this.readIdSet(queryRunner, 'marca');

      const providerIds: ReadonlySet<number> = await this.readIdSet(queryRunner, 'proveedor');

      const fallbackBrandId: number | null = await this.resolveFallbackBrandId(
        queryRunner,
        snapshot,
        brandIds,
        command,
      );

      if (fallbackBrandId !== null) {
        brandIds.add(fallbackBrandId);
      }

      this.reportProgress(
        command,
        progressListener,
        'normalizing-catalog',
        78,
        'Aplicando reparaciones y decisiones del análisis…',
      );

      const normalizationContext: LegacyImportCatalogNormalizationContext = {
        sourceHash: command.sourceHash,
        startedAt: command.startedAt,
        categoryIds,
        brandIds,
        providerIds,
        fallbackBrandId,
      };

      const normalizedCatalog: LegacyImportNormalizedCatalog = this.catalogNormalizer.normalize(
        snapshot,
        command.reviewDecisions,
        normalizationContext,
      );

      this.reportProgress(
        command,
        progressListener,
        'importing-articles',
        81,
        'Importando artículos…',
      );

      await this.insertArticles(queryRunner, normalizedCatalog.articles);

      this.reportProgress(
        command,
        progressListener,
        'importing-barcodes',
        84,
        'Importando códigos de barras…',
      );

      await this.insertBarcodes(queryRunner, normalizedCatalog.barcodes);

      this.reportProgress(
        command,
        progressListener,
        'importing-tags',
        87,
        'Importando etiquetas y relaciones…',
      );

      await this.insertTags(queryRunner, 'etiqueta', normalizedCatalog.tags);

      await this.insertTags(queryRunner, 'etiqueta_web', normalizedCatalog.webTags);

      await this.insertArticleTags(queryRunner, normalizedCatalog);

      this.reportProgress(
        command,
        progressListener,
        'importing-expirations',
        90,
        'Importando el histórico de caducidades…',
      );

      await this.insertExpirations(queryRunner, normalizedCatalog.expirations);

      await queryRunner.commitTransaction();

      return {
        importedRows:
          normalizedCatalog.articles.length +
          normalizedCatalog.barcodes.length +
          normalizedCatalog.tags.length +
          normalizedCatalog.webTags.length +
          normalizedCatalog.articleTags.length +
          normalizedCatalog.articleWebTags.length +
          normalizedCatalog.expirations.length,
        skippedRows: normalizedCatalog.skippedRows,
        warningCount: normalizedCatalog.warningCount,
      };
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw new Error('No se ha podido importar el catálogo legacy.', {
        cause: error,
      });
    }
  }

  private async insertArticles(
    queryRunner: QueryRunner,

    articles: readonly LegacyImportNormalizedArticle[],
  ): Promise<void> {
    for (const article of articles) {
      await queryRunner.query(
        `
          INSERT INTO articulo (
            id,
            public_id,
            localizador,
            nombre,
            slug,
            id_categoria,
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
            fecha_caducidad,
            mostrar_en_web,
            descripcion_corta,
            descripcion,
            observaciones,
            mostrar_observaciones_pedidos,
            mostrar_observaciones_ventas,
            acceso_directo,
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
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          article.id,
          article.publicId,
          article.locator,
          article.name,
          article.slug,
          article.categoryId,
          article.brandId,
          article.providerId,
          article.reference,
          article.deliveryPriceMicros,
          article.purchasePriceMicros,
          article.salePriceCents,
          article.discountedSalePriceCents,
          article.taxRateBps,
          article.equivalenceSurchargeBps,
          article.marginMicropercentage,
          article.discountedMarginMicropercentage,
          article.stock,
          article.minimumStock,
          article.maximumStock,
          article.optimalLot,
          article.onlineSale ? 1 : 0,
          article.expirationDate,
          article.visibleOnline ? 1 : 0,
          article.shortDescription,
          article.description,
          article.notes,
          article.showNotesInOrders ? 1 : 0,
          article.showNotesInSales ? 1 : 0,
          article.directAccess,
          article.createdAt,
          article.updatedAt,
          article.deletedAt,
        ],
      );
    }
  }

  private async insertBarcodes(
    queryRunner: QueryRunner,
    barcodes: readonly LegacyImportNormalizedBarcode[],
  ): Promise<void> {
    for (const barcode of barcodes) {
      await queryRunner.query(
        `
          INSERT INTO codigo_barras (
            id,
            public_id,
            id_articulo,
            codigo,
            por_defecto,
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
            ?,
            ?,
            ?
          )
        `,
        [
          barcode.id,
          barcode.publicId,
          barcode.articleId,
          barcode.code,
          barcode.default ? 1 : 0,
          barcode.createdAt,
          barcode.updatedAt,
          barcode.deletedAt,
        ],
      );
    }
  }

  private async insertTags(
    queryRunner: QueryRunner,
    tableName: 'etiqueta' | 'etiqueta_web',
    tags: readonly LegacyImportNormalizedTag[],
  ): Promise<void> {
    for (const tag of tags) {
      await queryRunner.query(
        `
          INSERT INTO ${tableName} (
            id,
            public_id,
            texto,
            slug,
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
            ?,
            NULL
          )
        `,
        [tag.id, tag.publicId, tag.text, tag.slug, tag.createdAt, tag.updatedAt],
      );
    }
  }

  private async insertArticleTags(
    queryRunner: QueryRunner,

    catalog: LegacyImportNormalizedCatalog,
  ): Promise<void> {
    for (const relation of catalog.articleTags) {
      await queryRunner.query(
        `
          INSERT INTO articulo_etiqueta (
            id_articulo,
            id_etiqueta,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?
          )
        `,
        [relation.articleId, relation.tagId, relation.createdAt, relation.updatedAt],
      );
    }

    for (const relation of catalog.articleWebTags) {
      await queryRunner.query(
        `
          INSERT INTO articulo_etiqueta_web (
            id_articulo,
            id_etiqueta_web,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?
          )
        `,
        [relation.articleId, relation.tagId, relation.createdAt, relation.updatedAt],
      );
    }
  }

  private async insertExpirations(
    queryRunner: QueryRunner,

    expirations: readonly LegacyImportNormalizedExpiration[],
  ): Promise<void> {
    for (const expiration of expirations) {
      await queryRunner.query(
        `
          INSERT INTO merma_caducidad (
            id,
            public_id,
            id_articulo,
            unidades,
            puc_micros,
            pvp_cents,
            fecha_baja,
            observaciones,
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
            ?,
            ?,
            NULL,
            ?,
            ?,
            NULL
          )
        `,
        [
          expiration.id,
          expiration.publicId,
          expiration.articleId,
          expiration.units,
          expiration.purchasePriceMicros,
          expiration.salePriceCents,
          expiration.removalDate,
          expiration.createdAt,
          expiration.updatedAt,
        ],
      );
    }
  }

  private async readIdSet(
    queryRunner: QueryRunner,
    tableName: ReferenceTable,
  ): Promise<Set<number>> {
    const rows: readonly IdRow[] = (await queryRunner.query(
      `
            SELECT
              id
            FROM ${tableName}
          `,
    )) as readonly IdRow[];

    return new Set<number>(rows.map((row: IdRow): number => row.id));
  }

  private async resolveFallbackBrandId(
    queryRunner: QueryRunner,
    snapshot: LegacyImportCatalogSnapshot,
    brandIds: ReadonlySet<number>,
    command: LegacyImportExecutionCommand,
  ): Promise<number | null> {
    const requiresFallbackBrand: boolean = snapshot.articles.some(
      (article): boolean => !brandIds.has(article.brandId),
    );

    if (!requiresFallbackBrand) {
      return null;
    }

    const existingRows: readonly IdRow[] = (await queryRunner.query(
      `
            SELECT
              id
            FROM marca
            WHERE
              nombre = ?
                COLLATE NOCASE
              AND deleted_at IS NULL
            ORDER BY
              id
            LIMIT 1
          `,
      ['Sin marca'],
    )) as readonly IdRow[];

    const existingId: number | undefined = existingRows[0]?.id;

    if (existingId !== undefined) {
      return existingId;
    }

    const maximumRows: readonly MaximumIdRow[] = (await queryRunner.query(
      `
            SELECT
              COALESCE(
                MAX(id),
                0
              ) AS maximumId
            FROM marca
          `,
    )) as readonly MaximumIdRow[];

    const fallbackBrandId: number = (maximumRows[0]?.maximumId ?? 0) + 1;

    await queryRunner.query(
      `
        INSERT INTO marca (
          id,
          public_id,
          id_archivo,
          nombre,
          direccion,
          telefono,
          email,
          web,
          observaciones,
          created_at,
          updated_at,
          deleted_at
        )
        VALUES (
          ?,
          ?,
          NULL,
          'Sin marca',
          NULL,
          NULL,
          NULL,
          NULL,
          'Marca creada automáticamente durante la importación legacy.',
          ?,
          ?,
          NULL
        )
      `,
      [
        fallbackBrandId,

        this.publicIdFactory.create(command.sourceHash, 'marca-sin-marca', 0),

        command.startedAt,
        command.startedAt,
      ],
    );

    return fallbackBrandId;
  }

  private reportProgress(
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
    stage: Parameters<LegacyImportProgressListener>[0]['stage'],
    percentage: number,
    message: string,
  ): void {
    progressListener({
      selectionId: command.selectionId,
      stage,
      percentage,
      message,
    });
  }
}
