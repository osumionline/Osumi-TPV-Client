import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type {
  InstallationLogoData,
  InstallationSecretsData,
} from '@desktop-contracts/configuration/installation-command.interface';

export default interface LegacyImportPackageConfiguration {
  readonly appData: AppData;

  readonly logo: InstallationLogoData;

  readonly secrets: InstallationSecretsData;

  readonly initialSaleNumber: number;

  readonly initialInvoiceNumber: number;
}
