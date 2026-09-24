import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';

export default interface OtpvV3RestoreSelection {
  readonly packagePath: string;
  readonly manifest: OtpvV3Manifest;
}
