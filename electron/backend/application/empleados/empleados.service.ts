import type EmpleadoRepository from '@backend/contracts/empleados/empleado.repository.interface';
import type LegacyPasswordVerifier from '@backend/contracts/security/legacy-password-verifier.interface';
import type PasswordHasher from '@backend/contracts/security/password-hasher.interface';
import type EmpleadoAuthenticationRecord from '@backend/domain/empleados/empleado-authentication-record.interface';
import type EmpleadoRecord from '@backend/domain/empleados/empleado-record.interface';
import type AutenticarEmpleadoCommand from '@desktop-contracts/empleados/autenticar-empleado-command.interface';
import type AutenticarEmpleadoResult from '@desktop-contracts/empleados/autenticar-empleado-result.type';
import type EmpleadoInterface from '@desktop-contracts/empleados/empleado.interface';

export default class EmpleadosService {
  constructor(
    private readonly repository: EmpleadoRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly legacyPasswordVerifier: LegacyPasswordVerifier,
  ) {}

  /**
   * Obtiene todos los empleados activos visibles.
   */
  async getAll(): Promise<readonly EmpleadoInterface[]> {
    const records: readonly EmpleadoRecord[] = await this.repository.findAll();

    return records.map((record: EmpleadoRecord): EmpleadoInterface => this.toInterface(record));
  }

  /**
   * Comprueba las credenciales de un empleado activo.
   */
  async authenticate(command: AutenticarEmpleadoCommand): Promise<AutenticarEmpleadoResult> {
    this.validateAuthenticationCommand(command);

    const record: EmpleadoAuthenticationRecord | null =
      await this.repository.findAuthenticationById(command.idEmpleado);

    if (record === null) {
      return {
        status: 'employee_unavailable',
      };
    }

    if (!record.passwordAvailable) {
      return {
        status: 'password_unavailable',
      };
    }

    if (command.password.length === 0) {
      return {
        status: 'invalid_password',
      };
    }

    const valid: boolean = await this.verifyPassword(command.password, record);

    if (!valid) {
      return {
        status: 'invalid_password',
      };
    }

    if (record.passwordAlgorithm === 'bcrypt_legacy') {
      await this.migrateLegacyPassword(command.password, record);
    }

    return {
      status: 'authenticated',
    };
  }

  /**
   * Valida la estructura básica de una petición de autenticación.
   */
  private validateAuthenticationCommand(command: AutenticarEmpleadoCommand): void {
    if (!Number.isSafeInteger(command.idEmpleado) || command.idEmpleado <= 0) {
      throw new Error('El empleado seleccionado no es válido.');
    }

    if (typeof command.password !== 'string') {
      throw new Error('La contraseña indicada no es válida.');
    }
  }

  /**
   * Comprueba una contraseña usando el algoritmo persistido.
   */
  private async verifyPassword(
    password: string,
    record: EmpleadoAuthenticationRecord,
  ): Promise<boolean> {
    switch (record.passwordAlgorithm) {
      case 'scrypt':
        return this.passwordHasher.verify(password, record.passwordHash);

      case 'bcrypt_legacy':
        return this.legacyPasswordVerifier.verify(password, record.passwordHash);
    }
  }

  /**
   * Convierte de forma transparente una contraseña bcrypt
   * válida al algoritmo scrypt actual.
   */
  private async migrateLegacyPassword(
    password: string,
    record: EmpleadoAuthenticationRecord,
  ): Promise<void> {
    const newHash: string = await this.passwordHasher.hash(password);

    await this.repository.upgradeLegacyPassword(record.id, record.passwordHash, newHash);
  }

  /**
   * Convierte el record interno al contrato público.
   */
  private toInterface(empleado: EmpleadoRecord): EmpleadoInterface {
    return {
      id: empleado.id,
      publicId: empleado.publicId,
      nombre: empleado.nombre,
      hasPassword: empleado.hasPassword,
      color: `#${empleado.color}`,
      admin: empleado.admin,
      permisos: [...empleado.permisos],
    };
  }
}
