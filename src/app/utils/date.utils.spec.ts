import { formatIsoDateToSpanishDate } from '@utils/date.utils';

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
});
