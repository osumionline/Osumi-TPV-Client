/**
 * Escapa un texto antes de incorporarlo a un documento HTML.
 *
 * Los builders de documentos imprimibles reciben datos
 * editables por el usuario y nunca deben interpolarlos
 * directamente.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
