import type OtpvPackageInspection from '@backend/domain/backup/otpv-package-inspection.type';

export default interface OtpvPackageInspector {
  /**
   * Inspecciona el contenedor `.otpv`,
   * identifica su generación y valida
   * la envoltura exterior cuando es v3.
   */
  inspect(packagePath: string): Promise<OtpvPackageInspection>;
}
