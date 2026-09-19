export type TipoPagoDataFormMode = 'create' | 'edit';

export interface TipoPagoDataFormModel {
  mode: TipoPagoDataFormMode;
  nombre: string;
  afectaCaja: boolean;
  fisico: boolean;
  foto: string | null;
}
