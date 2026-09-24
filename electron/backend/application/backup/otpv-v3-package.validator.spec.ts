import {
  validateOtpvV3OuterEntries,
  validateOtpvV3PackageSize,
  validateOtpvV3PayloadEntries,
} from '@backend/application/backup/otpv-v3-package.validator';
import type OtpvV3ArchiveEntry from '@backend/domain/backup/otpv-v3-archive-entry.interface';
import {
  OTPV_V3_MANIFEST_ENTRY,
  OTPV_V3_MAX_MANIFEST_SIZE_BYTES,
  OTPV_V3_MAX_PACKAGE_SIZE_BYTES,
  OTPV_V3_MAX_PAYLOAD_ENTRY_COUNT,
  OTPV_V3_MAX_SINGLE_ENTRY_SIZE_BYTES,
  OTPV_V3_PAYLOAD_ENTRY,
} from '@backend/domain/backup/otpv-v3.constants';
import { describe, expect, it } from 'vitest';

describe('OTPV v3 package validator', (): void => {
  it('acepta el contenedor exterior canónico', (): void => {
    expect((): void =>
      validateOtpvV3OuterEntries([
        createFile(OTPV_V3_MANIFEST_ENTRY, 1_024),
        createFile(OTPV_V3_PAYLOAD_ENTRY, 10_000),
      ]),
    ).not.toThrow();
  });

  it('rechaza entradas adicionales en el contenedor exterior', (): void => {
    expect((): void =>
      validateOtpvV3OuterEntries([
        createFile(OTPV_V3_MANIFEST_ENTRY, 1_024),
        createFile(OTPV_V3_PAYLOAD_ENTRY, 10_000),
        createFile('extra.txt', 1),
      ]),
    ).toThrow('exactamente manifest.json y payload.enc');
  });

  it('rechaza un manifest exterior demasiado grande', (): void => {
    expect((): void =>
      validateOtpvV3OuterEntries([
        createFile(OTPV_V3_MANIFEST_ENTRY, OTPV_V3_MAX_MANIFEST_SIZE_BYTES + 1),
        createFile(OTPV_V3_PAYLOAD_ENTRY, 10_000),
      ]),
    ).toThrow('manifest.json supera');
  });

  it('acepta un payload con los cuatro ficheros obligatorios', (): void => {
    expect((): void => validateOtpvV3PayloadEntries(createRequiredPayloadEntries())).not.toThrow();
  });

  it('rechaza path traversal dentro del payload', (): void => {
    expect((): void =>
      validateOtpvV3PayloadEntries([
        ...createRequiredPayloadEntries(),
        createFile('files/../escape.txt', 1),
      ]),
    ).toThrow('Ruta insegura');
  });

  it('rechaza enlaces simbólicos', (): void => {
    expect((): void =>
      validateOtpvV3PayloadEntries([
        ...createRequiredPayloadEntries(),
        {
          path: 'files/link',
          uncompressedSize: 0,
          isDirectory: false,
          isSymbolicLink: true,
        },
      ]),
    ).toThrow('No se admiten enlaces simbólicos');
  });

  it('rechaza entradas duplicadas', (): void => {
    const required: readonly OtpvV3ArchiveEntry[] = createRequiredPayloadEntries();

    expect((): void =>
      validateOtpvV3PayloadEntries([...required, createFile('database/osumi-tpv.sqlite', 1)]),
    ).toThrow('entrada duplicada');
  });

  it('rechaza raíces no declaradas por el formato', (): void => {
    expect((): void =>
      validateOtpvV3PayloadEntries([
        ...createRequiredPayloadEntries(),
        createFile('unknown/file.bin', 1),
      ]),
    ).toThrow('raíz permitida');
  });

  it('rechaza un payload incompleto', (): void => {
    expect((): void =>
      validateOtpvV3PayloadEntries([
        createFile('database/osumi-tpv.sqlite', 1),
        createFile('config/app_data.json', 1),
      ]),
    ).toThrow('Falta el archivo obligatorio');
  });

  it('aplica el máximo de entradas del payload', (): void => {
    const entries: readonly OtpvV3ArchiveEntry[] = new Array(
      OTPV_V3_MAX_PAYLOAD_ENTRY_COUNT + 1,
    ).fill(createFile('files/item.bin', 1));

    expect((): void => validateOtpvV3PayloadEntries(entries)).toThrow('demasiadas entradas');
  });

  it('aplica el límite total descomprimido', (): void => {
    const largeFiles: OtpvV3ArchiveEntry[] = Array.from(
      {
        length: 9,
      },
      (_value: unknown, index: number): OtpvV3ArchiveEntry =>
        createFile(`files/chunk-${index}.bin`, OTPV_V3_MAX_SINGLE_ENTRY_SIZE_BYTES),
    );

    expect((): void =>
      validateOtpvV3PayloadEntries([...createRequiredPayloadEntries(), ...largeFiles]),
    ).toThrow('contenido descomprimido');
  });

  it('aplica el tamaño máximo del paquete', (): void => {
    expect((): void => validateOtpvV3PackageSize(OTPV_V3_MAX_PACKAGE_SIZE_BYTES)).not.toThrow();
    expect((): void => validateOtpvV3PackageSize(OTPV_V3_MAX_PACKAGE_SIZE_BYTES + 1)).toThrow(
      'supera el tamaño máximo',
    );
  });
});

/**
 * Construye las entradas mínimas
 * obligatorias de un payload v3.
 */
function createRequiredPayloadEntries(): readonly OtpvV3ArchiveEntry[] {
  return [
    createFile('database/osumi-tpv.sqlite', 1),
    createFile('config/app_data.json', 1),
    createFile('assets/logo.webp', 1),
    createFile('secrets/secrets.json', 1),
  ];
}

/**
 * Construye una entrada regular
 * para los tests del validador.
 */
function createFile(path: string, uncompressedSize: number): OtpvV3ArchiveEntry {
  return {
    path,
    uncompressedSize,
    isDirectory: false,
    isSymbolicLink: false,
  };
}
