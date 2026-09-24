import type OtpvPackageDialog from '@backend/contracts/backup/otpv-package-dialog.interface';
import type { BrowserWindow, OpenDialogOptions, OpenDialogReturnValue } from 'electron';
import { dialog } from 'electron';

/**
 * Selecciona una copia o exportación `.otpv`
 * mediante el diálogo nativo de Electron.
 */
export default class ElectronOtpvPackageDialog implements OtpvPackageDialog {
  /**
   * Crea el selector utilizando la ventana principal
   * como padre cuando está disponible.
   */
  constructor(private readonly windowProvider: () => BrowserWindow | null) {}

  /**
   * Abre el selector nativo de archivos.
   */
  async selectPackage(): Promise<string | null> {
    const options: OpenDialogOptions = {
      title: 'Seleccionar copia o exportación de Osumi TPV',
      buttonLabel: 'Seleccionar paquete',
      properties: ['openFile'],
      filters: [
        {
          name: 'Paquete Osumi TPV',
          extensions: ['otpv'],
        },
      ],
    };

    const parentWindow: BrowserWindow | null = this.windowProvider();

    const result: OpenDialogReturnValue =
      parentWindow === null
        ? await dialog.showOpenDialog(options)
        : await dialog.showOpenDialog(parentWindow, options);

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0] ?? null;
  }
}
