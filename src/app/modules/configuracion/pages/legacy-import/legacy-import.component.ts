import type { Signal, WritableSignal } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
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
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import type LegacyImportAnalysisIssue from '@desktop-contracts/legacy-import/legacy-import-analysis-issue.interface';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import type LegacyImportPackageSummary from '@desktop-contracts/legacy-import/legacy-import-package-summary.interface';
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
  ],
  templateUrl: './legacy-import.component.html',
  styleUrl: './legacy-import.component.scss',
})
export default class LegacyImportComponent {
  private readonly desktopLegacyImportService: DesktopLegacyImportService = inject(
    DesktopLegacyImportService,
  );

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

  async selectPackage(): Promise<void> {
    if (this.selecting()) {
      return;
    }

    this.selecting.set(true);

    this.selectionError.set(null);

    this.analysisError.set(null);

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

    try {
      const report: LegacyImportAnalysisReport =
        await this.desktopLegacyImportService.analyzePackage(selectedPackage.selectionId);

      this.analysisReport.set(report);
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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
