import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';

export default interface ReservasApi {
  getAll(): Promise<readonly ReservaInterface[]>;

  deleteLinea(publicId: string): Promise<void>;

  deleteReserva(publicId: string): Promise<void>;
}
