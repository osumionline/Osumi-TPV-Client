export default interface OtpvV3EncryptedPayloadExtractor {
  /**
   * Extrae payload.enc del contenedor exterior
   * validando de nuevo su estructura.
   */
  extract(packagePath: string, destinationFile: string): Promise<void>;
}
