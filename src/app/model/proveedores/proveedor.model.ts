import type {
  ComercialInterface,
  ProveedorInterface,
} from '@desktop-contracts/proveedores/proveedor.interface';
import Comercial from '@model/proveedores/comercial.model';

export default class Proveedor {
  id: number | null = null;
  publicId: string | null = null;
  nombre: string = '';
  foto: string | null = null;
  direccion: string | null = null;
  telefono: string | null = null;
  email: string | null = null;
  web: string | null = null;
  observaciones: string | null = null;
  marcas: number[] = [];
  comerciales: Comercial[] = [];

  fromInterface(proveedor: ProveedorInterface): Proveedor {
    this.id = proveedor.id;
    this.publicId = proveedor.publicId;
    this.nombre = proveedor.nombre;
    this.foto = proveedor.foto;
    this.direccion = proveedor.direccion;
    this.telefono = proveedor.telefono;
    this.email = proveedor.email;
    this.web = proveedor.web;
    this.observaciones = proveedor.observaciones;
    this.marcas = [...proveedor.marcas];
    this.comerciales = proveedor.comerciales.map((comercial: ComercialInterface): Comercial =>
      new Comercial().fromInterface(comercial),
    );

    return this;
  }

  toInterface(): ProveedorInterface {
    if (this.id === null || this.publicId === null) {
      throw new Error('No se puede convertir un proveedor no persistido a ProveedorInterface.');
    }

    return {
      id: this.id,
      publicId: this.publicId,
      nombre: this.nombre,
      foto: this.foto,
      direccion: this.direccion,
      telefono: this.telefono,
      email: this.email,
      web: this.web,
      observaciones: this.observaciones,
      marcas: [...this.marcas],
      comerciales: this.comerciales.map((comercial: Comercial): ComercialInterface =>
        comercial.toInterface(),
      ),
    };
  }
}
