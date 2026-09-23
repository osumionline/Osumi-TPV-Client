import InformePeriodoResolver from '@backend/application/caja/informes/informe-periodo.resolver';
import type {
  InformeMes,
  InformePeriodoConsulta,
} from '@desktop-contracts/caja/informes/informe-periodo.interface';
import { describe, expect, it } from 'vitest';

describe('InformePeriodoResolver', (): void => {
  it('resuelve un mes y el mes inmediatamente anterior', (): void => {
    const resolver: InformePeriodoResolver = new InformePeriodoResolver();

    const result = resolver.resolve({
      year: 2026,
      month: 7,
    });

    expect(result.actual.year).toBe(2026);
    expect(result.actual.month).toBe(7);
    expectLocalBoundary(result.actual.desde, 2026, 7, 1);
    expectLocalBoundary(result.actual.hastaExclusive, 2026, 8, 1);

    expect(result.anterior.year).toBe(2026);
    expect(result.anterior.month).toBe(6);
    expectLocalBoundary(result.anterior.desde, 2026, 6, 1);
    expectLocalBoundary(result.anterior.hastaExclusive, 2026, 7, 1);
  });

  it('resuelve enero contra diciembre del año anterior', (): void => {
    const resolver: InformePeriodoResolver = new InformePeriodoResolver();

    const result = resolver.resolve({
      year: 2026,
      month: 1,
    });

    expect(result.actual.year).toBe(2026);
    expect(result.actual.month).toBe(1);

    expect(result.anterior.year).toBe(2025);
    expect(result.anterior.month).toBe(12);

    expectLocalBoundary(result.anterior.desde, 2025, 12, 1);
    expectLocalBoundary(result.anterior.hastaExclusive, 2026, 1, 1);
  });

  it('resuelve Todos contra el año natural anterior completo', (): void => {
    const resolver: InformePeriodoResolver = new InformePeriodoResolver();

    const result = resolver.resolve({
      year: 2026,
      month: 'todos',
    });

    expect(result.actual).toMatchObject({
      year: 2026,
      month: 'todos',
    });

    expectLocalBoundary(result.actual.desde, 2026, 1, 1);
    expectLocalBoundary(result.actual.hastaExclusive, 2027, 1, 1);

    expect(result.anterior).toMatchObject({
      year: 2025,
      month: 'todos',
    });

    expectLocalBoundary(result.anterior.desde, 2025, 1, 1);
    expectLocalBoundary(result.anterior.hastaExclusive, 2026, 1, 1);
  });

  it('respeta febrero de un año bisiesto', (): void => {
    const resolver: InformePeriodoResolver = new InformePeriodoResolver();

    const result = resolver.resolve({
      year: 2024,
      month: 2,
    });

    expectLocalBoundary(result.actual.desde, 2024, 2, 1);
    expectLocalBoundary(result.actual.hastaExclusive, 2024, 3, 1);

    const lastDay: Date = new Date(result.actual.hastaExclusive);

    lastDay.setDate(lastDay.getDate() - 1);

    expect(lastDay.getFullYear()).toBe(2024);
    expect(lastDay.getMonth()).toBe(1);
    expect(lastDay.getDate()).toBe(29);
  });

  it('rechaza años no válidos', (): void => {
    const resolver: InformePeriodoResolver = new InformePeriodoResolver();

    expect((): void => {
      resolver.resolve({
        year: 0,
        month: 1,
      });
    }).toThrow('El año del informe no es válido.');

    expect((): void => {
      resolver.resolve({
        year: 2026.5,
        month: 1,
      });
    }).toThrow('El año del informe no es válido.');
  });

  it('rechaza meses no válidos recibidos en runtime', (): void => {
    const resolver: InformePeriodoResolver = new InformePeriodoResolver();

    const consulta = {
      year: 2026,
      month: 13,
    } as unknown as InformePeriodoConsulta;

    expect((): void => {
      resolver.resolve(consulta);
    }).toThrow('El mes del informe no es válido.');
  });

  it('acepta todos como periodo anual', (): void => {
    const resolver: InformePeriodoResolver = new InformePeriodoResolver();

    const month: InformeMes = 'todos';

    expect(
      resolver.resolve({
        year: 2026,
        month,
      }).actual.month,
    ).toBe('todos');
  });
});

/**
 * Comprueba que un ISO UTC representa la medianoche
 * civil esperada en la zona horaria local del test.
 */
function expectLocalBoundary(iso: string, year: number, month: number, day: number): void {
  const date: Date = new Date(iso);

  expect(date.getFullYear()).toBe(year);
  expect(date.getMonth()).toBe(month - 1);
  expect(date.getDate()).toBe(day);
  expect(date.getHours()).toBe(0);
  expect(date.getMinutes()).toBe(0);
  expect(date.getSeconds()).toBe(0);
  expect(date.getMilliseconds()).toBe(0);
}
