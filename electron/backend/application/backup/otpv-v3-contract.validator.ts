import type {
  OtpvV3AuthenticatedMetadata,
  OtpvV3Kdf,
  OtpvV3KeyWrap,
  OtpvV3Manifest,
  OtpvV3PayloadEncryption,
} from '@backend/contracts/backup/otpv-v3-manifest.interface';
import type OtpvV3PortableSecrets from '@backend/contracts/backup/otpv-v3-portable-secrets.interface';
import serializeOtpvV3AuthenticatedMetadata from '@backend/domain/backup/otpv-v3-authenticated-metadata.serializer';
import {
  OTPV_V3_APPLICATION,
  OTPV_V3_CRYPTO_SUITE,
  OTPV_V3_DEK_LENGTH_BYTES,
  OTPV_V3_ENCRYPTION_ALGORITHM,
  OTPV_V3_FORMAT_VERSION,
  OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
  OTPV_V3_GCM_IV_LENGTH_BYTES,
  OTPV_V3_KDF_ALGORITHM,
  OTPV_V3_KDF_INFO,
  OTPV_V3_KDF_LENGTH_BYTES,
  OTPV_V3_PAYLOAD_ENTRY,
  OTPV_V3_PAYLOAD_FORMAT,
  OTPV_V3_PORTABLE_SECRETS_SCHEMA_VERSION,
  OTPV_V3_SALT_LENGTH_BYTES,
} from '@backend/domain/backup/otpv-v3.constants';
import { DATABASE_SCHEMA_VERSION } from '@backend/domain/database/database-schema.constants';
import { TextDecoder } from 'node:util';

const BASE64_PATTERN: RegExp = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const UUID_V4_PATTERN: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ISO_UTC_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * Valida estructuralmente un `manifest.json`
 * perteneciente al formato `.otpv` v3.
 */
export function validateOtpvV3Manifest(value: unknown): OtpvV3Manifest {
  if (!isRecord(value)) {
    throw new Error('manifest.json no contiene un objeto válido.');
  }

  assertExactKeys(
    value,
    [
      'formatVersion',
      'application',
      'applicationVersion',
      'databaseSchemaVersion',
      'backupId',
      'createdAt',
      'cryptoSuite',
      'authenticatedData',
      'kdf',
      'keyWrap',
      'payload',
    ],
    'manifest.json',
  );

  const formatVersion: typeof OTPV_V3_FORMAT_VERSION = requireLiteral(
    value,
    'formatVersion',
    OTPV_V3_FORMAT_VERSION,
    'manifest.json',
  );

  const application: typeof OTPV_V3_APPLICATION = requireLiteral(
    value,
    'application',
    OTPV_V3_APPLICATION,
    'manifest.json',
  );

  const applicationVersion: string = requireNonEmptyString(
    value,
    'applicationVersion',
    'manifest.json',
  );

  const databaseSchemaVersion: number = requirePositiveInteger(
    value,
    'databaseSchemaVersion',
    'manifest.json',
  );

  const backupId: string = requireUuidV4(value, 'backupId', 'manifest.json');

  const createdAt: string = requireUtcIsoDate(value, 'createdAt', 'manifest.json');

  const cryptoSuite: typeof OTPV_V3_CRYPTO_SUITE = requireLiteral(
    value,
    'cryptoSuite',
    OTPV_V3_CRYPTO_SUITE,
    'manifest.json',
  );

  const authenticatedData: string = requireNonEmptyString(
    value,
    'authenticatedData',
    'manifest.json',
  );

  const kdf: OtpvV3Kdf = validateKdf(requireRecord(value, 'kdf', 'manifest.json'));

  const keyWrap: OtpvV3KeyWrap = validateKeyWrap(requireRecord(value, 'keyWrap', 'manifest.json'));

  const payload: OtpvV3PayloadEncryption = validatePayload(
    requireRecord(value, 'payload', 'manifest.json'),
  );

  if (keyWrap.iv === payload.iv) {
    throw new Error('Los IV de keyWrap y payload deben ser distintos.');
  }

  const metadata: OtpvV3AuthenticatedMetadata = {
    formatVersion,
    backupId,
    application,
    applicationVersion,
    databaseSchemaVersion,
    createdAt,
    cryptoSuite,
  };

  validateAuthenticatedData(authenticatedData, metadata);

  return {
    formatVersion,
    application,
    applicationVersion,
    databaseSchemaVersion,
    backupId,
    createdAt,
    cryptoSuite,
    authenticatedData,
    kdf,
    keyWrap,
    payload,
  };
}

/**
 * Comprueba si un manifest v3 estructuralmente válido
 * puede restaurarse con el esquema actual del Client.
 */
export function assertOtpvV3ManifestCompatible(manifest: OtpvV3Manifest): void {
  if (manifest.databaseSchemaVersion !== DATABASE_SCHEMA_VERSION) {
    throw new Error(
      [
        'La copia utiliza la versión de esquema',
        `${manifest.databaseSchemaVersion},`,
        `pero esta versión del Client admite la ${DATABASE_SCHEMA_VERSION}.`,
      ].join(' '),
    );
  }
}

/**
 * Valida el documento de secretos portables
 * incluido dentro del payload v3.
 */
export function validateOtpvV3PortableSecrets(value: unknown): OtpvV3PortableSecrets {
  if (!isRecord(value)) {
    throw new Error('secrets/secrets.json no contiene un objeto válido.');
  }

  assertExactKeys(
    value,
    ['schemaVersion', 'secretApi', 'backupApiKey', 'emailSmtpPass', 'ticketBaiToken'],
    'secrets/secrets.json',
  );

  const schemaVersion: typeof OTPV_V3_PORTABLE_SECRETS_SCHEMA_VERSION = requireLiteral(
    value,
    'schemaVersion',
    OTPV_V3_PORTABLE_SECRETS_SCHEMA_VERSION,
    'secrets/secrets.json',
  );

  const secretApi: string = requireString(value, 'secretApi', 'secrets/secrets.json');

  const backupApiKey: string = requireString(value, 'backupApiKey', 'secrets/secrets.json');

  if (backupApiKey.length === 0) {
    throw new Error('La TPV Backup key no puede estar vacía.');
  }

  const emailSmtpPass: string | null = requireNullableString(
    value,
    'emailSmtpPass',
    'secrets/secrets.json',
  );

  const ticketBaiToken: string | null = requireNullableString(
    value,
    'ticketBaiToken',
    'secrets/secrets.json',
  );

  return {
    schemaVersion,
    secretApi,
    backupApiKey,
    emailSmtpPass,
    ticketBaiToken,
  };
}

/**
 * Valida la configuración HKDF declarada
 * por el manifest.
 */
function validateKdf(value: Record<string, unknown>): OtpvV3Kdf {
  assertExactKeys(value, ['algorithm', 'salt', 'info', 'length'], 'manifest.json.kdf');

  const algorithm: typeof OTPV_V3_KDF_ALGORITHM = requireLiteral(
    value,
    'algorithm',
    OTPV_V3_KDF_ALGORITHM,
    'manifest.json.kdf',
  );

  const salt: string = requireBase64(value, 'salt', OTPV_V3_SALT_LENGTH_BYTES, 'manifest.json.kdf');

  const info: typeof OTPV_V3_KDF_INFO = requireLiteral(
    value,
    'info',
    OTPV_V3_KDF_INFO,
    'manifest.json.kdf',
  );

  const length: typeof OTPV_V3_KDF_LENGTH_BYTES = requireLiteral(
    value,
    'length',
    OTPV_V3_KDF_LENGTH_BYTES,
    'manifest.json.kdf',
  );

  return {
    algorithm,
    salt,
    info,
    length,
  };
}

/**
 * Valida el envelope que protege
 * la DEK del backup.
 */
function validateKeyWrap(value: Record<string, unknown>): OtpvV3KeyWrap {
  assertExactKeys(value, ['algorithm', 'iv', 'authTag', 'wrappedDek'], 'manifest.json.keyWrap');

  const algorithm: typeof OTPV_V3_ENCRYPTION_ALGORITHM = requireLiteral(
    value,
    'algorithm',
    OTPV_V3_ENCRYPTION_ALGORITHM,
    'manifest.json.keyWrap',
  );

  const iv: string = requireBase64(
    value,
    'iv',
    OTPV_V3_GCM_IV_LENGTH_BYTES,
    'manifest.json.keyWrap',
  );

  const authTag: string = requireBase64(
    value,
    'authTag',
    OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
    'manifest.json.keyWrap',
  );

  const wrappedDek: string = requireBase64(
    value,
    'wrappedDek',
    OTPV_V3_DEK_LENGTH_BYTES,
    'manifest.json.keyWrap',
  );

  return {
    algorithm,
    iv,
    authTag,
    wrappedDek,
  };
}

/**
 * Valida los parámetros de cifrado
 * del payload completo.
 */
function validatePayload(value: Record<string, unknown>): OtpvV3PayloadEncryption {
  assertExactKeys(
    value,
    ['entry', 'format', 'algorithm', 'iv', 'authTag'],
    'manifest.json.payload',
  );

  const entry: typeof OTPV_V3_PAYLOAD_ENTRY = requireLiteral(
    value,
    'entry',
    OTPV_V3_PAYLOAD_ENTRY,
    'manifest.json.payload',
  );

  const format: typeof OTPV_V3_PAYLOAD_FORMAT = requireLiteral(
    value,
    'format',
    OTPV_V3_PAYLOAD_FORMAT,
    'manifest.json.payload',
  );

  const algorithm: typeof OTPV_V3_ENCRYPTION_ALGORITHM = requireLiteral(
    value,
    'algorithm',
    OTPV_V3_ENCRYPTION_ALGORITHM,
    'manifest.json.payload',
  );

  const iv: string = requireBase64(
    value,
    'iv',
    OTPV_V3_GCM_IV_LENGTH_BYTES,
    'manifest.json.payload',
  );

  const authTag: string = requireBase64(
    value,
    'authTag',
    OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
    'manifest.json.payload',
  );

  return {
    entry,
    format,
    algorithm,
    iv,
    authTag,
  };
}

/**
 * Valida que authenticatedData represente
 * exactamente los metadatos canónicos declarados.
 */
function validateAuthenticatedData(
  encodedValue: string,
  metadata: OtpvV3AuthenticatedMetadata,
): void {
  const buffer: Buffer = decodeCanonicalBase64(
    encodedValue,
    null,
    'manifest.json.authenticatedData',
  );

  const decoder: TextDecoder = new TextDecoder('utf-8', {
    fatal: true,
  });

  let text: string;

  try {
    text = decoder.decode(buffer);
  } catch (error: unknown) {
    throw new Error('authenticatedData no contiene UTF-8 válido.', {
      cause: error,
    });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error: unknown) {
    throw new Error('authenticatedData no contiene JSON válido.', {
      cause: error,
    });
  }

  if (!isRecord(parsed)) {
    throw new Error('authenticatedData no contiene un objeto JSON.');
  }

  assertExactKeys(
    parsed,
    [
      'formatVersion',
      'backupId',
      'application',
      'applicationVersion',
      'databaseSchemaVersion',
      'createdAt',
      'cryptoSuite',
    ],
    'authenticatedData',
  );

  if (
    parsed['formatVersion'] !== metadata.formatVersion ||
    parsed['backupId'] !== metadata.backupId ||
    parsed['application'] !== metadata.application ||
    parsed['applicationVersion'] !== metadata.applicationVersion ||
    parsed['databaseSchemaVersion'] !== metadata.databaseSchemaVersion ||
    parsed['createdAt'] !== metadata.createdAt ||
    parsed['cryptoSuite'] !== metadata.cryptoSuite
  ) {
    throw new Error(['authenticatedData no coincide', 'con los metadatos del manifest.'].join(' '));
  }

  const canonical: Buffer = serializeOtpvV3AuthenticatedMetadata(metadata);

  if (!buffer.equals(canonical)) {
    throw new Error(
      ['authenticatedData no utiliza', 'la serialización canónica requerida.'].join(' '),
    );
  }
}

/**
 * Comprueba que un valor sea un objeto JSON.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Exige que un objeto contenga exactamente
 * las propiedades declaradas.
 */
function assertExactKeys(
  source: Record<string, unknown>,
  expectedKeys: readonly string[],
  sourceName: string,
): void {
  const actualKeys: string[] = Object.keys(source).sort();

  const sortedExpectedKeys: string[] = [...expectedKeys].sort();

  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    actualKeys.some((key: string, index: number): boolean => key !== sortedExpectedKeys[index])
  ) {
    throw new Error(`${sourceName} no tiene la estructura exacta esperada.`);
  }
}

/**
 * Recupera una propiedad que debe coincidir
 * con un valor literal concreto.
 */
function requireLiteral<T extends string | number>(
  source: Record<string, unknown>,
  property: string,
  expected: T,
  sourceName: string,
): T {
  if (source[property] !== expected) {
    throw new Error(`La propiedad ${property} de ${sourceName} no es válida.`);
  }

  return expected;
}

/**
 * Recupera una propiedad de tipo string.
 */
function requireString(
  source: Record<string, unknown>,
  property: string,
  sourceName: string,
): string {
  const value: unknown = source[property];

  if (typeof value !== 'string') {
    throw new Error(`La propiedad ${property} de ${sourceName} no es válida.`);
  }

  return value;
}

/**
 * Recupera una cadena obligatoria no vacía.
 */
function requireNonEmptyString(
  source: Record<string, unknown>,
  property: string,
  sourceName: string,
): string {
  const value: string = requireString(source, property, sourceName);

  if (value.trim().length === 0) {
    throw new Error(`La propiedad ${property} de ${sourceName} no puede estar vacía.`);
  }

  return value;
}

/**
 * Recupera un entero positivo.
 */
function requirePositiveInteger(
  source: Record<string, unknown>,
  property: string,
  sourceName: string,
): number {
  const value: unknown = source[property];

  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error(`La propiedad ${property} de ${sourceName} no es un entero positivo válido.`);
  }

  return value;
}

/**
 * Recupera y valida un UUID v4.
 */
function requireUuidV4(
  source: Record<string, unknown>,
  property: string,
  sourceName: string,
): string {
  const value: string = requireString(source, property, sourceName);

  if (!UUID_V4_PATTERN.test(value)) {
    throw new Error(`La propiedad ${property} de ${sourceName} no contiene un UUID v4 válido.`);
  }

  return value;
}

/**
 * Recupera y valida una fecha ISO 8601 UTC
 * en el formato canónico utilizado por Date.toISOString().
 */
function requireUtcIsoDate(
  source: Record<string, unknown>,
  property: string,
  sourceName: string,
): string {
  const value: string = requireString(source, property, sourceName);

  if (
    !ISO_UTC_PATTERN.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`La propiedad ${property} de ${sourceName} no contiene una fecha UTC válida.`);
  }

  return value;
}

/**
 * Recupera y valida un valor Base64
 * con una longitud binaria concreta.
 */
function requireBase64(
  source: Record<string, unknown>,
  property: string,
  expectedLength: number,
  sourceName: string,
): string {
  const value: string = requireNonEmptyString(source, property, sourceName);

  decodeCanonicalBase64(value, expectedLength, `${sourceName}.${property}`);

  return value;
}

/**
 * Decodifica Base64 estándar exigiendo
 * su representación canónica.
 */
function decodeCanonicalBase64(
  value: string,
  expectedLength: number | null,
  sourceName: string,
): Buffer {
  if (value.length === 0 || value.length % 4 !== 0 || !BASE64_PATTERN.test(value)) {
    throw new Error(`${sourceName} no contiene Base64 estándar válido.`);
  }

  const buffer: Buffer = Buffer.from(value, 'base64');

  if (buffer.toString('base64') !== value) {
    throw new Error(`${sourceName} no utiliza Base64 canónico.`);
  }

  if (expectedLength !== null && buffer.length !== expectedLength) {
    throw new Error(`${sourceName} no tiene la longitud binaria esperada.`);
  }

  return buffer;
}

/**
 * Recupera una cadena o null.
 */
function requireNullableString(
  source: Record<string, unknown>,
  property: string,
  sourceName: string,
): string | null {
  const value: unknown = source[property];

  if (value !== null && typeof value !== 'string') {
    throw new Error(`La propiedad ${property} de ${sourceName} no es válida.`);
  }

  return value;
}

/**
 * Recupera una propiedad que debe contener
 * un objeto JSON válido.
 */
function requireRecord(
  source: Record<string, unknown>,
  property: string,
  sourceName: string,
): Record<string, unknown> {
  const value: unknown = source[property];

  if (!isRecord(value)) {
    throw new Error(`La propiedad ${property} de ${sourceName} no contiene un objeto válido.`);
  }

  return value;
}
