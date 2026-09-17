import { email, required, validate, type SchemaPathTree } from '@angular/forms/signals';
import { TICKET_EMAIL_TEMPLATE_VARIABLES } from '@desktop-contracts/configuration/ticket-email-config.interface';
import type {
  IvaOptionFormModel,
  MarginOptionFormModel,
} from '@model/configuracion/installation-form.model';
import type { SettingsFormModel } from '@model/configuracion/settings-form.model';

export default function settingsFormSchema(path: SchemaPathTree<SettingsFormModel>): void {
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

  required(path.fiscalidad.tipoIva, {
    message: 'Debes elegir IVA o recargo de equivalencia.',
  });

  validate(path.fiscalidad.ivaOptions, ({ value }) => {
    const options: IvaOptionFormModel[] = value();

    if (!options.some((option: IvaOptionFormModel): boolean => option.selected)) {
      return {
        kind: 'ivaRequired',
        message: 'Debes seleccionar al menos un tipo de IVA.',
      };
    }

    return null;
  });

  validate(path.fiscalidad.marginOptions, ({ value }) => {
    const options: MarginOptionFormModel[] = value();

    if (!options.some((option: MarginOptionFormModel): boolean => option.selected)) {
      return {
        kind: 'marginRequired',
        message: 'Debes seleccionar al menos un margen de beneficio.',
      };
    }

    return null;
  });

  required(path.ticketEmail.subjectTemplate, {
    message: 'El asunto del email del ticket es obligatorio.',
  });

  required(path.ticketEmail.bodyTemplate, {
    message: 'El cuerpo del email del ticket es obligatorio.',
  });

  validate(path.ticketEmail.subjectTemplate, ({ value }) => {
    const unsupportedVariable: string | null = findUnsupportedTicketEmailVariable(value());

    if (unsupportedVariable === null) {
      return null;
    }

    return {
      kind: 'unsupportedTicketEmailVariable',
      message: `La variable ${unsupportedVariable} no está permitida en el asunto.`,
    };
  });

  validate(path.ticketEmail.bodyTemplate, ({ value }) => {
    const unsupportedVariable: string | null = findUnsupportedTicketEmailVariable(value());

    if (unsupportedVariable === null) {
      return null;
    }

    return {
      kind: 'unsupportedTicketEmailVariable',
      message: `La variable ${unsupportedVariable} no está permitida en el cuerpo.`,
    };
  });

  required(path.ventaOnline.urlApi, {
    message: 'La URL de la API es obligatoria cuando hay tienda online.',
    when: ({ valueOf }): boolean => valueOf(path.ventaOnline.active),
  });

  validate(path.ventaOnline.urlApi, ({ value, valueOf }) => {
    if (!valueOf(path.ventaOnline.active)) {
      return null;
    }

    const urlValue: string = value();

    if (urlValue === '') {
      return null;
    }

    try {
      const url: URL = new URL(urlValue);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return {
          kind: 'invalidUrlProtocol',
          message: 'La URL debe utilizar HTTP o HTTPS.',
        };
      }

      return null;
    } catch {
      return {
        kind: 'invalidUrl',
        message: 'Introduce una URL válida para la API.',
      };
    }
  });

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

  validate(path.emailSmtp.port, ({ value, valueOf }) => {
    if (!valueOf(path.emailSmtp.active)) {
      return null;
    }

    const port: number = value();

    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      return {
        kind: 'invalidSmtpPort',
        message: 'El puerto SMTP debe estar entre 1 y 65535.',
      };
    }

    return null;
  });

  required(path.ticketBai.nif, {
    message: 'El NIF de TicketBAI es obligatorio.',
    when: ({ valueOf }): boolean => valueOf(path.ticketBai.active),
  });

  required(path.ticketBai.environment, {
    message: 'Debes elegir el entorno de TicketBAI.',
    when: ({ valueOf }): boolean => valueOf(path.ticketBai.active),
  });
}

/**
 * Busca la primera variable de plantilla de email no soportada.
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
