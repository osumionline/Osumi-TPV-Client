import type { ClienteFacturaDocumentoInterface } from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type ClienteFacturaPreviewApi from '@desktop-contracts/clientes/cliente-factura-preview-api.interface';
import type ClienteFacturaPreviewEmitResult from '@desktop-contracts/clientes/cliente-factura-preview-emit-result.type';
import IPC_CHANNELS from '@ipc/channels';
import { contextBridge, ipcRenderer } from 'electron';

const previewApi: ClienteFacturaPreviewApi = Object.freeze({
  getDocumento: (): Promise<ClienteFacturaDocumentoInterface> =>
    ipcRenderer.invoke(
      IPC_CHANNELS.clienteFacturaPreviewGetDocumento,
    ) as Promise<ClienteFacturaDocumentoInterface>,

  emitFactura: (): Promise<ClienteFacturaPreviewEmitResult> =>
    ipcRenderer.invoke(
      IPC_CHANNELS.clienteFacturaPreviewEmitir,
    ) as Promise<ClienteFacturaPreviewEmitResult>,
});

contextBridge.exposeInMainWorld('osumiFacturaPreview', previewApi);
