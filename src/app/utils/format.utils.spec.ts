import { formatDecimal, formatEuros, formatInteger } from '@utils/format.utils';

describe('format.utils', (): void => {
  it('formatea importes en euros con dos decimales', (): void => {
    expect(formatEuros(0)).toBe('0,00\u00a0€');
    expect(formatEuros(12.5)).toBe('12,50\u00a0€');
    expect(formatEuros(12_345.67)).toBe('12.345,67\u00a0€');
    expect(formatEuros(-12.5)).toBe('-12,50\u00a0€');
  });

  it('formatea números enteros según la configuración española', (): void => {
    expect(formatInteger(0)).toBe('0');
    expect(formatInteger(12_345)).toBe('12.345');
    expect(formatInteger(-12_345)).toBe('-12.345');
  });

  it('mantiene el comportamiento de redondeo del formatter entero', (): void => {
    expect(formatInteger(12.4)).toBe('12');
    expect(formatInteger(12.6)).toBe('13');
  });

  it('formatea números con exactamente dos decimales', (): void => {
    expect(formatDecimal(0)).toBe('0,00');
    expect(formatDecimal(12.5)).toBe('12,50');
    expect(formatDecimal(12_345.67)).toBe('12.345,67');
    expect(formatDecimal(-12.5)).toBe('-12,50');
  });
});
