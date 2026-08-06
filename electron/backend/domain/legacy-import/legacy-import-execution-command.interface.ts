import type LegacyImportFileInventoryItem from '@backend/domain/legacy-import/legacy-import-file-inventory-item.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';

export default interface LegacyImportExecutionCommand {
  readonly selectionId: string;

  readonly packagePath: string;

  readonly sourceApplication: string;

  readonly sourceVersion: string;

  readonly sourceSchemaVersion: string;

  readonly sourceHash: string;

  readonly sourceRows: number;

  readonly initialSaleNumber: number;

  readonly initialInvoiceNumber: number;

  readonly expectedTableRows: Readonly<Record<string, number>>;

  readonly fileInventory: readonly LegacyImportFileInventoryItem[];

  readonly reviewDecisions: readonly LegacyImportReviewDecision[];

  readonly warningCount: number;

  readonly startedAt: string;
}
