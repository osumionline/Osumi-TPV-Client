import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';
import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';

/**
 * Convierte un identificador de permiso de Osumi TPV legacy
 * en su equivalente en el catálogo actual.
 *
 * Los permisos legacy que ya no existen se descartan
 * devolviendo null.
 */
export default function mapLegacyEmployeePermission(permissionId: number): PermissionId | null {
  switch (permissionId) {
    case 1:
      return permissionKeys.ventas.modificarImportes;

    case 18:
      return permissionKeys.gestion.ajustes;

    case 19:
      return permissionKeys.gestion.tiposPago;

    case 20:
      return permissionKeys.gestion.empleados;

    case 25:
      return permissionKeys.gestion.copiasSeguridad;

    default:
      return null;
  }
}
