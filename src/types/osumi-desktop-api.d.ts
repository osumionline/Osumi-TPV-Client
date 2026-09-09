import type ImprentaPrintApi from '@desktop-contracts/almacen/imprenta-print-api.interface';
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
