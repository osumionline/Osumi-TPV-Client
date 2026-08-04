export default class LegacyImportNumberConverter {
  toMicros(value: number, fieldName: string): number {
    return this.multiplyAndRound(value, 1_000_000, fieldName);
  }

  toCents(value: number, fieldName: string): number {
    return this.multiplyAndRound(value, 100, fieldName);
  }

  toBasisPoints(percentage: number, fieldName: string): number {
    return this.multiplyAndRound(percentage, 100, fieldName);
  }

  toMicropercentage(percentage: number, fieldName: string): number {
    return this.multiplyAndRound(percentage, 1_000_000, fieldName);
  }

  private multiplyAndRound(value: number, multiplier: number, fieldName: string): number {
    if (!Number.isFinite(value)) {
      throw new Error(`El valor ${fieldName} no es finito.`);
    }

    const result: number = Math.round(value * multiplier);

    if (!Number.isSafeInteger(result)) {
      throw new Error(
        [`El valor convertido de ${fieldName}`, 'supera el rango seguro de enteros.'].join(' '),
      );
    }

    return result;
  }
}
