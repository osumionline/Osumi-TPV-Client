/**
 * Valida un identificador opcional utilizado
 * por filtros de los subdominios de Almacén.
 */
export default function validateOptionalId(value: unknown, message: string): number | null {
  if (value === null) {
    return null;
  }

  if (!Number.isSafeInteger(value) || typeof value !== 'number' || value <= 0) {
    throw new Error(message);
  }

  return value;
}
