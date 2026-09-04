import type ClienteFacturasRepository from '@backend/contracts/clientes/cliente-facturas.repository.interface';
import type {
  ClienteFacturaEstadoRecord,
  ClienteFacturaRecord,
} from '@backend/domain/clientes/cliente-factura-record.interface';
import type {
  ClienteFacturaCapacidadesInterface,
  ClienteFacturaInterface,
} from '@desktop-contracts/clientes/cliente-factura.interface';

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
}
