import { inject, Service } from '@angular/core';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import buildClienteProteccionDatosDocument from '@model/clientes/cliente-proteccion-datos-document.builder';
import type Cliente from '@model/clientes/cliente.model';
import ProvinciasService from '@services/provincias.service';
import { printHtmlDocument } from '@utils/print.utils';

@Service()
export default class ClienteProteccionDatosPrintService {
  private readonly provinciasService: ProvinciasService = inject(ProvinciasService);

  /**
   * Abre el documento de protección de datos en una ventana nueva
   * y muestra automáticamente el diálogo de impresión.
   */
  print(appData: AppData, cliente: Cliente): void {
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
  }
}
