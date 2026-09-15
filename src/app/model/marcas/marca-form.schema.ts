import { email, required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type MarcaFormModel from '@model/marcas/marca-form.model';

/**
 * Define las validaciones del formulario completo de Marca.
 */
export default function marcaFormSchema(path: SchemaPathTree<MarcaFormModel>): void {
  required(path.nombre, {
    message: 'El nombre de la marca es obligatorio.',
  });

  validate(path.nombre, ({ value }) => {
    const nombre: string = value();

    if (nombre !== '' && nombre.trim() === '') {
      return {
        kind: 'requiredTrimmed',
        message: 'El nombre de la marca es obligatorio.',
      };
    }

    return null;
  });

  email(path.email, {
    message: 'Introduce una dirección de correo válida.',
  });
}
