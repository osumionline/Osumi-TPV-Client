export default interface LegacyImportPackageSummary {
  readonly selectionId: string;

  readonly fileName: string;

  readonly packageSize: number;

  readonly archiveEntries: number;

  readonly uncompressedSize: number;

  readonly formatVersion: number;

  readonly applicationVersion: string;

  readonly frameworkVersion: string;

  readonly databaseVersion: string;

  readonly schemaVersion: string;

  readonly createdAt: string;

  readonly tables: number;

  readonly expectedTables: number;

  readonly totalRows: number;

  readonly dumpSize: number;

  readonly includedFiles: number;

  readonly optionalFilesNotPresent: number;

  readonly warnings: readonly string[];
}
