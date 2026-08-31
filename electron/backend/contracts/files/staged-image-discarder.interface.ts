export default interface StagedImageDiscarder {
  /**
   * Descarta una imagen temporal después de haber sido consumida.
   */
  discard(stagingId: string): Promise<void>;
}
