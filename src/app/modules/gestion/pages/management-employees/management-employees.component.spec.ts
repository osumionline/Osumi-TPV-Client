import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type ActualizarEmpleadoCommand from '@desktop-contracts/configuration/empleados/actualizar-empleado-command.interface';
import type CrearEmpleadoCommand from '@desktop-contracts/configuration/empleados/crear-empleado-command.interface';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';
import Empleado from '@model/empleados/empleado.model';
import ManagementEmployeesComponent from '@modules/gestion/pages/management-employees/management-employees.component';
import { DialogService } from '@osumi/angular-tools';
import EmpleadosService from '@services/empleados/empleados.service';
import GestionSessionService from '@services/gestion/gestion-session.service';
import { of } from 'rxjs';

describe('ManagementEmployeesComponent', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;
  let empleadosService: EmpleadosService;
  let gestionSessionService: GestionSessionService;
  let dialog: DialogService;
  let router: Router;

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
        permisos: [permissionKeys.gestion.empleados],
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
        permisos: [permissionKeys.gestion.ajustes],
      },
    ];

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,

      value: {
        empleados: {
          getAll: (): Promise<readonly EmpleadoInterface[]> => Promise.resolve(empleados),
          deactivate: (): Promise<void> => Promise.resolve(),
        },
      },
    });

    await TestBed.configureTestingModule({
      imports: [ManagementEmployeesComponent],

      providers: [provideRouter([])],
    }).compileComponents();

    empleadosService = TestBed.inject(EmpleadosService);
    gestionSessionService = TestBed.inject(GestionSessionService);
    dialog = TestBed.inject(DialogService);
    router = TestBed.inject(Router);

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

  it('permite iniciar un alta con el permiso gestion.empleados', (): void => {
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

  it('no permite iniciar un alta sin el permiso gestion.empleados', (): void => {
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

  it('carga los datos del empleado seleccionado sin cargar su contraseña', (): void => {
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

    expect(component.empleadoDataModel()).toEqual({
      mode: 'edit',
      nombre: 'Iñigo',
      password: '',
      confirmPassword: '',
      color: '#228844',
    });
  });

  it('prepara un formulario limpio al iniciar un alta', (): void => {
    gestionSessionService.login(2);

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

    component.empleadoDataForm.nombre().value.set('Nombre modificado');
    component.empleadoDataForm.nombre().markAsDirty();
    component.empleadoDataForm.nombre().markAsTouched();

    expect(component.empleadoDataForm().dirty()).toBe(true);
    expect(component.empleadoDataForm().touched()).toBe(true);

    component.startCreatingEmpleado();

    expect(component.empleadoDataModel()).toEqual({
      mode: 'create',
      nombre: '',
      password: '',
      confirmPassword: '',
      color: '#3f51b5',
    });

    expect(component.empleadoDataForm().dirty()).toBe(false);
    expect(component.empleadoDataForm().touched()).toBe(false);
  });

  it('reinicia el formulario al cambiar de empleado', (): void => {
    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const firstEmpleado: Empleado | null = empleadosService.findById(1);

    const secondEmpleado: Empleado | null = empleadosService.findById(3);

    expect(firstEmpleado).not.toBeNull();

    expect(secondEmpleado).not.toBeNull();

    if (firstEmpleado === null || secondEmpleado === null) {
      return;
    }

    component.selectEmpleado(firstEmpleado);

    component.empleadoDataForm.password().value.set('temporal');

    component.selectEmpleado(secondEmpleado);

    expect(component.empleadoDataModel()).toEqual({
      mode: 'edit',
      nombre: 'Iñigo',
      password: '',
      confirmPassword: '',
      color: '#228844',
    });

    expect(component.empleadoDataForm().dirty()).toBe(false);
  });

  it('crea un empleado con los datos del formulario', async (): Promise<void> => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const createdEmpleado: Empleado = new Empleado();

    createdEmpleado.id = 4;
    createdEmpleado.publicId = 'empleado-4';
    createdEmpleado.nombre = 'Leire';
    createdEmpleado.hasPassword = true;
    createdEmpleado.color = '#112233';
    createdEmpleado.admin = false;
    createdEmpleado.permisos = [];

    const createSpy = vi.spyOn(empleadosService, 'create').mockResolvedValue(createdEmpleado);

    component.startCreatingEmpleado();

    component.empleadoDataForm.nombre().value.set('  Leire  ');

    component.empleadoDataForm.password().value.set('clave');

    component.empleadoDataForm.confirmPassword().value.set('clave');

    component.empleadoDataForm.color().value.set('#112233');

    await component.saveEmpleado();

    expect(createSpy).toHaveBeenCalledWith({
      nombre: 'Leire',
      password: 'clave',
      color: '#112233',
      permisos: [],
    } satisfies CrearEmpleadoCommand);

    expect(component.creatingEmpleado()).toBe(false);

    expect(component.selectedEmpleado()).toBe(createdEmpleado);

    expect(component.empleadoDataForm().dirty()).toBe(false);
  });

  it('actualiza Datos conservando contraseña y permisos cuando la contraseña queda vacía', async (): Promise<void> => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(1);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    const updatedEmpleado: Empleado = new Empleado();

    updatedEmpleado.id = 1;
    updatedEmpleado.publicId = 'empleado-1';
    updatedEmpleado.nombre = 'Zuriñe nueva';
    updatedEmpleado.hasPassword = true;
    updatedEmpleado.color = '#445566';
    updatedEmpleado.admin = false;
    updatedEmpleado.permisos = [...empleado.permisos];

    const updateSpy = vi.spyOn(empleadosService, 'update').mockResolvedValue(updatedEmpleado);

    component.selectEmpleado(empleado);

    component.empleadoDataForm.nombre().value.set('Zuriñe nueva');

    component.empleadoDataForm.color().value.set('#445566');

    await component.saveEmpleado();

    expect(updateSpy).toHaveBeenCalledWith(1, {
      nombre: 'Zuriñe nueva',
      password: null,
      color: '#445566',
      permisos: [...empleado.permisos],
    } satisfies ActualizarEmpleadoCommand);

    expect(component.selectedEmpleado()).toBe(updatedEmpleado);

    expect(component.empleadoDataForm.password().value()).toBe('');
  });

  it('envía la nueva contraseña cuando se modifica', async (): Promise<void> => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(1);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    const updateSpy = vi.spyOn(empleadosService, 'update').mockResolvedValue(empleado);

    component.selectEmpleado(empleado);

    component.empleadoDataForm.password().value.set('nueva-clave');

    component.empleadoDataForm.confirmPassword().value.set('nueva-clave');

    await component.saveEmpleado();

    expect(updateSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        password: 'nueva-clave',
      }),
    );
  });

  it('no permite modificar Datos sin el permiso gestion.empleados', async (): Promise<void> => {
    gestionSessionService.login(3);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(1);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    const updateSpy = vi.spyOn(empleadosService, 'update');

    component.selectEmpleado(empleado);

    expect(component.canUpdateEmpleado()).toBe(false);
    expect(component.canEditEmpleadoData()).toBe(false);
    expect(component.empleadoDataForm.nombre().readonly()).toBe(true);
    expect(component.empleadoDataForm.password().readonly()).toBe(true);
    expect(component.empleadoDataForm.confirmPassword().readonly()).toBe(true);
    expect(component.empleadoDataForm.color().disabled()).toBe(true);

    component.empleadoDataForm.nombre().value.set('No permitido');

    await component.saveEmpleado();

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('restaura los datos originales al cancelar una edición', (): void => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(1);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    component.selectEmpleado(empleado);

    component.empleadoDataForm.nombre().value.set('Nombre temporal');

    component.empleadoDataForm.password().value.set('temporal');

    component.cancelEmpleadoChanges();

    expect(component.empleadoDataModel()).toEqual({
      mode: 'edit',
      nombre: 'Zuriñe',
      password: '',
      confirmPassword: '',
      color: '#336699',
    });

    expect(component.empleadoDataForm().dirty()).toBe(false);
  });

  it('sale del modo alta al cancelar', (): void => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    component.startCreatingEmpleado();

    component.empleadoDataForm.nombre().value.set('Temporal');

    component.cancelEmpleadoChanges();

    expect(component.creatingEmpleado()).toBe(false);

    expect(component.selectedEmpleado()).toBeNull();
  });

  it('permite acceder a Permisos con el permiso gestion.empleados', (): void => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    expect(fixture.componentInstance.canManageEmpleadoPermissions()).toBe(true);
  });

  it('no permite acceder a Permisos sin el permiso gestion.empleados', (): void => {
    gestionSessionService.login(3);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    expect(fixture.componentInstance.canManageEmpleadoPermissions()).toBe(false);
  });

  it('permite acceder a Permisos a un administrador', (): void => {
    gestionSessionService.login(2);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    expect(fixture.componentInstance.canManageEmpleadoPermissions()).toBe(true);
  });

  it('carga los permisos almacenados del empleado seleccionado', (): void => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(1);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    component.selectEmpleado(empleado);

    expect(component.hasEmpleadoPermission(permissionKeys.gestion.empleados)).toBe(true);

    expect(component.hasEmpleadoPermission(permissionKeys.gestion.tiposPago)).toBe(false);
  });

  it('muestra todos los permisos seleccionados para un administrador', (): void => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(2);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    component.selectEmpleado(empleado);

    expect(component.selectedEmpleadoPermisos()).toEqual([
      permissionKeys.gestion.ajustes,
      permissionKeys.gestion.copiasSeguridad,
      permissionKeys.gestion.empleados,
      permissionKeys.gestion.tiposPago,
      permissionKeys.ventas.modificarImportes,
    ]);
  });

  it('inicia un nuevo empleado sin permisos seleccionados', (): void => {
    gestionSessionService.login(2);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    component.startCreatingEmpleado();

    expect(component.selectedEmpleadoPermisos()).toEqual([]);
  });

  it('permite modificar permisos con el permiso gestion.empleados', (): void => {
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

    component.selectEmpleado(empleado);

    expect(component.canEditEmpleadoPermissions()).toBe(true);

    expect(component.empleadoPermissionsDirty()).toBe(false);

    component.setEmpleadoPermission(permissionKeys.gestion.tiposPago, true);

    expect(component.hasEmpleadoPermission(permissionKeys.gestion.tiposPago)).toBe(true);

    expect(component.empleadoPermissionsDirty()).toBe(true);

    expect(component.canSaveEmpleado()).toBe(true);

    component.setEmpleadoPermission(permissionKeys.gestion.tiposPago, false);

    expect(component.hasEmpleadoPermission(permissionKeys.gestion.tiposPago)).toBe(false);

    expect(component.empleadoPermissionsDirty()).toBe(false);
  });

  it('no permite modificar los permisos de un administrador', (): void => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(2);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    component.selectEmpleado(empleado);

    expect(component.canEditEmpleadoPermissions()).toBe(false);

    component.setEmpleadoPermission(permissionKeys.gestion.ajustes, false);

    expect(component.selectedEmpleadoPermisos()).toEqual([
      permissionKeys.gestion.ajustes,
      permissionKeys.gestion.copiasSeguridad,
      permissionKeys.gestion.empleados,
      permissionKeys.gestion.tiposPago,
      permissionKeys.ventas.modificarImportes,
    ]);

    expect(component.hasEmpleadoPermission(permissionKeys.gestion.ajustes)).toBe(true);

    expect(component.empleadoPermissionsDirty()).toBe(false);
  });

  it('restaura los permisos al cancelar una edición', (): void => {
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

    component.selectEmpleado(empleado);

    expect(component.selectedEmpleadoPermisos()).toEqual([permissionKeys.gestion.ajustes]);

    component.setEmpleadoPermission(permissionKeys.gestion.tiposPago, true);

    expect(component.empleadoPermissionsDirty()).toBe(true);

    component.cancelEmpleadoChanges();

    expect(component.selectedEmpleadoPermisos()).toEqual([permissionKeys.gestion.ajustes]);

    expect(component.empleadoPermissionsDirty()).toBe(false);
  });

  it('incluye los permisos seleccionados al crear un empleado', async (): Promise<void> => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const createdEmpleado: Empleado = new Empleado();

    createdEmpleado.id = 4;
    createdEmpleado.publicId = 'empleado-4';
    createdEmpleado.nombre = 'Leire';
    createdEmpleado.hasPassword = true;
    createdEmpleado.color = '#112233';
    createdEmpleado.admin = false;
    createdEmpleado.permisos = [
      permissionKeys.gestion.ajustes,
      permissionKeys.gestion.copiasSeguridad,
    ];

    const createSpy = vi.spyOn(empleadosService, 'create').mockResolvedValue(createdEmpleado);

    component.startCreatingEmpleado();

    component.empleadoDataForm.nombre().value.set('Leire');

    component.empleadoDataForm.password().value.set('clave');

    component.empleadoDataForm.confirmPassword().value.set('clave');

    component.empleadoDataForm.color().value.set('#112233');

    component.setEmpleadoPermission(permissionKeys.gestion.copiasSeguridad, true);

    component.setEmpleadoPermission(permissionKeys.gestion.ajustes, true);

    await component.saveEmpleado();

    expect(createSpy).toHaveBeenCalledWith({
      nombre: 'Leire',
      password: 'clave',
      color: '#112233',
      permisos: [permissionKeys.gestion.ajustes, permissionKeys.gestion.copiasSeguridad],
    } satisfies CrearEmpleadoCommand);
  });

  it('muestra temporalmente la confirmación después de guardar', async (): Promise<void> => {
    vi.useFakeTimers();

    try {
      gestionSessionService.login(1);

      const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
        ManagementEmployeesComponent,
      );

      const component: ManagementEmployeesComponent = fixture.componentInstance;

      const empleado: Empleado | null = empleadosService.findById(1);

      expect(empleado).not.toBeNull();

      if (empleado === null) {
        return;
      }

      const updatedEmpleado: Empleado = new Empleado();

      updatedEmpleado.id = empleado.id;
      updatedEmpleado.publicId = empleado.publicId;
      updatedEmpleado.nombre = 'Zuriñe nueva';
      updatedEmpleado.hasPassword = true;
      updatedEmpleado.color = empleado.color;
      updatedEmpleado.admin = false;
      updatedEmpleado.permisos = [...empleado.permisos];

      vi.spyOn(empleadosService, 'update').mockResolvedValue(updatedEmpleado);

      component.selectEmpleado(empleado);

      component.empleadoDataForm.nombre().value.set('Zuriñe nueva');

      await component.saveEmpleado();

      expect(component.saveSuccessful()).toBe(true);

      vi.advanceTimersByTime(3_999);

      expect(component.saveSuccessful()).toBe(true);

      vi.advanceTimersByTime(1);

      expect(component.saveSuccessful()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('elimina otro empleado después de confirmarlo', async (): Promise<void> => {
    gestionSessionService.login(2);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(1);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    vi.spyOn(dialog, 'confirm').mockReturnValue(of(true));

    const deactivateSpy = vi.spyOn(empleadosService, 'deactivate');

    component.selectEmpleado(empleado);

    expect(component.canDeleteEmpleado()).toBe(true);

    expect(component.canDeleteSelectedEmpleado()).toBe(true);

    await component.deleteEmpleado();

    expect(deactivateSpy).toHaveBeenCalledWith(1);

    expect(empleadosService.findById(1)).toBeNull();

    expect(component.selectedEmpleado()).toBeNull();
  });

  it('no elimina el empleado si se cancela la confirmación', async (): Promise<void> => {
    gestionSessionService.login(2);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(1);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    vi.spyOn(dialog, 'confirm').mockReturnValue(of(false));

    const deactivateSpy = vi.spyOn(empleadosService, 'deactivate');

    component.selectEmpleado(empleado);

    await component.deleteEmpleado();

    expect(deactivateSpy).not.toHaveBeenCalled();

    expect(component.selectedEmpleado()).toBe(empleado);

    expect(empleadosService.findById(1)).toBe(empleado);
  });

  it('no permite eliminar empleados sin el permiso gestion.empleados', async (): Promise<void> => {
    gestionSessionService.login(3);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(1);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    const deactivateSpy = vi.spyOn(empleadosService, 'deactivate');

    component.selectEmpleado(empleado);

    expect(component.canDeleteEmpleado()).toBe(false);

    expect(component.canDeleteSelectedEmpleado()).toBe(false);

    await component.deleteEmpleado();

    expect(deactivateSpy).not.toHaveBeenCalled();
  });

  it('no permite que el empleado autenticado se elimine a sí mismo', async (): Promise<void> => {
    gestionSessionService.login(2);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(2);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    const deactivateSpy = vi.spyOn(empleadosService, 'deactivate');

    component.selectEmpleado(empleado);

    expect(component.canDeleteEmpleado()).toBe(true);

    expect(component.canDeleteSelectedEmpleado()).toBe(false);

    await component.deleteEmpleado();

    expect(deactivateSpy).not.toHaveBeenCalled();

    expect(component.selectedEmpleado()).toBe(empleado);
  });

  it('vuelve a Gestión si el empleado autenticado se quita a sí mismo gestion.empleados', async (): Promise<void> => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(1);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    const updatedEmpleado: Empleado = new Empleado();

    updatedEmpleado.id = empleado.id;
    updatedEmpleado.publicId = empleado.publicId;
    updatedEmpleado.nombre = empleado.nombre;
    updatedEmpleado.hasPassword = empleado.hasPassword;
    updatedEmpleado.color = empleado.color;
    updatedEmpleado.admin = false;
    updatedEmpleado.permisos = [];

    const updateSpy = vi.spyOn(empleadosService, 'update').mockResolvedValue(updatedEmpleado);

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.selectEmpleado(empleado);

    component.setEmpleadoPermission(permissionKeys.gestion.empleados, false);

    await component.saveEmpleado();

    expect(updateSpy).toHaveBeenCalledWith(
      empleado.id,
      expect.objectContaining({
        permisos: [],
      }),
    );

    expect(navigateSpy).toHaveBeenCalledWith(['/gestion']);

    expect(gestionSessionService.empleadoId()).toBe(1);

    expect(component.saveSuccessful()).toBe(false);
  });

  it('permanece en Empleados si al editarse conserva gestion.empleados', async (): Promise<void> => {
    gestionSessionService.login(1);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    const empleado: Empleado | null = empleadosService.findById(1);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    const updatedEmpleado: Empleado = new Empleado();

    updatedEmpleado.id = empleado.id;
    updatedEmpleado.publicId = empleado.publicId;
    updatedEmpleado.nombre = empleado.nombre;
    updatedEmpleado.hasPassword = empleado.hasPassword;
    updatedEmpleado.color = empleado.color;
    updatedEmpleado.admin = false;
    updatedEmpleado.permisos = [permissionKeys.gestion.ajustes, permissionKeys.gestion.empleados];

    const updateSpy = vi.spyOn(empleadosService, 'update').mockResolvedValue(updatedEmpleado);

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.selectEmpleado(empleado);

    component.setEmpleadoPermission(permissionKeys.gestion.ajustes, true);

    await component.saveEmpleado();

    expect(updateSpy).toHaveBeenCalledWith(
      empleado.id,
      expect.objectContaining({
        permisos: [permissionKeys.gestion.ajustes, permissionKeys.gestion.empleados],
      }),
    );

    expect(navigateSpy).not.toHaveBeenCalled();

    expect(gestionSessionService.empleadoId()).toBe(1);

    /*
     * Limpia también el timeout del
     * feedback generado por el guardado.
     */
    component.selectEmpleado(updatedEmpleado);
  });

  it('pone el foco en Nombre al seleccionar un empleado', async (): Promise<void> => {
    gestionSessionService.login(2);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    fixture.detectChanges();

    const empleado: Empleado | null = empleadosService.findById(1);

    expect(empleado).not.toBeNull();

    if (empleado === null) {
      return;
    }

    component.selectEmpleado(empleado);

    fixture.detectChanges();

    await fixture.whenStable();

    const nombreInput: HTMLInputElement | null = fixture.nativeElement.querySelector(
      '.employee-form__content input[type="text"]',
    );

    expect(nombreInput).not.toBeNull();

    expect(document.activeElement).toBe(nombreInput);
  });

  it('pone el foco en Nombre al iniciar un alta', async (): Promise<void> => {
    gestionSessionService.login(2);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    fixture.detectChanges();

    component.startCreatingEmpleado();

    fixture.detectChanges();

    await fixture.whenStable();

    const nombreInput: HTMLInputElement | null = fixture.nativeElement.querySelector(
      '.employee-form__content input[type="text"]',
    );

    expect(nombreInput).not.toBeNull();

    expect(document.activeElement).toBe(nombreInput);
  });

  it('pone el foco en Nombre al seleccionar otro empleado desde Permisos', async (): Promise<void> => {
    gestionSessionService.login(2);

    const fixture: ComponentFixture<ManagementEmployeesComponent> = TestBed.createComponent(
      ManagementEmployeesComponent,
    );

    const component: ManagementEmployeesComponent = fixture.componentInstance;

    fixture.detectChanges();

    const empleadoA: Empleado | null = empleadosService.findById(1);

    const empleadoB: Empleado | null = empleadosService.findById(3);

    expect(empleadoA).not.toBeNull();

    expect(empleadoB).not.toBeNull();

    if (empleadoA === null || empleadoB === null) {
      return;
    }

    component.selectEmpleado(empleadoA);

    fixture.detectChanges();
    await fixture.whenStable();

    const tabs: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('[role="tab"]');

    expect(tabs.length).toBeGreaterThan(1);

    tabs[1]?.click();

    fixture.detectChanges();
    await fixture.whenStable();

    component.selectEmpleado(empleadoB);

    fixture.detectChanges();

    /*
     * En la aplicación real Angular Material
     * emite animationDone al finalizar la
     * transición de Permisos a Datos.
     *
     * El entorno de test no ejecuta esa
     * animación de navegador, por lo que
     * simulamos explícitamente el evento.
     */
    component.handleTabAnimationDone();

    await fixture.whenStable();

    const nombreInput: HTMLInputElement | null = fixture.nativeElement.querySelector(
      '.employee-form__content input[type="text"]',
    );

    expect(nombreInput).not.toBeNull();

    expect(document.activeElement).toBe(nombreInput);
  });
});
