import type LegacyImportCatalogReader from '@backend/contracts/legacy-import-catalog-reader.interface';
import type LegacyImportCatalogValidator from '@backend/contracts/legacy-import-catalog-validator.interface';
import type LegacyImportPhaseImporter from '@backend/contracts/legacy-import-phase-importer.interface';
import type LegacyImportProgressListener from '@backend/contracts/legacy-import-progress-listener.type';
import type LegacyImportCatalogSnapshot from '@backend/domain/legacy-import/legacy-import-catalog-snapshot';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import type { QueryRunner } from 'typeorm';

export default class LegacyImportCatalogValidationImporter implements LegacyImportPhaseImporter {
  constructor(
    private readonly catalogReader: LegacyImportCatalogReader,
    private readonly catalogValidator: LegacyImportCatalogValidator,
  ) {}

  async import(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
  ): Promise<LegacyImportPhaseResult> {
    void queryRunner;

    this.reportProgress(
      command,
      progressListener,
      'reading-catalog',
      70,
      'Leyendo artículos, códigos de barras y etiquetas…',
    );

    const snapshot: LegacyImportCatalogSnapshot = await this.catalogReader.read(
      command.packagePath,
      command.expectedTableRows,
    );

    this.reportProgress(
      command,
      progressListener,
      'validating-catalog',
      78,
      'Validando las relaciones del catálogo…',
    );

    this.catalogValidator.validate(snapshot);

    return {
      importedRows: 0,
      skippedRows: 0,
      warningCount: 0,
    };
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
