import type PedidoArchivoDialog from '@backend/contracts/compras/pedidos/pedido-archivo-dialog.interface';
import type { BrowserWindow, OpenDialogOptions, OpenDialogReturnValue } from 'electron';
import { dialog } from 'electron';

/**
 * Selecciona PDFs de Pedido mediante el diálogo
 * nativo del sistema operativo.
 */
export default class ElectronPedidoArchivoDialog implements PedidoArchivoDialog {
  constructor(private readonly windowProvider: () => BrowserWindow | null) {}

  /**
   * Solicita al usuario un único PDF.
   */
  async selectPdf(): Promise<string | null> {
    const options: OpenDialogOptions = {
      title: 'Adjuntar PDF al pedido',
      buttonLabel: 'Adjuntar PDF',
      properties: ['openFile'],
      filters: [
        {
          name: 'Documento PDF',
          extensions: ['pdf'],
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
