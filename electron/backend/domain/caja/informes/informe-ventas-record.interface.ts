export interface InformeVentasCategoriaRecord {
  readonly idCategoria: number;
  readonly categoriaPublicId: string;
  readonly idPadre: number | null;
  readonly nombre: string;
  readonly orden: number;
}

export interface InformeVentasArticuloCategoriaRecord {
  readonly idArticulo: number;
  readonly idCategoria: number;
}

export interface InformeVentasLineaRecord {
  readonly idLinea: number;

  /**
   * Artículo actual utilizado exclusivamente
   * para resolver su clasificación actual.
   */
  readonly idArticulo: number;
  readonly articuloPublicId: string;

  /**
   * Snapshot histórico mostrado por el informe.
   */
  readonly idMarcaSnapshot: number | null;
  readonly marca: string;
  readonly nombreArticulo: string;

  readonly importeMicros: number;
  readonly unidades: number;
  readonly pvpMicros: number;
  readonly pucMicros: number;
}

export interface InformeVentasRepositoryResult {
  readonly categorias: readonly InformeVentasCategoriaRecord[];
  readonly articuloCategorias: readonly InformeVentasArticuloCategoriaRecord[];
  readonly lineas: readonly InformeVentasLineaRecord[];
}
