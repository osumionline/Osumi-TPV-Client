import type OtpvV3PayloadInspection from '@backend/domain/backup/otpv-v3-payload-inspection.interface';

export default interface OtpvV3PayloadInspector {
  /**
   * Inspecciona por completo el ZIP interior
   * ya autenticado y descifrado.
   */
  inspect(payloadFile: string): Promise<OtpvV3PayloadInspection>;
}
