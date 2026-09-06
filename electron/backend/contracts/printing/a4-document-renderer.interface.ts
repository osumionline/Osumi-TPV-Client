export default interface A4DocumentRenderer {
  /**
   * Genera un PDF A4 respetando la orientación
   * definida por el documento HTML.
   */
  renderPdf(documentHtml: string): Promise<Uint8Array>;
}
