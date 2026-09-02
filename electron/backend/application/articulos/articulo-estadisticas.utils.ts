import type {
  ArticuloEstadisticasAggregateRecord,
  ArticuloEstadisticasRepositoryResult,
} from '@backend/domain/articulos/articulo-estadisticas-record.interface';
import type {
  ArticuloEstadisticasConsulta,
  ArticuloEstadisticasPoint,
  ArticuloEstadisticasResultado,
} from '@desktop-contracts/articulos/articulo-estadisticas.interface';

/**
 * Convierte los agregados existentes en SQLite
 * en una serie cronológica completa con huecos a cero.
 */
export default function createArticuloEstadisticasResult(
  consulta: ArticuloEstadisticasConsulta,
  repositoryResult: ArticuloEstadisticasRepositoryResult,
): ArticuloEstadisticasResultado {
  const availableYears: readonly number[] = createYearRange(repositoryResult.years);
  const values: Map<string, number> = createValuesMap(repositoryResult.items);
  const points: readonly ArticuloEstadisticasPoint[] = createPoints(
    consulta,
    availableYears,
    values,
  );
  const total: number = points.reduce(
    (accumulator: number, point: ArticuloEstadisticasPoint): number => accumulator + point.value,
    0,
  );

  return {
    tipo: consulta.tipo,
    availableYears,
    points,
    total,
  };
}

/**
 * Construye todos los puntos correspondientes
 * a los filtros solicitados.
 */
function createPoints(
  consulta: ArticuloEstadisticasConsulta,
  availableYears: readonly number[],
  values: ReadonlyMap<string, number>,
): readonly ArticuloEstadisticasPoint[] {
  if (consulta.year !== null) {
    return consulta.month === null
      ? createYearPoints(consulta.year, values)
      : createMonthPoints(consulta.year, consulta.month, values);
  }

  if (consulta.month !== null) {
    return availableYears.map((year: number): ArticuloEstadisticasPoint =>
      createPoint(year, consulta.month as number, null, values),
    );
  }

  return availableYears.flatMap((year: number): readonly ArticuloEstadisticasPoint[] =>
    createYearPoints(year, values),
  );
}

/**
 * Crea los doce meses de un año.
 */
function createYearPoints(
  year: number,
  values: ReadonlyMap<string, number>,
): readonly ArticuloEstadisticasPoint[] {
  return Array.from(
    {
      length: 12,
    },
    (_value: unknown, index: number): ArticuloEstadisticasPoint =>
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
): readonly ArticuloEstadisticasPoint[] {
  const days: number = getDaysInMonth(year, month);

  return Array.from(
    {
      length: days,
    },
    (_value: unknown, index: number): ArticuloEstadisticasPoint =>
      createPoint(year, month, index + 1, values),
  );
}

/**
 * Crea un punto recuperando cero cuando SQLite
 * no devolvió actividad para ese período.
 */
function createPoint(
  year: number,
  month: number,
  day: number | null,
  values: ReadonlyMap<string, number>,
): ArticuloEstadisticasPoint {
  return {
    year,
    month,
    day,
    value: values.get(createPeriodKey(year, month, day)) ?? 0,
  };
}

/**
 * Indexa los agregados existentes por período.
 */
function createValuesMap(
  items: readonly ArticuloEstadisticasAggregateRecord[],
): Map<string, number> {
  return new Map<string, number>(
    items.map((item: ArticuloEstadisticasAggregateRecord): readonly [string, number] => [
      createPeriodKey(item.year, item.month, item.day),
      item.value,
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
 * Completa los años intermedios aunque uno de ellos
 * no contenga ninguna venta.
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
 * Obtiene el número de días del mes sin depender
 * del comportamiento especial de Date para años 0..99.
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
