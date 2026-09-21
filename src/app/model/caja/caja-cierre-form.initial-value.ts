import type { CajaCierreFormModel } from '@model/caja/caja-cierre-form.model';

/**
 * Construye los valores editables iniciales del cierre de caja.
 */
export default function createCajaCierreFormInitialValue(): CajaCierreFormModel {
  return {
    retiradoEuros: 0,
    entradaEuros: 0,

    recuento: {
      cent1: null,
      cent2: null,
      cent5: null,
      cent10: null,
      cent20: null,
      cent50: null,

      euro1: null,
      euro2: null,
      euro5: null,
      euro10: null,
      euro20: null,
      euro50: null,
      euro100: null,
      euro200: null,
      euro500: null,
    },
  };
}
