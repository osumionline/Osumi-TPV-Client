export default interface OtpvV3RestoreWorkspace {
  readonly encryptedPayloadFile: string;
  readonly decryptedPayloadFile: string;

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
   * Elimina por completo el espacio temporal
   * de restauración.
   */
  clear(): Promise<void>;
}
