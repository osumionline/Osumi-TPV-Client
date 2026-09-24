import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';

export interface OtpvV3BuildPackageCommand {
  readonly backupApiKey: string;
  readonly destinationFile: string;
}

export interface OtpvV3PackageBuildResult {
  readonly manifest: OtpvV3Manifest;
  readonly destinationFile: string;
  readonly sizeBytes: number;
}

export interface OtpvV3PackageBuilder {
  /**
   * Construye una copia `.otpv` v3 completa
   * en el fichero de destino indicado.
   */
  create(command: OtpvV3BuildPackageCommand): Promise<OtpvV3PackageBuildResult>;
}
