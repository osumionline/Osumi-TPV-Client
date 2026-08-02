import type { WritableSignal } from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import type LegacyImportPackageSummary from '@desktop-contracts/legacy-import/legacy-import-package-summary.interface';
import DesktopLegacyImportService from '@services/desktop-legacy-import.service';

@Component({
  selector: 'otpv-legacy-import',
  imports: [MatButton, MatIcon],
  templateUrl: './legacy-import.component.html',
  styleUrl: './legacy-import.component.scss',
})
export default class LegacyImportComponent {
  private readonly desktopLegacyImportService: DesktopLegacyImportService = inject(
    DesktopLegacyImportService,
  );

  readonly selectedPackage: WritableSignal<LegacyImportPackageSummary | null> =
    signal<LegacyImportPackageSummary | null>(null);

  readonly selecting: WritableSignal<boolean> = signal<boolean>(false);

  readonly selectionError: WritableSignal<string | null> = signal<string | null>(null);

  async selectPackage(): Promise<void> {
    if (this.selecting()) {
      return;
    }

    this.selecting.set(true);

    this.selectionError.set(null);

    try {
      const result: LegacyImportPackageSelectionResult =
        await this.desktopLegacyImportService.selectPackage();

      if (result.status === 'cancelled') {
        return;
      }
      console.log('Selection ID:', result.package.selectionId);

      this.selectedPackage.set(result.package);
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);

      this.selectedPackage.set(null);

      this.selectionError.set(message);
    } finally {
      this.selecting.set(false);
    }
  }

  clearSelection(): void {
    this.selectedPackage.set(null);

    this.selectionError.set(null);
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

    return [value.toFixed(fractionDigits), units[unitIndex]].join(' ');
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
