import { maxLength, min, required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type SalidaCajaFormModel from '@model/caja/salida-caja-form.model';

/**
 * Define las validaciones del formulario
 * editable de una salida de caja.
 */
export default function salidaCajaFormSchema(path: SchemaPathTree<SalidaCajaFormModel>): void {
  required(path.concepto, {
    message: 'El concepto es obligatorio.',
  });

  maxLength(path.concepto, 250, {
    message: 'El concepto no puede superar los 250 caracteres.',
  });

  validate(path.concepto, ({ value }) => {
    if (value() !== '' && value().trim().length === 0) {
      return {
        kind: 'requiredTrimmed',
        message: 'El concepto es obligatorio.',
      };
    }

    return null;
  });

  min(path.importeEuros, 0.01, {
    message: 'El importe debe ser mayor que cero.',
  });
}
