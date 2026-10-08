import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type BackupAutomaticInfo from '@desktop-contracts/backup/backup-automatic-info.interface';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type {
  BackupRemoteBackup,
  BackupRemoteConnection,
  BackupRemoteCredentials,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';
import ManagementBackupsComponent from '@modules/gestion/pages/management-backups/management-backups.component';
import { DialogService } from '@osumi/angular-tools';
import ApplicationLoggingService from '@services/application/application-logging.service';
import DesktopBackupService from '@services/application/desktop-backup.service';

interface TestLogEvent {
  readonly area: string;
  readonly operation: string;
  readonly message: string;
  readonly error?: unknown;
  readonly context?: Readonly<Record<string, string | number | boolean | null>>;
}

class TestDesktopBackupService {
  readonly createCalls = signal<number>(0);
  readonly configureCalls: BackupRemoteCredentials[] = [];
  remoteCreateCalls = 0;

  remoteConnection: BackupRemoteConnection | null = createRemoteConnection();
  remoteBackups: readonly BackupRemoteBackup[] = [createRemoteBackup()];
  removeCalls = 0;

  remoteConnectionError: Error | null = null;
  remoteBackupsError: Error | null = null;

  automaticInfo: BackupAutomaticInfo | null = createAutomaticInfo();
  automaticStatusCalls: number = 0;

  localCreateError: Error | null = null;
  automaticStatusError: Error | null = null;

  /**
   * Simula la creación correcta de una copia.
   */
  async createLocal(): Promise<BackupCreateResult> {
    this.createCalls.update((value: number): number => value + 1);

    if (this.localCreateError !== null) {
      throw this.localCreateError;
    }

    return {
      backupId: '123e4567-e89b-42d3-a456-426614174000',
      createdAt: '2026-09-24T08:00:00.000Z',
      fileName: 'osumi-tpv-backup-test.otpv',
      sizeBytes: 1_048_576,
    };
  }

  /**
   * Devuelve el estado automático simulado.
   */
  async getAutomaticStatus(): Promise<BackupAutomaticInfo | null> {
    this.automaticStatusCalls++;

    if (this.automaticStatusError !== null) {
      throw this.automaticStatusError;
    }

    return this.automaticInfo;
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
    if (this.remoteConnectionError !== null) {
      throw this.remoteConnectionError;
    }

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
    if (this.remoteBackupsError !== null) {
      throw this.remoteBackupsError;
    }

    return this.remoteBackups;
  }

  /**
   * Simula la creación de una copia remota.
   */
  async createRemote(): Promise<BackupRemoteUploadResult> {
    this.remoteCreateCalls++;

    return {
      publicId: 'new-backup-public-id',
      backupId: '123e4567-e89b-42d3-a456-426614174001',
      createdAtClient: '2026-10-05 20:30:00',
      originalFilename: 'remote-backup.otpv',
      sizeBytes: 2_097_152,
      sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  }
}

class TestApplicationLoggingService {
  readonly warnEvents: TestLogEvent[] = [];
  readonly errorEvents: TestLogEvent[] = [];

  /**
   * Conserva los avisos solicitados por el componente.
   */
  warn(event: TestLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Conserva los errores solicitados por el componente.
   */
  error(event: TestLogEvent): void {
    this.errorEvents.push(event);
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
  let loggingService: TestApplicationLoggingService;

  beforeEach(async (): Promise<void> => {
    backupService = new TestDesktopBackupService();
    dialogService = new TestDialogService();
    loggingService = new TestApplicationLoggingService();

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
        {
          provide: ApplicationLoggingService,
          useValue: loggingService,
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

  it('registra el fallo al crear una copia local', async (): Promise<void> => {
    const error: Error = new Error('No se puede crear el backup.');

    backupService.localCreateError = error;

    await component.createBackup();

    expect(component.creating()).toBe(false);
    expect(component.lastBackup()).toBeNull();
    expect(dialogService.alerts).toHaveLength(1);

    expect(loggingService.errorEvents).toEqual([
      {
        area: 'backup',
        operation: 'create-local',
        message: 'No se ha podido crear una copia de seguridad local desde Gestión.',
        error,
      },
    ]);
  });

  it('registra un aviso si no puede cargar el estado de las copias automáticas', async (): Promise<void> => {
    const error: Error = new Error('No se puede cargar el estado automático.');

    component.automaticInfo.set(createAutomaticInfo());
    backupService.automaticStatusError = error;

    await component.loadAutomaticStatus();

    expect(component.automaticInfo()).toBeNull();

    expect(loggingService.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'load-automatic-status',
        message: 'No se ha podido cargar el estado de las copias automáticas.',
        error,
      },
    ]);
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

  it('carga el estado de las copias automáticas', async (): Promise<void> => {
    await component.loadAutomaticStatus();

    expect(backupService.automaticStatusCalls).toBe(1);
    expect(component.automaticInfo()).toEqual(createAutomaticInfo());
  });

  it('actualiza también el estado automático al refrescar TPV Backup', async (): Promise<void> => {
    await component.refreshRemote();

    expect(backupService.automaticStatusCalls).toBe(1);
    expect(component.automaticInfo()).toEqual(createAutomaticInfo());
  });

  it('muestra la programación automática cuando existe conexión remota', async (): Promise<void> => {
    fixture.detectChanges();

    await fixture.whenStable();

    fixture.detectChanges();

    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Copias automáticas');
    expect(content).toContain('Todos los días a las 03:00');
    expect(content).toContain('Última copia automática');
    expect(content).toContain('Al día');
  });

  it('indica cuando todavía no existe ninguna copia automática', async (): Promise<void> => {
    backupService.automaticInfo = {
      ...createAutomaticInfo(),
      lastSuccessfulAt: null,
      pending: true,
    };

    fixture.detectChanges();

    await fixture.whenStable();

    fixture.detectChanges();

    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Todavía no se ha realizado ninguna');

    expect(content).toContain('Pendiente');
  });

  it('elimina el estado remoto obsoleto si falla la conexión', async (): Promise<void> => {
    component.remoteConnection.set(createRemoteConnection());
    component.remoteBackups.set([createRemoteBackup()]);

    const error: Error = new Error('Las credenciales ya no son válidas.');

    backupService.remoteConnectionError = error;

    await component.loadRemoteState();

    expect(component.remoteConnection()).toBeNull();
    expect(component.remoteBackups()).toEqual([]);
    expect(component.remoteError()).toBe('Las credenciales ya no son válidas.');
    expect(component.remoteLoading()).toBe(false);
    expect(loggingService.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'load-remote-connection',
        message: 'No se ha podido cargar la conexión con TPV Backup.',
        error,
      },
    ]);
  });

  it('conserva la conexión pero elimina el listado obsoleto si falla la carga de copias', async (): Promise<void> => {
    component.remoteConnection.set(createRemoteConnection());
    component.remoteBackups.set([createRemoteBackup()]);

    const error: Error = new Error('No se puede cargar el listado.');

    backupService.remoteBackupsError = error;

    await component.loadRemoteState();

    expect(component.remoteConnection()).toEqual(createRemoteConnection());
    expect(component.remoteBackups()).toEqual([]);
    expect(component.remoteError()).toBe('No se puede cargar el listado.');
    expect(component.remoteLoading()).toBe(false);
    expect(loggingService.warnEvents).toEqual([
      {
        area: 'backup',
        operation: 'load-remote-backups',
        message: 'No se ha podido cargar el listado de copias remotas.',
        error,
      },
    ]);
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

  it('crea una copia remota y actualiza el listado', async (): Promise<void> => {
    component.remoteConnection.set(createRemoteConnection());

    await component.createRemoteBackup();

    expect(backupService.remoteCreateCalls).toBe(1);
    expect(component.remoteCreating()).toBe(false);
    expect(component.remoteBackups()).toEqual([createRemoteBackup()]);
    expect(dialogService.alerts).toHaveLength(1);
  });

  it('no crea una copia remota cuando la suscripción no permite subir', async (): Promise<void> => {
    component.remoteConnection.set({
      ...createRemoteConnection(),
      subscription: {
        ...createRemoteConnection().subscription,
        status: 'expired',
      },
      canUpload: false,
    });

    await component.createRemoteBackup();

    expect(backupService.remoteCreateCalls).toBe(0);
  });
});

/**
 * Construye el estado de copias automáticas
 * utilizado por los tests.
 */
function createAutomaticInfo(): BackupAutomaticInfo {
  return {
    automaticTime: '03:00',
    lastSuccessfulAt: '2026-10-07T01:05:00.000Z',
    latestScheduledAt: '2026-10-07T01:00:00.000Z',
    nextScheduledAt: '2026-10-08T01:00:00.000Z',
    pending: false,
  };
}

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
