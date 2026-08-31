import { validateInstallationCommand } from '@backend/application/configuration/installation-command.validator';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationValidationError } from '@desktop-contracts/configuration/installation-result.interface';
import {
  DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
  DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
} from '@desktop-contracts/configuration/ticket-email-config.interface';
import { describe, expect, it } from 'vitest';

describe('validateInstallationCommand', (): void => {
  it('acepta las plantillas de email por defecto', (): void => {
    const errors: InstallationValidationError[] = validateInstallationCommand(createValidCommand());

    expect(errors).toEqual([]);
  });

  it('acepta un logo WebP como entrada de la instalación', (): void => {
    const command: InstallationCommand = createValidCommand();

    const webpCommand: InstallationCommand = {
      ...command,
      logo: {
        fileName: 'logo.webp',
        mimeType: 'image/webp',
        dataUrl: 'data:image/webp;base64,AA==',
      },
    };

    const errors: InstallationValidationError[] = validateInstallationCommand(webpCommand);

    expect(errors).toEqual([]);
  });

  it('rechaza variables de plantilla no soportadas', (): void => {
    const command: InstallationCommand = createValidCommand();

    const invalidCommand: InstallationCommand = {
      ...command,

      ticketEmail: {
        ...command.ticketEmail,
        subjectTemplate: '{nombreNegocio} - {variableDesconocida}',
      },
    };

    const errors: InstallationValidationError[] = validateInstallationCommand(invalidCommand);

    expect(errors).toContainEqual({
      field: 'ticketEmail.subjectTemplate',
      message: 'La variable {variableDesconocida} no está permitida en el asunto.',
    });
  });

  it('exige cuerpo y asunto cuando SMTP está activo', (): void => {
    const command: InstallationCommand = createValidCommand();

    const invalidCommand: InstallationCommand = {
      ...command,

      ticketEmail: {
        subjectTemplate: '',
        bodyTemplate: '',
      },
    };

    const errors: InstallationValidationError[] = validateInstallationCommand(invalidCommand);

    expect(
      errors.some(
        (error: InstallationValidationError): boolean =>
          error.field === 'ticketEmail.subjectTemplate',
      ),
    ).toBe(true);

    expect(
      errors.some(
        (error: InstallationValidationError): boolean => error.field === 'ticketEmail.bodyTemplate',
      ),
    ).toBe(true);
  });
});

/**
 * Construye un comando de instalación completo y válido.
 */
function createValidCommand(): InstallationCommand {
  return {
    negocio: {
      nombre: 'Empresa',
      nombreComercial: 'Comercio',
      cif: 'B12345678',
      telefono: '944000000',
      email: 'tienda@example.com',
      direccion: 'Gran Vía 1',
      poblacion: 'Bilbao',
    },

    empleadoInicial: {
      nombre: 'Administrador',
      password: 'password',
      color: '#3f51b5',
    },

    redes: {
      twitter: '',
      facebook: '',
      instagram: '',
      web: '',
    },

    ticket: {
      frases: [],
    },

    valoresIniciales: {
      cajaInicial: 0,
      ticketInicial: 1,
      facturaInicial: 1,
    },

    fiscalidad: {
      tipoIva: 'iva',
      ivaList: [21],
      reList: [],
      marginList: [30],
    },

    ventaOnline: {
      active: false,
      urlApi: '',
    },

    emailSmtp: {
      active: true,
      host: 'smtp.example.com',
      port: 587,
      secure: 'tls',
      user: 'tienda@example.com',
    },

    ticketEmail: {
      subjectTemplate: DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
      bodyTemplate: DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
    },

    ticketBai: {
      active: false,
      nif: '',
    },

    opciones: {
      fechaCaducidad: false,
      empleados: false,
    },

    secretos: {
      secretApi: '',
      backupApiKey: '',
      emailSmtpPass: 'smtp-password',
      ticketBaiToken: null,
    },

    logo: {
      fileName: 'logo.png',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,AA==',
    },
  };
}
