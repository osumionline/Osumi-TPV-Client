import type CrearReservaRecordCommand from '@backend/contracts/reservas/crear-reserva-record-command.interface';
import type ReservaRecord from '@backend/domain/reservas/reserva-record.interface';

export default interface ReservasRepository {
  create(command: CrearReservaRecordCommand): Promise<string>;

  findAllActive(): Promise<readonly ReservaRecord[]>;

  deleteLinea(publicId: string): Promise<boolean>;

  deleteReserva(publicId: string): Promise<boolean>;
}
