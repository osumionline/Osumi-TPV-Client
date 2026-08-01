export const LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION: number = 1;

export const LEGACY_IMPORT_SUPPORTED_SCHEMA_VERSION: string = 'legacy-2026-07';

export const LEGACY_IMPORT_APPLICATION_NAME: string = 'Osumi TPV';

export const LEGACY_IMPORT_REQUIRED_ENTRIES: readonly string[] = [
  'app_data.json',
  'checksums.json',
  'database.sql',
  'export-report.json',
  'manifest.json',
];

export const LEGACY_IMPORT_MAX_PACKAGE_SIZE: number = 2 * 1024 * 1024 * 1024;

export const LEGACY_IMPORT_MAX_UNCOMPRESSED_SIZE: number = 8 * 1024 * 1024 * 1024;

export const LEGACY_IMPORT_MAX_ENTRY_COUNT: number = 100_000;

export const LEGACY_IMPORT_MAX_JSON_SIZE: number = 16 * 1024 * 1024;
