import type ImprentaPrintApi from '@desktop-contracts/almacen/imprenta-print-api.interface';
import type { ImprentaPrintDocumentoInterface } from '@desktop-contracts/almacen/imprenta-print.interface';
import IPC_CHANNELS from '@ipc/channels';
import { contextBridge, ipcRenderer } from 'electron';

const printApi: ImprentaPrintApi = Object.freeze({
  getDocumento: (): Promise<ImprentaPrintDocumentoInterface> =>
    ipcRenderer.invoke(
      IPC_CHANNELS.imprentaPrintGetDocumento,
    ) as Promise<ImprentaPrintDocumentoInterface>,
  print: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.imprentaPrintPrint) as Promise<void>,
});

contextBridge.exposeInMainWorld('osumiImprentaPrint', printApi);
