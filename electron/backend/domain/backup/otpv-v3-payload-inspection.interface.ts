import type OtpvV3ArchiveEntry from '@backend/domain/backup/otpv-v3-archive-entry.interface';

export default interface OtpvV3PayloadInspection {
  readonly entries: readonly OtpvV3ArchiveEntry[];
  readonly regularFileCount: number;
  readonly totalUncompressedSize: number;
}
