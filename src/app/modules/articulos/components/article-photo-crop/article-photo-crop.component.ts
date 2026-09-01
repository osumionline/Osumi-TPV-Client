import {
  Component,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ImageCropperComponent, type ImageCroppedEvent } from 'ngx-image-cropper';

/**
 * Permite recortar una imagen antes de incorporarla
 * al staging del artículo.
 */
@Component({
  selector: 'otpv-article-photo-crop',
  templateUrl: './article-photo-crop.component.html',
  styleUrl: './article-photo-crop.component.scss',
  imports: [ImageCropperComponent, MatButton, MatIcon],
})
export default class ArticlePhotoCropComponent {
  private readonly cropper: Signal<ImageCropperComponent> =
    viewChild.required<ImageCropperComponent>(ImageCropperComponent);

  readonly file: InputSignal<File> = input.required<File>();
  readonly processing: InputSignal<boolean> = input<boolean>(false);
  readonly confirmEvent: OutputEmitterRef<File> = output<File>();
  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly ready: WritableSignal<boolean> = signal<boolean>(false);
  readonly cropping: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Marca la imagen como preparada para recorte.
   */
  onImageLoaded(): void {
    this.ready.set(true);
    this.error.set(null);
  }

  /**
   * Informa de que la imagen no puede cargarse.
   */
  onLoadImageFailed(): void {
    this.ready.set(false);
    this.error.set('No se ha podido cargar la imagen seleccionada.');
  }

  /**
   * Genera el recorte actual y lo devuelve como File.
   */
  async confirm(): Promise<void> {
    if (!this.ready() || this.cropping() || this.processing()) {
      return;
    }

    this.cropping.set(true);
    this.error.set(null);

    try {
      const result: ImageCroppedEvent | null = await this.cropper().crop('blob');
      const blob: Blob | null | undefined = result?.blob;

      if (blob === undefined || blob === null) {
        throw new Error('No se ha podido generar el recorte.');
      }

      const sourceFile: File = this.file();
      const croppedFile: File = new File([blob], sourceFile.name, {
        type: blob.type || 'image/png',
        lastModified: sourceFile.lastModified,
      });

      this.confirmEvent.emit(croppedFile);
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error ? error.message : 'No se ha podido generar el recorte.',
      );
    } finally {
      this.cropping.set(false);
    }
  }

  /**
   * Cancela la selección completa de imágenes.
   */
  cancel(): void {
    if (!this.cropping() && !this.processing()) {
      this.cancelEvent.emit();
    }
  }
}
