import type { InstallationLogoData } from '@desktop-contracts/configuration/installation-command.interface';

export default interface LogoStorage {
  exists(): Promise<boolean>;

  save(logo: InstallationLogoData): Promise<void>;

  delete(): Promise<void>;
}
