import { bootstrapApplication } from '@angular/platform-browser';

const WINDOW_QUERY_PARAMETER: string = 'window';
const FACTURA_PREVIEW_WINDOW: string = 'factura-preview';
const INVENTARIO_PRINT_WINDOW: string = 'inventario-print';
const CADUCIDAD_REPORT_WINDOW: string = 'caducidad-report';
const IMPRENTA_PRINT_WINDOW: string = 'imprenta-print';

/**
 * Arranca únicamente la aplicación correspondiente
 * al tipo de ventana Electron actual.
 */
async function bootstrap(): Promise<void> {
  const windowType: string | null = new URLSearchParams(window.location.search).get(
    WINDOW_QUERY_PARAMETER,
  );

  if (windowType === FACTURA_PREVIEW_WINDOW) {
    const [{ default: ClientInvoicePreviewComponent }, { default: facturaPreviewConfig }] =
      await Promise.all([
        import('@modules/clientes/pages/client-invoice-preview/client-invoice-preview.component'),
        import('@app/factura-preview.config'),
      ]);

    await bootstrapApplication(ClientInvoicePreviewComponent, facturaPreviewConfig);

    return;
  }

  if (windowType === INVENTARIO_PRINT_WINDOW) {
    const [{ default: InventoryPrintComponent }, { default: inventarioPrintConfig }] =
      await Promise.all([
        import('@modules/almacen/inventario/pages/inventory-print/inventory-print.component'),
        import('@app/inventario-print.config'),
      ]);

    await bootstrapApplication(InventoryPrintComponent, inventarioPrintConfig);

    return;
  }

  if (windowType === CADUCIDAD_REPORT_WINDOW) {
    const [{ default: CaducidadReportComponent }, { default: caducidadReportConfig }] =
      await Promise.all([
        import('@modules/almacen/caducidades/pages/caducidad-report/caducidad-report.component'),
        import('@app/caducidad-report.config'),
      ]);

    await bootstrapApplication(CaducidadReportComponent, caducidadReportConfig);

    return;
  }

  if (windowType === IMPRENTA_PRINT_WINDOW) {
    const [{ default: ImprentaPrintComponent }, { default: imprentaPrintConfig }] =
      await Promise.all([
        import('@modules/almacen/imprenta/pages/imprenta-print/imprenta-print.component'),
        import('@app/imprenta-print.config'),
      ]);

    await bootstrapApplication(ImprentaPrintComponent, imprentaPrintConfig);

    return;
  }

  const [{ default: App }, { default: appConfig }] = await Promise.all([
    import('@app/app'),
    import('@app/app.config'),
  ]);

  await bootstrapApplication(App, appConfig);
}

void bootstrap().catch((error: unknown): void => {
  console.error(error);
});
