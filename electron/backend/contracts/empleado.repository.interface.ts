import type EmpleadoRecord from '@backend/domain/empleados/empleado-record.interface';

export default interface EmpleadoRepository {
  findAll(): Promise<readonly EmpleadoRecord[]>;
}
