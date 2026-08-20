import type HtmlDocumentRenderer from '@backend/contracts/printing/html-document-renderer.interface';
import { BrowserWindow, type WebContents } from 'electron';
import type { Buffer } from 'node:buffer';

const MILLIMETERS_PER_INCH: number = 25.4;
const CSS_PIXELS_PER_INCH: number = 96;

/*
 * Los tickets actuales están diseñados para papel
 * térmico de 80 mm.
 *
 * Si en el futuro hacemos configurable el ancho del papel,
 * esta decisión saldrá de este renderer y pasará a formar
 * parte de las opciones del documento.
 */
const TICKET_WIDTH_MILLIMETERS: number = 80;
const TICKET_WIDTH_INCHES: number = TICKET_WIDTH_MILLIMETERS / MILLIMETERS_PER_INCH;

/*
 * Añadimos unos pocos píxeles al alto medido para evitar
 * que los errores de redondeo de Chromium provoquen una
 * segunda página prácticamente vacía.
 */
const DOCUMENT_HEIGHT_SAFETY_PIXELS: number = 4;

const MIN_DOCUMENT_HEIGHT_INCHES: number = 1;

/*
 * Dos metros de ticket son un límite defensivo muy amplio.
 * Si alguna vez llegásemos aquí probablemente habría un
 * documento anómalo que convendría revisar.
 */
const MAX_DOCUMENT_HEIGHT_INCHES: number = 2_000 / MILLIMETERS_PER_INCH;

export default class ElectronHtmlDocumentRenderer implements HtmlDocumentRenderer {
  async renderPdf(documentHtml: string): Promise<Buffer> {
    return this.withDocumentWindow(
      documentHtml,
      async (webContents: WebContents): Promise<Buffer> => {
        const documentHeightInches: number = await this.getDocumentHeightInches(webContents);

        return webContents.printToPDF({
          landscape: false,
          displayHeaderFooter: false,
          printBackground: true,
          pageSize: {
            width: TICKET_WIDTH_INCHES,
            height: documentHeightInches,
          },
          margins: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          },
        });
      },
    );
  }

  /**
   * Crea un renderer Chromium invisible durante el tiempo
   * estrictamente necesario para procesar el documento.
   */
  private async withDocumentWindow<T>(
    documentHtml: string,
    operation: (webContents: WebContents) => Promise<T>,
  ): Promise<T> {
    const documentWindow: BrowserWindow = new BrowserWindow({
      show: false,

      /*
       * Una altura pequeña evita que reglas CSS basadas
       * en 100vh inflen artificialmente la medición de
       * tickets cortos.
       */
      width: 360,
      height: 100,

      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        backgroundThrottling: false,
      },
    });

    documentWindow.webContents.setWindowOpenHandler(
      (): {
        action: 'deny';
      } => ({
        action: 'deny',
      }),
    );

    documentWindow.webContents.on('will-navigate', (event, navigationUrl: string): void => {
      if (!navigationUrl.startsWith('data:text/html')) {
        event.preventDefault();
      }
    });

    try {
      const documentUrl: string = `data:text/html;charset=utf-8,${encodeURIComponent(
        documentHtml,
      )}`;

      await documentWindow.loadURL(documentUrl);

      return await operation(documentWindow.webContents);
    } finally {
      if (!documentWindow.isDestroyed()) {
        documentWindow.destroy();
      }
    }
  }

  /**
   * Calcula la altura real del documento renderizado.
   *
   * printToPDF espera las dimensiones personalizadas
   * expresadas en pulgadas.
   */
  private async getDocumentHeightInches(webContents: WebContents): Promise<number> {
    const result: unknown = await webContents.executeJavaScript(
      `
          Math.ceil(
            Math.max(
              document.documentElement.scrollHeight,
              document.body?.scrollHeight ?? 0
            )
          )
        `,
      true,
    );

    if (typeof result !== 'number' || !Number.isFinite(result) || result <= 0) {
      throw new Error('No se ha podido calcular la altura del documento.');
    }

    const heightPixels: number = result + DOCUMENT_HEIGHT_SAFETY_PIXELS;

    const heightInches: number = Math.max(
      heightPixels / CSS_PIXELS_PER_INCH,
      MIN_DOCUMENT_HEIGHT_INCHES,
    );

    if (heightInches > MAX_DOCUMENT_HEIGHT_INCHES) {
      throw new RangeError('El documento es demasiado largo para generar el PDF.');
    }

    return heightInches;
  }
}
