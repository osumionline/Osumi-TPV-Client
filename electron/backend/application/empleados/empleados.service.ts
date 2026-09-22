import type ActualizarEmpleadoRecordCommand from '@backend/contracts/empleados/actualizar-empleado-record-command.interface';
import type CrearEmpleadoRecordCommand from '@backend/contracts/empleados/crear-empleado-record-command.interface';
import type EmpleadoRepository from '@backend/contracts/empleados/empleado.repository.interface';
import type LegacyPasswordVerifier from '@backend/contracts/security/legacy-password-verifier.interface';
import type PasswordHasher from '@backend/contracts/security/password-hasher.interface';
import type EmpleadoAuthenticationRecord from '@backend/domain/empleados/empleado-authentication-record.interface';
import type EmpleadoRecord from '@backend/domain/empleados/empleado-record.interface';
import PermissionsService from '@backend/domain/permissions/permission.service';
import type ActualizarEmpleadoCommand from '@desktop-contracts/configuration/empleados/actualizar-empleado-command.interface';
import type AutenticarEmpleadoCommand from '@desktop-contracts/configuration/empleados/autenticar-empleado-command.interface';
import type AutenticarEmpleadoResult from '@desktop-contracts/configuration/empleados/autenticar-empleado-result.type';
import type CrearEmpleadoCommand from '@desktop-contracts/configuration/empleados/crear-empleado-command.interface';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';

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
   * Crea un nuevo empleado no administrador.
   */
  async create(command: CrearEmpleadoCommand): Promise<EmpleadoInterface> {
    const nombre: string = this.normalizeName(command.nombre);

    const color: string = this.normalizeColor(command.color);

    const permisos: readonly PermissionId[] = this.normalizePermissions(command.permisos);

    if (await this.repository.existsActiveByName(nombre, null)) {
      throw new Error('Ya existe un empleado con ese nombre.');
    }

    const passwordHash: string = await this.resolveCreatePassword(command.password);

    const recordCommand: CrearEmpleadoRecordCommand = {
      nombre,
      color,
      passwordHash,
      permisos,
    };

    const empleado: EmpleadoRecord = await this.repository.create(recordCommand);

    return this.toInterface(empleado);
  }

  /**
   * Actualiza los datos de un empleado activo.
   *
   * Una contraseña null conserva la actualmente
   * almacenada. Una contraseña no vacía la sustituye.
   */
  async update(idEmpleado: number, command: ActualizarEmpleadoCommand): Promise<EmpleadoInterface> {
    this.validateEmployeeId(idEmpleado);

    const existing: EmpleadoRecord | null = await this.repository.findById(idEmpleado);

    if (existing === null) {
      throw new Error('El empleado indicado no existe.');
    }

    const nombre: string = this.normalizeName(command.nombre);

    const color: string = this.normalizeColor(command.color);

    const permisos: readonly PermissionId[] = this.normalizePermissions(command.permisos);

    if (await this.repository.existsActiveByName(nombre, idEmpleado)) {
      throw new Error('Ya existe otro empleado con ese nombre.');
    }

    const passwordHash: string | null = await this.resolveUpdatePassword(
      existing,
      command.password,
    );

    const recordCommand: ActualizarEmpleadoRecordCommand = {
      nombre,
      color,
      passwordHash,
      permisos,
    };

    const empleado: EmpleadoRecord = await this.repository.update(idEmpleado, recordCommand);

    return this.toInterface(empleado);
  }

  /**
   * Da de baja lógicamente un empleado activo.
   */
  async deactivate(idEmpleado: number): Promise<void> {
    this.validateEmployeeId(idEmpleado);

    const existing: EmpleadoRecord | null = await this.repository.findById(idEmpleado);

    if (existing === null) {
      throw new Error('El empleado indicado no existe.');
    }

    if (existing.admin && (await this.repository.countActiveAdmins()) <= 1) {
      throw new Error('No se puede eliminar el último administrador de la aplicación.');
    }

    await this.repository.deactivate(idEmpleado);
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

  private readonly availablePermissionIds: ReadonlySet<PermissionId> = new Set<PermissionId>(
    new PermissionsService().getAllRoleIds(),
  );

  private validateEmployeeId(idEmpleado: number): void {
    if (!Number.isSafeInteger(idEmpleado) || idEmpleado <= 0) {
      throw new Error('El empleado indicado no es válido.');
    }
  }

  private normalizeName(nombre: string): string {
    if (typeof nombre !== 'string') {
      throw new Error('El nombre del empleado no es válido.');
    }

    const normalized: string = nombre.trim();

    if (normalized.length === 0 || normalized.length > 100) {
      throw new Error('El nombre del empleado debe tener entre 1 y 100 caracteres.');
    }

    return normalized;
  }

  private normalizeColor(color: string): string {
    if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error('El color del empleado no es válido.');
    }

    return color.substring(1).toUpperCase();
  }

  private normalizePermissions(permisos: readonly PermissionId[]): readonly PermissionId[] {
    if (!Array.isArray(permisos)) {
      throw new Error('Los permisos del empleado no son válidos.');
    }

    const normalized: PermissionId[] = [];

    for (const permiso of permisos) {
      if (!this.availablePermissionIds.has(permiso)) {
        throw new Error('Los permisos del empleado no son válidos.');
      }

      if (!normalized.includes(permiso)) {
        normalized.push(permiso);
      }
    }

    return normalized.sort((first: PermissionId, second: PermissionId): number =>
      first.localeCompare(second),
    );
  }

  private async resolveCreatePassword(password: string): Promise<string> {
    if (typeof password !== 'string' || password.length === 0) {
      throw new Error('Debes indicar una contraseña para el empleado.');
    }

    return this.passwordHasher.hash(password);
  }

  private async resolveUpdatePassword(
    existing: EmpleadoRecord,
    password: string | null,
  ): Promise<string | null> {
    if (password === null) {
      /*
       * Durante la transición legacy todavía podemos
       * encontrarnos con empleados importados que no
       * tengan una contraseña utilizable.
       *
       * No permitimos guardar otros cambios sobre ellos
       * sin asignar antes una contraseña.
       */
      if (!existing.hasPassword) {
        throw new Error('Debes indicar una contraseña para este empleado.');
      }

      return null;
    }

    if (typeof password !== 'string' || password.length === 0) {
      throw new Error('La nueva contraseña no puede estar vacía.');
    }

    return this.passwordHasher.hash(password);
  }

  /**
   * Valida la estructura básica de una petición
   * de autenticación.
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
   * Comprueba una contraseña usando
   * el algoritmo persistido.
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
   * Convierte de forma transparente una contraseña
   * bcrypt válida al algoritmo scrypt actual.
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
