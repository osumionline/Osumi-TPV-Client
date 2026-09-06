import ConfigurationService from '@backend/application/configuration/configuration.service';
import type ClienteFacturaDocumentosRepository from '@backend/contracts/clientes/cliente-factura-documentos.repository.interface';
import type {
  ClienteFacturaDocumentoLineaRecord,
  ClienteFacturaDocumentoRecord,
  ClienteFacturaDocumentoVentaRecord,
} from '@backend/domain/clientes/cliente-factura-documento-record.interface';
import type {
  ClienteFacturaDocumentoConsulta,
  ClienteFacturaDocumentoImpuestoInterface,
  ClienteFacturaDocumentoInterface,
  ClienteFacturaDocumentoLineaInterface,
  ClienteFacturaDocumentoVentaInterface,
} from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';

interface FacturaImpuestoAccumulator {
  baseCents: bigint;
  cuotaCents: bigint;
  totalCents: bigint;
}

const MICROS_PER_CENT: bigint = 10_000n;
const BPS_BASE: bigint = 10_000n;

export default class ClienteFacturaDocumentosService {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly documentosRepository: ClienteFacturaDocumentosRepository,
  ) {}

  /**
   * Construye una representación documental completa
   * a partir de snapshots históricos persistidos.
   */
  async getDocumento(
    consulta: ClienteFacturaDocumentoConsulta,
  ): Promise<ClienteFacturaDocumentoInterface> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta del documento de factura no es válida.');
    }

    const clientePublicId: string = this.requirePublicId(consulta.clientePublicId, 'cliente');
    const facturaPublicId: string = this.requirePublicId(consulta.facturaPublicId, 'factura');

    const [appData, record]: [AppData | null, ClienteFacturaDocumentoRecord | null] =
      await Promise.all([
        this.configurationService.load(),
        this.documentosRepository.findDocumentoByPublicId(clientePublicId, facturaPublicId),
      ]);

    if (appData === null) {
      throw new Error('La configuración de la aplicación no está disponible.');
    }

    if (record === null) {
      throw new Error('La factura indicada no existe o ya no está disponible.');
    }

    const generatedAt: string = new Date().toISOString();
    const previsualizacion: boolean = record.estado === 'borrador';
    const year: number = previsualizacion
      ? this.resolveDocumentYear(generatedAt)
      : this.resolveEmissionYear(record);
    const numeroFactura: string = record.numero === null ? `_${year}` : `${record.numero}_${year}`;

    const ventas: readonly ClienteFacturaDocumentoVentaInterface[] = record.ventas.map(
      (venta: ClienteFacturaDocumentoVentaRecord): ClienteFacturaDocumentoVentaInterface =>
        this.toVentaInterface(venta),
    );
    const impuestos: readonly ClienteFacturaDocumentoImpuestoInterface[] =
      this.buildImpuestos(ventas);
    const subtotalCents: number = this.sumSafe(
      ventas.map((venta: ClienteFacturaDocumentoVentaInterface): number => venta.subtotalCents),
      'El subtotal de la factura supera el rango numérico seguro.',
    );
    const descuentoCents: number = this.sumSafe(
      ventas.map((venta: ClienteFacturaDocumentoVentaInterface): number => venta.descuentoCents),
      'El descuento de la factura supera el rango numérico seguro.',
    );
    const ivaCents: number = this.sumSafe(
      impuestos.map(
        (impuesto: ClienteFacturaDocumentoImpuestoInterface): number => impuesto.cuotaCents,
      ),
      'La cuota total de IVA supera el rango numérico seguro.',
    );
    const calculatedTotalCents: number = this.sumSafe(
      [subtotalCents, ivaCents, descuentoCents],
      'El total calculado de la factura supera el rango numérico seguro.',
    );

    if (calculatedTotalCents !== record.importeCents) {
      throw new Error('El total de la factura no coincide con sus ventas.');
    }

    return {
      facturaPublicId: record.publicId,
      serie: record.serie,
      numero: record.numero,
      year,
      numeroFactura,
      estado: record.estado,
      previsualizacion,
      generatedAt,
      fechaDocumento: previsualizacion ? generatedAt : this.requireFechaEmision(record),
      fechaCreacion: record.fechaCreacion,
      fechaEmision: record.fechaEmision,
      fechaAnulacion: record.fechaAnulacion,
      emisor: {
        nombre: appData.nombre,
        nombreComercial: appData.nombreComercial,
        cif: appData.cif,
        telefono: appData.telefono,
        direccion: appData.direccion,
        poblacion: appData.poblacion,
        email: appData.email,
        web: appData.web,
      },
      cliente: {
        nombreApellidos: record.cliente.nombreApellidos,
        dniCif: record.cliente.dniCif,
        telefono: record.cliente.telefono,
        email: record.cliente.email,
        direccion: record.cliente.direccion,
        codigoPostal: record.cliente.codigoPostal,
        poblacion: record.cliente.poblacion,
        provinciaId: record.cliente.provinciaId,
      },
      ventas,
      impuestos,
      subtotalCents,
      descuentoCents,
      totalCents: record.importeCents,
    };
  }

  /**
   * Convierte una venta documental interna al
   * contrato consumido por las capas superiores.
   */
  /**
   * Convierte una venta persistida en la fila resumen
   * utilizada por la factura y sus líneas desplegables.
   */
  private toVentaInterface(
    venta: ClienteFacturaDocumentoVentaRecord,
  ): ClienteFacturaDocumentoVentaInterface {
    if (!Number.isSafeInteger(venta.totalCents)) {
      throw new Error('El importe de una venta de la factura no es válido.');
    }

    if (venta.lineas.length === 0) {
      throw new Error('Una de las ventas de la factura no contiene líneas documentables.');
    }

    let importeMicros: bigint = 0n;

    for (const linea of venta.lineas) {
      if (!Number.isSafeInteger(linea.importeMicros)) {
        throw new Error('El importe de una línea de factura no es válido.');
      }

      importeMicros += BigInt(linea.importeMicros);
    }

    if (this.roundMicrosToCents(importeMicros) !== venta.totalCents) {
      throw new Error('El total de una venta no coincide con sus líneas.');
    }

    const lineas: readonly ClienteFacturaDocumentoLineaInterface[] = venta.lineas.map(
      (linea: ClienteFacturaDocumentoLineaRecord): ClienteFacturaDocumentoLineaInterface =>
        this.toLineaInterface(linea),
    );
    const subtotalCents: number = this.sumSafe(
      lineas.map((linea: ClienteFacturaDocumentoLineaInterface): number => linea.subtotalCents),
      'La base de una venta supera el rango numérico seguro.',
    );
    const ivaCents: number = this.sumSafe(
      lineas.map((linea: ClienteFacturaDocumentoLineaInterface): number => linea.ivaCents),
      'El IVA de una venta supera el rango numérico seguro.',
    );
    const pvpCents: number = this.sumSafe(
      [subtotalCents, ivaCents],
      'El PVP de una venta supera el rango numérico seguro.',
    );
    const descuentoCents: number = this.toSafeNumber(
      BigInt(venta.totalCents) - BigInt(pvpCents),
      'El descuento de una venta supera el rango numérico seguro.',
    );

    return {
      publicId: venta.publicId,
      serie: venta.serie,
      numero: venta.numero,
      fecha: venta.fecha,
      pvpCents,
      baseCents: subtotalCents,
      subtotalCents,
      ivaCents,
      descuentoCents,
      totalCents: venta.totalCents,
      lineas,
    };
  }

  /**
   * Calcula las columnas documentales de una línea
   * manteniendo el descuento separado de base e IVA.
   */
  private toLineaInterface(
    linea: ClienteFacturaDocumentoLineaRecord,
  ): ClienteFacturaDocumentoLineaInterface {
    if (!Number.isSafeInteger(linea.pvpMicros) || linea.pvpMicros < 0) {
      throw new Error('El PVP de una línea de factura no es válido.');
    }

    if (!Number.isSafeInteger(linea.importeMicros) || linea.importeMicros < 0) {
      throw new Error('El importe de una línea de factura no es válido.');
    }

    if (!Number.isSafeInteger(linea.unidades) || linea.unidades <= 0) {
      throw new Error('Las unidades de una línea de factura no son válidas.');
    }

    if (!Number.isSafeInteger(linea.ivaBps) || linea.ivaBps < 0 || linea.ivaBps > 10_000) {
      throw new Error('El tipo de IVA de una línea de factura no es válido.');
    }

    const ivaDivisor: bigint = BPS_BASE + BigInt(linea.ivaBps);
    const pvpMicros: bigint = BigInt(linea.pvpMicros);
    const totalPvpMicros: bigint = pvpMicros * BigInt(linea.unidades);
    const baseUnitMicros: bigint = this.roundDivision(pvpMicros * BPS_BASE, ivaDivisor);
    const subtotalMicros: bigint = this.roundDivision(totalPvpMicros * BPS_BASE, ivaDivisor);
    const pvpCents: number = this.roundMicrosToCents(pvpMicros);
    const totalPvpCents: number = this.roundMicrosToCents(totalPvpMicros);
    const baseUnitCents: number = this.roundMicrosToCents(baseUnitMicros);
    const subtotalCents: number = this.roundMicrosToCents(subtotalMicros);
    const ivaCents: number = totalPvpCents - subtotalCents;
    const totalCents: number = this.roundMicrosToCents(BigInt(linea.importeMicros));
    const descuentoCents: number = this.toSafeNumber(
      BigInt(totalCents) - BigInt(totalPvpCents),
      'El descuento de una línea supera el rango numérico seguro.',
    );

    return {
      localizador: linea.localizador,
      marca: linea.marca,
      nombre: linea.nombre,
      pvpCents,
      baseUnitCents,
      unidades: linea.unidades,
      subtotalCents,
      ivaBps: linea.ivaBps,
      ivaCents,
      descuentoCents,
      totalCents,
      regalo: linea.regalo,
    };
  }

  /**
   * Agrupa las bases e IVA previos al descuento
   * utilizando las mismas cifras mostradas en tabla.
   */
  private buildImpuestos(
    ventas: readonly ClienteFacturaDocumentoVentaInterface[],
  ): readonly ClienteFacturaDocumentoImpuestoInterface[] {
    const impuestos: Map<number, FacturaImpuestoAccumulator> = new Map<
      number,
      FacturaImpuestoAccumulator
    >();

    for (const venta of ventas) {
      for (const linea of venta.lineas) {
        const acumulado: FacturaImpuestoAccumulator = impuestos.get(linea.ivaBps) ?? {
          baseCents: 0n,
          cuotaCents: 0n,
          totalCents: 0n,
        };

        acumulado.baseCents += BigInt(linea.subtotalCents);
        acumulado.cuotaCents += BigInt(linea.ivaCents);
        acumulado.totalCents += BigInt(linea.subtotalCents + linea.ivaCents);

        impuestos.set(linea.ivaBps, acumulado);
      }
    }

    return Array.from(impuestos.entries())
      .sort(
        (
          first: readonly [number, FacturaImpuestoAccumulator],
          second: readonly [number, FacturaImpuestoAccumulator],
        ): number => first[0] - second[0],
      )
      .map(
        (
          entry: readonly [number, FacturaImpuestoAccumulator],
        ): ClienteFacturaDocumentoImpuestoInterface => ({
          ivaBps: entry[0],
          baseCents: this.toSafeNumber(
            entry[1].baseCents,
            'La base imponible supera el rango numérico seguro.',
          ),
          cuotaCents: this.toSafeNumber(
            entry[1].cuotaCents,
            'La cuota de IVA supera el rango numérico seguro.',
          ),
          totalCents: this.toSafeNumber(
            entry[1].totalCents,
            'El total por tipo de IVA supera el rango numérico seguro.',
          ),
        }),
      );
  }

  /**
   * Suma importes utilizando bigint y devuelve
   * únicamente un entero seguro de JavaScript.
   */
  private sumSafe(values: readonly number[], message: string): number {
    let total: bigint = 0n;

    for (const value of values) {
      if (!Number.isSafeInteger(value)) {
        throw new Error(message);
      }

      total += BigInt(value);
    }

    return this.toSafeNumber(total, message);
  }

  /**
   * Convierte microeuros a céntimos usando redondeo
   * simétrico para importes positivos y negativos.
   */
  private roundMicrosToCents(value: bigint): number {
    return this.toSafeNumber(
      this.roundDivision(value, MICROS_PER_CENT),
      'El importe redondeado supera el rango numérico seguro.',
    );
  }

  /**
   * Divide dos enteros aplicando redondeo simétrico
   * al entero más próximo.
   */
  private roundDivision(dividend: bigint, divisor: bigint): bigint {
    if (divisor <= 0n) {
      throw new Error('El divisor utilizado para calcular la factura no es válido.');
    }

    const sign: bigint = dividend < 0n ? -1n : 1n;
    const absoluteDividend: bigint = this.absBigInt(dividend);

    return sign * ((absoluteDividend + divisor / 2n) / divisor);
  }

  /**
   * Devuelve el valor absoluto de un entero grande.
   */
  private absBigInt(value: bigint): bigint {
    return value < 0n ? -value : value;
  }

  /**
   * Convierte un bigint comprobando que siga dentro
   * del rango seguro de JavaScript.
   */
  private toSafeNumber(value: bigint, message: string): number {
    const result: number = Number(value);

    if (!Number.isSafeInteger(result)) {
      throw new Error(message);
    }

    return result;
  }

  /**
   * Obtiene el año correspondiente a la fecha oficial
   * de emisión de una factura finalizada.
   */
  private resolveEmissionYear(record: ClienteFacturaDocumentoRecord): number {
    return this.resolveDocumentYear(this.requireFechaEmision(record));
  }

  /**
   * Obtiene el año documental de una fecha ISO.
   */
  private resolveDocumentYear(timestamp: string): number {
    const year: number = Number(timestamp.slice(0, 4));

    if (!Number.isSafeInteger(year) || year < 1 || year > 9999) {
      throw new Error('La fecha de la factura no es válida.');
    }

    return year;
  }

  /**
   * Exige la fecha oficial en facturas que ya no
   * están en estado borrador.
   */
  private requireFechaEmision(record: ClienteFacturaDocumentoRecord): string {
    if (record.fechaEmision === null) {
      throw new Error('La factura finalizada no tiene fecha de emisión.');
    }

    if (record.numero === null || !Number.isSafeInteger(record.numero) || record.numero <= 0) {
      throw new Error('La factura finalizada no tiene una numeración válida.');
    }

    return record.fechaEmision;
  }

  /**
   * Normaliza un publicId obligatorio de la consulta.
   */
  private requirePublicId(value: string, entity: 'cliente' | 'factura'): string {
    if (typeof value !== 'string') {
      throw new Error(`El identificador de ${entity} no es válido.`);
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error(`El identificador de ${entity} no es válido.`);
    }

    return normalizedValue;
  }
}
