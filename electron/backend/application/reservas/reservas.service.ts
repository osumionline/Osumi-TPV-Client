import { BASIS_POINTS_TOTAL } from '@backend/constants/percentage.constants';
import type CrearReservaRecordCommand from '@backend/contracts/reservas/crear-reserva-record-command.interface';
import type { CrearReservaLineaRecordCommand } from '@backend/contracts/reservas/crear-reserva-record-command.interface';
import type ReservasRepository from '@backend/contracts/reservas/reservas.repository.interface';
import type ReservaRecord from '@backend/domain/reservas/reserva-record.interface';
import type { ReservaLineaRecord } from '@backend/domain/reservas/reserva-record.interface';
import { centsToMicros, microsToCents } from '@backend/utils/money.utils';
import type CrearReservaCommand from '@desktop-contracts/reservas/crear-reserva-command.interface';
import type { CrearReservaLineaCommand } from '@desktop-contracts/reservas/crear-reserva-command.interface';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import type { ReservaLineaInterface } from '@desktop-contracts/reservas/reserva.interface';

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
      totalMicros: centsToMicros(
        this.requireNonNegativeInteger(reserva.totalCents, 'total de la reserva'),
      ),
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
        pvpMicros: centsToMicros(
          this.requireNonNegativeInteger(linea.pvpCents, 'PVP de la línea de reserva'),
        ),
        ivaBps: linea.ivaBps,
        importeMicros: centsToMicros(
          this.requireNonNegativeInteger(linea.importeCents, 'importe de la línea de reserva'),
        ),
        descuentoBps: linea.descuentoBps,
        importeDescuentoMicros: centsToMicros(
          this.requireNonNegativeInteger(
            linea.importeDescuentoCents,
            'descuento de la línea de reserva',
          ),
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

    this.requireValidBps(linea.ivaBps, 'IVA');
    this.requireValidBps(linea.descuentoBps, 'descuento');

    let articuloPublicId: string | null = null;

    if (linea.articuloPublicId !== null) {
      articuloPublicId = this.requirePublicId(linea.articuloPublicId);
    }

    return {
      articuloPublicId,
      nombre,
      pucMicros: this.requireNonNegativeInteger(linea.pucMicros, 'PUC de la línea de reserva'),
      pvpCents: microsToCents(
        this.requireNonNegativeInteger(linea.pvpMicros, 'PVP de la línea de reserva'),
      ),
      ivaBps: linea.ivaBps,
      importeCents: microsToCents(
        this.requireNonNegativeInteger(linea.importeMicros, 'importe de la línea de reserva'),
      ),
      descuentoBps: linea.descuentoBps,
      importeDescuentoCents: microsToCents(
        this.requireNonNegativeInteger(
          linea.importeDescuentoMicros,
          'descuento de la línea de reserva',
        ),
      ),
      unidades: linea.unidades,
    };
  }

  /**
   * Valida los enteros monetarios que por contrato
   * deben ser mayores o iguales que cero.
   *
   * La unidad concreta —cents o micros— no modifica
   * esta invariante.
   */
  private requireNonNegativeInteger(value: number, fieldName: string): number {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`El ${fieldName} no es válido.`);
    }

    return value;
  }

  private requireValidBps(value: number, fieldName: string): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > BASIS_POINTS_TOTAL) {
      throw new RangeError(`El ${fieldName} no es válido.`);
    }
  }

  private requirePublicId(publicId: string): string {
    const normalizedPublicId: string = publicId.trim();

    if (normalizedPublicId.length === 0) {
      throw new Error('El identificador de la reserva no es válido.');
    }

    return normalizedPublicId;
  }
}
