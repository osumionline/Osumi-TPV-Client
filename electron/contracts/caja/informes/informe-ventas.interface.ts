import type { InformePeriodoConsulta } from '@desktop-contracts/caja/informes/informe-periodo.interface';

export interface InformeVentasConsulta extends InformePeriodoConsulta {
  readonly idCategoria: number;
}

export interface InformeVentasArticulo {
  /**
   * Artículo actual utilizado para resolver
   * su clasificación por categorías.
   */
  readonly idArticulo: number;

  readonly articuloPublicId: string;

  /**
   * Identidad histórica de la marca conservada
   * en las líneas de venta.
   */
  readonly idMarcaSnapshot: number | null;

  readonly marca: string;
  readonly nombre: string;

  /**
   * Importe final histórico de las líneas,
   * después de descuentos y ajustes.
   */
  readonly importeMicros: number;

  readonly unidades: number;

  /**
   * Magnitudes utilizadas para calcular
   * correctamente el margen ponderado.
   */
  readonly ventasPvpMicros: number;
  readonly beneficioMicros: number;

  readonly margenBps: number;
}

export interface InformeVentasMarca {
  readonly idMarcaSnapshot: number | null;
  readonly nombre: string;

  readonly importeMicros: number;
  readonly unidades: number;

  readonly ventasPvpMicros: number;
  readonly beneficioMicros: number;

  readonly margenBps: number;
}

export interface InformeVentasCategoria {
  readonly idCategoria: number;
  readonly categoriaPublicId: string;
  readonly nombre: string;

  /**
   * Agregado deduplicado de la categoría
   * y todos sus descendientes.
   */
  readonly importeMicros: number;
  readonly unidades: number;
  readonly ventasPvpMicros: number;
  readonly beneficioMicros: number;
  readonly margenBps: number;

  /**
   * Artículos asignados directamente a esta categoría.
   *
   * Los artículos de subcategorías aparecen dentro
   * de sus correspondientes nodos descendientes.
   */
  readonly articulos: readonly InformeVentasArticulo[];

  /**
   * Agrupaciones por marca de los artículos
   * directamente asociados a esta categoría.
   */
  readonly marcas: readonly InformeVentasMarca[];

  readonly subcategorias: readonly InformeVentasCategoria[];
}

export interface InformeVentasResultado {
  /**
   * Es null cuando la categoría existe pero
   * no tiene ventas en ninguna de sus ramas.
   */
  readonly categoria: InformeVentasCategoria | null;
}
