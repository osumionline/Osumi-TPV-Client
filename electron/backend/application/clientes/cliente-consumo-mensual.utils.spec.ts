import createClienteConsumoMensualResult from '@backend/application/clientes/cliente-consumo-mensual.utils';
import type { ClienteConsumoMensualRepositoryResult } from '@backend/contracts/clientes/cliente-estadisticas-record.interface';
import type { ClienteConsumoMensualResultado } from '@desktop-contracts/clientes/cliente-consumo-mensual.interface';
import { describe, expect, it } from 'vitest';

describe('cliente-consumo-mensual.utils', (): void => {
  it('rellena todos los días de un mes bisiesto', (): void => {
    const repositoryResult: ClienteConsumoMensualRepositoryResult = {
      years: [2024],
      items: [
        {
          year: 2024,
          month: 2,
          day: 29,
          importeMicros: 3_000_000,
        },
      ],
    };

    const result: ClienteConsumoMensualResultado = createClienteConsumoMensualResult(
      {
        clientePublicId: 'cliente-1',
        year: 2024,
        month: 2,
      },
      repositoryResult,
    );

    expect(result.points).toHaveLength(29);
    expect(result.points[0]?.importeMicros).toBe(0);
    expect(result.points[28]?.importeMicros).toBe(3_000_000);
    expect(result.totalMicros).toBe(3_000_000);
  });

  it('rellena los doce meses de un año', (): void => {
    const result: ClienteConsumoMensualResultado = createClienteConsumoMensualResult(
      {
        clientePublicId: 'cliente-1',
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
            importeMicros: 1_500_000,
          },
        ],
      },
    );

    expect(result.points).toHaveLength(12);
    expect(result.points[8]?.importeMicros).toBe(1_500_000);
    expect(result.totalMicros).toBe(1_500_000);
  });

  it('incluye años intermedios al comparar un mes', (): void => {
    const result: ClienteConsumoMensualResultado = createClienteConsumoMensualResult(
      {
        clientePublicId: 'cliente-1',
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
            importeMicros: 8_000_000,
          },
          {
            year: 2026,
            month: 9,
            day: null,
            importeMicros: 12_000_000,
          },
        ],
      },
    );

    expect(result.availableYears).toEqual([2024, 2025, 2026]);

    expect(result.points.map((point): number => point.importeMicros)).toEqual([
      8_000_000, 0, 12_000_000,
    ]);

    expect(result.totalMicros).toBe(20_000_000);
  });

  it('crea todos los meses cronológicos cuando no hay filtros', (): void => {
    const result: ClienteConsumoMensualResultado = createClienteConsumoMensualResult(
      {
        clientePublicId: 'cliente-1',
        year: null,
        month: null,
      },
      {
        years: [2024, 2026],
        items: [
          {
            year: 2024,
            month: 12,
            day: null,
            importeMicros: -1_000_000,
          },
          {
            year: 2026,
            month: 1,
            day: null,
            importeMicros: 4_000_000,
          },
        ],
      },
    );

    expect(result.availableYears).toEqual([2024, 2025, 2026]);
    expect(result.points).toHaveLength(36);
    expect(result.points[11]?.importeMicros).toBe(-1_000_000);
    expect(result.points[12]?.importeMicros).toBe(0);
    expect(result.points[24]?.importeMicros).toBe(4_000_000);
    expect(result.totalMicros).toBe(3_000_000);
  });

  it('rechaza un total fuera del rango entero seguro', (): void => {
    expect((): ClienteConsumoMensualResultado =>
      createClienteConsumoMensualResult(
        {
          clientePublicId: 'cliente-1',
          year: 2026,
          month: null,
        },
        {
          years: [2026],
          items: [
            {
              year: 2026,
              month: 1,
              day: null,
              importeMicros: Number.MAX_SAFE_INTEGER,
            },
            {
              year: 2026,
              month: 2,
              day: null,
              importeMicros: 1,
            },
          ],
        },
      ),
    ).toThrow('El total del consumo mensual supera el rango numérico seguro.');
  });
});
