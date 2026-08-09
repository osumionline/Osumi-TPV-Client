import type LegacyImportPhaseImporter from '@backend/contracts/legacy-import/legacy-import-phase-importer.interface';
import type LegacyImportProgressListener from '@backend/contracts/legacy-import/legacy-import-progress-listener.type';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportFileInventoryItem from '@backend/domain/legacy-import/legacy-import-file-inventory-item.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import type { Readable } from 'node:stream';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { QueryRunner } from 'typeorm';
import type { Entry, Options, ZipFile } from 'yauzl';
import { open } from 'yauzl';

type OrderFileType = 'albaran' | 'factura' | 'abono' | 'documento' | 'otro';

interface OrderDatabaseRow {
  readonly id: number;

  readonly tipo: string;

  readonly created_at: string;

  readonly updated_at: string;
}

interface PreparedOrderDocument {
  readonly inventoryItem: LegacyImportFileInventoryItem;

  readonly legacyId: number;

  readonly orderId: number;

  readonly orderType: OrderFileType;

  readonly createdAt: string;

  readonly updatedAt: string;

  readonly packagePath: string;
}

interface PhysicalFileGroup {
  readonly packagePath: string;

  readonly documents: readonly PreparedOrderDocument[];
}

interface ExtractedOrderFile {
  readonly id: number;

  readonly publicId: string;

  readonly group: PhysicalFileGroup;

  readonly originalName: string;

  readonly internalName: string;

  readonly relativePath: string;

  readonly destinationPath: string;

  readonly mimeType: string;

  readonly size: number;

  readonly sha256: string;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface MaximumIdRow {
  readonly maximumId: number;
}

interface MutableImportCounters {
  importedRows: number;

  skippedRows: number;

  warningCount: number;
}

const ORDER_FILE_LOGICAL_CATEGORY: string = 'pdf_pedido';

const ORDER_FILE_SOURCE_TABLE: string = 'pdf_pedido';

const ORDER_FILE_PURPOSE: string = 'order_document';

const ORDER_FILES_DIRECTORY: string = 'orders';

const PDF_MIME_TYPE: string = 'application/pdf';

const MAXIMUM_PDF_SIZE: number = 100 * 1024 * 1024;

export default class LegacyImportOrderFilesImporter implements LegacyImportPhaseImporter {
  constructor(
    private readonly stagingFilesDirectory: string,
    private readonly publicIdFactory: LegacyImportPublicIdFactory,
  ) {}

  async import(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
  ): Promise<LegacyImportPhaseResult> {
    const counters: MutableImportCounters = {
      importedRows: 0,
      skippedRows: 0,
      warningCount: 0,
    };

    const extractedPaths: string[] = [];

    this.reportProgress(
      command,
      progressListener,
      'reading-order-files',
      99,
      'Comprobando los documentos asociados a pedidos…',
    );

    try {
      const orderRows: readonly OrderDatabaseRow[] = await this.readOrders(queryRunner);

      const ordersById: ReadonlyMap<number, OrderDatabaseRow> = new Map<number, OrderDatabaseRow>(
        orderRows.map((order: OrderDatabaseRow): [number, OrderDatabaseRow] => [order.id, order]),
      );

      const preparedDocuments: readonly PreparedOrderDocument[] = this.prepareDocuments(
        command.fileInventory,
        ordersById,
        counters,
      );

      if (preparedDocuments.length === 0) {
        return {
          importedRows: counters.importedRows,
          skippedRows: counters.skippedRows,
          warningCount: counters.warningCount,
        };
      }

      const physicalFileGroups: readonly PhysicalFileGroup[] =
        this.groupDocumentsByPath(preparedDocuments);

      const firstFileId: number = await this.getNextId(queryRunner, 'archivo');

      const firstRelationId: number = await this.getNextId(queryRunner, 'pedido_archivo');

      this.reportProgress(
        command,
        progressListener,
        'extracting-order-files',
        99,
        'Extrayendo y verificando los PDF de pedidos…',
      );

      const extractedFiles: readonly ExtractedOrderFile[] = await this.extractFiles(
        command,
        physicalFileGroups,
        firstFileId,
        extractedPaths,
      );

      await queryRunner.startTransaction();

      try {
        this.reportProgress(
          command,
          progressListener,
          'registering-order-files',
          99,
          'Registrando los PDF en la base temporal…',
        );

        await this.insertFiles(queryRunner, extractedFiles, counters);

        this.reportProgress(
          command,
          progressListener,
          'linking-order-files',
          99,
          'Relacionando los PDF con sus pedidos…',
        );

        await this.insertOrderFileRelations(
          queryRunner,
          command,
          extractedFiles,
          firstRelationId,
          counters,
        );

        await queryRunner.commitTransaction();
      } catch (error: unknown) {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }

        throw error;
      }

      return {
        importedRows: counters.importedRows,
        skippedRows: counters.skippedRows,
        warningCount: counters.warningCount,
      };
    } catch (error: unknown) {
      await this.cleanExtractedFiles(extractedPaths);

      throw new Error('No se han podido importar los PDF de pedidos.', {
        cause: error,
      });
    }
  }

  private async readOrders(queryRunner: QueryRunner): Promise<readonly OrderDatabaseRow[]> {
    return (await queryRunner.query(
      `
        SELECT
          id,
          tipo,
          created_at,
          updated_at
        FROM pedido
      `,
    )) as readonly OrderDatabaseRow[];
  }

  private prepareDocuments(
    inventory: readonly LegacyImportFileInventoryItem[],
    ordersById: ReadonlyMap<number, OrderDatabaseRow>,
    counters: MutableImportCounters,
  ): readonly PreparedOrderDocument[] {
    const result: PreparedOrderDocument[] = [];

    const usedLegacyIds: Set<number> = new Set<number>();

    const orderFileItems: readonly LegacyImportFileInventoryItem[] = inventory.filter(
      (item: LegacyImportFileInventoryItem): boolean =>
        item.logicalCategory === ORDER_FILE_LOGICAL_CATEGORY,
    );

    for (const item of orderFileItems) {
      const included: boolean = item.status === 'included' || item.status === 'included_reference';

      if (!included) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      if (item.sourceTable !== ORDER_FILE_SOURCE_TABLE) {
        throw new Error(
          [`El elemento ${item.packagePath ?? ''}`, 'no pertenece a la tabla pdf_pedido.'].join(
            ' ',
          ),
        );
      }

      const legacyId: number = this.getRequiredPositiveInteger(item.legacyId, 'legacyId', item);

      if (usedLegacyIds.has(legacyId)) {
        throw new Error(
          ['El inventario contiene más de un', `pdf_pedido con el ID ${legacyId}.`].join(' '),
        );
      }

      usedLegacyIds.add(legacyId);

      const orderId: number = this.getRequiredPositiveInteger(item.relatedId, 'relatedId', item);

      const order: OrderDatabaseRow | undefined = ordersById.get(orderId);

      if (order === undefined) {
        throw new Error(
          [`El PDF legacy ${legacyId}`, `referencia el pedido inexistente ${orderId}.`].join(' '),
        );
      }

      const packagePath: string = this.getRequiredPackagePath(item);

      this.assertSafePackagePath(packagePath);

      this.getRequiredSize(item);

      this.getRequiredSha256(item);

      this.assertPdfMimeType(item);

      result.push({
        inventoryItem: item,
        legacyId,
        orderId,
        orderType: this.getOrderFileType(order.tipo),
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        packagePath,
      });
    }

    return result.sort(
      (first: PreparedOrderDocument, second: PreparedOrderDocument): number =>
        first.legacyId - second.legacyId,
    );
  }

  private groupDocumentsByPath(
    documents: readonly PreparedOrderDocument[],
  ): readonly PhysicalFileGroup[] {
    const groupsByPath: Map<string, PreparedOrderDocument[]> = new Map<
      string,
      PreparedOrderDocument[]
    >();

    for (const document of documents) {
      const currentDocuments: PreparedOrderDocument[] =
        groupsByPath.get(document.packagePath) ?? [];

      const firstDocument: PreparedOrderDocument | undefined = currentDocuments[0];

      if (firstDocument !== undefined) {
        this.assertSamePhysicalFile(firstDocument.inventoryItem, document.inventoryItem);
      }

      currentDocuments.push(document);

      groupsByPath.set(document.packagePath, currentDocuments);
    }

    return [...groupsByPath.entries()]
      .sort(
        (
          first: [string, PreparedOrderDocument[]],
          second: [string, PreparedOrderDocument[]],
        ): number => first[0].localeCompare(second[0], 'es'),
      )
      .map(
        ([packagePath, groupDocuments]: [string, PreparedOrderDocument[]]): PhysicalFileGroup => ({
          packagePath,
          documents: groupDocuments.sort(
            (first: PreparedOrderDocument, second: PreparedOrderDocument): number =>
              first.legacyId - second.legacyId,
          ),
        }),
      );
  }

  private async extractFiles(
    command: LegacyImportExecutionCommand,
    groups: readonly PhysicalFileGroup[],
    firstFileId: number,
    extractedPaths: string[],
  ): Promise<readonly ExtractedOrderFile[]> {
    const zipFile: ZipFile = await this.openArchive(command.packagePath);

    try {
      const entries: ReadonlyMap<string, Entry> = await this.readEntryMap(zipFile);

      const result: ExtractedOrderFile[] = [];

      for (let index: number = 0; index < groups.length; index++) {
        const group: PhysicalFileGroup | undefined = groups[index];

        if (group === undefined) {
          continue;
        }

        const firstDocument: PreparedOrderDocument | undefined = group.documents[0];

        if (firstDocument === undefined) {
          continue;
        }

        const entry: Entry | undefined = entries.get(group.packagePath);

        if (entry === undefined) {
          throw new Error(
            ['No se encuentra el archivo', `${group.packagePath} dentro del paquete.`].join(' '),
          );
        }

        const fileId: number = firstFileId + index;

        const publicId: string = this.publicIdFactory.create(
          command.sourceHash,
          'archivo',
          group.packagePath,
        );

        const internalName: string = `${publicId}.pdf`;

        const relativePath: string = ['files', ORDER_FILES_DIRECTORY, internalName].join('/');

        const destinationPath: string = join(
          this.stagingFilesDirectory,
          ORDER_FILES_DIRECTORY,
          internalName,
        );

        const metadata: {
          readonly size: number;

          readonly sha256: string;
        } = await this.extractEntry(zipFile, entry, destinationPath, firstDocument.inventoryItem);

        extractedPaths.push(destinationPath);

        result.push({
          id: fileId,
          publicId,
          group,
          originalName: this.getOriginalName(firstDocument),
          internalName,
          relativePath,
          destinationPath,
          mimeType: PDF_MIME_TYPE,
          size: metadata.size,
          sha256: metadata.sha256,
          createdAt: this.getEarliestCreatedAt(group.documents),
          updatedAt: this.getLatestUpdatedAt(group.documents),
        });
      }

      return result;
    } finally {
      zipFile.close();
    }
  }

  private async insertFiles(
    queryRunner: QueryRunner,
    files: readonly ExtractedOrderFile[],
    counters: MutableImportCounters,
  ): Promise<void> {
    for (const file of files) {
      await queryRunner.query(
        `
          INSERT INTO archivo (
            id,
            public_id,
            purpose,
            original_name,
            internal_name,
            relative_path,
            mime_type,
            size_bytes,
            sha256,
            width,
            height,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            NULL,
            NULL,
            ?,
            ?,
            NULL
          )
        `,
        [
          file.id,
          file.publicId,
          ORDER_FILE_PURPOSE,
          file.originalName,
          file.internalName,
          file.relativePath,
          file.mimeType,
          file.size,
          file.sha256,
          file.createdAt,
          file.updatedAt,
        ],
      );

      counters.importedRows++;
    }
  }

  private async insertOrderFileRelations(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    files: readonly ExtractedOrderFile[],
    firstRelationId: number,
    counters: MutableImportCounters,
  ): Promise<void> {
    const insertedRelationKeys: Set<string> = new Set<string>();

    let nextRelationId: number = firstRelationId;

    for (const file of files) {
      for (const document of file.group.documents) {
        const relationKey: string = [document.orderId, file.id].join(':');

        if (insertedRelationKeys.has(relationKey)) {
          counters.skippedRows++;
          counters.warningCount++;

          continue;
        }

        await queryRunner.query(
          `
            INSERT INTO pedido_archivo (
              id,
              public_id,
              id_pedido,
              id_archivo,
              tipo,
              created_at,
              updated_at
            )
            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?
            )
          `,
          [
            nextRelationId,
            this.publicIdFactory.create(command.sourceHash, 'pedido_archivo', document.legacyId),
            document.orderId,
            file.id,
            document.orderType,
            document.createdAt,
            document.updatedAt,
          ],
        );

        insertedRelationKeys.add(relationKey);

        nextRelationId++;
        counters.importedRows++;
      }
    }
  }

  private async extractEntry(
    zipFile: ZipFile,
    entry: Entry,
    destinationPath: string,
    item: LegacyImportFileInventoryItem,
  ): Promise<{
    readonly size: number;
    readonly sha256: string;
  }> {
    const expectedSize: number = this.getRequiredSize(item);

    if (expectedSize > MAXIMUM_PDF_SIZE) {
      throw new Error([`El archivo ${entry.fileName}`, 'supera los 100 MB permitidos.'].join(' '));
    }

    if (entry.uncompressedSize !== expectedSize) {
      throw new Error(
        [`El tamaño de ${entry.fileName}`, 'no coincide con el inventario.'].join(' '),
      );
    }

    await mkdir(dirname(destinationPath), {
      recursive: true,
    });

    const temporaryPath: string = `${destinationPath}.tmp`;

    await rm(temporaryPath, {
      force: true,
    });

    await rm(destinationPath, {
      force: true,
    });

    const readStream: Readable = await this.openEntryStream(zipFile, entry);

    const hash: ReturnType<typeof createHash> = createHash('sha256');

    let actualSize: number = 0;

    const verifier: Transform = new Transform({
      transform(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error: Error | null, data?: Buffer) => void,
      ): void {
        actualSize += chunk.length;

        hash.update(chunk);

        callback(null, chunk);
      },
    });

    try {
      await pipeline(
        readStream,
        verifier,
        createWriteStream(temporaryPath, {
          mode: 0o600,
        }),
      );

      const actualSha256: string = hash.digest('hex');

      if (actualSize !== expectedSize) {
        throw new Error(
          [`El tamaño extraído de ${entry.fileName}`, 'no coincide con el inventario.'].join(' '),
        );
      }

      if (actualSha256 !== this.getRequiredSha256(item)) {
        throw new Error(
          [`El hash extraído de ${entry.fileName}`, 'no coincide con el inventario.'].join(' '),
        );
      }

      await rename(temporaryPath, destinationPath);

      return {
        size: actualSize,
        sha256: actualSha256,
      };
    } catch (error: unknown) {
      await rm(temporaryPath, {
        force: true,
      });

      await rm(destinationPath, {
        force: true,
      });

      throw error;
    }
  }

  private async getNextId(
    queryRunner: QueryRunner,
    tableName: 'archivo' | 'pedido_archivo',
  ): Promise<number> {
    const rows: readonly MaximumIdRow[] = (await queryRunner.query(
      `
            SELECT
              COALESCE(
                MAX(id),
                0
              ) AS maximumId
            FROM ${tableName}
          `,
    )) as readonly MaximumIdRow[];

    return (rows[0]?.maximumId ?? 0) + 1;
  }

  private openArchive(packagePath: string): Promise<ZipFile> {
    const options: Options = {
      lazyEntries: true,
      autoClose: false,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true,
    };

    return new Promise<ZipFile>((resolve, reject): void => {
      open(packagePath, options, (error: Error | null, zipFile?: ZipFile): void => {
        if (error !== null) {
          reject(error);

          return;
        }

        if (zipFile === undefined) {
          reject(new Error('No se ha podido abrir el paquete .otpv.'));

          return;
        }

        resolve(zipFile);
      });
    });
  }

  private readEntryMap(zipFile: ZipFile): Promise<ReadonlyMap<string, Entry>> {
    return new Promise<ReadonlyMap<string, Entry>>((resolve, reject): void => {
      const entries: Map<string, Entry> = new Map<string, Entry>();

      const cleanup = (): void => {
        zipFile.removeListener('entry', onEntry);

        zipFile.removeListener('end', onEnd);

        zipFile.removeListener('error', onError);
      };

      const onEntry = (entry: Entry): void => {
        if (!entry.fileName.endsWith('/')) {
          entries.set(entry.fileName, entry);
        }

        zipFile.readEntry();
      };

      const onEnd = (): void => {
        cleanup();

        resolve(entries);
      };

      const onError = (error: Error): void => {
        cleanup();

        reject(error);
      };

      zipFile.on('entry', onEntry);
      zipFile.once('end', onEnd);
      zipFile.once('error', onError);
      zipFile.readEntry();
    });
  }

  private openEntryStream(zipFile: ZipFile, entry: Entry): Promise<Readable> {
    return new Promise<Readable>((resolve, reject): void => {
      zipFile.openReadStream(entry, (error: Error | null, stream?: Readable): void => {
        if (error !== null) {
          reject(error);

          return;
        }

        if (stream === undefined) {
          reject(new Error(`No se puede leer ${entry.fileName}.`));

          return;
        }

        resolve(stream);
      });
    });
  }

  private assertSamePhysicalFile(
    first: LegacyImportFileInventoryItem,
    second: LegacyImportFileInventoryItem,
  ): void {
    if (
      this.getRequiredSize(first) !== this.getRequiredSize(second) ||
      this.getRequiredSha256(first) !== this.getRequiredSha256(second) ||
      this.getRequiredMimeType(first) !== this.getRequiredMimeType(second)
    ) {
      throw new Error(
        [`La ruta ${first.packagePath ?? ''}`, 'aparece con metadatos incompatibles.'].join(' '),
      );
    }
  }

  private assertPdfMimeType(item: LegacyImportFileInventoryItem): void {
    const mimeType: string = this.getRequiredMimeType(item).trim().toLocaleLowerCase('en-US');

    if (mimeType !== PDF_MIME_TYPE) {
      throw new Error(
        [`El archivo ${item.packagePath ?? ''}`, `no tiene MIME PDF: ${mimeType}.`].join(' '),
      );
    }
  }

  private assertSafePackagePath(packagePath: string): void {
    const normalized: string = packagePath.replaceAll('\\', '/');

    if (
      normalized.length === 0 ||
      isAbsolute(normalized) ||
      normalized.startsWith('/') ||
      normalized.includes('../') ||
      normalized.includes('/..') ||
      /^[a-zA-Z]:/.test(normalized)
    ) {
      throw new Error(`La ruta ${packagePath} no es segura.`);
    }
  }

  private getOrderFileType(value: string): OrderFileType {
    switch (value) {
      case 'albaran':
        return 'albaran';

      case 'factura':
        return 'factura';

      case 'abono':
        return 'abono';

      default:
        return 'documento';
    }
  }

  private getOriginalName(document: PreparedOrderDocument): string {
    const originalName: string | null =
      document.inventoryItem.originalName ?? document.inventoryItem.storedName;

    if (originalName === null || originalName.trim().length === 0) {
      return `pedido-${document.orderId}-${document.legacyId}.pdf`;
    }

    return basename(originalName);
  }

  private getEarliestCreatedAt(documents: readonly PreparedOrderDocument[]): string {
    return documents.reduce(
      (current: string, document: PreparedOrderDocument): string =>
        document.createdAt < current ? document.createdAt : current,

      documents[0]?.createdAt ?? new Date(0).toISOString(),
    );
  }

  private getLatestUpdatedAt(documents: readonly PreparedOrderDocument[]): string {
    return documents.reduce(
      (current: string, document: PreparedOrderDocument): string =>
        document.updatedAt > current ? document.updatedAt : current,

      documents[0]?.updatedAt ?? new Date(0).toISOString(),
    );
  }

  private getRequiredPositiveInteger(
    value: number | null,
    propertyName: string,
    item: LegacyImportFileInventoryItem,
  ): number {
    if (value === null || !Number.isSafeInteger(value) || value <= 0) {
      throw new Error(
        [`El archivo ${item.packagePath ?? ''}`, `no tiene un ${propertyName} válido.`].join(' '),
      );
    }

    return value;
  }

  private getRequiredPackagePath(item: LegacyImportFileInventoryItem): string {
    if (item.packagePath === null || item.packagePath.trim().length === 0) {
      throw new Error('Un PDF incluido no tiene ruta dentro del paquete.');
    }

    return item.packagePath;
  }

  private getRequiredSize(item: LegacyImportFileInventoryItem): number {
    if (item.size === null || !Number.isSafeInteger(item.size) || item.size < 0) {
      throw new Error(`El archivo ${item.packagePath ?? ''} no tiene un tamaño válido.`);
    }

    return item.size;
  }

  private getRequiredSha256(item: LegacyImportFileInventoryItem): string {
    if (item.sha256 === null || !/^[0-9a-fA-F]{64}$/.test(item.sha256)) {
      throw new Error(`El archivo ${item.packagePath ?? ''} no tiene un SHA-256 válido.`);
    }

    return item.sha256.toLocaleLowerCase('en-US');
  }

  private getRequiredMimeType(item: LegacyImportFileInventoryItem): string {
    if (item.mimeType === null || item.mimeType.trim().length === 0) {
      throw new Error(`El archivo ${item.packagePath ?? ''} no tiene MIME type.`);
    }

    return item.mimeType;
  }

  private async cleanExtractedFiles(paths: readonly string[]): Promise<void> {
    await Promise.all(
      paths.map(async (filePath: string): Promise<void> => {
        try {
          await rm(filePath, {
            force: true,
          });
        } catch (error: unknown) {
          console.error(`No se ha podido eliminar ${filePath}:`, error);
        }
      }),
    );
  }

  private reportProgress(
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
    stage: Parameters<LegacyImportProgressListener>[0]['stage'],
    percentage: number,
    message: string,
  ): void {
    progressListener({
      selectionId: command.selectionId,
      stage,
      percentage,
      message,
    });
  }
}
