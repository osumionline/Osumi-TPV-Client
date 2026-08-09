import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type {
  InstallationLogoData,
  InstallationSecretsData,
} from '@desktop-contracts/configuration/installation-command.interface';

export default interface InstallationStaging {
  reset(): Promise<void>;

  prepare(
    appData: AppData,
    logo: InstallationLogoData,
    secrets: InstallationSecretsData,
  ): Promise<void>;
}
