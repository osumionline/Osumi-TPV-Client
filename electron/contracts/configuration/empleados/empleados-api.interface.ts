import type ActualizarEmpleadoCommand from '@desktop-contracts/configuration/empleados/actualizar-empleado-command.interface';
import type AutenticarEmpleadoCommand from '@desktop-contracts/configuration/empleados/autenticar-empleado-command.interface';
import type AutenticarEmpleadoResult from '@desktop-contracts/configuration/empleados/autenticar-empleado-result.type';
import type CrearEmpleadoCommand from '@desktop-contracts/configuration/empleados/crear-empleado-command.interface';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';

export default interface EmpleadosApi {
  /**
   * Obtiene todos los empleados activos.
   */
  getAll(): Promise<readonly EmpleadoInterface[]>;

  /**
   * Comprueba las credenciales de un empleado activo.
   */
  authenticate(command: AutenticarEmpleadoCommand): Promise<AutenticarEmpleadoResult>;

  /**
   * Crea un nuevo empleado.
   */
  create(command: CrearEmpleadoCommand): Promise<EmpleadoInterface>;

  /**
   * Actualiza un empleado activo.
   */
  update(idEmpleado: number, command: ActualizarEmpleadoCommand): Promise<EmpleadoInterface>;

  /**
   * Da de baja lógicamente un empleado activo.
   */
  deactivate(idEmpleado: number): Promise<void>;
}
