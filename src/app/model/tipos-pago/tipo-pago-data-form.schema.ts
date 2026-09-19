import { required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type { TipoPagoDataFormModel } from '@model/tipos-pago/tipo-pago-data-form.model';

/**
 * Define las reglas de validación del formulario
 * de datos de un tipo de pago.
 */
export default function tipoPagoDataFormSchema(path: SchemaPathTree<TipoPagoDataFormModel>): void {
  required(path.nombre, {
    message: 'El nombre del tipo de pago es obligatorio.',
  });

  validate(path.nombre, ({ value }) => {
    const nombre: string = value().trim();

    if (value() !== '' && nombre.length === 0) {
      return {
        kind: 'required',
        message: 'El nombre del tipo de pago es obligatorio.',
      };
    }

    if (nombre.length > 100) {
      return {
        kind: 'maxLength',
        message: 'El nombre del tipo de pago no puede superar los 100 caracteres.',
      };
    }

    return null;
  });

  validate(path.foto, ({ value }) => {
    const foto: string | null = value();

    if (foto === null || foto.trim() === '') {
      return {
        kind: 'required',
        message: 'El logo del tipo de pago es obligatorio.',
      };
    }

    return null;
  });
}
