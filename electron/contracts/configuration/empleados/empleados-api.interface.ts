import type AutenticarEmpleadoCommand from '@desktop-contracts/configuration/empleados/autenticar-empleado-command.interface';
import type AutenticarEmpleadoResult from '@desktop-contracts/configuration/empleados/autenticar-empleado-result.type';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';

export default interface EmpleadosApi {
  getAll(): Promise<readonly EmpleadoInterface[]>;

  /**
   * Comprueba las credenciales de un empleado activo.
   */
  authenticate(command: AutenticarEmpleadoCommand): Promise<AutenticarEmpleadoResult>;
}
