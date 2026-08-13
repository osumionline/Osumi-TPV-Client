import type {
  ClienteTopVentaRecord,
  ClienteUltimaVentaRecord,
} from '@backend/contracts/clientes/cliente-estadisticas-record.interface';
import type ClienteRepository from '@backend/contracts/clientes/cliente.repository.interface';
import type CrearClienteRecordCommand from '@backend/contracts/clientes/crear-cliente-record-command.interface';
import type ClienteRecord from '@backend/domain/clientes/cliente-record.interface';
import type {
  ClienteEstadisticasInterface,
  ClienteTopVentaInterface,
  ClienteUltimaVentaInterface,
} from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';

const BASIS_POINTS_PER_PERCENT: number = 100;
const MAX_CLIENT_NAME_LENGTH: number = 150;
const MAX_DNI_CIF_LENGTH: number = 30;
const MAX_PHONE_LENGTH: number = 30;
const MAX_EMAIL_LENGTH: number = 254;
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
    const nombreApellidos: string = this.requireText(
      command.nombreApellidos,
      'nombre y apellidos',
      MAX_CLIENT_NAME_LENGTH,
    );

    const dniCif: string | null = this.normalizeOptionalText(
      command.dniCif,
      'DNI/CIF',
      MAX_DNI_CIF_LENGTH,
    );

    const telefono: string | null = this.normalizeOptionalText(
      command.telefono,
      'teléfono',
      MAX_PHONE_LENGTH,
    );

    const email: string | null = this.normalizeOptionalText(
      command.email,
      'email',
      MAX_EMAIL_LENGTH,
    );

    if (email !== null && !this.isValidEmail(email)) {
      throw new Error('El email indicado no tiene un formato válido.');
    }

    if (dniCif !== null && (await this.clienteRepository.existsActiveByDniCif(dniCif))) {
      throw new Error('Ya existe un cliente activo con ese DNI/CIF.');
    }

    const provincia: number | null = this.normalizeOptionalProvince(command.provincia);

    const descuentoBps: number = this.normalizeDiscount(command.descuento);

    const factIgual: boolean = command.factIgual === true;

    const recordCommand: CrearClienteRecordCommand = {
      nombreApellidos,
      dniCif,
      telefono,
      email,
      direccion: this.normalizeOptionalText(command.direccion),
      codigoPostal: this.normalizeOptionalText(command.codigoPostal),
      poblacion: this.normalizeOptionalText(command.poblacion),
      provincia,

      factIgual,
      factNombreApellidos: factIgual
        ? null
        : this.normalizeOptionalText(
            command.factNombreApellidos,
            'nombre de facturación',
            MAX_CLIENT_NAME_LENGTH,
          ),
      factDniCif: factIgual
        ? null
        : this.normalizeOptionalText(
            command.factDniCif,
            'DNI/CIF de facturación',
            MAX_DNI_CIF_LENGTH,
          ),
      factTelefono: factIgual
        ? null
        : this.normalizeOptionalText(
            command.factTelefono,
            'teléfono de facturación',
            MAX_PHONE_LENGTH,
          ),
      factEmail: factIgual ? null : this.normalizeOptionalEmail(command.factEmail),
      factDireccion: factIgual ? null : this.normalizeOptionalText(command.factDireccion),
      factCodigoPostal: factIgual ? null : this.normalizeOptionalText(command.factCodigoPostal),
      factPoblacion: factIgual ? null : this.normalizeOptionalText(command.factPoblacion),
      factProvincia: factIgual ? null : this.normalizeOptionalProvince(command.factProvincia),

      observaciones: this.normalizeOptionalText(command.observaciones),
      descuentoBps,
    };

    const cliente: ClienteRecord = await this.clienteRepository.create(recordCommand);

    return this.toInterface(cliente);
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
      descuento: cliente.descuentoBps / BASIS_POINTS_PER_PERCENT,
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
      MAX_EMAIL_LENGTH,
    );

    if (email !== null && !this.isValidEmail(email)) {
      throw new Error('El email de facturación indicado no tiene un formato válido.');
    }

    return email;
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
    if (!Number.isFinite(descuento) || descuento < 0 || descuento > 100) {
      throw new Error('El descuento debe estar comprendido entre 0 y 100 %.');
    }

    return Math.round(descuento * BASIS_POINTS_PER_PERCENT);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
