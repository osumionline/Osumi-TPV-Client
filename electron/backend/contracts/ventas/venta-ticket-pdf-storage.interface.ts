export default interface VentaTicketPdfStorage {
  /**
   * Comprueba si existe un PDF vigente para una venta.
   */
  exists(idVenta: number): Promise<boolean>;

  /**
   * Materializa un nuevo PDF vigente.
   *
   * Si ya existe uno, debe archivarlo antes de promover
   * el nuevo documento.
   */
  save(idVenta: number, pdf: Uint8Array): Promise<void>;
}
