import { email, min, required, validate, type SchemaPathTree } from '@angular/forms/signals';
import { TICKET_EMAIL_TEMPLATE_VARIABLES } from '@desktop-contracts/configuration/ticket-email-config.interface';
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

  // Paso 3: SMTP

  required(path.emailSmtp.host, {
    message: 'El servidor SMTP es obligatorio.',
    when: ({ valueOf }): boolean => valueOf(path.emailSmtp.active),
  });

  required(path.emailSmtp.secure, {
    message: 'Debes elegir el tipo de seguridad SMTP.',
    when: ({ valueOf }): boolean => valueOf(path.emailSmtp.active),
  });

  required(path.emailSmtp.user, {
    message: 'El usuario SMTP es obligatorio.',
    when: ({ valueOf }): boolean => valueOf(path.emailSmtp.active),
  });

  required(path.emailSmtp.pass, {
    message: 'La contraseña SMTP es obligatoria.',
    when: ({ valueOf }): boolean => valueOf(path.emailSmtp.active),
  });

  validate(path.emailSmtp.port, ({ value, valueOf }) => {
    const active: boolean = valueOf(path.emailSmtp.active);
    const port: number = value();

    if (!active) {
      return null;
    }

    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      return {
        kind: 'invalidSmtpPort',
        message: 'El puerto SMTP debe estar entre 1 y 65535.',
      };
    }

    return null;
  });

  required(path.ticketEmail.subjectTemplate, {
    message: 'El asunto del email es obligatorio.',
    when: ({ valueOf }): boolean => valueOf(path.emailSmtp.active),
  });

  required(path.ticketEmail.bodyTemplate, {
    message: 'El cuerpo del email es obligatorio.',
    when: ({ valueOf }): boolean => valueOf(path.emailSmtp.active),
  });

  validate(path.ticketEmail.subjectTemplate, ({ value, valueOf }) => {
    if (!valueOf(path.emailSmtp.active)) {
      return null;
    }

    const unsupportedVariable: string | null = findUnsupportedTicketEmailVariable(value());

    if (unsupportedVariable === null) {
      return null;
    }

    return {
      kind: 'unsupportedTicketEmailVariable',
      message: `La variable ${unsupportedVariable} no está permitida en el asunto.`,
    };
  });

  validate(path.ticketEmail.bodyTemplate, ({ value, valueOf }) => {
    if (!valueOf(path.emailSmtp.active)) {
      return null;
    }

    const unsupportedVariable: string | null = findUnsupportedTicketEmailVariable(value());

    if (unsupportedVariable === null) {
      return null;
    }

    return {
      kind: 'unsupportedTicketEmailVariable',
      message: `La variable ${unsupportedVariable} no está permitida en el cuerpo.`,
    };
  });

  // Paso 3: TicketBAI

  required(path.ticketBai.nif, {
    message: 'El NIF de TicketBAI es obligatorio.',
    when: ({ valueOf }): boolean => valueOf(path.ticketBai.active),
  });

  required(path.ticketBai.token, {
    message: 'El token de TicketBAI es obligatorio.',
    when: ({ valueOf }): boolean => valueOf(path.ticketBai.active),
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

/**
 * Busca la primera variable de plantilla no soportada.
 */
function findUnsupportedTicketEmailVariable(value: string): string | null {
  const variables: readonly string[] = value.match(/\{[^{}]+\}/g) ?? [];

  return (
    variables.find(
      (variable: string): boolean =>
        !TICKET_EMAIL_TEMPLATE_VARIABLES.some(
          (allowedVariable: string): boolean => allowedVariable === variable,
        ),
    ) ?? null
  );
}
