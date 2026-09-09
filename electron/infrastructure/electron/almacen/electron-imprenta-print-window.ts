import type ImprentaPrintWindow from '@backend/contracts/almacen/imprenta/imprenta-print-window.interface';
import type { ImprentaPrintDocumentoInterface } from '@desktop-contracts/almacen/imprenta/imprenta-print.interface';
import { getRendererAssetsDirectory } from '@infrastructure/electron/main-window';
import { BrowserWindow } from 'electron';
import { join } from 'node:path';

type BrowserWindowProvider = () => BrowserWindow | null;

const DEV_SERVER_URL: string | undefined = process.env['OSUMI_TPV_RENDERER_URL'];

/**
 * Gestiona la BrowserWindow dedicada a la hoja
 * definitiva de etiquetas de Imprenta.
 */
export default class ElectronImprentaPrintWindow implements ImprentaPrintWindow {
  private printWindow: BrowserWindow | null = null;
  private documento: ImprentaPrintDocumentoInterface | null = null;

  constructor(private readonly getMainWindow: BrowserWindowProvider) {}

  /**
   * Abre una ventana independiente con el snapshot indicado.
   */
  async open(documento: ImprentaPrintDocumentoInterface): Promise<void> {
    if (this.printWindow !== null && !this.printWindow.isDestroyed()) {
      this.printWindow.focus();

      throw new Error('Ya hay una hoja de Imprenta abierta.');
    }

    const mainWindow: BrowserWindow | null = this.getMainWindow();

    if (mainWindow === null || mainWindow.isDestroyed()) {
      throw new Error('La ventana principal no está disponible.');
    }

    const browserWindow: BrowserWindow = new BrowserWindow({
      parent: mainWindow,
      width: 1200,
      height: 850,
      minWidth: 900,
      minHeight: 650,
      show: false,
      backgroundColor: '#ffffff',
      title: 'Imprenta - Etiquetas',
      webPreferences: {
        preload: join(__dirname, 'imprenta-print-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
      },
    });

    browserWindow.webContents.setWindowOpenHandler((): { action: 'deny' } => ({
      action: 'deny',
    }));

    this.printWindow = browserWindow;
    this.documento = documento;

    browserWindow.once('closed', (): void => {
      if (this.printWindow !== browserWindow) {
        return;
      }

      this.printWindow = null;
      this.documento = null;
    });

    try {
      await this.loadRenderer(browserWindow);

      if (browserWindow.isDestroyed()) {
        throw new Error('La ventana de Imprenta se ha cerrado durante su carga.');
      }

      browserWindow.maximize();
      browserWindow.show();
    } catch (error: unknown) {
      if (!browserWindow.isDestroyed()) {
        browserWindow.destroy();
      }

      throw error;
    }
  }

  /**
   * Devuelve el snapshot exclusivamente al renderer autorizado.
   */
  getDocumento(senderWebContentsId: number): ImprentaPrintDocumentoInterface {
    this.requireAuthorizedWindow(senderWebContentsId);

    if (this.documento === null) {
      throw new Error('No hay una hoja de Imprenta disponible.');
    }

    return this.documento;
  }

  /**
   * Abre el diálogo estándar de impresión usando
   * la geometría A4 del snapshot canónico actual.
   */
  async print(senderWebContentsId: number): Promise<void> {
    const browserWindow: BrowserWindow = this.requireAuthorizedWindow(senderWebContentsId);
    const documento: ImprentaPrintDocumentoInterface | null = this.documento;

    if (documento === null) {
      throw new Error('No hay una hoja de Imprenta disponible.');
    }

    await new Promise<void>((resolve: () => void, reject: (reason: Error) => void): void => {
      browserWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          pageSize: 'A4',
          landscape: documento.orientacion === 'landscape',
          scaleFactor: 100,
          margins: {
            marginType: 'none',
          },
        },
        (success: boolean, failureReason: string): void => {
          if (success) {
            resolve();

            return;
          }

          const reason: string = failureReason.trim();

          if (reason.toLowerCase().includes('cancel')) {
            resolve();

            return;
          }

          reject(
            new Error(
              reason.length === 0
                ? 'No se ha podido imprimir la hoja de etiquetas.'
                : `No se ha podido imprimir la hoja de etiquetas: ${reason}`,
            ),
          );
        },
      );
    });
  }

  /**
   * Comprueba que el IPC procede exactamente
   * de la BrowserWindow activa de Imprenta.
   */
  private requireAuthorizedWindow(senderWebContentsId: number): BrowserWindow {
    if (
      this.printWindow === null ||
      this.printWindow.isDestroyed() ||
      this.printWindow.webContents.id !== senderWebContentsId
    ) {
      throw new Error('IPC request received from an unauthorized imprenta print window.');
    }

    return this.printWindow;
  }

  /**
   * Carga Angular con la entrada específica de Imprenta.
   */
  private async loadRenderer(browserWindow: BrowserWindow): Promise<void> {
    if (DEV_SERVER_URL !== undefined && DEV_SERVER_URL.length > 0) {
      const rendererUrl: URL = new URL(DEV_SERVER_URL);

      rendererUrl.searchParams.set('window', 'imprenta-print');

      await browserWindow.loadURL(rendererUrl.toString());

      return;
    }

    await browserWindow.loadFile(join(getRendererAssetsDirectory(), 'index.html'), {
      query: {
        window: 'imprenta-print',
      },
    });
  }
}
