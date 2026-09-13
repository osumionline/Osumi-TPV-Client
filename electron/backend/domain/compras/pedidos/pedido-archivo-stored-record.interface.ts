/**
 * Describe un PDF ya materializado dentro del
 * almacenamiento gestionado de la aplicación.
 */
export default interface PedidoArchivoStoredRecord {
  readonly originalName: string;
  readonly internalName: string;
  readonly relativePath: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly sha256: string;
}
