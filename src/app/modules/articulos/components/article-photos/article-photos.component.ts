import {
  Component,
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
import FilesService from '@services/files.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Gestiona las fotos editables de un artículo.
 */
@Component({
  selector: 'otpv-article-photos',
  templateUrl: './article-photos.component.html',
  styleUrl: './article-photos.component.scss',
  imports: [MatButton, MatIcon, MatIconButton, MatTooltip],
})
export default class ArticlePhotosComponent {
  private readonly filesService: FilesService = inject(FilesService);

  readonly fotos: InputSignal<readonly ArticuloFotoDraft[]> =
    input.required<readonly ArticuloFotoDraft[]>();
  readonly photosChangeEvent: OutputEmitterRef<readonly ArticuloFotoDraft[]> =
    output<readonly ArticuloFotoDraft[]>();

  readonly uploading: WritableSignal<boolean> = signal<boolean>(false);
  readonly dragging: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Abre el selector nativo de imágenes.
   */
  openFilePicker(inputElement: HTMLInputElement): void {
    if (!this.uploading()) {
      inputElement.click();
    }
  }

  /**
   * Procesa las imágenes elegidas en el selector.
   */
  async onFileSelection(event: Event): Promise<void> {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;
    const files: readonly File[] = Array.from(inputElement.files ?? []);

    inputElement.value = '';

    await this.stageFiles(files);
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
  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);

    if (this.uploading()) {
      return;
    }

    await this.stageFiles(Array.from(event.dataTransfer?.files ?? []));
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
