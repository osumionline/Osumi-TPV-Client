import { mkdir } from 'node:fs/promises';

import type ApplicationPaths from '@backend/contracts/application-paths.interface';

export default class ApplicationDirectoriesService {
  constructor(private readonly paths: ApplicationPaths) {}

  async ensureDirectories(): Promise<void> {
    const directories: readonly string[] = [
      this.paths.rootDirectory,
      this.paths.configDirectory,
      this.paths.assetsDirectory,
      this.paths.databaseDirectory,
      this.paths.backupsDirectory,
      this.paths.logsDirectory,
      this.paths.secretsDirectory,
      this.paths.stagingDirectory,
    ];

    await Promise.all(
      directories.map((directory: string): Promise<string | undefined> =>
        mkdir(directory, {
          recursive: true,
        }),
      ),
    );
  }
}
