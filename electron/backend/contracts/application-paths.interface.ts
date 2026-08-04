export default interface ApplicationPaths {
  readonly rootDirectory: string;
  readonly configDirectory: string;
  readonly assetsDirectory: string;
  readonly filesDirectory: string;
  readonly databaseDirectory: string;
  readonly backupsDirectory: string;
  readonly logsDirectory: string;
  readonly secretsDirectory: string;
  readonly stagingDirectory: string;
  readonly stagingFilesDirectory: string;

  readonly appDataFile: string;
  readonly logoFile: string;
  readonly databaseFile: string;
  readonly secretsFile: string;

  readonly stagingAppDataFile: string;
  readonly stagingLogoFile: string;
  readonly stagingSecretsFile: string;
  readonly stagingDatabaseFile: string;
}
