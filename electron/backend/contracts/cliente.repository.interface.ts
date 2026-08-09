import type ClienteRecord from '@backend/domain/clientes/cliente-record.interface';

export default interface ClienteRepository {
  findAll(): Promise<readonly ClienteRecord[]>;
}
