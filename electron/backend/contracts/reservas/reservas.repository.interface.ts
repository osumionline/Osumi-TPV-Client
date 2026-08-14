import type ReservaRecord from '@backend/domain/reservas/reserva-record.interface';

export default interface ReservasRepository {
  findAllActive(): Promise<readonly ReservaRecord[]>;

  deleteLinea(publicId: string): Promise<boolean>;

  deleteReserva(publicId: string): Promise<boolean>;
}
