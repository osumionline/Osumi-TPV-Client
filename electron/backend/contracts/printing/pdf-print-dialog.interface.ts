export default interface PdfPrintDialog {
  /**
   * Abre el diálogo de impresión del sistema utilizando
   * exactamente los bytes del PDF recibido.
   */
  open(pdf: Uint8Array): Promise<void>;
}
