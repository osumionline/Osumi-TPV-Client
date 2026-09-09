import type CaducidadReportApi from '@desktop-contracts/almacen/caducidades/caducidad-report-api.interface';
import type { CaducidadReportInterface } from '@desktop-contracts/almacen/caducidades/caducidad-report.interface';
import IPC_CHANNELS from '@ipc/channels';
import { contextBridge, ipcRenderer } from 'electron';

const reportApi: CaducidadReportApi = Object.freeze({
  getDocumento: (): Promise<CaducidadReportInterface> =>
    ipcRenderer.invoke(
      IPC_CHANNELS.caducidadReportGetDocumento,
    ) as Promise<CaducidadReportInterface>,
  print: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.caducidadReportPrint) as Promise<void>,
});

contextBridge.exposeInMainWorld('osumiCaducidadReport', reportApi);
