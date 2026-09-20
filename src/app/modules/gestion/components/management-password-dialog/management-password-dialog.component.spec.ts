import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type AutenticarEmpleadoResult from '@desktop-contracts/configuration/empleados/autenticar-empleado-result.type';
import Empleado from '@model/empleados/empleado.model';
import ManagementPasswordDialogComponent from '@modules/gestion/components/management-password-dialog/management-password-dialog.component';
import EmpleadosService from '@services/empleados/empleados.service';

describe('ManagementPasswordDialogComponent', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;
  let fixture: ComponentFixture<ManagementPasswordDialogComponent>;
  let component: ManagementPasswordDialogComponent;
  let authenticationResult: AutenticarEmpleadoResult;
  let authenticateEmpleadoId: number | null;
  let authenticatePassword: string | null;
  let reloadCount: number;

  const empleado: Empleado = new Empleado().fromInterface({
    id: 7,
    publicId: 'empleado-7',
    nombre: 'Iñigo',
    hasPassword: true,
    color: '#123456',
    admin: false,
    permisos: [],
  });

  beforeEach(async (): Promise<void> => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    authenticationResult = {
      status: 'authenticated',
    };
    authenticateEmpleadoId = null;
    authenticatePassword = null;
    reloadCount = 0;

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        empleados: {
          authenticate: (
            command: Readonly<{ idEmpleado: number; password: string }>,
          ): Promise<AutenticarEmpleadoResult> => {
            authenticateEmpleadoId = command.idEmpleado;
            authenticatePassword = command.password;

            return Promise.resolve(authenticationResult);
          },

          getAll: (): Promise<readonly ReturnType<Empleado['toInterface']>[]> => {
            reloadCount++;

            return Promise.resolve([empleado.toInterface()]);
          },
        },
      },
    });

    await TestBed.configureTestingModule({
      imports: [ManagementPasswordDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagementPasswordDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('empleado', empleado);
    fixture.detectChanges();

    await fixture.whenStable();
  });

  afterEach((): void => {
    if (originalDesktopDescriptor === undefined) {
      Reflect.deleteProperty(window, 'osumiDesktop');
    } else {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);
    }

    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('debe autenticar al empleado y emitir el acceso correcto', async (): Promise<void> => {
    const authenticatedEvent = vi.fn();
    const preventDefault = vi.fn();

    component.authenticatedEvent.subscribe(authenticatedEvent);
    component.password.set('secreto');

    await component.submit({
      preventDefault,
    } as unknown as Event);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(authenticateEmpleadoId).toBe(7);
    expect(authenticatePassword).toBe('secreto');
    expect(authenticatedEvent).toHaveBeenCalledOnce();
    expect(component.error()).toBeNull();
  });

  it('debe permanecer abierto y limpiar la contraseña si es incorrecta', async (): Promise<void> => {
    authenticationResult = {
      status: 'invalid_password',
    };

    const authenticatedEvent = vi.fn();

    component.authenticatedEvent.subscribe(authenticatedEvent);
    component.password.set('incorrecta');

    await component.submit({
      preventDefault: vi.fn(),
    } as unknown as Event);

    expect(authenticatedEvent).not.toHaveBeenCalled();
    expect(component.password()).toBe('');
    expect(component.error()).toBe('Contraseña incorrecta.');
    expect(component.authenticationUnavailable()).toBe(false);
  });

  it('debe bloquear el acceso si el empleado no dispone de contraseña válida', async (): Promise<void> => {
    authenticationResult = {
      status: 'password_unavailable',
    };

    await component.submit({
      preventDefault: vi.fn(),
    } as unknown as Event);

    expect(component.authenticationUnavailable()).toBe(true);
    expect(component.error()).toBe(
      'Este empleado no tiene una contraseña válida. Un administrador debe asignarle una nueva contraseña.',
    );
  });

  it('debe devolver el foco al campo de contraseña después de un password incorrecto', async (): Promise<void> => {
    const empleadosService: EmpleadosService = TestBed.inject(EmpleadosService);

    let resolveAuthentication: (result: AutenticarEmpleadoResult) => void = (): void => {
      throw new Error('La autenticación pendiente no está preparada.');
    };

    const pendingAuthentication: Promise<AutenticarEmpleadoResult> =
      new Promise<AutenticarEmpleadoResult>((resolve): void => {
        resolveAuthentication = resolve;
      });

    vi.spyOn(empleadosService, 'authenticate').mockReturnValueOnce(pendingAuthentication);

    const passwordInput: HTMLInputElement | null =
      fixture.nativeElement.querySelector('input[type="password"]');

    expect(passwordInput).not.toBeNull();

    if (passwordInput === null) {
      return;
    }

    passwordInput.blur();

    component.password.set('incorrecta');

    const submitPromise: Promise<void> = component.submit({
      preventDefault: vi.fn(),
    } as unknown as Event);

    /*
     * Mientras la autenticación está pendiente
     * el input queda realmente deshabilitado.
     */
    fixture.detectChanges();

    expect(passwordInput.disabled).toBe(true);

    resolveAuthentication({
      status: 'invalid_password',
    });

    await submitPromise;

    /*
     * El foco solo debe recuperarse después
     * de volver a renderizar loading = false.
     */
    fixture.detectChanges();

    await fixture.whenStable();

    expect(passwordInput.disabled).toBe(false);

    expect(document.activeElement).toBe(passwordInput);
  });

  it('debe recargar empleados si el empleado deja de estar disponible', async (): Promise<void> => {
    authenticationResult = {
      status: 'employee_unavailable',
    };

    await component.submit({
      preventDefault: vi.fn(),
    } as unknown as Event);

    expect(reloadCount).toBe(1);
    expect(component.authenticationUnavailable()).toBe(true);
    expect(component.error()).toBe(
      'Este empleado ya no está disponible. La lista de empleados se ha actualizado.',
    );
  });
});
