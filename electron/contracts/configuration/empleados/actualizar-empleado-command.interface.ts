import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';

export default interface ActualizarEmpleadoCommand {
  readonly nombre: string;

  /**
   * Nueva contraseña.
   *
   * null conserva la contraseña actualmente almacenada.
   */
  readonly password: string | null;

  readonly color: string;
  readonly permisos: readonly PermissionId[];
}
