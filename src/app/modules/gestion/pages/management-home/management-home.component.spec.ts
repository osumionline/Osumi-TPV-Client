import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
import ManagementHomeComponent from '@modules/gestion/pages/management-home/management-home.component';
import EmpleadosService from '@services/empleados/empleados.service';
import GestionSessionService from '@services/gestion/gestion-session.service';

describe('ManagementHomeComponent', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;
  let empleadosService: EmpleadosService;
  let gestionSessionService: GestionSessionService;

  const empleadoInterface: EmpleadoInterface = {
    id: 7,
    publicId: 'empleado-7',
    nombre: 'Iñigo',
    hasPassword: true,
    color: '#123456',
    admin: false,
    permisos: [],
  };

  beforeEach(async (): Promise<void> => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        empleados: {
          getAll: (): Promise<readonly EmpleadoInterface[]> => Promise.resolve([empleadoInterface]),
        },
      },
    });

    await TestBed.configureTestingModule({
      imports: [ManagementHomeComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    empleadosService = TestBed.inject(EmpleadosService);
    gestionSessionService = TestBed.inject(GestionSessionService);

    await empleadosService.load();
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

  it('debe comenzar mostrando el selector si no existe sesión', (): void => {
    const fixture: ComponentFixture<ManagementHomeComponent> =
      TestBed.createComponent(ManagementHomeComponent);

    expect(fixture.componentInstance.empleadoGestion()).toBeNull();
    expect(fixture.componentInstance.passwordModalOpen()).toBe(false);
  });

  it('debe abrir el modal al seleccionar un empleado', (): void => {
    const fixture: ComponentFixture<ManagementHomeComponent> =
      TestBed.createComponent(ManagementHomeComponent);

    const component: ManagementHomeComponent = fixture.componentInstance;
    const empleado = empleadosService.findById(7);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    component.selectEmpleado(empleado);

    expect(component.selectedEmpleado()).toBe(empleado);
    expect(component.passwordModalOpen()).toBe(true);
    expect(gestionSessionService.empleadoId()).toBeNull();
  });

  it('debe crear la sesión únicamente después de autenticar al empleado', (): void => {
    const fixture: ComponentFixture<ManagementHomeComponent> =
      TestBed.createComponent(ManagementHomeComponent);

    const component: ManagementHomeComponent = fixture.componentInstance;
    const empleado = empleadosService.findById(7);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    component.selectEmpleado(empleado);

    expect(gestionSessionService.empleadoId()).toBeNull();

    component.onEmpleadoAuthenticated();

    expect(gestionSessionService.empleadoId()).toBe(7);
    expect(component.empleadoGestion()).toBe(empleado);
    expect(component.passwordModalOpen()).toBe(false);
    expect(component.selectedEmpleado()).toBeNull();
  });

  it('debe eliminar la sesión al cambiar de empleado', (): void => {
    gestionSessionService.login(7);

    const fixture: ComponentFixture<ManagementHomeComponent> =
      TestBed.createComponent(ManagementHomeComponent);

    const component: ManagementHomeComponent = fixture.componentInstance;

    expect(component.empleadoGestion()?.id).toBe(7);

    component.changeEmpleado();

    expect(gestionSessionService.empleadoId()).toBeNull();
    expect(component.empleadoGestion()).toBeNull();
  });

  it('debe recuperar una sesión de Gestión que todavía esté activa', (): void => {
    gestionSessionService.login(7);

    const fixture: ComponentFixture<ManagementHomeComponent> =
      TestBed.createComponent(ManagementHomeComponent);

    expect(fixture.componentInstance.empleadoGestion()?.id).toBe(7);
  });
});
