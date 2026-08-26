export default interface VentaTicketPdfStorage {
  /**
   * Comprueba si existe un PDF vigente para una venta.
   */
  exists(idVenta: number): Promise<boolean>;

  /**
   * Recupera el PDF actualmente vigente de una venta.
   *
   * Devuelve null cuando el archivo no existe físicamente.
   */
  read(idVenta: number): Promise<Uint8Array | null>;

  /**
   * Materializa un nuevo PDF vigente.
   *
   * Si ya existe uno, debe archivarlo antes de promover
   * el nuevo documento.
   */
  save(idVenta: number, pdf: Uint8Array): Promise<void>;
}
