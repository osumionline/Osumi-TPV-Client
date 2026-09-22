import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';
import ManagementHomeComponent from '@modules/gestion/pages/management-home/management-home.component';
import EmpleadosService from '@services/empleados/empleados.service';
import GestionSessionService from '@services/gestion/gestion-session.service';

describe('ManagementHomeComponent', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;
  let empleadosService: EmpleadosService;
  let gestionSessionService: GestionSessionService;

  const empleados: readonly EmpleadoInterface[] = [
    {
      id: 7,
      publicId: 'empleado-7',
      nombre: 'Iñigo',
      hasPassword: true,
      color: '#123456',
      admin: false,
      permisos: [],
    },
    {
      id: 8,
      publicId: 'empleado-8',
      nombre: 'Ajustes',
      hasPassword: true,
      color: '#223344',
      admin: false,
      permisos: [permissionKeys.gestion.ajustes],
    },
    {
      id: 9,
      publicId: 'empleado-9',
      nombre: 'Tipos de pago',
      hasPassword: true,
      color: '#334455',
      admin: false,
      permisos: [permissionKeys.gestion.tiposPago],
    },
    {
      id: 10,
      publicId: 'empleado-10',
      nombre: 'Empleados',
      hasPassword: true,
      color: '#445566',
      admin: false,
      permisos: [permissionKeys.gestion.empleados],
    },
    {
      id: 11,
      publicId: 'empleado-11',
      nombre: 'Copias',
      hasPassword: true,
      color: '#556677',
      admin: false,
      permisos: [permissionKeys.gestion.copiasSeguridad],
    },
    {
      id: 12,
      publicId: 'empleado-12',
      nombre: 'Administrador',
      hasPassword: true,
      color: '#667788',
      admin: true,
      permisos: [],
    },
  ];

  beforeEach(async (): Promise<void> => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        empleados: {
          getAll: (): Promise<readonly EmpleadoInterface[]> => Promise.resolve(empleados),
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

  it('permite acceder a Ajustes únicamente con gestion.ajustes', (): void => {
    gestionSessionService.login(8);

    const fixture: ComponentFixture<ManagementHomeComponent> =
      TestBed.createComponent(ManagementHomeComponent);

    const component: ManagementHomeComponent = fixture.componentInstance;

    const module = component.modules.find((item): boolean => item.id === 'settings');

    expect(module).toBeDefined();

    if (module === undefined) {
      return;
    }

    expect(component.canAccessModule(module)).toBe(true);

    expect(
      component.modules
        .filter((item): boolean => item.id !== 'settings')
        .every((item): boolean => !component.canAccessModule(item)),
    ).toBe(true);
  });

  it('permite acceder a Tipos de pago únicamente con gestion.tipos_pago', (): void => {
    gestionSessionService.login(9);

    const fixture: ComponentFixture<ManagementHomeComponent> =
      TestBed.createComponent(ManagementHomeComponent);

    const component: ManagementHomeComponent = fixture.componentInstance;

    const module = component.modules.find((item): boolean => item.id === 'payment-types');

    expect(module).toBeDefined();

    if (module === undefined) {
      return;
    }

    expect(component.canAccessModule(module)).toBe(true);

    expect(
      component.modules
        .filter((item): boolean => item.id !== 'payment-types')
        .every((item): boolean => !component.canAccessModule(item)),
    ).toBe(true);
  });

  it('permite acceder a Empleados únicamente con gestion.empleados', (): void => {
    gestionSessionService.login(10);

    const fixture: ComponentFixture<ManagementHomeComponent> =
      TestBed.createComponent(ManagementHomeComponent);

    const component: ManagementHomeComponent = fixture.componentInstance;

    const module = component.modules.find((item): boolean => item.id === 'employees');

    expect(module).toBeDefined();

    if (module === undefined) {
      return;
    }

    expect(component.canAccessModule(module)).toBe(true);

    expect(
      component.modules
        .filter((item): boolean => item.id !== 'employees')
        .every((item): boolean => !component.canAccessModule(item)),
    ).toBe(true);
  });

  it('permite acceder a Copias de seguridad únicamente con gestion.copias_seguridad', (): void => {
    gestionSessionService.login(11);

    const fixture: ComponentFixture<ManagementHomeComponent> =
      TestBed.createComponent(ManagementHomeComponent);

    const component: ManagementHomeComponent = fixture.componentInstance;

    const module = component.modules.find((item): boolean => item.id === 'backups');

    expect(module).toBeDefined();

    if (module === undefined) {
      return;
    }

    expect(component.canAccessModule(module)).toBe(true);

    expect(
      component.modules
        .filter((item): boolean => item.id !== 'backups')
        .every((item): boolean => !component.canAccessModule(item)),
    ).toBe(true);
  });

  it('no permite acceder a ningún módulo sin permisos', (): void => {
    gestionSessionService.login(7);

    const fixture: ComponentFixture<ManagementHomeComponent> =
      TestBed.createComponent(ManagementHomeComponent);

    const component: ManagementHomeComponent = fixture.componentInstance;

    expect(component.modules.every((module): boolean => !component.canAccessModule(module))).toBe(
      true,
    );
  });

  it('permite a un administrador acceder a todos los módulos', (): void => {
    gestionSessionService.login(12);

    const fixture: ComponentFixture<ManagementHomeComponent> =
      TestBed.createComponent(ManagementHomeComponent);

    const component: ManagementHomeComponent = fixture.componentInstance;

    expect(component.modules.every((module): boolean => component.canAccessModule(module))).toBe(
      true,
    );
  });
});
