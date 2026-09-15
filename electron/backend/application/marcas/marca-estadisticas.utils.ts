import type {
  MarcaEstadisticasAggregateRecord,
  MarcaEstadisticasRepositoryResult,
} from '@backend/domain/marcas/marca-estadisticas-record.interface';
import type {
  MarcaEstadisticasConsulta,
  MarcaEstadisticasPoint,
  MarcaEstadisticasResultado,
} from '@desktop-contracts/marcas/marca-estadisticas.interface';

/**
 * Convierte los agregados SQLite en una serie
 * cronológica completa rellenando huecos a cero.
 */
export default function createMarcaEstadisticasResult(
  consulta: MarcaEstadisticasConsulta,
  repositoryResult: MarcaEstadisticasRepositoryResult,
): MarcaEstadisticasResultado {
  const availableYears: readonly number[] = createYearRange(repositoryResult.years);

  const values: Map<string, number> = createValuesMap(repositoryResult.items);

  const points: readonly MarcaEstadisticasPoint[] = createPoints(consulta, availableYears, values);

  const total: number = points.reduce(
    (accumulator: number, point: MarcaEstadisticasPoint): number => accumulator + point.value,
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
 * a la granularidad solicitada.
 */
function createPoints(
  consulta: MarcaEstadisticasConsulta,
  availableYears: readonly number[],
  values: ReadonlyMap<string, number>,
): readonly MarcaEstadisticasPoint[] {
  if (consulta.year === null) {
    return availableYears.map((year: number): MarcaEstadisticasPoint =>
      createPoint(year, null, null, values),
    );
  }

  if (consulta.month === null) {
    return createMonthPoints(consulta.year, values);
  }

  return createDayPoints(consulta.year, consulta.month, values);
}

/**
 * Crea los doce meses de un año concreto.
 */
function createMonthPoints(
  year: number,
  values: ReadonlyMap<string, number>,
): readonly MarcaEstadisticasPoint[] {
  return Array.from(
    {
      length: 12,
    },
    (_value: unknown, index: number): MarcaEstadisticasPoint =>
      createPoint(year, index + 1, null, values),
  );
}

/**
 * Crea todos los días de un mes concreto.
 */
function createDayPoints(
  year: number,
  month: number,
  values: ReadonlyMap<string, number>,
): readonly MarcaEstadisticasPoint[] {
  const days: number = getDaysInMonth(year, month);

  return Array.from(
    {
      length: days,
    },
    (_value: unknown, index: number): MarcaEstadisticasPoint =>
      createPoint(year, month, index + 1, values),
  );
}

/**
 * Crea un punto temporal obteniendo cero
 * cuando SQLite no devolvió actividad.
 */
function createPoint(
  year: number,
  month: number | null,
  day: number | null,
  values: ReadonlyMap<string, number>,
): MarcaEstadisticasPoint {
  return {
    year,
    month,
    day,
    value: values.get(createPeriodKey(year, month, day)) ?? 0,
  };
}

/**
 * Indexa los agregados persistidos por período.
 */
function createValuesMap(items: readonly MarcaEstadisticasAggregateRecord[]): Map<string, number> {
  return new Map<string, number>(
    items.map((item: MarcaEstadisticasAggregateRecord): readonly [string, number] => [
      createPeriodKey(item.year, item.month, item.day),
      item.value,
    ]),
  );
}

/**
 * Crea una clave estable para un período.
 */
function createPeriodKey(year: number, month: number | null, day: number | null): string {
  return `${year}-${month ?? 0}-${day ?? 0}`;
}

/**
 * Completa los años intermedios aunque
 * no tengan ninguna venta.
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
 * Aplica las reglas gregorianas de año bisiesto.
 */
function isLeapYear(year: number): boolean {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}
