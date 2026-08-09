import LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.interface';

export default interface LegacyImportPackageInspector {
  inspect(packagePath: string): Promise<LegacyImportPackageInspection>;
}
