import type CajaInformePrintWindow from '@backend/contracts/caja/informes/caja-informe-print-window.interface';
import type { CajaInformePrintDocumento } from '@desktop-contracts/caja/informes/caja-informe-print.interface';
import { getRendererAssetsDirectory } from '@infrastructure/electron/main-window';
import { BrowserWindow } from 'electron';
import { join } from 'node:path';

type BrowserWindowProvider = () => BrowserWindow | null;

const DEV_SERVER_URL: string | undefined = process.env['OSUMI_TPV_RENDERER_URL'];

/**
 * Gestiona la BrowserWindow dedicada
 * a los informes imprimibles de Caja.
 */
export default class ElectronCajaInformePrintWindow implements CajaInformePrintWindow {
  private printWindow: BrowserWindow | null = null;

  private documento: CajaInformePrintDocumento | null = null;

  constructor(private readonly getMainWindow: BrowserWindowProvider) {}

  /**
   * Abre una ventana independiente
   * con el snapshot indicado.
   */
  async open(documento: CajaInformePrintDocumento): Promise<void> {
    if (this.printWindow !== null && !this.printWindow.isDestroyed()) {
      this.printWindow.focus();

      throw new Error('Ya hay un informe de Caja abierto.');
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
      title: this.getWindowTitle(documento),

      webPreferences: {
        preload: join(__dirname, 'caja-informe-print-preload.js'),
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
   * Devuelve el snapshot exclusivamente
   * al renderer autorizado.
   */
  getDocumento(senderWebContentsId: number): CajaInformePrintDocumento {
    this.requireAuthorizedWindow(senderWebContentsId);

    if (this.documento === null) {
      throw new Error('No hay ningún informe de Caja disponible.');
    }

    return this.documento;
  }

  /**
   * Abre el diálogo estándar de impresión
   * para el documento actualmente visible.
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
                ? 'No se ha podido imprimir el informe.'
                : `No se ha podido imprimir el informe: ${reason}`,
            ),
          );
        },
      );
    });
  }

  /**
   * Comprueba que el IPC procede exactamente
   * de la ventana activa del informe.
   */
  private requireAuthorizedWindow(senderWebContentsId: number): BrowserWindow {
    if (
      this.printWindow === null ||
      this.printWindow.isDestroyed() ||
      this.printWindow.webContents.id !== senderWebContentsId
    ) {
      throw new Error('IPC request received from an unauthorized cash report window.');
    }

    return this.printWindow;
  }

  /**
   * Obtiene el título nativo correspondiente
   * al tipo de informe.
   */
  private getWindowTitle(documento: CajaInformePrintDocumento): string {
    switch (documento.tipo) {
      case 'simple':
        return 'Informe Simple - Caja';

      case 'detallado':
        return 'Informe Detallado - Caja';

      case 'ventas':
        return 'Informe de Ventas - Caja';
    }
  }

  /**
   * Carga Angular con la entrada específica
   * de la ventana de Informes.
   */
  private async loadRenderer(browserWindow: BrowserWindow): Promise<void> {
    if (DEV_SERVER_URL !== undefined && DEV_SERVER_URL.length > 0) {
      const rendererUrl: URL = new URL(DEV_SERVER_URL);

      rendererUrl.searchParams.set('window', 'caja-informe-print');

      await browserWindow.loadURL(rendererUrl.toString());

      return;
    }

    await browserWindow.loadFile(
      join(getRendererAssetsDirectory(), 'index.html'),

      {
        query: {
          window: 'caja-informe-print',
        },
      },
    );
  }
}
