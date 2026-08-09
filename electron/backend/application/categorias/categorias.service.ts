import type CategoriaRepository from '@backend/contracts/categorias/categoria.repository.interface';
import type CategoriaRecord from '@backend/domain/categorias/categoria-record.interface';
import type CategoriaInterface from '@desktop-contracts/categorias/categoria.interface';

export default class CategoriasService {
  constructor(private readonly categoriaRepository: CategoriaRepository) {}

  async getAll(): Promise<readonly CategoriaInterface[]> {
    const categorias: readonly CategoriaRecord[] = await this.categoriaRepository.findAll();

    return categorias.map((categoria: CategoriaRecord): CategoriaInterface => ({
      id: categoria.id,
      publicId: categoria.publicId,
      idPadre: categoria.idPadre,
      nombre: categoria.nombre,
      orden: categoria.orden,
    }));
  }
}
