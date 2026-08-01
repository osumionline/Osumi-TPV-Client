import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.type';

export default interface LegacyImportPackageInspector {
  inspect(packagePath: string): Promise<LegacyImportPackageInspection>;
}
