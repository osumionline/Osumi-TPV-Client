import type EmailSmtpSecurity from '@desktop-contracts/configuration/email-smtp-security.type';
import type {
  InstallationBusinessData,
  InstallationLogoData,
  InstallationOptionsData,
  InstallationSocialData,
  InstallationTaxData,
  InstallationTicketData,
  InstallationTicketEmailData,
} from '@desktop-contracts/configuration/installation-command.interface';
import type { TicketBaiEnvironment } from '@desktop-contracts/configuration/ticket-bai-environment.type';

export interface ConfigurationOnlineStoreUpdateData {
  readonly active: boolean;
  readonly urlApi: string;

  /**
   * Nuevo secreto de la API.
   * null conserva el existente cuando la integración ya estaba activa.
   */
  readonly secretApi: string | null;
}

export interface ConfigurationEmailSmtpUpdateData {
  readonly active: boolean;
  readonly host: string;
  readonly port: number;
  readonly secure: EmailSmtpSecurity;
  readonly user: string;

  /**
   * Nueva contraseña SMTP.
   * null conserva la existente cuando SMTP ya estaba activo.
   */
  readonly password: string | null;
}

export interface ConfigurationTicketBaiUpdateData {
  readonly active: boolean;
  readonly nif: string;
  readonly environment: TicketBaiEnvironment;

  /**
   * Nuevo token TicketBAI.
   * null conserva el existente cuando TicketBAI ya estaba activo.
   */
  readonly token: string | null;
}

export interface ConfigurationIntegrationsUpdateData {
  readonly ventaOnline: ConfigurationOnlineStoreUpdateData;
  readonly emailSmtp: ConfigurationEmailSmtpUpdateData;
  readonly ticketBai: ConfigurationTicketBaiUpdateData;
}

export default interface ConfigurationUpdateCommand {
  readonly negocio: InstallationBusinessData;
  readonly redes: InstallationSocialData;
  readonly ticket: InstallationTicketData;
  readonly ticketEmail: InstallationTicketEmailData;
  readonly fiscalidad: InstallationTaxData;
  readonly opciones: InstallationOptionsData;

  /*
   * Son opcionales temporalmente para que el formulario
   * general de 17.4.2 siga siendo compatible hasta 17.4.3b.
   */
  readonly integrations?: ConfigurationIntegrationsUpdateData;

  /**
   * Si se omite, se conserva el logo actual.
   */
  readonly logo?: InstallationLogoData;
}
