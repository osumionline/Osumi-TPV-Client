export interface PrintHtmlDocumentOptions {
  readonly openErrorMessage: string;
  readonly windowFeatures?: string;
}

/**
 * Abre un documento HTML en una ventana independiente,
 * conecta sus controles estándar de imprimir/cerrar y
 * lanza automáticamente el diálogo de impresión.
 *
 * Los documentos pueden incluir opcionalmente:
 *
 * print-button
 * close-button
 */
export function printHtmlDocument(documentHtml: string, options: PrintHtmlDocumentOptions): void {
  const printWindow: Window | null = window.open(
    '',
    '_blank',
    options.windowFeatures ?? 'popup=yes,width=1000,height=900',
  );

  if (printWindow === null) {
    throw new Error(options.openErrorMessage);
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
   * Esperamos dos frames para que Chromium haya realizado
   * el primer layout antes de mostrar la impresión.
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
