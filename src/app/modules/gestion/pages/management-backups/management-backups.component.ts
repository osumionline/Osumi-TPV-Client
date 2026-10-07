import {
  Component,
  computed,
  inject,
  signal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import type BackupAutomaticInfo from '@desktop-contracts/backup/backup-automatic-info.interface';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type {
  BackupRemoteBackup,
  BackupRemoteConnection,
  BackupRemoteDownloadResult,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';
import { DialogService } from '@osumi/angular-tools';
import DesktopBackupService from '@services/application/desktop-backup.service';
import { getErrorMessage } from '@utils/error.utils';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'otpv-management-backups',
  templateUrl: './management-backups.component.html',
  styleUrl: './management-backups.component.scss',
  imports: [MatButton, MatFormField, MatIcon, MatInput, MatLabel, RouterLink],
})
export default class ManagementBackupsComponent implements OnInit {
  private readonly backupService: DesktopBackupService = inject(DesktopBackupService);
  private readonly dialog: DialogService = inject(DialogService);

  readonly creating: WritableSignal<boolean> = signal<boolean>(false);
  readonly lastBackup: WritableSignal<BackupCreateResult | null> =
    signal<BackupCreateResult | null>(null);
  readonly automaticInfo: WritableSignal<BackupAutomaticInfo | null> =
    signal<BackupAutomaticInfo | null>(null);
  readonly remoteLoading: WritableSignal<boolean> = signal<boolean>(false);
  readonly remoteSaving: WritableSignal<boolean> = signal<boolean>(false);
  readonly remoteRemoving: WritableSignal<boolean> = signal<boolean>(false);
  readonly remoteConnection: WritableSignal<BackupRemoteConnection | null> =
    signal<BackupRemoteConnection | null>(null);
  readonly remoteBackups: WritableSignal<readonly BackupRemoteBackup[]> = signal<
    readonly BackupRemoteBackup[]
  >([]);
  readonly remoteError: WritableSignal<string | null> = signal<string | null>(null);
  readonly editingRemoteConfiguration: WritableSignal<boolean> = signal<boolean>(false);
  readonly remoteCreating: WritableSignal<boolean> = signal<boolean>(false);
  readonly remoteDownloadingPublicId: WritableSignal<string | null> = signal<string | null>(null);
  readonly remoteDeletingPublicId: WritableSignal<string | null> = signal<string | null>(null);
  readonly remoteKeyId: WritableSignal<string> = signal<string>('');
  readonly remoteSecret: WritableSignal<string> = signal<string>('');

  readonly canConfigureRemote: Signal<boolean> = computed(
    (): boolean =>
      !this.remoteSaving() &&
      this.remoteDownloadingPublicId() === null &&
      this.remoteDeletingPublicId() === null &&
      this.remoteKeyId().trim() !== '' &&
      this.remoteSecret() !== '',
  );

  /**
   * Carga el estado local automático y
   * el estado remoto al abrir la pantalla.
   */
  ngOnInit(): void {
    void this.loadAutomaticStatus();
    void this.loadRemoteState();
  }

  /**
   * Crea una copia local completa de Osumi TPV.
   */
  async createBackup(): Promise<void> {
    if (
      this.creating() ||
      this.remoteCreating() ||
      this.remoteDownloadingPublicId() !== null ||
      this.remoteDeletingPublicId() !== null
    ) {
      return;
    }

    this.creating.set(true);

    try {
      const result: BackupCreateResult = await this.backupService.createLocal();

      this.lastBackup.set(result);

      this.dialog.alert({
        title: 'Copia creada',
        content: `La copia de seguridad "${result.fileName}" se ha creado correctamente.`,
      });
    } catch (error: unknown) {
      console.error('Error creando la copia de seguridad:', error);

      this.dialog.alert({
        title: 'Error',
        content: getErrorMessage(error, 'No se ha podido crear la copia de seguridad.'),
      });
    } finally {
      this.creating.set(false);
    }
  }

  /**
   * Crea una copia temporal y la almacena
   * directamente en TPV Backup.
   */
  async createRemoteBackup(): Promise<void> {
    if (
      this.remoteCreating() ||
      this.creating() ||
      this.remoteDownloadingPublicId() !== null ||
      this.remoteDeletingPublicId() !== null
    ) {
      return;
    }

    const connection: BackupRemoteConnection | null = this.remoteConnection();

    if (connection === null || !connection.canUpload) {
      return;
    }

    this.remoteCreating.set(true);
    this.remoteError.set(null);

    try {
      const result: BackupRemoteUploadResult = await this.backupService.createRemote();

      this.dialog.alert({
        title: 'Copia remota creada',
        content:
          `La copia de seguridad "${result.originalFilename}" ` +
          'se ha almacenado correctamente en TPV Backup.',
      });
    } catch (error: unknown) {
      console.error('Error creando la copia remota:', error);

      this.remoteError.set(getErrorMessage(error, 'No se ha podido crear la copia remota.'));

      return;
    } finally {
      this.remoteCreating.set(false);
    }

    await this.reloadRemoteBackups(
      'La copia se ha subido correctamente, pero no se ha podido actualizar el listado.',
    );
  }

  /**
   * Descarga una copia remota y la conserva
   * en el directorio local de backups.
   */
  async downloadRemoteBackup(backup: BackupRemoteBackup): Promise<void> {
    if (
      this.remoteDownloadingPublicId() !== null ||
      this.creating() ||
      this.remoteCreating() ||
      this.remoteLoading() ||
      this.remoteSaving() ||
      this.remoteRemoving() ||
      this.editingRemoteConfiguration() ||
      this.remoteDeletingPublicId() !== null
    ) {
      return;
    }

    this.remoteDownloadingPublicId.set(backup.publicId);

    this.remoteError.set(null);

    try {
      const result: BackupRemoteDownloadResult = await this.backupService.downloadRemote(
        backup.publicId,
      );

      this.dialog.alert({
        title: 'Copia descargada',
        content:
          `La copia "${result.originalFilename}" ` +
          `se ha guardado localmente como "${result.fileName}".`,
      });
    } catch (error: unknown) {
      console.error('Error descargando la copia remota:', error);

      this.remoteError.set(getErrorMessage(error, 'No se ha podido descargar la copia remota.'));
    } finally {
      this.remoteDownloadingPublicId.set(null);
    }
  }

  /**
   * Carga la información local de la
   * programación automática.
   *
   * Un fallo elimina cualquier información anterior
   * para no mostrar un estado obsoleto.
   */
  async loadAutomaticStatus(): Promise<void> {
    try {
      const info: BackupAutomaticInfo | null = await this.backupService.getAutomaticStatus();

      this.automaticInfo.set(info);
    } catch (error: unknown) {
      console.error('Error cargando el estado de las copias automáticas:', error);

      this.automaticInfo.set(null);
    }
  }

  /**
   * Carga el estado remoto y las copias
   * disponibles en TPV Backup.
   *
   * Un fallo de autenticación elimina cualquier
   * estado remoto obsoleto de la pantalla.
   *
   * Un fallo posterior cargando el listado conserva
   * la conexión válida, pero elimina la lista anterior.
   */
  async loadRemoteState(): Promise<void> {
    if (this.remoteLoading()) {
      return;
    }

    this.remoteLoading.set(true);
    this.remoteError.set(null);

    let connection: BackupRemoteConnection | null;

    try {
      connection = await this.backupService.getRemoteConnection();
    } catch (error: unknown) {
      console.error('Error cargando la conexión con TPV Backup:', error);

      this.remoteConnection.set(null);
      this.remoteBackups.set([]);

      this.remoteError.set(getErrorMessage(error, 'No se ha podido conectar con TPV Backup.'));

      this.remoteLoading.set(false);

      return;
    }

    this.remoteConnection.set(connection);

    if (connection === null) {
      this.remoteBackups.set([]);
      this.remoteLoading.set(false);

      return;
    }

    try {
      await this.loadRemoteBackups();
    } catch (error: unknown) {
      console.error('Error cargando las copias remotas:', error);

      /*
       * La autenticación ha sido correcta,
       * pero el listado disponible ya no es fiable.
       */
      this.remoteBackups.set([]);

      this.remoteError.set(
        getErrorMessage(error, 'No se han podido cargar las copias remotas de TPV Backup.'),
      );
    } finally {
      this.remoteLoading.set(false);
    }
  }

  /**
   * Muestra el formulario para cambiar
   * las credenciales de TPV Backup.
   */
  startRemoteConfiguration(): void {
    this.remoteKeyId.set('');
    this.remoteSecret.set('');
    this.remoteError.set(null);
    this.editingRemoteConfiguration.set(true);
  }

  /**
   * Cancela el cambio de credenciales remoto.
   */
  cancelRemoteConfiguration(): void {
    this.remoteKeyId.set('');
    this.remoteSecret.set('');
    this.remoteError.set(null);
    this.editingRemoteConfiguration.set(false);
  }

  /**
   * Valida y guarda unas nuevas credenciales
   * de TPV Backup.
   */
  async configureRemote(): Promise<void> {
    if (!this.canConfigureRemote()) {
      return;
    }

    this.remoteSaving.set(true);
    this.remoteError.set(null);

    try {
      const connection: BackupRemoteConnection = await this.backupService.configureRemote({
        keyId: this.remoteKeyId(),
        secret: this.remoteSecret(),
      });

      this.remoteConnection.set(connection);

      this.remoteKeyId.set('');
      this.remoteSecret.set('');
      this.editingRemoteConfiguration.set(false);
    } catch (error: unknown) {
      console.error('Error configurando TPV Backup:', error);

      this.remoteError.set(
        getErrorMessage(error, 'No se han podido validar las credenciales de TPV Backup.'),
      );

      return;
    } finally {
      this.remoteSaving.set(false);
    }

    await this.reloadRemoteBackups(
      'La conexión se ha configurado, pero no se han podido cargar las copias remotas.',
    );
  }

  /**
   * Elimina las credenciales locales de TPV Backup
   * sin modificar ninguna copia almacenada en el servidor.
   */
  async removeRemoteConfiguration(): Promise<void> {
    if (
      this.remoteRemoving() ||
      this.remoteDownloadingPublicId() !== null ||
      this.remoteDeletingPublicId() !== null
    ) {
      return;
    }

    this.remoteRemoving.set(true);
    this.remoteError.set(null);

    try {
      await this.backupService.removeRemoteConfiguration();

      this.remoteConnection.set(null);
      this.remoteBackups.set([]);
      this.remoteKeyId.set('');
      this.remoteSecret.set('');
      this.editingRemoteConfiguration.set(false);
    } catch (error: unknown) {
      console.error('Error eliminando la configuración de TPV Backup:', error);

      this.remoteError.set(
        getErrorMessage(error, 'No se ha podido eliminar la configuración de TPV Backup.'),
      );
    } finally {
      this.remoteRemoving.set(false);
    }
  }

  /**
   * Actualiza manualmente el estado automático,
   * la conexión y el listado remoto.
   */
  async refreshRemote(): Promise<void> {
    await Promise.all([this.loadAutomaticStatus(), this.loadRemoteState()]);
  }

  /**
   * Solicita confirmación y elimina una copia
   * almacenada en TPV Backup.
   */
  async deleteRemoteBackup(backup: BackupRemoteBackup): Promise<void> {
    if (
      this.remoteDeletingPublicId() !== null ||
      this.remoteDownloadingPublicId() !== null ||
      this.creating() ||
      this.remoteCreating() ||
      this.remoteLoading() ||
      this.remoteSaving() ||
      this.remoteRemoving() ||
      this.editingRemoteConfiguration()
    ) {
      return;
    }

    const confirmed: boolean = await firstValueFrom(
      this.dialog.confirm({
        title: 'Eliminar copia remota',
        content:
          `¿Quieres eliminar definitivamente la copia "${backup.originalFilename}"? ` +
          'Esta acción no se puede deshacer.',
        ok: 'Eliminar',
        cancel: 'Cancelar',
        warn: true,
      }),
    );

    if (!confirmed) {
      return;
    }

    this.remoteDeletingPublicId.set(backup.publicId);

    this.remoteError.set(null);

    try {
      await this.backupService.deleteRemote(backup.publicId);

      this.dialog.alert({
        title: 'Copia eliminada',

        content: `La copia "${backup.originalFilename}" se ha eliminado correctamente de TPV Backup.`,
      });
    } catch (error: unknown) {
      console.error('Error eliminando la copia remota:', error);

      this.remoteError.set(getErrorMessage(error, 'No se ha podido eliminar la copia remota.'));

      return;
    } finally {
      this.remoteDeletingPublicId.set(null);
    }

    await this.reloadRemoteBackups(
      'La copia se ha eliminado, pero no se ha podido actualizar el listado.',
    );
  }

  /**
   * Formatea el tamaño de una copia
   * para mostrarlo al usuario.
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
   * Formatea una fecha ISO utilizando
   * la configuración local del equipo.
   */
  formatDate(createdAt: string): string {
    const date: Date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return createdAt;
    }

    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(date);
  }

  /**
   * Formatea la fecha UTC almacenada por
   * el API remoto de TPV Backup.
   */
  formatRemoteDate(createdAt: string): string {
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(createdAt)) {
      return this.formatDate(`${createdAt.replace(' ', 'T')}Z`);
    }

    return this.formatDate(createdAt);
  }

  /**
   * Recupera el listado remoto sin modificar
   * el estado de carga global de la pantalla.
   */
  private async loadRemoteBackups(): Promise<void> {
    const backups: readonly BackupRemoteBackup[] = await this.backupService.getRemoteBackups();

    this.remoteBackups.set(backups);
  }

  /**
   * Recarga el listado tras una operación local
   * conservando una conexión ya establecida.
   */
  private async reloadRemoteBackups(errorMessage: string): Promise<void> {
    try {
      await this.loadRemoteBackups();
    } catch (error: unknown) {
      console.error('Error cargando las copias remotas:', error);

      this.remoteError.set(getErrorMessage(error, errorMessage));
    }
  }
}
