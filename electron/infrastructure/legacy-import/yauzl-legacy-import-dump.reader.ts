import type LegacyImportDumpReader from '@backend/contracts/legacy-import-dump-reader.interface';
import type LegacyImportSqlInsertListener from '@backend/contracts/legacy-import-sql-insert-listener.type';
import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';
import MariaDbInsertParser from '@infrastructure/legacy-import/maria-db-insert.parser';
import type { Interface as ReadLineInterface } from 'node:readline';
import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';
import type { Entry, Options, ZipFile } from 'yauzl';
import { open } from 'yauzl';

export default class YauzlLegacyImportDumpReader implements LegacyImportDumpReader {
  constructor(private readonly insertParser: MariaDbInsertParser) {}

  async read(
    packagePath: string,
    expectedTableRows: Readonly<Record<string, number>>,
    tableNames: readonly string[],
    listener: LegacyImportSqlInsertListener,
  ): Promise<void> {
    const tableNameSet: ReadonlySet<string> = new Set<string>(tableNames);

    const actualTableRows: Map<string, number> = new Map<string, number>();

    const zipFile: ZipFile = await this.openArchive(packagePath);

    try {
      const databaseEntry: Entry = await this.findEntry(zipFile, 'database.sql');

      const databaseStream: Readable = await this.openEntryStream(zipFile, databaseEntry);

      const lineReader: ReadLineInterface = createInterface({
        input: databaseStream,
        crlfDelay: Infinity,
      });

      let lineNumber: number = 0;

      try {
        for await (const line of lineReader) {
          lineNumber++;

          const insert: LegacySqlInsert | null = this.insertParser.parse(line, lineNumber);

          if (insert === null || !tableNameSet.has(insert.tableName)) {
            continue;
          }

          const currentRows: number = actualTableRows.get(insert.tableName) ?? 0;

          actualTableRows.set(insert.tableName, currentRows + 1);

          listener(insert);
        }
      } catch (error: unknown) {
        const errorMessage: string = error instanceof Error ? error.message : String(error);

        throw new Error(
          [
            'No se ha podido leer database.sql',
            `cerca de la línea ${lineNumber}.`,
            `Detalle: ${errorMessage}`,
          ].join(' '),
          {
            cause: error,
          },
        );
      } finally {
        lineReader.close();
      }

      this.validateTableRows(tableNames, expectedTableRows, actualTableRows);
    } finally {
      zipFile.close();
    }
  }

  private validateTableRows(
    tableNames: readonly string[],
    expectedTableRows: Readonly<Record<string, number>>,
    actualTableRows: ReadonlyMap<string, number>,
  ): void {
    for (const tableName of tableNames) {
      const expectedRows: number | undefined = expectedTableRows[tableName];

      if (expectedRows === undefined) {
        throw new Error(
          ['La tabla', tableName, 'no está declarada en export-report.json.'].join(' '),
        );
      }

      const actualRows: number = actualTableRows.get(tableName) ?? 0;

      if (actualRows !== expectedRows) {
        throw new Error(
          [
            `La tabla ${tableName}`,
            `debería contener ${expectedRows} registros`,
            `pero se han leído ${actualRows}.`,
          ].join(' '),
        );
      }
    }
  }

  private openArchive(packagePath: string): Promise<ZipFile> {
    const options: Options = {
      lazyEntries: true,
      autoClose: false,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true,
    };

    return new Promise<ZipFile>(
      (resolve: (zipFile: ZipFile) => void, reject: (reason?: unknown) => void): void => {
        open(packagePath, options, (error: Error | null, zipFile?: ZipFile): void => {
          if (error !== null) {
            reject(
              new Error('No se ha podido abrir el paquete .otpv.', {
                cause: error,
              }),
            );

            return;
          }

          if (zipFile === undefined) {
            reject(new Error('El paquete .otpv no ha proporcionado un archivo ZIP.'));

            return;
          }

          resolve(zipFile);
        });
      },
    );
  }

  private findEntry(zipFile: ZipFile, entryName: string): Promise<Entry> {
    return new Promise<Entry>(
      (resolve: (entry: Entry) => void, reject: (reason?: unknown) => void): void => {
        const cleanup = (): void => {
          zipFile.removeListener('entry', onEntry);
          zipFile.removeListener('end', onEnd);
          zipFile.removeListener('error', onError);
        };

        const onEntry = (entry: Entry): void => {
          if (entry.fileName === entryName) {
            cleanup();
            resolve(entry);
            return;
          }

          zipFile.readEntry();
        };

        const onEnd = (): void => {
          cleanup();
          reject(new Error(`No se ha encontrado ${entryName} en el paquete.`));
        };

        const onError = (error: Error): void => {
          cleanup();

          reject(
            new Error(`No se ha podido localizar ${entryName}.`, {
              cause: error,
            }),
          );
        };

        zipFile.on('entry', onEntry);
        zipFile.once('end', onEnd);
        zipFile.once('error', onError);
        zipFile.readEntry();
      },
    );
  }

  private openEntryStream(zipFile: ZipFile, entry: Entry): Promise<Readable> {
    return new Promise<Readable>(
      (resolve: (stream: Readable) => void, reject: (reason?: unknown) => void): void => {
        zipFile.openReadStream(entry, (error: Error | null, readStream?: Readable): void => {
          if (error !== null) {
            reject(
              new Error(`No se ha podido abrir ${entry.fileName}.`, {
                cause: error,
              }),
            );

            return;
          }

          if (readStream === undefined) {
            reject(new Error(`No se ha obtenido el contenido de ${entry.fileName}.`));

            return;
          }

          resolve(readStream);
        });
      },
    );
  }
}
