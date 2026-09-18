import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, type FieldTree } from '@angular/forms/signals';
import createEmpleadoDataFormInitialValue from '@model/empleados/empleado-data-form.initial-value';
import type { EmpleadoDataFormModel } from '@model/empleados/empleado-data-form.model';
import empleadoDataFormSchema from '@model/empleados/empleado-data-form.schema';
import Empleado from '@model/empleados/empleado.model';

describe('EmpleadoDataForm', (): void => {
  beforeEach((): void => {
    TestBed.configureTestingModule({});
  });

  afterEach((): void => {
    TestBed.resetTestingModule();
  });

  it('crea los valores iniciales de un alta', (): void => {
    const value: EmpleadoDataFormModel = createEmpleadoDataFormInitialValue(null);

    expect(value).toEqual({
      mode: 'create',
      nombre: '',
      password: '',
      confirmPassword: '',
      color: '#3f51b5',
    });
  });

  it('crea los valores de edición sin exponer ninguna contraseña', (): void => {
    const empleado: Empleado = createEmpleado();

    const value: EmpleadoDataFormModel = createEmpleadoDataFormInitialValue(empleado);

    expect(value).toEqual({
      mode: 'edit',
      nombre: 'Iñigo',
      password: '',
      confirmPassword: '',
      color: '#336699',
    });
  });

  it('exige contraseña y confirmación en un alta', (): void => {
    const empleadoForm: FieldTree<EmpleadoDataFormModel> = createForm(
      createEmpleadoDataFormInitialValue(null),
    );

    empleadoForm.nombre().value.set('Nuevo empleado');

    expect(empleadoForm().invalid()).toBe(true);

    empleadoForm.password().value.set('secreto');

    empleadoForm.confirmPassword().value.set('secreto');

    expect(empleadoForm().invalid()).toBe(false);
  });

  it('permite editar un empleado dejando las contraseñas vacías', (): void => {
    const empleadoForm: FieldTree<EmpleadoDataFormModel> = createForm(
      createEmpleadoDataFormInitialValue(createEmpleado()),
    );

    expect(empleadoForm().invalid()).toBe(false);

    expect(empleadoForm.password().value()).toBe('');

    expect(empleadoForm.confirmPassword().value()).toBe('');
  });

  it('exige que una nueva contraseña coincida en edición', (): void => {
    const empleadoForm: FieldTree<EmpleadoDataFormModel> = createForm(
      createEmpleadoDataFormInitialValue(createEmpleado()),
    );

    empleadoForm.password().value.set('secreto');

    expect(empleadoForm().invalid()).toBe(true);

    empleadoForm.confirmPassword().value.set('otra');

    expect(empleadoForm().invalid()).toBe(true);

    empleadoForm.confirmPassword().value.set('secreto');

    expect(empleadoForm().invalid()).toBe(false);
  });

  it('no permite introducir solo la confirmación en edición', (): void => {
    const empleadoForm: FieldTree<EmpleadoDataFormModel> = createForm(
      createEmpleadoDataFormInitialValue(createEmpleado()),
    );

    empleadoForm.confirmPassword().value.set('secreto');

    expect(empleadoForm().invalid()).toBe(true);
  });

  it('rechaza un color que no tenga formato hexadecimal completo', (): void => {
    const empleadoForm: FieldTree<EmpleadoDataFormModel> = createForm(
      createEmpleadoDataFormInitialValue(createEmpleado()),
    );

    empleadoForm.color().value.set('#123');

    expect(empleadoForm().invalid()).toBe(true);

    empleadoForm.color().value.set('#12ABef');

    expect(empleadoForm().invalid()).toBe(false);
  });

  it('rechaza nombres vacíos o formados solo por espacios', (): void => {
    const empleadoForm: FieldTree<EmpleadoDataFormModel> = createForm(
      createEmpleadoDataFormInitialValue(createEmpleado()),
    );

    empleadoForm.nombre().value.set('   ');

    expect(empleadoForm().invalid()).toBe(true);
  });
});

function createForm(initialValue: EmpleadoDataFormModel): FieldTree<EmpleadoDataFormModel> {
  const model: WritableSignal<EmpleadoDataFormModel> = signal<EmpleadoDataFormModel>(initialValue);

  return TestBed.runInInjectionContext((): FieldTree<EmpleadoDataFormModel> =>
    form(model, empleadoDataFormSchema),
  );
}

function createEmpleado(): Empleado {
  const empleado: Empleado = new Empleado();

  empleado.id = 1;
  empleado.publicId = 'empleado-1';
  empleado.nombre = 'Iñigo';
  empleado.hasPassword = true;
  empleado.color = '#336699';
  empleado.admin = false;
  empleado.permisos = [20, 21];

  return empleado;
}
