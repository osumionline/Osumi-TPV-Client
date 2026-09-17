import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';

export default class Empleado {
  id: number | null = null;
  publicId: string | null = null;
  nombre: string = '';
  hasPassword: boolean = false;
  color: string = '#000000';
  admin: boolean = false;
  permisos: number[] = [];

  get textColor(): string {
    const normalizedColor: string = this.color.replace(/^#/, '');

    if (!/^[0-9a-fA-F]{6}$/.test(normalizedColor)) {
      return '#000000';
    }

    const red: number = Number.parseInt(normalizedColor.slice(0, 2), 16);

    const green: number = Number.parseInt(normalizedColor.slice(2, 4), 16);

    const blue: number = Number.parseInt(normalizedColor.slice(4, 6), 16);

    const brightness: number = Math.round((red * 299 + green * 587 + blue * 114) / 1000);

    return brightness > 125 ? '#000000' : '#ffffff';
  }

  fromInterface(empleado: EmpleadoInterface): Empleado {
    this.id = empleado.id;
    this.publicId = empleado.publicId;
    this.nombre = empleado.nombre;
    this.hasPassword = empleado.hasPassword;
    this.color = empleado.color;
    this.admin = empleado.admin;
    this.permisos = [...empleado.permisos];

    return this;
  }

  toInterface(): EmpleadoInterface {
    if (this.id === null || this.publicId === null) {
      throw new Error('No se puede convertir un empleado no persistido a EmpleadoInterface.');
    }

    return {
      id: this.id,
      publicId: this.publicId,
      nombre: this.nombre,
      hasPassword: this.hasPassword,
      color: this.color,
      admin: this.admin,
      permisos: [...this.permisos],
    };
  }

  /**
   * Indica si el empleado dispone de un permiso.
   * Los administradores tienen acceso completo.
   */
  hasPerm(permiso: number): boolean {
    return this.admin || this.permisos.includes(permiso);
  }

  /**
   * Indica si el empleado dispone de al menos uno de los permisos indicados.
   * Los administradores tienen acceso completo.
   */
  hasAnyPerm(permisos: readonly number[]): boolean {
    return (
      this.admin || permisos.some((permiso: number): boolean => this.permisos.includes(permiso))
    );
  }
}
