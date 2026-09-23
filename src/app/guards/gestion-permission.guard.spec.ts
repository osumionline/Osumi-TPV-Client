import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';
import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';
import gestionPermissionGuard from '@guards/gestion-permission.guard';
import Empleado from '@model/empleados/empleado.model';
import EmpleadosService from '@services/empleados/empleados.service';
import GestionSessionService from '@services/gestion/gestion-session.service';

const MANAGEMENT_PERMISSIONS: readonly PermissionId[] = [
  permissionKeys.gestion.ajustes,
  permissionKeys.gestion.tiposPago,
  permissionKeys.gestion.empleados,
  permissionKeys.gestion.copiasSeguridad,
];

describe('gestionPermissionGuard', (): void => {
  let sessionActive: boolean;
  let sessionEmpleadoId: number | null;
  let empleado: Empleado | null;
  let logoutSpy: ReturnType<typeof vi.fn>;

  beforeEach((): void => {
    sessionActive = true;
    sessionEmpleadoId = 1;
    empleado = createEmpleado(MANAGEMENT_PERMISSIONS);
    logoutSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: GestionSessionService,
          useValue: {
            isActive: (): boolean => sessionActive,
            empleadoId: (): number | null => sessionEmpleadoId,
            logout: logoutSpy,
          },
        },
        {
          provide: EmpleadosService,
          useValue: {
            findById: (empleadoId: number): Empleado | null =>
              empleado?.id === empleadoId ? empleado : null,
          },
        },
      ],
    });
  });

  afterEach((): void => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('permite cada módulo únicamente con su permiso correspondiente', (): void => {
    for (const permission of MANAGEMENT_PERMISSIONS) {
      empleado = createEmpleado([permission]);

      expect(runGuard([permission])).toBe(true);
    }
  });

  it('rechaza el acceso si el empleado tiene un permiso distinto', (): void => {
    empleado = createEmpleado([permissionKeys.gestion.ajustes]);

    const result: boolean | UrlTree = runGuard([permissionKeys.gestion.tiposPago]);

    expect(result).not.toBe(true);
    expect(String(result)).toBe('/gestion');
  });

  it('permite a un administrador acceder sin permisos explícitos', (): void => {
    empleado = createEmpleado([], true);

    for (const permission of MANAGEMENT_PERMISSIONS) {
      expect(runGuard([permission])).toBe(true);
    }
  });

  it('rechaza el acceso si no existe una sesión activa de Gestión', (): void => {
    sessionActive = false;

    const result: boolean | UrlTree = runGuard([permissionKeys.gestion.ajustes]);

    expect(result).not.toBe(true);
    expect(String(result)).toBe('/gestion');
  });

  it('cierra una sesión cuyo empleado ya no está disponible', (): void => {
    empleado = null;

    const result: boolean | UrlTree = runGuard([permissionKeys.gestion.empleados]);

    expect(result).not.toBe(true);
    expect(String(result)).toBe('/gestion');
    expect(logoutSpy).toHaveBeenCalledOnce();
  });

  /**
   * Ejecuta el guard con los permisos requeridos
   * para una ruta concreta de Gestión.
   */
  function runGuard(requiredPermissions: readonly PermissionId[]): boolean | UrlTree {
    const route = {
      data: {
        requiredPermissions,
      },
    } as unknown as ActivatedRouteSnapshot;

    const state = {
      url: '/gestion/test',
    } as RouterStateSnapshot;

    return TestBed.runInInjectionContext(
      (): boolean | UrlTree => gestionPermissionGuard(route, state) as boolean | UrlTree,
    );
  }
});

/**
 * Crea un empleado para probar el acceso
 * a los distintos módulos de Gestión.
 */
function createEmpleado(permisos: readonly PermissionId[], admin: boolean = false): Empleado {
  const empleado: Empleado = new Empleado();

  empleado.id = 1;
  empleado.publicId = 'empleado-1';
  empleado.nombre = 'Empleado';
  empleado.hasPassword = true;
  empleado.color = '#336699';
  empleado.admin = admin;
  empleado.permisos = [...permisos];

  return empleado;
}
