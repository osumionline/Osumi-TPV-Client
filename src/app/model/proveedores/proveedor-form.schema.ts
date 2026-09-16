import { email, required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type ProveedorFormModel from '@model/proveedores/proveedor-form.model';

/**
 * Define las validaciones del formulario
 * general de Proveedor.
 */
export default function proveedorFormSchema(path: SchemaPathTree<ProveedorFormModel>): void {
  required(path.nombre, {
    message: 'El nombre del proveedor es obligatorio.',
  });

  validate(path.nombre, ({ value }) => {
    const nombre: string = value();

    if (nombre !== '' && nombre.trim() === '') {
      return {
        kind: 'requiredTrimmed',
        message: 'El nombre del proveedor es obligatorio.',
      };
    }

    return null;
  });

  email(path.email, {
    message: 'Introduce una dirección de correo válida.',
  });
}
