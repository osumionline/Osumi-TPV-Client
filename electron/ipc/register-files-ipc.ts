import type ImageStagingService from '@backend/application/files/image-staging.service';
import type { ImageAssetPurpose } from '@backend/domain/files/image-asset.interface';
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

      return stageImage(request, 'article_image', imageStagingService);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.filesStageBrandImage,
    async (event, request: StageImageRequest): Promise<StagedImageInterface> => {
      assertTrustedSender(event, getMainWindow);

      return stageImage(request, 'brand_image', imageStagingService);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.filesStageProviderImage,
    async (event, request: StageImageRequest): Promise<StagedImageInterface> => {
      assertTrustedSender(event, getMainWindow);

      return stageImage(request, 'provider_image', imageStagingService);
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

/**
 * Valida una petición pública y crea una imagen
 * temporal con el purpose decidido por el backend.
 */
async function stageImage(
  request: StageImageRequest,
  purpose: ImageAssetPurpose,
  imageStagingService: ImageStagingService,
): Promise<StagedImageInterface> {
  if (!(request.bytes instanceof Uint8Array) || request.bytes.byteLength === 0) {
    throw new Error('La imagen seleccionada no contiene datos válidos.');
  }

  const originalName: string | null =
    request.originalName === null || request.originalName.trim() === ''
      ? null
      : request.originalName.trim();

  return imageStagingService.stage({
    purpose,
    originalName,
    buffer: Buffer.from(request.bytes),
  });
}
