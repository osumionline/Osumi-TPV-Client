import OtpvPackageSelectionService from '@backend/application/backup/otpv-package-selection.service';
import type OtpvPackageInspector from '@backend/contracts/backup/otpv-package-inspector.interface';
import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';
import type LegacyImportPackageInspector from '@backend/contracts/legacy-import/legacy-import-package-inspector.interface';
import type OtpvPackageInspection from '@backend/domain/backup/otpv-package-inspection.type';
import type OtpvPackageSelectionResult from '@backend/domain/backup/otpv-package-selection-result.type';
import type OtpvV3RestoreSelection from '@backend/domain/backup/otpv-v3-restore-selection.interface';
import { OTPV_V3_FORMAT_VERSION } from '@backend/domain/backup/otpv-v3.constants';
import { DATABASE_SCHEMA_VERSION } from '@backend/domain/database/database-schema.constants';
import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.interface';
import type LegacyImportSelection from '@backend/domain/legacy-import/legacy-import-selection.interface';
import { LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION } from '@backend/domain/legacy-import/legacy-import.constants';
import InMemoryOtpvV3RestoreSelectionStore from '@infrastructure/backup/in-memory-otpv-v3-restore-selection.store';
import InMemoryLegacyImportSelectionStore from '@infrastructure/legacy-import/in-memory-legacy-import-selection.store';
import { describe, expect, it } from 'vitest';

describe('OtpvPackageSelectionService', (): void => {
  it('enruta un v2 al inspector y store legacy existentes', async (): Promise<void> => {
    const packagePath: string = 'C:\\backups\\legacy.otpv';
    const legacyInspection: LegacyImportPackageInspection = createLegacyInspection();

    const packageInspector: TestOtpvPackageInspector = new TestOtpvPackageInspector({
      formatVersion: LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION,
      manifest: null,
    });

    const legacyInspector: TestLegacyPackageInspector = new TestLegacyPackageInspector(
      legacyInspection,
    );

    const legacyStore: InMemoryLegacyImportSelectionStore =
      new InMemoryLegacyImportSelectionStore();

    const v3Store: InMemoryOtpvV3RestoreSelectionStore = new InMemoryOtpvV3RestoreSelectionStore();

    const service: OtpvPackageSelectionService = new OtpvPackageSelectionService(
      packageInspector,
      legacyInspector,
      legacyStore,
      v3Store,
    );

    const result: OtpvPackageSelectionResult = await service.select(packagePath);

    expect(result.mode).toBe('legacy-import');
    expect(result.formatVersion).toBe(LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION);
    expect(legacyInspector.calls).toBe(1);

    if (result.mode !== 'legacy-import') {
      throw new Error('Se esperaba una selección legacy.');
    }

    expect(result.inspection).toEqual(legacyInspection);

    const stored: LegacyImportSelection | null = legacyStore.resolve(result.selectionId);

    expect(stored).not.toBeNull();
    expect(stored?.packagePath).toBe(packagePath);
    expect(stored?.inspection).toEqual(legacyInspection);
  });

  it('enruta un v3 al store de restauración sin invocar el inspector legacy', async (): Promise<void> => {
    const packagePath: string = 'C:\\backups\\native.otpv';
    const manifest: OtpvV3Manifest = createV3Manifest();

    const packageInspector: TestOtpvPackageInspector = new TestOtpvPackageInspector({
      formatVersion: OTPV_V3_FORMAT_VERSION,
      manifest,
    });

    const legacyInspector: TestLegacyPackageInspector = new TestLegacyPackageInspector(
      createLegacyInspection(),
    );

    const legacyStore: InMemoryLegacyImportSelectionStore =
      new InMemoryLegacyImportSelectionStore();

    const v3Store: InMemoryOtpvV3RestoreSelectionStore = new InMemoryOtpvV3RestoreSelectionStore();

    const service: OtpvPackageSelectionService = new OtpvPackageSelectionService(
      packageInspector,
      legacyInspector,
      legacyStore,
      v3Store,
    );

    const result: OtpvPackageSelectionResult = await service.select(packagePath);

    expect(result.mode).toBe('native-restore');
    expect(result.formatVersion).toBe(OTPV_V3_FORMAT_VERSION);
    expect(legacyInspector.calls).toBe(0);

    if (result.mode !== 'native-restore') {
      throw new Error('Se esperaba una restauración nativa.');
    }

    const stored: OtpvV3RestoreSelection | null = v3Store.resolve(result.selectionId);

    expect(stored).toEqual({
      packagePath,
      manifest,
    });
  });

  it('invalida una selección legacy anterior al seleccionar un v3', async (): Promise<void> => {
    const legacyInspection: LegacyImportPackageInspection = createLegacyInspection();

    const packageInspector: MutableOtpvPackageInspector = new MutableOtpvPackageInspector({
      formatVersion: LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION,
      manifest: null,
    });

    const legacyInspector: TestLegacyPackageInspector = new TestLegacyPackageInspector(
      legacyInspection,
    );

    const legacyStore: InMemoryLegacyImportSelectionStore =
      new InMemoryLegacyImportSelectionStore();

    const v3Store: InMemoryOtpvV3RestoreSelectionStore = new InMemoryOtpvV3RestoreSelectionStore();

    const service: OtpvPackageSelectionService = new OtpvPackageSelectionService(
      packageInspector,
      legacyInspector,
      legacyStore,
      v3Store,
    );

    const legacyResult: OtpvPackageSelectionResult = await service.select(
      'C:\\backups\\legacy.otpv',
    );

    if (legacyResult.mode !== 'legacy-import') {
      throw new Error('Se esperaba una selección legacy.');
    }

    expect(legacyStore.resolve(legacyResult.selectionId)).not.toBeNull();

    const manifest: OtpvV3Manifest = createV3Manifest();

    packageInspector.inspection = {
      formatVersion: OTPV_V3_FORMAT_VERSION,
      manifest,
    };

    await service.select('C:\\backups\\native.otpv');

    expect(legacyStore.resolve(legacyResult.selectionId)).toBeNull();
  });

  it('limpia las selecciones anteriores aunque el nuevo paquete sea inválido', async (): Promise<void> => {
    const manifest: OtpvV3Manifest = createV3Manifest();

    const packageInspector: FailingOtpvPackageInspector = new FailingOtpvPackageInspector();

    const legacyStore: InMemoryLegacyImportSelectionStore =
      new InMemoryLegacyImportSelectionStore();

    const v3Store: InMemoryOtpvV3RestoreSelectionStore = new InMemoryOtpvV3RestoreSelectionStore();

    const previousSelectionId: string = v3Store.save({
      packagePath: 'C:\\backups\\previous.otpv',
      manifest,
    });

    const service: OtpvPackageSelectionService = new OtpvPackageSelectionService(
      packageInspector,
      new TestLegacyPackageInspector(createLegacyInspection()),
      legacyStore,
      v3Store,
    );

    await expect(service.select('C:\\backups\\invalid.otpv')).rejects.toThrow(
      'Paquete inválido de prueba.',
    );

    expect(v3Store.resolve(previousSelectionId)).toBeNull();
  });
});

/**
 * Inspector `.otpv` determinista para los tests.
 */
class TestOtpvPackageInspector implements OtpvPackageInspector {
  constructor(private readonly inspection: OtpvPackageInspection) {}

  /**
   * Devuelve la inspección configurada.
   */
  async inspect(): Promise<OtpvPackageInspection> {
    return this.inspection;
  }
}

/**
 * Inspector `.otpv` cuya respuesta puede cambiar
 * entre llamadas durante un mismo test.
 */
class MutableOtpvPackageInspector implements OtpvPackageInspector {
  constructor(public inspection: OtpvPackageInspection) {}

  /**
   * Devuelve la inspección actualmente configurada.
   */
  async inspect(): Promise<OtpvPackageInspection> {
    return this.inspection;
  }
}

/**
 * Inspector `.otpv` que simula un paquete inválido.
 */
class FailingOtpvPackageInspector implements OtpvPackageInspector {
  /**
   * Falla siempre para verificar la invalidación
   * de selecciones anteriores.
   */
  async inspect(): Promise<OtpvPackageInspection> {
    throw new Error('Paquete inválido de prueba.');
  }
}

/**
 * Inspector legacy determinista para aislar
 * la lógica de enrutamiento.
 */
class TestLegacyPackageInspector implements LegacyImportPackageInspector {
  calls: number = 0;

  constructor(private readonly inspection: LegacyImportPackageInspection) {}

  /**
   * Registra la llamada y devuelve
   * la inspección legacy configurada.
   */
  async inspect(): Promise<LegacyImportPackageInspection> {
    this.calls += 1;

    return this.inspection;
  }
}

/**
 * Construye una inspección legacy mínima
 * válida para probar el enrutamiento.
 */
function createLegacyInspection(): LegacyImportPackageInspection {
  return {
    summary: {
      fileName: 'legacy.otpv',
      packageSize: 1_024,
      archiveEntries: 6,
      uncompressedSize: 2_048,
      formatVersion: LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION,
      applicationVersion: '9.9.0',
      frameworkVersion: '9.9.0',
      databaseVersion: 'MariaDB',
      schemaVersion: 'legacy-2026-07',
      createdAt: '2026-09-24T10:00:00.000Z',
      tables: 10,
      expectedTables: 10,
      totalRows: 100,
      dumpSize: 1_000,
      includedFiles: 0,
      optionalFilesNotPresent: 0,
      warnings: [],
    },
    tableRows: {},
    fileInventory: [],
    packageSha256: 'a'.repeat(64),
  };
}

/**
 * Construye un manifest v3 tipado para
 * las pruebas de selección.
 */
function createV3Manifest(): OtpvV3Manifest {
  return {
    formatVersion: OTPV_V3_FORMAT_VERSION,
    application: 'Osumi TPV Client',
    applicationVersion: '1.0.0',
    databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
    backupId: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-09-24T10:00:00.000Z',
    cryptoSuite: 'otpv3-scrypt-aes-256-gcm',
    authenticatedData: 'fixture',
    kdf: {
      algorithm: 'scrypt',
      salt: 'fixture',
      cost: 32768,
      blockSize: 8,
      parallelization: 3,
      length: 32,
    },
    keyWrap: {
      algorithm: 'aes-256-gcm',
      iv: 'fixture',
      authTag: 'fixture',
      wrappedDek: 'fixture',
    },
    payload: {
      entry: 'payload.enc',
      format: 'zip',
      algorithm: 'aes-256-gcm',
      iv: 'fixture',
      authTag: 'fixture',
    },
  };
}
