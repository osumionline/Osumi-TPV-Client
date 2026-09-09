import type CaducidadReportApi from '@desktop-contracts/almacen/caducidades/caducidad-report-api.interface';
import type ImprentaPrintApi from '@desktop-contracts/almacen/imprenta/imprenta-print-api.interface';
import type InventarioPrintApi from '@desktop-contracts/almacen/inventario/inventario-print-api.interface';
import type ClienteFacturaPreviewApi from '@desktop-contracts/clientes/cliente-factura-preview-api.interface';
import type OsumiDesktopApi from '@desktop-contracts/desktop-api';

export {};

declare global {
  interface Window {
    readonly osumiDesktop: OsumiDesktopApi;
    readonly osumiFacturaPreview: ClienteFacturaPreviewApi;
    readonly osumiInventarioPrint: InventarioPrintApi;
    readonly osumiCaducidadReport: CaducidadReportApi;
    readonly osumiImprentaPrint: ImprentaPrintApi;
  }
}
