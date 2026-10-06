import { Component, inject, signal, type OnDestroy, type WritableSignal } from '@angular/core';
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
import type {
  BackupRemoteBackup,
  BackupRemoteCredentials,
  BackupRemoteRestoreAccess,
} from '@desktop-contracts/backup/backup-remote.interface';
import type BackupRestoreFinalizeResult from '@desktop-contracts/backup/backup-restore-finalize-result.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import type BackupRestoreUnlockCommand from '@desktop-contracts/backup/backup-restore-unlock-command.interface';
import type BackupRestoreUnlockResult from '@desktop-contracts/backup/backup-restore-unlock-result.interface';
import type RestoreBackupFormModel from '@model/configuracion/restore-backup-form.model';
import restoreBackupFormSchema from '@model/configuracion/restore-backup-form.schema';
import type RestoreRemoteFormModel from '@model/configuracion/restore-remote-form.model';
import restoreRemoteFormSchema from '@model/configuracion/restore-remote-form.schema';
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
export default class NativeRestoreComponent implements OnDestroy {
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

  readonly remoteRestoreModel: WritableSignal<RestoreRemoteFormModel> =
    signal<RestoreRemoteFormModel>({
      keyId: '',
      secret: '',
    });
  readonly remoteRestoreForm: FieldTree<RestoreRemoteFormModel> = form(
    this.remoteRestoreModel,
    restoreRemoteFormSchema,
  );
  readonly remoteAccess: WritableSignal<BackupRemoteRestoreAccess | null> =
    signal<BackupRemoteRestoreAccess | null>(null);
  readonly remoteConnecting: WritableSignal<boolean> = signal<boolean>(false);
  readonly remoteValidationRequested: WritableSignal<boolean> = signal<boolean>(false);
  readonly remoteSecretVisible: WritableSignal<boolean> = signal<boolean>(false);
  readonly remoteError: WritableSignal<string | null> = signal<string | null>(null);
  readonly remoteSelectingPublicId: WritableSignal<string | null> = signal<string | null>(null);
  readonly selectedPackageFromRemote: WritableSignal<boolean> = signal<boolean>(false);
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
    if (
      this.selecting() ||
      this.unlocking() ||
      this.finalizing() ||
      this.remoteSelectingPublicId() !== null
    ) {
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

      this.selectedPackageFromRemote.set(false);
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
   * Descarga una copia de TPV Backup y la registra
   * en el mismo pipeline utilizado por un archivo local.
   */
  async selectRemotePackage(backup: BackupRemoteBackup): Promise<void> {
    if (
      this.remoteSelectingPublicId() !== null ||
      this.selecting() ||
      this.remoteConnecting() ||
      this.unlocking() ||
      this.finalizing()
    ) {
      return;
    }

    this.remoteSelectingPublicId.set(backup.publicId);

    this.remoteError.set(null);
    this.selectionError.set(null);
    this.unlockError.set(null);
    this.finalizeError.set(null);

    try {
      const result: BackupRestorePackageSelectionResult =
        await this.backupService.selectRemoteRestorePackage(backup.publicId);

      if (result.status !== 'selected' || result.mode !== 'native-restore') {
        throw new Error('TPV Backup no ha devuelto una copia nativa válida.');
      }

      this.clearSensitiveKey();

      this.selectedPackageFromRemote.set(true);
      this.selectedPackage.set(result);
      this.unlockResult.set(null);
      this.installedResult.set(null);
      this.keyValidationRequested.set(false);
    } catch (error: unknown) {
      this.selectedPackageFromRemote.set(false);

      this.remoteError.set(
        getErrorMessage(error, 'No se ha podido preparar la copia remota para restaurarla.'),
      );
    } finally {
      this.remoteSelectingPublicId.set(null);
    }
  }

  /**
   * Elimina la selección mostrada actualmente
   * antes de que exista un staging preparado.
   */
  async clearSelection(): Promise<void> {
    if (this.unlockResult() !== null || this.unlocking() || this.finalizing()) {
      return;
    }

    const fromRemote: boolean = this.selectedPackageFromRemote();

    this.clearLocalSelection();

    if (!fromRemote) {
      return;
    }

    try {
      await this.backupService.clearRemoteRestorePackage();
    } catch (error: unknown) {
      console.error('No se ha podido limpiar la copia remota temporal:', error);

      this.selectionError.set(
        getErrorMessage(error, 'No se ha podido limpiar completamente la selección remota.'),
      );
    }
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
   * Elimina cualquier sesión remota temporal
   * cuando se abandona el flujo de restauración.
   */
  ngOnDestroy(): void {
    void this.backupService.disconnectRemoteRestore().catch((error: unknown): void => {
      console.error('No se ha podido cerrar la sesión temporal de TPV Backup:', error);
    });
  }

  /**
   * Alterna la visibilidad del Secret remoto.
   */
  toggleRemoteSecretVisibility(): void {
    this.remoteSecretVisible.update((visible: boolean): boolean => !visible);
  }

  /**
   * Autentica temporalmente contra TPV Backup
   * y recupera las copias disponibles.
   */
  async connectRemoteRestore(): Promise<void> {
    if (
      this.remoteConnecting() ||
      this.selecting() ||
      this.unlocking() ||
      this.finalizing() ||
      this.remoteSelectingPublicId() !== null
    ) {
      return;
    }

    this.remoteValidationRequested.set(true);
    this.remoteError.set(null);

    if (this.remoteRestoreForm.keyId().invalid() || this.remoteRestoreForm.secret().invalid()) {
      return;
    }

    const credentials: BackupRemoteCredentials = {
      keyId: this.remoteRestoreForm.keyId().value(),

      /*
       * El Secret se transmite exactamente
       * como lo ha introducido el usuario.
       */
      secret: this.remoteRestoreForm.secret().value(),
    };

    this.remoteConnecting.set(true);

    try {
      const access: BackupRemoteRestoreAccess =
        await this.backupService.connectRemoteRestore(credentials);

      this.remoteAccess.set(access);

      /*
       * Una vez copiadas al Main process,
       * eliminamos las credenciales del Renderer.
       */
      this.clearRemoteCredentials();

      this.remoteValidationRequested.set(false);
    } catch (error: unknown) {
      this.remoteAccess.set(null);

      this.remoteError.set(getErrorMessage(error, 'No se ha podido conectar con TPV Backup.'));
    } finally {
      this.remoteConnecting.set(false);
    }
  }

  /**
   * Cierra la sesión temporal de restore remoto.
   */
  async disconnectRemoteRestore(): Promise<void> {
    if (this.remoteConnecting() || this.remoteSelectingPublicId() !== null) {
      return;
    }

    try {
      await this.backupService.disconnectRemoteRestore();
    } catch (error: unknown) {
      console.error('Error cerrando la sesión temporal de TPV Backup:', error);
    }

    this.remoteAccess.set(null);
    this.remoteError.set(null);
    this.remoteValidationRequested.set(false);

    this.clearRemoteCredentials();
  }

  /**
   * Formatea el tamaño de una copia remota.
   */
  formatSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }

    const sizeKb: number = sizeBytes / 1024;

    if (sizeKb < 1024) {
      return `${sizeKb.toFixed(1)} KB`;
    }

    const sizeMb: number = sizeKb / 1024;

    if (sizeMb < 1024) {
      return `${sizeMb.toFixed(1)} MB`;
    }

    return `${(sizeMb / 1024).toFixed(2)} GB`;
  }

  /**
   * Formatea la fecha UTC recibida
   * desde TPV Backup.
   */
  formatRemoteDate(value: string): string {
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
      return this.formatDate(`${value.replace(' ', 'T')}Z`);
    }

    return this.formatDate(value);
  }

  /**
   * Elimina Key ID y Secret del estado
   * mantenido por el Renderer.
   */
  private clearRemoteCredentials(): void {
    this.remoteRestoreForm.keyId().value.set('');
    this.remoteRestoreForm.secret().value.set('');

    this.remoteSecretVisible.set(false);
  }

  /**
   * Limpia únicamente el estado local
   * asociado a la selección mostrada.
   */
  private clearLocalSelection(): void {
    this.selectedPackage.set(null);
    this.selectedPackageFromRemote.set(false);
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
