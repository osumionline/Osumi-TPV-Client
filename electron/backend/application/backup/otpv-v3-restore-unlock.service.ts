import type OtpvPackageInspector from '@backend/contracts/backup/otpv-package-inspector.interface';
import type { OtpvV3Crypto } from '@backend/contracts/backup/otpv-v3-crypto.interface';
import type OtpvV3EncryptedPayloadExtractor from '@backend/contracts/backup/otpv-v3-encrypted-payload-extractor.interface';
import type OtpvV3RestoreSelectionStore from '@backend/contracts/backup/otpv-v3-restore-selection-store.interface';
import type OtpvV3RestoreWorkspace from '@backend/contracts/backup/otpv-v3-restore-workspace.interface';
import type OtpvPackageInspection from '@backend/domain/backup/otpv-package-inspection.type';
import type OtpvV3RestoreSelection from '@backend/domain/backup/otpv-v3-restore-selection.interface';
import { OTPV_V3_FORMAT_VERSION } from '@backend/domain/backup/otpv-v3.constants';
import type BackupRestoreUnlockCommand from '@desktop-contracts/backup/backup-restore-unlock-command.interface';
import type BackupRestoreUnlockResult from '@desktop-contracts/backup/backup-restore-unlock-result.interface';
import { isDeepStrictEqual } from 'node:util';

/**
 * Autentica y descifra el payload de una
 * selección `.otpv` v3.
 */
export default class OtpvV3RestoreUnlockService {
  /**
   * Crea el servicio de desbloqueo.
   */
  constructor(
    private readonly selectionStore: OtpvV3RestoreSelectionStore,
    private readonly packageInspector: OtpvPackageInspector,
    private readonly payloadExtractor: OtpvV3EncryptedPayloadExtractor,
    private readonly crypto: OtpvV3Crypto,
    private readonly workspace: OtpvV3RestoreWorkspace,
  ) {}

  /**
   * Recupera la selección, vuelve a validar
   * el paquete y autentica el payload completo.
   */
  async unlock(command: BackupRestoreUnlockCommand): Promise<BackupRestoreUnlockResult> {
    const selection: OtpvV3RestoreSelection | null = this.selectionStore.resolve(
      command.selectionId,
    );

    if (selection === null) {
      throw new Error(
        ['La selección de la copia ha caducado', 'o ya no está disponible.'].join(' '),
      );
    }

    if (command.backupApiKey.length === 0) {
      throw this.createOpenError();
    }

    await this.workspace.reset();

    try {
      await this.assertPackageHasNotChanged(selection);

      await this.payloadExtractor.extract(
        selection.packagePath,
        this.workspace.encryptedPayloadFile,
      );

      const authenticatedData: Buffer = Buffer.from(selection.manifest.authenticatedData, 'base64');

      await this.crypto.decryptFile({
        backupApiKey: command.backupApiKey,
        authenticatedData,
        kdf: selection.manifest.kdf,
        keyWrap: selection.manifest.keyWrap,
        payload: selection.manifest.payload,
        sourceFile: this.workspace.encryptedPayloadFile,
        destinationFile: this.workspace.decryptedPayloadFile,
      });

      await this.workspace.removeEncryptedPayload();

      return {
        status: 'unlocked',
        selectionId: command.selectionId,
        backupId: selection.manifest.backupId,
      };
    } catch (error: unknown) {
      await this.clearWorkspaceSafely();

      throw error;
    }
  }

  /**
   * Repite la inspección inmediatamente antes
   * de usar el paquete seleccionado.
   */
  private async assertPackageHasNotChanged(selection: OtpvV3RestoreSelection): Promise<void> {
    const currentInspection: OtpvPackageInspection = await this.packageInspector.inspect(
      selection.packagePath,
    );

    if (
      currentInspection.formatVersion !== OTPV_V3_FORMAT_VERSION ||
      !isDeepStrictEqual(currentInspection.manifest, selection.manifest)
    ) {
      throw new Error(['El archivo .otpv ha cambiado', 'desde que fue seleccionado.'].join(' '));
    }
  }

  /**
   * Genera el mensaje común para una clave
   * ausente o no utilizable.
   */
  private createOpenError(): Error {
    return new Error(
      [
        'No se puede abrir la copia de seguridad.',
        'La TPV Backup key no es correcta',
        'o el archivo está dañado.',
      ].join(' '),
    );
  }

  /**
   * Limpia el workspace sin ocultar
   * el fallo principal.
   */
  private async clearWorkspaceSafely(): Promise<void> {
    try {
      await this.workspace.clear();
    } catch (error: unknown) {
      console.error('No se ha podido limpiar el workspace de restauración:', error);
    }
  }
}
