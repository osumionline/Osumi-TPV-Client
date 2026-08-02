import type LegacyImportDumpAnalyzer from '@backend/contracts/legacy-import-dump-analyzer.interface';
import type LegacyImportPackageAnalysis from '@backend/domain/legacy-import/legacy-import-package-analysis.type';
import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';
import type LegacyImportAnalysisIssue from '@desktop-contracts/legacy-import/legacy-import-analysis-issue.interface';
import type LegacyImportTableSummary from '@desktop-contracts/legacy-import/legacy-import-table-summary.interface';
import MariaDbInsertParser from '@infrastructure/legacy-import/maria-db-insert.parser';
import type { Interface as ReadLineInterface } from 'node:readline';
import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';
import type { Entry, Options, ZipFile } from 'yauzl';
import { open } from 'yauzl';

interface LegacyEmployeePermission {
  readonly employeeId: number;

  readonly roleId: number;
}

interface LegacyArticle {
  readonly id: number;

  readonly active: boolean;

  readonly name: string;

  readonly slug: string;

  readonly locator: number | null;

  readonly directAccess: number | null;
}

interface LegacyBarcode {
  readonly id: number;

  readonly articleId: number;

  readonly code: string;
}

interface LegacyOrder {
  readonly id: number;

  readonly providerId: number | null;

  readonly type: string | null;

  readonly number: string | null;
}

interface LegacySale {
  readonly id: number;

  readonly saleNumber: number;

  readonly total: number;

  readonly delivered: number;
}

interface LegacyAnalysisState {
  readonly tableRows: Map<string, number>;

  readonly employeeIds: Set<number>;

  readonly employeePermissions: LegacyEmployeePermission[];

  readonly articles: LegacyArticle[];

  readonly barcodes: LegacyBarcode[];

  readonly orders: LegacyOrder[];

  readonly sales: LegacySale[];
}

const MAXIMUM_ISSUE_SAMPLES: number = 5;

const MAXIMUM_REASONABLE_DELIVERED_AMOUNT: number = 1_000_000;

export default class YauzlLegacyImportDumpAnalyzer implements LegacyImportDumpAnalyzer {
  constructor(private readonly insertParser: MariaDbInsertParser) {}

  async analyze(
    packagePath: string,
    expectedTableRows: Readonly<Record<string, number>>,
  ): Promise<LegacyImportPackageAnalysis> {
    const zipFile: ZipFile = await this.openArchive(packagePath);

    try {
      const databaseEntry: Entry = await this.findEntry(zipFile, 'database.sql');

      const databaseStream: Readable = await this.openEntryStream(zipFile, databaseEntry);

      const state: LegacyAnalysisState = this.createState();

      await this.readDatabaseDump(databaseStream, state, expectedTableRows);

      const tables: readonly LegacyImportTableSummary[] = this.validateTableRows(
        state.tableRows,
        expectedTableRows,
      );

      const totalRows: number = tables.reduce(
        (
          total: number,

          table: LegacyImportTableSummary,
        ): number => total + table.rows,

        0,
      );

      const issues: readonly LegacyImportAnalysisIssue[] = this.createIssues(state);

      const automaticRepairIssues: number = issues.filter(
        (issue: LegacyImportAnalysisIssue): boolean => issue.kind === 'automatic-repair',
      ).length;

      const reviewIssues: number = issues.length - automaticRepairIssues;

      return {
        analyzedAt: new Date().toISOString(),

        tables,
        totalRows,

        automaticRepairIssues,
        reviewIssues,

        requiresReview: reviewIssues > 0,

        issues,
      };
    } finally {
      zipFile.close();
    }
  }

  private createState(): LegacyAnalysisState {
    return {
      tableRows: new Map<string, number>(),

      employeeIds: new Set<number>(),

      employeePermissions: [],
      articles: [],
      barcodes: [],
      orders: [],
      sales: [],
    };
  }

  private async readDatabaseDump(
    databaseStream: Readable,

    state: LegacyAnalysisState,

    expectedTableRows: Readonly<Record<string, number>>,
  ): Promise<void> {
    const lineReader: ReadLineInterface = createInterface({
      input: databaseStream,

      crlfDelay: Infinity,
    });

    let lineNumber: number = 0;

    try {
      for await (const line of lineReader) {
        lineNumber++;

        const insert: LegacySqlInsert | null = this.insertParser.parse(line, lineNumber);

        if (insert === null) {
          continue;
        }

        if (expectedTableRows[insert.tableName] === undefined) {
          throw new Error(
            ['El dump contiene registros', `de una tabla no declarada: ${insert.tableName}.`].join(
              ' ',
            ),
          );
        }

        this.incrementTableRows(state.tableRows, insert.tableName);

        this.collectRelevantData(insert, state);
      }
    } catch (error: unknown) {
      throw new Error(
        ['No se ha podido analizar', `database.sql cerca de la línea ${lineNumber}.`].join(' '),
        {
          cause: error,
        },
      );
    } finally {
      lineReader.close();
    }
  }

  private incrementTableRows(
    tableRows: Map<string, number>,

    tableName: string,
  ): void {
    const currentRows: number = tableRows.get(tableName) ?? 0;

    tableRows.set(tableName, currentRows + 1);
  }

  private collectRelevantData(insert: LegacySqlInsert, state: LegacyAnalysisState): void {
    switch (insert.tableName) {
      case 'empleado':
        state.employeeIds.add(this.getRequiredInteger(insert, 'id'));

        break;

      case 'empleado_rol':
        state.employeePermissions.push({
          employeeId: this.getRequiredInteger(insert, 'id_empleado'),

          roleId: this.getRequiredInteger(insert, 'id_rol'),
        });

        break;

      case 'articulo':
        state.articles.push({
          id: this.getRequiredInteger(insert, 'id'),

          active: this.getValue(insert, 'deleted_at') === null,

          name: this.getRequiredText(insert, 'nombre'),

          slug: this.getRequiredText(insert, 'slug'),

          locator: this.getOptionalInteger(insert, 'localizador'),

          directAccess: this.getOptionalInteger(insert, 'acceso_directo'),
        });

        break;

      case 'codigo_barras':
        state.barcodes.push({
          id: this.getRequiredInteger(insert, 'id'),

          articleId: this.getRequiredInteger(insert, 'id_articulo'),

          code: this.getOptionalText(insert, 'codigo_barras') ?? '',
        });

        break;

      case 'pedido':
        state.orders.push({
          id: this.getRequiredInteger(insert, 'id'),

          providerId: this.getOptionalInteger(insert, 'id_proveedor'),

          type: this.getOptionalText(insert, 'tipo'),

          number: this.getOptionalText(insert, 'num'),
        });

        break;

      case 'venta':
        state.sales.push({
          id: this.getRequiredInteger(insert, 'id'),

          saleNumber: this.getRequiredInteger(insert, 'num_venta'),

          total: this.getRequiredNumber(insert, 'total'),

          delivered: this.getRequiredNumber(insert, 'entregado'),
        });

        break;
    }
  }

  private validateTableRows(
    actualTableRows: ReadonlyMap<string, number>,

    expectedTableRows: Readonly<Record<string, number>>,
  ): readonly LegacyImportTableSummary[] {
    const result: LegacyImportTableSummary[] = [];

    for (const [tableName, expectedRows] of Object.entries(expectedTableRows)) {
      const actualRows: number = actualTableRows.get(tableName) ?? 0;

      if (actualRows !== expectedRows) {
        throw new Error(
          [
            `La tabla ${tableName}`,
            `debería contener ${expectedRows} registros`,
            `pero se han leído ${actualRows}.`,
          ].join(' '),
        );
      }

      result.push({
        tableName,
        rows: actualRows,
      });
    }

    return result.sort(
      (
        first: LegacyImportTableSummary,

        second: LegacyImportTableSummary,
      ): number => first.tableName.localeCompare(second.tableName, 'es'),
    );
  }

  private createIssues(state: LegacyAnalysisState): readonly LegacyImportAnalysisIssue[] {
    const issues: LegacyImportAnalysisIssue[] = [];

    this.addOrphanedEmployeePermissionsIssue(state, issues);

    this.addArticleIssues(state, issues);

    this.addBarcodeIssues(state, issues);

    this.addOrderIssues(state, issues);

    this.addSaleIssues(state, issues);

    return issues;
  }

  private addOrphanedEmployeePermissionsIssue(
    state: LegacyAnalysisState,

    issues: LegacyImportAnalysisIssue[],
  ): void {
    const orphanedPermissions: readonly LegacyEmployeePermission[] =
      state.employeePermissions.filter(
        (permission: LegacyEmployeePermission): boolean =>
          !state.employeeIds.has(permission.employeeId),
      );

    if (orphanedPermissions.length === 0) {
      return;
    }

    const employeeIds: readonly number[] = [
      ...new Set<number>(
        orphanedPermissions.map(
          (permission: LegacyEmployeePermission): number => permission.employeeId,
        ),
      ),
    ];

    issues.push({
      code: 'orphaned-employee-permissions',

      kind: 'automatic-repair',

      title: 'Permisos de empleados inexistentes',

      description:
        'Se han encontrado permisos asociados a empleados que ya no existen en la exportación.',

      resolution: 'Los permisos huérfanos no se importarán.',

      affectedRows: orphanedPermissions.length,

      affectedGroups: employeeIds.length,

      samples: employeeIds
        .slice(0, MAXIMUM_ISSUE_SAMPLES)
        .map((employeeId: number): string => `Empleado legacy ${employeeId}`),
    });
  }

  private addArticleIssues(
    state: LegacyAnalysisState,

    issues: LegacyImportAnalysisIssue[],
  ): void {
    const activeArticles: readonly LegacyArticle[] = state.articles.filter(
      (article: LegacyArticle): boolean => article.active,
    );

    this.addDuplicateArticleTextIssue(activeArticles, issues, 'name');

    this.addDuplicateArticleTextIssue(activeArticles, issues, 'slug');

    this.addDuplicateArticleNumberIssue(activeArticles, issues, 'locator');

    this.addDuplicateArticleNumberIssue(activeArticles, issues, 'directAccess');

    const articlesByLocator: Map<number, LegacyArticle[]> = this.groupArticlesByNumber(
      activeArticles,
      'locator',
    );

    const collisions: Map<number, Set<number>> = new Map<number, Set<number>>();

    for (const article of activeArticles) {
      if (article.directAccess === null) {
        continue;
      }

      const locatorArticles: readonly LegacyArticle[] =
        articlesByLocator.get(article.directAccess) ?? [];

      if (locatorArticles.length === 0) {
        continue;
      }

      const affectedArticleIds: Set<number> =
        collisions.get(article.directAccess) ?? new Set<number>();

      affectedArticleIds.add(article.id);

      for (const locatorArticle of locatorArticles) {
        affectedArticleIds.add(locatorArticle.id);
      }

      collisions.set(article.directAccess, affectedArticleIds);
    }

    if (collisions.size > 0) {
      const affectedRows: number = [...collisions.values()].reduce(
        (
          total: number,

          ids: Set<number>,
        ): number => total + ids.size,

        0,
      );

      issues.push({
        code: 'direct-access-locator-collisions',

        kind: 'requires-review',

        title: 'Colisiones entre localizadores y accesos directos',

        description:
          'Uno o varios accesos directos coinciden con localizadores de artículos activos.',

        resolution:
          'Será necesario conservar el localizador y reasignar o retirar el acceso directo conflictivo.',

        affectedRows,

        affectedGroups: collisions.size,

        samples: [...collisions.entries()]
          .slice(0, MAXIMUM_ISSUE_SAMPLES)
          .map(([value, articleIds]): string =>
            [value, `artículos ${[...articleIds].join(', ')}`].join(': '),
          ),
      });
    }
  }

  private addDuplicateArticleTextIssue(
    articles: readonly LegacyArticle[],

    issues: LegacyImportAnalysisIssue[],

    field: 'name' | 'slug',
  ): void {
    const groups: Map<string, LegacyArticle[]> = new Map<string, LegacyArticle[]>();

    for (const article of articles) {
      const value: string = field === 'name' ? article.name : article.slug;

      const normalized: string = this.normalizeText(value);

      const current: LegacyArticle[] = groups.get(normalized) ?? [];

      current.push(article);

      groups.set(normalized, current);
    }

    const duplicates: readonly [string, LegacyArticle[]][] = [...groups.entries()].filter(
      ([, groupArticles]): boolean => groupArticles.length > 1,
    );

    if (duplicates.length === 0) {
      return;
    }

    const affectedRows: number = duplicates.reduce(
      (
        total: number,

        [, groupArticles],
      ): number => total + groupArticles.length,

      0,
    );

    issues.push({
      code: field === 'name' ? 'duplicate-active-article-names' : 'duplicate-active-article-slugs',

      kind: 'automatic-repair',

      title:
        field === 'name'
          ? 'Nombres de artículos activos duplicados'
          : 'Slugs de artículos activos duplicados',

      description:
        field === 'name'
          ? 'El nuevo esquema exige que los nombres de artículos activos sean únicos.'
          : 'El nuevo esquema exige que los slugs de artículos activos sean únicos.',

      resolution:
        field === 'name'
          ? 'Se conservará el primer nombre y se añadirá el identificador legacy a los duplicados.'
          : 'Se conservará el primer slug y se añadirá un sufijo estable a los duplicados.',

      affectedRows,

      affectedGroups: duplicates.length,

      samples: duplicates
        .slice(0, MAXIMUM_ISSUE_SAMPLES)
        .map(([value, groupArticles]): string =>
          [
            value,
            `artículos ${groupArticles
              .map((article: LegacyArticle): number => article.id)
              .join(', ')}`,
          ].join(': '),
        ),
    });
  }

  private addDuplicateArticleNumberIssue(
    articles: readonly LegacyArticle[],

    issues: LegacyImportAnalysisIssue[],

    field: 'locator' | 'directAccess',
  ): void {
    const groups: Map<number, LegacyArticle[]> = this.groupArticlesByNumber(articles, field);

    const duplicates: readonly [number, LegacyArticle[]][] = [...groups.entries()].filter(
      ([, groupArticles]): boolean => groupArticles.length > 1,
    );

    if (duplicates.length === 0) {
      return;
    }

    issues.push({
      code:
        field === 'locator'
          ? 'duplicate-active-article-locators'
          : 'duplicate-active-direct-access-codes',

      kind: 'requires-review',

      title:
        field === 'locator'
          ? 'Localizadores de artículos duplicados'
          : 'Accesos directos duplicados',

      description:
        field === 'locator'
          ? 'Varios artículos activos utilizan el mismo localizador.'
          : 'Varios artículos activos utilizan el mismo acceso directo.',

      resolution:
        field === 'locator'
          ? 'Los localizadores conflictivos deberán reasignarse de forma determinista.'
          : 'Se conservará un acceso directo y se retirará de los artículos restantes.',

      affectedRows: duplicates.reduce(
        (
          total: number,

          [, groupArticles],
        ): number => total + groupArticles.length,

        0,
      ),

      affectedGroups: duplicates.length,

      samples: duplicates
        .slice(0, MAXIMUM_ISSUE_SAMPLES)
        .map(([value, groupArticles]): string =>
          [
            value,
            `artículos ${groupArticles
              .map((article: LegacyArticle): number => article.id)
              .join(', ')}`,
          ].join(': '),
        ),
    });
  }

  private groupArticlesByNumber(
    articles: readonly LegacyArticle[],

    field: 'locator' | 'directAccess',
  ): Map<number, LegacyArticle[]> {
    const result: Map<number, LegacyArticle[]> = new Map<number, LegacyArticle[]>();

    for (const article of articles) {
      const value: number | null = field === 'locator' ? article.locator : article.directAccess;

      if (value === null) {
        continue;
      }

      const current: LegacyArticle[] = result.get(value) ?? [];

      current.push(article);

      result.set(value, current);
    }

    return result;
  }

  private addBarcodeIssues(
    state: LegacyAnalysisState,

    issues: LegacyImportAnalysisIssue[],
  ): void {
    const emptyBarcodes: readonly LegacyBarcode[] = state.barcodes.filter(
      (barcode: LegacyBarcode): boolean => barcode.code.trim().length === 0,
    );

    if (emptyBarcodes.length > 0) {
      issues.push({
        code: 'empty-barcodes',

        kind: 'automatic-repair',

        title: 'Códigos de barras vacíos',

        description: 'Existen registros de códigos de barras sin ningún valor.',

        resolution: 'Los registros vacíos no se importarán.',

        affectedRows: emptyBarcodes.length,

        affectedGroups: emptyBarcodes.length,

        samples: emptyBarcodes
          .slice(0, MAXIMUM_ISSUE_SAMPLES)
          .map((barcode: LegacyBarcode): string =>
            [`Registro ${barcode.id}`, `artículo ${barcode.articleId}`].join(', '),
          ),
      });
    }

    const barcodeGroups: Map<string, LegacyBarcode[]> = new Map<string, LegacyBarcode[]>();

    for (const barcode of state.barcodes) {
      const normalizedCode: string = this.normalizeText(barcode.code);

      if (normalizedCode.length === 0) {
        continue;
      }

      const current: LegacyBarcode[] = barcodeGroups.get(normalizedCode) ?? [];

      current.push(barcode);

      barcodeGroups.set(normalizedCode, current);
    }

    const duplicateGroups: readonly [string, LegacyBarcode[]][] = [
      ...barcodeGroups.entries(),
    ].filter(([, groupBarcodes]): boolean => groupBarcodes.length > 1);

    if (duplicateGroups.length > 0) {
      issues.push({
        code: 'duplicate-barcodes',

        kind: 'automatic-repair',

        title: 'Códigos de barras duplicados',

        description: 'El dump contiene varios registros con el mismo código de barras.',

        resolution:
          'Los duplicados del mismo artículo se consolidarán. Los conflictos entre artículos activos se revisarán por separado.',

        affectedRows: duplicateGroups.reduce(
          (
            total: number,

            [, groupBarcodes],
          ): number => total + groupBarcodes.length,

          0,
        ),

        affectedGroups: duplicateGroups.length,

        samples: duplicateGroups
          .slice(0, MAXIMUM_ISSUE_SAMPLES)
          .map(([code, groupBarcodes]): string =>
            [
              code,
              `artículos ${groupBarcodes
                .map((barcode: LegacyBarcode): number => barcode.articleId)
                .join(', ')}`,
            ].join(': '),
          ),
      });
    }

    const activeArticleIds: Set<number> = new Set<number>(
      state.articles
        .filter((article: LegacyArticle): boolean => article.active)
        .map((article: LegacyArticle): number => article.id),
    );

    const activeConflicts: readonly [string, LegacyBarcode[]][] = duplicateGroups.filter(
      ([, groupBarcodes]): boolean => {
        const articleIds: Set<number> = new Set<number>(
          groupBarcodes
            .filter((barcode: LegacyBarcode): boolean => activeArticleIds.has(barcode.articleId))
            .map((barcode: LegacyBarcode): number => barcode.articleId),
        );

        return articleIds.size > 1;
      },
    );

    if (activeConflicts.length > 0) {
      issues.push({
        code: 'active-article-barcode-conflicts',

        kind: 'requires-review',

        title: 'Códigos de barras compartidos por artículos activos',

        description:
          'Un mismo código de barras está asociado a varios artículos activos y el nuevo esquema no permite esa ambigüedad.',

        resolution: 'Será necesario elegir el artículo que conservará cada código conflictivo.',

        affectedRows: activeConflicts.reduce(
          (
            total: number,

            [, groupBarcodes],
          ): number => total + groupBarcodes.length,

          0,
        ),

        affectedGroups: activeConflicts.length,

        samples: activeConflicts
          .slice(0, MAXIMUM_ISSUE_SAMPLES)
          .map(([code, groupBarcodes]): string =>
            [
              code,
              `artículos ${[
                ...new Set<number>(
                  groupBarcodes.map((barcode: LegacyBarcode): number => barcode.articleId),
                ),
              ].join(', ')}`,
            ].join(': '),
          ),
      });
    }
  }

  private addOrderIssues(
    state: LegacyAnalysisState,

    issues: LegacyImportAnalysisIssue[],
  ): void {
    const ordersWithoutNumber: readonly LegacyOrder[] = state.orders.filter(
      (order: LegacyOrder): boolean => order.number === null || order.number.trim().length === 0,
    );

    if (ordersWithoutNumber.length > 0) {
      issues.push({
        code: 'missing-order-numbers',

        kind: 'automatic-repair',

        title: 'Pedidos sin número de documento',

        description: 'Existen pedidos cuyo número de albarán, factura o abono está vacío.',

        resolution: 'Se generará un número estable utilizando el identificador legacy del pedido.',

        affectedRows: ordersWithoutNumber.length,

        affectedGroups: ordersWithoutNumber.length,

        samples: ordersWithoutNumber
          .slice(0, MAXIMUM_ISSUE_SAMPLES)
          .map((order: LegacyOrder): string => `Pedido legacy ${order.id}`),
      });
    }

    const groups: Map<string, LegacyOrder[]> = new Map<string, LegacyOrder[]>();

    for (const order of state.orders) {
      const normalizedNumber: string = this.normalizeText(order.number ?? '');

      if (normalizedNumber.length === 0) {
        continue;
      }

      const key: string = [
        order.providerId ?? 'sin-proveedor',

        this.normalizeText(order.type ?? ''),

        normalizedNumber,
      ].join('|');

      const current: LegacyOrder[] = groups.get(key) ?? [];

      current.push(order);

      groups.set(key, current);
    }

    const duplicates: readonly LegacyOrder[][] = [...groups.values()].filter(
      (groupOrders: LegacyOrder[]): boolean => groupOrders.length > 1,
    );

    if (duplicates.length === 0) {
      return;
    }

    issues.push({
      code: 'duplicate-order-numbers',

      kind: 'automatic-repair',

      title: 'Números de pedido duplicados',

      description: 'Varios documentos del mismo proveedor y tipo utilizan el mismo número.',

      resolution: 'Se conservará el primer número y se añadirá un sufijo estable a los duplicados.',

      affectedRows: duplicates.reduce(
        (
          total: number,

          groupOrders: LegacyOrder[],
        ): number => total + groupOrders.length,

        0,
      ),

      affectedGroups: duplicates.length,

      samples: duplicates
        .slice(0, MAXIMUM_ISSUE_SAMPLES)
        .map((groupOrders: LegacyOrder[]): string => {
          const firstOrder: LegacyOrder | undefined = groupOrders[0];

          return [
            firstOrder?.number ?? 'sin número',

            `pedidos ${groupOrders.map((order: LegacyOrder): number => order.id).join(', ')}`,
          ].join(': ');
        }),
    });
  }

  private addSaleIssues(
    state: LegacyAnalysisState,

    issues: LegacyImportAnalysisIssue[],
  ): void {
    const anomalousSales: readonly LegacySale[] = state.sales.filter(
      (sale: LegacySale): boolean => Math.abs(sale.delivered) > MAXIMUM_REASONABLE_DELIVERED_AMOUNT,
    );

    if (anomalousSales.length === 0) {
      return;
    }

    issues.push({
      code: 'anomalous-sale-delivered-amounts',

      kind: 'requires-review',

      title: 'Importes entregados anómalos',

      description: 'Una o varias ventas contienen importes entregados fuera de un rango razonable.',

      resolution:
        'Antes de importar habrá que confirmar si se sustituye el importe por el total de la venta o por cero.',

      affectedRows: anomalousSales.length,

      affectedGroups: anomalousSales.length,

      samples: anomalousSales
        .slice(0, MAXIMUM_ISSUE_SAMPLES)
        .map((sale: LegacySale): string =>
          [
            `Venta ${sale.id}`,
            `número ${sale.saleNumber}`,
            `total ${sale.total}`,
            `entregado ${sale.delivered}`,
          ].join(', '),
        ),
    });
  }

  private normalizeText(value: string): string {
    return value.trim().toLocaleLowerCase('es-ES');
  }

  private getValue(insert: LegacySqlInsert, columnName: string): string | null {
    if (!insert.values.has(columnName)) {
      throw new Error(
        [`La tabla ${insert.tableName}`, `no contiene la columna ${columnName}.`].join(' '),
      );
    }

    return insert.values.get(columnName) ?? null;
  }

  private getRequiredText(insert: LegacySqlInsert, columnName: string): string {
    const value: string | null = this.getValue(insert, columnName);

    if (value === null) {
      throw new Error(
        [`La columna ${insert.tableName}.${columnName}`, 'no puede ser NULL.'].join(' '),
      );
    }

    return value;
  }

  private getOptionalText(insert: LegacySqlInsert, columnName: string): string | null {
    return this.getValue(insert, columnName);
  }

  private getRequiredInteger(insert: LegacySqlInsert, columnName: string): number {
    const value: string = this.getRequiredText(insert, columnName);

    if (!/^-?\d+$/.test(value)) {
      throw new Error(
        [`El valor ${insert.tableName}.${columnName}`, `no es un entero válido: ${value}.`].join(
          ' ',
        ),
      );
    }

    const parsedValue: number = Number(value);

    if (!Number.isSafeInteger(parsedValue)) {
      throw new Error(
        [`El valor ${insert.tableName}.${columnName}`, 'supera el rango de enteros seguros.'].join(
          ' ',
        ),
      );
    }

    return parsedValue;
  }

  private getOptionalInteger(insert: LegacySqlInsert, columnName: string): number | null {
    const value: string | null = this.getValue(insert, columnName);

    if (value === null) {
      return null;
    }

    if (!/^-?\d+$/.test(value)) {
      throw new Error(
        [`El valor ${insert.tableName}.${columnName}`, `no es un entero válido: ${value}.`].join(
          ' ',
        ),
      );
    }

    const parsedValue: number = Number(value);

    if (!Number.isSafeInteger(parsedValue)) {
      throw new Error(
        [`El valor ${insert.tableName}.${columnName}`, 'supera el rango de enteros seguros.'].join(
          ' ',
        ),
      );
    }

    return parsedValue;
  }

  private getRequiredNumber(insert: LegacySqlInsert, columnName: string): number {
    const value: string = this.getRequiredText(insert, columnName);

    const parsedValue: number = Number(value);

    if (!Number.isFinite(parsedValue)) {
      throw new Error(
        [`El valor ${insert.tableName}.${columnName}`, `no es numérico: ${value}.`].join(' '),
      );
    }

    return parsedValue;
  }

  private openArchive(packagePath: string): Promise<ZipFile> {
    const options: Options = {
      lazyEntries: true,
      autoClose: false,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true,
    };

    return new Promise<ZipFile>(
      (
        resolve: (zipFile: ZipFile) => void,

        reject: (reason?: unknown) => void,
      ): void => {
        open(
          packagePath,
          options,

          (error: Error | null, zipFile?: ZipFile): void => {
            if (error !== null) {
              reject(
                new Error('No se ha podido volver a abrir el paquete .otpv.', {
                  cause: error,
                }),
              );

              return;
            }

            if (zipFile === undefined) {
              reject(new Error('El paquete .otpv no ha podido abrirse.'));

              return;
            }

            resolve(zipFile);
          },
        );
      },
    );
  }

  private findEntry(zipFile: ZipFile, entryName: string): Promise<Entry> {
    return new Promise<Entry>(
      (
        resolve: (entry: Entry) => void,

        reject: (reason?: unknown) => void,
      ): void => {
        const cleanup = (): void => {
          zipFile.removeListener('entry', onEntry);

          zipFile.removeListener('end', onEnd);

          zipFile.removeListener('error', onError);
        };

        const onEntry = (entry: Entry): void => {
          if (entry.fileName === entryName) {
            cleanup();

            resolve(entry);

            return;
          }

          zipFile.readEntry();
        };

        const onEnd = (): void => {
          cleanup();

          reject(new Error(`No se ha encontrado ${entryName} en el paquete.`));
        };

        const onError = (error: Error): void => {
          cleanup();

          reject(
            new Error(`No se ha podido localizar ${entryName}.`, {
              cause: error,
            }),
          );
        };

        zipFile.on('entry', onEntry);

        zipFile.once('end', onEnd);

        zipFile.once('error', onError);

        zipFile.readEntry();
      },
    );
  }

  private openEntryStream(zipFile: ZipFile, entry: Entry): Promise<Readable> {
    return new Promise<Readable>(
      (
        resolve: (stream: Readable) => void,

        reject: (reason?: unknown) => void,
      ): void => {
        zipFile.openReadStream(
          entry,

          (
            error: Error | null,

            readStream?: Readable,
          ): void => {
            if (error !== null) {
              reject(
                new Error(`No se ha podido abrir ${entry.fileName}.`, {
                  cause: error,
                }),
              );

              return;
            }

            if (readStream === undefined) {
              reject(new Error(`No se ha obtenido el contenido de ${entry.fileName}.`));

              return;
            }

            resolve(readStream);
          },
        );
      },
    );
  }
}
