/**
 * Escapa los caracteres con significado especial
 * dentro de un patrón SQL LIKE.
 */
export default function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
