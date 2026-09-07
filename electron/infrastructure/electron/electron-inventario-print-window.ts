import type InventarioPrintWindow from '@backend/contracts/almacen/inventario-print-window.interface';
import type InventarioPrintDocumentoInterface from '@desktop-contracts/almacen/inventario-print.interface';
import { getRendererAssetsDirectory } from '@infrastructure/electron/main-window';
import { BrowserWindow } from 'electron';
import { join } from 'node:path';

type BrowserWindowProvider = () => BrowserWindow | null;

const DEV_SERVER_URL: string | undefined = process.env['OSUMI_TPV_RENDERER_URL'];

/**
 * Gestiona la BrowserWindow dedicada a la impresión de Inventario.
 */
export default class ElectronInventarioPrintWindow implements InventarioPrintWindow {
  private printWindow: BrowserWindow | null = null;
  private documento: InventarioPrintDocumentoInterface | null = null;

  constructor(private readonly getMainWindow: BrowserWindowProvider) {}

  /**
   * Abre una ventana independiente con el snapshot indicado.
   */
  async open(documento: InventarioPrintDocumentoInterface): Promise<void> {
    if (this.printWindow !== null && !this.printWindow.isDestroyed()) {
      this.printWindow.focus();

      throw new Error('Ya hay una vista de impresión de Inventario abierta.');
    }

    const mainWindow: BrowserWindow | null = this.getMainWindow();

    if (mainWindow === null || mainWindow.isDestroyed()) {
      throw new Error('La ventana principal no está disponible.');
    }

    const browserWindow: BrowserWindow = new BrowserWindow({
      parent: mainWindow,
      width: 1600,
      height: 900,
      minWidth: 1024,
      minHeight: 700,
      show: false,
      backgroundColor: '#ffffff',
      title: 'Inventario - Vista de impresión',
      webPreferences: {
        preload: join(__dirname, 'inventario-print-preload.js'),
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
        throw new Error('La ventana de impresión se ha cerrado durante su carga.');
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
  getDocumento(senderWebContentsId: number): InventarioPrintDocumentoInterface {
    this.requireAuthorizedWindow(senderWebContentsId);

    if (this.documento === null) {
      throw new Error('No hay un documento de Inventario disponible.');
    }

    return this.documento;
  }

  /**
   * Abre el diálogo estándar de impresión del sistema.
   */
  async print(senderWebContentsId: number): Promise<void> {
    const browserWindow: BrowserWindow = this.requireAuthorizedWindow(senderWebContentsId);

    await new Promise<void>((resolve: () => void, reject: (reason: Error) => void): void => {
      browserWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          landscape: true,
          pageSize: 'A4',
          margins: {
            marginType: 'default',
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
                ? 'No se ha podido imprimir el inventario.'
                : `No se ha podido imprimir el inventario: ${reason}`,
            ),
          );
        },
      );
    });
  }

  /**
   * Comprueba que el IPC procede exactamente de la ventana activa.
   */
  private requireAuthorizedWindow(senderWebContentsId: number): BrowserWindow {
    if (
      this.printWindow === null ||
      this.printWindow.isDestroyed() ||
      this.printWindow.webContents.id !== senderWebContentsId
    ) {
      throw new Error('IPC request received from an unauthorized inventory print window.');
    }

    return this.printWindow;
  }

  /**
   * Carga Angular con la entrada específica de impresión.
   */
  private async loadRenderer(browserWindow: BrowserWindow): Promise<void> {
    if (DEV_SERVER_URL !== undefined && DEV_SERVER_URL.length > 0) {
      const rendererUrl: URL = new URL(DEV_SERVER_URL);

      rendererUrl.searchParams.set('window', 'inventario-print');

      await browserWindow.loadURL(rendererUrl.toString());

      return;
    }

    await browserWindow.loadFile(join(getRendererAssetsDirectory(), 'index.html'), {
      query: {
        window: 'inventario-print',
      },
    });
  }
}
