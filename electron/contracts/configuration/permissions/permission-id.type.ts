import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';

type PermissionId =
  | typeof permissionKeys.ventas.modificarImportes
  | typeof permissionKeys.gestion.ajustes
  | typeof permissionKeys.gestion.tiposPago
  | typeof permissionKeys.gestion.empleados
  | typeof permissionKeys.gestion.copiasSeguridad;

export default PermissionId;
