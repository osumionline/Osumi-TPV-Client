import type CaducidadReportApi from '@desktop-contracts/almacen/caducidad-report-api.interface';
import type { CaducidadReportInterface } from '@desktop-contracts/almacen/caducidad-report.interface';
import IPC_CHANNELS from '@ipc/channels';
import { contextBridge, ipcRenderer } from 'electron';

const reportApi: CaducidadReportApi = Object.freeze({
  getDocumento: (): Promise<CaducidadReportInterface> =>
    ipcRenderer.invoke(
      IPC_CHANNELS.caducidadReportGetDocumento,
    ) as Promise<CaducidadReportInterface>,
});

contextBridge.exposeInMainWorld('osumiCaducidadReport', reportApi);
