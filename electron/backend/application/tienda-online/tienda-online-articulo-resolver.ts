import type TiendaOnlineArticulosRepository from '@backend/contracts/tienda-online/tienda-online-articulos.repository.interface';
import type { ArticuloVentaRecord } from '@backend/domain/ventas/articulo-venta-record.interface';

/**
 * Traduce los localizadores de una tienda online
 * a artículos existentes en Osumi TPV Client.
 *
 * No crea artículos ni modifica sus datos.
 */
export default class TiendaOnlineArticuloResolver {
  constructor(private readonly repository: TiendaOnlineArticulosRepository) {}

  /**
   * Identifica un artículo local a partir de su
   * localizador externo.
   *
   * La tienda transmite el localizador como texto,
   * porque puede contener ceros iniciales.
   *
   * El catálogo del TPV utiliza localizadores numéricos,
   * por lo que solo aceptamos enteros positivos seguros.
   *
   * Un artículo inexistente impide continuar la importación.
   */
  async resolve(localizador: string | null): Promise<ArticuloVentaRecord> {
    if (typeof localizador !== 'string' || !/^\d+$/.test(localizador)) {
      throw new Error('El localizador del artículo online no es válido.');
    }

    const numericLocalizador: number = Number(localizador);

    if (!Number.isSafeInteger(numericLocalizador) || numericLocalizador <= 0) {
      throw new Error('El localizador del artículo online no es válido.');
    }

    const article: ArticuloVentaRecord | null =
      await this.repository.findByLocalizador(numericLocalizador);

    if (article === null) {
      throw new Error(`No existe un artículo local con el localizador ${localizador}.`);
    }

    if (article.localizador !== numericLocalizador) {
      throw new Error('El artículo recuperado no corresponde al localizador solicitado.');
    }

    return article;
  }
}
