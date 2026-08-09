import type LegacyImportCatalogNormalizer from '@backend/contracts/legacy-import/legacy-import-catalog-normalizer.interface';
import type LegacyImportCatalogSnapshot from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';
import type {
  LegacyCatalogArticle,
  LegacyCatalogBarcode,
  LegacyCatalogExpiration,
  LegacyCatalogTag,
} from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';
import type LegacyImportNormalizedCatalog from '@backend/domain/legacy-import/legacy-import-normalized-catalog';
import type {
  LegacyImportCatalogNormalizationContext,
  LegacyImportNormalizedArticle,
  LegacyImportNormalizedBarcode,
  LegacyImportNormalizedExpiration,
  LegacyImportNormalizedTag,
} from '@backend/domain/legacy-import/legacy-import-normalized-catalog';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';
import LegacyImportNumberConverter from '@infrastructure/legacy-import/legacy-import-number.converter';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';

interface MutableNormalizationCounters {
  skippedRows: number;

  warningCount: number;
}

interface MutableNormalizedBarcode {
  readonly id: number;

  readonly publicId: string;

  readonly articleId: number;

  readonly code: string;

  default: boolean;

  readonly createdAt: string;

  readonly updatedAt: string;

  readonly deletedAt: string | null;
}

type LocatorDecision = Extract<
  LegacyImportReviewDecision,
  {
    readonly code: 'duplicate-active-article-locators';
  }
>;

type DirectAccessDecision = Extract<
  LegacyImportReviewDecision,
  {
    readonly code: 'duplicate-active-direct-access-codes';
  }
>;

type AccessLocatorDecision = Extract<
  LegacyImportReviewDecision,
  {
    readonly code: 'direct-access-locator-collisions';
  }
>;

type BarcodeDecision = Extract<
  LegacyImportReviewDecision,
  {
    readonly code: 'active-article-barcode-conflicts';
  }
>;

const MAXIMUM_ARTICLE_TEXT_LENGTH: number = 200;

const MAXIMUM_TAG_TEXT_LENGTH: number = 100;

export default class DefaultLegacyImportCatalogNormalizer implements LegacyImportCatalogNormalizer {
  constructor(
    private readonly numberConverter: LegacyImportNumberConverter,
    private readonly publicIdFactory: LegacyImportPublicIdFactory,
  ) {}

  normalize(
    snapshot: LegacyImportCatalogSnapshot,
    decisions: readonly LegacyImportReviewDecision[],
    context: LegacyImportCatalogNormalizationContext,
  ): LegacyImportNormalizedCatalog {
    const counters: MutableNormalizationCounters = {
      skippedRows: 0,
      warningCount: 0,
    };

    const decisionsById: ReadonlyMap<string, LegacyImportReviewDecision> =
      this.createDecisionMap(decisions);

    const articleNames: ReadonlyMap<number, string> = this.normalizeArticleTextField(
      snapshot.articles,
      'name',
      counters,
    );

    const articleSlugs: ReadonlyMap<number, string> = this.normalizeArticleTextField(
      snapshot.articles,
      'slug',
      counters,
    );

    const articleLocators: ReadonlyMap<number, number> = this.normalizeArticleLocators(
      snapshot.articles,
      decisionsById,
      counters,
    );

    const articleDirectAccess: ReadonlyMap<number, number | null> =
      this.normalizeArticleDirectAccess(
        snapshot.articles,
        articleLocators,
        decisionsById,
        counters,
      );

    const articles: readonly LegacyImportNormalizedArticle[] = snapshot.articles
      .map((article: LegacyCatalogArticle): LegacyImportNormalizedArticle =>
        this.normalizeArticle(
          article,
          articleNames,
          articleSlugs,
          articleLocators,
          articleDirectAccess,
          context,
          counters,
        ),
      )
      .sort(
        (first: LegacyImportNormalizedArticle, second: LegacyImportNormalizedArticle): number =>
          first.id - second.id,
      );

    const articlesById: ReadonlyMap<number, LegacyImportNormalizedArticle> = new Map<
      number,
      LegacyImportNormalizedArticle
    >(
      articles.map(
        (article: LegacyImportNormalizedArticle): [number, LegacyImportNormalizedArticle] => [
          article.id,
          article,
        ],
      ),
    );

    const barcodes: readonly LegacyImportNormalizedBarcode[] = this.normalizeBarcodes(
      snapshot.barcodes,
      articlesById,
      decisionsById,
      context,
      counters,
    );

    const tags: readonly LegacyImportNormalizedTag[] = this.normalizeTags(
      snapshot.tags,
      'etiqueta',
      context,
      counters,
    );

    const webTags: readonly LegacyImportNormalizedTag[] = this.normalizeTags(
      snapshot.webTags,
      'etiqueta_web',
      context,
      counters,
    );

    const expirations: readonly LegacyImportNormalizedExpiration[] = this.normalizeExpirations(
      snapshot.expirations,
      context,
      counters,
    );

    return {
      articles,
      barcodes,
      tags,
      webTags,
      articleTags: snapshot.articleTags,
      articleWebTags: snapshot.articleWebTags,
      expirations,
      skippedRows: counters.skippedRows,
      warningCount: counters.warningCount,
    };
  }

  private normalizeArticle(
    article: LegacyCatalogArticle,
    articleNames: ReadonlyMap<number, string>,
    articleSlugs: ReadonlyMap<number, string>,
    articleLocators: ReadonlyMap<number, number>,
    articleDirectAccess: ReadonlyMap<number, number | null>,
    context: LegacyImportCatalogNormalizationContext,
    counters: MutableNormalizationCounters,
  ): LegacyImportNormalizedArticle {
    const name: string | undefined = articleNames.get(article.id);

    const slug: string | undefined = articleSlugs.get(article.id);

    const locator: number | undefined = articleLocators.get(article.id);

    if (name === undefined || slug === undefined || locator === undefined) {
      throw new Error(`No se ha normalizado completamente el artículo ${article.id}.`);
    }

    const categoryId: number | null = this.normalizeOptionalReference(
      article.categoryId,
      context.categoryIds,
      counters,
    );

    const providerId: number | null = this.normalizeOptionalReference(
      article.providerId,
      context.providerIds,
      counters,
    );

    const brandId: number = this.normalizeBrandReference(article.brandId, context, counters);

    const minimumStock: number = this.normalizeNonNegativeInteger(article.minimumStock, counters);

    let maximumStock: number = this.normalizeNonNegativeInteger(article.maximumStock, counters);

    if (maximumStock !== 0 && maximumStock < minimumStock) {
      maximumStock = minimumStock;

      counters.warningCount++;
    }

    return {
      id: article.id,
      publicId: this.publicIdFactory.create(context.sourceHash, 'articulo', article.id),
      locator,
      name,
      slug,
      categoryId,
      brandId,
      providerId,
      reference: this.normalizeOptionalText(article.reference),
      deliveryPriceMicros: this.numberConverter.toMicros(
        this.normalizeNonNegativeNumber(article.deliveryPrice, counters),
        `articulo ${article.id}.palb`,
      ),
      purchasePriceMicros: this.numberConverter.toMicros(
        this.normalizeNonNegativeNumber(article.purchasePrice, counters),
        `articulo ${article.id}.puc`,
      ),
      salePriceCents: this.numberConverter.toCents(
        this.normalizeNonNegativeNumber(article.salePrice, counters),
        `articulo ${article.id}.pvp`,
      ),
      discountedSalePriceCents:
        article.discountedSalePrice === null
          ? null
          : this.numberConverter.toCents(
              this.normalizeNonNegativeNumber(article.discountedSalePrice, counters),
              `articulo ${article.id}.pvp_descuento`,
            ),
      taxRateBps: this.numberConverter.toBasisPoints(
        this.normalizePercentage(article.taxRate, counters),
        `articulo ${article.id}.iva`,
      ),
      equivalenceSurchargeBps: this.numberConverter.toBasisPoints(
        this.normalizePercentage(article.equivalenceSurcharge, counters),
        `articulo ${article.id}.re`,
      ),
      marginMicropercentage: this.numberConverter.toMicropercentage(
        article.margin,
        `articulo ${article.id}.margen`,
      ),
      discountedMarginMicropercentage:
        article.discountedMargin === null
          ? null
          : this.numberConverter.toMicropercentage(
              article.discountedMargin,
              `articulo ${article.id}.margen_descuento`,
            ),
      stock: article.stock,
      minimumStock,
      maximumStock,
      optimalLot: this.normalizeNonNegativeInteger(article.optimalLot, counters),
      onlineSale: article.onlineSale,
      expirationDate: this.normalizeOptionalText(article.expirationDate),
      visibleOnline: article.visibleOnline,
      shortDescription: this.normalizeOptionalText(article.shortDescription),
      description: this.normalizeOptionalText(article.description),
      notes: this.normalizeOptionalText(article.notes),
      showNotesInOrders: article.showNotesInOrders,
      showNotesInSales: article.showNotesInSales,
      directAccess: articleDirectAccess.get(article.id) ?? null,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      deletedAt: article.deletedAt,
    };
  }

  private normalizeArticleTextField(
    articles: readonly LegacyCatalogArticle[],
    field: 'name' | 'slug',
    counters: MutableNormalizationCounters,
  ): ReadonlyMap<number, string> {
    const result: Map<number, string> = new Map<number, string>();

    const usedActiveValues: Set<string> = new Set<string>();

    const sortedArticles: readonly LegacyCatalogArticle[] = [...articles].sort(
      (first: LegacyCatalogArticle, second: LegacyCatalogArticle): number => first.id - second.id,
    );

    for (const article of sortedArticles) {
      const originalValue: string = field === 'name' ? article.name : article.slug;

      const fallbackValue: string =
        field === 'name' ? `Artículo legacy ${article.id}` : `articulo-legacy-${article.id}`;

      const suffix: string = field === 'name' ? ` (legacy ${article.id})` : `-legacy-${article.id}`;

      let value: string = originalValue.trim();

      if (value.length === 0) {
        value = fallbackValue;

        counters.warningCount++;
      }

      if (value.length > MAXIMUM_ARTICLE_TEXT_LENGTH) {
        value = value.slice(0, MAXIMUM_ARTICLE_TEXT_LENGTH);

        counters.warningCount++;
      }

      if (article.deletedAt !== null) {
        result.set(article.id, value);

        continue;
      }

      const uniqueValue: string = this.createUniqueValue(
        value,
        suffix,
        MAXIMUM_ARTICLE_TEXT_LENGTH,
        usedActiveValues,
      );

      if (uniqueValue !== value) {
        counters.warningCount++;
      }

      usedActiveValues.add(this.normalizeKey(uniqueValue));

      result.set(article.id, uniqueValue);
    }

    return result;
  }

  private normalizeArticleLocators(
    articles: readonly LegacyCatalogArticle[],
    decisionsById: ReadonlyMap<string, LegacyImportReviewDecision>,
    counters: MutableNormalizationCounters,
  ): ReadonlyMap<number, number> {
    const result: Map<number, number> = new Map<number, number>();

    const activeArticles: readonly LegacyCatalogArticle[] = articles.filter(
      (article: LegacyCatalogArticle): boolean => article.deletedAt === null,
    );

    const maximumOriginalCode: number = this.getMaximumArticleCode(activeArticles);

    let nextCode: number = maximumOriginalCode + 1;

    const usedCodes: Set<number> = new Set<number>();

    const locatorGroups: ReadonlyMap<number, readonly LegacyCatalogArticle[]> =
      this.groupArticlesByNumber(activeArticles, 'locator');

    const sortedGroups: readonly [number, readonly LegacyCatalogArticle[]][] = [
      ...locatorGroups.entries(),
    ].sort(
      (
        first: [number, readonly LegacyCatalogArticle[]],
        second: [number, readonly LegacyCatalogArticle[]],
      ): number => first[0] - second[0],
    );

    for (const [locator, groupArticles] of sortedGroups) {
      const sortedArticles: readonly LegacyCatalogArticle[] = [...groupArticles].sort(
        (first: LegacyCatalogArticle, second: LegacyCatalogArticle): number => first.id - second.id,
      );

      let ownerArticleId: number | null = null;

      if (locator > 0 && sortedArticles.length === 1) {
        ownerArticleId = sortedArticles[0]?.id ?? null;
      } else if (locator > 0 && sortedArticles.length > 1) {
        const decision: LocatorDecision = this.getRequiredDecision(
          decisionsById,
          `locator:${locator}`,
          'duplicate-active-article-locators',
        );

        ownerArticleId = decision.articleId;
      }

      for (const article of sortedArticles) {
        if (article.id === ownerArticleId && !usedCodes.has(locator)) {
          result.set(article.id, locator);

          usedCodes.add(locator);

          continue;
        }

        const generatedLocator: number = this.allocateArticleCode(usedCodes, nextCode);

        nextCode = generatedLocator + 1;

        result.set(article.id, generatedLocator);

        counters.warningCount++;
      }
    }

    for (const article of articles) {
      if (article.deletedAt === null) {
        continue;
      }

      result.set(article.id, article.locator);
    }

    return result;
  }

  private normalizeArticleDirectAccess(
    articles: readonly LegacyCatalogArticle[],
    articleLocators: ReadonlyMap<number, number>,
    decisionsById: ReadonlyMap<string, LegacyImportReviewDecision>,
    counters: MutableNormalizationCounters,
  ): ReadonlyMap<number, number | null> {
    const result: Map<number, number | null> = new Map<number, number | null>();

    const activeArticles: readonly LegacyCatalogArticle[] = articles.filter(
      (article: LegacyCatalogArticle): boolean => article.deletedAt === null,
    );

    const usedCodes: Set<number> = new Set<number>(
      activeArticles.map((article: LegacyCatalogArticle): number => {
        const locator: number | undefined = articleLocators.get(article.id);

        if (locator === undefined) {
          throw new Error(`No existe localizador normalizado para el artículo ${article.id}.`);
        }

        return locator;
      }),
    );

    let nextCode: number = Math.max(this.getMaximumArticleCode(activeArticles), ...usedCodes) + 1;

    const directAccessGroups: ReadonlyMap<number, readonly LegacyCatalogArticle[]> =
      this.groupArticlesByNumber(
        activeArticles.filter(
          (article: LegacyCatalogArticle): boolean =>
            article.directAccess !== null && article.directAccess > 0,
        ),
        'directAccess',
      );

    const sortedGroups: readonly [number, readonly LegacyCatalogArticle[]][] = [
      ...directAccessGroups.entries(),
    ].sort(
      (
        first: [number, readonly LegacyCatalogArticle[]],
        second: [number, readonly LegacyCatalogArticle[]],
      ): number => first[0] - second[0],
    );

    for (const [value, groupArticles] of sortedGroups) {
      const sortedArticles: readonly LegacyCatalogArticle[] = [...groupArticles].sort(
        (first: LegacyCatalogArticle, second: LegacyCatalogArticle): number => first.id - second.id,
      );

      let ownerArticleId: number | null;

      if (sortedArticles.length === 1) {
        ownerArticleId = sortedArticles[0]?.id ?? null;
      } else {
        const decision: DirectAccessDecision = this.getRequiredDecision(
          decisionsById,
          `direct-access:${value}`,
          'duplicate-active-direct-access-codes',
        );

        ownerArticleId = decision.articleId;
      }

      for (const article of sortedArticles) {
        if (article.id !== ownerArticleId) {
          result.set(article.id, null);

          counters.warningCount++;
        }
      }

      if (ownerArticleId === null) {
        continue;
      }

      if (usedCodes.has(value)) {
        const collisionDecision: AccessLocatorDecision = this.getRequiredDecision(
          decisionsById,
          `access-locator:${value}`,
          'direct-access-locator-collisions',
        );

        if (collisionDecision.action === 'clear-direct-access') {
          result.set(ownerArticleId, null);

          counters.warningCount++;

          continue;
        }

        const generatedCode: number = this.allocateArticleCode(usedCodes, nextCode);

        nextCode = generatedCode + 1;

        result.set(ownerArticleId, generatedCode);

        counters.warningCount++;

        continue;
      }

      result.set(ownerArticleId, value);

      usedCodes.add(value);
    }

    for (const article of activeArticles) {
      if (result.has(article.id)) {
        continue;
      }

      if (article.directAccess !== null) {
        counters.warningCount++;
      }

      result.set(article.id, null);
    }

    for (const article of articles) {
      if (article.deletedAt === null) {
        continue;
      }

      const directAccess: number | null = article.directAccess;

      if (directAccess === null) {
        result.set(article.id, null);

        continue;
      }

      if (directAccess <= 0 || directAccess === article.locator) {
        result.set(article.id, null);

        counters.warningCount++;

        continue;
      }

      result.set(article.id, directAccess);
    }

    return result;
  }

  private normalizeBarcodes(
    barcodes: readonly LegacyCatalogBarcode[],
    articlesById: ReadonlyMap<number, LegacyImportNormalizedArticle>,
    decisionsById: ReadonlyMap<string, LegacyImportReviewDecision>,
    context: LegacyImportCatalogNormalizationContext,
    counters: MutableNormalizationCounters,
  ): readonly LegacyImportNormalizedBarcode[] {
    const groups: Map<string, LegacyCatalogBarcode[]> = new Map<string, LegacyCatalogBarcode[]>();

    for (const barcode of barcodes) {
      const code: string = barcode.code.trim();

      if (code.length === 0) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      const normalizedCode: string = this.normalizeKey(code);

      const currentGroup: LegacyCatalogBarcode[] = groups.get(normalizedCode) ?? [];

      currentGroup.push(barcode);

      groups.set(normalizedCode, currentGroup);
    }

    const normalizedBarcodes: MutableNormalizedBarcode[] = [];

    for (const group of groups.values()) {
      const sortedGroup: readonly LegacyCatalogBarcode[] = [...group].sort(
        (first: LegacyCatalogBarcode, second: LegacyCatalogBarcode): number => first.id - second.id,
      );

      const activeRows: readonly LegacyCatalogBarcode[] = sortedGroup.filter(
        (barcode: LegacyCatalogBarcode): boolean => {
          const article: LegacyImportNormalizedArticle | undefined = articlesById.get(
            barcode.articleId,
          );

          return article !== undefined && article.deletedAt === null;
        },
      );

      const activeArticleIds: readonly number[] = [
        ...new Set<number>(
          activeRows.map((barcode: LegacyCatalogBarcode): number => barcode.articleId),
        ),
      ];

      let activeSurvivorId: number | null = null;

      if (activeArticleIds.length === 1) {
        activeSurvivorId = activeRows[0]?.id ?? null;
      } else if (activeArticleIds.length > 1) {
        const conflictId: string = `barcode:${sortedGroup
          .map((barcode: LegacyCatalogBarcode): number => barcode.id)
          .join('-')}`;

        const decision: BarcodeDecision = this.getRequiredDecision(
          decisionsById,
          conflictId,
          'active-article-barcode-conflicts',
        );

        if (decision.articleId !== null) {
          activeSurvivorId =
            activeRows.find(
              (barcode: LegacyCatalogBarcode): boolean => barcode.articleId === decision.articleId,
            )?.id ?? null;
        }
      }

      for (const barcode of sortedGroup) {
        const article: LegacyImportNormalizedArticle | undefined = articlesById.get(
          barcode.articleId,
        );

        if (article === undefined) {
          throw new Error(
            [
              `El código de barras ${barcode.id}`,
              `referencia el artículo inexistente ${barcode.articleId}.`,
            ].join(' '),
          );
        }

        if (article.deletedAt === null && barcode.id !== activeSurvivorId) {
          counters.skippedRows++;
          counters.warningCount++;

          continue;
        }

        normalizedBarcodes.push({
          id: barcode.id,
          publicId: this.publicIdFactory.create(context.sourceHash, 'codigo_barras', barcode.id),
          articleId: barcode.articleId,
          code: barcode.code.trim(),
          default: barcode.default,
          createdAt: barcode.createdAt,
          updatedAt: barcode.updatedAt,
          deletedAt: article.deletedAt,
        });
      }
    }

    this.normalizeDefaultBarcodes(normalizedBarcodes, counters);

    return normalizedBarcodes
      .sort(
        (first: MutableNormalizedBarcode, second: MutableNormalizedBarcode): number =>
          first.id - second.id,
      )
      .map((barcode: MutableNormalizedBarcode): LegacyImportNormalizedBarcode => ({
        ...barcode,
      }));
  }

  private normalizeDefaultBarcodes(
    barcodes: MutableNormalizedBarcode[],
    counters: MutableNormalizationCounters,
  ): void {
    const defaultsByArticle: Map<number, MutableNormalizedBarcode[]> = new Map<
      number,
      MutableNormalizedBarcode[]
    >();

    for (const barcode of barcodes) {
      if (barcode.deletedAt !== null || !barcode.default) {
        continue;
      }

      const currentDefaults: MutableNormalizedBarcode[] =
        defaultsByArticle.get(barcode.articleId) ?? [];

      currentDefaults.push(barcode);

      defaultsByArticle.set(barcode.articleId, currentDefaults);
    }

    for (const articleBarcodes of defaultsByArticle.values()) {
      articleBarcodes.sort(
        (first: MutableNormalizedBarcode, second: MutableNormalizedBarcode): number =>
          first.id - second.id,
      );

      for (let index: number = 1; index < articleBarcodes.length; index++) {
        const barcode: MutableNormalizedBarcode | undefined = articleBarcodes[index];

        if (barcode === undefined) {
          continue;
        }

        barcode.default = false;

        counters.warningCount++;
      }
    }
  }

  private normalizeTags(
    tags: readonly LegacyCatalogTag[],
    entity: 'etiqueta' | 'etiqueta_web',
    context: LegacyImportCatalogNormalizationContext,
    counters: MutableNormalizationCounters,
  ): readonly LegacyImportNormalizedTag[] {
    const result: LegacyImportNormalizedTag[] = [];

    const usedSlugs: Set<string> = new Set<string>();

    const sortedTags: readonly LegacyCatalogTag[] = [...tags].sort(
      (first: LegacyCatalogTag, second: LegacyCatalogTag): number => first.id - second.id,
    );

    for (const tag of sortedTags) {
      let text: string = tag.text.trim();

      let slug: string = tag.slug.trim();

      if (text.length === 0) {
        text = `Etiqueta legacy ${tag.id}`;

        counters.warningCount++;
      }

      if (text.length > MAXIMUM_TAG_TEXT_LENGTH) {
        text = text.slice(0, MAXIMUM_TAG_TEXT_LENGTH);

        counters.warningCount++;
      }

      if (slug.length === 0) {
        slug = `etiqueta-legacy-${tag.id}`;

        counters.warningCount++;
      }

      if (slug.length > MAXIMUM_TAG_TEXT_LENGTH) {
        slug = slug.slice(0, MAXIMUM_TAG_TEXT_LENGTH);

        counters.warningCount++;
      }

      const uniqueSlug: string = this.createUniqueValue(
        slug,
        `-legacy-${tag.id}`,
        MAXIMUM_TAG_TEXT_LENGTH,
        usedSlugs,
      );

      if (uniqueSlug !== slug) {
        counters.warningCount++;
      }

      usedSlugs.add(this.normalizeKey(uniqueSlug));

      result.push({
        id: tag.id,
        publicId: this.publicIdFactory.create(context.sourceHash, entity, tag.id),
        text,
        slug: uniqueSlug,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      });
    }

    return result;
  }

  private normalizeExpirations(
    expirations: readonly LegacyCatalogExpiration[],
    context: LegacyImportCatalogNormalizationContext,
    counters: MutableNormalizationCounters,
  ): readonly LegacyImportNormalizedExpiration[] {
    const result: LegacyImportNormalizedExpiration[] = [];

    for (const expiration of expirations) {
      if (expiration.units <= 0) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      const removalDate: string = expiration.updatedAt ?? expiration.createdAt ?? context.startedAt;

      if (expiration.updatedAt === null && expiration.createdAt === null) {
        counters.warningCount++;
      }

      const createdAt: string = expiration.createdAt ?? removalDate;

      const updatedAt: string = expiration.updatedAt ?? createdAt;

      result.push({
        id: expiration.id,
        publicId: this.publicIdFactory.create(context.sourceHash, 'merma_caducidad', expiration.id),
        articleId: expiration.articleId,
        units: expiration.units,
        purchasePriceMicros: this.numberConverter.toMicros(
          this.normalizeNonNegativeNumber(expiration.purchasePrice, counters),
          `caducidad ${expiration.id}.puc`,
        ),
        salePriceCents: this.numberConverter.toCents(
          this.normalizeNonNegativeNumber(expiration.salePrice, counters),
          `caducidad ${expiration.id}.pvp`,
        ),
        removalDate,
        createdAt,
        updatedAt,
      });
    }

    return result;
  }

  private normalizeBrandReference(
    brandId: number,
    context: LegacyImportCatalogNormalizationContext,
    counters: MutableNormalizationCounters,
  ): number {
    if (context.brandIds.has(brandId)) {
      return brandId;
    }

    if (context.fallbackBrandId === null) {
      throw new Error(
        [`No existe la marca legacy ${brandId}`, 'y no se ha creado una marca alternativa.'].join(
          ' ',
        ),
      );
    }

    counters.warningCount++;

    return context.fallbackBrandId;
  }

  private normalizeOptionalReference(
    id: number | null,
    validIds: ReadonlySet<number>,
    counters: MutableNormalizationCounters,
  ): number | null {
    if (id === null) {
      return null;
    }

    if (validIds.has(id)) {
      return id;
    }

    counters.warningCount++;

    return null;
  }

  private normalizeNonNegativeNumber(
    value: number,
    counters: MutableNormalizationCounters,
  ): number {
    if (value >= 0) {
      return value;
    }

    counters.warningCount++;

    return 0;
  }

  private normalizeNonNegativeInteger(
    value: number,
    counters: MutableNormalizationCounters,
  ): number {
    if (value >= 0) {
      return value;
    }

    counters.warningCount++;

    return 0;
  }

  private normalizePercentage(value: number, counters: MutableNormalizationCounters): number {
    if (value >= 0 && value <= 100) {
      return value;
    }

    counters.warningCount++;

    return Math.min(100, Math.max(0, value));
  }

  private normalizeOptionalText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const normalized: string = value.trim();

    return normalized.length === 0 ? null : normalized;
  }

  private getMaximumArticleCode(articles: readonly LegacyCatalogArticle[]): number {
    let maximum: number = 0;

    for (const article of articles) {
      if (article.locator > maximum) {
        maximum = article.locator;
      }

      if (article.directAccess !== null && article.directAccess > maximum) {
        maximum = article.directAccess;
      }
    }

    return maximum;
  }

  private groupArticlesByNumber(
    articles: readonly LegacyCatalogArticle[],
    field: 'locator' | 'directAccess',
  ): ReadonlyMap<number, readonly LegacyCatalogArticle[]> {
    const result: Map<number, LegacyCatalogArticle[]> = new Map<number, LegacyCatalogArticle[]>();

    for (const article of articles) {
      const value: number | null = field === 'locator' ? article.locator : article.directAccess;

      if (value === null) {
        continue;
      }

      const current: LegacyCatalogArticle[] = result.get(value) ?? [];

      current.push(article);

      result.set(value, current);
    }

    return result;
  }

  private allocateArticleCode(usedCodes: Set<number>, firstCandidate: number): number {
    let candidate: number = Math.max(1, firstCandidate);

    while (usedCodes.has(candidate)) {
      candidate++;
    }

    if (!Number.isSafeInteger(candidate)) {
      throw new Error('No se ha podido generar un código de artículo seguro.');
    }

    usedCodes.add(candidate);

    return candidate;
  }

  private createUniqueValue(
    baseValue: string,
    suffix: string,
    maximumLength: number,
    usedValues: ReadonlySet<string>,
  ): string {
    if (!usedValues.has(this.normalizeKey(baseValue))) {
      return baseValue;
    }

    let attempt: number = 1;

    while (true) {
      const attemptSuffix: string = attempt === 1 ? suffix : `${suffix}-${attempt}`;

      const maximumBaseLength: number = Math.max(1, maximumLength - attemptSuffix.length);

      const candidate: string = [baseValue.slice(0, maximumBaseLength), attemptSuffix].join('');

      if (!usedValues.has(this.normalizeKey(candidate))) {
        return candidate;
      }

      attempt++;
    }
  }

  private createDecisionMap(
    decisions: readonly LegacyImportReviewDecision[],
  ): ReadonlyMap<string, LegacyImportReviewDecision> {
    return new Map<string, LegacyImportReviewDecision>(
      decisions.map(
        (decision: LegacyImportReviewDecision): [string, LegacyImportReviewDecision] => [
          decision.conflictId,
          decision,
        ],
      ),
    );
  }

  private getRequiredDecision<Code extends LegacyImportReviewDecision['code']>(
    decisionsById: ReadonlyMap<string, LegacyImportReviewDecision>,
    conflictId: string,
    code: Code,
  ): Extract<
    LegacyImportReviewDecision,
    {
      readonly code: Code;
    }
  > {
    const decision: LegacyImportReviewDecision | undefined = decisionsById.get(conflictId);

    if (decision === undefined || decision.code !== code) {
      throw new Error(
        ['No existe una decisión válida', `para el conflicto ${conflictId}.`].join(' '),
      );
    }

    return decision as Extract<
      LegacyImportReviewDecision,
      {
        readonly code: Code;
      }
    >;
  }

  private normalizeKey(value: string): string {
    return value.trim().toLocaleLowerCase('es-ES');
  }
}
