import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type {
  BackupRemoteBackup,
  BackupRemoteConnection,
  BackupRemoteCredentials,
} from '@desktop-contracts/backup/backup-remote.interface';
import ManagementBackupsComponent from '@modules/gestion/pages/management-backups/management-backups.component';
import { DialogService } from '@osumi/angular-tools';
import DesktopBackupService from '@services/application/desktop-backup.service';

class TestDesktopBackupService {
  readonly createCalls = signal<number>(0);
  readonly configureCalls: BackupRemoteCredentials[] = [];

  remoteConnection: BackupRemoteConnection | null = createRemoteConnection();
  remoteBackups: readonly BackupRemoteBackup[] = [createRemoteBackup()];
  removeCalls = 0;

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

  /**
   * Simula la configuración de credenciales remotas.
   */
  async configureRemote(credentials: BackupRemoteCredentials): Promise<BackupRemoteConnection> {
    this.configureCalls.push({
      ...credentials,
    });

    const connection: BackupRemoteConnection = createRemoteConnection();

    this.remoteConnection = connection;

    return connection;
  }

  /**
   * Devuelve la conexión remota configurada.
   */
  async getRemoteConnection(): Promise<BackupRemoteConnection | null> {
    return this.remoteConnection;
  }

  /**
   * Elimina la configuración remota simulada.
   */
  async removeRemoteConfiguration(): Promise<void> {
    this.removeCalls++;
    this.remoteConnection = null;
    this.remoteBackups = [];
  }

  /**
   * Devuelve las copias remotas simuladas.
   */
  async getRemoteBackups(): Promise<readonly BackupRemoteBackup[]> {
    return this.remoteBackups;
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

  it('carga la conexión y las copias remotas', async (): Promise<void> => {
    await component.loadRemoteState();

    expect(component.remoteConnection()).toEqual(createRemoteConnection());
    expect(component.remoteBackups()).toEqual([createRemoteBackup()]);
    expect(component.remoteLoading()).toBe(false);
    expect(component.remoteError()).toBeNull();
  });

  it('muestra una instalación sin configuración remota', async (): Promise<void> => {
    backupService.remoteConnection = null;
    backupService.remoteBackups = [];

    await component.loadRemoteState();

    expect(component.remoteConnection()).toBeNull();
    expect(component.remoteBackups()).toEqual([]);
  });

  it('configura credenciales sin modificar el secret', async (): Promise<void> => {
    backupService.remoteConnection = null;

    component.remoteKeyId.set('  remote-key-id  ');
    component.remoteSecret.set(' remote-secret ');

    await component.configureRemote();

    expect(backupService.configureCalls).toEqual([
      {
        keyId: '  remote-key-id  ',
        secret: ' remote-secret ',
      },
    ]);

    expect(component.remoteConnection()).toEqual(createRemoteConnection());
    expect(component.remoteBackups()).toEqual([createRemoteBackup()]);
    expect(component.remoteKeyId()).toBe('');
    expect(component.remoteSecret()).toBe('');
    expect(component.editingRemoteConfiguration()).toBe(false);
  });

  it('elimina la configuración local sin conservar estado remoto', async (): Promise<void> => {
    component.remoteConnection.set(createRemoteConnection());
    component.remoteBackups.set([createRemoteBackup()]);

    await component.removeRemoteConfiguration();

    expect(backupService.removeCalls).toBe(1);
    expect(component.remoteConnection()).toBeNull();
    expect(component.remoteBackups()).toEqual([]);
  });

  it('formatea tamaños de backup', (): void => {
    expect(component.formatSize(512)).toBe('512 B');
    expect(component.formatSize(1536)).toBe('1.5 KB');
    expect(component.formatSize(1_048_576)).toBe('1.0 MB');
  });
});

/**
 * Construye una conexión remota de prueba.
 */
function createRemoteConnection(): BackupRemoteConnection {
  return {
    expiresAt: 1_800_003_600,
    installation: {
      publicId: 'installation-public-id',
      name: 'Tienda',
    },
    subscription: {
      publicId: 'subscription-public-id',
      name: 'Indomables',
      status: 'active',
    },
    canUpload: true,
  };
}

/**
 * Construye una copia remota de prueba.
 */
function createRemoteBackup(): BackupRemoteBackup {
  return {
    publicId: 'backup-public-id',
    backupId: '123e4567-e89b-42d3-a456-426614174000',
    createdAtClient: '2026-10-05 07:18:39',
    formatVersion: 3,
    applicationVersion: '0.0.0',
    databaseSchemaVersion: 1,
    originalFilename: 'backup.otpv',
    sizeBytes: 18_985_903,
    sha256: '6bbab7ae745310e03a8a6b07d6fb7e01e94e4017c9f7355bf695eb5aab3a71b8',
    createdAt: '2026-10-05 09:20:58',
  };
}
