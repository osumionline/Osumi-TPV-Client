import type ArticulosRepository from '@backend/contracts/articulos/articulos.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type {
  ArticuloCodigoBarrasRecord,
  ArticuloFotoRecord,
  ArticuloRecord,
} from '@backend/domain/articulos/articulo-record.interface';
import type {
  ArticuloCodigoBarrasInterface,
  ArticuloFotoInterface,
  ArticuloInterface,
} from '@desktop-contracts/articulos/articulo.interface';

/**
 * Expone los casos de uso del módulo Artículos.
 */
export default class ArticulosService {
  /**
   * Crea el servicio de Artículos.
   */
  constructor(
    private readonly articulosRepository: ArticulosRepository,
    private readonly assetUrlBuilder: AssetUrlBuilder,
  ) {}

  /**
   * Obtiene el detalle de un artículo activo por su identificador.
   */
  async getById(idArticulo: number): Promise<ArticuloInterface | null> {
    if (!Number.isSafeInteger(idArticulo) || idArticulo <= 0) {
      return null;
    }

    const articulo: ArticuloRecord | null = await this.articulosRepository.findById(idArticulo);

    return articulo === null ? null : this.mapArticulo(articulo);
  }

  /**
   * Resuelve un localizador, acceso directo o código de barras.
   */
  async resolveByCode(codigo: string): Promise<ArticuloInterface | null> {
    const normalizedCode: string = codigo.trim();

    if (normalizedCode.length === 0) {
      return null;
    }

    const codigoNumerico: number | null = this.getNumericCode(normalizedCode);
    const idArticulo: number | null = await this.articulosRepository.resolveIdByCode(
      normalizedCode,
      codigoNumerico,
    );

    return idArticulo === null ? null : this.getById(idArticulo);
  }

  /**
   * Da de baja lógicamente un artículo activo.
   */
  async deactivate(idArticulo: number): Promise<void> {
    if (!Number.isSafeInteger(idArticulo) || idArticulo <= 0) {
      throw new Error('El identificador del artículo no es válido.');
    }

    await this.articulosRepository.deactivate(idArticulo);
  }

  /**
   * Convierte un código positivo representable de forma segura
   * en su valor numérico.
   */
  private getNumericCode(codigo: string): number | null {
    if (!/^\d+$/.test(codigo)) {
      return null;
    }

    const numericCode: number = Number(codigo);

    if (!Number.isSafeInteger(numericCode) || numericCode <= 0) {
      return null;
    }

    return numericCode;
  }

  /**
   * Convierte el record interno en el contrato público del artículo.
   */
  private mapArticulo(articulo: ArticuloRecord): ArticuloInterface {
    return {
      id: articulo.id,
      publicId: articulo.publicId,
      localizador: articulo.localizador,
      nombre: articulo.nombre,
      idMarca: articulo.idMarca,
      idProveedor: articulo.idProveedor,
      idsCategorias: [...articulo.idsCategorias],
      referencia: articulo.referencia,
      precioAlbaranMicros: articulo.precioAlbaranMicros,
      pucMicros: articulo.pucMicros,
      pvpCents: articulo.pvpCents,
      pvpDescuentoCents: articulo.pvpDescuentoCents,
      ivaBps: articulo.ivaBps,
      reBps: articulo.reBps,
      margenMicroporcentaje: articulo.margenMicroporcentaje,
      margenDescuentoMicroporcentaje: articulo.margenDescuentoMicroporcentaje,
      stock: articulo.stock,
      stockMin: articulo.stockMin,
      stockMax: articulo.stockMax,
      loteOptimo: articulo.loteOptimo,
      ventaOnline: articulo.ventaOnline,
      mostrarEnWeb: articulo.mostrarEnWeb,
      descripcionCorta: articulo.descripcionCorta,
      descripcionLarga: articulo.descripcionLarga,
      observaciones: articulo.observaciones,
      mostrarObservacionesPedidos: articulo.mostrarObservacionesPedidos,
      mostrarObservacionesVentas: articulo.mostrarObservacionesVentas,
      accesoDirecto: articulo.accesoDirecto,
      codigosBarras: articulo.codigosBarras.map(
        (codigo: ArticuloCodigoBarrasRecord): ArticuloCodigoBarrasInterface => ({
          id: codigo.id,
          publicId: codigo.publicId,
          codigo: codigo.codigo,
          porDefecto: codigo.porDefecto,
        }),
      ),
      fotos: articulo.fotos.map((foto: ArticuloFotoRecord): ArticuloFotoInterface =>
        this.mapFoto(foto),
      ),
    };
  }

  /**
   * Convierte una foto persistida en una URL segura para el renderer.
   */
  private mapFoto(foto: ArticuloFotoRecord): ArticuloFotoInterface {
    const url: string | null = this.assetUrlBuilder.build(foto.relativePath);

    if (url === null) {
      throw new Error('No se ha podido construir la URL de una foto del artículo.');
    }

    return {
      id: foto.id,
      publicId: foto.publicId,
      originalName: foto.originalName,
      url,
      mimeType: foto.mimeType,
      sizeBytes: foto.sizeBytes,
      width: foto.width,
      height: foto.height,
      orden: foto.orden,
      principal: foto.principal,
    };
  }
}
