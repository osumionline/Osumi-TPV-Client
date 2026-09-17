import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';
import { TICKET_EMAIL_TEMPLATE_VARIABLES } from '@desktop-contracts/configuration/ticket-email-config.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, property: string): boolean {
  return typeof value[property] === 'string';
}

function hasBoolean(value: Record<string, unknown>, property: string): boolean {
  return typeof value[property] === 'boolean';
}

function hasNumberArray(value: Record<string, unknown>, property: string): boolean {
  const candidate: unknown = value[property];

  return (
    Array.isArray(candidate) &&
    candidate.every((item: unknown): boolean => typeof item === 'number' && Number.isFinite(item))
  );
}

function hasStringArray(value: Record<string, unknown>, property: string): boolean {
  const candidate: unknown = value[property];

  return (
    Array.isArray(candidate) &&
    candidate.every((item: unknown): boolean => typeof item === 'string')
  );
}

/**
 * Comprueba la estructura mínima de un comando de
 * actualización de los ajustes generales.
 */
export function isConfigurationUpdateCommand(value: unknown): value is ConfigurationUpdateCommand {
  if (!isRecord(value)) {
    return false;
  }

  const negocio: unknown = value['negocio'];
  const redes: unknown = value['redes'];
  const ticket: unknown = value['ticket'];
  const ticketEmail: unknown = value['ticketEmail'];
  const fiscalidad: unknown = value['fiscalidad'];
  const opciones: unknown = value['opciones'];

  if (
    !isRecord(negocio) ||
    !isRecord(redes) ||
    !isRecord(ticket) ||
    !isRecord(ticketEmail) ||
    !isRecord(fiscalidad) ||
    !isRecord(opciones)
  ) {
    return false;
  }

  const validBusiness: boolean =
    hasString(negocio, 'nombre') &&
    hasString(negocio, 'nombreComercial') &&
    hasString(negocio, 'cif') &&
    hasString(negocio, 'telefono') &&
    hasString(negocio, 'email') &&
    hasString(negocio, 'direccion') &&
    hasString(negocio, 'poblacion');

  const validSocial: boolean =
    hasString(redes, 'twitter') &&
    hasString(redes, 'facebook') &&
    hasString(redes, 'instagram') &&
    hasString(redes, 'web');

  const validTicket: boolean = hasStringArray(ticket, 'frases');

  const validTicketEmail: boolean =
    hasString(ticketEmail, 'subjectTemplate') && hasString(ticketEmail, 'bodyTemplate');

  const validTaxData: boolean =
    hasString(fiscalidad, 'tipoIva') &&
    hasNumberArray(fiscalidad, 'ivaList') &&
    hasNumberArray(fiscalidad, 'reList') &&
    hasNumberArray(fiscalidad, 'marginList');

  const validOptions: boolean =
    hasBoolean(opciones, 'fechaCaducidad') && hasBoolean(opciones, 'empleados');

  return (
    validBusiness && validSocial && validTicket && validTicketEmail && validTaxData && validOptions
  );
}

/**
 * Comprueba las reglas funcionales de los ajustes.
 */
export function validateConfigurationUpdateCommand(
  command: ConfigurationUpdateCommand,
): readonly string[] {
  const errors: string[] = [];

  if (command.negocio.nombre.trim() === '') {
    errors.push('El nombre del negocio es obligatorio.');
  }

  if (command.negocio.nombreComercial.trim() === '') {
    errors.push('El nombre comercial es obligatorio.');
  }

  if (command.negocio.cif.trim() === '') {
    errors.push('El CIF del negocio es obligatorio.');
  }

  if (command.fiscalidad.tipoIva !== 'iva' && command.fiscalidad.tipoIva !== 're') {
    errors.push('El tipo de fiscalidad no es válido.');
  }

  if (command.fiscalidad.ivaList.length === 0) {
    errors.push('Debe seleccionarse al menos un tipo de IVA.');
  }

  if (command.fiscalidad.marginList.length === 0) {
    errors.push('Debe seleccionarse al menos un margen.');
  }

  if (
    command.fiscalidad.tipoIva === 're' &&
    command.fiscalidad.reList.length !== command.fiscalidad.ivaList.length
  ) {
    errors.push('Cada IVA debe tener asociado su recargo de equivalencia.');
  }

  if (command.fiscalidad.tipoIva === 'iva' && command.fiscalidad.reList.length > 0) {
    errors.push('No deben enviarse recargos cuando se usa únicamente IVA.');
  }

  if (command.ticketEmail.subjectTemplate.trim() === '') {
    errors.push('El asunto del email del ticket es obligatorio.');
  } else if (findUnsupportedTicketEmailVariable(command.ticketEmail.subjectTemplate) !== null) {
    errors.push('El asunto del email contiene una variable no permitida.');
  }

  if (command.ticketEmail.bodyTemplate.trim() === '') {
    errors.push('El cuerpo del email del ticket es obligatorio.');
  } else if (findUnsupportedTicketEmailVariable(command.ticketEmail.bodyTemplate) !== null) {
    errors.push('El cuerpo del email contiene una variable no permitida.');
  }

  return errors;
}

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
