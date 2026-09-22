import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';

export default interface CrearEmpleadoRecordCommand {
  readonly nombre: string;

  /**
   * Hash scrypt de la contraseña obligatoria.
   */
  readonly passwordHash: string;

  /**
   * Color hexadecimal normalizado sin #.
   */
  readonly color: string;

  readonly permisos: readonly PermissionId[];
}
