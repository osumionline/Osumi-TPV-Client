import { PERCENT_TOTAL } from '@backend/constants/percentage.constants';
import type ClienteDeactivateResult from '@backend/contracts/clientes/cliente-deactivate-result.type';
import type {
  ClienteSumaVentaRecord,
  ClienteTopVentaRecord,
  ClienteUltimaVentaRecord,
} from '@backend/contracts/clientes/cliente-estadisticas-record.interface';
import type ClienteRepository from '@backend/contracts/clientes/cliente.repository.interface';
import type CrearClienteRecordCommand from '@backend/contracts/clientes/crear-cliente-record-command.interface';
import type ClienteRecord from '@backend/domain/clientes/cliente-record.interface';
import { bpsToPercent, percentToBps } from '@backend/utils/percentage.utils';
import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type {
  ClienteEstadisticasGeneralesInterface,
  ClienteEstadisticasInterface,
  ClienteSumaVentasMesInterface,
  ClienteSumaVentasValoresInterface,
  ClienteSumaVentasYearInterface,
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
const MICRO_PERCENTAGE_TOTAL: bigint = 100_000_000n;

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
    const normalizedPublicId: string = this.requirePublicId(publicId);

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
   * Recupera las estadísticas completas utilizadas
   * exclusivamente por la ficha de Clientes.
   */
  async getEstadisticasGenerales(publicId: string): Promise<ClienteEstadisticasGeneralesInterface> {
    const normalizedPublicId: string = this.requirePublicId(publicId);

    const [estadisticas, sumaVentasRecords]: [
      ClienteEstadisticasInterface,
      readonly ClienteSumaVentaRecord[],
    ] = await Promise.all([
      this.getEstadisticas(normalizedPublicId),
      this.clienteRepository.findSumaVentas(normalizedPublicId),
    ]);

    return {
      ...estadisticas,
      sumaVentas: this.buildSumaVentas(sumaVentasRecords),
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
   * Da de baja un cliente activo si no tiene facturas en borrador.
   */
  async deactivate(publicId: string): Promise<void> {
    const normalizedPublicId: string = this.requirePublicId(publicId);
    const result: ClienteDeactivateResult =
      await this.clienteRepository.deactivate(normalizedPublicId);

    if (result === 'deactivated') {
      return;
    }

    if (result === 'has_draft_invoices') {
      throw new Error('No se puede dar de baja el cliente porque tiene facturas en borrador.');
    }

    throw new Error('El cliente indicado no existe o ya no está activo.');
  }

  /**
   * Agrupa los registros mensuales por año y calcula
   * los valores derivados de cada período.
   */
  private buildSumaVentas(
    records: readonly ClienteSumaVentaRecord[],
  ): readonly ClienteSumaVentasYearInterface[] {
    const monthsByYear: Map<number, ClienteSumaVentasMesInterface[]> = new Map<
      number,
      ClienteSumaVentasMesInterface[]
    >();

    for (const record of records) {
      const months: ClienteSumaVentasMesInterface[] = monthsByYear.get(record.year) ?? [];

      months.push({
        month: record.month,
        ...this.createSumaVentasValues(record.pucMicros, record.pvpMicros),
      });

      monthsByYear.set(record.year, months);
    }

    const years: readonly number[] = [...monthsByYear.keys()].sort(
      (left: number, right: number): number => left - right,
    );

    return years.map((year: number): ClienteSumaVentasYearInterface => {
      const months: readonly ClienteSumaVentasMesInterface[] = [
        ...(monthsByYear.get(year) ?? []),
      ].sort(
        (left: ClienteSumaVentasMesInterface, right: ClienteSumaVentasMesInterface): number =>
          left.month - right.month,
      );

      let pucMicros: number = 0;
      let pvpMicros: number = 0;

      for (const month of months) {
        pucMicros = this.safeAdd(
          pucMicros,
          month.pucMicros,
          'El PUC anual de las ventas del cliente supera el rango numérico seguro.',
        );

        pvpMicros = this.safeAdd(
          pvpMicros,
          month.pvpMicros,
          'El PVP anual de las ventas del cliente supera el rango numérico seguro.',
        );
      }

      return {
        year,
        ...this.createSumaVentasValues(pucMicros, pvpMicros),
        months,
      };
    });
  }

  /**
   * Calcula beneficio y margen para un período agregado.
   */
  private createSumaVentasValues(
    pucMicros: number,
    pvpMicros: number,
  ): ClienteSumaVentasValoresInterface {
    const beneficioMicros: number = this.safeSubtract(
      pvpMicros,
      pucMicros,
      'El beneficio de las ventas del cliente supera el rango numérico seguro.',
    );

    return {
      pucMicros,
      pvpMicros,
      beneficioMicros,
      margenMicroporcentaje: this.calculateMarginMicroporcentaje(beneficioMicros, pvpMicros),
    };
  }

  /**
   * Calcula el margen sobre el importe real de venta.
   *
   * Un PVP igual a cero no permite calcular un porcentaje.
   */
  private calculateMarginMicroporcentaje(
    beneficioMicros: number,
    pvpMicros: number,
  ): number | null {
    const errorMessage: string =
      'El margen de las ventas del cliente supera el rango numérico seguro.';

    const pvpValue: bigint = this.toSafeBigInt(pvpMicros, errorMessage);

    if (pvpValue === 0n) {
      return null;
    }

    const beneficioValue: bigint = this.toSafeBigInt(beneficioMicros, errorMessage);
    const numerator: bigint = beneficioValue * MICRO_PERCENTAGE_TOTAL;
    const positiveDenominator: bigint = pvpValue < 0n ? -pvpValue : pvpValue;
    const normalizedNumerator: bigint = pvpValue < 0n ? -numerator : numerator;

    return this.toSafeNumber(
      this.roundDivide(normalizedNumerator, positiveDenominator),
      errorMessage,
    );
  }

  /**
   * Suma dos enteros mediante BigInt y comprueba el resultado.
   */
  private safeAdd(left: number, right: number, errorMessage: string): number {
    const result: bigint =
      this.toSafeBigInt(left, errorMessage) + this.toSafeBigInt(right, errorMessage);

    return this.toSafeNumber(result, errorMessage);
  }

  /**
   * Resta dos enteros mediante BigInt y comprueba el resultado.
   */
  private safeSubtract(left: number, right: number, errorMessage: string): number {
    const result: bigint =
      this.toSafeBigInt(left, errorMessage) - this.toSafeBigInt(right, errorMessage);

    return this.toSafeNumber(result, errorMessage);
  }

  /**
   * Divide dos BigInt aplicando redondeo simétrico.
   */
  private roundDivide(numerator: bigint, denominator: bigint): bigint {
    if (denominator <= 0n) {
      throw new Error('El divisor debe ser un entero mayor que cero.');
    }

    const negative: boolean = numerator < 0n;
    const absoluteNumerator: bigint = negative ? -numerator : numerator;
    const rounded: bigint = (absoluteNumerator + denominator / 2n) / denominator;

    return negative ? -rounded : rounded;
  }

  /**
   * Convierte un entero seguro a BigInt.
   */
  private toSafeBigInt(value: number, errorMessage: string): bigint {
    if (!Number.isSafeInteger(value)) {
      throw new Error(errorMessage);
    }

    return BigInt(value);
  }

  /**
   * Convierte un BigInt a number comprobando su rango seguro.
   */
  private toSafeNumber(value: bigint, errorMessage: string): number {
    const result: number = Number(value);

    if (!Number.isSafeInteger(result)) {
      throw new Error(errorMessage);
    }

    return result;
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
