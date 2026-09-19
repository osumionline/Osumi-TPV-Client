import type { TipoPagoDataFormModel } from '@model/tipos-pago/tipo-pago-data-form.model';
import type TipoPago from '@model/tipos-pago/tipo-pago.model';

/**
 * Crea los valores iniciales del formulario
 * de datos de un tipo de pago.
 *
 * Un tipo de pago null representa un alta nueva.
 */
export default function createTipoPagoDataFormInitialValue(
  tipoPago: TipoPago | null,
): TipoPagoDataFormModel {
  if (tipoPago === null) {
    return {
      mode: 'create',
      nombre: '',
      afectaCaja: false,
      fisico: true,
      foto: null,
    };
  }

  return {
    mode: 'edit',
    nombre: tipoPago.nombre,
    afectaCaja: tipoPago.afectaCaja,
    fisico: tipoPago.fisico,
    foto: tipoPago.foto,
  };
}
