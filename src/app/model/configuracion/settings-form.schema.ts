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
