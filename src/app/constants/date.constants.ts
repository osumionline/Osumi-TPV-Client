export interface MonthOption {
  readonly value: number;
  readonly label: string;
  readonly shortLabel: string;
}

/**
 * Meses del año utilizados por la interfaz.
 *
 * Es la fuente canónica para nombres completos,
 * abreviaturas y opciones de selección.
 */
export const MONTH_OPTIONS: readonly MonthOption[] = [
  {
    value: 1,
    label: 'Enero',
    shortLabel: 'Ene',
  },
  {
    value: 2,
    label: 'Febrero',
    shortLabel: 'Feb',
  },
  {
    value: 3,
    label: 'Marzo',
    shortLabel: 'Mar',
  },
  {
    value: 4,
    label: 'Abril',
    shortLabel: 'Abr',
  },
  {
    value: 5,
    label: 'Mayo',
    shortLabel: 'May',
  },
  {
    value: 6,
    label: 'Junio',
    shortLabel: 'Jun',
  },
  {
    value: 7,
    label: 'Julio',
    shortLabel: 'Jul',
  },
  {
    value: 8,
    label: 'Agosto',
    shortLabel: 'Ago',
  },
  {
    value: 9,
    label: 'Septiembre',
    shortLabel: 'Sep',
  },
  {
    value: 10,
    label: 'Octubre',
    shortLabel: 'Oct',
  },
  {
    value: 11,
    label: 'Noviembre',
    shortLabel: 'Nov',
  },
  {
    value: 12,
    label: 'Diciembre',
    shortLabel: 'Dic',
  },
];
