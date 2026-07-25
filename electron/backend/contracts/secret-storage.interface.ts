import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';

export default interface SecretStorage {
  exists(): Promise<boolean>;

  load(): Promise<InstallationSecretsData | null>;

  save(secrets: InstallationSecretsData): Promise<void>;

  delete(): Promise<void>;
}
