import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';

export default interface ActualizarEmpleadoRecordCommand {
  readonly nombre: string;

  /**
   * Nuevo hash scrypt.
   *
   * null conserva la contraseña actualmente almacenada.
   */
  readonly passwordHash: string | null;

  readonly color: string;
  readonly permisos: readonly PermissionId[];
}
