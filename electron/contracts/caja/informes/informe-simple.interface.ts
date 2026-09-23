import type { InformePeriodoConsulta } from '@desktop-contracts/caja/informes/informe-periodo.interface';

export type InformeSimpleConsulta = InformePeriodoConsulta;

export type InformeSimpleGranularidad = 'dia' | 'mes';

export interface InformeSimpleTicket {
  readonly serie: string;
  readonly numero: number;
}

export interface InformeSimpleTipoPago {
  readonly publicId: string;
  readonly nombre: string;
  readonly slug: string;
  readonly orden: number;
}

export interface InformeSimpleImporteTipoPago {
  readonly tipoPagoPublicId: string;
  readonly importeCents: number;
}

export interface InformeSimpleItem {
  /**
   * Año civil representado por la fila.
   */
  readonly year: number;

  /**
   * Mes civil representado por la fila.
   *
   * 1 representa enero y 12 diciembre.
   */
  readonly month: number;

  /**
   * Día del mes cuando el informe es mensual.
   *
   * Es null cuando Mes = Todos y cada fila
   * representa un mes completo.
   */
  readonly day: number | null;

  /**
   * Número de ventas incluidas en la fila.
   */
  readonly numeroVentas: number;

  /**
   * Primer ticket del periodo representado.
   *
   * Es null cuando no existen ventas.
   */
  readonly primerTicket: InformeSimpleTicket | null;

  /**
   * Último ticket del periodo representado.
   *
   * Es null cuando no existen ventas.
   */
  readonly ultimoTicket: InformeSimpleTicket | null;

  /**
   * Importes netos realmente cobrados mediante
   * cada tipo de pago durante el periodo.
   */
  readonly importesTipoPago: readonly InformeSimpleImporteTipoPago[];

  /**
   * Total neto de las ventas del periodo.
   */
  readonly totalCents: number;

  /**
   * Acumulado progresivo desde el inicio
   * del informe hasta esta fila.
   */
  readonly sumaCents: number;
}

export interface InformeSimpleTotales {
  readonly numeroVentas: number;
  readonly primerTicket: InformeSimpleTicket | null;
  readonly ultimoTicket: InformeSimpleTicket | null;
  readonly importesTipoPago: readonly InformeSimpleImporteTipoPago[];
  readonly totalCents: number;
  readonly sumaCents: number;
}

export interface InformeSimpleResultado {
  readonly granularidad: InformeSimpleGranularidad;

  /**
   * Tipos de pago que originan las columnas
   * dinámicas del informe.
   */
  readonly tiposPago: readonly InformeSimpleTipoPago[];

  readonly items: readonly InformeSimpleItem[];
  readonly totales: InformeSimpleTotales;
}
