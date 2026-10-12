import type { ClienteFacturaDocumentoInterface } from '@desktop-contracts/clientes/cliente-factura-documento.interface';

type ClienteFacturaPreviewEmitResult =
  | {
      readonly status: 'updated';
      readonly documento: ClienteFacturaDocumentoInterface;
    }
  | {
      readonly status: 'emitted-refresh-failed';
    };

export type { ClienteFacturaPreviewEmitResult as default };
