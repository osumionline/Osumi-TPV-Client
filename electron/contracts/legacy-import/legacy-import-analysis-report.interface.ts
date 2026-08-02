import type LegacyImportAnalysisIssue from '@desktop-contracts/legacy-import/legacy-import-analysis-issue.interface';
import type { LegacyImportReviewConflict } from '@desktop-contracts/legacy-import/legacy-import-review-conflict.type';
import type LegacyImportTableSummary from '@desktop-contracts/legacy-import/legacy-import-table-summary.interface';

export default interface LegacyImportAnalysisReport {
  readonly selectionId: string;

  readonly analyzedAt: string;

  readonly tables: readonly LegacyImportTableSummary[];

  readonly totalRows: number;

  readonly automaticRepairIssues: number;

  readonly reviewIssues: number;

  readonly requiresReview: boolean;

  readonly issues: readonly LegacyImportAnalysisIssue[];

  readonly reviewConflicts: readonly LegacyImportReviewConflict[];
}
