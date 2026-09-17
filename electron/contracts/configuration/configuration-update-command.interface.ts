import type {
  InstallationBusinessData,
  InstallationOptionsData,
  InstallationSocialData,
  InstallationTaxData,
  InstallationTicketData,
  InstallationTicketEmailData,
} from '@desktop-contracts/configuration/installation-command.interface';

export default interface ConfigurationUpdateCommand {
  readonly negocio: InstallationBusinessData;
  readonly redes: InstallationSocialData;
  readonly ticket: InstallationTicketData;
  readonly ticketEmail: InstallationTicketEmailData;
  readonly fiscalidad: InstallationTaxData;
  readonly opciones: InstallationOptionsData;
}
