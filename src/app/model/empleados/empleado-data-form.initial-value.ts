import type { EmpleadoDataFormModel } from '@model/empleados/empleado-data-form.model';
import type Empleado from '@model/empleados/empleado.model';

const DEFAULT_EMPLOYEE_COLOR: string = '#3f51b5';

/**
 * Crea los valores iniciales del formulario
 * de datos de un empleado.
 *
 * Un empleado null representa un alta nueva.
 * En edición nunca se carga la contraseña almacenada.
 */
export default function createEmpleadoDataFormInitialValue(
  empleado: Empleado | null,
): EmpleadoDataFormModel {
  if (empleado === null) {
    return {
      mode: 'create',
      nombre: '',
      password: '',
      confirmPassword: '',
      color: DEFAULT_EMPLOYEE_COLOR,
    };
  }

  return {
    mode: 'edit',
    nombre: empleado.nombre,
    password: '',
    confirmPassword: '',
    color: empleado.color,
  };
}
