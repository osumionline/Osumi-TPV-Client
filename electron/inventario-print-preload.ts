import type InventarioPrintApi from '@desktop-contracts/almacen/inventario-print-api.interface';
import type InventarioPrintDocumentoInterface from '@desktop-contracts/almacen/inventario-print.interface';
import IPC_CHANNELS from '@ipc/channels';
import { contextBridge, ipcRenderer } from 'electron';

const printApi: InventarioPrintApi = Object.freeze({
  getDocumento: (): Promise<InventarioPrintDocumentoInterface> =>
    ipcRenderer.invoke(
      IPC_CHANNELS.inventarioPrintGetDocumento,
    ) as Promise<InventarioPrintDocumentoInterface>,

  print: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.inventarioPrintPrint) as Promise<void>,
});

contextBridge.exposeInMainWorld('osumiInventarioPrint', printApi);
