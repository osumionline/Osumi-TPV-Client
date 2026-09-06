import type ClienteFacturaDocumentosService from '@backend/application/clientes/cliente-factura-documentos.service';
import type ClienteFacturasService from '@backend/application/clientes/cliente-facturas.service';
import type ClienteFacturaPreviewWindow from '@backend/contracts/clientes/cliente-factura-preview-window.interface';
import type {
  ClienteFacturaDocumentoConsulta,
  ClienteFacturaDocumentoInterface,
} from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

export default function registerClienteFacturaPreviewIpc(
  previewWindow: ClienteFacturaPreviewWindow,
  documentosService: ClienteFacturaDocumentosService,
  facturasService: ClienteFacturasService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.clienteFacturaPreviewGetDocumento,
    async (event): Promise<ClienteFacturaDocumentoInterface> => {
      const consulta: ClienteFacturaDocumentoConsulta = previewWindow.getConsulta(event.sender.id);

      return documentosService.getDocumento(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clienteFacturaPreviewEmitir,
    async (event): Promise<ClienteFacturaDocumentoInterface> => {
      const consulta: ClienteFacturaDocumentoConsulta = previewWindow.getConsulta(event.sender.id);

      const factura: ClienteFacturaInterface = await facturasService.emitBorrador({
        clientePublicId: consulta.clientePublicId,
        borradorPublicId: consulta.facturaPublicId,
      });

      /*
       * El COMMIT ya se ha confirmado. Guardamos
       * inmediatamente el resultado antes de cualquier
       * lectura documental posterior.
       */
      previewWindow.markEmitted(event.sender.id, factura);

      return documentosService.getDocumento(consulta);
    },
  );
}
