import createArticuloEstadisticasResult from '@backend/application/articulos/articulo-estadisticas.utils';
import type { ArticuloEstadisticasRepositoryResult } from '@backend/domain/articulos/articulo-estadisticas-record.interface';
import type { ArticuloEstadisticasResultado } from '@desktop-contracts/articulos/articulo-estadisticas.interface';
import { describe, expect, it } from 'vitest';

describe('articulo-estadisticas.utils', (): void => {
  it('rellena todos los días de un mes bisiesto', (): void => {
    const repositoryResult: ArticuloEstadisticasRepositoryResult = {
      years: [2024],
      items: [
        {
          year: 2024,
          month: 2,
          day: 29,
          value: 3,
        },
      ],
    };

    const result: ArticuloEstadisticasResultado = createArticuloEstadisticasResult(
      {
        idArticulo: 1,
        tipo: 'unidades',
        year: 2024,
        month: 2,
      },
      repositoryResult,
    );

    expect(result.points).toHaveLength(29);
    expect(result.points[0]?.value).toBe(0);
    expect(result.points[28]?.value).toBe(3);
    expect(result.total).toBe(3);
  });

  it('rellena los doce meses de un año', (): void => {
    const result: ArticuloEstadisticasResultado = createArticuloEstadisticasResult(
      {
        idArticulo: 1,
        tipo: 'importe',
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

  it('incluye años intermedios sin ventas al comparar un mes', (): void => {
    const result: ArticuloEstadisticasResultado = createArticuloEstadisticasResult(
      {
        idArticulo: 1,
        tipo: 'unidades',
        year: null,
        month: 9,
      },
      {
        years: [2024, 2026],
        items: [
          {
            year: 2024,
            month: 9,
            day: null,
            value: 8,
          },
          {
            year: 2026,
            month: 9,
            day: null,
            value: 12,
          },
        ],
      },
    );

    expect(result.availableYears).toEqual([2024, 2025, 2026]);
    expect(result.points.map((point): number => point.value)).toEqual([8, 0, 12]);
  });
});
