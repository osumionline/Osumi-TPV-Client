import type LegacyImportPackageInspector from '@backend/contracts/legacy-import/legacy-import-package-inspector.interface';
import type LegacyImportFileInventoryItem from '@backend/domain/legacy-import/legacy-import-file-inventory-item.interface';
import type LegacyImportFileInventoryStatus from '@backend/domain/legacy-import/legacy-import-file-inventory-status.type';
import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.interface';
import {
  LEGACY_IMPORT_APPLICATION_NAME,
  LEGACY_IMPORT_MAX_ENTRY_COUNT,
  LEGACY_IMPORT_MAX_JSON_SIZE,
  LEGACY_IMPORT_MAX_PACKAGE_SIZE,
  LEGACY_IMPORT_MAX_UNCOMPRESSED_SIZE,
  LEGACY_IMPORT_REQUIRED_ENTRIES,
  LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION,
  LEGACY_IMPORT_SUPPORTED_SCHEMA_VERSION,
} from '@backend/domain/legacy-import/legacy-import.constants';
import { createHash } from 'node:crypto';
import type { Stats } from 'node:fs';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import type { Readable } from 'node:stream';
import type { Entry, Options, ZipFile } from 'yauzl';
import { open } from 'yauzl';

interface LegacyExportReportData {
  readonly tables: number;

  readonly expectedTables: number;

  readonly totalRows: number;

  readonly dumpSize: number;

  readonly includedFiles: number;

  readonly optionalFilesNotPresent: number;

  readonly warnings: readonly string[];

  readonly tableRows: Readonly<Record<string, number>>;

  readonly fileInventory: readonly LegacyImportFileInventoryItem[];
}

export default class YauzlLegacyImportPackageInspector implements LegacyImportPackageInspector {
  async inspect(packagePath: string): Promise<LegacyImportPackageInspection> {
    const packageStats: Stats = await stat(packagePath);

    this.assertPackageFile(packagePath, packageStats);

    const packageSha256: string = await this.hashFile(packagePath);

    const zipFile: ZipFile = await this.openArchive(packagePath);

    try {
      const entries: readonly Entry[] = await this.readEntries(zipFile);

      const entriesByName: ReadonlyMap<string, Entry> = this.createEntryMap(entries);

      this.assertRequiredEntries(entriesByName);

      const totalUncompressedSize: number = this.getTotalUncompressedSize(entries);

      const manifest: Record<string, unknown> = await this.readJsonEntry(
        zipFile,
        this.getRequiredEntry(entriesByName, 'manifest.json'),
      );

      const checksums: Record<string, unknown> = await this.readJsonEntry(
        zipFile,
        this.getRequiredEntry(entriesByName, 'checksums.json'),
      );

      const exportReport: Record<string, unknown> = await this.readJsonEntry(
        zipFile,
        this.getRequiredEntry(entriesByName, 'export-report.json'),
      );

      await this.readJsonEntry(zipFile, this.getRequiredEntry(entriesByName, 'app_data.json'));

      const manifestData: {
        readonly formatVersion: number;
        readonly applicationVersion: string;
        readonly frameworkVersion: string;
        readonly databaseVersion: string;
        readonly schemaVersion: string;
        readonly createdAt: string;
      } = this.validateManifest(manifest);

      const reportData: LegacyExportReportData = this.validateExportReport(exportReport);

      const databaseEntry: Entry = this.getRequiredEntry(entriesByName, 'database.sql');

      if (databaseEntry.uncompressedSize !== reportData.dumpSize) {
        throw new Error(
          ['El tamaño de database.sql no coincide', 'con el indicado en export-report.json.'].join(
            ' ',
          ),
        );
      }

      const checksumFiles: Readonly<Record<string, string>> = this.validateChecksums(checksums);

      await this.verifyChecksums(zipFile, entriesByName, checksumFiles);

      return {
        summary: {
          fileName: basename(packagePath),
          packageSize: packageStats.size,
          archiveEntries: entriesByName.size,
          uncompressedSize: totalUncompressedSize,
          formatVersion: manifestData.formatVersion,
          applicationVersion: manifestData.applicationVersion,
          frameworkVersion: manifestData.frameworkVersion,
          databaseVersion: manifestData.databaseVersion,
          schemaVersion: manifestData.schemaVersion,
          createdAt: manifestData.createdAt,
          tables: reportData.tables,
          expectedTables: reportData.expectedTables,
          totalRows: reportData.totalRows,
          dumpSize: reportData.dumpSize,
          includedFiles: reportData.includedFiles,
          optionalFilesNotPresent: reportData.optionalFilesNotPresent,
          warnings: reportData.warnings,
        },
        tableRows: reportData.tableRows,
        fileInventory: reportData.fileInventory,
        packageSha256,
      };
    } finally {
      zipFile.close();
    }
  }

  private assertPackageFile(packagePath: string, packageStats: Stats): void {
    if (!packageStats.isFile()) {
      throw new Error('El paquete seleccionado no es un archivo.');
    }

    if (extname(packagePath).toLowerCase() !== '.otpv') {
      throw new Error('El archivo seleccionado no tiene la extensión .otpv.');
    }

    if (packageStats.size === 0) {
      throw new Error('El paquete seleccionado está vacío.');
    }

    if (packageStats.size > LEGACY_IMPORT_MAX_PACKAGE_SIZE) {
      throw new Error('El paquete seleccionado supera el tamaño máximo permitido.');
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
      (
        resolve: (zipFile: ZipFile) => void,

        reject: (reason?: unknown) => void,
      ): void => {
        open(
          packagePath,
          options,

          (error: Error | null, zipFile?: ZipFile): void => {
            if (error !== null) {
              reject(
                new Error('El archivo seleccionado no es un ZIP válido.', {
                  cause: error,
                }),
              );

              return;
            }

            if (zipFile === undefined) {
              reject(new Error('No se ha podido abrir el paquete .otpv.'));

              return;
            }

            resolve(zipFile);
          },
        );
      },
    );
  }

  private readEntries(zipFile: ZipFile): Promise<readonly Entry[]> {
    return new Promise<readonly Entry[]>(
      (
        resolve: (entries: readonly Entry[]) => void,

        reject: (reason?: unknown) => void,
      ): void => {
        const entries: Entry[] = [];

        const cleanup = (): void => {
          zipFile.removeListener('entry', onEntry);

          zipFile.removeListener('end', onEnd);

          zipFile.removeListener('error', onError);
        };

        const onError = (error: Error): void => {
          cleanup();

          reject(
            new Error('No se ha podido leer el índice del paquete.', {
              cause: error,
            }),
          );
        };

        const onEnd = (): void => {
          cleanup();

          resolve(entries);
        };

        const onEntry = (entry: Entry): void => {
          try {
            if (entries.length >= LEGACY_IMPORT_MAX_ENTRY_COUNT) {
              throw new Error('El paquete contiene demasiadas entradas.');
            }

            this.assertEntryName(entry.fileName);

            if ((entry.generalPurposeBitFlag & 0x1) !== 0) {
              throw new Error(
                [
                  'El paquete contiene una entrada',
                  'cifrada que no puede procesarse:',
                  entry.fileName,
                ].join(' '),
              );
            }

            entries.push(entry);

            zipFile.readEntry();
          } catch (error: unknown) {
            cleanup();

            reject(error);
          }
        };

        zipFile.on('entry', onEntry);

        zipFile.once('end', onEnd);

        zipFile.once('error', onError);

        zipFile.readEntry();
      },
    );
  }

  private assertEntryName(entryName: string): void {
    if (
      entryName.includes('\0') ||
      entryName.includes('\\') ||
      entryName.startsWith('/') ||
      /^[a-zA-Z]:/.test(entryName)
    ) {
      throw new Error(`Ruta no válida dentro del paquete: ${entryName}`);
    }

    const segments: readonly string[] = entryName.split('/');

    if (segments.some((segment: string): boolean => segment === '..' || segment === '.')) {
      throw new Error(`Ruta insegura dentro del paquete: ${entryName}`);
    }
  }

  private createEntryMap(entries: readonly Entry[]): ReadonlyMap<string, Entry> {
    const result: Map<string, Entry> = new Map<string, Entry>();

    for (const entry of entries) {
      if (this.isDirectoryEntry(entry)) {
        continue;
      }

      if (result.has(entry.fileName)) {
        throw new Error(`El paquete contiene una entrada duplicada: ${entry.fileName}`);
      }

      result.set(entry.fileName, entry);
    }

    return result;
  }

  private isDirectoryEntry(entry: Entry): boolean {
    return entry.fileName.endsWith('/');
  }

  private assertRequiredEntries(entries: ReadonlyMap<string, Entry>): void {
    for (const requiredEntry of LEGACY_IMPORT_REQUIRED_ENTRIES) {
      if (!entries.has(requiredEntry)) {
        throw new Error(`Falta el archivo obligatorio ${requiredEntry}.`);
      }
    }
  }

  private getRequiredEntry(
    entries: ReadonlyMap<string, Entry>,

    entryName: string,
  ): Entry {
    const entry: Entry | undefined = entries.get(entryName);

    if (entry === undefined) {
      throw new Error(`No se ha encontrado ${entryName}.`);
    }

    return entry;
  }

  private getTotalUncompressedSize(entries: readonly Entry[]): number {
    let totalSize: number = 0;

    for (const entry of entries) {
      if (this.isDirectoryEntry(entry)) {
        continue;
      }

      totalSize += entry.uncompressedSize;

      if (totalSize > LEGACY_IMPORT_MAX_UNCOMPRESSED_SIZE) {
        throw new Error(
          ['El contenido descomprimido del paquete', 'supera el tamaño máximo permitido.'].join(
            ' ',
          ),
        );
      }
    }

    return totalSize;
  }

  private async readJsonEntry(zipFile: ZipFile, entry: Entry): Promise<Record<string, unknown>> {
    if (entry.uncompressedSize > LEGACY_IMPORT_MAX_JSON_SIZE) {
      throw new Error(`El archivo ${entry.fileName} es demasiado grande.`);
    }

    const content: Buffer = await this.readEntryBuffer(zipFile, entry, LEGACY_IMPORT_MAX_JSON_SIZE);

    let parsed: unknown;

    try {
      parsed = JSON.parse(content.toString('utf8')) as unknown;
    } catch (error: unknown) {
      throw new Error(`El archivo ${entry.fileName} no contiene un JSON válido.`, {
        cause: error,
      });
    }

    if (!this.isRecord(parsed)) {
      throw new Error(`El archivo ${entry.fileName} no contiene un objeto JSON válido.`);
    }

    return parsed;
  }

  private readEntryBuffer(zipFile: ZipFile, entry: Entry, maximumSize: number): Promise<Buffer> {
    return new Promise<Buffer>(
      (
        resolve: (buffer: Buffer) => void,

        reject: (reason?: unknown) => void,
      ): void => {
        zipFile.openReadStream(
          entry,

          (
            error: Error | null,

            readStream?: Readable,
          ): void => {
            if (error !== null) {
              reject(error);

              return;
            }

            if (readStream === undefined) {
              reject(new Error(`No se ha podido leer ${entry.fileName}.`));

              return;
            }

            const chunks: Buffer[] = [];

            let currentSize: number = 0;

            readStream.on(
              'data',

              (chunk: Buffer | string): void => {
                const buffer: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

                currentSize += buffer.length;

                if (currentSize > maximumSize) {
                  readStream.destroy(
                    new Error(`El archivo ${entry.fileName} supera el tamaño permitido.`),
                  );

                  return;
                }

                chunks.push(buffer);
              },
            );

            readStream.once(
              'error',

              (streamError: Error): void => {
                reject(streamError);
              },
            );

            readStream.once(
              'end',

              (): void => {
                resolve(Buffer.concat(chunks));
              },
            );
          },
        );
      },
    );
  }

  private validateManifest(manifest: Record<string, unknown>): {
    readonly formatVersion: number;
    readonly applicationVersion: string;
    readonly frameworkVersion: string;
    readonly databaseVersion: string;
    readonly schemaVersion: string;
    readonly createdAt: string;
  } {
    const formatVersion: number = this.getNumber(manifest, 'formatVersion', 'manifest.json');

    const application: string = this.getString(manifest, 'application', 'manifest.json');

    const applicationVersion: string = this.getString(
      manifest,
      'applicationVersion',
      'manifest.json',
    );

    const frameworkVersion: string = this.getString(manifest, 'frameworkVersion', 'manifest.json');

    const databaseVersion: string = this.getString(manifest, 'databaseVersion', 'manifest.json');

    const schemaVersion: string = this.getString(manifest, 'schemaVersion', 'manifest.json');

    const createdAt: string = this.getString(manifest, 'createdAt', 'manifest.json');

    if (formatVersion !== LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION) {
      throw new Error(`Versión de formato .otpv no soportada: ${formatVersion}.`);
    }

    if (application !== LEGACY_IMPORT_APPLICATION_NAME) {
      throw new Error('El paquete no pertenece a Osumi TPV.');
    }

    if (schemaVersion !== LEGACY_IMPORT_SUPPORTED_SCHEMA_VERSION) {
      throw new Error(`Versión de esquema legacy no soportada: ${schemaVersion}.`);
    }

    if (Number.isNaN(Date.parse(createdAt))) {
      throw new Error('La fecha de creación del paquete no es válida.');
    }

    return {
      formatVersion,
      applicationVersion,
      frameworkVersion,
      databaseVersion,
      schemaVersion,
      createdAt,
    };
  }

  private validateExportReport(report: Record<string, unknown>): LegacyExportReportData {
    const status: string = this.getString(report, 'status', 'export-report.json');

    if (status !== 'success') {
      throw new Error('El informe indica que la exportación no terminó correctamente.');
    }

    const database: Record<string, unknown> = this.getRecord(
      report,
      'database',
      'export-report.json',
    );

    const tableRowsValue: Record<string, unknown> = this.getRecord(
      database,
      'tableRows',
      'export-report.json',
    );

    const tableRows: Record<string, number> = {};

    for (const [tableName, rowCountValue] of Object.entries(tableRowsValue)) {
      if (
        typeof rowCountValue !== 'number' ||
        !Number.isSafeInteger(rowCountValue) ||
        rowCountValue < 0
      ) {
        throw new Error(
          ['El número de registros de la tabla', `${tableName} no es válido.`].join(' '),
        );
      }

      tableRows[tableName] = rowCountValue;
    }

    const files: Record<string, unknown> = this.getRecord(report, 'files', 'export-report.json');

    const fileInventory: readonly LegacyImportFileInventoryItem[] =
      this.validateFileInventory(files);

    const missingTables: readonly string[] = this.getStringArray(
      database,
      'missingTables',
      'export-report.json',
    );

    const errors: readonly string[] = this.getStringArray(report, 'errors', 'export-report.json');

    if (missingTables.length > 0) {
      throw new Error(
        ['La exportación no contiene todas las tablas:', missingTables.join(', ')].join(' '),
      );
    }

    if (errors.length > 0) {
      throw new Error(['El exportador registró errores:', errors.join(' ')].join(' '));
    }

    return {
      tables: this.getNumber(database, 'tables', 'export-report.json'),
      expectedTables: this.getNumber(database, 'expectedTables', 'export-report.json'),
      totalRows: this.getNumber(database, 'totalRows', 'export-report.json'),
      dumpSize: this.getNumber(database, 'dumpSize', 'export-report.json'),
      includedFiles: this.getNumber(files, 'included', 'export-report.json'),
      optionalFilesNotPresent: this.getNumber(files, 'optionalNotPresent', 'export-report.json'),
      warnings: this.getStringArray(report, 'warnings', 'export-report.json'),
      tableRows,
      fileInventory,
    };
  }

  private validateFileInventory(
    files: Record<string, unknown>,
  ): readonly LegacyImportFileInventoryItem[] {
    const inventoryValue: unknown = files['inventory'];

    if (!Array.isArray(inventoryValue)) {
      throw new Error('El inventario de archivos de export-report.json no es válido.');
    }

    return inventoryValue.map(
      (
        value: unknown,

        index: number,
      ): LegacyImportFileInventoryItem => {
        if (!this.isRecord(value)) {
          throw new Error(`El elemento ${index} del inventario de archivos no es válido.`);
        }

        const status: LegacyImportFileInventoryStatus = this.getFileInventoryStatus(value, index);

        const packagePath: string | null = this.getNullableString(
          value,
          'packagePath',
          `files.inventory[${index}]`,
        );

        if (packagePath !== null) {
          this.assertEntryName(packagePath);
        }

        const size: number | null = this.getNullableInteger(
          value,
          'size',
          `files.inventory[${index}]`,
        );

        const sha256Value: string | null = this.getNullableString(
          value,
          'sha256',
          `files.inventory[${index}]`,
        );

        const sha256: string | null = sha256Value === null ? null : sha256Value.toLowerCase();

        if (sha256 !== null && !/^[0-9a-f]{64}$/.test(sha256)) {
          throw new Error(`El hash del elemento ${index} del inventario no es válido.`);
        }

        const item: LegacyImportFileInventoryItem = {
          logicalCategory: this.getString(value, 'logicalCategory', `files.inventory[${index}]`),

          sourceTable: this.getNullableString(value, 'sourceTable', `files.inventory[${index}]`),

          legacyId: this.getNullableInteger(value, 'legacyId', `files.inventory[${index}]`),

          relatedId: this.getNullableInteger(value, 'relatedId', `files.inventory[${index}]`),

          packagePath,

          originalName: this.getNullableString(value, 'originalName', `files.inventory[${index}]`),

          storedName: this.getNullableString(value, 'storedName', `files.inventory[${index}]`),

          size,

          mimeType: this.getNullableString(value, 'mimeType', `files.inventory[${index}]`),

          sha256,
          status,
        };

        if (status === 'included' || status === 'included_reference') {
          if (
            item.packagePath === null ||
            item.storedName === null ||
            item.size === null ||
            item.mimeType === null ||
            item.sha256 === null
          ) {
            throw new Error(
              [
                `El elemento ${index} del inventario`,
                'está incluido pero sus metadatos están incompletos.',
              ].join(' '),
            );
          }
        }

        return item;
      },
    );
  }

  private getFileInventoryStatus(
    source: Record<string, unknown>,
    index: number,
  ): LegacyImportFileInventoryStatus {
    const status: string = this.getString(source, 'status', `files.inventory[${index}]`);

    const validStatuses: readonly LegacyImportFileInventoryStatus[] = [
      'included',
      'included_reference',
      'absent',
      'not_present',
      'unreadable',
      'invalid_reference',
    ];

    if (!validStatuses.includes(status as LegacyImportFileInventoryStatus)) {
      throw new Error(`El estado del elemento ${index} del inventario no es válido.`);
    }

    return status as LegacyImportFileInventoryStatus;
  }

  private validateChecksums(checksums: Record<string, unknown>): Readonly<Record<string, string>> {
    const algorithm: string = this.getString(checksums, 'algorithm', 'checksums.json');

    if (algorithm.toLowerCase() !== 'sha256') {
      throw new Error(`Algoritmo de checksum no soportado: ${algorithm}.`);
    }

    const filesValue: Record<string, unknown> = this.getRecord(
      checksums,
      'files',
      'checksums.json',
    );

    const files: Record<string, string> = {};

    for (const [fileName, checksum] of Object.entries(filesValue)) {
      if (typeof checksum !== 'string' || !/^[a-f0-9]{64}$/i.test(checksum)) {
        throw new Error(`Checksum no válido para ${fileName}.`);
      }

      this.assertEntryName(fileName);

      files[fileName] = checksum.toLowerCase();
    }

    return files;
  }

  private async verifyChecksums(
    zipFile: ZipFile,

    entries: ReadonlyMap<string, Entry>,

    expectedChecksums: Readonly<Record<string, string>>,
  ): Promise<void> {
    for (const [entryName, entry] of entries) {
      if (entryName === 'checksums.json') {
        continue;
      }

      const expectedChecksum: string | undefined = expectedChecksums[entryName];

      if (expectedChecksum === undefined) {
        throw new Error(`No existe checksum para ${entryName}.`);
      }

      const actualChecksum: string = await this.hashEntry(zipFile, entry);

      if (actualChecksum !== expectedChecksum) {
        throw new Error(`El checksum de ${entryName} no es válido.`);
      }
    }

    for (const fileName of Object.keys(expectedChecksums)) {
      if (!entries.has(fileName)) {
        throw new Error(`checksums.json referencia un archivo inexistente: ${fileName}.`);
      }
    }
  }

  private hashFile(filePath: string): Promise<string> {
    return new Promise<string>(
      (
        resolve: (checksum: string) => void,

        reject: (reason?: unknown) => void,
      ): void => {
        const hash: ReturnType<typeof createHash> = createHash('sha256');
        const readStream: ReturnType<typeof createReadStream> = createReadStream(filePath);

        readStream.on('data', (chunk: Buffer | string): void => {
          hash.update(chunk);
        });

        readStream.once('error', (error: Error): void => {
          reject(
            new Error('No se ha podido calcular el hash del paquete .otpv.', {
              cause: error,
            }),
          );
        });

        readStream.once('end', (): void => {
          resolve(hash.digest('hex'));
        });
      },
    );
  }

  private hashEntry(zipFile: ZipFile, entry: Entry): Promise<string> {
    return new Promise<string>(
      (
        resolve: (checksum: string) => void,

        reject: (reason?: unknown) => void,
      ): void => {
        zipFile.openReadStream(
          entry,

          (
            error: Error | null,

            readStream?: Readable,
          ): void => {
            if (error !== null) {
              reject(error);

              return;
            }

            if (readStream === undefined) {
              reject(new Error(`No se ha podido calcular el checksum de ${entry.fileName}.`));

              return;
            }

            const hash: ReturnType<typeof createHash> = createHash('sha256');

            readStream.on(
              'data',

              (chunk: Buffer | string): void => {
                hash.update(chunk);
              },
            );

            readStream.once(
              'error',

              (streamError: Error): void => {
                reject(streamError);
              },
            );

            readStream.once(
              'end',

              (): void => {
                resolve(hash.digest('hex'));
              },
            );
          },
        );
      },
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private getRecord(
    source: Record<string, unknown>,

    property: string,

    sourceName: string,
  ): Record<string, unknown> {
    const value: unknown = source[property];

    if (!this.isRecord(value)) {
      throw new Error(`La propiedad ${property} de ${sourceName} no es válida.`);
    }

    return value;
  }

  private getNullableString(
    source: Record<string, unknown>,

    property: string,

    sourceName: string,
  ): string | null {
    const value: unknown = source[property];

    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new Error(`La propiedad ${property} de ${sourceName} no es válida.`);
    }

    return value;
  }

  private getNullableInteger(
    source: Record<string, unknown>,

    property: string,

    sourceName: string,
  ): number | null {
    const value: unknown = source[property];

    if (value === null) {
      return null;
    }

    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
      throw new Error(`La propiedad ${property} de ${sourceName} no es válida.`);
    }

    return value;
  }

  private getString(
    source: Record<string, unknown>,

    property: string,

    sourceName: string,
  ): string {
    const value: unknown = source[property];

    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`La propiedad ${property} de ${sourceName} no es válida.`);
    }

    return value;
  }

  private getNumber(
    source: Record<string, unknown>,

    property: string,

    sourceName: string,
  ): number {
    const value: unknown = source[property];

    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`La propiedad ${property} de ${sourceName} no es válida.`);
    }

    return value;
  }

  private getStringArray(
    source: Record<string, unknown>,

    property: string,

    sourceName: string,
  ): readonly string[] {
    const value: unknown = source[property];

    if (
      !Array.isArray(value) ||
      !value.every((item: unknown): item is string => typeof item === 'string')
    ) {
      throw new Error(`La propiedad ${property} de ${sourceName} no es válida.`);
    }

    return value;
  }
}
