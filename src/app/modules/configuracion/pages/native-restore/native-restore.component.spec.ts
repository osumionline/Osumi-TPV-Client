import { ComponentFixture, TestBed } from '@angular/core/testing';
import type BackupRestoreFinalizeResult from '@desktop-contracts/backup/backup-restore-finalize-result.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import type BackupRestoreUnlockCommand from '@desktop-contracts/backup/backup-restore-unlock-command.interface';
import type BackupRestoreUnlockResult from '@desktop-contracts/backup/backup-restore-unlock-result.interface';
import NativeRestoreComponent from '@modules/configuracion/pages/native-restore/native-restore.component';
import DesktopBackupService from '@services/application/desktop-backup.service';
import { beforeEach, describe, expect, it } from 'vitest';

const SELECTION_ID: string = 'selection-test';

const BACKUP_ID: string = '11111111-1111-4111-8111-111111111111';

describe('NativeRestoreComponent', (): void => {
  let fixture: ComponentFixture<NativeRestoreComponent>;

  let component: NativeRestoreComponent;

  let backupService: TestDesktopBackupService;

  beforeEach(async (): Promise<void> => {
    backupService = new TestDesktopBackupService();

    await TestBed.configureTestingModule({
      imports: [NativeRestoreComponent],
      providers: [
        {
          provide: DesktopBackupService,
          useValue: backupService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NativeRestoreComponent);

    component = fixture.componentInstance;
  });

  it('conserva una selección v3 válida', async (): Promise<void> => {
    backupService.selectionResult = createNativeSelection();

    await component.selectPackage();

    expect(component.selectedPackage()).toMatchObject({
      selectionId: SELECTION_ID,
      backupId: BACKUP_ID,
    });

    expect(component.selectionError()).toBeNull();
  });

  it('identifica una exportación v2 como flujo legacy', async (): Promise<void> => {
    backupService.selectionResult = {
      status: 'selected',
      mode: 'legacy-import',
      selectionId: 'legacy-selection',
      formatVersion: 2,
      fileName: 'legacy.otpv',
      applicationVersion: '9.9.0',
      schemaVersion: 'legacy-2026-07',
      createdAt: '2026-09-24T10:00:00.000Z',
    };

    await component.selectPackage();

    expect(component.selectedPackage()).toBeNull();

    expect(component.selectionError()).toContain('Importar Osumi TPV anterior');
  });

  it('envía la TPV Backup key exactamente como se ha introducido', async (): Promise<void> => {
    backupService.selectionResult = createNativeSelection();

    await component.selectPackage();

    const backupApiKey: string = '  clave exacta con espacios  ';

    component.restoreForm.backupApiKey().value.set(backupApiKey);

    await component.unlockRestore();

    expect(backupService.unlockCommand).toEqual({
      selectionId: SELECTION_ID,
      backupApiKey,
    });

    expect(component.unlockResult()).toEqual({
      status: 'unlocked',
      selectionId: SELECTION_ID,
      backupId: BACKUP_ID,
    });

    /*
     * Tras preparar correctamente el staging,
     * la clave desaparece del renderer.
     */
    expect(component.restoreForm.backupApiKey().value()).toBe('');
  });

  it('finaliza únicamente una restauración previamente desbloqueada', async (): Promise<void> => {
    backupService.selectionResult = createNativeSelection();

    await component.selectPackage();

    await component.finalizeRestore();

    expect(backupService.finalizeSelectionId).toBeNull();

    component.restoreForm.backupApiKey().value.set('backup-key');

    await component.unlockRestore();

    await component.finalizeRestore();

    expect(backupService.finalizeSelectionId).toBe(SELECTION_ID);

    expect(component.installedResult()).toEqual({
      status: 'installed',
      selectionId: SELECTION_ID,
      backupId: BACKUP_ID,
    });
  });
});

/**
 * Construye una selección nativa v3.
 */
function createNativeSelection(): BackupRestorePackageSelectionResult {
  return {
    status: 'selected',
    mode: 'native-restore',
    selectionId: SELECTION_ID,
    formatVersion: 3,
    fileName: 'backup.otpv',
    backupId: BACKUP_ID,
    applicationVersion: '1.0.0',
    databaseSchemaVersion: 1,
    createdAt: '2026-09-24T10:00:00.000Z',
  };
}

/**
 * Backend controlado utilizado por
 * los tests del flujo de restauración.
 */
class TestDesktopBackupService {
  selectionResult: BackupRestorePackageSelectionResult = {
    status: 'cancelled',
  };

  unlockCommand: BackupRestoreUnlockCommand | null = null;

  finalizeSelectionId: string | null = null;

  /**
   * Devuelve la selección configurada.
   */
  selectRestorePackage(): Promise<BackupRestorePackageSelectionResult> {
    return Promise.resolve(this.selectionResult);
  }

  /**
   * Registra el comando de desbloqueo.
   */
  unlockRestorePackage(command: BackupRestoreUnlockCommand): Promise<BackupRestoreUnlockResult> {
    this.unlockCommand = command;

    return Promise.resolve({
      status: 'unlocked',
      selectionId: command.selectionId,
      backupId: BACKUP_ID,
    });
  }

  /**
   * Registra la selección promovida.
   */
  finalizeRestorePackage(selectionId: string): Promise<BackupRestoreFinalizeResult> {
    this.finalizeSelectionId = selectionId;

    return Promise.resolve({
      status: 'installed',
      selectionId,
      backupId: BACKUP_ID,
    });
  }
}
