import type CajaInformePrintApi from '@desktop-contracts/caja/informes/caja-informe-print-api.interface';
import type { CajaInformePrintDocumento } from '@desktop-contracts/caja/informes/caja-informe-print.interface';
import IPC_CHANNELS from '@ipc/channels';
import { contextBridge, ipcRenderer } from 'electron';

const printApi: CajaInformePrintApi = Object.freeze({
  getDocumento: (): Promise<CajaInformePrintDocumento> =>
    ipcRenderer.invoke(
      IPC_CHANNELS.cajaInformePrintGetDocumento,
    ) as Promise<CajaInformePrintDocumento>,

  print: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.cajaInformePrintPrint) as Promise<void>,
});

contextBridge.exposeInMainWorld('osumiCajaInformePrint', printApi);
