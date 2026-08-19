import {
  calculateBpsAmountMicros,
  calculateProportionalMicros,
  centsToEuros,
  centsToMicros,
  eurosToCents,
  eurosToMicros,
  microsToCents,
  microsToEuros,
} from '@utils/money.utils';

describe('money.utils', (): void => {
  it('convierte céntimos a microeuros', (): void => {
    expect(centsToMicros(1_234)).toBe(12_340_000);

    expect(centsToMicros(-1_234)).toBe(-12_340_000);
  });

  it('convierte céntimos a euros sin redondeo adicional', (): void => {
    expect(centsToEuros(1_234)).toBe(12.34);

    expect(centsToEuros(-1_234)).toBe(-12.34);
  });

  it('convierte microeuros a céntimos con redondeo simétrico', (): void => {
    expect(microsToCents(15_000)).toBe(2);

    expect(microsToCents(-15_000)).toBe(-2);

    expect(microsToCents(14_999)).toBe(1);

    expect(microsToCents(-14_999)).toBe(-1);
  });

  it('convierte microeuros a euros sin redondeo adicional', (): void => {
    expect(microsToEuros(12_340_000)).toBe(12.34);

    expect(microsToEuros(-12_340_000)).toBe(-12.34);
  });

  it('convierte euros a céntimos con redondeo simétrico', (): void => {
    expect(eurosToCents(12.346)).toBe(1_235);
    expect(eurosToCents(12.344)).toBe(1_234);

    expect(eurosToCents(-12.346)).toBe(-1_235);
    expect(eurosToCents(-12.344)).toBe(-1_234);
  });

  it('convierte euros a microeuros redondeando primero a céntimos', (): void => {
    expect(eurosToMicros(12.346)).toBe(12_350_000);

    expect(eurosToMicros(12.344)).toBe(12_340_000);

    expect(eurosToMicros(-12.346)).toBe(-12_350_000);
  });

  it('calcula un importe porcentual expresado en puntos básicos', (): void => {
    expect(calculateBpsAmountMicros(20_000_000, 1_000)).toBe(2_000_000);
  });

  it('calcula importes proporcionales con redondeo entero', (): void => {
    expect(calculateProportionalMicros(10_000_000, 1, 3)).toBe(3_333_333);

    expect(calculateProportionalMicros(10_000_000, 3, 3)).toBe(10_000_000);
  });

  it('permite calcular más unidades que las originalmente totales', (): void => {
    expect(calculateProportionalMicros(18_000_000, 3, 2)).toBe(27_000_000);
  });

  it('rechaza un cálculo proporcional que supere el rango seguro', (): void => {
    expect((): number => calculateProportionalMicros(Number.MAX_SAFE_INTEGER, 2, 1)).toThrow(
      'El cálculo proporcional supera el rango numérico seguro.',
    );
  });
});
