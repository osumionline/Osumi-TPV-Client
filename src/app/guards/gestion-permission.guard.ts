import { inject } from '@angular/core';
import type { ActivatedRouteSnapshot, CanActivateFn, UrlTree } from '@angular/router';
import { Router } from '@angular/router';
import type Empleado from '@model/empleados/empleado.model';
import EmpleadosService from '@services/empleados/empleados.service';
import GestionSessionService from '@services/gestion/gestion-session.service';

/**
 * Comprueba que exista una sesión válida de Gestión y que
 * el empleado autenticado disponga de alguno de los permisos
 * requeridos por la ruta.
 */
const gestionPermissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
): boolean | UrlTree => {
  const router: Router = inject(Router);
  const empleadosService: EmpleadosService = inject(EmpleadosService);
  const gestionSessionService: GestionSessionService = inject(GestionSessionService);

  if (!gestionSessionService.isActive()) {
    return router.parseUrl('/gestion');
  }

  const empleadoId: number | null = gestionSessionService.empleadoId();

  if (empleadoId === null) {
    return router.parseUrl('/gestion');
  }

  const empleado: Empleado | null = empleadosService.findById(empleadoId);

  if (empleado === null) {
    gestionSessionService.logout();

    return router.parseUrl('/gestion');
  }

  const requiredPermissions: readonly number[] | undefined = route.data['requiredPermissions'] as
    readonly number[] | undefined;

  if (requiredPermissions === undefined || requiredPermissions.length === 0) {
    return router.parseUrl('/gestion');
  }

  if (!empleado.hasAnyPerm(requiredPermissions)) {
    return router.parseUrl('/gestion');
  }

  return true;
};

export default gestionPermissionGuard;
