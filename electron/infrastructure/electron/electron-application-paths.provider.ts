import type ApplicationPathsProvider from '@backend/contracts/application-paths-provider.interface';
import type ApplicationPaths from '@backend/contracts/application-paths.interface';
import { app } from 'electron';
import { join } from 'node:path';

export default class ElectronApplicationPathsProvider implements ApplicationPathsProvider {
  getPaths(): ApplicationPaths {
    const rootDirectory: string = join(app.getPath('userData'), 'osumi-tpv');
    const configDirectory: string = join(rootDirectory, 'config');
    const assetsDirectory: string = join(rootDirectory, 'assets');
    const databaseDirectory: string = join(rootDirectory, 'database');
    const backupsDirectory: string = join(rootDirectory, 'backups');
    const logsDirectory: string = join(rootDirectory, 'logs');
    const secretsDirectory: string = join(rootDirectory, 'secrets');
    const stagingDirectory: string = join(rootDirectory, 'staging');

    return {
      rootDirectory,
      configDirectory,
      assetsDirectory,
      databaseDirectory,
      backupsDirectory,
      logsDirectory,
      secretsDirectory,
      stagingDirectory,

      appDataFile: join(configDirectory, 'app_data.json'),
      logoFile: join(assetsDirectory, 'logo.png'),
      databaseFile: join(databaseDirectory, 'osumi-tpv.sqlite'),
      secretsFile: join(secretsDirectory, 'secrets.json'),

      stagingAppDataFile: join(stagingDirectory, 'app_data.json'),
      stagingLogoFile: join(stagingDirectory, 'logo.png'),
      stagingSecretsFile: join(stagingDirectory, 'secrets.json'),
      stagingDatabaseFile: join(stagingDirectory, 'osumi-tpv.sqlite'),
    };
  }
}
