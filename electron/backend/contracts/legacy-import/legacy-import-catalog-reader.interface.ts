import type LegacyImportCatalogSnapshot from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';

export default interface LegacyImportCatalogReader {
  read(
    packagePath: string,
    expectedTableRows: Readonly<Record<string, number>>,
  ): Promise<LegacyImportCatalogSnapshot>;
}
