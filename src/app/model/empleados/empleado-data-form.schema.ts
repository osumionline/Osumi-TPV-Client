import { required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type { EmpleadoDataFormModel } from '@model/empleados/empleado-data-form.model';

/**
 * Define las reglas de validación del formulario
 * de datos de un empleado.
 */
export default function empleadoDataFormSchema(path: SchemaPathTree<EmpleadoDataFormModel>): void {
  validate(path.nombre, ({ value }) => {
    const nombre: string = value().trim();

    if (nombre.length === 0) {
      return {
        kind: 'required',
        message: 'El nombre del empleado es obligatorio.',
      };
    }

    if (nombre.length > 100) {
      return {
        kind: 'maxLength',
        message: 'El nombre del empleado no puede superar los 100 caracteres.',
      };
    }

    return null;
  });

  required(path.password, {
    message: 'La contraseña del empleado es obligatoria.',

    when: ({ valueOf }): boolean =>
      valueOf(path.mode) === 'create' || valueOf(path.confirmPassword) !== '',
  });

  required(path.confirmPassword, {
    message: 'Debes confirmar la contraseña.',

    when: ({ valueOf }): boolean =>
      valueOf(path.mode) === 'create' || valueOf(path.password) !== '',
  });

  validate(path.confirmPassword, ({ value, valueOf }) => {
    const password: string = valueOf(path.password);

    const confirmPassword: string = value();

    if (password === '' && confirmPassword === '') {
      return null;
    }

    if (password !== confirmPassword) {
      return {
        kind: 'passwordMismatch',
        message: 'Las contraseñas introducidas no coinciden.',
      };
    }

    return null;
  });

  validate(path.color, ({ value }) => {
    if (/^#[0-9a-fA-F]{6}$/.test(value())) {
      return null;
    }

    return {
      kind: 'invalidColor',
      message: 'El color del empleado no es válido.',
    };
  });
}
