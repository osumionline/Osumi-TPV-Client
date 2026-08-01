import type LegacyImportDialog from '@backend/contracts/legacy-import-dialog.interface';
import type { BrowserWindow, OpenDialogOptions, OpenDialogReturnValue } from 'electron';
import { dialog } from 'electron';

export default class ElectronLegacyImportDialog implements LegacyImportDialog {
  constructor(private readonly windowProvider: () => BrowserWindow | null) {}

  async selectPackage(): Promise<string | null> {
    const options: OpenDialogOptions = {
      title: 'Seleccionar exportación de Osumi TPV',

      buttonLabel: 'Seleccionar paquete',

      properties: ['openFile'],

      filters: [
        {
          name: 'Exportación de Osumi TPV',

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
