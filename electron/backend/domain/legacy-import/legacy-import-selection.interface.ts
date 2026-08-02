import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.interface';

export default interface LegacyImportSelection {
  readonly packagePath: string;

  readonly inspection: LegacyImportPackageInspection;
}
