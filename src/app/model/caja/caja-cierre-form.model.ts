export interface CajaCierreRecuentoFormModel {
  readonly cent1: number | null;
  readonly cent2: number | null;
  readonly cent5: number | null;
  readonly cent10: number | null;
  readonly cent20: number | null;
  readonly cent50: number | null;

  readonly euro1: number | null;
  readonly euro2: number | null;
  readonly euro5: number | null;
  readonly euro10: number | null;
  readonly euro20: number | null;
  readonly euro50: number | null;
  readonly euro100: number | null;
  readonly euro200: number | null;
  readonly euro500: number | null;
}

export interface CajaCierreFormModel {
  readonly retiradoEuros: number;
  readonly entradaEuros: number;
  readonly recuento: CajaCierreRecuentoFormModel;
}
