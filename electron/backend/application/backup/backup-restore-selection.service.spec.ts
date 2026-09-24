import BackupRestoreSelectionService from '@backend/application/backup/backup-restore-selection.service';
import OtpvPackageSelectionService from '@backend/application/backup/otpv-package-selection.service';
import type OtpvPackageDialog from '@backend/contracts/backup/otpv-package-dialog.interface';
import type OtpvPackageInspector from '@backend/contracts/backup/otpv-package-inspector.interface';
import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';
import type OtpvV3RestoreWorkspace from '@backend/contracts/backup/otpv-v3-restore-workspace.interface';
import type LegacyImportPackageInspector from '@backend/contracts/legacy-import/legacy-import-package-inspector.interface';
import type OtpvPackageInspection from '@backend/domain/backup/otpv-package-inspection.type';
import { OTPV_V3_FORMAT_VERSION } from '@backend/domain/backup/otpv-v3.constants';
import { DATABASE_SCHEMA_VERSION } from '@backend/domain/database/database-schema.constants';
import type LegacyImportPackageInspection from '@backend/domain/legacy-import/legacy-import-package-inspection.interface';
import { LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION } from '@backend/domain/legacy-import/legacy-import.constants';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import InMemoryOtpvV3RestoreSelectionStore from '@infrastructure/backup/in-memory-otpv-v3-restore-selection.store';
import InMemoryLegacyImportSelectionStore from '@infrastructure/legacy-import/in-memory-legacy-import-selection.store';
import { describe, expect, it } from 'vitest';

describe('BackupRestoreSelectionService', (): void => {
  it('devuelve cancelled si se cierra el diálogo', async (): Promise<void> => {
    const service: BackupRestoreSelectionService = createService(
      new TestOtpvPackageDialog(null),
      new TestOtpvPackageInspector({
        formatVersion: OTPV_V3_FORMAT_VERSION,
        manifest: createV3Manifest(),
      }),
    );

    const result: BackupRestorePackageSelectionResult = await service.selectPackage();

    expect(result).toEqual({
      status: 'cancelled',
    });
  });

  it('expone únicamente los metadatos necesarios de una copia v3', async (): Promise<void> => {
    const packagePath: string = 'C:\\backups\\backup-test.otpv';

    const service: BackupRestoreSelectionService = createService(
      new TestOtpvPackageDialog(packagePath),
      new TestOtpvPackageInspector({
        formatVersion: OTPV_V3_FORMAT_VERSION,
        manifest: createV3Manifest(),
      }),
    );

    const result: BackupRestorePackageSelectionResult = await service.selectPackage();

    expect(result).toMatchObject({
      status: 'selected',
      mode: 'native-restore',
      formatVersion: OTPV_V3_FORMAT_VERSION,
      fileName: 'backup-test.otpv',
      backupId: '11111111-1111-4111-8111-111111111111',
      applicationVersion: '1.0.0',
      databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
      createdAt: '2026-09-24T10:00:00.000Z',
    });

    expect(result).not.toHaveProperty('manifest');
    expect(result).not.toHaveProperty('authenticatedData');
    expect(result).not.toHaveProperty('kdf');
    expect(result).not.toHaveProperty('keyWrap');
    expect(result).not.toHaveProperty('packagePath');
  });

  it('expone la selección legacy compatible con el flujo existente', async (): Promise<void> => {
    const service: BackupRestoreSelectionService = createService(
      new TestOtpvPackageDialog('C:\\backups\\legacy.otpv'),
      new TestOtpvPackageInspector({
        formatVersion: LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION,
        manifest: null,
      }),
    );

    const result: BackupRestorePackageSelectionResult = await service.selectPackage();

    expect(result).toMatchObject({
      status: 'selected',
      mode: 'legacy-import',
      formatVersion: LEGACY_IMPORT_SUPPORTED_FORMAT_VERSION,
      fileName: 'legacy.otpv',
      applicationVersion: '9.9.0',
      schemaVersion: 'legacy-2026-07',
      createdAt: '2026-09-24T10:00:00.000Z',
    });
  });
});

/**
 * Construye el servicio con dependencias
 * controladas para cada test.
 */
function createService(
  dialog: OtpvPackageDialog,
  packageInspector: OtpvPackageInspector,
): BackupRestoreSelectionService {
  const packageSelectionService: OtpvPackageSelectionService = new OtpvPackageSelectionService(
    packageInspector,
    new TestLegacyPackageInspector(),
    new InMemoryLegacyImportSelectionStore(),
    new InMemoryOtpvV3RestoreSelectionStore(),
  );

  return new BackupRestoreSelectionService(
    dialog,
    packageSelectionService,
    new TestRestoreWorkspace(),
  );
}

/**
 * Diálogo determinista para los tests.
 */
class TestOtpvPackageDialog implements OtpvPackageDialog {
  /**
   * Crea el diálogo con la ruta que debe devolver.
   */
  constructor(private readonly packagePath: string | null) {}

  /**
   * Devuelve la selección configurada.
   */
  async selectPackage(): Promise<string | null> {
    return this.packagePath;
  }
}

/**
 * Inspector genérico determinista.
 */
class TestOtpvPackageInspector implements OtpvPackageInspector {
  /**
   * Crea el inspector con un resultado fijo.
   */
  constructor(private readonly inspection: OtpvPackageInspection) {}

  /**
   * Devuelve la inspección configurada.
   */
  async inspect(): Promise<OtpvPackageInspection> {
    return this.inspection;
  }
}

/**
 * Inspector legacy determinista.
 */
class TestLegacyPackageInspector implements LegacyImportPackageInspector {
  /**
   * Devuelve una inspección legacy mínima.
   */
  async inspect(): Promise<LegacyImportPackageInspection> {
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
}

/**
 * Construye un manifest v3 para los tests.
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
    authenticatedData: 'private-fixture',
    kdf: {
      algorithm: 'scrypt',
      salt: 'private-fixture',
      cost: 32768,
      blockSize: 8,
      parallelization: 3,
      length: 32,
    },
    keyWrap: {
      algorithm: 'aes-256-gcm',
      iv: 'private-fixture',
      authTag: 'private-fixture',
      wrappedDek: 'private-fixture',
    },
    payload: {
      entry: 'payload.enc',
      format: 'zip',
      algorithm: 'aes-256-gcm',
      iv: 'private-fixture',
      authTag: 'private-fixture',
    },
  };
}

/**
 * Workspace neutro utilizado por los tests
 * de selección de paquetes.
 */
class TestRestoreWorkspace implements OtpvV3RestoreWorkspace {
  readonly encryptedPayloadFile: string = 'payload.enc';
  readonly decryptedPayloadFile: string = 'payload.zip';
  readonly databaseFile: string = 'C:\\staging\\restore-work\\required\\database\\osumi-tpv.sqlite';
  readonly appDataFile: string = 'C:\\staging\\restore-work\\required\\config\\app_data.json';
  readonly logoFile: string = 'C:\\staging\\restore-work\\required\\assets\\logo.webp';
  readonly portableSecretsFile: string =
    'C:\\staging\\restore-work\\required\\secrets\\secrets.json';

  /**
   * No necesita preparación real en estos tests.
   */
  reset(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * No existe payload cifrado real que eliminar.
   */
  removeEncryptedPayload(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * No existe workspace real que limpiar.
   */
  clear(): Promise<void> {
    return Promise.resolve();
  }
}
