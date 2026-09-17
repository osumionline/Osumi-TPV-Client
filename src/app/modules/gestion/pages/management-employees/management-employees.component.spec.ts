import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
import type Empleado from '@model/empleados/empleado.model';
import ManagementEmployeesComponent from '@modules/gestion/pages/management-employees/management-employees.component';
import EmpleadosService from '@services/empleados/empleados.service';

describe('ManagementEmployeesComponent', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;

  let empleadosService: EmpleadosService;

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
  });

  it('comienza sin ningún empleado seleccionado', (): void => {
    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    expect(fixture.componentInstance.selectedEmpleado()).toBeNull();
  });
});
