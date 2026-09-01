import {
  formatScaledDecimal,
  isTransientScaledDecimalInput,
  numberToScaledInteger,
  parseScaledDecimal,
  rescaleScaledInteger,
} from '@model/articulos/articulo-scaled-decimal.utils';
import { describe, expect, it } from 'vitest';

describe('articulo-scaled-decimal.utils', (): void => {
  it('parses euros with comma directly to microeuros', (): void => {
    expect(parseScaledDecimal('0,59', 6)).toBe(590_000);
  });

  it('parses percentages with decimal point to basis points', (): void => {
    expect(parseScaledDecimal('5.2', 2)).toBe(520);
  });

  it('supports negative percentages', (): void => {
    expect(parseScaledDecimal('-20,5', 6)).toBe(-20_500_000);
  });

  it('rounds decimals that exceed the destination scale', (): void => {
    expect(parseScaledDecimal('26,1234567', 6)).toBe(26_123_457);
  });

  it('converts configuration numbers without chaining monetary floats', (): void => {
    expect(numberToScaledInteger(21, 2)).toBe(2100);
    expect(numberToScaledInteger(5.2, 2)).toBe(520);
    expect(numberToScaledInteger(26, 6)).toBe(26_000_000);
  });

  it('formats microeuros preserving meaningful precision', (): void => {
    expect(formatScaledDecimal(744_580, 6, 2)).toBe('0,74458');
    expect(formatScaledDecimal(590_000, 6, 2)).toBe('0,59');
  });

  it('formats cents with two decimal places', (): void => {
    expect(formatScaledDecimal(101, 2, 2)).toBe('1,01');
  });

  it('formats micropercentages without unnecessary zeros', (): void => {
    expect(formatScaledDecimal(26_000_000, 6)).toBe('26');
  });

  it('detects transient decimal input while the user is typing', (): void => {
    expect(isTransientScaledDecimalInput('')).toBe(true);
    expect(isTransientScaledDecimalInput('-')).toBe(true);
    expect(isTransientScaledDecimalInput('12,')).toBe(true);
    expect(isTransientScaledDecimalInput('12.')).toBe(true);
    expect(isTransientScaledDecimalInput('12,5')).toBe(false);
    expect(isTransientScaledDecimalInput('12.5')).toBe(false);
  });

  it('rejects invalid decimal input', (): void => {
    expect(parseScaledDecimal('abc', 6)).toBeNull();
    expect(parseScaledDecimal('1,2,3', 6)).toBeNull();
  });

  it('reduces microeuros to cents using integer rounding', (): void => {
    expect(rescaleScaledInteger(46_416_360, 6, 2)).toBe(4642);
  });

  it('reduces micropercentages to two decimal percentage precision', (): void => {
    expect(rescaleScaledInteger(15_606_618, 6, 2)).toBe(1561);
  });

  it('expands cents to microeuros without losing precision', (): void => {
    expect(rescaleScaledInteger(3678, 2, 6)).toBe(36_780_000);
  });
});
