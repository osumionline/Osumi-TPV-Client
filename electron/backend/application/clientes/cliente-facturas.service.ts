import type ActualizarClienteFacturaBorradorRecordCommand from '@backend/contracts/clientes/actualizar-cliente-factura-borrador-record-command.interface';
import type ClienteFacturasRepository from '@backend/contracts/clientes/cliente-facturas.repository.interface';
import type CrearClienteFacturaBorradorRecordCommand from '@backend/contracts/clientes/crear-cliente-factura-borrador-record-command.interface';
import type EliminarClienteFacturaBorradorRecordCommand from '@backend/contracts/clientes/eliminar-cliente-factura-borrador-record-command.interface';
import type {
  ClienteFacturaEstadoRecord,
  ClienteFacturaRecord,
} from '@backend/domain/clientes/cliente-factura-record.interface';
import type {
  ClienteFacturaVentaDisponibleRecord,
  ClienteFacturaVentaPagoRecord,
  ClienteFacturaVentaRecord,
} from '@backend/domain/clientes/cliente-factura-venta-record.interface';
import type ActualizarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/actualizar-cliente-factura-borrador-command.interface';
import type {
  ClienteFacturaVentaDisponibleInterface,
  ClienteFacturaVentaInterface,
  ClienteFacturaVentaPagoInterface,
  ClienteFacturaVentasConsulta,
  ClienteFacturaVentasDisponiblesConsulta,
} from '@desktop-contracts/clientes/cliente-factura-venta.interface';
import type {
  ClienteFacturaCapacidadesInterface,
  ClienteFacturaInterface,
} from '@desktop-contracts/clientes/cliente-factura.interface';
import type CrearClienteFacturaBorradorCommand from '@desktop-contracts/clientes/crear-cliente-factura-borrador-command.interface';
import type EliminarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/eliminar-cliente-factura-borrador-command.interface';

export default class ClienteFacturasService {
  constructor(private readonly clienteFacturasRepository: ClienteFacturasRepository) {}

  /**
   * Recupera las facturas visibles del cliente y
   * construye el modelo público del listado.
   */
  async getByClientePublicId(publicId: string): Promise<readonly ClienteFacturaInterface[]> {
    const normalizedPublicId: string = this.requirePublicId(publicId);

    const records: readonly ClienteFacturaRecord[] =
      await this.clienteFacturasRepository.findByClientePublicId(normalizedPublicId);

    return records.map((record: ClienteFacturaRecord): ClienteFacturaInterface =>
      this.toInterface(record),
    );
  }

  /**
   * Crea un borrador después de normalizar sus
   * identificadores y ventas seleccionadas.
   */
  async createBorrador(
    command: CrearClienteFacturaBorradorCommand,
  ): Promise<ClienteFacturaInterface> {
    if (typeof command !== 'object' || command === null) {
      throw new Error('Los datos para crear el borrador de factura no son válidos.');
    }

    const recordCommand: CrearClienteFacturaBorradorRecordCommand = {
      clientePublicId: this.requirePublicId(command.clientePublicId),
      ventasPublicIds: this.normalizeVentasPublicIds(command.ventasPublicIds),
    };

    const record: ClienteFacturaRecord =
      await this.clienteFacturasRepository.createBorrador(recordCommand);

    return this.toInterface(record);
  }

  /**
   * Actualiza un borrador después de normalizar
   * todos los identificadores recibidos.
   */
  async updateBorrador(
    command: ActualizarClienteFacturaBorradorCommand,
  ): Promise<ClienteFacturaInterface> {
    if (typeof command !== 'object' || command === null) {
      throw new Error('Los datos para actualizar el borrador de factura no son válidos.');
    }

    const recordCommand: ActualizarClienteFacturaBorradorRecordCommand = {
      clientePublicId: this.requirePublicId(command.clientePublicId),
      borradorPublicId: this.requireBorradorPublicId(command.borradorPublicId),
      ventasPublicIds: this.normalizeVentasPublicIds(command.ventasPublicIds),
    };

    const record: ClienteFacturaRecord =
      await this.clienteFacturasRepository.updateBorrador(recordCommand);

    return this.toInterface(record);
  }

  /**
   * Elimina un borrador después de normalizar
   * sus identificadores públicos.
   */
  async deleteBorrador(command: EliminarClienteFacturaBorradorCommand): Promise<void> {
    if (typeof command !== 'object' || command === null) {
      throw new Error('Los datos para eliminar el borrador de factura no son válidos.');
    }

    const recordCommand: EliminarClienteFacturaBorradorRecordCommand = {
      clientePublicId: this.requirePublicId(command.clientePublicId),
      borradorPublicId: this.requireBorradorPublicId(command.borradorPublicId),
    };

    await this.clienteFacturasRepository.deleteBorrador(recordCommand);
  }

  /**
   * Recupera las ventas históricamente relacionadas
   * con una factura persistida.
   */
  async getVentas(
    consulta: ClienteFacturaVentasConsulta,
  ): Promise<readonly ClienteFacturaVentaInterface[]> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de ventas de la factura no es válida.');
    }

    const clientePublicId: string = this.requirePublicId(consulta.clientePublicId);
    const facturaPublicId: string = this.requireFacturaPublicId(consulta.facturaPublicId);
    const records: readonly ClienteFacturaVentaRecord[] =
      await this.clienteFacturasRepository.findVentasByFacturaPublicId(
        clientePublicId,
        facturaPublicId,
      );

    return records.map((record: ClienteFacturaVentaRecord): ClienteFacturaVentaInterface =>
      this.toVentaInterface(record),
    );
  }

  /**
   * Recupera las ventas que pueden seleccionarse
   * al crear o editar una factura.
   */
  async getVentasDisponibles(
    consulta: ClienteFacturaVentasDisponiblesConsulta,
  ): Promise<readonly ClienteFacturaVentaDisponibleInterface[]> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de ventas disponibles no es válida.');
    }

    const clientePublicId: string = this.requirePublicId(consulta.clientePublicId);
    const borradorPublicId: string | null = this.normalizeBorradorPublicId(
      consulta.borradorPublicId,
    );

    if (borradorPublicId !== null) {
      await this.requireBorradorEditable(clientePublicId, borradorPublicId);
    }

    const records: readonly ClienteFacturaVentaDisponibleRecord[] =
      await this.clienteFacturasRepository.findVentasDisponibles(clientePublicId, borradorPublicId);

    return records.map(
      (record: ClienteFacturaVentaDisponibleRecord): ClienteFacturaVentaDisponibleInterface =>
        this.toVentaDisponibleInterface(record),
    );
  }

  /**
   * Comprueba que la factura indicada sea un borrador
   * activo perteneciente al cliente solicitado.
   */
  private async requireBorradorEditable(
    clientePublicId: string,
    borradorPublicId: string,
  ): Promise<void> {
    const facturas: readonly ClienteFacturaRecord[] =
      await this.clienteFacturasRepository.findByClientePublicId(clientePublicId);

    const borrador: ClienteFacturaRecord | undefined = facturas.find(
      (factura: ClienteFacturaRecord): boolean => factura.publicId === borradorPublicId,
    );

    if (borrador === undefined || borrador.estado !== 'borrador') {
      throw new Error('El borrador de factura no pertenece al cliente o ya no está disponible.');
    }
  }

  /**
   * Convierte una venta interna relacionada con una
   * factura en su contrato público.
   */
  private toVentaInterface(record: ClienteFacturaVentaRecord): ClienteFacturaVentaInterface {
    return {
      id: record.id,
      publicId: record.publicId,
      serie: record.serie,
      numero: record.numero,
      fecha: record.fecha,
      totalCents: record.totalCents,
      pagos: record.pagos.map(
        (pago: ClienteFacturaVentaPagoRecord): ClienteFacturaVentaPagoInterface => ({
          tipoPagoPublicId: pago.tipoPagoPublicId,
          nombre: pago.nombre,
          importeCents: pago.importeCents,
        }),
      ),
    };
  }

  /**
   * Añade al contrato común de venta el estado
   * específico del editor de borradores.
   */
  private toVentaDisponibleInterface(
    record: ClienteFacturaVentaDisponibleRecord,
  ): ClienteFacturaVentaDisponibleInterface {
    return {
      ...this.toVentaInterface(record),
      incluidaEnBorrador: record.incluidaEnBorrador,
    };
  }

  /**
   * Convierte el registro interno en el contrato público
   * que consumirá el renderer.
   */
  private toInterface(record: ClienteFacturaRecord): ClienteFacturaInterface {
    const numeroFactura: string | null = this.getNumeroFactura(record);
    const fecha: string = this.getFechaVisible(record);

    return {
      publicId: record.publicId,
      serie: record.serie,
      numero: record.numero,
      year: record.year,
      numeroFactura,
      estado: record.estado,
      fecha,
      fechaCreacion: record.fechaCreacion,
      fechaEmision: record.fechaEmision,
      fechaAnulacion: record.fechaAnulacion,
      importeCents: record.importeCents,
      capacidades: this.getCapacidades(record.estado),
    };
  }

  /**
   * Construye el número oficial visible y comprueba
   * la coherencia básica del estado persistido.
   */
  private getNumeroFactura(record: ClienteFacturaRecord): string | null {
    if (record.estado === 'borrador') {
      if (
        record.numero !== null ||
        record.year !== null ||
        record.fechaEmision !== null ||
        record.fechaAnulacion !== null
      ) {
        throw new Error('Los datos temporales del borrador de factura no son válidos.');
      }

      return null;
    }

    if (
      record.numero === null ||
      !Number.isSafeInteger(record.numero) ||
      record.numero <= 0 ||
      record.year === null ||
      !Number.isSafeInteger(record.year) ||
      record.year < 1 ||
      record.year > 9999 ||
      record.fechaEmision === null
    ) {
      throw new Error('La factura no tiene una numeración o fecha de emisión válidas.');
    }

    if (record.estado === 'emitida' && record.fechaAnulacion !== null) {
      throw new Error('Una factura emitida no puede tener fecha de anulación.');
    }

    if (record.estado === 'anulada' && record.fechaAnulacion === null) {
      throw new Error('La factura anulada no tiene fecha de anulación.');
    }

    return `${record.numero}_${record.year}`;
  }

  /**
   * Selecciona la fecha que debe mostrarse en el listado.
   */
  private getFechaVisible(record: ClienteFacturaRecord): string {
    if (record.estado === 'borrador') {
      return record.fechaCreacion;
    }

    if (record.fechaEmision === null) {
      throw new Error('La factura no tiene una fecha de emisión válida.');
    }

    return record.fechaEmision;
  }

  /**
   * Deriva todas las acciones permitidas exclusivamente
   * desde el estado canónico de la factura.
   */
  private getCapacidades(estado: ClienteFacturaEstadoRecord): ClienteFacturaCapacidadesInterface {
    const borrador: boolean = estado === 'borrador';
    const emitida: boolean = estado === 'emitida';

    return {
      puedeEditar: borrador,
      puedeEliminar: borrador,
      puedePrevisualizar: borrador,
      puedeFacturar: borrador,
      puedeImprimir: emitida,
      puedeEnviarEmail: emitida,
      puedeAnular: emitida,
    };
  }

  /**
   * Normaliza las ventas seleccionadas y rechaza
   * listas vacías, identificadores inválidos o duplicados.
   */
  private normalizeVentasPublicIds(values: readonly string[]): readonly string[] {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('La factura debe incluir al menos una venta.');
    }

    const normalizedValues: readonly string[] = values.map((value: string): string => {
      if (typeof value !== 'string') {
        throw new Error('Una de las ventas seleccionadas no tiene un identificador válido.');
      }

      const normalizedValue: string = value.trim();

      if (normalizedValue.length === 0) {
        throw new Error('Una de las ventas seleccionadas no tiene un identificador válido.');
      }

      return normalizedValue;
    });

    if (new Set<string>(normalizedValues).size !== normalizedValues.length) {
      throw new Error('Una venta no se puede incluir más de una vez en la misma factura.');
    }

    return normalizedValues;
  }

  /**
   * Normaliza un identificador obligatorio de factura.
   */
  private requireFacturaPublicId(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('El identificador de la factura no es válido.');
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error('El identificador de la factura no es válido.');
    }

    return normalizedValue;
  }

  /**
   * Normaliza un identificador obligatorio de borrador.
   */
  private requireBorradorPublicId(value: string): string {
    const normalizedValue: string | null = this.normalizeBorradorPublicId(value);

    if (normalizedValue === null) {
      throw new Error('El identificador del borrador de factura no es válido.');
    }

    return normalizedValue;
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

  /**
   * Normaliza el identificador opcional del borrador.
   */
  private normalizeBorradorPublicId(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new Error('El identificador del borrador de factura no es válido.');
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error('El identificador del borrador de factura no es válido.');
    }

    return normalizedValue;
  }
}
