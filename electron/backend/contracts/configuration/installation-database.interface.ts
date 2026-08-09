import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';

export default interface InstallationDatabase {
  prepare(command: InstallationCommand): Promise<void>;

  delete(): Promise<void>;
}
