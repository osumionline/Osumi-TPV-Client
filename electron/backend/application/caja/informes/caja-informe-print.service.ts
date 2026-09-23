import type CajaInformePrintWindow from '@backend/contracts/caja/informes/caja-informe-print-window.interface';
import type InformeSimpleProvider from '@backend/contracts/caja/informes/informe-simple-provider.interface';
import type { CajaInformeSimplePrintDocumento } from '@desktop-contracts/caja/informes/caja-informe-print.interface';
import type {
  InformeSimpleConsulta,
  InformeSimpleResultado,
} from '@desktop-contracts/caja/informes/informe-simple.interface';

/**
 * Materializa snapshots de Informes de Caja
 * y los entrega a su ventana independiente.
 */
export default class CajaInformePrintService {
  constructor(
    private readonly informeSimpleProvider: InformeSimpleProvider,
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
}
