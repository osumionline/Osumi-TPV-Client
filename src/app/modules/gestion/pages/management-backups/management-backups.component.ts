import { Component, inject, signal, type WritableSignal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import { DialogService } from '@osumi/angular-tools';
import DesktopBackupService from '@services/application/desktop-backup.service';
import { getErrorMessage } from '@utils/error.utils';

@Component({
  selector: 'otpv-management-backups',
  templateUrl: './management-backups.component.html',
  styleUrl: './management-backups.component.scss',
  imports: [MatButton, MatIcon, RouterLink],
})
export default class ManagementBackupsComponent {
  private readonly backupService: DesktopBackupService = inject(DesktopBackupService);
  private readonly dialog: DialogService = inject(DialogService);

  readonly creating: WritableSignal<boolean> = signal<boolean>(false);
  readonly lastBackup: WritableSignal<BackupCreateResult | null> =
    signal<BackupCreateResult | null>(null);

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
   * Formatea la fecha UTC del backup
   * utilizando la configuración local del equipo.
   */
  formatDate(createdAt: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(createdAt));
  }
}
