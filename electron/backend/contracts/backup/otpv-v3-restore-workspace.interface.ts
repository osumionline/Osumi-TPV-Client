import type OtpvV3RequiredContentPaths from '@backend/contracts/backup/otpv-v3-required-content-paths.interface';

export default interface OtpvV3RestoreWorkspace extends OtpvV3RequiredContentPaths {
  readonly encryptedPayloadFile: string;
  readonly decryptedPayloadFile: string;
  readonly filesDirectory: string;

  /**
   * Reinicia el espacio temporal utilizado
   * por una restauración v3.
   */
  reset(): Promise<void>;

  /**
   * Elimina payload.enc cuando ya no
   * es necesario tras el descifrado.
   */
  removeEncryptedPayload(): Promise<void>;

  /**
   * Elimina el ZIP interior en claro una vez
   * materializado todo su contenido portable.
   */
  removeDecryptedPayload(): Promise<void>;

  /**
   * Elimina por completo el espacio temporal
   * de restauración.
   */
  clear(): Promise<void>;
}
