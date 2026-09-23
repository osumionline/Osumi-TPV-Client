import type { InformePeriodoConsulta } from '@desktop-contracts/caja/informes/informe-periodo.interface';

export type InformeDetalladoConsulta = InformePeriodoConsulta;

export interface InformeDetalladoVentas {
  readonly numeroVentas: number;
  readonly numeroVentasAnterior: number;
  readonly diferenciaNumeroVentas: number;

  /**
   * Margen global ponderado del periodo,
   * expresado en puntos básicos.
   *
   * 3514 representa 35,14 %.
   */
  readonly margenBps: number;

  /**
   * Margen global ponderado del periodo anterior.
   *
   * Es null cuando no existe una base económica
   * comparable útil.
   */
  readonly margenAnteriorBps: number | null;

  /**
   * Diferencia entre ambos márgenes expresada
   * en puntos básicos / puntos porcentuales.
   *
   * Es null cuando no existe comparación útil.
   */
  readonly diferenciaMargenBps: number | null;
}

export interface InformeDetalladoMarca {
  readonly marcaPublicId: string;
  readonly nombre: string;

  readonly totalVentasPvpMicros: number;
  readonly totalBeneficioMicros: number;

  readonly margenBps: number;
  readonly margenAnteriorBps: number;
  readonly diferenciaMargenBps: number;

  /**
   * Peso de la facturación PVP de la marca
   * respecto al total del periodo.
   */
  readonly porcentajeVentasBps: number;
}

export interface InformeDetalladoMarcasTotales {
  readonly totalVentasPvpMicros: number;
  readonly totalBeneficioMicros: number;

  /**
   * Margen global ponderado de todas las marcas.
   */
  readonly margenBps: number;
}

export interface InformeDetalladoArticulo {
  /**
   * Puede ser null para conservar líneas históricas
   * cuyo artículo ya no pueda resolverse.
   */
  readonly idArticulo: number | null;

  readonly articuloPublicId: string | null;
  readonly marca: string;
  readonly nombre: string;

  readonly totalUnidadesVendidas: number;
  readonly totalVentasPvpMicros: number;
  readonly totalBeneficioMicros: number;

  readonly margenBps: number;

  /**
   * Es null si el artículo no dispone de una base
   * comparable válida en el periodo anterior.
   */
  readonly margenAnteriorBps: number | null;
  readonly diferenciaMargenBps: number | null;

  /**
   * Porcentaje de tickets distintos del periodo
   * en los que aparece este artículo.
   */
  readonly porcentajeVentasBps: number;
}

export interface InformeDetalladoArticulosTotales {
  readonly totalUnidadesVendidas: number;
  readonly totalVentasPvpMicros: number;
  readonly totalBeneficioMicros: number;
}

export interface InformeDetalladoResultado {
  readonly ventas: InformeDetalladoVentas;

  readonly marcas: readonly InformeDetalladoMarca[];
  readonly marcasTotales: InformeDetalladoMarcasTotales;

  /**
   * Como máximo contiene los 50 artículos
   * con mayor total de ventas PVP.
   */
  readonly articulos: readonly InformeDetalladoArticulo[];
  readonly articulosTotales: InformeDetalladoArticulosTotales;
}
