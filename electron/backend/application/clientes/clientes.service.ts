import { PERCENT_TOTAL } from '@backend/constants/percentage.constants';
import type {
  ClienteTopVentaRecord,
  ClienteUltimaVentaRecord,
} from '@backend/contracts/clientes/cliente-estadisticas-record.interface';
import type ClienteRepository from '@backend/contracts/clientes/cliente.repository.interface';
import type CrearClienteRecordCommand from '@backend/contracts/clientes/crear-cliente-record-command.interface';
import type ClienteRecord from '@backend/domain/clientes/cliente-record.interface';
import { bpsToPercent, percentToBps } from '@backend/utils/percentage.utils';
import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type {
  ClienteEstadisticasInterface,
  ClienteTopVentaInterface,
  ClienteUltimaVentaInterface,
} from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import {
  CLIENT_DNI_CIF_MAX_LENGTH,
  CLIENT_EMAIL_MAX_LENGTH,
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_PHONE_MAX_LENGTH,
} from '@desktop-contracts/clientes/cliente-validation.constants';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';

const ULTIMAS_VENTAS_LIMIT: number = 20;
const TOP_VENTAS_LIMIT: number = 10;

export default class ClientesService {
  constructor(private readonly clienteRepository: ClienteRepository) {}

  async getAll(): Promise<readonly ClienteInterface[]> {
    const clientes: readonly ClienteRecord[] = await this.clienteRepository.findAll();

    return clientes.map((cliente: ClienteRecord): ClienteInterface => this.toInterface(cliente));
  }

  /**
   * Recupera las estadísticas rápidas de compra de un cliente.
   */
  async getEstadisticas(publicId: string): Promise<ClienteEstadisticasInterface> {
    const normalizedPublicId: string = publicId.trim();

    if (normalizedPublicId === '') {
      throw new Error('El identificador del cliente no es válido.');
    }

    const [ultimasVentas, topVentas]: [
      readonly ClienteUltimaVentaRecord[],
      readonly ClienteTopVentaRecord[],
    ] = await Promise.all([
      this.clienteRepository.findUltimasVentas(normalizedPublicId, ULTIMAS_VENTAS_LIMIT),
      this.clienteRepository.findTopVentas(normalizedPublicId, TOP_VENTAS_LIMIT),
    ]);

    return {
      ultimasVentas: ultimasVentas.map(
        (item: ClienteUltimaVentaRecord): ClienteUltimaVentaInterface => ({
          fecha: item.fecha,
          localizador: item.localizador,
          nombre: item.nombre,
          unidades: item.unidades,
          pvpMicros: item.pvpMicros,
          importeMicros: item.importeMicros,
        }),
      ),
      topVentas: topVentas.map((item: ClienteTopVentaRecord): ClienteTopVentaInterface => ({
        localizador: item.localizador,
        nombre: item.nombre,
        unidades: item.unidades,
        importeMicros: item.importeMicros,
      })),
    };
  }

  /**
   * Crea un nuevo cliente después de normalizar y validar sus datos.
   */
  async create(command: CrearClienteCommand): Promise<ClienteInterface> {
    const recordCommand: CrearClienteRecordCommand = await this.normalizeRecordCommand(
      command,
      null,
    );

    const cliente: ClienteRecord = await this.clienteRepository.create(recordCommand);

    return this.toInterface(cliente);
  }

  /**
   * Actualiza un cliente activo después de normalizar y validar sus datos.
   */
  async update(command: ActualizarClienteCommand): Promise<ClienteInterface> {
    const publicId: string = this.requirePublicId(command.publicId);
    const recordCommand: CrearClienteRecordCommand = await this.normalizeRecordCommand(
      command,
      publicId,
    );

    const cliente: ClienteRecord | null = await this.clienteRepository.update(
      publicId,
      recordCommand,
    );

    if (cliente === null) {
      throw new Error('El cliente indicado no existe o ya no está activo.');
    }

    return this.toInterface(cliente);
  }

  /**
   * Normaliza los campos compartidos por el alta y la actualización.
   *
   * En una actualización, el publicId excluido permite conservar el
   * DNI/CIF actual sin considerarlo un duplicado de sí mismo.
   */
  private async normalizeRecordCommand(
    command: CrearClienteCommand,
    excludedPublicId: string | null,
  ): Promise<CrearClienteRecordCommand> {
    const nombreApellidos: string = this.requireText(
      command.nombreApellidos,
      'nombre y apellidos',
      CLIENT_NAME_MAX_LENGTH,
    );

    const dniCif: string | null = this.normalizeOptionalText(
      command.dniCif,
      'DNI/CIF',
      CLIENT_DNI_CIF_MAX_LENGTH,
    );

    const telefono: string | null = this.normalizeOptionalText(
      command.telefono,
      'teléfono',
      CLIENT_PHONE_MAX_LENGTH,
    );

    const email: string | null = this.normalizeOptionalText(
      command.email,
      'email',
      CLIENT_EMAIL_MAX_LENGTH,
    );

    if (email !== null && !this.isValidEmail(email)) {
      throw new Error('El email indicado no tiene un formato válido.');
    }

    if (
      dniCif !== null &&
      (await this.clienteRepository.existsActiveByDniCif(dniCif, excludedPublicId))
    ) {
      throw new Error('Ya existe un cliente activo con ese DNI/CIF.');
    }

    const provincia: number | null = this.normalizeOptionalProvince(command.provincia);

    const descuentoBps: number = this.normalizeDiscount(command.descuento);

    const factIgual: boolean = command.factIgual === true;

    return {
      nombreApellidos,
      dniCif,
      telefono,
      email,
      direccion: this.normalizeOptionalText(command.direccion),
      codigoPostal: this.normalizeOptionalText(command.codigoPostal),
      poblacion: this.normalizeOptionalText(command.poblacion),
      provincia,

      factIgual,
      factNombreApellidos: this.normalizeBillingText(
        command.factNombreApellidos,
        factIgual,
        'nombre de facturación',
        CLIENT_NAME_MAX_LENGTH,
      ),
      factDniCif: this.normalizeBillingText(
        command.factDniCif,
        factIgual,
        'DNI/CIF de facturación',
        CLIENT_DNI_CIF_MAX_LENGTH,
      ),
      factTelefono: this.normalizeBillingText(
        command.factTelefono,
        factIgual,
        'teléfono de facturación',
        CLIENT_PHONE_MAX_LENGTH,
      ),
      factEmail: factIgual
        ? this.normalizeOptionalText(command.factEmail)
        : this.normalizeOptionalEmail(command.factEmail),
      factDireccion: this.normalizeOptionalText(command.factDireccion),
      factCodigoPostal: this.normalizeOptionalText(command.factCodigoPostal),
      factPoblacion: this.normalizeOptionalText(command.factPoblacion),
      factProvincia: this.normalizeOptionalProvince(command.factProvincia),

      observaciones: this.normalizeOptionalText(command.observaciones),
      descuentoBps,
    };
  }

  /**
   * Normaliza un identificador público requerido de cliente.
   */
  private requirePublicId(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('El identificador del cliente no es válido.');
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error('El identificador del cliente no es válido.');
    }

    return normalizedValue;
  }

  private toInterface(cliente: ClienteRecord): ClienteInterface {
    return {
      id: cliente.id,
      publicId: cliente.publicId,
      nombreApellidos: cliente.nombreApellidos,
      dniCif: cliente.dniCif,
      telefono: cliente.telefono,
      email: cliente.email,
      direccion: cliente.direccion,
      codigoPostal: cliente.codigoPostal,
      poblacion: cliente.poblacion,
      provincia: cliente.provincia,
      factIgual: cliente.factIgual,
      factNombreApellidos: cliente.factNombreApellidos,
      factDniCif: cliente.factDniCif,
      factTelefono: cliente.factTelefono,
      factEmail: cliente.factEmail,
      factDireccion: cliente.factDireccion,
      factCodigoPostal: cliente.factCodigoPostal,
      factPoblacion: cliente.factPoblacion,
      factProvincia: cliente.factProvincia,
      observaciones: cliente.observaciones,
      descuento: bpsToPercent(cliente.descuentoBps),
      ultimaVenta: cliente.ultimaVenta,
    };
  }

  private requireText(value: string, field: string, maxLength: number): string {
    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error(`El ${field} no puede estar vacío.`);
    }

    if (normalizedValue.length > maxLength) {
      throw new Error(`El ${field} no puede superar los ${maxLength} caracteres.`);
    }

    return normalizedValue;
  }

  private normalizeOptionalText(
    value: string | null,
    field?: string,
    maxLength?: number,
  ): string | null {
    if (value === null) {
      return null;
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      return null;
    }

    if (maxLength !== undefined && normalizedValue.length > maxLength) {
      throw new Error(`El ${field ?? 'campo'} no puede superar los ${maxLength} caracteres.`);
    }

    return normalizedValue;
  }

  private normalizeOptionalEmail(value: string | null): string | null {
    const email: string | null = this.normalizeOptionalText(
      value,
      'email de facturación',
      CLIENT_EMAIL_MAX_LENGTH,
    );

    if (email !== null && !this.isValidEmail(email)) {
      throw new Error('El email de facturación indicado no tiene un formato válido.');
    }

    return email;
  }

  /**
   * Normaliza un dato alternativo y aplica sus límites únicamente
   * cuando esos datos son los efectivos para facturar.
   */
  private normalizeBillingText(
    value: string | null,
    factIgual: boolean,
    field: string,
    maxLength: number,
  ): string | null {
    if (factIgual) {
      return this.normalizeOptionalText(value);
    }

    return this.normalizeOptionalText(value, field, maxLength);
  }

  private normalizeOptionalProvince(value: number | null): number | null {
    if (value === null) {
      return null;
    }

    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('La provincia indicada no es válida.');
    }

    return value;
  }

  private normalizeDiscount(descuento: number): number {
    if (!Number.isFinite(descuento) || descuento < 0 || descuento > PERCENT_TOTAL) {
      throw new Error(`El descuento debe estar comprendido entre 0 y ${PERCENT_TOTAL} %.`);
    }

    return percentToBps(descuento);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
