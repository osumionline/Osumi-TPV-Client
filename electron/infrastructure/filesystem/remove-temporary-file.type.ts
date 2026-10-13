/**
 * Operación asíncrona de eliminación de un archivo
 * temporal sin error cuando el archivo no existe.
 *
 * Permite sustituir la operación real del filesystem
 * por una implementación controlada en pruebas.
 */
type RemoveTemporaryFile = (
  filePath: string,
  options: {
    readonly force: boolean;
  },
) => Promise<void>;

export default RemoveTemporaryFile;
