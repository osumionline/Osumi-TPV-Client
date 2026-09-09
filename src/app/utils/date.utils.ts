import { MONTH_OPTIONS, type MonthOption } from '@constants/date.constants';

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

/**
 * Obtiene el nombre completo de un mes.
 */
export function formatMonthName(month: number): string {
  const option: MonthOption | undefined = MONTH_OPTIONS[month - 1];

  return option?.label ?? `Mes ${month}`;
}

/**
 * Obtiene la abreviatura de un mes.
 */
export function formatShortMonthName(month: number): string {
  const option: MonthOption | undefined = MONTH_OPTIONS[month - 1];

  return option?.shortLabel ?? String(month);
}
