import type LegacyImportCatalogValidator from '@backend/contracts/legacy-import-catalog-validator.interface';
import type LegacyImportCatalogSnapshot from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';
import type {
  LegacyCatalogArticlePhoto,
  LegacyCatalogArticleTag,
  LegacyCatalogArticleWebTag,
  LegacyCatalogBarcode,
  LegacyCatalogExpiration,
} from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';

export default class DefaultLegacyImportCatalogValidator implements LegacyImportCatalogValidator {
  validate(snapshot: LegacyImportCatalogSnapshot): void {
    const articleIds: ReadonlySet<number> = this.createUniqueIdSet(snapshot.articles, 'articulo');

    const barcodeIds: ReadonlySet<number> = this.createUniqueIdSet(
      snapshot.barcodes,
      'codigo_barras',
    );

    const tagIds: ReadonlySet<number> = this.createUniqueIdSet(snapshot.tags, 'etiqueta');

    const webTagIds: ReadonlySet<number> = this.createUniqueIdSet(snapshot.webTags, 'etiqueta_web');

    const photoIds: ReadonlySet<number> = this.createUniqueIdSet(snapshot.photos, 'foto');

    const expirationIds: ReadonlySet<number> = this.createUniqueIdSet(
      snapshot.expirations,
      'caducidad',
    );

    void barcodeIds;
    void expirationIds;

    this.validateBarcodes(snapshot.barcodes, articleIds);

    this.validateArticleTags(snapshot.articleTags, articleIds, tagIds);

    this.validateArticleWebTags(snapshot.articleWebTags, articleIds, webTagIds);

    this.validateArticlePhotos(snapshot.articlePhotos, articleIds, photoIds);

    this.validateExpirations(snapshot.expirations, articleIds);
  }

  private createUniqueIdSet<
    Item extends {
      readonly id: number;
    },
  >(items: readonly Item[], tableName: string): ReadonlySet<number> {
    const result: Set<number> = new Set<number>();

    for (const item of items) {
      if (result.has(item.id)) {
        throw new Error(
          [`La tabla ${tableName}`, `contiene el identificador duplicado ${item.id}.`].join(' '),
        );
      }

      result.add(item.id);
    }

    return result;
  }

  private validateBarcodes(
    barcodes: readonly LegacyCatalogBarcode[],
    articleIds: ReadonlySet<number>,
  ): void {
    for (const barcode of barcodes) {
      this.assertReference(articleIds, barcode.articleId, 'codigo_barras', barcode.id, 'articulo');
    }
  }

  private validateArticleTags(
    relations: readonly LegacyCatalogArticleTag[],
    articleIds: ReadonlySet<number>,
    tagIds: ReadonlySet<number>,
  ): void {
    const keys: Set<string> = new Set<string>();

    for (const relation of relations) {
      this.assertRelationKey(keys, relation.articleId, relation.tagId, 'articulo_etiqueta');

      this.assertReference(
        articleIds,
        relation.articleId,
        'articulo_etiqueta',
        relation.articleId,
        'articulo',
      );

      this.assertReference(
        tagIds,
        relation.tagId,
        'articulo_etiqueta',
        relation.articleId,
        'etiqueta',
      );
    }
  }

  private validateArticleWebTags(
    relations: readonly LegacyCatalogArticleWebTag[],
    articleIds: ReadonlySet<number>,
    tagIds: ReadonlySet<number>,
  ): void {
    const keys: Set<string> = new Set<string>();

    for (const relation of relations) {
      this.assertRelationKey(keys, relation.articleId, relation.tagId, 'articulo_etiqueta_web');

      this.assertReference(
        articleIds,
        relation.articleId,
        'articulo_etiqueta_web',
        relation.articleId,
        'articulo',
      );

      this.assertReference(
        tagIds,
        relation.tagId,
        'articulo_etiqueta_web',
        relation.articleId,
        'etiqueta_web',
      );
    }
  }

  private validateArticlePhotos(
    relations: readonly LegacyCatalogArticlePhoto[],
    articleIds: ReadonlySet<number>,
    photoIds: ReadonlySet<number>,
  ): void {
    const keys: Set<string> = new Set<string>();

    for (const relation of relations) {
      this.assertRelationKey(keys, relation.articleId, relation.photoId, 'articulo_foto');

      this.assertReference(
        articleIds,
        relation.articleId,
        'articulo_foto',
        relation.articleId,
        'articulo',
      );

      this.assertReference(photoIds, relation.photoId, 'articulo_foto', relation.articleId, 'foto');
    }
  }

  private validateExpirations(
    expirations: readonly LegacyCatalogExpiration[],
    articleIds: ReadonlySet<number>,
  ): void {
    for (const expiration of expirations) {
      this.assertReference(
        articleIds,
        expiration.articleId,
        'caducidad',
        expiration.id,
        'articulo',
      );

      if (expiration.units < 0) {
        throw new Error(
          [`La caducidad ${expiration.id}`, 'contiene un número negativo de unidades.'].join(' '),
        );
      }
    }
  }

  private assertRelationKey(
    keys: Set<string>,
    firstId: number,
    secondId: number,
    tableName: string,
  ): void {
    const key: string = `${firstId}:${secondId}`;

    if (keys.has(key)) {
      throw new Error(
        [`La tabla ${tableName}`, `contiene la relación duplicada ${key}.`].join(' '),
      );
    }

    keys.add(key);
  }

  private assertReference(
    ids: ReadonlySet<number>,
    referencedId: number,
    sourceTable: string,
    sourceId: number,
    targetTable: string,
  ): void {
    if (ids.has(referencedId)) {
      return;
    }

    throw new Error(
      [
        `El registro ${sourceTable} ${sourceId}`,
        `referencia ${targetTable} ${referencedId},`,
        'pero ese registro no existe en el paquete.',
      ].join(' '),
    );
  }
}
