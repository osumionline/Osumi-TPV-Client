import createTipoPagoEstadisticasResult from '@backend/application/tipos-pago/tipo-pago-estadisticas.utils';
import type { TipoPagoEstadisticasResultado } from '@desktop-contracts/configuration/tipos-pago/tipo-pago-estadisticas.interface';
import { describe, expect, it } from 'vitest';

describe('tipo-pago-estadisticas.utils', (): void => {
  it('rellena los días y calcula el resumen del período', (): void => {
    const result: TipoPagoEstadisticasResultado = createTipoPagoEstadisticasResult(
      {
        idTipoPago: 2,
        year: 2026,
        month: 9,
      },
      {
        years: [2025, 2026],
        items: [
          {
            year: 2026,
            month: 9,
            day: 1,
            importeCents: 1_500,
          },
          {
            year: 2026,
            month: 9,
            day: 2,
            importeCents: -500,
          },
        ],
        totalImporteCents: 1_000,
        operaciones: 2,
        totalGlobalCents: 1_500,
      },
    );

    expect(result.points).toHaveLength(30);

    expect(result.points[0]?.importeCents).toBe(1_500);

    expect(result.points[1]?.importeCents).toBe(-500);

    expect(result.points[2]?.importeCents).toBe(0);

    expect(result.totalImporteCents).toBe(1_000);

    expect(result.operaciones).toBe(2);

    expect(result.importeMedioCents).toBe(500);

    expect(result.porcentajeTotalBps).toBe(6_667);
  });

  it('devuelve medias y porcentaje cero sin actividad', (): void => {
    const result: TipoPagoEstadisticasResultado = createTipoPagoEstadisticasResult(
      {
        idTipoPago: 2,
        year: 2026,
        month: null,
      },
      {
        years: [],
        items: [],
        totalImporteCents: 0,
        operaciones: 0,
        totalGlobalCents: 0,
      },
    );

    expect(result.points).toHaveLength(12);

    expect(result.importeMedioCents).toBe(0);

    expect(result.porcentajeTotalBps).toBe(0);
  });
});
