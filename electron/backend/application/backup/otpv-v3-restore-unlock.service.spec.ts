import OtpvV3RestoreUnlockService from '@backend/application/backup/otpv-v3-restore-unlock.service';
import type OtpvPackageInspector from '@backend/contracts/backup/otpv-package-inspector.interface';
import type {
  OtpvV3Crypto,
  OtpvV3DecryptFileCommand,
  OtpvV3EncryptionResult,
} from '@backend/contracts/backup/otpv-v3-crypto.interface';
import type OtpvV3EncryptedPayloadExtractor from '@backend/contracts/backup/otpv-v3-encrypted-payload-extractor.interface';
import type { OtpvV3Manifest } from '@backend/contracts/backup/otpv-v3-manifest.interface';
import type OtpvV3PayloadInspector from '@backend/contracts/backup/otpv-v3-payload-inspector.interface';
import type OtpvV3RequiredContentExtractor from '@backend/contracts/backup/otpv-v3-required-content-extractor.interface';
import type OtpvV3RequiredContentValidator from '@backend/contracts/backup/otpv-v3-required-content-validator.interface';
import type OtpvV3RestoreWorkspace from '@backend/contracts/backup/otpv-v3-restore-workspace.interface';
import type OtpvPackageInspection from '@backend/domain/backup/otpv-package-inspection.type';
import type OtpvV3PayloadInspection from '@backend/domain/backup/otpv-v3-payload-inspection.interface';
import { OTPV_V3_FORMAT_VERSION } from '@backend/domain/backup/otpv-v3.constants';
import { DATABASE_SCHEMA_VERSION } from '@backend/domain/database/database-schema.constants';
import type BackupRestoreUnlockResult from '@desktop-contracts/backup/backup-restore-unlock-result.interface';
import InMemoryOtpvV3RestoreSelectionStore from '@infrastructure/backup/in-memory-otpv-v3-restore-selection.store';
import { describe, expect, it } from 'vitest';

const BACKUP_KEY: string = 'backup-key-exacta';

describe('OtpvV3RestoreUnlockService', (): void => {
  it('extrae y descifra el payload seleccionado', async (): Promise<void> => {
    const manifest: OtpvV3Manifest = createManifest();
    const store = new InMemoryOtpvV3RestoreSelectionStore();

    const selectionId: string = store.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    const extractor = new TestPayloadExtractor();
    const crypto = new TestCrypto();
    const payloadInspector = new TestPayloadInspector();
    const requiredContentExtractor = new TestRequiredContentExtractor();
    const requiredContentValidator = new TestRequiredContentValidator();
    const workspace = new TestWorkspace();

    const service = new OtpvV3RestoreUnlockService(
      store,
      new TestPackageInspector({
        formatVersion: OTPV_V3_FORMAT_VERSION,
        manifest,
      }),
      extractor,
      crypto,
      payloadInspector,
      requiredContentExtractor,
      requiredContentValidator,
      workspace,
    );

    const result: BackupRestoreUnlockResult = await service.unlock({
      selectionId,
      backupApiKey: BACKUP_KEY,
    });

    expect(result).toEqual({
      status: 'unlocked',
      selectionId,
      backupId: manifest.backupId,
    });

    expect(extractor.packagePath).toBe('C:\\backup.otpv');
    expect(extractor.destinationFile).toBe(workspace.encryptedPayloadFile);

    expect(crypto.command?.backupApiKey).toBe(BACKUP_KEY);
    expect(crypto.command?.authenticatedData).toEqual(
      Buffer.from(manifest.authenticatedData, 'base64'),
    );
    expect(crypto.command?.sourceFile).toBe(workspace.encryptedPayloadFile);
    expect(crypto.command?.destinationFile).toBe(workspace.decryptedPayloadFile);

    expect(workspace.resetCalls).toBe(1);
    expect(workspace.removeEncryptedPayloadCalls).toBe(1);
    expect(workspace.clearCalls).toBe(0);
    expect(payloadInspector.calls).toBe(1);
    expect(payloadInspector.payloadFile).toBe(workspace.decryptedPayloadFile);
    expect(requiredContentExtractor.calls).toBe(1);
    expect(requiredContentValidator.calls).toBe(1);
  });

  it('rechaza una selección caducada', async (): Promise<void> => {
    const service = new OtpvV3RestoreUnlockService(
      new InMemoryOtpvV3RestoreSelectionStore(),
      new TestPackageInspector({
        formatVersion: OTPV_V3_FORMAT_VERSION,
        manifest: createManifest(),
      }),
      new TestPayloadExtractor(),
      new TestCrypto(),
      new TestPayloadInspector(),
      new TestRequiredContentExtractor(),
      new TestRequiredContentValidator(),
      new TestWorkspace(),
    );

    await expect(
      service.unlock({
        selectionId: 'missing',
        backupApiKey: BACKUP_KEY,
      }),
    ).rejects.toThrow('selección de la copia ha caducado');
  });

  it('detecta que el manifest ha cambiado desde la selección', async (): Promise<void> => {
    const selectedManifest: OtpvV3Manifest = createManifest();

    const changedManifest: OtpvV3Manifest = {
      ...selectedManifest,
      backupId: '22222222-2222-4222-8222-222222222222',
    };

    const store = new InMemoryOtpvV3RestoreSelectionStore();

    const selectionId: string = store.save({
      packagePath: 'C:\\backup.otpv',
      manifest: selectedManifest,
    });

    const extractor = new TestPayloadExtractor();
    const workspace = new TestWorkspace();

    const service = new OtpvV3RestoreUnlockService(
      store,
      new TestPackageInspector({
        formatVersion: OTPV_V3_FORMAT_VERSION,
        manifest: changedManifest,
      }),
      extractor,
      new TestCrypto(),
      new TestPayloadInspector(),
      new TestRequiredContentExtractor(),
      new TestRequiredContentValidator(),
      workspace,
    );

    await expect(
      service.unlock({
        selectionId,
        backupApiKey: BACKUP_KEY,
      }),
    ).rejects.toThrow('ha cambiado desde que fue seleccionado');

    expect(extractor.calls).toBe(0);
    expect(workspace.clearCalls).toBe(1);
  });

  it('limpia el workspace si falla la autenticación criptográfica', async (): Promise<void> => {
    const manifest: OtpvV3Manifest = createManifest();

    const store = new InMemoryOtpvV3RestoreSelectionStore();

    const selectionId: string = store.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    const workspace = new TestWorkspace();

    const crypto = new TestCrypto();

    crypto.decryptionError = new Error(
      [
        'No se puede abrir la copia de seguridad.',
        'La TPV Backup key no es correcta',
        'o el archivo está dañado.',
      ].join(' '),
    );

    const service = new OtpvV3RestoreUnlockService(
      store,
      new TestPackageInspector({
        formatVersion: OTPV_V3_FORMAT_VERSION,
        manifest,
      }),
      new TestPayloadExtractor(),
      crypto,
      new TestPayloadInspector(),
      new TestRequiredContentExtractor(),
      new TestRequiredContentValidator(),
      workspace,
    );

    await expect(
      service.unlock({
        selectionId,
        backupApiKey: 'incorrecta',
      }),
    ).rejects.toThrow('La TPV Backup key no es correcta o el archivo está dañado.');

    expect(workspace.clearCalls).toBe(1);
    expect(workspace.removeEncryptedPayloadCalls).toBe(0);
  });

  it('limpia el workspace si el ZIP interior no es válido', async (): Promise<void> => {
    const manifest: OtpvV3Manifest = createManifest();

    const store = new InMemoryOtpvV3RestoreSelectionStore();

    const selectionId: string = store.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    const workspace = new TestWorkspace();
    const payloadInspector = new TestPayloadInspector();

    payloadInspector.inspectionError = new Error('El payload contiene una ruta insegura.');

    const service = new OtpvV3RestoreUnlockService(
      store,
      new TestPackageInspector({
        formatVersion: OTPV_V3_FORMAT_VERSION,
        manifest,
      }),
      new TestPayloadExtractor(),
      new TestCrypto(),
      payloadInspector,
      new TestRequiredContentExtractor(),
      new TestRequiredContentValidator(),
      workspace,
    );

    await expect(
      service.unlock({
        selectionId,
        backupApiKey: BACKUP_KEY,
      }),
    ).rejects.toThrow('El payload contiene una ruta insegura.');

    expect(payloadInspector.calls).toBe(1);
    expect(workspace.clearCalls).toBe(1);
    expect(workspace.removeEncryptedPayloadCalls).toBe(0);
  });

  it('limpia el workspace si un recurso obligatorio no es válido', async (): Promise<void> => {
    const manifest: OtpvV3Manifest = createManifest();

    const store = new InMemoryOtpvV3RestoreSelectionStore();

    const selectionId: string = store.save({
      packagePath: 'C:\\backup.otpv',
      manifest,
    });

    const workspace = new TestWorkspace();

    const contentValidator = new TestRequiredContentValidator();

    contentValidator.validationError = new Error(
      'La base de datos incluida en la copia no es válida.',
    );

    const service = new OtpvV3RestoreUnlockService(
      store,
      new TestPackageInspector({
        formatVersion: OTPV_V3_FORMAT_VERSION,
        manifest,
      }),
      new TestPayloadExtractor(),
      new TestCrypto(),
      new TestPayloadInspector(),
      new TestRequiredContentExtractor(),
      contentValidator,
      workspace,
    );

    await expect(
      service.unlock({
        selectionId,
        backupApiKey: BACKUP_KEY,
      }),
    ).rejects.toThrow('La base de datos incluida en la copia no es válida.');

    expect(contentValidator.calls).toBe(1);
    expect(workspace.clearCalls).toBe(1);
    expect(workspace.removeEncryptedPayloadCalls).toBe(0);
  });
});

/**
 * Inspector determinista para los tests.
 */
class TestPackageInspector implements OtpvPackageInspector {
  /**
   * Crea el inspector con la respuesta indicada.
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
 * Extractor en memoria que registra la llamada.
 */
class TestPayloadExtractor implements OtpvV3EncryptedPayloadExtractor {
  calls: number = 0;
  packagePath: string | null = null;
  destinationFile: string | null = null;

  /**
   * Registra las rutas recibidas.
   */
  async extract(packagePath: string, destinationFile: string): Promise<void> {
    this.calls += 1;
    this.packagePath = packagePath;
    this.destinationFile = destinationFile;
  }
}

/**
 * Implementación criptográfica de prueba.
 */
class TestCrypto implements OtpvV3Crypto {
  command: OtpvV3DecryptFileCommand | null = null;
  decryptionError: Error | null = null;

  /**
   * No se utiliza cifrado en estos tests.
   */
  async encryptFile(): Promise<OtpvV3EncryptionResult> {
    throw new Error('No utilizado.');
  }

  /**
   * No se utiliza cifrado streaming en estos tests.
   */
  async encryptStream(): Promise<OtpvV3EncryptionResult> {
    throw new Error('No utilizado.');
  }

  /**
   * Registra el comando de descifrado.
   */
  async decryptFile(command: OtpvV3DecryptFileCommand): Promise<void> {
    this.command = command;

    if (this.decryptionError !== null) {
      throw this.decryptionError;
    }
  }
}

/**
 * Workspace en memoria para verificar
 * el ciclo de vida temporal.
 */
class TestWorkspace implements OtpvV3RestoreWorkspace {
  readonly encryptedPayloadFile: string = 'C:\\staging\\restore-work\\payload.enc';
  readonly decryptedPayloadFile: string = 'C:\\staging\\restore-work\\payload.zip';
  readonly databaseFile: string = 'C:\\staging\\restore-work\\required\\database\\osumi-tpv.sqlite';
  readonly appDataFile: string = 'C:\\staging\\restore-work\\required\\config\\app_data.json';
  readonly logoFile: string = 'C:\\staging\\restore-work\\required\\assets\\logo.webp';
  readonly portableSecretsFile: string =
    'C:\\staging\\restore-work\\required\\secrets\\secrets.json';

  resetCalls: number = 0;
  removeEncryptedPayloadCalls: number = 0;
  clearCalls: number = 0;

  /**
   * Registra el reinicio.
   */
  async reset(): Promise<void> {
    this.resetCalls += 1;
  }

  /**
   * Registra la eliminación del cifrado.
   */
  async removeEncryptedPayload(): Promise<void> {
    this.removeEncryptedPayloadCalls += 1;
  }

  /**
   * Registra la limpieza completa.
   */
  async clear(): Promise<void> {
    this.clearCalls += 1;
  }
}

/**
 * Construye un manifest suficiente
 * para probar la orquestación.
 */
function createManifest(): OtpvV3Manifest {
  return {
    formatVersion: OTPV_V3_FORMAT_VERSION,
    application: 'Osumi TPV Client',
    applicationVersion: '1.0.0',
    databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
    backupId: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-09-24T10:00:00.000Z',
    cryptoSuite: 'otpv3-scrypt-aes-256-gcm',
    authenticatedData: Buffer.from('authenticated-metadata', 'utf8').toString('base64'),
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

/**
 * Inspector del ZIP interior utilizado
 * para verificar la orquestación.
 */
class TestPayloadInspector implements OtpvV3PayloadInspector {
  calls: number = 0;
  payloadFile: string | null = null;
  inspectionError: Error | null = null;

  /**
   * Registra el payload recibido y simula
   * una inspección correcta o fallida.
   */
  async inspect(payloadFile: string): Promise<OtpvV3PayloadInspection> {
    this.calls += 1;
    this.payloadFile = payloadFile;

    if (this.inspectionError !== null) {
      throw this.inspectionError;
    }

    return {
      entries: [],
      regularFileCount: 0,
      totalUncompressedSize: 0,
    };
  }
}

/**
 * Extractor controlado de recursos obligatorios.
 */
class TestRequiredContentExtractor implements OtpvV3RequiredContentExtractor {
  calls: number = 0;

  /**
   * Registra la extracción solicitada.
   */
  extract(): Promise<void> {
    this.calls += 1;

    return Promise.resolve();
  }
}

/**
 * Validador controlado de recursos obligatorios.
 */
class TestRequiredContentValidator implements OtpvV3RequiredContentValidator {
  calls: number = 0;
  validationError: Error | null = null;

  /**
   * Simula la validación semántica.
   */
  validate(): Promise<void> {
    this.calls += 1;

    if (this.validationError !== null) {
      return Promise.reject(this.validationError);
    }

    return Promise.resolve();
  }
}
