import { Service } from '@angular/core';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';

/**
 * Expone al renderer las operaciones temporales
 * sobre archivos e imágenes.
 */
@Service()
export default class FilesService {
  /**
   * Envía una imagen seleccionada al staging de Artículos.
   */
  async stageArticleImage(file: File): Promise<StagedImageInterface> {
    const bytes: Uint8Array = new Uint8Array(await file.arrayBuffer());

    return window.osumiDesktop.files.stageArticleImage({
      originalName: file.name.trim() === '' ? null : file.name,
      bytes,
    });
  }

  /**
   * Descarta una imagen temporal que ya no forma
   * parte de ningún draft.
   */
  discardStagedImage(stagingId: string): Promise<void> {
    return window.osumiDesktop.files.discardStagedImage(stagingId);
  }
}
