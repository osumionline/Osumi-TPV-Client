import type { ComercialInterface } from '@desktop-contracts/proveedores/proveedor.interface';

export default class Comercial {
  id: number | null = null;
  publicId: string | null = null;
  idProveedor: number | null = null;
  nombre: string = '';
  telefono: string | null = null;
  email: string | null = null;
  observaciones: string | null = null;

  fromInterface(comercial: ComercialInterface): Comercial {
    this.id = comercial.id;
    this.publicId = comercial.publicId;
    this.idProveedor = comercial.idProveedor;
    this.nombre = comercial.nombre;
    this.telefono = comercial.telefono;
    this.email = comercial.email;
    this.observaciones = comercial.observaciones;

    return this;
  }

  toInterface(): ComercialInterface {
    if (this.id === null || this.publicId === null || this.idProveedor === null) {
      throw new Error('No se puede convertir un comercial no persistido a ComercialInterface.');
    }

    return {
      id: this.id,
      publicId: this.publicId,
      idProveedor: this.idProveedor,
      nombre: this.nombre,
      telefono: this.telefono,
      email: this.email,
      observaciones: this.observaciones,
    };
  }
}
