import {
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import type { ArticuloFotoDraft } from '@model/articulos/articulo-draft.interface';
import {
  appendStagedArticuloFotos,
  moveArticuloFoto,
  removeArticuloFoto,
  setArticuloFotoPrincipal,
} from '@model/articulos/articulo-photo.utils';
import ArticlePhotoCropComponent from '@modules/articulos/components/article-photo-crop/article-photo-crop.component';
import FilesService from '@services/files.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Gestiona las fotos editables de un artículo.
 */
@Component({
  selector: 'otpv-article-photos',
  templateUrl: './article-photos.component.html',
  styleUrl: './article-photos.component.scss',
  imports: [ArticlePhotoCropComponent, MatButton, MatIcon, MatIconButton, MatTooltip],
})
export default class ArticlePhotosComponent {
  private readonly filesService: FilesService = inject(FilesService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  private cropFiles: readonly File[] = [];
  private cropIndex: number = 0;
  private croppedFiles: File[] = [];
  private destroyed: boolean = false;

  readonly fotos: InputSignal<readonly ArticuloFotoDraft[]> =
    input.required<readonly ArticuloFotoDraft[]>();
  readonly photosChangeEvent: OutputEmitterRef<readonly ArticuloFotoDraft[]> =
    output<readonly ArticuloFotoDraft[]>();

  readonly uploading: WritableSignal<boolean> = signal<boolean>(false);
  readonly dragging: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  readonly cropFile: WritableSignal<File | null> = signal<File | null>(null);

  /**
   * Abre el selector nativo de imágenes.
   */
  openFilePicker(inputElement: HTMLInputElement): void {
    if (!this.uploading() && this.cropFile() === null) {
      inputElement.click();
    }
  }

  /**
   * Procesa las imágenes elegidas en el selector.
   */
  onFileSelection(event: Event): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;
    const files: readonly File[] = Array.from(inputElement.files ?? []);

    inputElement.value = '';

    this.startCropBatch(files);
  }

  /**
   * Permite soltar imágenes sobre la zona de carga.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();

    if (!this.uploading()) {
      this.dragging.set(true);
    }
  }

  /**
   * Abandona el estado visual de drag.
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
  }

  /**
   * Procesa las imágenes soltadas por el usuario.
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);

    if (this.uploading() || this.cropFile() !== null) {
      return;
    }

    this.startCropBatch(Array.from(event.dataTransfer?.files ?? []));
  }

  /**
   * Marca una foto como principal.
   */
  setPrincipal(index: number): void {
    this.photosChangeEvent.emit(setArticuloFotoPrincipal(this.fotos(), index));
  }

  /**
   * Mueve una foto una posición hacia la izquierda.
   */
  moveUp(index: number): void {
    this.photosChangeEvent.emit(moveArticuloFoto(this.fotos(), index, -1));
  }

  /**
   * Mueve una foto una posición hacia la derecha.
   */
  moveDown(index: number): void {
    this.photosChangeEvent.emit(moveArticuloFoto(this.fotos(), index, 1));
  }

  /**
   * Elimina una foto del draft.
   *
   * Si todavía es temporal, elimina también su staging.
   */
  async remove(index: number): Promise<void> {
    if (this.uploading()) {
      return;
    }

    const foto: ArticuloFotoDraft | undefined = this.fotos()[index];

    if (foto === undefined) {
      return;
    }

    this.error.set(null);

    if (foto.stagingId !== null) {
      try {
        await this.filesService.discardStagedImage(foto.stagingId);
      } catch (error: unknown) {
        this.error.set(getErrorMessage(error, 'No se ha podido eliminar la imagen temporal.'));

        return;
      }
    }

    this.photosChangeEvent.emit(removeArticuloFoto(this.fotos(), index));
  }

  /**
   * Formatea el tamaño de una foto para mostrarlo.
   */
  formatSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
      return `${Math.round(sizeBytes / 1024)} KB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Inicia el recorte secuencial de un conjunto de imágenes.
   */
  private startCropBatch(files: readonly File[]): void {
    if (files.length === 0 || this.uploading() || this.cropFile() !== null) {
      return;
    }

    const invalidFile: File | undefined = files.find(
      (file: File): boolean => !file.type.startsWith('image/'),
    );

    if (invalidFile !== undefined) {
      this.error.set('Solo se pueden añadir archivos de imagen.');
      return;
    }

    this.error.set(null);
    this.cropFiles = [...files];
    this.cropIndex = 0;
    this.croppedFiles = [];
    this.cropFile.set(this.cropFiles[0] ?? null);
  }

  /**
   * Conserva el recorte actual y continúa con
   * la siguiente imagen del lote.
   */
  async confirmCrop(croppedFile: File): Promise<void> {
    if (this.cropFile() === null) {
      return;
    }

    this.croppedFiles.push(croppedFile);
    this.cropIndex += 1;

    const nextFile: File | undefined = this.cropFiles[this.cropIndex];

    if (nextFile !== undefined) {
      this.cropFile.set(nextFile);
      return;
    }

    const croppedFiles: readonly File[] = [...this.croppedFiles];

    this.clearCropBatch();

    await this.stageFiles(croppedFiles);
  }

  /**
   * Cancela el lote completo de imágenes pendiente.
   */
  cancelCrop(): void {
    if (!this.uploading()) {
      this.clearCropBatch();
    }
  }

  /**
   * Limpia el estado temporal del selector de crop.
   */
  private clearCropBatch(): void {
    this.cropFiles = [];
    this.cropIndex = 0;
    this.croppedFiles = [];
    this.cropFile.set(null);
  }

  /**
   * Convierte y añade un conjunto de imágenes al staging
   * de forma atómica desde el punto de vista del draft.
   */
  private async stageFiles(files: readonly File[]): Promise<void> {
    if (files.length === 0 || this.uploading()) {
      return;
    }

    this.uploading.set(true);
    this.error.set(null);

    const stagedImages: StagedImageInterface[] = [];

    try {
      for (const file of files) {
        stagedImages.push(await this.filesService.stageArticleImage(file));

        if (this.destroyed) {
          await Promise.allSettled(
            stagedImages.map((stagedImage: StagedImageInterface): Promise<void> =>
              this.filesService.discardStagedImage(stagedImage.stagingId),
            ),
          );

          return;
        }
      }

      if (this.destroyed) {
        await Promise.allSettled(
          stagedImages.map((stagedImage: StagedImageInterface): Promise<void> =>
            this.filesService.discardStagedImage(stagedImage.stagingId),
          ),
        );

        return;
      }

      this.photosChangeEvent.emit(appendStagedArticuloFotos(this.fotos(), stagedImages));
    } catch (error: unknown) {
      await Promise.allSettled(
        stagedImages.map((stagedImage: StagedImageInterface): Promise<void> =>
          this.filesService.discardStagedImage(stagedImage.stagingId),
        ),
      );

      this.error.set(
        getErrorMessage(error, 'No se han podido preparar las imágenes seleccionadas.'),
      );
    } finally {
      this.uploading.set(false);
    }
  }
}
