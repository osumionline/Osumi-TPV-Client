import type EmpleadoRepository from '@backend/contracts/empleado.repository.interface';
import type EmpleadoRecord from '@backend/domain/empleados/empleado-record.interface';

import type EmpleadoInterface from '@desktop-contracts/empleados/empleado.interface';

export default class EmpleadosService {
  constructor(private readonly empleadoRepository: EmpleadoRepository) {}

  async getAll(): Promise<readonly EmpleadoInterface[]> {
    const empleados: readonly EmpleadoRecord[] = await this.empleadoRepository.findAll();

    return empleados.map((empleado: EmpleadoRecord): EmpleadoInterface => ({
      id: empleado.id,
      publicId: empleado.publicId,
      nombre: empleado.nombre,
      hasPassword: empleado.hasPassword,
      color: `#${empleado.color}`,
      admin: empleado.admin,
      permisos: [...empleado.permisos],
    }));
  }
}
