import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';
import { OTPV_V3_FORMAT_VERSION } from '@backend/domain/backup/otpv-v3.constants';
import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.interface';
import { LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION } from '@backend/domain/legacy-import/legacy-import.constants';

type OtpvPackageSelectionResult =
  | {
      readonly mode: 'legacy-import';
      readonly formatVersion: typeof LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION;
      readonly selectionId: string;
      readonly inspection: LegacyImportPackageInspection;
    }
  | {
      readonly mode: 'native-restore';
      readonly formatVersion: typeof OTPV_V3_FORMAT_VERSION;
      readonly selectionId: string;
      readonly manifest: OtpvV3Manifest;
    };

export default OtpvPackageSelectionResult;
