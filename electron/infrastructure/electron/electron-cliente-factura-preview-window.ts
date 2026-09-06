import type ClienteFacturaPreviewWindow from '@backend/contracts/clientes/cliente-factura-preview-window.interface';
import type { ClienteFacturaDocumentoConsulta } from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import { getRendererAssetsDirectory } from '@infrastructure/electron/main-window';
import { BrowserWindow } from 'electron';
import { join } from 'node:path';

type BrowserWindowProvider = () => BrowserWindow | null;

const DEV_SERVER_URL: string | undefined = process.env['OSUMI_TPV_RENDERER_URL'];

export default class ElectronClienteFacturaPreviewWindow implements ClienteFacturaPreviewWindow {
  private previewWindow: BrowserWindow | null = null;
  private consulta: ClienteFacturaDocumentoConsulta | null = null;
  private emittedFactura: ClienteFacturaInterface | null = null;
  private resolveResult: ((factura: ClienteFacturaInterface | null) => void) | null = null;

  constructor(private readonly getMainWindow: BrowserWindowProvider) {}

  /**
   * Crea una ventana hija maximizada destinada
   * exclusivamente a la factura indicada.
   */
  async open(consulta: ClienteFacturaDocumentoConsulta): Promise<ClienteFacturaInterface | null> {
    if (this.previewWindow !== null && !this.previewWindow.isDestroyed()) {
      this.previewWindow.focus();

      throw new Error('Ya hay una previsualización de factura abierta.');
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
      title: 'Previsualización de factura',
      webPreferences: {
        preload: join(__dirname, 'factura-preview-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.previewWindow = browserWindow;
    this.consulta = {
      clientePublicId: consulta.clientePublicId,
      facturaPublicId: consulta.facturaPublicId,
    };
    this.emittedFactura = null;

    const resultPromise: Promise<ClienteFacturaInterface | null> =
      new Promise<ClienteFacturaInterface | null>(
        (resolve: (factura: ClienteFacturaInterface | null) => void): void => {
          this.resolveResult = resolve;
        },
      );

    browserWindow.once('ready-to-show', (): void => {
      browserWindow.maximize();
      browserWindow.show();
    });

    browserWindow.once('closed', (): void => {
      const emittedFactura: ClienteFacturaInterface | null = this.emittedFactura;
      const resolveResult: ((factura: ClienteFacturaInterface | null) => void) | null =
        this.resolveResult;

      this.previewWindow = null;
      this.consulta = null;
      this.emittedFactura = null;
      this.resolveResult = null;

      resolveResult?.(emittedFactura);
    });

    try {
      await this.loadRenderer(browserWindow);
    } catch (error: unknown) {
      if (!browserWindow.isDestroyed()) {
        browserWindow.destroy();
      }

      throw error;
    }

    return resultPromise;
  }

  /**
   * Devuelve el contexto solo cuando quien pregunta
   * es el webContents de la preview activa.
   */
  getConsulta(senderWebContentsId: number): ClienteFacturaDocumentoConsulta {
    if (
      this.previewWindow === null ||
      this.previewWindow.isDestroyed() ||
      this.previewWindow.webContents.id !== senderWebContentsId ||
      this.consulta === null
    ) {
      throw new Error('IPC request received from an unauthorized invoice preview window.');
    }

    return this.consulta;
  }

  /**
   * Conserva el resultado de emisión para devolvérselo
   * a la ventana principal cuando se cierre la preview.
   */
  markEmitted(senderWebContentsId: number, factura: ClienteFacturaInterface): void {
    this.getConsulta(senderWebContentsId);

    this.emittedFactura = factura;
  }

  /**
   * Carga el mismo renderer Angular con una entrada
   * específica tanto en desarrollo como en producción.
   */
  private async loadRenderer(browserWindow: BrowserWindow): Promise<void> {
    if (DEV_SERVER_URL !== undefined && DEV_SERVER_URL.length > 0) {
      const rendererUrl: URL = new URL(DEV_SERVER_URL);

      rendererUrl.searchParams.set('window', 'factura-preview');

      await browserWindow.loadURL(rendererUrl.toString());

      return;
    }

    await browserWindow.loadFile(join(getRendererAssetsDirectory(), 'index.html'), {
      query: {
        window: 'factura-preview',
      },
    });
  }
}
