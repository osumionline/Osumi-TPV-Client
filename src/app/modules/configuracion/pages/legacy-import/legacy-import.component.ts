import type { Signal, WritableSignal } from '@angular/core';
import { Component, computed, signal } from '@angular/core';

@Component({
  selector: 'otpv-legacy-import',
  templateUrl: './legacy-import.component.html',
  styleUrl: './legacy-import.component.scss',
})
export default class LegacyImportComponent {
  readonly selectedFile: WritableSignal<File | null> = signal<File | null>(null);

  readonly selectionError: WritableSignal<string | null> = signal<string | null>(null);

  readonly selectedFileSize: Signal<string | null> = computed((): string | null => {
    const file: File | null = this.selectedFile();

    if (file === null) {
      return null;
    }

    return this.formatFileSize(file.size);
  });

  selectFile(event: Event): void {
    const target: EventTarget | null = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const file: File | null = target.files?.item(0) ?? null;

    if (file === null) {
      this.selectedFile.set(null);
      this.selectionError.set(null);

      return;
    }

    if (!file.name.toLowerCase().endsWith('.otpv')) {
      this.selectedFile.set(null);
      this.selectionError.set('El archivo seleccionado no tiene la extensión .otpv.');
      target.value = '';

      return;
    }

    this.selectionError.set(null);
    this.selectedFile.set(file);
  }

  clearSelection(input: HTMLInputElement): void {
    this.selectedFile.set(null);
    this.selectionError.set(null);

    input.value = '';
  }

  private formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} bytes`;
    }

    const sizeInKilobytes: number = sizeInBytes / 1024;

    if (sizeInKilobytes < 1024) {
      return [sizeInKilobytes.toFixed(1), 'KB'].join(' ');
    }

    const sizeInMegabytes: number = sizeInKilobytes / 1024;

    if (sizeInMegabytes < 1024) {
      return [sizeInMegabytes.toFixed(2), 'MB'].join(' ');
    }

    const sizeInGigabytes: number = sizeInMegabytes / 1024;

    return [sizeInGigabytes.toFixed(2), 'GB'].join(' ');
  }
}
