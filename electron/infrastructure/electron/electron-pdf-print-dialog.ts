import type PdfPrintDialog from '@backend/contracts/printing/pdf-print-dialog.interface';
import { BrowserWindow } from 'electron';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type BrowserWindowProvider = () => BrowserWindow | null;

export default class ElectronPdfPrintDialog implements PdfPrintDialog {
  constructor(private readonly getMainWindow: BrowserWindowProvider) {}

  /**
   * Carga temporalmente el PDF inmutable y muestra
   * el diálogo estándar de impresión del sistema.
   */
  async open(pdf: Uint8Array): Promise<void> {
    const mainWindow: BrowserWindow | null = this.getMainWindow();

    if (mainWindow === null || mainWindow.isDestroyed()) {
      throw new Error('La ventana principal no está disponible.');
    }

    const temporaryDirectory: string = await mkdtemp(join(tmpdir(), 'osumi-tpv-factura-print-'));
    const temporaryFilePath: string = join(temporaryDirectory, 'factura.pdf');

    const documentWindow: BrowserWindow = new BrowserWindow({
      parent: mainWindow,
      show: false,
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        backgroundThrottling: false,
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

      await this.openPrintDialog(documentWindow);
    } finally {
      if (!documentWindow.isDestroyed()) {
        documentWindow.destroy();
      }

      await rm(temporaryDirectory, {
        recursive: true,
        force: true,
      });

      if (!mainWindow.isDestroyed()) {
        mainWindow.focus();
      }
    }
  }

  /**
   * Abre la selección nativa de impresora y considera
   * la cancelación del usuario una salida normal.
   */
  private openPrintDialog(documentWindow: BrowserWindow): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (reason: Error) => void): void => {
      documentWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          landscape: true,
          pageSize: 'A4',
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
                ? 'No se ha podido imprimir la factura.'
                : `No se ha podido imprimir la factura: ${reason}`,
            ),
          );
        },
      );
    });
  }
}
