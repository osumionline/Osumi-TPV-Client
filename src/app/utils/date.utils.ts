/**
 * Formatea una fecha cuyo valor comienza por YYYY-MM-DD
 * al formato DD/MM/YYYY.
 *
 * No crea un Date ni realiza conversiones de zona horaria.
 * Si el valor no contiene una fecha reconocible, se devuelve
 * sin modificar.
 */
export function formatIsoDateToSpanishDate(value: string): string {
  const normalizedValue: string = value.trim();

  const match: RegExpExecArray | null = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalizedValue);

  if (match === null) {
    return value;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}
