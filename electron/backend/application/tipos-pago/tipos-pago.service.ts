import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type TipoPagoRepository from '@backend/contracts/tipos-pago/tipo-pago.repository.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';

export default class TiposPagoService {
  /**
   * Crea el servicio de Tipos de pago.
   */
  constructor(
    private readonly repository: TipoPagoRepository,

    private readonly assetUrlBuilder: AssetUrlBuilder,
  ) {}

  /**
   * Obtiene todos los tipos de pago activos
   * disponibles para la aplicación.
   *
   * Incluye Efectivo porque forma parte
   * del maestro interno global.
   */
  async getAll(): Promise<readonly TipoPagoInterface[]> {
    const tiposPago: readonly TipoPagoRecord[] = await this.repository.findAll();

    return tiposPago.map((tipoPago: TipoPagoRecord): TipoPagoInterface =>
      this.toInterface(tipoPago),
    );
  }

  /**
   * Convierte el record interno al
   * contrato público del renderer.
   */
  private toInterface(tipoPago: TipoPagoRecord): TipoPagoInterface {
    return {
      id: tipoPago.id,
      publicId: tipoPago.publicId,
      nombre: tipoPago.nombre,
      slug: tipoPago.slug,
      foto: this.assetUrlBuilder.build(tipoPago.fotoRelativePath),
      afectaCaja: tipoPago.afectaCaja,
      orden: tipoPago.orden,
      fisico: tipoPago.fisico,
    };
  }
}
