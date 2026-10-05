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
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type {
  BackupRemoteBackup,
  BackupRemoteConnection,
} from '@desktop-contracts/backup/backup-remote.interface';
import { DialogService } from '@osumi/angular-tools';
import DesktopBackupService from '@services/application/desktop-backup.service';
import { getErrorMessage } from '@utils/error.utils';

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
  readonly remoteKeyId: WritableSignal<string> = signal<string>('');
  readonly remoteSecret: WritableSignal<string> = signal<string>('');

  readonly canConfigureRemote: Signal<boolean> = computed(
    (): boolean =>
      !this.remoteSaving() && this.remoteKeyId().trim() !== '' && this.remoteSecret() !== '',
  );

  /**
   * Carga el estado remoto al abrir la pantalla.
   */
  ngOnInit(): void {
    void this.loadRemoteState();
  }

  /**
   * Crea una copia local completa de Osumi TPV.
   */
  async createBackup(): Promise<void> {
    if (this.creating()) {
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
   * Carga la conexión y las copias remotas
   * disponibles en TPV Backup.
   */
  async loadRemoteState(): Promise<void> {
    if (this.remoteLoading()) {
      return;
    }

    this.remoteLoading.set(true);
    this.remoteError.set(null);

    try {
      const connection: BackupRemoteConnection | null =
        await this.backupService.getRemoteConnection();

      this.remoteConnection.set(connection);

      if (connection === null) {
        this.remoteBackups.set([]);

        return;
      }

      await this.loadRemoteBackups();
    } catch (error: unknown) {
      console.error('Error cargando TPV Backup:', error);

      this.remoteError.set(getErrorMessage(error, 'No se ha podido conectar con TPV Backup.'));
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

    await this.reloadRemoteBackups();
  }

  /**
   * Elimina las credenciales locales de TPV Backup
   * sin modificar ninguna copia almacenada en el servidor.
   */
  async removeRemoteConfiguration(): Promise<void> {
    if (this.remoteRemoving()) {
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
   * Actualiza manualmente el estado y listado
   * remotos de TPV Backup.
   */
  async refreshRemote(): Promise<void> {
    await this.loadRemoteState();
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
  private async reloadRemoteBackups(): Promise<void> {
    try {
      await this.loadRemoteBackups();
    } catch (error: unknown) {
      console.error('Error cargando las copias remotas:', error);

      this.remoteError.set(
        getErrorMessage(
          error,
          'La conexión se ha configurado, pero no se han podido cargar las copias remotas.',
        ),
      );
    }
  }
}
