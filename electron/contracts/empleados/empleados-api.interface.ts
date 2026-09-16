import type AutenticarEmpleadoCommand from '@desktop-contracts/empleados/autenticar-empleado-command.interface';
import type AutenticarEmpleadoResult from '@desktop-contracts/empleados/autenticar-empleado-result.type';
import type EmpleadoInterface from '@desktop-contracts/empleados/empleado.interface';

export default interface EmpleadosApi {
  getAll(): Promise<readonly EmpleadoInterface[]>;

  /**
   * Comprueba las credenciales de un empleado activo.
   */
  authenticate(command: AutenticarEmpleadoCommand): Promise<AutenticarEmpleadoResult>;
}
