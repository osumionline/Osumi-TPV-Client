import type LegacyImportCatalogSnapshot from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';

export default interface LegacyImportCatalogValidator {
  validate(snapshot: LegacyImportCatalogSnapshot): void;
}
