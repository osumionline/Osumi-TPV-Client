import type InventarioCsvFileSaver from '@backend/contracts/almacen/inventario-csv-file-saver.interface';
import type { BrowserWindow, SaveDialogOptions, SaveDialogReturnValue } from 'electron';
import { dialog } from 'electron';
import { writeFile } from 'node:fs/promises';

/**
 * Guarda una exportación CSV mediante el diálogo nativo del sistema.
 */
export default class ElectronInventarioCsvFileSaver implements InventarioCsvFileSaver {
  constructor(private readonly windowProvider: () => BrowserWindow | null) {}

  /**
   * Solicita una ruta al usuario y escribe el fichero seleccionado.
   */
  async save(defaultFileName: string, content: string): Promise<boolean> {
    const options: SaveDialogOptions = {
      title: 'Exportar inventario',
      defaultPath: defaultFileName,
      buttonLabel: 'Guardar CSV',
      filters: [
        {
          name: 'Archivo CSV',
          extensions: ['csv'],
        },
      ],
    };

    const parentWindow: BrowserWindow | null = this.windowProvider();

    const result: SaveDialogReturnValue =
      parentWindow === null
        ? await dialog.showSaveDialog(options)
        : await dialog.showSaveDialog(parentWindow, options);

    if (result.canceled || result.filePath.length === 0) {
      return false;
    }

    const filePath: string = result.filePath.toLowerCase().endsWith('.csv')
      ? result.filePath
      : `${result.filePath}.csv`;

    await writeFile(filePath, content, 'utf8');

    return true;
  }
}
