import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';

export default class Marca {
  id: number | null = null;
  publicId: string | null = null;
  nombre: string = '';
  direccion: string | null = null;
  foto: string | null = null;
  telefono: string | null = null;
  email: string | null = null;
  web: string | null = null;
  observaciones: string | null = null;

  fromInterface(marca: MarcaInterface): Marca {
    this.id = marca.id;
    this.publicId = marca.publicId;
    this.nombre = marca.nombre;
    this.direccion = marca.direccion;
    this.foto = marca.foto;
    this.telefono = marca.telefono;
    this.email = marca.email;
    this.web = marca.web;
    this.observaciones = marca.observaciones;

    return this;
  }

  toInterface(): MarcaInterface {
    if (this.id === null || this.publicId === null) {
      throw new Error('No se puede convertir una marca no persistida a MarcaInterface.');
    }

    return {
      id: this.id,
      publicId: this.publicId,
      nombre: this.nombre,
      direccion: this.direccion,
      foto: this.foto,
      telefono: this.telefono,
      email: this.email,
      web: this.web,
      observaciones: this.observaciones,
    };
  }
}
