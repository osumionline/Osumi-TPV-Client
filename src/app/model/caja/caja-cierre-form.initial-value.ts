import type CajaCierreFormModel from '@model/caja/caja-cierre-form.model';

/**
 * Construye los valores editables iniciales del cierre de caja.
 */
export default function createCajaCierreFormInitialValue(): CajaCierreFormModel {
  return {
    retiradoEuros: 0,
    entradaEuros: 0,
  };
}
