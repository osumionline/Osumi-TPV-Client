import type A4DocumentRenderer from '@backend/contracts/printing/a4-document-renderer.interface';
import { BrowserWindow, type WebContents } from 'electron';

export default class ElectronA4DocumentRenderer implements A4DocumentRenderer {
  /**
   * Renderiza un HTML completo como PDF A4 respetando
   * la orientación definida por sus estilos.
   */
  async renderPdf(documentHtml: string): Promise<Uint8Array> {
    if (typeof documentHtml !== 'string' || documentHtml.trim().length === 0) {
      throw new Error('El documento HTML de la factura está vacío.');
    }

    const documentWindow: BrowserWindow = new BrowserWindow({
      show: false,
      width: 1280,
      height: 800,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        backgroundThrottling: false,
      },
    });

    documentWindow.webContents.setWindowOpenHandler((): { action: 'deny' } => ({
      action: 'deny',
    }));

    documentWindow.webContents.on('will-navigate', (event, navigationUrl: string): void => {
      if (!navigationUrl.startsWith('data:text/html')) {
        event.preventDefault();
      }
    });

    try {
      const documentUrl: string = `data:text/html;charset=utf-8,${encodeURIComponent(documentHtml)}`;

      await documentWindow.loadURL(documentUrl);
      await this.waitForDocumentAssets(documentWindow.webContents);

      const pdf: Uint8Array = new Uint8Array(
        await documentWindow.webContents.printToPDF({
          landscape: false,
          displayHeaderFooter: false,
          printBackground: true,
          pageSize: 'A4',
          preferCSSPageSize: true,
          margins: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          },
        }),
      );

      return pdf;
    } finally {
      if (!documentWindow.isDestroyed()) {
        documentWindow.destroy();
      }
    }
  }

  /**
   * Espera fuentes e imágenes para impedir que un
   * PDF oficial se materialice sin el logo.
   */
  private async waitForDocumentAssets(webContents: WebContents): Promise<void> {
    const result: unknown = await webContents.executeJavaScript(
      `
        (async () => {
          if (document.fonts?.ready) {
            await document.fonts.ready;
          }

          const images = Array.from(document.images);

          await Promise.all(
            images.map(
              (image) =>
                image.complete
                  ? Promise.resolve()
                  : new Promise((resolve) => {
                      image.addEventListener('load', resolve, { once: true });
                      image.addEventListener('error', resolve, { once: true });
                    })
            )
          );

          return images.every(
            (image) => image.complete && image.naturalWidth > 0
          );
        })()
      `,
      true,
    );

    if (result !== true) {
      throw new Error('No se han podido cargar todos los recursos de la factura.');
    }
  }
}
