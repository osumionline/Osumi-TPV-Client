import type ReservasRepository from '@backend/contracts/reservas/reservas.repository.interface';
import type ReservaRecord from '@backend/domain/reservas/reserva-record.interface';
import type { ReservaLineaRecord } from '@backend/domain/reservas/reserva-record.interface';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import type { ReservaLineaInterface } from '@desktop-contracts/reservas/reserva.interface';

const MICROS_PER_CENT: number = 10_000;

export default class ReservasService {
  constructor(private readonly reservasRepository: ReservasRepository) {}

  /**
   * Devuelve todas las reservas activas.
   */
  async getAll(): Promise<readonly ReservaInterface[]> {
    const reservas: readonly ReservaRecord[] = await this.reservasRepository.findAllActive();

    return reservas.map((reserva: ReservaRecord): ReservaInterface => ({
      id: reserva.id,
      publicId: reserva.publicId,

      idCliente: reserva.idCliente,

      clientePublicId: reserva.clientePublicId,

      clienteNombre: reserva.clienteNombre,

      totalMicros: this.centsToMicros(reserva.totalCents, 'total de la reserva'),

      fecha: reserva.fecha,

      lineas: reserva.lineas.map((linea: ReservaLineaRecord): ReservaLineaInterface => ({
        id: linea.id,
        publicId: linea.publicId,

        idArticulo: linea.idArticulo,

        articuloPublicId: linea.articuloPublicId,

        localizador: linea.localizador,

        marca: linea.marca,

        nombre: linea.nombre,

        pucMicros: linea.pucMicros,

        pvpMicros: this.centsToMicros(linea.pvpCents, 'PVP de la línea de reserva'),

        ivaBps: linea.ivaBps,

        importeMicros: this.centsToMicros(linea.importeCents, 'importe de la línea de reserva'),

        descuentoBps: linea.descuentoBps,

        importeDescuentoMicros: this.centsToMicros(
          linea.importeDescuentoCents,
          'descuento de la línea de reserva',
        ),

        unidades: linea.unidades,
      })),
    }));
  }

  /**
   * Elimina una línea y recupera su stock.
   */
  async deleteLinea(publicId: string): Promise<void> {
    const normalizedPublicId: string = this.requirePublicId(publicId);

    const deleted: boolean = await this.reservasRepository.deleteLinea(normalizedPublicId);

    if (!deleted) {
      throw new Error('La línea de reserva indicada no existe o ya no está activa.');
    }
  }

  /**
   * Cancela una reserva y recupera todo su stock.
   */
  async deleteReserva(publicId: string): Promise<void> {
    const normalizedPublicId: string = this.requirePublicId(publicId);

    const deleted: boolean = await this.reservasRepository.deleteReserva(normalizedPublicId);

    if (!deleted) {
      throw new Error('La reserva indicada no existe o ya no está activa.');
    }
  }

  private requirePublicId(publicId: string): string {
    const normalizedPublicId: string = publicId.trim();

    if (normalizedPublicId.length === 0) {
      throw new Error('El identificador de la reserva no es válido.');
    }

    return normalizedPublicId;
  }

  private centsToMicros(cents: number, fieldName: string): number {
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new RangeError(`El ${fieldName} no es válido.`);
    }

    const micros: number = cents * MICROS_PER_CENT;

    if (!Number.isSafeInteger(micros)) {
      throw new RangeError(`El ${fieldName} supera el rango numérico seguro.`);
    }

    return micros;
  }
}
