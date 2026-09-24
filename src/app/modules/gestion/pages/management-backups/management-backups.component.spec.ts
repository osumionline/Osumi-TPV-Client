import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import ManagementBackupsComponent from '@modules/gestion/pages/management-backups/management-backups.component';
import { DialogService } from '@osumi/angular-tools';
import DesktopBackupService from '@services/application/desktop-backup.service';

class TestDesktopBackupService {
  readonly createCalls = signal<number>(0);

  /**
   * Simula la creación correcta de una copia.
   */
  async createLocal(): Promise<BackupCreateResult> {
    this.createCalls.update((value: number): number => value + 1);

    return {
      backupId: '123e4567-e89b-42d3-a456-426614174000',
      createdAt: '2026-09-24T08:00:00.000Z',
      fileName: 'osumi-tpv-backup-test.otpv',
      sizeBytes: 1_048_576,
    };
  }
}

class TestDialogService {
  readonly alerts: unknown[] = [];

  /**
   * Registra las alertas solicitadas por el componente.
   */
  alert(options: unknown): { subscribe(): void } {
    this.alerts.push(options);

    return {
      subscribe: (): void => undefined,
    };
  }
}

describe('ManagementBackupsComponent', (): void => {
  let fixture: ComponentFixture<ManagementBackupsComponent>;
  let component: ManagementBackupsComponent;
  let backupService: TestDesktopBackupService;
  let dialogService: TestDialogService;

  beforeEach(async (): Promise<void> => {
    backupService = new TestDesktopBackupService();
    dialogService = new TestDialogService();

    await TestBed.configureTestingModule({
      imports: [ManagementBackupsComponent],
      providers: [
        provideRouter([]),
        {
          provide: DesktopBackupService,
          useValue: backupService,
        },
        {
          provide: DialogService,
          useValue: dialogService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagementBackupsComponent);
    component = fixture.componentInstance;
  });

  it('crea una copia local y conserva su resultado', async (): Promise<void> => {
    await component.createBackup();

    expect(backupService.createCalls()).toBe(1);
    expect(component.lastBackup()).toEqual({
      backupId: '123e4567-e89b-42d3-a456-426614174000',
      createdAt: '2026-09-24T08:00:00.000Z',
      fileName: 'osumi-tpv-backup-test.otpv',
      sizeBytes: 1_048_576,
    });
    expect(component.creating()).toBe(false);
    expect(dialogService.alerts).toHaveLength(1);
  });

  it('evita lanzar dos copias simultáneamente', async (): Promise<void> => {
    component.creating.set(true);

    await component.createBackup();

    expect(backupService.createCalls()).toBe(0);
  });

  it('formatea tamaños de backup', (): void => {
    expect(component.formatSize(512)).toBe('512 B');
    expect(component.formatSize(1536)).toBe('1.5 KB');
    expect(component.formatSize(1_048_576)).toBe('1.0 MB');
  });
});
