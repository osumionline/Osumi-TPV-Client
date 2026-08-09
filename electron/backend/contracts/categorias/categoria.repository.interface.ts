import type CategoriaRecord from '@backend/domain/categorias/categoria-record.interface';

export default interface CategoriaRepository {
  findAll(): Promise<readonly CategoriaRecord[]>;
}
