import { inject, Service } from '@angular/core';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import buildClienteProteccionDatosDocument from '@model/clientes/cliente-proteccion-datos-document.builder';
import type Cliente from '@model/clientes/cliente.model';
import ApplicationLoggingService from '@services/application/application-logging.service';
import ProvinciasService from '@services/application/provincias.service';
import { printHtmlDocument } from '@utils/print.utils';

@Service()
export default class ClienteProteccionDatosPrintService {
  private readonly loggingService: ApplicationLoggingService = inject(ApplicationLoggingService);
  private readonly provinciasService: ProvinciasService = inject(ProvinciasService);

  /**
   * Abre el documento de protección de datos en una ventana nueva
   * y muestra automáticamente el diálogo de impresión.
   *
   * Los datos personales y fiscales contenidos en el documento
   * nunca se incorporan al contexto del log.
   */
  print(appData: AppData, cliente: Cliente): void {
    try {
      const provincia: string | null =
        cliente.provincia === null
          ? null
          : (this.provinciasService.findById(cliente.provincia)?.name ?? null);

      const factProvincia: string | null =
        cliente.factProvincia === null
          ? null
          : (this.provinciasService.findById(cliente.factProvincia)?.name ?? null);

      const documentHtml: string = buildClienteProteccionDatosDocument(
        appData,
        cliente,
        provincia,
        factProvincia,
      );

      printHtmlDocument(documentHtml, {
        openErrorMessage: 'No se ha podido abrir la ventana del documento de protección de datos.',
        windowFeatures: 'popup=yes,width=1000,height=900',
      });
    } catch (error: unknown) {
      this.loggingService.warn({
        area: 'clientes',
        operation: 'print-data-protection-document',
        message: 'No se ha podido abrir el documento de protección de datos.',
        error,
      });

      throw error;
    }
  }
}
