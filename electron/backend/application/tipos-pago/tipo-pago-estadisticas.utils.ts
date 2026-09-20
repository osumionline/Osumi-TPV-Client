import type {
  TipoPagoEstadisticasAggregateRecord,
  TipoPagoEstadisticasRepositoryResult,
} from '@backend/domain/tipos-pago/tipo-pago-estadisticas-record.interface';
import type {
  TipoPagoEstadisticasConsulta,
  TipoPagoEstadisticasPoint,
  TipoPagoEstadisticasResultado,
} from '@desktop-contracts/configuration/tipos-pago/tipo-pago-estadisticas.interface';

/**
 * Convierte los agregados persistidos en una
 * serie cronológica completa y calcula el resumen.
 */
export default function createTipoPagoEstadisticasResult(
  consulta: TipoPagoEstadisticasConsulta,
  repositoryResult: TipoPagoEstadisticasRepositoryResult,
): TipoPagoEstadisticasResultado {
  const availableYears: readonly number[] = createYearRange(repositoryResult.years);

  const values: ReadonlyMap<string, number> = createValuesMap(repositoryResult.items);

  const points: readonly TipoPagoEstadisticasPoint[] = createPoints(
    consulta,
    availableYears,
    values,
  );

  const importeMedioCents: number =
    repositoryResult.operaciones === 0
      ? 0
      : Math.round(repositoryResult.totalImporteCents / repositoryResult.operaciones);

  const porcentajeTotalBps: number =
    repositoryResult.totalGlobalCents === 0
      ? 0
      : Math.round(
          (repositoryResult.totalImporteCents / repositoryResult.totalGlobalCents) * 10_000,
        );

  return {
    availableYears,
    points,
    totalImporteCents: repositoryResult.totalImporteCents,
    operaciones: repositoryResult.operaciones,
    importeMedioCents,
    porcentajeTotalBps,
  };
}

/**
 * Construye los puntos correspondientes
 * a la granularidad solicitada.
 */
function createPoints(
  consulta: TipoPagoEstadisticasConsulta,
  availableYears: readonly number[],
  values: ReadonlyMap<string, number>,
): readonly TipoPagoEstadisticasPoint[] {
  if (consulta.year === null) {
    return availableYears.map((year: number): TipoPagoEstadisticasPoint =>
      createPoint(year, null, null, values),
    );
  }

  if (consulta.month === null) {
    return createMonthPoints(consulta.year, values);
  }

  return createDayPoints(consulta.year, consulta.month, values);
}

/**
 * Crea los doce meses del año solicitado.
 */
function createMonthPoints(
  year: number,
  values: ReadonlyMap<string, number>,
): readonly TipoPagoEstadisticasPoint[] {
  return Array.from(
    {
      length: 12,
    },
    (_value: unknown, index: number): TipoPagoEstadisticasPoint =>
      createPoint(year, index + 1, null, values),
  );
}

/**
 * Crea todos los días del mes solicitado.
 */
function createDayPoints(
  year: number,
  month: number,
  values: ReadonlyMap<string, number>,
): readonly TipoPagoEstadisticasPoint[] {
  const days: number = getDaysInMonth(year, month);

  return Array.from(
    {
      length: days,
    },
    (_value: unknown, index: number): TipoPagoEstadisticasPoint =>
      createPoint(year, month, index + 1, values),
  );
}

/**
 * Crea un punto temporal usando cero
 * cuando no existe actividad persistida.
 */
function createPoint(
  year: number,
  month: number | null,
  day: number | null,
  values: ReadonlyMap<string, number>,
): TipoPagoEstadisticasPoint {
  return {
    year,
    month,
    day,
    importeCents: values.get(createPeriodKey(year, month, day)) ?? 0,
  };
}

/**
 * Indexa los agregados por período.
 */
function createValuesMap(
  items: readonly TipoPagoEstadisticasAggregateRecord[],
): ReadonlyMap<string, number> {
  return new Map<string, number>(
    items.map((item: TipoPagoEstadisticasAggregateRecord): readonly [string, number] => [
      createPeriodKey(item.year, item.month, item.day),
      item.importeCents,
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
 * Completa también los años intermedios
 * que no tengan actividad.
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
 * Obtiene el número de días del mes.
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
 * Aplica las reglas gregorianas
 * de año bisiesto.
 */
function isLeapYear(year: number): boolean {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}
