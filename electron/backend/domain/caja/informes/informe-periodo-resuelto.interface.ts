import type { InformeMes } from '@desktop-contracts/caja/informes/informe-periodo.interface';

export interface InformeIntervaloUtc {
  readonly year: number;
  readonly month: InformeMes;

  /**
   * Inicio inclusivo del intervalo.
   */
  readonly desde: string;

  /**
   * Final exclusivo del intervalo.
   */
  readonly hastaExclusive: string;
}

export interface InformePeriodosResueltos {
  readonly actual: InformeIntervaloUtc;
  readonly anterior: InformeIntervaloUtc;
}
