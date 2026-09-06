export default interface A4DocumentRenderer {
  /**
   * Genera un PDF A4 horizontal a partir de
   * un documento HTML completo.
   */
  renderLandscapePdf(documentHtml: string): Promise<Uint8Array>;
}
