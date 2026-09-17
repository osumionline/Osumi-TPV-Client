import type ActualizarEmpleadoRecordCommand from '@backend/contracts/empleados/actualizar-empleado-record-command.interface';
import type CrearEmpleadoRecordCommand from '@backend/contracts/empleados/crear-empleado-record-command.interface';
import type EmpleadoAuthenticationRecord from '@backend/domain/empleados/empleado-authentication-record.interface';
import type EmpleadoRecord from '@backend/domain/empleados/empleado-record.interface';

export default interface EmpleadoRepository {
  /**
   * Obtiene todos los empleados activos visibles.
   */
  findAll(): Promise<readonly EmpleadoRecord[]>;

  /**
   * Obtiene un empleado activo por su identificador.
   */
  findById(idEmpleado: number): Promise<EmpleadoRecord | null>;

  /**
   * Comprueba si existe otro empleado activo
   * con el nombre indicado.
   */
  existsActiveByName(nombre: string, excludeId: number | null): Promise<boolean>;

  /**
   * Cuenta los administradores activos.
   */
  countActiveAdmins(): Promise<number>;

  /**
   * Crea un empleado no administrador.
   */
  create(command: CrearEmpleadoRecordCommand): Promise<EmpleadoRecord>;

  /**
   * Actualiza un empleado activo sin modificar
   * su condición de administrador.
   */
  update(idEmpleado: number, command: ActualizarEmpleadoRecordCommand): Promise<EmpleadoRecord>;

  /**
   * Da de baja lógicamente un empleado.
   */
  deactivate(idEmpleado: number): Promise<void>;

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
