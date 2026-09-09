const EURO_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INTEGER_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
});

const DECIMAL_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formatea una cantidad expresada en euros
 * utilizando la representación monetaria española.
 */
export function formatEuros(value: number): string {
  return EURO_FORMATTER.format(value);
}

/**
 * Formatea un número sin decimales.
 */
export function formatInteger(value: number): string {
  return INTEGER_FORMATTER.format(value);
}

/**
 * Formatea un número con exactamente dos decimales.
 */
export function formatDecimal(value: number): string {
  return DECIMAL_FORMATTER.format(value);
}
