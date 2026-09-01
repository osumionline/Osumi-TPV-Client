import type ImageStagingService from '@backend/application/files/image-staging.service';
import type StageImageRequest from '@desktop-contracts/files/stage-image-request.interface';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import { assertTrustedSender, type MainWindowProvider } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los casos de uso de archivos temporales
 * disponibles para el renderer.
 */
export default function registerFilesIpc(
  getMainWindow: MainWindowProvider,
  imageStagingService: ImageStagingService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.filesStageArticleImage,
    async (event, request: StageImageRequest): Promise<StagedImageInterface> => {
      assertTrustedSender(event, getMainWindow);

      if (!(request.bytes instanceof Uint8Array) || request.bytes.byteLength === 0) {
        throw new Error('La imagen seleccionada no contiene datos válidos.');
      }

      const originalName: string | null =
        request.originalName === null || request.originalName.trim() === ''
          ? null
          : request.originalName.trim();

      return imageStagingService.stage({
        purpose: 'article_image',
        originalName,
        buffer: Buffer.from(request.bytes),
      });
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.filesDiscardStagedImage,
    async (event, stagingId: string): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      const normalizedStagingId: string = stagingId.trim();

      if (normalizedStagingId === '') {
        throw new Error('El identificador temporal de la imagen no es válido.');
      }

      await imageStagingService.discard(normalizedStagingId);
    },
  );
}
