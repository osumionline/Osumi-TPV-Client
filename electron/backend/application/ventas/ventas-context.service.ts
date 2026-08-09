import type ConfigurationService from '@backend/application/configuration/configuration.service';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type VentasContextRepository from '@backend/contracts/ventas/ventas-context.repository.interface';
import type {
  TipoPagoRecord,
  VentasContextRecord,
} from '@backend/domain/ventas/ventas-context-record.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type TipoPagoInterface from '@desktop-contracts/tipos-pago/tipo-pago.interface';
import type VentasContextInterface from '@desktop-contracts/ventas/ventas-context.interface';

/**
 * Construye el contexto operativo que necesita el renderer para trabajar con ventas.
 */
export default class VentasContextService {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly ventasContextRepository: VentasContextRepository,
    private readonly assetUrlBuilder: AssetUrlBuilder,
  ) {}

  /**
   * Obtiene la configuración y el estado operativo actual del módulo de ventas.
   */
  async get(): Promise<VentasContextInterface> {
    const [appData, context]: [AppData | null, VentasContextRecord] = await Promise.all([
      this.configurationService.load(),
      this.ventasContextRepository.get(),
    ]);

    if (appData === null) {
      throw new Error('No se ha podido cargar la configuración de la aplicación.');
    }

    return {
      appData,
      terminal: context.terminal,
      cajaAbierta: context.cajaAbierta,
      tiposPago: context.tiposPago.map((tipoPago: TipoPagoRecord): TipoPagoInterface => ({
        id: tipoPago.id,
        publicId: tipoPago.publicId,
        nombre: tipoPago.nombre,
        slug: tipoPago.slug,
        foto: this.assetUrlBuilder.build(tipoPago.fotoRelativePath),
        afectaCaja: tipoPago.afectaCaja,
        orden: tipoPago.orden,
        fisico: tipoPago.fisico,
      })),
    };
  }
}
