import type CajaInformePrintWindow from '@backend/contracts/caja/informes/caja-informe-print-window.interface';
import type InformeDetalladoProvider from '@backend/contracts/caja/informes/informe-detallado-provider.interface';
import type InformeSimpleProvider from '@backend/contracts/caja/informes/informe-simple-provider.interface';
import type InformeVentasProvider from '@backend/contracts/caja/informes/informe-ventas-provider.interface';
import type {
  CajaInformeDetalladoPrintDocumento,
  CajaInformeSimplePrintDocumento,
  CajaInformeVentasPrintDocumento,
} from '@desktop-contracts/caja/informes/caja-informe-print.interface';
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

/**
 * Materializa snapshots de Informes de Caja
 * y los entrega a su ventana independiente.
 */
export default class CajaInformePrintService {
  constructor(
    private readonly informeSimpleProvider: InformeSimpleProvider,
    private readonly informeDetalladoProvider: InformeDetalladoProvider,
    private readonly informeVentasProvider: InformeVentasProvider,
    private readonly printWindow: CajaInformePrintWindow,
  ) {}

  /**
   * Genera y abre una vista imprimible
   * del Informe Simple solicitado.
   */
  async openSimple(consulta: InformeSimpleConsulta): Promise<void> {
    const resultado: InformeSimpleResultado = await this.informeSimpleProvider.getInforme(consulta);

    const documento: CajaInformeSimplePrintDocumento = {
      tipo: 'simple',

      consulta: {
        year: consulta.year,
        month: consulta.month,
      },

      resultado,
    };

    await this.printWindow.open(documento);
  }

  /**
   * Genera y abre una vista imprimible
   * del Informe Detallado solicitado.
   */
  async openDetallado(consulta: InformeDetalladoConsulta): Promise<void> {
    const resultado: InformeDetalladoResultado =
      await this.informeDetalladoProvider.getInforme(consulta);

    const documento: CajaInformeDetalladoPrintDocumento = {
      tipo: 'detallado',

      consulta: {
        year: consulta.year,
        month: consulta.month,
      },

      resultado,
    };

    await this.printWindow.open(documento);
  }

  /**
   * Genera y abre una vista imprimible
   * del Informe de Ventas solicitado.
   */
  async openVentas(consulta: InformeVentasConsulta): Promise<void> {
    const resultado: InformeVentasResultado = await this.informeVentasProvider.getInforme(consulta);

    const documento: CajaInformeVentasPrintDocumento = {
      tipo: 'ventas',

      consulta: {
        year: consulta.year,
        month: consulta.month,
        idCategoria: consulta.idCategoria,
      },

      resultado,
    };

    await this.printWindow.open(documento);
  }
}
