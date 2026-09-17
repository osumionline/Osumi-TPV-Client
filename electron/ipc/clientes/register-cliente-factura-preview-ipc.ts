import type ClienteFacturaDocumentosService from '@backend/application/clientes/cliente-factura-documentos.service';
import type ClienteFacturaPdfService from '@backend/application/clientes/cliente-factura-pdf.service';
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
  pdfService: ClienteFacturaPdfService,
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
       * A partir de aquí el COMMIT es definitivo.
       * Guardamos primero el resultado para que cerrar
       * la preview nunca pierda esa información.
       */
      previewWindow.markEmitted(event.sender.id, factura);

      /*
       * La factura ya puede responder como emitida aunque
       * Chromium o filesystem fallen materializando el PDF.
       */
      void pdfService.materializeAfterEmit({
        clientePublicId: consulta.clientePublicId,
        facturaPublicId: factura.publicId,
      });

      return documentosService.getDocumento(consulta);
    },
  );
}
