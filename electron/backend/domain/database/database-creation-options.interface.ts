export type InstallationType = 'new' | 'legacy_import';

export interface DatabaseCreationOptions {
  readonly applicationVersion: string;
  readonly installationType: InstallationType;

  readonly createdAt: string;
  readonly importedAt: string | null;
}
