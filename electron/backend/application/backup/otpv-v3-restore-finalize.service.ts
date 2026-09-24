import type OtpvV3PreparedRestoreStore from '@backend/contracts/backup/otpv-v3-prepared-restore-store.interface';
import type OtpvV3RestoreSelectionStore from '@backend/contracts/backup/otpv-v3-restore-selection-store.interface';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type InstallationFinalizer from '@backend/contracts/configuration/installation-finalizer.interface';
import type PrintingSettingsRepository from '@backend/contracts/printing/printing-settings.repository.interface';
import type OtpvV3PreparedRestore from '@backend/domain/backup/otpv-v3-prepared-restore.interface';
import type OtpvV3RestoreSelection from '@backend/domain/backup/otpv-v3-restore-selection.interface';
import type BackupRestoreFinalizeResult from '@desktop-contracts/backup/backup-restore-finalize-result.interface';

/**
 * Promueve a instalación definitiva una
 * restauración v3 previamente preparada.
 */
export default class OtpvV3RestoreFinalizeService {
  private activeSelectionId: string | null = null;

  /**
   * Crea el servicio de finalización.
   */
  constructor(
    private readonly selectionStore: OtpvV3RestoreSelectionStore,
    private readonly preparedRestoreStore: OtpvV3PreparedRestoreStore,
    private readonly appDataRepository: AppDataRepository,
    private readonly printingSettingsRepository: PrintingSettingsRepository,
    private readonly installationFinalizer: InstallationFinalizer,
  ) {}

  /**
   * Comprueba el staging preparado y activa
   * definitivamente la instalación restaurada.
   */
  async finalize(selectionId: string): Promise<BackupRestoreFinalizeResult> {
    if (this.activeSelectionId !== null) {
      throw new Error('Ya existe una restauración en proceso de finalización.');
    }

    const selection: OtpvV3RestoreSelection | null = this.selectionStore.resolve(selectionId);

    if (selection === null) {
      throw new Error(
        ['La selección de la copia ha caducado', 'o ya no está disponible.'].join(' '),
      );
    }

    const preparedRestore: OtpvV3PreparedRestore | null = this.preparedRestoreStore.resolve();

    if (
      preparedRestore === null ||
      preparedRestore.selectionId !== selectionId ||
      preparedRestore.backupId !== selection.manifest.backupId
    ) {
      throw new Error('La copia seleccionada no tiene una restauración preparada para activar.');
    }

    if (await this.appDataRepository.exists()) {
      throw new Error('No se puede restaurar una copia sobre una instalación ya configurada.');
    }

    this.activeSelectionId = selectionId;

    try {
      /*
       * printing_settings.json pertenece al equipo local,
       * no al backup. La restauración comienza siempre
       * con la impresora sin asignar.
       */
      await this.printingSettingsRepository.save({
        schemaVersion: 1,
        ticketPrinterDeviceName: null,
      });

      await this.installationFinalizer.finalize();

      this.preparedRestoreStore.clear();

      this.selectionStore.clear();

      return {
        status: 'installed',
        selectionId,
        backupId: selection.manifest.backupId,
      };
    } catch (error: unknown) {
      this.preparedRestoreStore.clear();

      await this.recoverSafely();

      throw new Error('No se ha podido completar la restauración de la copia de seguridad.', {
        cause: error,
      });
    } finally {
      this.activeSelectionId = null;
    }
  }

  /**
   * Recupera una promoción interrumpida
   * sin ocultar el fallo original.
   */
  private async recoverSafely(): Promise<void> {
    try {
      await this.installationFinalizer.recover();
    } catch (error: unknown) {
      console.error('No se ha podido recuperar la restauración incompleta:', error);
    }
  }
}
