import type CaducidadReportWindow from '@backend/contracts/almacen/caducidad-report-window.interface';
import type { CaducidadReportInterface } from '@desktop-contracts/almacen/caducidad-report.interface';
import { getRendererAssetsDirectory } from '@infrastructure/electron/main-window';
import { BrowserWindow } from 'electron';
import { join } from 'node:path';

type BrowserWindowProvider = () => BrowserWindow | null;

const DEV_SERVER_URL: string | undefined = process.env['OSUMI_TPV_RENDERER_URL'];

/**
 * Gestiona la BrowserWindow dedicada al informe de Caducidades.
 */
export default class ElectronCaducidadReportWindow implements CaducidadReportWindow {
  private reportWindow: BrowserWindow | null = null;
  private documento: CaducidadReportInterface | null = null;

  constructor(private readonly getMainWindow: BrowserWindowProvider) {}

  /**
   * Abre una ventana independiente con el snapshot indicado.
   */
  async open(documento: CaducidadReportInterface): Promise<void> {
    if (this.reportWindow !== null && !this.reportWindow.isDestroyed()) {
      this.reportWindow.focus();

      throw new Error('Ya hay un informe de Caducidades abierto.');
    }

    const mainWindow: BrowserWindow | null = this.getMainWindow();

    if (mainWindow === null || mainWindow.isDestroyed()) {
      throw new Error('La ventana principal no está disponible.');
    }

    const browserWindow: BrowserWindow = new BrowserWindow({
      parent: mainWindow,
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 650,
      show: false,
      backgroundColor: '#ffffff',
      title: 'Caducidades - Informe',
      webPreferences: {
        preload: join(__dirname, 'caducidad-report-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
      },
    });

    browserWindow.webContents.setWindowOpenHandler((): { action: 'deny' } => ({
      action: 'deny',
    }));

    this.reportWindow = browserWindow;
    this.documento = documento;

    browserWindow.once('closed', (): void => {
      if (this.reportWindow !== browserWindow) {
        return;
      }

      this.reportWindow = null;
      this.documento = null;
    });

    try {
      await this.loadRenderer(browserWindow);

      if (browserWindow.isDestroyed()) {
        throw new Error('La ventana del informe se ha cerrado durante su carga.');
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
  getDocumento(senderWebContentsId: number): CaducidadReportInterface {
    this.requireAuthorizedWindow(senderWebContentsId);

    if (this.documento === null) {
      throw new Error('No hay un informe de Caducidades disponible.');
    }

    return this.documento;
  }

  /**
   * Comprueba que el IPC procede exactamente de la ventana activa.
   */
  private requireAuthorizedWindow(senderWebContentsId: number): BrowserWindow {
    if (
      this.reportWindow === null ||
      this.reportWindow.isDestroyed() ||
      this.reportWindow.webContents.id !== senderWebContentsId
    ) {
      throw new Error('IPC request received from an unauthorized caducidad report window.');
    }

    return this.reportWindow;
  }

  /**
   * Carga Angular con la entrada específica del informe.
   */
  private async loadRenderer(browserWindow: BrowserWindow): Promise<void> {
    if (DEV_SERVER_URL !== undefined && DEV_SERVER_URL.length > 0) {
      const rendererUrl: URL = new URL(DEV_SERVER_URL);

      rendererUrl.searchParams.set('window', 'caducidad-report');

      await browserWindow.loadURL(rendererUrl.toString());

      return;
    }

    await browserWindow.loadFile(join(getRendererAssetsDirectory(), 'index.html'), {
      query: {
        window: 'caducidad-report',
      },
    });
  }
}
