import { inject, Service } from '@angular/core';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import buildClienteProteccionDatosDocument from '@model/clientes/cliente-proteccion-datos-document.builder';
import type Cliente from '@model/clientes/cliente.model';
import ProvinciasService from '@services/provincias.service';

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

    const printWindow: Window | null = window.open('', '_blank', 'popup=yes,width=1000,height=900');

    if (printWindow === null) {
      throw new Error('No se ha podido abrir la ventana del documento de protección de datos.');
    }

    printWindow.document.open();
    printWindow.document.write(documentHtml);
    printWindow.document.close();

    const printButton: HTMLElement | null = printWindow.document.getElementById('print-button');

    const closeButton: HTMLElement | null = printWindow.document.getElementById('close-button');

    printButton?.addEventListener('click', (): void => {
      printWindow.focus();
      printWindow.print();
    });

    closeButton?.addEventListener('click', (): void => {
      printWindow.close();
    });

    /*
     * Esperamos dos frames para asegurarnos de que el documento
     * ya ha realizado su primer layout antes de abrir la impresión.
     */
    printWindow.requestAnimationFrame((): void => {
      printWindow.requestAnimationFrame((): void => {
        if (printWindow.closed) {
          return;
        }

        printWindow.focus();
        printWindow.print();
      });
    });
  }
}
