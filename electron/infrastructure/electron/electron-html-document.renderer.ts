import type HtmlDocumentRenderer from '@backend/contracts/printing/html-document-renderer.interface';
import { BrowserWindow, type WebContents } from 'electron';
import type { Buffer } from 'node:buffer';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MILLIMETERS_PER_INCH: number = 25.4;
const MICRONS_PER_MILLIMETER: number = 1_000;
const CSS_PIXELS_PER_INCH: number = 96;

/*
 * Los tickets actuales están diseñados para
 * papel térmico de 80 mm.
 */
const TICKET_WIDTH_MILLIMETERS: number = 80;

const TICKET_WIDTH_INCHES: number = TICKET_WIDTH_MILLIMETERS / MILLIMETERS_PER_INCH;

const TICKET_WIDTH_MICRONS: number = TICKET_WIDTH_MILLIMETERS * MICRONS_PER_MILLIMETER;

/*
 * Añadimos unos pocos píxeles al alto medido
 * para evitar errores de redondeo de Chromium.
 */
const DOCUMENT_HEIGHT_SAFETY_PIXELS: number = 4;

const MIN_DOCUMENT_HEIGHT_INCHES: number = 1;

/*
 * Límite defensivo: dos metros de ticket.
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
   * Imprime silenciosamente el documento utilizando
   * directamente la impresora indicada.
   */
  async print(documentHtml: string, deviceName: string): Promise<void> {
    return this.withDocumentWindow(
      documentHtml,
      async (webContents: WebContents): Promise<void> => {
        const documentHeightMicrons: number = await this.getDocumentHeightMicrons(webContents);

        await new Promise<void>((resolve, reject): void => {
          webContents.print(
            {
              silent: true,
              printBackground: true,
              deviceName,
              landscape: false,
              margins: {
                marginType: 'none',
              },
              pageSize: {
                width: TICKET_WIDTH_MICRONS,
                height: documentHeightMicrons,
              },
              copies: 1,
              duplexMode: 'simplex',
            },
            (success: boolean, failureReason: string): void => {
              if (success) {
                resolve();

                return;
              }

              const reason: string = failureReason.trim();

              reject(
                new Error(
                  reason.length === 0
                    ? 'No se ha podido imprimir el documento.'
                    : `No se ha podido imprimir el documento: ${reason}`,
                ),
              );
            },
          );
        });
      },
    );
  }

  /**
   * Imprime silenciosamente un PDF ya materializado.
   *
   * El fichero temporal solo existe mientras Chromium
   * mantiene cargado el documento para enviarlo a la
   * cola de impresión.
   */
  async printPdf(pdf: Uint8Array, deviceName: string): Promise<void> {
    const temporaryDirectory: string = await mkdtemp(join(tmpdir(), 'osumi-tpv-print-pdf-'));

    const temporaryFilePath: string = join(temporaryDirectory, 'ticket.pdf');

    const documentWindow: BrowserWindow = new BrowserWindow({
      show: false,
      width: 360,
      height: 100,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        backgroundThrottling: false,

        /*
         * Necesario para que Chromium pueda mostrar
         * el PDF mediante su visor integrado.
         */
        plugins: true,
      },
    });

    documentWindow.webContents.setWindowOpenHandler((): { action: 'deny' } => ({
      action: 'deny',
    }));

    try {
      await writeFile(temporaryFilePath, pdf, {
        mode: 0o600,
      });

      await documentWindow.loadFile(temporaryFilePath);

      await new Promise<void>((resolve, reject): void => {
        documentWindow.webContents.print(
          {
            silent: true,
            printBackground: true,
            deviceName,
            landscape: false,
            margins: {
              marginType: 'none',
            },

            /*
             * El PDF ya contiene su geometría.
             *
             * El driver de la impresora térmica debe
             * estar configurado con su papel de 80 mm.
             */
            usePrinterDefaultPageSize: true,

            copies: 1,
            duplexMode: 'simplex',
          },
          (success: boolean, failureReason: string): void => {
            if (success) {
              resolve();

              return;
            }

            const reason: string = failureReason.trim();

            reject(
              new Error(
                reason.length === 0
                  ? 'No se ha podido imprimir el PDF.'
                  : `No se ha podido imprimir el PDF: ${reason}`,
              ),
            );
          },
        );
      });
    } finally {
      if (!documentWindow.isDestroyed()) {
        documentWindow.destroy();
      }

      await rm(temporaryDirectory, {
        recursive: true,
        force: true,
      });
    }
  }

  /**
   * Crea un renderer Chromium invisible durante
   * el tiempo estrictamente necesario.
   */
  private async withDocumentWindow<T>(
    documentHtml: string,
    operation: (webContents: WebContents) => Promise<T>,
  ): Promise<T> {
    const documentWindow: BrowserWindow = new BrowserWindow({
      show: false,

      /*
       * Una altura pequeña evita que reglas CSS
       * basadas en 100vh inflen tickets cortos.
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
   * Calcula la altura del documento en pulgadas,
   * que es la unidad que utiliza printToPDF().
   */
  private async getDocumentHeightInches(webContents: WebContents): Promise<number> {
    const heightPixels: number = await this.getDocumentHeightPixels(webContents);

    const heightInches: number = Math.max(
      heightPixels / CSS_PIXELS_PER_INCH,
      MIN_DOCUMENT_HEIGHT_INCHES,
    );

    if (heightInches > MAX_DOCUMENT_HEIGHT_INCHES) {
      throw new RangeError('El documento es demasiado largo para imprimir.');
    }

    return heightInches;
  }

  /**
   * Calcula la misma altura en micras, que es la
   * unidad utilizada por el pageSize personalizado
   * de webContents.print().
   */
  private async getDocumentHeightMicrons(webContents: WebContents): Promise<number> {
    const heightInches: number = await this.getDocumentHeightInches(webContents);

    return Math.ceil(heightInches * MILLIMETERS_PER_INCH * MICRONS_PER_MILLIMETER);
  }

  private async getDocumentHeightPixels(webContents: WebContents): Promise<number> {
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

    return result + DOCUMENT_HEIGHT_SAFETY_PIXELS;
  }
}
