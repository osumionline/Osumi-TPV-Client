import type LegacyImportCatalogReader from '@backend/contracts/legacy-import-catalog-reader.interface';
import type LegacyImportDumpReader from '@backend/contracts/legacy-import-dump-reader.interface';
import type LegacyImportCatalogSnapshot from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';
import type {
  LegacyCatalogArticle,
  LegacyCatalogArticlePhoto,
  LegacyCatalogArticleTag,
  LegacyCatalogArticleWebTag,
  LegacyCatalogBarcode,
  LegacyCatalogExpiration,
  LegacyCatalogPhoto,
  LegacyCatalogTag,
} from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';
import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';
import LegacySqlValueReader from '@infrastructure/legacy-import/legacy-sql-value.reader';

const CATALOG_TABLES: readonly string[] = [
  'articulo',
  'codigo_barras',
  'etiqueta',
  'etiqueta_web',
  'articulo_etiqueta',
  'articulo_etiqueta_web',
  'foto',
  'articulo_foto',
  'caducidad',
];

interface MutableCatalogSnapshot {
  readonly articles: LegacyCatalogArticle[];

  readonly barcodes: LegacyCatalogBarcode[];

  readonly tags: LegacyCatalogTag[];

  readonly webTags: LegacyCatalogTag[];

  readonly articleTags: LegacyCatalogArticleTag[];

  readonly articleWebTags: LegacyCatalogArticleWebTag[];

  readonly photos: LegacyCatalogPhoto[];

  readonly articlePhotos: LegacyCatalogArticlePhoto[];

  readonly expirations: LegacyCatalogExpiration[];
}

export default class DefaultLegacyImportCatalogReader implements LegacyImportCatalogReader {
  constructor(
    private readonly dumpReader: LegacyImportDumpReader,

    private readonly valueReader: LegacySqlValueReader,
  ) {}

  async read(
    packagePath: string,

    expectedTableRows: Readonly<Record<string, number>>,
  ): Promise<LegacyImportCatalogSnapshot> {
    const snapshot: MutableCatalogSnapshot = this.createSnapshot();

    await this.dumpReader.read(
      packagePath,
      expectedTableRows,
      CATALOG_TABLES,

      (insert: LegacySqlInsert): void => {
        this.collectInsert(insert, snapshot);
      },
    );

    const sourceRows: number =
      snapshot.articles.length +
      snapshot.barcodes.length +
      snapshot.tags.length +
      snapshot.webTags.length +
      snapshot.articleTags.length +
      snapshot.articleWebTags.length +
      snapshot.photos.length +
      snapshot.articlePhotos.length +
      snapshot.expirations.length;

    return {
      articles: snapshot.articles,
      barcodes: snapshot.barcodes,
      tags: snapshot.tags,
      webTags: snapshot.webTags,
      articleTags: snapshot.articleTags,
      articleWebTags: snapshot.articleWebTags,
      photos: snapshot.photos,
      articlePhotos: snapshot.articlePhotos,
      expirations: snapshot.expirations,
      sourceRows,
    };
  }

  private createSnapshot(): MutableCatalogSnapshot {
    return {
      articles: [],
      barcodes: [],
      tags: [],
      webTags: [],
      articleTags: [],
      articleWebTags: [],
      photos: [],
      articlePhotos: [],
      expirations: [],
    };
  }

  private collectInsert(
    insert: LegacySqlInsert,

    snapshot: MutableCatalogSnapshot,
  ): void {
    switch (insert.tableName) {
      case 'articulo':
        snapshot.articles.push(this.readArticle(insert));

        return;

      case 'codigo_barras':
        snapshot.barcodes.push(this.readBarcode(insert));

        return;

      case 'etiqueta':
        snapshot.tags.push(this.readTag(insert));

        return;

      case 'etiqueta_web':
        snapshot.webTags.push(this.readTag(insert));

        return;

      case 'articulo_etiqueta':
        snapshot.articleTags.push(this.readArticleTag(insert));

        return;

      case 'articulo_etiqueta_web':
        snapshot.articleWebTags.push(this.readArticleWebTag(insert));

        return;

      case 'foto':
        snapshot.photos.push(this.readPhoto(insert));

        return;

      case 'articulo_foto':
        snapshot.articlePhotos.push(this.readArticlePhoto(insert));

        return;

      case 'caducidad':
        snapshot.expirations.push(this.readExpiration(insert));

        return;
    }
  }

  private readArticle(insert: LegacySqlInsert): LegacyCatalogArticle {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      locator: this.valueReader.getRequiredInteger(insert, 'localizador'),
      name: this.valueReader.getRequiredText(insert, 'nombre'),
      slug: this.valueReader.getRequiredText(insert, 'slug'),
      categoryId: this.valueReader.getOptionalInteger(insert, 'id_categoria'),
      brandId: this.valueReader.getRequiredInteger(insert, 'id_marca'),
      providerId: this.valueReader.getOptionalInteger(insert, 'id_proveedor'),
      reference: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'referencia')),
      deliveryPrice: this.valueReader.getRequiredNumber(insert, 'palb'),
      purchasePrice: this.valueReader.getRequiredNumber(insert, 'puc'),
      salePrice: this.valueReader.getRequiredNumber(insert, 'pvp'),
      discountedSalePrice: this.valueReader.getOptionalNumber(insert, 'pvp_descuento'),
      taxRate: this.valueReader.getRequiredNumber(insert, 'iva'),
      equivalenceSurcharge: this.valueReader.getRequiredNumber(insert, 're'),
      margin: this.valueReader.getRequiredNumber(insert, 'margen'),
      discountedMargin: this.valueReader.getOptionalNumber(insert, 'margen_descuento'),
      stock: this.valueReader.getRequiredInteger(insert, 'stock'),
      minimumStock: this.valueReader.getRequiredInteger(insert, 'stock_min'),
      maximumStock: this.valueReader.getRequiredInteger(insert, 'stock_max'),
      optimalLot: this.valueReader.getRequiredInteger(insert, 'lote_optimo'),
      onlineSale: this.valueReader.getRequiredBoolean(insert, 'venta_online'),
      expirationDate: this.valueReader.getOptionalText(insert, 'fecha_caducidad'),
      visibleOnline: this.valueReader.getRequiredBoolean(insert, 'mostrar_en_web'),
      shortDescription: this.normalizeOptionalText(
        this.valueReader.getOptionalText(insert, 'desc_corta'),
      ),
      description: this.normalizeOptionalText(
        this.valueReader.getOptionalText(insert, 'descripcion'),
      ),
      notes: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'observaciones')),
      showNotesInOrders: this.valueReader.getRequiredBoolean(insert, 'mostrar_obs_pedidos'),
      showNotesInSales: this.valueReader.getRequiredBoolean(insert, 'mostrar_obs_ventas'),
      directAccess: this.valueReader.getOptionalInteger(insert, 'acceso_directo'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
      deletedAt: this.valueReader.getOptionalText(insert, 'deleted_at'),
    };
  }

  private readBarcode(insert: LegacySqlInsert): LegacyCatalogBarcode {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      articleId: this.valueReader.getRequiredInteger(insert, 'id_articulo'),
      code: this.valueReader.getRequiredText(insert, 'codigo_barras'),
      default: this.valueReader.getRequiredBoolean(insert, 'por_defecto'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readTag(insert: LegacySqlInsert): LegacyCatalogTag {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      text: this.valueReader.getRequiredText(insert, 'texto'),
      slug: this.valueReader.getRequiredText(insert, 'slug'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readArticleTag(insert: LegacySqlInsert): LegacyCatalogArticleTag {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      articleId: this.valueReader.getRequiredInteger(insert, 'id_articulo'),
      tagId: this.valueReader.getRequiredInteger(insert, 'id_etiqueta'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readArticleWebTag(insert: LegacySqlInsert): LegacyCatalogArticleWebTag {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      articleId: this.valueReader.getRequiredInteger(insert, 'id_articulo'),
      tagId: this.valueReader.getRequiredInteger(insert, 'id_etiqueta_web'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readPhoto(insert: LegacySqlInsert): LegacyCatalogPhoto {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readArticlePhoto(insert: LegacySqlInsert): LegacyCatalogArticlePhoto {
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');

    return {
      photoId: this.valueReader.getRequiredInteger(insert, 'id_foto'),
      articleId: this.valueReader.getRequiredInteger(insert, 'id_articulo'),
      order: this.valueReader.getRequiredInteger(insert, 'orden'),
      createdAt,
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt,
    };
  }

  private readExpiration(insert: LegacySqlInsert): LegacyCatalogExpiration {
    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      articleId: this.valueReader.getRequiredInteger(insert, 'id_articulo'),
      units: this.valueReader.getRequiredInteger(insert, 'unidades'),
      purchasePrice: this.valueReader.getRequiredNumber(insert, 'puc'),
      salePrice: this.valueReader.getRequiredNumber(insert, 'pvp'),
      createdAt: this.valueReader.getOptionalText(insert, 'created_at'),
      updatedAt: this.valueReader.getOptionalText(insert, 'updated_at'),
    };
  }

  private normalizeOptionalText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const normalized: string = value.trim();

    return normalized.length === 0 ? null : normalized;
  }
}
