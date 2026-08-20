import type { Buffer } from 'node:buffer';

export default interface HtmlDocumentRenderer {
  renderPdf(documentHtml: string): Promise<Buffer>;
}
