import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';

export default class LegacySqlValueReader {
  getRequiredText(insert: LegacySqlInsert, columnName: string): string {
    const value: string | null = this.getValue(insert, columnName);

    if (value === null) {
      throw new Error(
        [`La columna ${insert.tableName}.${columnName}`, 'no puede ser NULL.'].join(' '),
      );
    }

    return value;
  }

  getOptionalText(insert: LegacySqlInsert, columnName: string): string | null {
    return this.getValue(insert, columnName);
  }

  getRequiredInteger(insert: LegacySqlInsert, columnName: string): number {
    const value: string = this.getRequiredText(insert, columnName);

    return this.parseInteger(insert, columnName, value);
  }

  getOptionalInteger(insert: LegacySqlInsert, columnName: string): number | null {
    const value: string | null = this.getValue(insert, columnName);

    if (value === null) {
      return null;
    }

    return this.parseInteger(insert, columnName, value);
  }

  getRequiredBoolean(insert: LegacySqlInsert, columnName: string): boolean {
    const value: string = this.getRequiredText(insert, columnName);

    if (value === '1' || value.toLowerCase() === 'true') {
      return true;
    }

    if (value === '0' || value.toLowerCase() === 'false') {
      return false;
    }

    throw new Error(
      [`El valor ${insert.tableName}.${columnName}`, `no es booleano: ${value}.`].join(' '),
    );
  }

  private getValue(insert: LegacySqlInsert, columnName: string): string | null {
    if (!insert.values.has(columnName)) {
      throw new Error(
        [`La tabla ${insert.tableName}`, `no contiene la columna ${columnName}.`].join(' '),
      );
    }

    return insert.values.get(columnName) ?? null;
  }

  private parseInteger(insert: LegacySqlInsert, columnName: string, value: string): number {
    if (!/^-?\d+$/.test(value)) {
      throw new Error(
        [`El valor ${insert.tableName}.${columnName}`, `no es un entero válido: ${value}.`].join(
          ' ',
        ),
      );
    }

    const result: number = Number(value);

    if (!Number.isSafeInteger(result)) {
      throw new Error(
        [`El valor ${insert.tableName}.${columnName}`, 'supera el rango seguro de enteros.'].join(
          ' ',
        ),
      );
    }

    return result;
  }
}
