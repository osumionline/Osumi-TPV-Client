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

interface VentaImpuestoAccumulator {
  readonly ivaBps: number;
  importeMicros: bigint;
  totalCents: bigint;
}

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
    const year: number | null = previsualizacion ? null : this.resolveEmissionYear(record);
    const numeroFactura: string | null =
      record.numero === null || year === null ? null : `${record.numero}_${year}`;

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
      ventas: record.ventas.map(
        (venta: ClienteFacturaDocumentoVentaRecord): ClienteFacturaDocumentoVentaInterface =>
          this.toVentaInterface(venta),
      ),
      impuestos: this.buildImpuestos(record),
      totalCents: record.importeCents,
    };
  }

  /**
   * Convierte una venta documental interna al
   * contrato consumido por las capas superiores.
   */
  private toVentaInterface(
    venta: ClienteFacturaDocumentoVentaRecord,
  ): ClienteFacturaDocumentoVentaInterface {
    return {
      publicId: venta.publicId,
      serie: venta.serie,
      numero: venta.numero,
      fecha: venta.fecha,
      totalCents: venta.totalCents,
      lineas: venta.lineas.map(
        (linea: ClienteFacturaDocumentoLineaRecord): ClienteFacturaDocumentoLineaInterface => ({
          localizador: linea.localizador,
          marca: linea.marca,
          nombre: linea.nombre,
          pvpMicros: linea.pvpMicros,
          ivaBps: linea.ivaBps,
          importeMicros: linea.importeMicros,
          descuentoBps: linea.descuentoBps,
          importeDescuentoMicros: linea.importeDescuentoMicros,
          unidades: linea.unidades,
          regalo: linea.regalo,
        }),
      ),
    };
  }

  /**
   * Calcula bases e IVA por tipo preservando el total
   * canónico en céntimos de cada venta.
   */
  private buildImpuestos(
    record: ClienteFacturaDocumentoRecord,
  ): readonly ClienteFacturaDocumentoImpuestoInterface[] {
    if (record.ventas.length === 0) {
      throw new Error('La factura no contiene ventas documentables.');
    }

    const impuestos: Map<number, FacturaImpuestoAccumulator> = new Map<
      number,
      FacturaImpuestoAccumulator
    >();
    let ventasTotalCents: bigint = 0n;

    for (const venta of record.ventas) {
      if (!Number.isSafeInteger(venta.totalCents)) {
        throw new Error('El importe de una venta de la factura no es válido.');
      }

      ventasTotalCents += BigInt(venta.totalCents);

      const grupos: VentaImpuestoAccumulator[] = this.buildVentaImpuestos(venta);

      for (const grupo of grupos) {
        const baseCents: bigint = this.roundDivision(
          grupo.totalCents * BPS_BASE,
          BPS_BASE + BigInt(grupo.ivaBps),
        );
        const cuotaCents: bigint = grupo.totalCents - baseCents;
        const acumulado: FacturaImpuestoAccumulator = impuestos.get(grupo.ivaBps) ?? {
          baseCents: 0n,
          cuotaCents: 0n,
          totalCents: 0n,
        };

        acumulado.baseCents += baseCents;
        acumulado.cuotaCents += cuotaCents;
        acumulado.totalCents += grupo.totalCents;
        impuestos.set(grupo.ivaBps, acumulado);
      }
    }

    if (
      this.toSafeNumber(
        ventasTotalCents,
        'El importe total de las ventas supera el rango numérico seguro.',
      ) !== record.importeCents
    ) {
      throw new Error('El total de la factura no coincide con sus ventas.');
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
   * Agrupa los importes finales de una venta por IVA
   * y reconcilia el redondeo con su total canónico.
   */
  private buildVentaImpuestos(
    venta: ClienteFacturaDocumentoVentaRecord,
  ): VentaImpuestoAccumulator[] {
    if (venta.lineas.length === 0) {
      throw new Error('Una de las ventas de la factura no contiene líneas documentables.');
    }

    const gruposByIva: Map<number, VentaImpuestoAccumulator> = new Map<
      number,
      VentaImpuestoAccumulator
    >();
    let importeMicros: bigint = 0n;

    for (const linea of venta.lineas) {
      if (!Number.isSafeInteger(linea.importeMicros)) {
        throw new Error('El importe de una línea de factura no es válido.');
      }

      if (!Number.isSafeInteger(linea.ivaBps) || linea.ivaBps < 0 || linea.ivaBps > 10_000) {
        throw new Error('El tipo de IVA de una línea de factura no es válido.');
      }

      const lineaMicros: bigint = BigInt(linea.importeMicros);
      const grupo: VentaImpuestoAccumulator = gruposByIva.get(linea.ivaBps) ?? {
        ivaBps: linea.ivaBps,
        importeMicros: 0n,
        totalCents: 0n,
      };

      grupo.importeMicros += lineaMicros;
      gruposByIva.set(linea.ivaBps, grupo);
      importeMicros += lineaMicros;
    }

    if (this.roundMicrosToCents(importeMicros) !== venta.totalCents) {
      throw new Error('El total de una venta no coincide con sus líneas.');
    }

    const grupos: VentaImpuestoAccumulator[] = Array.from(gruposByIva.values());

    for (const grupo of grupos) {
      grupo.totalCents = BigInt(this.roundMicrosToCents(grupo.importeMicros));
    }

    const gruposTotalCents: bigint = grupos.reduce(
      (total: bigint, grupo: VentaImpuestoAccumulator): bigint => total + grupo.totalCents,
      0n,
    );
    const residual: bigint = BigInt(venta.totalCents) - gruposTotalCents;

    if (residual !== 0n) {
      let target: VentaImpuestoAccumulator = grupos[0];

      for (const grupo of grupos.slice(1)) {
        if (this.absBigInt(grupo.importeMicros) > this.absBigInt(target.importeMicros)) {
          target = grupo;
        }
      }

      target.totalCents += residual;
    }

    return grupos;
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
    const fechaEmision: string = this.requireFechaEmision(record);
    const year: number = Number(fechaEmision.slice(0, 4));

    if (!Number.isSafeInteger(year) || year < 1 || year > 9999) {
      throw new Error('La fecha de emisión de la factura no es válida.');
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
