import {
  formatIsoDateToSpanishDate,
  formatMonthName,
  formatShortMonthName,
} from '@utils/date.utils';

describe('date.utils', (): void => {
  it('formatea una fecha YYYY-MM-DD', (): void => {
    expect(formatIsoDateToSpanishDate('2026-08-16')).toBe('16/08/2026');
  });

  it('ignora la hora posterior a la fecha', (): void => {
    expect(formatIsoDateToSpanishDate('2026-08-16 17:30:45')).toBe('16/08/2026');

    expect(formatIsoDateToSpanishDate('2026-08-16T17:30:45')).toBe('16/08/2026');
  });

  it('no realiza conversiones de zona horaria', (): void => {
    expect(formatIsoDateToSpanishDate('2026-08-16T23:30:00Z')).toBe('16/08/2026');
  });

  it('acepta espacios exteriores', (): void => {
    expect(formatIsoDateToSpanishDate('  2026-08-16  ')).toBe('16/08/2026');
  });

  it('devuelve sin modificar un valor no reconocible', (): void => {
    expect(formatIsoDateToSpanishDate('fecha desconocida')).toBe('fecha desconocida');
  });

  it('obtiene los nombres completos de los meses', (): void => {
    expect(formatMonthName(1)).toBe('Enero');
    expect(formatMonthName(6)).toBe('Junio');
    expect(formatMonthName(12)).toBe('Diciembre');
  });

  it('obtiene las abreviaturas de los meses', (): void => {
    expect(formatShortMonthName(1)).toBe('Ene');
    expect(formatShortMonthName(8)).toBe('Ago');
    expect(formatShortMonthName(12)).toBe('Dic');
  });

  it('mantiene un fallback explícito para meses desconocidos', (): void => {
    expect(formatMonthName(0)).toBe('Mes 0');
    expect(formatMonthName(13)).toBe('Mes 13');
    expect(formatShortMonthName(0)).toBe('0');
    expect(formatShortMonthName(13)).toBe('13');
  });
});
