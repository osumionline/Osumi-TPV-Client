import type { ClienteConsumoMensualRepositoryResult } from '@backend/contracts/clientes/cliente-estadisticas-record.interface';
import type {
  ClienteConsumoMensualConsulta,
  ClienteConsumoMensualPoint,
  ClienteConsumoMensualResultado,
} from '@desktop-contracts/clientes/cliente-consumo-mensual.interface';

/**
 * Convierte los agregados de SQLite en una serie
 * cronológica completa con los huecos rellenados a cero.
 */
export default function createClienteConsumoMensualResult(
  consulta: ClienteConsumoMensualConsulta,
  repositoryResult: ClienteConsumoMensualRepositoryResult,
): ClienteConsumoMensualResultado {
  const availableYears: readonly number[] = createYearRange(repositoryResult.years);
  const values: ReadonlyMap<string, number> = createValuesMap(repositoryResult.items);

  const points: readonly ClienteConsumoMensualPoint[] = createPoints(
    consulta,
    availableYears,
    values,
  );

  const totalMicros: number = points.reduce(
    (total: number, point: ClienteConsumoMensualPoint): number =>
      safeAdd(total, point.importeMicros),
    0,
  );

  return {
    availableYears,
    points,
    totalMicros,
  };
}

/**
 * Construye los puntos correspondientes a la
 * combinación de año y mes solicitada.
 */
function createPoints(
  consulta: ClienteConsumoMensualConsulta,
  availableYears: readonly number[],
  values: ReadonlyMap<string, number>,
): readonly ClienteConsumoMensualPoint[] {
  if (consulta.year !== null) {
    return consulta.month === null
      ? createYearPoints(consulta.year, values)
      : createMonthPoints(consulta.year, consulta.month, values);
  }

  if (consulta.month !== null) {
    const selectedMonth: number = consulta.month;

    return availableYears.map((year: number): ClienteConsumoMensualPoint =>
      createPoint(year, selectedMonth, null, values),
    );
  }

  return availableYears.flatMap((year: number): readonly ClienteConsumoMensualPoint[] =>
    createYearPoints(year, values),
  );
}

/**
 * Crea los doce meses de un año.
 */
function createYearPoints(
  year: number,
  values: ReadonlyMap<string, number>,
): readonly ClienteConsumoMensualPoint[] {
  return Array.from(
    {
      length: 12,
    },
    (_value: unknown, index: number): ClienteConsumoMensualPoint =>
      createPoint(year, index + 1, null, values),
  );
}

/**
 * Crea todos los días de un mes concreto.
 */
function createMonthPoints(
  year: number,
  month: number,
  values: ReadonlyMap<string, number>,
): readonly ClienteConsumoMensualPoint[] {
  const days: number = getDaysInMonth(year, month);

  return Array.from(
    {
      length: days,
    },
    (_value: unknown, index: number): ClienteConsumoMensualPoint =>
      createPoint(year, month, index + 1, values),
  );
}

/**
 * Crea un punto temporal utilizando cero cuando
 * SQLite no devolvió actividad para el período.
 */
function createPoint(
  year: number,
  month: number,
  day: number | null,
  values: ReadonlyMap<string, number>,
): ClienteConsumoMensualPoint {
  return {
    year,
    month,
    day,
    importeMicros: values.get(createPeriodKey(year, month, day)) ?? 0,
  };
}

/**
 * Indexa los agregados recuperados de SQLite.
 */
function createValuesMap(
  items: ClienteConsumoMensualRepositoryResult['items'],
): ReadonlyMap<string, number> {
  return new Map<string, number>(
    items.map((item): readonly [string, number] => [
      createPeriodKey(item.year, item.month, item.day),
      item.importeMicros,
    ]),
  );
}

/**
 * Crea la clave estable de un período.
 */
function createPeriodKey(year: number, month: number, day: number | null): string {
  return `${year}-${month}-${day ?? 0}`;
}

/**
 * Completa los años intermedios aunque alguno
 * no tenga ventas asociadas.
 */
function createYearRange(years: readonly number[]): readonly number[] {
  if (years.length === 0) {
    return [];
  }

  const firstYear: number = Math.min(...years);
  const lastYear: number = Math.max(...years);

  return Array.from(
    {
      length: lastYear - firstYear + 1,
    },
    (_value: unknown, index: number): number => firstYear + index,
  );
}

/**
 * Obtiene el número de días de un mes.
 */
function getDaysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;

    case 4:
    case 6:
    case 9:
    case 11:
      return 30;

    default:
      return 31;
  }
}

/**
 * Comprueba las reglas gregorianas de año bisiesto.
 */
function isLeapYear(year: number): boolean {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

/**
 * Suma dos importes comprobando que continúen
 * dentro del rango entero seguro.
 */
function safeAdd(left: number, right: number): number {
  const result: number = left + right;

  if (!Number.isSafeInteger(result)) {
    throw new Error('El total del consumo mensual supera el rango numérico seguro.');
  }

  return result;
}
