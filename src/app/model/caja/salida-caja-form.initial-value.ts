import type { SalidaCajaInterface } from '@desktop-contracts/caja/salida-caja.interface';
import type SalidaCajaFormModel from '@model/caja/salida-caja-form.model';
import { centsToEuros } from '@utils/money.utils';

/**
 * Construye el formulario editable de una salida de caja.
 */
export default function createSalidaCajaFormInitialValue(
  salida: SalidaCajaInterface | null = null,
): SalidaCajaFormModel {
  if (salida === null) {
    return {
      concepto: '',
      descripcion: '',
      importeEuros: 0,
    };
  }

  return {
    concepto: salida.concepto,
    descripcion: salida.descripcion ?? '',
    importeEuros: centsToEuros(salida.importeCents),
  };
}
