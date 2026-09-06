export default interface ClienteFacturaPdfStorage {
  /**
   * Recupera los bytes definitivos almacenados
   * para una factura.
   */
  read(facturaPublicId: string): Promise<Uint8Array | null>;

  /**
   * Conserva el primer PDF definitivo de una factura.
   *
   * Si ya existe uno válido, nunca debe sustituirlo.
   */
  save(facturaPublicId: string, pdf: Uint8Array): Promise<void>;
}
