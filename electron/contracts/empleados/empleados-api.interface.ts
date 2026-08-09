import type EmpleadoInterface from '@desktop-contracts/empleados/empleado.interface';

export default interface EmpleadosApi {
  getAll(): Promise<readonly EmpleadoInterface[]>;
}
