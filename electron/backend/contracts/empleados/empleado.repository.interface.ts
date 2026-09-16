import type EmpleadoAuthenticationRecord from '@backend/domain/empleados/empleado-authentication-record.interface';
import type EmpleadoRecord from '@backend/domain/empleados/empleado-record.interface';

export default interface EmpleadoRepository {
  findAll(): Promise<readonly EmpleadoRecord[]>;

  /**
   * Obtiene exclusivamente los datos internos necesarios
   * para autenticar un empleado activo.
   */
  findAuthenticationById(idEmpleado: number): Promise<EmpleadoAuthenticationRecord | null>;

  /**
   * Sustituye un hash bcrypt legacy por uno scrypt siempre
   * que la credencial legacy no haya cambiado entretanto.
   */
  upgradeLegacyPassword(
    idEmpleado: number,
    expectedLegacyHash: string,
    newScryptHash: string,
  ): Promise<void>;
}
