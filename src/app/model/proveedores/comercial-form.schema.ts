import { email, required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type ComercialFormModel from '@model/proveedores/comercial-form.model';

/**
 * Define las validaciones del formulario
 * editable de un Comercial.
 */
export default function comercialFormSchema(path: SchemaPathTree<ComercialFormModel>): void {
  required(path.nombre, {
    message: 'El nombre del comercial es obligatorio.',
  });

  validate(path.nombre, ({ value }) => {
    const nombre: string = value();

    if (nombre !== '' && nombre.trim() === '') {
      return {
        kind: 'requiredTrimmed',
        message: 'El nombre del comercial es obligatorio.',
      };
    }

    return null;
  });

  email(path.email, {
    message: 'Introduce una dirección de correo válida.',
  });
}
