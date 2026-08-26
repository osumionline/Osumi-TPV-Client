import type { Buffer } from 'node:buffer';

export default interface HtmlDocumentRenderer {
  renderPdf(documentHtml: string): Promise<Buffer>;

  print(documentHtml: string, deviceName: string): Promise<void>;

  /**
   * Imprime directamente un PDF ya materializado.
   */
  printPdf(pdf: Uint8Array, deviceName: string): Promise<void>;
}
