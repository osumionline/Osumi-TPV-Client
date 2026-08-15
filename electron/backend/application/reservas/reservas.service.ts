import type CrearReservaRecordCommand from '@backend/contracts/reservas/crear-reserva-record-command.interface';
import type { CrearReservaLineaRecordCommand } from '@backend/contracts/reservas/crear-reserva-record-command.interface';
import type ReservasRepository from '@backend/contracts/reservas/reservas.repository.interface';
import type ReservaRecord from '@backend/domain/reservas/reserva-record.interface';
import type { ReservaLineaRecord } from '@backend/domain/reservas/reserva-record.interface';
import type CrearReservaCommand from '@desktop-contracts/reservas/crear-reserva-command.interface';
import type { CrearReservaLineaCommand } from '@desktop-contracts/reservas/crear-reserva-command.interface';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import type { ReservaLineaInterface } from '@desktop-contracts/reservas/reserva.interface';

const MICROS_PER_CENT: number = 10_000;

export default class ReservasService {
  constructor(private readonly reservasRepository: ReservasRepository) {}

  /**
   * Crea una reserva después de normalizar y validar
   * todos sus datos económicos.
   */
  async create(command: CrearReservaCommand): Promise<string> {
    const clientePublicId: string = this.requirePublicId(command.clientePublicId);

    if (!Array.isArray(command.lineas) || command.lineas.length === 0) {
      throw new Error('La reserva debe contener al menos una línea.');
    }

    const lineas: CrearReservaLineaRecordCommand[] = command.lineas.map(
      (linea: CrearReservaLineaCommand): CrearReservaLineaRecordCommand =>
        this.normalizeCreateLinea(linea),
    );

    let totalCents: number = 0;

    for (const linea of lineas) {
      const nextTotal: number = totalCents + linea.importeCents;

      if (!Number.isSafeInteger(nextTotal)) {
        throw new RangeError('El total de la reserva supera el rango numérico seguro.');
      }

      totalCents = nextTotal;
    }

    const recordCommand: CrearReservaRecordCommand = {
      clientePublicId,
      totalCents,
      lineas,
    };

    return this.reservasRepository.create(recordCommand);
  }

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

  private normalizeCreateLinea(linea: CrearReservaLineaCommand): CrearReservaLineaRecordCommand {
    const nombre: string = linea.nombre.trim();

    if (nombre.length === 0 || nombre.length > 200) {
      throw new Error('El nombre de una línea de reserva debe contener entre 1 y 200 caracteres.');
    }

    if (!Number.isSafeInteger(linea.unidades) || linea.unidades <= 0) {
      throw new RangeError(
        'Las unidades de una línea de reserva deben ser un entero mayor que cero.',
      );
    }

    this.requireNonNegativeMicros(linea.pucMicros, 'PUC de la línea de reserva');

    this.requireValidBps(linea.ivaBps, 'IVA');

    this.requireValidBps(linea.descuentoBps, 'descuento');

    let articuloPublicId: string | null = null;

    if (linea.articuloPublicId !== null) {
      articuloPublicId = this.requirePublicId(linea.articuloPublicId);
    }

    return {
      articuloPublicId,

      nombre,

      pucMicros: linea.pucMicros,

      pvpCents: this.microsToCents(linea.pvpMicros, 'PVP de la línea de reserva'),

      ivaBps: linea.ivaBps,

      importeCents: this.microsToCents(linea.importeMicros, 'importe de la línea de reserva'),

      descuentoBps: linea.descuentoBps,

      importeDescuentoCents: this.microsToCents(
        linea.importeDescuentoMicros,
        'descuento de la línea de reserva',
      ),

      unidades: linea.unidades,
    };
  }

  private requireNonNegativeMicros(value: number, fieldName: string): void {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`El ${fieldName} no es válido.`);
    }
  }

  private requireValidBps(value: number, fieldName: string): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 10_000) {
      throw new RangeError(`El ${fieldName} no es válido.`);
    }
  }

  private microsToCents(micros: number, fieldName: string): number {
    this.requireNonNegativeMicros(micros, fieldName);

    const cents: number = Math.round(micros / MICROS_PER_CENT);

    if (!Number.isSafeInteger(cents)) {
      throw new RangeError(`El ${fieldName} supera el rango numérico seguro.`);
    }

    return cents;
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
