import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
import type Empleado from '@model/empleados/empleado.model';
import ManagementEmployeesComponent from '@modules/gestion/pages/management-employees/management-employees.component';
import EmpleadosService from '@services/empleados/empleados.service';
import GestionSessionService from '@services/gestion/gestion-session.service';

describe('ManagementEmployeesComponent', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;

  let empleadosService: EmpleadosService;

  let gestionSessionService: GestionSessionService;

  beforeEach(async (): Promise<void> => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    const empleados: readonly EmpleadoInterface[] = [
      {
        id: 1,
        publicId: 'empleado-1',
        nombre: 'Zuriñe',
        hasPassword: true,
        color: '#336699',
        admin: false,
        permisos: [20],
      },
      {
        id: 2,
        publicId: 'empleado-2',
        nombre: 'Amaia',
        hasPassword: true,
        color: '#CCAA00',
        admin: true,
        permisos: [],
      },
      {
        id: 3,
        publicId: 'empleado-3',
        nombre: 'Iñigo',
        hasPassword: true,
        color: '#228844',
        admin: false,
        permisos: [21],
      },
    ];

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,

      value: {
        empleados: {
          getAll: (): Promise<readonly EmpleadoInterface[]> => Promise.resolve(empleados),
        },
      },
    });

    await TestBed.configureTestingModule({
      imports: [ManagementEmployeesComponent],

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

  it('muestra inicialmente todos los empleados cargados en memoria', (): void => {
    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    expect(
      fixture.componentInstance
        .filteredEmpleados()
        .map((empleado: Empleado): string => empleado.nombre),
    ).toEqual(['Amaia', 'Iñigo', 'Zuriñe']);
  });

  it('filtra empleados por nombre sin distinguir mayúsculas', (): void => {
    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    component.updateSearchTerm('IÑI');

    expect(
      component.filteredEmpleados().map((empleado: Empleado): string => empleado.nombre),
    ).toEqual(['Iñigo']);
  });

  it('permite seleccionar un empleado de la lista', (): void => {
    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(3);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    component.selectEmpleado(empleado);

    expect(component.selectedEmpleado()).toBe(empleado);

    expect(component.creatingEmpleado()).toBe(false);
  });

  it('comienza sin empleado seleccionado y sin alta en curso', (): void => {
    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    expect(fixture.componentInstance.selectedEmpleado()).toBeNull();

    expect(fixture.componentInstance.creatingEmpleado()).toBe(false);
  });

  it('permite iniciar un alta con el permiso 20', (): void => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    expect(component.canCreateEmpleado()).toBe(true);

    component.startCreatingEmpleado();

    expect(component.creatingEmpleado()).toBe(true);

    expect(component.selectedEmpleado()).toBeNull();
  });

  it('no permite iniciar un alta sin el permiso 20', (): void => {
    gestionSessionService.login(3);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    expect(component.canCreateEmpleado()).toBe(false);

    component.startCreatingEmpleado();

    expect(component.creatingEmpleado()).toBe(false);
  });

  it('permite iniciar un alta a un administrador', (): void => {
    gestionSessionService.login(2);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    expect(component.canCreateEmpleado()).toBe(true);

    component.startCreatingEmpleado();

    expect(component.creatingEmpleado()).toBe(true);
  });

  it('abandona el modo alta al seleccionar un empleado', (): void => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(3);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    component.startCreatingEmpleado();

    expect(component.creatingEmpleado()).toBe(true);

    component.selectEmpleado(empleado);

    expect(component.creatingEmpleado()).toBe(false);

    expect(component.selectedEmpleado()).toBe(empleado);
  });
});
