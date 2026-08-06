import type { ElementRef, Signal, WritableSignal } from '@angular/core';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import type LegacyImportAnalysisIssue from '@desktop-contracts/legacy-import/legacy-import-analysis-issue.interface';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import type LegacyImportPackageSummary from '@desktop-contracts/legacy-import/legacy-import-package-summary.interface';
import type LegacyImportPreparationResult from '@desktop-contracts/legacy-import/legacy-import-preparation-result.interface';
import LegacyImportProgress from '@desktop-contracts/legacy-import/legacy-import-progress.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';
import LegacyImportStartResult from '@desktop-contracts/legacy-import/legacy-import-start-result.interface';
import LegacyImportConflictResolutionComponent from '@modules/configuracion/components/legacy-import-conflict-resolution/legacy-import-conflict-resolution.component';
import DesktopLegacyImportService from '@services/desktop-legacy-import.service';

@Component({
  selector: 'otpv-legacy-import',
  imports: [
    MatButton,
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardSubtitle,
    MatCardTitle,
    MatIcon,
    MatProgressSpinner,
    MatProgressBar,
    LegacyImportConflictResolutionComponent,
  ],
  templateUrl: './legacy-import.component.html',
  styleUrl: './legacy-import.component.scss',
})
export default class LegacyImportComponent {
  private readonly desktopLegacyImportService: DesktopLegacyImportService = inject(
    DesktopLegacyImportService,
  );
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  private readonly injector: Injector = inject(Injector);

  private readonly pageTop: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('pageTop');

  private readonly validatedDecisions: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('validatedDecisions');

  private readonly importExecution: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('importExecution');

  private readonly importResultSection: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('importResultSection');

  private readonly integerFormatter: Intl.NumberFormat = new Intl.NumberFormat('es-ES');

  private readonly dateFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  readonly selectedPackage: WritableSignal<LegacyImportPackageSummary | null> =
    signal<LegacyImportPackageSummary | null>(null);

  readonly analysisReport: WritableSignal<LegacyImportAnalysisReport | null> =
    signal<LegacyImportAnalysisReport | null>(null);

  readonly selecting: WritableSignal<boolean> = signal<boolean>(false);

  readonly analyzing: WritableSignal<boolean> = signal<boolean>(false);

  readonly selectionError: WritableSignal<string | null> = signal<string | null>(null);

  readonly analysisError: WritableSignal<string | null> = signal<string | null>(null);

  readonly automaticIssues: Signal<readonly LegacyImportAnalysisIssue[]> = computed(
    (): readonly LegacyImportAnalysisIssue[] =>
      this.analysisReport()?.issues.filter(
        (issue: LegacyImportAnalysisIssue): boolean => issue.kind === 'automatic-repair',
      ) ?? [],
  );

  readonly reviewIssues: Signal<readonly LegacyImportAnalysisIssue[]> = computed(
    (): readonly LegacyImportAnalysisIssue[] =>
      this.analysisReport()?.issues.filter(
        (issue: LegacyImportAnalysisIssue): boolean => issue.kind === 'requires-review',
      ) ?? [],
  );

  readonly resolvingConflicts: WritableSignal<boolean> = signal<boolean>(false);

  readonly reviewDecisions: WritableSignal<readonly LegacyImportReviewDecision[]> = signal<
    readonly LegacyImportReviewDecision[]
  >([]);

  readonly savingReviewDecisions: WritableSignal<boolean> = signal<boolean>(false);

  readonly reviewSubmissionError: WritableSignal<string | null> = signal<string | null>(null);

  readonly preparationResult: WritableSignal<LegacyImportPreparationResult | null> =
    signal<LegacyImportPreparationResult | null>(null);

  readonly importing: WritableSignal<boolean> = signal<boolean>(false);

  readonly importProgress: WritableSignal<LegacyImportProgress | null> =
    signal<LegacyImportProgress | null>(null);

  readonly importResult: WritableSignal<LegacyImportStartResult | null> =
    signal<LegacyImportStartResult | null>(null);

  readonly importError: WritableSignal<string | null> = signal<string | null>(null);

  constructor() {
    const unsubscribe: () => void = this.desktopLegacyImportService.onImportProgress(
      (progress: LegacyImportProgress): void => {
        const report: LegacyImportAnalysisReport | null = this.analysisReport();

        if (report === null || report.selectionId !== progress.selectionId) {
          return;
        }

        this.importProgress.set(progress);
      },
    );

    this.destroyRef.onDestroy(unsubscribe);
  }

  async selectPackage(): Promise<void> {
    if (this.selecting()) {
      return;
    }

    this.selecting.set(true);
    this.selectionError.set(null);
    this.analysisError.set(null);
    this.resolvingConflicts.set(false);
    this.reviewDecisions.set([]);
    this.importing.set(false);
    this.importProgress.set(null);
    this.importResult.set(null);
    this.importError.set(null);

    try {
      const result: LegacyImportPackageSelectionResult =
        await this.desktopLegacyImportService.selectPackage();

      if (result.status === 'cancelled') {
        return;
      }

      this.selectedPackage.set(result.package);

      this.analysisReport.set(null);
    } catch (error: unknown) {
      this.selectedPackage.set(null);

      this.analysisReport.set(null);

      this.selectionError.set(this.getErrorMessage(error));
    } finally {
      this.selecting.set(false);
    }
  }

  async analyzePackage(): Promise<void> {
    const selectedPackage: LegacyImportPackageSummary | null = this.selectedPackage();

    if (selectedPackage === null || this.analyzing()) {
      return;
    }

    this.analyzing.set(true);
    this.analysisError.set(null);
    this.resolvingConflicts.set(false);
    this.reviewDecisions.set([]);
    this.importing.set(false);
    this.importProgress.set(null);
    this.importResult.set(null);
    this.importError.set(null);

    try {
      const report: LegacyImportAnalysisReport =
        await this.desktopLegacyImportService.analyzePackage(selectedPackage.selectionId);

      this.analysisReport.set(report);
      this.scrollToSection(this.pageTop, 'start');
    } catch (error: unknown) {
      this.analysisReport.set(null);

      this.analysisError.set(this.getErrorMessage(error));
    } finally {
      this.analyzing.set(false);
    }
  }

  clearSelection(): void {
    this.selectedPackage.set(null);
    this.analysisReport.set(null);
    this.selectionError.set(null);
    this.analysisError.set(null);
    this.resolvingConflicts.set(false);
    this.reviewDecisions.set([]);
    this.importing.set(false);
    this.importProgress.set(null);
    this.importResult.set(null);
    this.importError.set(null);
  }

  returnToPackageSummary(): void {
    this.analysisReport.set(null);

    this.analysisError.set(null);
  }

  formatSize(sizeInBytes: number): string {
    const units: readonly string[] = ['bytes', 'KB', 'MB', 'GB'];

    let value: number = sizeInBytes;

    let unitIndex: number = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    const fractionDigits: number = unitIndex === 0 ? 0 : 2;

    const unit: string = units[unitIndex] ?? 'bytes';

    return [value.toFixed(fractionDigits), unit].join(' ');
  }

  formatDate(value: string): string {
    const date: Date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return this.dateFormatter.format(date);
  }

  formatInteger(value: number): string {
    return this.integerFormatter.format(value);
  }

  finishImport(): void {
    window.location.reload();
  }

  private scrollToSection(
    target: Signal<ElementRef<HTMLElement> | undefined>,
    block: ScrollLogicalPosition,
  ): void {
    afterNextRender(
      {
        write: (): void => {
          const element: HTMLElement | undefined = target()?.nativeElement;

          if (element === undefined) {
            return;
          }

          element.focus({
            preventScroll: true,
          });

          element.scrollIntoView({
            behavior: 'smooth',

            block,

            inline: 'nearest',
          });
        },
      },
      {
        injector: this.injector,
      },
    );
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  openConflictResolution(): void {
    this.reviewSubmissionError.set(null);
    const report: LegacyImportAnalysisReport | null = this.analysisReport();

    if (report === null || report.reviewConflicts.length === 0) {
      return;
    }
    this.preparationResult.set(null);
    this.reviewSubmissionError.set(null);

    this.resolvingConflicts.set(true);
    this.scrollToSection(this.pageTop, 'start');
  }

  cancelConflictResolution(): void {
    this.resolvingConflicts.set(false);
  }

  async confirmReviewDecisions(decisions: readonly LegacyImportReviewDecision[]): Promise<void> {
    const report: LegacyImportAnalysisReport | null = this.analysisReport();

    if (report === null || this.savingReviewDecisions()) {
      return;
    }

    this.savingReviewDecisions.set(true);
    this.reviewSubmissionError.set(null);

    try {
      const result: LegacyImportPreparationResult =
        await this.desktopLegacyImportService.confirmReviewDecisions(report.selectionId, decisions);

      this.reviewDecisions.set(decisions);
      this.preparationResult.set(result);
      this.resolvingConflicts.set(false);
      this.scrollToSection(this.validatedDecisions, 'end');
    } catch (error: unknown) {
      this.reviewSubmissionError.set(this.getErrorMessage(error));
    } finally {
      this.savingReviewDecisions.set(false);
    }
  }

  async prepareWithoutReview(): Promise<void> {
    await this.confirmReviewDecisions([]);
  }

  async startImport(): Promise<void> {
    const report: LegacyImportAnalysisReport | null = this.analysisReport();

    if (report === null || this.preparationResult() === null || this.importing()) {
      return;
    }

    this.importing.set(true);

    this.importError.set(null);

    this.importResult.set(null);

    this.importProgress.set({
      selectionId: report.selectionId,
      stage: 'preparing-staging',
      percentage: 0,
      message: 'Iniciando la importación…',
    });
    this.scrollToSection(this.importExecution, 'end');

    try {
      const result: LegacyImportStartResult = await this.desktopLegacyImportService.startImport(
        report.selectionId,
      );

      this.importResult.set(result);
      this.scrollToSection(this.importResultSection, 'end');
    } catch (error: unknown) {
      this.importError.set(this.getErrorMessage(error));
    } finally {
      this.importing.set(false);
    }
  }
}
