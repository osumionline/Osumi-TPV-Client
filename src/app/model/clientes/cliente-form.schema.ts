import {
  applyWhen,
  email,
  max,
  maxLength,
  min,
  required,
  type SchemaPathTree,
} from '@angular/forms/signals';
import { PERCENT_TOTAL } from '@constants/percentage.constants';
import {
  CLIENT_DNI_CIF_MAX_LENGTH,
  CLIENT_EMAIL_MAX_LENGTH,
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_PHONE_MAX_LENGTH,
} from '@desktop-contracts/clientes/cliente-validation.constants';
import type ClienteFormModel from '@model/clientes/cliente-form.model';

export default function clienteFormSchema(path: SchemaPathTree<ClienteFormModel>): void {
  required(path.nombreApellidos, {
    message: 'El nombre y apellidos son obligatorios.',
  });

  maxLength(path.nombreApellidos, CLIENT_NAME_MAX_LENGTH, {
    message: `El nombre y apellidos no pueden superar los ${CLIENT_NAME_MAX_LENGTH} caracteres.`,
  });

  maxLength(path.dniCif, CLIENT_DNI_CIF_MAX_LENGTH, {
    message: `El DNI/CIF no puede superar los ${CLIENT_DNI_CIF_MAX_LENGTH} caracteres.`,
  });

  maxLength(path.telefono, CLIENT_PHONE_MAX_LENGTH, {
    message: `El teléfono no puede superar los ${CLIENT_PHONE_MAX_LENGTH} caracteres.`,
  });

  maxLength(path.email, CLIENT_EMAIL_MAX_LENGTH, {
    message: `El email no puede superar los ${CLIENT_EMAIL_MAX_LENGTH} caracteres.`,
  });

  email(path.email, {
    message: 'Introduce una dirección de correo válida.',
  });

  min(path.descuento, 0, {
    message: 'El descuento no puede ser negativo.',
  });

  max(path.descuento, PERCENT_TOTAL, {
    message: `El descuento no puede superar el ${PERCENT_TOTAL} %.`,
  });

  applyWhen(
    path,
    ({ valueOf }): boolean => !valueOf(path.factIgual),
    (billingPath: SchemaPathTree<ClienteFormModel>): void => {
      maxLength(billingPath.factNombreApellidos, CLIENT_NAME_MAX_LENGTH, {
        message: `El nombre de facturación no puede superar los ${CLIENT_NAME_MAX_LENGTH} caracteres.`,
      });

      maxLength(billingPath.factDniCif, CLIENT_DNI_CIF_MAX_LENGTH, {
        message: `El DNI/CIF de facturación no puede superar los ${CLIENT_DNI_CIF_MAX_LENGTH} caracteres.`,
      });

      maxLength(billingPath.factTelefono, CLIENT_PHONE_MAX_LENGTH, {
        message: `El teléfono de facturación no puede superar los ${CLIENT_PHONE_MAX_LENGTH} caracteres.`,
      });

      maxLength(billingPath.factEmail, CLIENT_EMAIL_MAX_LENGTH, {
        message: `El email de facturación no puede superar los ${CLIENT_EMAIL_MAX_LENGTH} caracteres.`,
      });

      email(billingPath.factEmail, {
        message: 'Introduce una dirección de correo de facturación válida.',
      });
    },
  );
}
