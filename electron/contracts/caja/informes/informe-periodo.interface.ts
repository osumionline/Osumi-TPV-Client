export type InformeMes = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'todos';

export interface InformePeriodoConsulta {
  readonly year: number;
  readonly month: InformeMes;
}
