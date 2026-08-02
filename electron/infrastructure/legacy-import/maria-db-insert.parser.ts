import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';

export default class MariaDbInsertParser {
  parse(line: string, lineNumber: number): LegacySqlInsert | null {
    if (!line.startsWith('INSERT INTO ')) {
      return null;
    }

    const match: RegExpMatchArray | null = line.match(
      /^INSERT INTO `([^`]+)` \(([^)]+)\) VALUES \((.*)\);$/,
    );

    if (match === null) {
      throw new Error(
        ['No se ha podido interpretar', `la sentencia INSERT de la línea ${lineNumber}.`].join(' '),
      );
    }

    const tableName: string | undefined = match[1];

    const columnsSource: string | undefined = match[2];

    const valuesSource: string | undefined = match[3];

    if (tableName === undefined || columnsSource === undefined || valuesSource === undefined) {
      throw new Error(`Sentencia INSERT incompleta en la línea ${lineNumber}.`);
    }

    const columns: readonly string[] = this.parseColumns(columnsSource, lineNumber);

    const valueTokens: readonly string[] = this.splitValues(valuesSource, lineNumber);

    if (columns.length !== valueTokens.length) {
      throw new Error(
        [
          `La sentencia INSERT de la línea ${lineNumber}`,
          `contiene ${columns.length} columnas`,
          `y ${valueTokens.length} valores.`,
        ].join(' '),
      );
    }

    const values: Map<string, string | null> = new Map<string, string | null>();

    for (let index: number = 0; index < columns.length; index++) {
      const column: string | undefined = columns[index];

      const valueToken: string | undefined = valueTokens[index];

      if (column === undefined || valueToken === undefined) {
        throw new Error(`Valor incompleto en la línea ${lineNumber}.`);
      }

      values.set(column, this.parseValue(valueToken, lineNumber));
    }

    return {
      tableName,
      values,
    };
  }

  private parseColumns(source: string, lineNumber: number): readonly string[] {
    return source.split(',').map((columnSource: string): string => {
      const normalized: string = columnSource.trim();

      const match: RegExpMatchArray | null = normalized.match(/^`([^`]+)`$/);

      const columnName: string | undefined = match?.[1];

      if (columnName === undefined) {
        throw new Error(
          ['Nombre de columna no válido', `en la línea ${lineNumber}:`, normalized].join(' '),
        );
      }

      return columnName;
    });
  }

  private splitValues(source: string, lineNumber: number): readonly string[] {
    const values: string[] = [];

    let currentValue: string = '';

    let insideString: boolean = false;

    for (let index: number = 0; index < source.length; index++) {
      const character: string = source[index] ?? '';

      const nextCharacter: string = source[index + 1] ?? '';

      if (insideString) {
        currentValue += character;

        if (character === '\\' && nextCharacter !== '') {
          currentValue += nextCharacter;

          index++;

          continue;
        }

        if (character === "'" && nextCharacter === "'") {
          currentValue += nextCharacter;

          index++;

          continue;
        }

        if (character === "'") {
          insideString = false;
        }

        continue;
      }

      if (character === "'") {
        insideString = true;

        currentValue += character;

        continue;
      }

      if (character === ',') {
        values.push(currentValue.trim());

        currentValue = '';

        continue;
      }

      currentValue += character;
    }

    if (insideString) {
      throw new Error(`Cadena SQL sin cerrar en la línea ${lineNumber}.`);
    }

    values.push(currentValue.trim());

    return values;
  }

  private parseValue(token: string, lineNumber: number): string | null {
    if (token === 'NULL') {
      return null;
    }

    if (token.startsWith("'") && token.endsWith("'")) {
      return this.unescapeString(token.slice(1, -1));
    }

    if (token.length === 0) {
      throw new Error(`Valor SQL vacío en la línea ${lineNumber}.`);
    }

    return token;
  }

  private unescapeString(value: string): string {
    let result: string = '';

    for (let index: number = 0; index < value.length; index++) {
      const character: string = value[index] ?? '';

      const nextCharacter: string = value[index + 1] ?? '';

      if (character === "'" && nextCharacter === "'") {
        result += "'";

        index++;

        continue;
      }

      if (character !== '\\' || nextCharacter === '') {
        result += character;

        continue;
      }

      result += this.unescapeCharacter(nextCharacter);

      index++;
    }

    return result;
  }

  private unescapeCharacter(character: string): string {
    switch (character) {
      case '0':
        return '\0';

      case 'b':
        return '\b';

      case 'n':
        return '\n';

      case 'r':
        return '\r';

      case 't':
        return '\t';

      case 'Z':
        return '\u001a';

      case "'":
        return "'";

      case '"':
        return '"';

      case '\\':
        return '\\';

      default:
        return character;
    }
  }
}
