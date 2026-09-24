export default interface DatabaseSnapshot {
  /**
   * Crea una copia SQLite consistente y autocontenida
   * de la base de datos operativa.
   */
  create(destinationFile: string): Promise<void>;
}
