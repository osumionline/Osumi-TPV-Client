import type LegacyImportAnalysisIssueCode from '@desktop-contracts/legacy-import/legacy-import-analysis-issue-code.type';
import type LegacyImportAnalysisIssueKind from '@desktop-contracts/legacy-import/legacy-import-analysis-issue-kind.type';

export default interface LegacyImportAnalysisIssue {
  readonly code: LegacyImportAnalysisIssueCode;

  readonly kind: LegacyImportAnalysisIssueKind;

  readonly title: string;

  readonly description: string;

  readonly resolution: string;

  readonly affectedRows: number;

  readonly affectedGroups: number;

  readonly samples: readonly string[];
}
