import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationValidationError } from '@desktop-contracts/configuration/installation-result.interface';
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

function hasNumber(value: Record<string, unknown>, property: string): boolean {
  return typeof value[property] === 'number' && Number.isFinite(value[property]);
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

export function isInstallationCommand(value: unknown): value is InstallationCommand {
  if (!isRecord(value)) {
    return false;
  }

  const negocio: unknown = value['negocio'];
  const empleadoInicial: unknown = value['empleadoInicial'];
  const redes: unknown = value['redes'];
  const valoresIniciales: unknown = value['valoresIniciales'];
  const fiscalidad: unknown = value['fiscalidad'];
  const ventaOnline: unknown = value['ventaOnline'];
  const opciones: unknown = value['opciones'];
  const secretos: unknown = value['secretos'];
  const logo: unknown = value['logo'];
  const ticket: unknown = value['ticket'];
  const emailSmtp: unknown = value['emailSmtp'];
  const ticketEmail: unknown = value['ticketEmail'];
  const ticketBai: unknown = value['ticketBai'];

  if (
    !isRecord(negocio) ||
    !isRecord(empleadoInicial) ||
    !isRecord(redes) ||
    !isRecord(ticket) ||
    !isRecord(emailSmtp) ||
    !isRecord(ticketEmail) ||
    !isRecord(ticketBai) ||
    !isRecord(valoresIniciales) ||
    !isRecord(fiscalidad) ||
    !isRecord(ventaOnline) ||
    !isRecord(opciones) ||
    !isRecord(secretos) ||
    !isRecord(logo)
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

  const validEmployee: boolean =
    hasString(empleadoInicial, 'nombre') &&
    hasString(empleadoInicial, 'password') &&
    hasString(empleadoInicial, 'color');

  const validSocial: boolean =
    hasString(redes, 'twitter') &&
    hasString(redes, 'facebook') &&
    hasString(redes, 'instagram') &&
    hasString(redes, 'web');

  const validTicket: boolean = hasStringArray(ticket, 'frases');

  const validInitialValues: boolean =
    hasNumber(valoresIniciales, 'cajaInicial') &&
    hasNumber(valoresIniciales, 'ticketInicial') &&
    hasNumber(valoresIniciales, 'facturaInicial');

  const validTaxData: boolean =
    hasString(fiscalidad, 'tipoIva') &&
    hasNumberArray(fiscalidad, 'ivaList') &&
    hasNumberArray(fiscalidad, 'reList') &&
    hasNumberArray(fiscalidad, 'marginList');

  const validOnlineStore: boolean =
    hasBoolean(ventaOnline, 'active') && hasString(ventaOnline, 'urlApi');

  const validEmailSmtp: boolean =
    hasBoolean(emailSmtp, 'active') &&
    hasString(emailSmtp, 'host') &&
    hasNumber(emailSmtp, 'port') &&
    (emailSmtp['secure'] === 'none' ||
      emailSmtp['secure'] === 'tls' ||
      emailSmtp['secure'] === 'ssl') &&
    hasString(emailSmtp, 'user');

  const validTicketEmail: boolean =
    hasString(ticketEmail, 'subjectTemplate') && hasString(ticketEmail, 'bodyTemplate');

  const validTicketBai: boolean = hasBoolean(ticketBai, 'active') && hasString(ticketBai, 'nif');

  const validOptions: boolean =
    hasBoolean(opciones, 'fechaCaducidad') && hasBoolean(opciones, 'empleados');

  const validSecrets: boolean =
    hasString(secretos, 'secretApi') &&
    hasString(secretos, 'backupApiKey') &&
    hasNullableString(secretos, 'emailSmtpPass') &&
    hasNullableString(secretos, 'ticketBaiToken');

  const validLogo: boolean =
    hasString(logo, 'fileName') && hasString(logo, 'mimeType') && hasString(logo, 'dataUrl');

  return (
    validBusiness &&
    validEmployee &&
    validSocial &&
    validTicket &&
    validEmailSmtp &&
    validTicketEmail &&
    validTicketBai &&
    validInitialValues &&
    validTaxData &&
    validOnlineStore &&
    validOptions &&
    validSecrets &&
    validLogo
  );
}

export function validateInstallationCommand(
  command: InstallationCommand,
): InstallationValidationError[] {
  const errors: InstallationValidationError[] = [];

  const addError = (field: string, message: string): void => {
    errors.push({
      field,
      message,
    });
  };

  if (command.negocio.nombre.trim() === '') {
    addError('negocio.nombre', 'El nombre del negocio es obligatorio.');
  }

  if (command.negocio.nombreComercial.trim() === '') {
    addError('negocio.nombreComercial', 'El nombre comercial es obligatorio.');
  }

  if (command.negocio.cif.trim() === '') {
    addError('negocio.cif', 'El CIF del negocio es obligatorio.');
  }

  if (command.empleadoInicial.nombre.trim() === '') {
    addError('empleadoInicial.nombre', 'El nombre del empleado inicial es obligatorio.');
  }

  if (command.empleadoInicial.password === '') {
    addError('empleadoInicial.password', 'La contraseña del empleado inicial es obligatoria.');
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(command.empleadoInicial.color)) {
    addError('empleadoInicial.color', 'El color del empleado inicial no es válido.');
  }

  if (command.fiscalidad.tipoIva !== 'iva' && command.fiscalidad.tipoIva !== 're') {
    addError('fiscalidad.tipoIva', 'El tipo de fiscalidad no es válido.');
  }

  if (command.fiscalidad.ivaList.length === 0) {
    addError('fiscalidad.ivaList', 'Debe seleccionarse al menos un tipo de IVA.');
  }

  if (command.fiscalidad.marginList.length === 0) {
    addError('fiscalidad.marginList', 'Debe seleccionarse al menos un margen.');
  }

  if (
    command.fiscalidad.tipoIva === 're' &&
    command.fiscalidad.reList.length !== command.fiscalidad.ivaList.length
  ) {
    addError('fiscalidad.reList', 'Cada IVA debe tener asociado su recargo de equivalencia.');
  }

  if (command.fiscalidad.tipoIva === 'iva' && command.fiscalidad.reList.length > 0) {
    addError('fiscalidad.reList', 'No deben enviarse recargos cuando se usa únicamente IVA.');
  }

  if (command.valoresIniciales.cajaInicial < 0) {
    addError('valoresIniciales.cajaInicial', 'La caja inicial no puede ser negativa.');
  }

  if (
    !Number.isInteger(command.valoresIniciales.ticketInicial) ||
    command.valoresIniciales.ticketInicial < 1
  ) {
    addError('valoresIniciales.ticketInicial', 'El número inicial de ticket no es válido.');
  }

  if (
    !Number.isInteger(command.valoresIniciales.facturaInicial) ||
    command.valoresIniciales.facturaInicial < 1
  ) {
    addError('valoresIniciales.facturaInicial', 'El número inicial de factura no es válido.');
  }

  if (command.ventaOnline.active) {
    if (command.ventaOnline.urlApi.trim() === '') {
      addError('ventaOnline.urlApi', 'La URL de la tienda online es obligatoria.');
    } else {
      try {
        const url: URL = new URL(command.ventaOnline.urlApi);

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          addError('ventaOnline.urlApi', 'La URL debe utilizar HTTP o HTTPS.');
        }
      } catch {
        addError('ventaOnline.urlApi', 'La URL de la tienda online no es válida.');
      }
    }

    if (command.secretos.secretApi === '') {
      addError('secretos.secretApi', 'El secreto de la API es obligatorio.');
    }
  }

  if (command.emailSmtp.active) {
    if (command.emailSmtp.host.trim() === '') {
      addError('emailSmtp.host', 'El servidor SMTP es obligatorio.');
    }

    if (
      !Number.isSafeInteger(command.emailSmtp.port) ||
      command.emailSmtp.port < 1 ||
      command.emailSmtp.port > 65_535
    ) {
      addError('emailSmtp.port', 'El puerto SMTP no es válido.');
    }

    if (command.emailSmtp.user.trim() === '') {
      addError('emailSmtp.user', 'El usuario SMTP es obligatorio.');
    }

    if (command.secretos.emailSmtpPass === null || command.secretos.emailSmtpPass === '') {
      addError('secretos.emailSmtpPass', 'La contraseña SMTP es obligatoria.');
    }

    if (command.ticketEmail.subjectTemplate.trim() === '') {
      addError('ticketEmail.subjectTemplate', 'El asunto del email del ticket es obligatorio.');
    } else {
      const unsupportedVariable: string | null = findUnsupportedTicketEmailVariable(
        command.ticketEmail.subjectTemplate,
      );

      if (unsupportedVariable !== null) {
        addError(
          'ticketEmail.subjectTemplate',
          `La variable ${unsupportedVariable} no está permitida en el asunto.`,
        );
      }
    }

    if (command.ticketEmail.bodyTemplate.trim() === '') {
      addError('ticketEmail.bodyTemplate', 'El cuerpo del email del ticket es obligatorio.');
    } else {
      const unsupportedVariable: string | null = findUnsupportedTicketEmailVariable(
        command.ticketEmail.bodyTemplate,
      );

      if (unsupportedVariable !== null) {
        addError(
          'ticketEmail.bodyTemplate',
          `La variable ${unsupportedVariable} no está permitida en el cuerpo.`,
        );
      }
    }
  } else if (command.secretos.emailSmtpPass !== null) {
    addError(
      'secretos.emailSmtpPass',
      'No debe enviarse una contraseña SMTP si SMTP está desactivado.',
    );
  }

  if (command.ticketBai.active) {
    if (command.ticketBai.nif.trim() === '') {
      addError('ticketBai.nif', 'El NIF de TicketBAI es obligatorio.');
    }

    if (command.secretos.ticketBaiToken === null || command.secretos.ticketBaiToken === '') {
      addError('secretos.ticketBaiToken', 'El token de TicketBAI es obligatorio.');
    }
  } else if (command.secretos.ticketBaiToken !== null) {
    addError(
      'secretos.ticketBaiToken',
      'No debe enviarse un token de TicketBAI si TicketBAI está desactivado.',
    );
  }

  const acceptedLogoTypes: readonly string[] = ['image/jpeg', 'image/png'];

  if (!acceptedLogoTypes.includes(command.logo.mimeType)) {
    addError('logo.mimeType', 'El formato del logo no está permitido.');
  }

  const expectedLogoPrefix: string = `data:${command.logo.mimeType};base64,`;

  if (!command.logo.dataUrl.startsWith(expectedLogoPrefix)) {
    addError('logo.dataUrl', 'Los datos del logo no son válidos.');
  }

  return errors;
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
