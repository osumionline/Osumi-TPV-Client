import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';

export default interface OtpvV3PortableSecrets extends InstallationSecretsData {
  readonly schemaVersion: 1;
}
