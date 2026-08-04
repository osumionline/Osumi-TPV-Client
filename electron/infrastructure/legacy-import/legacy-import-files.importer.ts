import type LegacyImportCatalogReader from '@backend/contracts/legacy-import-catalog-reader.interface';
import type LegacyImportPhaseImporter from '@backend/contracts/legacy-import-phase-importer.interface';
import type LegacyImportProgressListener from '@backend/contracts/legacy-import-progress-listener.type';
import type LegacyImportCatalogSnapshot from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportFileInventoryItem from '@backend/domain/legacy-import/legacy-import-file-inventory-item.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type { Readable } from 'node:stream';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { QueryRunner } from 'typeorm';
import type { Entry, Options, ZipFile } from 'yauzl';
import { open } from 'yauzl';

type SupportedFileCategory = 'foto' | 'marca' | 'proveedor' | 'tipo_pago';

interface FileCategoryDefinition {
  readonly purpose: string;

  readonly directory: string;

  readonly sourceTable: string;
}

interface ExtractedLegacyFile {
  readonly id: number;

  readonly publicId: string;

  readonly inventoryItem: LegacyImportFileInventoryItem;

  readonly purpose: string;

  readonly internalName: string;

  readonly relativePath: string;

  readonly size: number;

  readonly mimeType: string;

  readonly sha256: string;

  readonly createdAt: string;

  readonly updatedAt: string;
}

interface MaximumIdRow {
  readonly maximumId: number;
}

interface IdRow {
  readonly id: number;
}

interface MutableCounters {
  importedRows: number;

  skippedRows: number;

  warningCount: number;
}

const MAXIMUM_IMAGE_SIZE: number = 50 * 1024 * 1024;

const CATEGORY_DEFINITIONS: Readonly<Record<SupportedFileCategory, FileCategoryDefinition>> = {
  foto: {
    purpose: 'article_image',

    directory: 'articles',

    sourceTable: 'foto',
  },

  marca: {
    purpose: 'brand_image',

    directory: 'brands',

    sourceTable: 'marca',
  },

  proveedor: {
    purpose: 'provider_image',

    directory: 'providers',

    sourceTable: 'proveedor',
  },

  tipo_pago: {
    purpose: 'payment_type_icon',

    directory: 'payment-types',

    sourceTable: 'tipo_pago',
  },
};

export default class LegacyImportFilesImporter implements LegacyImportPhaseImporter {
  constructor(
    private readonly stagingFilesDirectory: string,
    private readonly catalogReader: LegacyImportCatalogReader,
    private readonly publicIdFactory: LegacyImportPublicIdFactory,
  ) {}

  async import(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
  ): Promise<LegacyImportPhaseResult> {
    const counters: MutableCounters = {
      importedRows: 0,
      skippedRows: 0,
      warningCount: 0,
    };

    await this.resetStagingFiles();

    try {
      this.reportProgress(
        command,
        progressListener,
        'verifying-package-files',
        91,
        'Comprobando de nuevo la integridad del paquete…',
      );

      await this.assertPackageHash(command.packagePath, command.sourceHash);

      const catalog: LegacyImportCatalogSnapshot = await this.catalogReader.read(
        command.packagePath,
        command.expectedTableRows,
      );

      const includedItems: readonly LegacyImportFileInventoryItem[] = this.getIncludedItems(
        command.fileInventory,
      );

      this.validateIncludedReferences(includedItems, catalog);

      this.reportProgress(
        command,
        progressListener,
        'extracting-files',
        92,
        'Extrayendo fotografías e imágenes…',
      );

      const firstFileId: number = await this.getNextFileId(queryRunner);

      const extractedFiles: readonly ExtractedLegacyFile[] = await this.extractFiles(
        command,
        includedItems,
        catalog,
        firstFileId,
      );

      await queryRunner.startTransaction();

      try {
        this.reportProgress(
          command,
          progressListener,
          'registering-files',
          93,
          'Registrando los archivos importados…',
        );

        await this.insertFiles(queryRunner, extractedFiles);

        this.reportProgress(
          command,
          progressListener,
          'linking-files',
          94,
          'Relacionando imágenes con sus registros…',
        );

        await this.linkArticleFiles(queryRunner, catalog, extractedFiles, counters);

        await this.linkEntityFiles(queryRunner, extractedFiles);

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
      await this.cleanAfterError();

      throw new Error('No se han podido importar los archivos del paquete legacy.', {
        cause: error,
      });
    }
  }

  private getIncludedItems(
    inventory: readonly LegacyImportFileInventoryItem[],
  ): readonly LegacyImportFileInventoryItem[] {
    return inventory.filter(
      (item: LegacyImportFileInventoryItem): boolean =>
        this.isSupportedCategory(item.logicalCategory) &&
        (item.status === 'included' || item.status === 'included_reference'),
    );
  }

  private validateIncludedReferences(
    items: readonly LegacyImportFileInventoryItem[],

    catalog: LegacyImportCatalogSnapshot,
  ): void {
    const photoIds: ReadonlySet<number> = new Set<number>(
      catalog.photos.map((photo): number => photo.id),
    );

    for (const item of items) {
      const category: SupportedFileCategory = this.getSupportedCategory(item.logicalCategory);

      const definition: FileCategoryDefinition = CATEGORY_DEFINITIONS[category];

      if (item.sourceTable !== definition.sourceTable) {
        throw new Error(
          [`El archivo ${item.packagePath ?? ''}`, 'no corresponde con su tabla de origen.'].join(
            ' ',
          ),
        );
      }

      const legacyId: number = this.getRequiredLegacyId(item);

      if (category === 'foto' && !photoIds.has(legacyId)) {
        throw new Error(`El inventario referencia la fotografía inexistente ${legacyId}.`);
      }
    }
  }

  private async extractFiles(
    command: LegacyImportExecutionCommand,
    items: readonly LegacyImportFileInventoryItem[],
    catalog: LegacyImportCatalogSnapshot,
    firstFileId: number,
  ): Promise<readonly ExtractedLegacyFile[]> {
    const uniqueItemsByPath: Map<string, LegacyImportFileInventoryItem> = new Map<
      string,
      LegacyImportFileInventoryItem
    >();

    for (const item of items) {
      const packagePath: string = this.getRequiredPackagePath(item);

      if (!uniqueItemsByPath.has(packagePath)) {
        uniqueItemsByPath.set(packagePath, item);
      }
    }

    const zipFile: ZipFile = await this.openArchive(command.packagePath);

    try {
      const entries: ReadonlyMap<string, Entry> = await this.readEntryMap(zipFile);

      let nextFileId: number = firstFileId;

      const photoDates: ReadonlyMap<
        number,
        {
          readonly createdAt: string;
          readonly updatedAt: string;
        }
      > = new Map(
        catalog.photos.map((photo) => [
          photo.id,
          {
            createdAt: photo.createdAt,
            updatedAt: photo.updatedAt,
          },
        ]),
      );

      const extractedFiles: ExtractedLegacyFile[] = [];

      const sortedItems: readonly LegacyImportFileInventoryItem[] = [
        ...uniqueItemsByPath.values(),
      ].sort((first, second): number =>
        this.getRequiredPackagePath(first).localeCompare(this.getRequiredPackagePath(second), 'es'),
      );

      for (const item of sortedItems) {
        const category: SupportedFileCategory = this.getSupportedCategory(item.logicalCategory);

        const definition: FileCategoryDefinition = CATEGORY_DEFINITIONS[category];

        const packagePath: string = this.getRequiredPackagePath(item);

        const entry: Entry | undefined = entries.get(packagePath);

        if (entry === undefined) {
          throw new Error(`No se encuentra ${packagePath} dentro del paquete.`);
        }

        const mimeType: string = this.getRequiredMimeType(item);

        const extension: string = this.getImageExtension(mimeType);

        const publicId: string = this.publicIdFactory.create(
          command.sourceHash,
          'archivo',
          packagePath,
        );

        const internalName: string = `${publicId}${extension}`;

        const relativePath: string = ['files', definition.directory, internalName].join('/');

        const destinationPath: string = join(
          this.stagingFilesDirectory,
          definition.directory,
          internalName,
        );

        const extractedMetadata: {
          readonly size: number;

          readonly sha256: string;
        } = await this.extractEntry(zipFile, entry, destinationPath, item);

        const legacyId: number = this.getRequiredLegacyId(item);

        const photoDate:
          | {
              readonly createdAt: string;
              readonly updatedAt: string;
            }
          | undefined = category === 'foto' ? photoDates.get(legacyId) : undefined;

        extractedFiles.push({
          id: nextFileId,
          publicId,
          inventoryItem: item,
          purpose: definition.purpose,
          internalName,
          relativePath,
          size: extractedMetadata.size,
          mimeType,
          sha256: extractedMetadata.sha256,
          createdAt: photoDate?.createdAt ?? command.startedAt,
          updatedAt: photoDate?.updatedAt ?? command.startedAt,
        });

        nextFileId++;
      }

      return extractedFiles;
    } finally {
      zipFile.close();
    }
  }

  private async insertFiles(
    queryRunner: QueryRunner,

    files: readonly ExtractedLegacyFile[],
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
          file.purpose,
          this.getOriginalName(file.inventoryItem),
          file.internalName,
          file.relativePath,
          file.mimeType,
          file.size,
          file.sha256,
          file.createdAt,
          file.updatedAt,
        ],
      );
    }
  }

  private async linkArticleFiles(
    queryRunner: QueryRunner,
    catalog: LegacyImportCatalogSnapshot,
    files: readonly ExtractedLegacyFile[],
    counters: MutableCounters,
  ): Promise<void> {
    type ArticlePhotoRelation = (typeof catalog.articlePhotos)[number];
    const fileIdByPhotoId: Map<number, number> = new Map<number, number>();

    for (const file of files) {
      if (file.inventoryItem.logicalCategory !== 'foto') {
        continue;
      }

      fileIdByPhotoId.set(
        this.getRequiredLegacyId(file.inventoryItem),

        file.id,
      );

      counters.importedRows++;
    }

    const relationsByArticle: Map<number, ArticlePhotoRelation[]> = new Map<
      number,
      ArticlePhotoRelation[]
    >();

    for (const relation of catalog.articlePhotos) {
      if (!fileIdByPhotoId.has(relation.photoId)) {
        counters.skippedRows++;

        continue;
      }

      const currentRelations: ArticlePhotoRelation[] =
        relationsByArticle.get(relation.articleId) ?? [];

      currentRelations.push(relation);

      relationsByArticle.set(relation.articleId, currentRelations);
    }

    for (const relations of relationsByArticle.values()) {
      relations.sort(
        (first, second): number => first.order - second.order || first.photoId - second.photoId,
      );

      for (let index: number = 0; index < relations.length; index++) {
        const relation = relations[index];

        if (relation === undefined) {
          continue;
        }

        const fileId: number | undefined = fileIdByPhotoId.get(relation.photoId);

        if (fileId === undefined) {
          continue;
        }

        await queryRunner.query(
          `
            INSERT INTO articulo_archivo (
              id_articulo,
              id_archivo,
              tipo,
              orden,
              principal,
              created_at,
              updated_at
            )
            VALUES (
              ?,
              ?,
              'imagen',
              ?,
              ?,
              ?,
              ?
            )
          `,
          [
            relation.articleId,
            fileId,

            Math.max(0, relation.order),

            index === 0 ? 1 : 0,

            relation.createdAt,
            relation.updatedAt,
          ],
        );

        counters.importedRows++;
      }
    }

    for (const photo of catalog.photos) {
      if (!fileIdByPhotoId.has(photo.id)) {
        counters.skippedRows++;
      }
    }
  }

  private async linkEntityFiles(
    queryRunner: QueryRunner,
    files: readonly ExtractedLegacyFile[],
  ): Promise<void> {
    const linkedEntityKeys: Set<string> = new Set<string>();

    for (const file of files) {
      const category: SupportedFileCategory = this.getSupportedCategory(
        file.inventoryItem.logicalCategory,
      );

      if (category === 'foto') {
        continue;
      }

      const legacyId: number = this.getRequiredLegacyId(file.inventoryItem);

      const entityKey: string = `${category}:${legacyId}`;

      if (linkedEntityKeys.has(entityKey)) {
        throw new Error(`El inventario contiene más de una imagen para ${entityKey}.`);
      }

      linkedEntityKeys.add(entityKey);

      await this.assertDatabaseEntityExists(queryRunner, category, legacyId);

      await queryRunner.query(
        `
          UPDATE ${this.getEntityTable(category)}
          SET
            id_archivo = ?
          WHERE
            id = ?
        `,
        [file.id, legacyId],
      );
    }
  }

  private async assertDatabaseEntityExists(
    queryRunner: QueryRunner,
    category: Exclude<SupportedFileCategory, 'foto'>,
    legacyId: number,
  ): Promise<void> {
    const rows: readonly IdRow[] = (await queryRunner.query(
      `
            SELECT
              id
            FROM ${this.getEntityTable(category)}
            WHERE
              id = ?
            LIMIT 1
          `,
      [legacyId],
    )) as readonly IdRow[];

    if (rows.length === 0) {
      throw new Error(
        [`El archivo de ${category}`, `referencia el registro inexistente ${legacyId}.`].join(' '),
      );
    }
  }

  private getEntityTable(
    category: Exclude<SupportedFileCategory, 'foto'>,
  ): 'marca' | 'proveedor' | 'tipo_pago' {
    switch (category) {
      case 'marca':
        return 'marca';

      case 'proveedor':
        return 'proveedor';

      case 'tipo_pago':
        return 'tipo_pago';
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

    if (expectedSize > MAXIMUM_IMAGE_SIZE) {
      throw new Error(`El archivo ${entry.fileName} supera los 50 MB permitidos.`);
    }

    await mkdir(dirname(destinationPath), {
      recursive: true,
    });

    const temporaryPath: string = `${destinationPath}.tmp`;

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
        throw new Error(`El tamaño extraído de ${entry.fileName} no coincide con el inventario.`);
      }

      if (actualSha256 !== this.getRequiredSha256(item)) {
        throw new Error(`El hash extraído de ${entry.fileName} no coincide con el inventario.`);
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

  private async getNextFileId(queryRunner: QueryRunner): Promise<number> {
    const rows: readonly MaximumIdRow[] = (await queryRunner.query(
      `
          SELECT
            COALESCE(
              MAX(id),
              0
            ) AS maximumId
          FROM archivo
        `,
    )) as readonly MaximumIdRow[];

    return (rows[0]?.maximumId ?? 0) + 1;
  }

  private async assertPackageHash(packagePath: string, expectedHash: string): Promise<void> {
    const hash: ReturnType<typeof createHash> = createHash('sha256');

    const stream: ReturnType<typeof createReadStream> = createReadStream(packagePath);

    for await (const chunk of stream) {
      hash.update(chunk);
    }

    const actualHash: string = hash.digest('hex');

    if (actualHash !== expectedHash.toLowerCase()) {
      throw new Error(['El paquete .otpv ha cambiado', 'desde que fue analizado.'].join(' '));
    }
  }

  private async resetStagingFiles(): Promise<void> {
    await rm(this.stagingFilesDirectory, {
      recursive: true,
      force: true,
    });

    await mkdir(this.stagingFilesDirectory, {
      recursive: true,
    });
  }

  private async cleanAfterError(): Promise<void> {
    try {
      await this.resetStagingFiles();
    } catch (error: unknown) {
      console.error('No se han podido limpiar los archivos temporales de importación:', error);
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
    return new Promise((resolve, reject): void => {
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

  private getImageExtension(mimeType: string): string {
    switch (mimeType.toLowerCase()) {
      case 'image/webp':
        return '.webp';

      case 'image/png':
        return '.png';

      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';

      default:
        throw new Error(`Tipo de imagen no admitido: ${mimeType}.`);
    }
  }

  private getOriginalName(item: LegacyImportFileInventoryItem): string | null {
    const originalName: string | null = item.originalName ?? item.storedName;

    return originalName === null ? null : basename(originalName);
  }

  private isSupportedCategory(category: string): category is SupportedFileCategory {
    return (
      category === 'foto' ||
      category === 'marca' ||
      category === 'proveedor' ||
      category === 'tipo_pago'
    );
  }

  private getSupportedCategory(category: string): SupportedFileCategory {
    if (!this.isSupportedCategory(category)) {
      throw new Error(`Categoría de archivo no soportada: ${category}.`);
    }

    return category;
  }

  private getRequiredLegacyId(item: LegacyImportFileInventoryItem): number {
    if (item.legacyId === null) {
      throw new Error(`El archivo ${item.packagePath ?? ''} no tiene ID legacy.`);
    }

    return item.legacyId;
  }

  private getRequiredPackagePath(item: LegacyImportFileInventoryItem): string {
    if (item.packagePath === null) {
      throw new Error('Un archivo incluido no tiene ruta dentro del paquete.');
    }

    return item.packagePath;
  }

  private getRequiredMimeType(item: LegacyImportFileInventoryItem): string {
    if (item.mimeType === null) {
      throw new Error(`El archivo ${item.packagePath ?? ''} no tiene MIME type.`);
    }

    return item.mimeType;
  }

  private getRequiredSize(item: LegacyImportFileInventoryItem): number {
    if (item.size === null) {
      throw new Error(`El archivo ${item.packagePath ?? ''} no tiene tamaño.`);
    }

    return item.size;
  }

  private getRequiredSha256(item: LegacyImportFileInventoryItem): string {
    if (item.sha256 === null) {
      throw new Error(`El archivo ${item.packagePath ?? ''} no tiene SHA-256.`);
    }

    return item.sha256.toLowerCase();
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
