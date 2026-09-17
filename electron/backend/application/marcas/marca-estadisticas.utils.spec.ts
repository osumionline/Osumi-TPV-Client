import createMarcaEstadisticasResult from '@backend/application/marcas/marca-estadisticas.utils';
import type { MarcaEstadisticasResultado } from '@desktop-contracts/compras/marcas/marca-estadisticas.interface';
import { describe, expect, it } from 'vitest';

describe('marca-estadisticas.utils', (): void => {
  it('rellena todos los días de un mes bisiesto', (): void => {
    const result: MarcaEstadisticasResultado = createMarcaEstadisticasResult(
      {
        idMarca: 1,
        tipo: 'units',
        year: 2024,
        month: 2,
      },
      {
        years: [2024],
        items: [
          {
            year: 2024,
            month: 2,
            day: 29,
            value: 3,
          },
        ],
      },
    );

    expect(result.points).toHaveLength(29);

    expect(result.points[0]?.value).toBe(0);

    expect(result.points[28]?.value).toBe(3);

    expect(result.total).toBe(3);
  });

  it('rellena los doce meses de un año', (): void => {
    const result: MarcaEstadisticasResultado = createMarcaEstadisticasResult(
      {
        idMarca: 1,
        tipo: 'amount',
        year: 2026,
        month: null,
      },
      {
        years: [2026],
        items: [
          {
            year: 2026,
            month: 9,
            day: null,
            value: 1_500_000,
          },
        ],
      },
    );

    expect(result.points).toHaveLength(12);

    expect(result.points[8]?.value).toBe(1_500_000);

    expect(result.total).toBe(1_500_000);
  });

  it('agrega por años y completa años intermedios', (): void => {
    const result: MarcaEstadisticasResultado = createMarcaEstadisticasResult(
      {
        idMarca: 1,
        tipo: 'units',
        year: null,
        month: null,
      },
      {
        years: [2024, 2026],
        items: [
          {
            year: 2024,
            month: null,
            day: null,
            value: 8,
          },
          {
            year: 2026,
            month: null,
            day: null,
            value: 12,
          },
        ],
      },
    );

    expect(result.availableYears).toEqual([2024, 2025, 2026]);

    expect(result.points).toEqual([
      {
        year: 2024,
        month: null,
        day: null,
        value: 8,
      },
      {
        year: 2025,
        month: null,
        day: null,
        value: 0,
      },
      {
        year: 2026,
        month: null,
        day: null,
        value: 12,
      },
    ]);

    expect(result.total).toBe(20);
  });
});
