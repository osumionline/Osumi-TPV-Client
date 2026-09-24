export const OTPV_V3_FORMAT_VERSION = 3 as const;

export const OTPV_V3_APPLICATION = 'Osumi TPV Client' as const;

export const OTPV_V3_CRYPTO_SUITE = 'otpv3-hkdf-sha256-aes-256-gcm' as const;

export const OTPV_V3_KDF_ALGORITHM = 'hkdf-sha256' as const;

export const OTPV_V3_KDF_INFO = 'osumi-tpv-backup:v3:kek' as const;

export const OTPV_V3_ENCRYPTION_ALGORITHM = 'aes-256-gcm' as const;

export const OTPV_V3_PAYLOAD_FORMAT = 'zip' as const;

export const OTPV_V3_MANIFEST_ENTRY = 'manifest.json' as const;

export const OTPV_V3_PAYLOAD_ENTRY = 'payload.enc' as const;

export const OTPV_V3_DATABASE_ENTRY = 'database/osumi-tpv.sqlite' as const;

export const OTPV_V3_APP_DATA_ENTRY = 'config/app_data.json' as const;

export const OTPV_V3_LOGO_ENTRY = 'assets/logo.webp' as const;

export const OTPV_V3_SECRETS_ENTRY = 'secrets/secrets.json' as const;

export const OTPV_V3_FILES_PREFIX = 'files/' as const;

export const OTPV_V3_KDF_LENGTH_BYTES: number = 32;

export const OTPV_V3_SALT_LENGTH_BYTES: number = 32;

export const OTPV_V3_DEK_LENGTH_BYTES: number = 32;

export const OTPV_V3_GCM_IV_LENGTH_BYTES: number = 12;

export const OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES: number = 16;

export const OTPV_V3_KEY_WRAP_AAD_PREFIX = 'osumi-tpv-backup:v3:keywrap\n' as const;

export const OTPV_V3_PAYLOAD_AAD_PREFIX = 'osumi-tpv-backup:v3:payload\n' as const;

export const OTPV_V3_MAX_PACKAGE_SIZE_BYTES: number = 8 * 1024 * 1024 * 1024;

export const OTPV_V3_MAX_MANIFEST_SIZE_BYTES: number = 64 * 1024;

export const OTPV_V3_MAX_PAYLOAD_ENTRY_COUNT: number = 50_000;

export const OTPV_V3_MAX_SINGLE_ENTRY_SIZE_BYTES: number = 2 * 1024 * 1024 * 1024;

export const OTPV_V3_MAX_TOTAL_UNCOMPRESSED_SIZE_BYTES: number = 16 * 1024 * 1024 * 1024;

export const OTPV_V3_MAX_ENTRY_PATH_LENGTH: number = 1024;

export const OTPV_V3_ALLOWED_PAYLOAD_ROOTS: readonly string[] = [
  'database/',
  'config/',
  'assets/',
  'secrets/',
  'files/',
];

export const OTPV_V3_REQUIRED_PAYLOAD_ENTRIES: readonly string[] = [
  OTPV_V3_DATABASE_ENTRY,
  OTPV_V3_APP_DATA_ENTRY,
  OTPV_V3_LOGO_ENTRY,
  OTPV_V3_SECRETS_ENTRY,
];
