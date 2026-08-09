import type CategoriaInterface from '@desktop-contracts/categorias/categoria.interface';

export default class Categoria {
  id: number | null = null;
  publicId: string | null = null;
  idPadre: number | null = null;
  nombre: string = '';
  orden: number = 0;

  profundidad: number = 0;
  hijos: Categoria[] = [];

  fromInterface(categoria: CategoriaInterface): Categoria {
    this.id = categoria.id;
    this.publicId = categoria.publicId;
    this.idPadre = categoria.idPadre;
    this.nombre = categoria.nombre;
    this.orden = categoria.orden;

    return this;
  }

  toInterface(): CategoriaInterface {
    if (this.id === null || this.publicId === null) {
      throw new Error('No se puede convertir una categoría no persistida a CategoriaInterface.');
    }

    return {
      id: this.id,
      publicId: this.publicId,
      idPadre: this.idPadre,
      nombre: this.nombre,
      orden: this.orden,
    };
  }
}
