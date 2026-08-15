import type CrearReservaCommand from '@desktop-contracts/reservas/crear-reserva-command.interface';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';

export default interface ReservasApi {
  create(command: CrearReservaCommand): Promise<string>;

  getAll(): Promise<readonly ReservaInterface[]>;

  deleteLinea(publicId: string): Promise<void>;

  deleteReserva(publicId: string): Promise<void>;
}
