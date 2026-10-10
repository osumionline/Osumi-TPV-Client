import type ClienteFacturaDocumentosService from '@backend/application/clientes/cliente-factura-documentos.service';
import type ClienteFacturaPdfService from '@backend/application/clientes/cliente-factura-pdf.service';
import type ClienteFacturasService from '@backend/application/clientes/cliente-facturas.service';
import type ClienteFacturaPreviewWindow from '@backend/contracts/clientes/cliente-factura-preview-window.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type {
  ClienteFacturaDocumentoConsulta,
  ClienteFacturaDocumentoInterface,
} from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los canales exclusivos de la ventana
 * de previsualización de facturas.
 */
export default function registerClienteFacturaPreviewIpc(
  previewWindow: ClienteFacturaPreviewWindow,
  documentosService: ClienteFacturaDocumentosService,
  facturasService: ClienteFacturasService,
  pdfService: ClienteFacturaPdfService,
  applicationLogger: ApplicationLogger,
): void {
  ipcMain.handle(
    IPC_CHANNELS.clienteFacturaPreviewGetDocumento,
    async (event): Promise<ClienteFacturaDocumentoInterface> => {
      /*
       * getConsulta() registra por sí mismo cualquier
       * incidencia de autorización/contexto de ventana.
       */
      const consulta: ClienteFacturaDocumentoConsulta = previewWindow.getConsulta(event.sender.id);

      try {
        return await documentosService.getDocumento(consulta);
      } catch (error: unknown) {
        applicationLogger.warn({
          area: 'clientes',
          operation: 'load-invoice-preview-document',
          message: 'No se ha podido cargar el documento de previsualización de una factura.',
          error,
          context: {
            facturaPublicId: consulta.facturaPublicId,
          },
        });

        throw error;
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.clienteFacturaPreviewEmitir,
    async (event): Promise<ClienteFacturaDocumentoInterface> => {
      /*
       * Una incidencia de autorización pertenece a
       * ElectronClienteFacturaPreviewWindow.
       */
      const consulta: ClienteFacturaDocumentoConsulta = previewWindow.getConsulta(event.sender.id);

      /*
       * Esta operación todavía es pre-COMMIT.
       *
       * No registramos aquí sus errores porque ClienteFacturasService
       * puede devolver también estados o precondiciones de negocio que
       * esta capa no puede clasificar con suficiente precisión.
       */
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
       *
       * ClienteFacturaPdfService registra y absorbe
       * internamente cualquier incidencia de este proceso.
       */
      void pdfService.materializeAfterEmit({
        clientePublicId: consulta.clientePublicId,
        facturaPublicId: factura.publicId,
      });

      try {
        return await documentosService.getDocumento(consulta);
      } catch (error: unknown) {
        applicationLogger.warn({
          area: 'clientes',
          operation: 'post-commit-invoice-preview-refresh',
          message: 'La factura se ha emitido, pero no se ha podido actualizar su previsualización.',
          error,
          context: {
            facturaPublicId: factura.publicId,
          },
        });

        throw error;
      }
    },
  );
}
