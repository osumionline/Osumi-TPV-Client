import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';
import { OTPV_V3_FORMAT_VERSION } from '@backend/domain/backup/otpv-v3.constants';
import { LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION } from '@backend/domain/legacy-import/legacy-import.constants';

type OtpvPackageInspection =
  | {
      readonly formatVersion: typeof LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION;
      readonly manifest: null;
    }
  | {
      readonly formatVersion: typeof OTPV_V3_FORMAT_VERSION;
      readonly manifest: OtpvV3Manifest;
    };

export default OtpvPackageInspection;
