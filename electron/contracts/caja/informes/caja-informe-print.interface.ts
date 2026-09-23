import type {
  InformeDetalladoConsulta,
  InformeDetalladoResultado,
} from '@desktop-contracts/caja/informes/informe-detallado.interface';
import type {
  InformeSimpleConsulta,
  InformeSimpleResultado,
} from '@desktop-contracts/caja/informes/informe-simple.interface';
import type {
  InformeVentasConsulta,
  InformeVentasResultado,
} from '@desktop-contracts/caja/informes/informe-ventas.interface';

export interface CajaInformeSimplePrintDocumento {
  readonly tipo: 'simple';
  readonly consulta: InformeSimpleConsulta;
  readonly resultado: InformeSimpleResultado;
}

export interface CajaInformeDetalladoPrintDocumento {
  readonly tipo: 'detallado';
  readonly consulta: InformeDetalladoConsulta;
  readonly resultado: InformeDetalladoResultado;
}

export interface CajaInformeVentasPrintDocumento {
  readonly tipo: 'ventas';
  readonly consulta: InformeVentasConsulta;
  readonly resultado: InformeVentasResultado;
}

export type CajaInformePrintDocumento =
  | CajaInformeSimplePrintDocumento
  | CajaInformeDetalladoPrintDocumento
  | CajaInformeVentasPrintDocumento;
