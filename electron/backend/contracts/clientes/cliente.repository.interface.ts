import type {
  ClienteTopVentaRecord,
  ClienteUltimaVentaRecord,
} from '@backend/contracts/clientes/cliente-estadisticas-record.interface';
import type CrearClienteRecordCommand from '@backend/contracts/clientes/crear-cliente-record-command.interface';
import type ClienteRecord from '@backend/domain/clientes/cliente-record.interface';

export default interface ClienteRepository {
  findAll(): Promise<readonly ClienteRecord[]>;

  existsActiveByDniCif(dniCif: string): Promise<boolean>;

  create(command: CrearClienteRecordCommand): Promise<ClienteRecord>;

  findUltimasVentas(publicId: string, limit: number): Promise<readonly ClienteUltimaVentaRecord[]>;

  findTopVentas(publicId: string, limit: number): Promise<readonly ClienteTopVentaRecord[]>;
}
