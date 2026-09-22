import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';
import Empleado from '@model/empleados/empleado.model';

describe('Empleado', (): void => {
  describe('hasPerm', (): void => {
    it('debe devolver true cuando el empleado tiene el permiso', (): void => {
      const empleado: Empleado = new Empleado();

      empleado.permisos = [permissionKeys.gestion.ajustes, permissionKeys.gestion.empleados];

      expect(empleado.hasPerm(permissionKeys.gestion.ajustes)).toBe(true);
    });

    it('debe devolver false cuando el empleado no tiene el permiso', (): void => {
      const empleado: Empleado = new Empleado();

      empleado.permisos = [permissionKeys.gestion.ajustes, permissionKeys.gestion.empleados];

      expect(empleado.hasPerm(permissionKeys.gestion.tiposPago)).toBe(false);
    });

    it('debe devolver true para cualquier permiso si el empleado es administrador', (): void => {
      const empleado: Empleado = new Empleado();

      empleado.admin = true;
      empleado.permisos = [];

      expect(empleado.hasPerm(permissionKeys.ventas.modificarImportes)).toBe(true);

      expect(empleado.hasPerm(permissionKeys.gestion.copiasSeguridad)).toBe(true);
    });
  });

  describe('hasAnyPerm', (): void => {
    it('debe devolver true cuando el empleado tiene al menos uno de los permisos', (): void => {
      const empleado: Empleado = new Empleado();

      empleado.permisos = [permissionKeys.gestion.ajustes, permissionKeys.gestion.empleados];

      expect(
        empleado.hasAnyPerm([
          permissionKeys.gestion.tiposPago,
          permissionKeys.gestion.empleados,
          permissionKeys.gestion.copiasSeguridad,
        ]),
      ).toBe(true);
    });

    it('debe devolver false cuando el empleado no tiene ninguno de los permisos', (): void => {
      const empleado: Empleado = new Empleado();

      empleado.permisos = [permissionKeys.gestion.ajustes, permissionKeys.gestion.empleados];

      expect(
        empleado.hasAnyPerm([
          permissionKeys.gestion.tiposPago,
          permissionKeys.gestion.copiasSeguridad,
        ]),
      ).toBe(false);
    });

    it('debe devolver true para cualquier conjunto de permisos si el empleado es administrador', (): void => {
      const empleado: Empleado = new Empleado();

      empleado.admin = true;
      empleado.permisos = [];

      expect(
        empleado.hasAnyPerm([
          permissionKeys.ventas.modificarImportes,
          permissionKeys.gestion.ajustes,
          permissionKeys.gestion.tiposPago,
          permissionKeys.gestion.empleados,
          permissionKeys.gestion.copiasSeguridad,
        ]),
      ).toBe(true);
    });
  });
});
