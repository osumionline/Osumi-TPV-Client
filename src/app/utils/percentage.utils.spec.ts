import { bpsToPercent, percentToBps } from '@utils/percentage.utils';

describe('percentage.utils', (): void => {
  it('convierte porcentajes a puntos básicos', (): void => {
    expect(percentToBps(21)).toBe(2_100);

    expect(percentToBps(10.5)).toBe(1_050);

    expect(percentToBps(100)).toBe(10_000);
  });

  it('convierte puntos básicos a porcentaje', (): void => {
    expect(bpsToPercent(2_100)).toBe(21);

    expect(bpsToPercent(1_050)).toBe(10.5);

    expect(bpsToPercent(10_000)).toBe(100);
  });

  it('no impone reglas de rango propias del dominio', (): void => {
    expect(percentToBps(125)).toBe(12_500);

    expect(bpsToPercent(-500)).toBe(-5);
  });

  it('rechaza porcentajes no numéricos', (): void => {
    expect((): number => percentToBps(Number.NaN)).toThrow('El porcentaje no es válido.');
  });
});
