import type LegacyImportSqlInsertListener from '@backend/contracts/legacy-import/legacy-import-sql-insert-listener.type';

export default interface LegacyImportDumpReader {
  read(
    packagePath: string,
    expectedTableRows: Readonly<Record<string, number>>,
    tableNames: readonly string[],
    listener: LegacyImportSqlInsertListener,
  ): Promise<void>;
}
