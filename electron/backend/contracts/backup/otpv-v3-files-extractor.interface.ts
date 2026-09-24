export default interface OtpvV3FilesExtractor {
  /**
   * Extrae la jerarquía portable files/**
   * desde el ZIP interior ya validado.
   */
  extract(payloadFile: string, destinationDirectory: string): Promise<void>;
}
