import { Component, inject, signal, type WritableSignal } from '@angular/core';
import { FieldTree, FormField, form } from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import type BackupRestoreFinalizeResult from '@desktop-contracts/backup/backup-restore-finalize-result.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import type BackupRestoreUnlockCommand from '@desktop-contracts/backup/backup-restore-unlock-command.interface';
import type BackupRestoreUnlockResult from '@desktop-contracts/backup/backup-restore-unlock-result.interface';
import type RestoreBackupFormModel from '@model/configuracion/restore-backup-form.model';
import restoreBackupFormSchema from '@model/configuracion/restore-backup-form.schema';
import DesktopBackupService from '@services/application/desktop-backup.service';
import { getErrorMessage } from '@utils/error.utils';

type NativeRestoreSelection = Extract<
  BackupRestorePackageSelectionResult,
  {
    readonly status: 'selected';
    readonly mode: 'native-restore';
  }
>;

@Component({
  selector: 'otpv-native-restore',
  templateUrl: './native-restore.component.html',
  styleUrl: './native-restore.component.scss',
  imports: [
    FormField,
    MatButton,
    MatIconButton,
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardSubtitle,
    MatCardTitle,
    MatFormFieldModule,
    MatIcon,
    MatInput,
  ],
})
export default class NativeRestoreComponent {
  private readonly backupService: DesktopBackupService = inject(DesktopBackupService);

  private readonly dateFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  readonly restoreModel: WritableSignal<RestoreBackupFormModel> = signal<RestoreBackupFormModel>({
    backupApiKey: '',
  });

  readonly restoreForm: FieldTree<RestoreBackupFormModel> = form(
    this.restoreModel,
    restoreBackupFormSchema,
  );

  readonly selectedPackage: WritableSignal<NativeRestoreSelection | null> =
    signal<NativeRestoreSelection | null>(null);

  readonly unlockResult: WritableSignal<BackupRestoreUnlockResult | null> =
    signal<BackupRestoreUnlockResult | null>(null);

  readonly installedResult: WritableSignal<BackupRestoreFinalizeResult | null> =
    signal<BackupRestoreFinalizeResult | null>(null);

  readonly selecting: WritableSignal<boolean> = signal<boolean>(false);

  readonly unlocking: WritableSignal<boolean> = signal<boolean>(false);

  readonly finalizing: WritableSignal<boolean> = signal<boolean>(false);

  readonly backupApiKeyVisible: WritableSignal<boolean> = signal<boolean>(false);

  readonly keyValidationRequested: WritableSignal<boolean> = signal<boolean>(false);

  readonly selectionError: WritableSignal<string | null> = signal<string | null>(null);

  readonly unlockError: WritableSignal<string | null> = signal<string | null>(null);

  readonly finalizeError: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Abre el selector común de paquetes `.otpv`.
   */
  async selectPackage(): Promise<void> {
    if (this.selecting() || this.unlocking() || this.finalizing()) {
      return;
    }

    this.selecting.set(true);

    this.selectionError.set(null);
    this.unlockError.set(null);
    this.finalizeError.set(null);

    try {
      const result: BackupRestorePackageSelectionResult =
        await this.backupService.selectRestorePackage();

      if (result.status === 'cancelled') {
        return;
      }

      if (result.mode === 'legacy-import') {
        this.clearLocalSelection();

        this.selectionError.set(
          [
            'El archivo seleccionado es una exportación v2',
            'de una versión anterior de Osumi TPV.',
            'Utiliza la opción «Importar Osumi TPV anterior».',
          ].join(' '),
        );

        return;
      }

      this.clearSensitiveKey();

      this.selectedPackage.set(result);
      this.unlockResult.set(null);
      this.installedResult.set(null);
      this.keyValidationRequested.set(false);
    } catch (error: unknown) {
      this.clearLocalSelection();

      this.selectionError.set(
        getErrorMessage(error, 'No se ha podido seleccionar la copia de seguridad.'),
      );
    } finally {
      this.selecting.set(false);
    }
  }

  /**
   * Elimina la selección mostrada actualmente
   * antes de que exista un staging preparado.
   */
  clearSelection(): void {
    if (this.unlockResult() !== null || this.unlocking() || this.finalizing()) {
      return;
    }

    this.clearLocalSelection();
  }

  /**
   * Alterna la visibilidad de la TPV Backup key.
   */
  toggleBackupApiKeyVisibility(): void {
    this.backupApiKeyVisible.update((visible: boolean): boolean => !visible);
  }

  /**
   * Autentica la copia, valida todo su contenido
   * y deja preparado el staging de restauración.
   */
  async unlockRestore(): Promise<void> {
    const selectedPackage: NativeRestoreSelection | null = this.selectedPackage();

    if (selectedPackage === null || this.unlocking() || this.finalizing()) {
      return;
    }

    this.keyValidationRequested.set(true);

    if (this.restoreForm.backupApiKey().invalid()) {
      return;
    }

    const command: BackupRestoreUnlockCommand = {
      selectionId: selectedPackage.selectionId,

      /*
       * No aplicar trim ni normalización.
       */
      backupApiKey: this.restoreForm.backupApiKey().value(),
    };

    this.unlocking.set(true);

    this.unlockError.set(null);
    this.finalizeError.set(null);

    try {
      const result: BackupRestoreUnlockResult =
        await this.backupService.unlockRestorePackage(command);

      this.unlockResult.set(result);

      /*
       * La promoción final ya no necesita
       * conservar la clave en el renderer.
       */
      this.clearSensitiveKey();

      this.keyValidationRequested.set(false);
    } catch (error: unknown) {
      this.unlockResult.set(null);

      this.unlockError.set(getErrorMessage(error, 'No se ha podido abrir la copia de seguridad.'));
    } finally {
      this.unlocking.set(false);
    }
  }

  /**
   * Promueve el staging previamente validado
   * a la instalación definitiva.
   */
  async finalizeRestore(): Promise<void> {
    const unlockResult: BackupRestoreUnlockResult | null = this.unlockResult();

    if (unlockResult === null || this.finalizing()) {
      return;
    }

    this.finalizing.set(true);

    this.finalizeError.set(null);

    try {
      const result: BackupRestoreFinalizeResult = await this.backupService.finalizeRestorePackage(
        unlockResult.selectionId,
      );

      this.installedResult.set(result);
    } catch (error: unknown) {
      this.finalizeError.set(
        getErrorMessage(error, 'No se ha podido activar la copia restaurada.'),
      );

      /*
       * Si la promoción falla, el backend invalida
       * el staging preparado. Se exige volver a
       * desbloquear la copia.
       */
      this.unlockResult.set(null);
    } finally {
      this.finalizing.set(false);
    }
  }

  /**
   * Reinicia el renderer para arrancar
   * sobre la instalación recién restaurada.
   */
  finishRestore(): void {
    window.location.reload();
  }

  /**
   * Formatea una fecha UTC del manifest
   * usando la configuración local.
   */
  formatDate(value: string): string {
    const date: Date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return this.dateFormatter.format(date);
  }

  /**
   * Limpia únicamente el estado local
   * asociado a la selección mostrada.
   */
  private clearLocalSelection(): void {
    this.selectedPackage.set(null);
    this.unlockResult.set(null);
    this.installedResult.set(null);

    this.selectionError.set(null);
    this.unlockError.set(null);
    this.finalizeError.set(null);

    this.keyValidationRequested.set(false);

    this.clearSensitiveKey();
  }

  /**
   * Elimina del renderer la TPV Backup key.
   */
  private clearSensitiveKey(): void {
    this.restoreForm.backupApiKey().value.set('');

    this.backupApiKeyVisible.set(false);
  }
}
