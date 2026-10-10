import type CaducidadReportWindow from '@backend/contracts/almacen/caducidades/caducidad-report-window.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { CaducidadReportInterface } from '@desktop-contracts/almacen/caducidades/caducidad-report.interface';
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

  /**
   * Crea el gestor de la ventana independiente
   * utilizada por el informe de Caducidades.
   */
  constructor(
    private readonly getMainWindow: BrowserWindowProvider,
    private readonly applicationLogger: ApplicationLogger,
  ) {}

  /**
   * Abre una ventana independiente con el snapshot indicado.
   *
   * Tener ya un informe abierto es un estado esperado
   * y no se registra como incidencia técnica.
   */
  async open(documento: CaducidadReportInterface): Promise<void> {
    if (this.reportWindow !== null && !this.reportWindow.isDestroyed()) {
      this.reportWindow.focus();

      throw new Error('Ya hay un informe de Caducidades abierto.');
    }

    const mainWindow: BrowserWindow | null = this.getMainWindow();

    if (mainWindow === null || mainWindow.isDestroyed()) {
      const error: Error = new Error('La ventana principal no está disponible.');

      this.applicationLogger.warn({
        area: 'almacen',
        operation: 'open-expiration-report-window',
        message: 'No se ha podido abrir la ventana del informe de Caducidades.',
        error,
      });

      throw error;
    }

    let browserWindow: BrowserWindow | null = null;

    try {
      browserWindow = new BrowserWindow({
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

      await this.loadRenderer(browserWindow);

      if (browserWindow.isDestroyed()) {
        throw new Error('La ventana del informe se ha cerrado durante su carga.');
      }

      browserWindow.maximize();
      browserWindow.show();
    } catch (error: unknown) {
      if (browserWindow !== null && !browserWindow.isDestroyed()) {
        browserWindow.destroy();
      }

      if (this.reportWindow === browserWindow) {
        this.reportWindow = null;
        this.documento = null;
      }

      this.applicationLogger.warn({
        area: 'almacen',
        operation: 'open-expiration-report-window',
        message: 'No se ha podido abrir la ventana del informe de Caducidades.',
        error,
      });

      throw error;
    }
  }

  /**
   * Devuelve el snapshot exclusivamente al renderer autorizado.
   *
   * Una imposibilidad de recuperar el snapshot desde
   * la ventana abierta indica una incidencia técnica.
   */
  getDocumento(senderWebContentsId: number): CaducidadReportInterface {
    try {
      this.requireAuthorizedWindow(senderWebContentsId);

      if (this.documento === null) {
        throw new Error('No hay un informe de Caducidades disponible.');
      }

      return this.documento;
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'almacen',
        operation: 'load-expiration-report-document',
        message: 'No se ha podido recuperar el documento del informe de Caducidades.',
        error,
      });

      throw error;
    }
  }

  /**
   * Abre el diálogo estándar de impresión del sistema
   * para el estado actualmente visible del informe.
   *
   * La cancelación voluntaria del usuario se resuelve
   * normalmente y no genera ninguna entrada de log.
   */
  async print(senderWebContentsId: number): Promise<void> {
    try {
      const browserWindow: BrowserWindow = this.requireAuthorizedWindow(senderWebContentsId);

      await new Promise<void>((resolve: () => void, reject: (reason: Error) => void): void => {
        browserWindow.webContents.print(
          {
            silent: false,
            printBackground: true,
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
                  ? 'No se ha podido imprimir el informe de caducidades.'
                  : `No se ha podido imprimir el informe de caducidades: ${reason}`,
              ),
            );
          },
        );
      });
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'almacen',
        operation: 'print-expiration-report',
        message: 'No se ha podido imprimir el informe de Caducidades.',
        error,
      });

      throw error;
    }
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
