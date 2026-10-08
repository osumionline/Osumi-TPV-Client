import { TestBed } from '@angular/core/testing';
import type { RendererLogCommand } from '@desktop-contracts/logging/renderer-log-command';
import ApplicationLoggingService from '@services/application/application-logging.service';
import { vi } from 'vitest';

describe('ApplicationLoggingService', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;

  let commands: RendererLogCommand[];
  let writeError: Error | null;

  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    commands = [];
    writeError = null;

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        logging: {
          write: (command: RendererLogCommand): Promise<void> => {
            commands.push(command);

            if (writeError !== null) {
              return Promise.reject(writeError);
            }

            return Promise.resolve();
          },
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [ApplicationLoggingService],
    });
  });

  afterEach((): void => {
    vi.restoreAllMocks();

    TestBed.resetTestingModule();

    if (originalDesktopDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);

      return;
    }

    Reflect.deleteProperty(window, 'osumiDesktop');
  });

  it('envía una entrada completa al bridge de Main', (): void => {
    const service: ApplicationLoggingService = TestBed.inject(ApplicationLoggingService);

    service.error({
      area: 'ventas',
      operation: 'print-ticket',
      message: 'No se ha podido imprimir el ticket.',
      context: {
        ventaId: 1234,
        automatico: false,
      },
      error: new TypeError('La impresora no está disponible.'),
    });

    expect(commands).toHaveLength(1);

    expect(commands[0]).toMatchObject({
      level: 'error',
      area: 'ventas',
      operation: 'print-ticket',
      message: 'No se ha podido imprimir el ticket.',
      context: {
        ventaId: 1234,
        automatico: false,
      },
      error: {
        name: 'TypeError',
        message: 'La impresora no está disponible.',
      },
    });
  });

  it('normaliza una cadena estándar de causas', (): void => {
    const service: ApplicationLoggingService = TestBed.inject(ApplicationLoggingService);

    service.error({
      area: 'application',
      operation: 'cause-test',
      message: 'Ha fallado una operación.',
      error: new Error('Error exterior.', {
        cause: new Error('Error interior.'),
      }),
    });

    expect(commands[0]?.error?.message).toBe('Error exterior.');
    expect(commands[0]?.error?.cause?.message).toBe('Error interior.');
  });

  it('normaliza AggregateError sin transportar propiedades arbitrarias', (): void => {
    const service: ApplicationLoggingService = TestBed.inject(ApplicationLoggingService);

    const firstError: Error & {
      secret?: string;
    } = new Error('Primer fallo.');

    firstError.secret = 'secreto-que-no-debe-transportarse';

    service.error({
      area: 'application',
      operation: 'aggregate-test',
      message: 'Han fallado varias operaciones.',
      error: new AggregateError([firstError, new TypeError('Segundo fallo.')], 'Fallos agregados.'),
    });

    const serialized: string = JSON.stringify(commands[0]);

    expect(commands[0]?.error?.errors).toHaveLength(2);
    expect(serialized).not.toContain('secreto-que-no-debe-transportarse');
  });

  it('no transporta objetos desconocidos lanzados como error', (): void => {
    const service: ApplicationLoggingService = TestBed.inject(ApplicationLoggingService);

    service.error({
      area: 'application',
      operation: 'unknown-error',
      message: 'Se ha producido un error desconocido.',
      error: {
        token: 'token-secreto',
        password: 'password-secreto',
      },
    });

    const serialized: string = JSON.stringify(commands[0]);

    expect(commands[0]?.error?.name).toBe('UnknownError');
    expect(serialized).not.toContain('token-secreto');
    expect(serialized).not.toContain('password-secreto');
  });

  it('limita el contexto antes de atravesar IPC', (): void => {
    const service: ApplicationLoggingService = TestBed.inject(ApplicationLoggingService);

    const context: Record<string, string> = {};

    for (let index: number = 0; index < 50; index++) {
      context[`field${index}`] = `value-${index}`;
    }

    service.info({
      area: 'application',
      operation: 'large-context',
      message: 'Contexto grande.',
      context,
    });

    expect(Object.keys(commands[0]?.context ?? {})).toHaveLength(32);
  });

  it('no propaga un fallo asíncrono del bridge de logging', async (): Promise<void> => {
    writeError = new Error('IPC no disponible.');

    const consoleError = vi.spyOn(console, 'error').mockImplementation((): void => undefined);

    const service: ApplicationLoggingService = TestBed.inject(ApplicationLoggingService);

    expect((): void => {
      service.error({
        area: 'application',
        operation: 'ipc-failure',
        message: 'Entrada de prueba.',
      });
    }).not.toThrow();

    await Promise.resolve();

    expect(consoleError).toHaveBeenCalledOnce();
  });

  it('no propaga un fallo síncrono del bridge de logging', (): void => {
    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        logging: {
          write: (): Promise<void> => {
            throw new Error('Bridge no disponible.');
          },
        },
      },
    });

    const consoleError = vi.spyOn(console, 'error').mockImplementation((): void => undefined);

    const service: ApplicationLoggingService = TestBed.inject(ApplicationLoggingService);

    expect((): void => {
      service.error({
        area: 'application',
        operation: 'bridge-failure',
        message: 'Entrada de prueba.',
      });
    }).not.toThrow();

    expect(consoleError).toHaveBeenCalledOnce();
  });
});
