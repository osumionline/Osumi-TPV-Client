import type { Route } from '@angular/router';
import { GESTION_PERMISSIONS } from '@constants/gestion-permissions.constants';
import gestionPermissionGuard from '@guards/gestion-permission.guard';
import gestionRoutes from '@modules/gestion/gestion.routes';

describe('gestionRoutes', (): void => {
  it('protege Ajustes con gestion.ajustes', (): void => {
    const route: Route = requireManagementRoute('ajustes');

    expect(route.data?.['requiredPermissions']).toEqual([GESTION_PERMISSIONS.SETTINGS]);
    expect(route.canActivate).toContain(gestionPermissionGuard);
  });

  it('protege Tipos de pago con gestion.tipos_pago', (): void => {
    const route: Route = requireManagementRoute('tipos-pago');

    expect(route.data?.['requiredPermissions']).toEqual([GESTION_PERMISSIONS.PAYMENT_TYPES]);
    expect(route.canActivate).toContain(gestionPermissionGuard);
  });

  it('protege Empleados con gestion.empleados', (): void => {
    const route: Route = requireManagementRoute('empleados');

    expect(route.data?.['requiredPermissions']).toEqual([GESTION_PERMISSIONS.EMPLOYEES]);
    expect(route.canActivate).toContain(gestionPermissionGuard);
  });

  it('protege Copias de seguridad con gestion.copias_seguridad', (): void => {
    const route: Route = requireManagementRoute('copias-seguridad');

    expect(route.data?.['requiredPermissions']).toEqual([GESTION_PERMISSIONS.BACKUPS]);
    expect(route.canActivate).toContain(gestionPermissionGuard);
  });
});

/**
 * Obtiene una ruta hija concreta del área de Gestión.
 *
 * Detiene el test si la estructura esperada de rutas
 * deja de existir.
 */
function requireManagementRoute(path: string): Route {
  const shellRoute: Route | undefined = gestionRoutes.find(
    (route: Route): boolean => route.path === '',
  );

  if (shellRoute === undefined) {
    throw new Error('No se ha encontrado la ruta raíz de Gestión.');
  }

  const route: Route | undefined = shellRoute.children?.find(
    (childRoute: Route): boolean => childRoute.path === path,
  );

  if (route === undefined) {
    throw new Error(`No se ha encontrado la ruta de Gestión "${path}".`);
  }

  return route;
}
