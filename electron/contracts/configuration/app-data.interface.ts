import type EmailSmtpConfig from '@desktop-contracts/configuration/email-smtp-config.interface';
import type TicketBaiConfig from '@desktop-contracts/configuration/ticket-bai-config.interface';
import type { TicketEmailConfig } from '@desktop-contracts/configuration/ticket-email-config.interface';
import type TipoIva from '@desktop-contracts/tipo-iva.type';

export default interface AppData {
  readonly schemaVersion: number;
  readonly installedAt: string;

  readonly nombre: string;
  readonly nombreComercial: string;
  readonly cif: string;
  readonly telefono: string;
  readonly direccion: string;
  readonly poblacion: string;
  readonly email: string;

  readonly twitter: string;
  readonly facebook: string;
  readonly instagram: string;
  readonly web: string;
  readonly frasesTicket: readonly string[];
  readonly ticketEmail: TicketEmailConfig;

  readonly tipoIva: TipoIva;
  readonly ivaList: readonly number[];
  readonly reList: readonly number[];
  readonly marginList: readonly number[];

  readonly ventaOnline: boolean;
  readonly urlApi: string;

  readonly emailSmtp: EmailSmtpConfig | null;
  readonly ticketBai: TicketBaiConfig | null;

  readonly fechaCad: boolean;
  readonly empleados: boolean;
}
