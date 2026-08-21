export default interface VentaTicketPdfStorage {
  /**
   * Conserva definitivamente el PDF original de una venta.
   *
   * Si el documento ya existe, debe preservarse el archivo
   * original y la operación se considera idempotente.
   */
  save(idVenta: number, pdf: Uint8Array): Promise<void>;
}
