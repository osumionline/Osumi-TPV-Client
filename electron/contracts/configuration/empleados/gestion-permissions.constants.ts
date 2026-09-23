import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';

export const GESTION_PERMISSIONS = {
  SETTINGS: permissionKeys.gestion.ajustes,
  PAYMENT_TYPES: permissionKeys.gestion.tiposPago,
  EMPLOYEES: permissionKeys.gestion.empleados,
  BACKUPS: permissionKeys.gestion.copiasSeguridad,
} as const;
