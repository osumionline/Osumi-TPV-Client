import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';
import { TICKET_EMAIL_TEMPLATE_VARIABLES } from '@desktop-contracts/configuration/ticket-email-config.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, property: string): boolean {
  return typeof value[property] === 'string';
}

function hasNullableString(value: Record<string, unknown>, property: string): boolean {
  const candidate: unknown = value[property];

  return candidate === null || typeof candidate === 'string';
}

function hasBoolean(value: Record<string, unknown>, property: string): boolean {
  return typeof value[property] === 'boolean';
}

function hasNumber(value: Record<string, unknown>, property: string): boolean {
  return typeof value[property] === 'number' && Number.isFinite(value[property]);
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

function isLogoData(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasString(value, 'fileName') && hasString(value, 'mimeType') && hasString(value, 'dataUrl')
  );
}

function isIntegrationsData(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const ventaOnline: unknown = value['ventaOnline'];
  const emailSmtp: unknown = value['emailSmtp'];
  const ticketBai: unknown = value['ticketBai'];

  if (!isRecord(ventaOnline) || !isRecord(emailSmtp) || !isRecord(ticketBai)) {
    return false;
  }

  const validOnlineStore: boolean =
    hasBoolean(ventaOnline, 'active') &&
    hasString(ventaOnline, 'urlApi') &&
    hasNullableString(ventaOnline, 'secretApi');

  const validEmailSmtp: boolean =
    hasBoolean(emailSmtp, 'active') &&
    hasString(emailSmtp, 'host') &&
    hasNumber(emailSmtp, 'port') &&
    (emailSmtp['secure'] === 'none' ||
      emailSmtp['secure'] === 'tls' ||
      emailSmtp['secure'] === 'ssl') &&
    hasString(emailSmtp, 'user') &&
    hasNullableString(emailSmtp, 'password');

  const validTicketBai: boolean =
    hasBoolean(ticketBai, 'active') &&
    hasString(ticketBai, 'nif') &&
    (ticketBai['environment'] === 'test' || ticketBai['environment'] === 'production') &&
    hasNullableString(ticketBai, 'token');

  const validBackupApiKey: boolean = hasNullableString(value, 'backupApiKey');

  return validBackupApiKey && validOnlineStore && validEmailSmtp && validTicketBai;
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
  const integrations: unknown = value['integrations'];
  const logo: unknown = value['logo'];

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

  if (integrations !== undefined && !isIntegrationsData(integrations)) {
    return false;
  }

  if (logo !== undefined && !isLogoData(logo)) {
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

  validateIntegrations(command, errors);
  validateLogo(command, errors);

  return errors;
}

function validateIntegrations(command: ConfigurationUpdateCommand, errors: string[]): void {
  if (command.integrations === undefined) {
    return;
  }

  const { backupApiKey, ventaOnline, emailSmtp, ticketBai } = command.integrations;

  if (backupApiKey === '') {
    errors.push('La nueva clave de copias de seguridad no puede estar vacía.');
  }

  if (ventaOnline.active) {
    if (ventaOnline.urlApi.trim() === '') {
      errors.push('La URL de la tienda online es obligatoria.');
    } else {
      try {
        const url: URL = new URL(ventaOnline.urlApi);

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          errors.push('La URL de la tienda online debe utilizar HTTP o HTTPS.');
        }
      } catch {
        errors.push('La URL de la tienda online no es válida.');
      }
    }

    if (ventaOnline.secretApi === '') {
      errors.push('El nuevo secreto de la API no puede estar vacío.');
    }
  }

  if (emailSmtp.active) {
    if (emailSmtp.host.trim() === '') {
      errors.push('El servidor SMTP es obligatorio.');
    }

    if (!Number.isSafeInteger(emailSmtp.port) || emailSmtp.port < 1 || emailSmtp.port > 65_535) {
      errors.push('El puerto SMTP no es válido.');
    }

    if (emailSmtp.user.trim() === '') {
      errors.push('El usuario SMTP es obligatorio.');
    }

    if (emailSmtp.password === '') {
      errors.push('La nueva contraseña SMTP no puede estar vacía.');
    }
  }

  if (ticketBai.active) {
    if (ticketBai.nif.trim() === '') {
      errors.push('El NIF de TicketBAI es obligatorio.');
    }

    if (ticketBai.token === '') {
      errors.push('El nuevo token TicketBAI no puede estar vacío.');
    }
  }
}

function validateLogo(command: ConfigurationUpdateCommand, errors: string[]): void {
  if (command.logo === undefined) {
    return;
  }

  const acceptedLogoTypes: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

  if (!acceptedLogoTypes.includes(command.logo.mimeType)) {
    errors.push('El formato del logo no está permitido.');
  }

  const expectedPrefix: string = `data:${command.logo.mimeType};base64,`;

  if (!command.logo.dataUrl.startsWith(expectedPrefix)) {
    errors.push('Los datos del logo no son válidos.');
  }
}

/**
 * Busca la primera variable de plantilla de email
 * que no forme parte del conjunto permitido.
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
