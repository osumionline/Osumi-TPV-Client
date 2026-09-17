import Empleado from '@model/empleados/empleado.model';

describe('Empleado', (): void => {
  describe('hasPerm', (): void => {
    it('debe devolver true cuando el empleado tiene el permiso', (): void => {
      const empleado: Empleado = new Empleado();
      empleado.permisos = [18, 20];

      expect(empleado.hasPerm(18)).toBe(true);
    });

    it('debe devolver false cuando el empleado no tiene el permiso', (): void => {
      const empleado: Empleado = new Empleado();
      empleado.permisos = [18, 20];

      expect(empleado.hasPerm(19)).toBe(false);
    });

    it('debe devolver true para cualquier permiso si el empleado es administrador', (): void => {
      const empleado: Empleado = new Empleado();
      empleado.admin = true;
      empleado.permisos = [];

      expect(empleado.hasPerm(18)).toBe(true);
      expect(empleado.hasPerm(25)).toBe(true);
    });
  });

  describe('hasAnyPerm', (): void => {
    it('debe devolver true cuando el empleado tiene al menos uno de los permisos', (): void => {
      const empleado: Empleado = new Empleado();
      empleado.permisos = [18, 20];

      expect(empleado.hasAnyPerm([19, 20, 21])).toBe(true);
    });

    it('debe devolver false cuando el empleado no tiene ninguno de los permisos', (): void => {
      const empleado: Empleado = new Empleado();
      empleado.permisos = [18, 20];

      expect(empleado.hasAnyPerm([21, 22, 23])).toBe(false);
    });

    it('debe devolver true para cualquier conjunto de permisos si el empleado es administrador', (): void => {
      const empleado: Empleado = new Empleado();
      empleado.admin = true;
      empleado.permisos = [];

      expect(empleado.hasAnyPerm([20, 21, 22, 23, 24])).toBe(true);
    });
  });
});
