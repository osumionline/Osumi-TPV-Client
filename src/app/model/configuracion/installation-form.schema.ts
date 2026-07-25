import { email, min, required, validate, type SchemaPathTree } from '@angular/forms/signals';
import {
  InstallationFormModel,
  IvaOptionFormModel,
  MarginOptionFormModel,
} from './installation-form.model';

export default function installationFormSchema(path: SchemaPathTree<InstallationFormModel>): void {
  // Paso 1: datos del negocio

  required(path.negocio.nombre, {
    message: 'El nombre del negocio es obligatorio.',
  });

  required(path.negocio.nombreComercial, {
    message: 'El nombre comercial es obligatorio.',
  });

  required(path.negocio.cif, {
    message: 'El CIF del negocio es obligatorio.',
  });

  email(path.negocio.email, {
    message: 'Introduce una dirección de correo válida.',
  });

  required(path.negocio.logoDataUrl, {
    message: 'Debes seleccionar un logo.',
  });

  // Paso 1: empleado inicial

  required(path.empleado.nombre, {
    message: 'El nombre del empleado inicial es obligatorio.',
  });

  required(path.empleado.password, {
    message: 'La contraseña del empleado inicial es obligatoria.',
  });

  required(path.empleado.confirmPassword, {
    message: 'Debes confirmar la contraseña.',
  });

  required(path.empleado.color, {
    message: 'El color del empleado inicial es obligatorio.',
  });

  validate(path.empleado.confirmPassword, ({ value, valueOf }) => {
    const password: string = valueOf(path.empleado.password);

    const confirmPassword: string = value();

    if (confirmPassword !== '' && password !== confirmPassword) {
      return {
        kind: 'passwordMismatch',
        message: 'Las contraseñas introducidas no coinciden.',
      };
    }

    return null;
  });

  // Paso 1: valores iniciales

  min(path.valoresIniciales.cajaInicial, 0, {
    message: 'El importe inicial de caja no puede ser negativo.',
  });

  min(path.valoresIniciales.ticketInicial, 1, {
    message: 'El número inicial de ticket debe ser como mínimo 1.',
  });

  min(path.valoresIniciales.facturaInicial, 1, {
    message: 'El número inicial de factura debe ser como mínimo 1.',
  });

  // Paso 2: fiscalidad

  required(path.fiscalidad.tipoIva, {
    message: 'Debes elegir IVA o recargo de equivalencia.',
  });

  validate(path.fiscalidad.ivaOptions, ({ value }) => {
    const options: IvaOptionFormModel[] = value();

    const selected: boolean = options.some(
      (option: IvaOptionFormModel): boolean => option.selected,
    );

    if (!selected) {
      return {
        kind: 'ivaRequired',
        message: 'Debes seleccionar al menos un tipo de IVA.',
      };
    }

    return null;
  });

  validate(path.fiscalidad.marginOptions, ({ value }) => {
    const options: MarginOptionFormModel[] = value();

    const selected: boolean = options.some(
      (option: MarginOptionFormModel): boolean => option.selected,
    );

    if (!selected) {
      return {
        kind: 'marginRequired',
        message: 'Debes seleccionar al menos un margen de beneficio.',
      };
    }

    return null;
  });

  // Paso 3: tienda online

  required(path.ventaOnline.urlApi, {
    message: 'La URL de la API es obligatoria cuando hay tienda online.',
    when: ({ valueOf }): boolean => valueOf(path.ventaOnline.active),
  });

  required(path.ventaOnline.secretApi, {
    message: 'El secreto de la API es obligatorio cuando hay tienda online.',
    when: ({ valueOf }): boolean => valueOf(path.ventaOnline.active),
  });

  validate(path.ventaOnline.urlApi, ({ value, valueOf }) => {
    const active: boolean = valueOf(path.ventaOnline.active);

    const url: string = value();

    if (!active || url === '') {
      return null;
    }

    try {
      new URL(url);

      return null;
    } catch {
      return {
        kind: 'invalidUrl',
        message: 'Introduce una URL válida para la API.',
      };
    }
  });
}
