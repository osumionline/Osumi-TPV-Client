import type OtpvV3ArchiveEntry from '@backend/domain/backup/otpv-v3-archive-entry.interface';
import {
  OTPV_V3_ALLOWED_PAYLOAD_ROOTS,
  OTPV_V3_MANIFEST_ENTRY,
  OTPV_V3_MAX_ENTRY_PATH_LENGTH,
  OTPV_V3_MAX_MANIFEST_SIZE_BYTES,
  OTPV_V3_MAX_PACKAGE_SIZE_BYTES,
  OTPV_V3_MAX_PAYLOAD_ENTRY_COUNT,
  OTPV_V3_MAX_SINGLE_ENTRY_SIZE_BYTES,
  OTPV_V3_MAX_TOTAL_UNCOMPRESSED_SIZE_BYTES,
  OTPV_V3_PAYLOAD_ENTRY,
  OTPV_V3_REQUIRED_PAYLOAD_ENTRIES,
} from '@backend/domain/backup/otpv-v3.constants';

/**
 * Valida el tamaño físico del paquete `.otpv`.
 */
export function validateOtpvV3PackageSize(packageSize: number): void {
  if (!Number.isSafeInteger(packageSize) || packageSize <= 0) {
    throw new Error('El tamaño del paquete .otpv no es válido.');
  }

  if (packageSize > OTPV_V3_MAX_PACKAGE_SIZE_BYTES) {
    throw new Error('El paquete .otpv supera el tamaño máximo permitido.');
  }
}

/**
 * Valida el índice del ZIP exterior
 * de un `.otpv` v3.
 */
export function validateOtpvV3OuterEntries(entries: readonly OtpvV3ArchiveEntry[]): void {
  if (entries.length !== 2) {
    throw new Error(
      ['El contenedor exterior debe contener', 'exactamente manifest.json y payload.enc.'].join(
        ' ',
      ),
    );
  }

  const entriesByPath: ReadonlyMap<string, OtpvV3ArchiveEntry> = createEntryMap(entries, false);

  const manifest: OtpvV3ArchiveEntry | undefined = entriesByPath.get(OTPV_V3_MANIFEST_ENTRY);

  const payload: OtpvV3ArchiveEntry | undefined = entriesByPath.get(OTPV_V3_PAYLOAD_ENTRY);

  if (manifest === undefined || payload === undefined) {
    throw new Error(
      ['El contenedor exterior debe contener', 'exactamente manifest.json y payload.enc.'].join(
        ' ',
      ),
    );
  }

  if (
    manifest.uncompressedSize === 0 ||
    manifest.uncompressedSize > OTPV_V3_MAX_MANIFEST_SIZE_BYTES
  ) {
    throw new Error('manifest.json supera el tamaño permitido o está vacío.');
  }

  if (payload.uncompressedSize === 0 || payload.uncompressedSize > OTPV_V3_MAX_PACKAGE_SIZE_BYTES) {
    throw new Error('payload.enc tiene un tamaño no permitido.');
  }
}

/**
 * Valida las entradas declaradas
 * por el ZIP interior ya descifrado.
 */
export function validateOtpvV3PayloadEntries(entries: readonly OtpvV3ArchiveEntry[]): void {
  if (entries.length > OTPV_V3_MAX_PAYLOAD_ENTRY_COUNT) {
    throw new Error('El payload contiene demasiadas entradas.');
  }

  const entriesByPath: ReadonlyMap<string, OtpvV3ArchiveEntry> = createEntryMap(entries, true);

  let totalUncompressedSize: number = 0;

  for (const entry of entries) {
    assertAllowedPayloadRoot(entry.path);

    if (entry.isDirectory) {
      continue;
    }

    if (entry.uncompressedSize > OTPV_V3_MAX_SINGLE_ENTRY_SIZE_BYTES) {
      throw new Error(`La entrada ${entry.path} supera el tamaño máximo permitido.`);
    }

    totalUncompressedSize += entry.uncompressedSize;

    if (totalUncompressedSize > OTPV_V3_MAX_TOTAL_UNCOMPRESSED_SIZE_BYTES) {
      throw new Error(
        ['El contenido descomprimido del payload', 'supera el tamaño máximo permitido.'].join(' '),
      );
    }
  }

  for (const requiredEntry of OTPV_V3_REQUIRED_PAYLOAD_ENTRIES) {
    const entry: OtpvV3ArchiveEntry | undefined = entriesByPath.get(requiredEntry);

    if (entry === undefined || entry.isDirectory) {
      throw new Error(`Falta el archivo obligatorio ${requiredEntry}.`);
    }
  }
}

/**
 * Construye un índice de entradas
 * comprobando previamente su seguridad.
 */
function createEntryMap(
  entries: readonly OtpvV3ArchiveEntry[],
  allowDirectories: boolean,
): ReadonlyMap<string, OtpvV3ArchiveEntry> {
  const result: Map<string, OtpvV3ArchiveEntry> = new Map<string, OtpvV3ArchiveEntry>();

  for (const entry of entries) {
    assertArchiveEntry(entry, allowDirectories);

    if (result.has(entry.path)) {
      throw new Error(`El archivo contiene una entrada duplicada: ${entry.path}`);
    }

    result.set(entry.path, entry);
  }

  return result;
}

/**
 * Valida los metadatos básicos y la ruta
 * de una entrada ZIP.
 */
function assertArchiveEntry(entry: OtpvV3ArchiveEntry, allowDirectories: boolean): void {
  if (!Number.isSafeInteger(entry.uncompressedSize) || entry.uncompressedSize < 0) {
    throw new Error(`La entrada ${entry.path} tiene un tamaño no válido.`);
  }

  if (entry.isSymbolicLink) {
    throw new Error(`No se admiten enlaces simbólicos: ${entry.path}`);
  }

  if (!allowDirectories && entry.isDirectory) {
    throw new Error('El contenedor exterior no admite directorios.');
  }

  if (entry.isDirectory && entry.uncompressedSize !== 0) {
    throw new Error(`El directorio ${entry.path} declara un tamaño no válido.`);
  }

  assertSafeEntryPath(entry.path, entry.isDirectory);
}

/**
 * Valida una ruta de entrada ZIP
 * evitando traversal y representaciones ambiguas.
 */
function assertSafeEntryPath(entryPath: string, isDirectory: boolean): void {
  if (entryPath.length === 0 || Array.from(entryPath).length > OTPV_V3_MAX_ENTRY_PATH_LENGTH) {
    throw new Error(`Ruta no válida dentro del paquete: ${entryPath}`);
  }

  if (
    entryPath.includes('\0') ||
    entryPath.includes('\\') ||
    entryPath.startsWith('/') ||
    /^[a-zA-Z]:/.test(entryPath)
  ) {
    throw new Error(`Ruta no válida dentro del paquete: ${entryPath}`);
  }

  if (isDirectory !== entryPath.endsWith('/')) {
    throw new Error(`La ruta ${entryPath} no coincide con su tipo de entrada.`);
  }

  const rawSegments: string[] = entryPath.split('/');

  if (isDirectory) {
    rawSegments.pop();
  }

  if (
    rawSegments.some(
      (segment: string): boolean => segment.length === 0 || segment === '.' || segment === '..',
    )
  ) {
    throw new Error(`Ruta insegura dentro del paquete: ${entryPath}`);
  }
}

/**
 * Comprueba que una entrada del payload
 * pertenezca a una raíz admitida por el formato.
 */
function assertAllowedPayloadRoot(entryPath: string): void {
  const allowed: boolean = OTPV_V3_ALLOWED_PAYLOAD_ROOTS.some(
    (root: string): boolean => entryPath === root || entryPath.startsWith(root),
  );

  if (!allowed) {
    throw new Error(`La ruta ${entryPath} no pertenece a una raíz permitida del payload.`);
  }
}
