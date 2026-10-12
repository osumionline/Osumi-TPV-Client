/**
 * Comprueba defensivamente si un error del filesystem
 * contiene el código indicado por Node.js.
 */
export default function hasFileSystemErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { readonly code: unknown }).code === code
  );
}
