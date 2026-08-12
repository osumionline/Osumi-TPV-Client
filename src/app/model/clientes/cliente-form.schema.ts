import { email, max, maxLength, min, required, type SchemaPathTree } from '@angular/forms/signals';
import type ClienteFormModel from '@model/clientes/cliente-form.model';

export default function clienteFormSchema(path: SchemaPathTree<ClienteFormModel>): void {
  required(path.nombreApellidos, {
    message: 'El nombre y apellidos son obligatorios.',
  });

  maxLength(path.nombreApellidos, 150, {
    message: 'El nombre y apellidos no pueden superar los 150 caracteres.',
  });

  maxLength(path.dniCif, 30, {
    message: 'El DNI/CIF no puede superar los 30 caracteres.',
  });

  maxLength(path.telefono, 30, {
    message: 'El teléfono no puede superar los 30 caracteres.',
  });

  maxLength(path.email, 254, {
    message: 'El email no puede superar los 254 caracteres.',
  });

  email(path.email, {
    message: 'Introduce una dirección de correo válida.',
  });

  min(path.descuento, 0, {
    message: 'El descuento no puede ser negativo.',
  });

  max(path.descuento, 100, {
    message: 'El descuento no puede superar el 100 %.',
  });

  maxLength(path.factNombreApellidos, 150, {
    message: 'El nombre de facturación no puede superar los 150 caracteres.',
  });

  maxLength(path.factDniCif, 30, {
    message: 'El DNI/CIF de facturación no puede superar los 30 caracteres.',
  });

  maxLength(path.factTelefono, 30, {
    message: 'El teléfono de facturación no puede superar los 30 caracteres.',
  });

  maxLength(path.factEmail, 254, {
    message: 'El email de facturación no puede superar los 254 caracteres.',
  });

  email(path.factEmail, {
    message: 'Introduce una dirección de correo de facturación válida.',
  });
}
