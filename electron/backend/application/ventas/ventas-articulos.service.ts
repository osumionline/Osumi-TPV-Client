import type VentasArticulosRepository from '@backend/contracts/ventas/ventas-articulos.repository.interface';
import type {
  AccesoDirectoVentaRecord,
  ArticuloVentaRecord,
} from '@backend/domain/ventas/articulo-venta-record.interface';
import type AccesoDirectoVentaInterface from '@desktop-contracts/ventas/acceso-directo-venta.interface';
import type ArticuloVentaInterface from '@desktop-contracts/ventas/articulo-venta.interface';

/**
 * Resuelve y busca artículos utilizando las reglas necesarias para el módulo de ventas.
 */
export default class VentasArticulosService {
  constructor(private readonly ventasArticulosRepository: VentasArticulosRepository) {}

  /**
   * Resuelve un código introducido o escaneado y devuelve el artículo correspondiente.
   */
  async resolveArticulo(codigo: string): Promise<ArticuloVentaInterface | null> {
    const normalizedCode: string = codigo.trim();

    if (normalizedCode.length === 0) {
      return null;
    }

    const codigoNumerico: number | null = this.getNumericCode(normalizedCode);

    const articulo: ArticuloVentaRecord | null = await this.ventasArticulosRepository.resolveByCode(
      normalizedCode,
      codigoNumerico,
    );

    return articulo === null ? null : this.mapArticulo(articulo);
  }

  /**
   * Busca artículos por nombre utilizando el mismo orden de palabras que ha introducido el usuario.
   */
  async searchArticulos(query: string): Promise<readonly ArticuloVentaInterface[]> {
    const searchPattern: string = this.getSearchPattern(query);

    const articulos: readonly ArticuloVentaRecord[] =
      await this.ventasArticulosRepository.search(searchPattern);

    return articulos.map((articulo: ArticuloVentaRecord): ArticuloVentaInterface =>
      this.mapArticulo(articulo),
    );
  }

  /**
   * Obtiene la lista de accesos directos disponibles para la venta.
   */
  async getAccesosDirectos(): Promise<readonly AccesoDirectoVentaInterface[]> {
    const accesos: readonly AccesoDirectoVentaRecord[] =
      await this.ventasArticulosRepository.getAccesosDirectos();

    return accesos.map((acceso: AccesoDirectoVentaRecord): AccesoDirectoVentaInterface => ({
      id: acceso.id,
      publicId: acceso.publicId,
      accesoDirecto: acceso.accesoDirecto,
      nombre: acceso.nombre,
    }));
  }

  /**
   * Convierte un código positivo representable de forma segura en su valor numérico.
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
   * Convierte el texto de búsqueda en un patrón compatible con los slugs del catálogo.
   */
  private getSearchPattern(query: string): string {
    const normalizedQuery: string = query
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    if (normalizedQuery.length === 0) {
      return '%';
    }

    return `%${normalizedQuery.split(/\s+/).join('%')}%`;
  }

  /**
   * Convierte el record interno de un artículo en el contrato público de Ventas.
   */
  private mapArticulo(articulo: ArticuloVentaRecord): ArticuloVentaInterface {
    return {
      id: articulo.id,
      publicId: articulo.publicId,
      localizador: articulo.localizador,
      nombre: articulo.nombre,
      marca: articulo.marca,
      pucMicros: articulo.pucMicros,
      pvpCents: articulo.pvpCents,
      pvpDescuentoCents: articulo.pvpDescuentoCents,
      ivaBps: articulo.ivaBps,
      stock: articulo.stock,
      fechaCaducidad: articulo.fechaCaducidad,
      observaciones: articulo.observaciones,
      mostrarObservacionesVentas: articulo.mostrarObservacionesVentas,
    };
  }
}
