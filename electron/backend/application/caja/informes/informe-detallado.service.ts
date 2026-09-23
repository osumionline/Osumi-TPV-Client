import InformePeriodoResolver from '@backend/application/caja/informes/informe-periodo.resolver';
import type InformeDetalladoProvider from '@backend/contracts/caja/informes/informe-detallado-provider.interface';
import type InformeDetalladoRepository from '@backend/contracts/caja/informes/informe-detallado.repository.interface';
import type {
  InformeDetalladoArticuloRecord,
  InformeDetalladoMarcaRecord,
  InformeDetalladoRepositoryResult,
} from '@backend/domain/caja/informes/informe-detallado-record.interface';
import type { InformePeriodosResueltos } from '@backend/domain/caja/informes/informe-periodo-resuelto.interface';
import type {
  InformeDetalladoArticulo,
  InformeDetalladoArticulosTotales,
  InformeDetalladoConsulta,
  InformeDetalladoMarca,
  InformeDetalladoMarcasTotales,
  InformeDetalladoResultado,
  InformeDetalladoVentas,
} from '@desktop-contracts/caja/informes/informe-detallado.interface';

/**
 * Construye el Informe Detallado de Caja
 * a partir de los agregados persistidos.
 */
export default class InformeDetalladoService implements InformeDetalladoProvider {
  constructor(
    private readonly repository: InformeDetalladoRepository,
    private readonly periodoResolver: InformePeriodoResolver,
  ) {}

  /**
   * Genera el Informe Detallado correspondiente
   * al mes o año completo solicitado.
   */
  async getInforme(consulta: InformeDetalladoConsulta): Promise<InformeDetalladoResultado> {
    const periodos: InformePeriodosResueltos = this.periodoResolver.resolve(consulta);

    const record: InformeDetalladoRepositoryResult = await this.repository.find(
      periodos.actual.desde,
      periodos.actual.hastaExclusive,
      periodos.anterior.desde,
      periodos.anterior.hastaExclusive,
    );

    const margenActualBps: number = this.calculateMarginBps(
      record.actual.totalBeneficioMicros,
      record.actual.totalVentasPvpMicros,
    );

    const margenAnteriorBps: number | null =
      record.anterior.totalVentasPvpMicros === 0
        ? null
        : this.calculateMarginBps(
            record.anterior.totalBeneficioMicros,
            record.anterior.totalVentasPvpMicros,
          );

    const ventas: InformeDetalladoVentas = {
      numeroVentas: record.actual.numeroVentas,
      numeroVentasAnterior: record.anterior.numeroVentas,
      diferenciaNumeroVentas: record.actual.numeroVentas - record.anterior.numeroVentas,
      margenBps: margenActualBps,
      margenAnteriorBps,
      diferenciaMargenBps: margenAnteriorBps === null ? null : margenActualBps - margenAnteriorBps,
    };

    const totalVentasMarcasMicros: number = record.marcas.reduce(
      (total: number, marca: InformeDetalladoMarcaRecord): number =>
        total + marca.totalVentasPvpMicros,
      0,
    );

    const totalBeneficioMarcasMicros: number = record.marcas.reduce(
      (total: number, marca: InformeDetalladoMarcaRecord): number =>
        total + marca.totalBeneficioMicros,
      0,
    );

    const marcas: readonly InformeDetalladoMarca[] = record.marcas.map(
      (marca: InformeDetalladoMarcaRecord): InformeDetalladoMarca =>
        this.mapMarca(marca, totalVentasMarcasMicros),
    );

    const marcasTotales: InformeDetalladoMarcasTotales = {
      totalVentasPvpMicros: totalVentasMarcasMicros,
      totalBeneficioMicros: totalBeneficioMarcasMicros,
      margenBps: this.calculateMarginBps(totalBeneficioMarcasMicros, totalVentasMarcasMicros),
    };

    const articulos: readonly InformeDetalladoArticulo[] = record.articulos.map(
      (articulo: InformeDetalladoArticuloRecord): InformeDetalladoArticulo =>
        this.mapArticulo(articulo, record.actual.numeroVentas),
    );

    const articulosTotales: InformeDetalladoArticulosTotales = {
      totalUnidadesVendidas: articulos.reduce(
        (total: number, articulo: InformeDetalladoArticulo): number =>
          total + articulo.totalUnidadesVendidas,
        0,
      ),

      totalVentasPvpMicros: articulos.reduce(
        (total: number, articulo: InformeDetalladoArticulo): number =>
          total + articulo.totalVentasPvpMicros,
        0,
      ),

      totalBeneficioMicros: articulos.reduce(
        (total: number, articulo: InformeDetalladoArticulo): number =>
          total + articulo.totalBeneficioMicros,
        0,
      ),
    };

    return {
      ventas,
      marcas,
      marcasTotales,
      articulos,
      articulosTotales,
    };
  }

  /**
   * Convierte un agregado persistido de marca
   * en su representación pública.
   */
  private mapMarca(
    marca: InformeDetalladoMarcaRecord,
    totalVentasMarcasMicros: number,
  ): InformeDetalladoMarca {
    const margenBps: number = this.calculateMarginBps(
      marca.totalBeneficioMicros,
      marca.totalVentasPvpMicros,
    );

    const margenAnteriorBps: number = this.calculateMarginBps(
      marca.totalBeneficioAnteriorMicros,
      marca.totalVentasPvpAnteriorMicros,
    );

    return {
      marcaPublicId: marca.marcaPublicId,
      nombre: marca.nombre,
      totalVentasPvpMicros: marca.totalVentasPvpMicros,
      totalBeneficioMicros: marca.totalBeneficioMicros,
      margenBps,
      margenAnteriorBps,
      diferenciaMargenBps: margenBps - margenAnteriorBps,
      porcentajeVentasBps: this.calculatePercentageBps(
        marca.totalVentasPvpMicros,
        totalVentasMarcasMicros,
      ),
    };
  }

  /**
   * Convierte un agregado persistido de artículo
   * en su representación pública.
   */
  private mapArticulo(
    articulo: InformeDetalladoArticuloRecord,
    numeroVentasPeriodo: number,
  ): InformeDetalladoArticulo {
    const margenBps: number = this.calculateMarginBps(
      articulo.totalBeneficioMicros,
      articulo.totalVentasPvpMicros,
    );

    const margenAnteriorBps: number | null =
      articulo.totalVentasPvpAnteriorMicros === null ||
      articulo.totalVentasPvpAnteriorMicros === 0 ||
      articulo.totalBeneficioAnteriorMicros === null
        ? null
        : this.calculateMarginBps(
            articulo.totalBeneficioAnteriorMicros,
            articulo.totalVentasPvpAnteriorMicros,
          );

    return {
      idArticulo: articulo.idArticulo,
      articuloPublicId: articulo.articuloPublicId,
      marca: articulo.marca,
      nombre: articulo.nombre,
      totalUnidadesVendidas: articulo.totalUnidadesVendidas,
      totalVentasPvpMicros: articulo.totalVentasPvpMicros,
      totalBeneficioMicros: articulo.totalBeneficioMicros,
      margenBps,
      margenAnteriorBps,
      diferenciaMargenBps: margenAnteriorBps === null ? null : margenBps - margenAnteriorBps,
      porcentajeVentasBps: this.calculatePercentageBps(
        articulo.numeroVentasArticulo,
        numeroVentasPeriodo,
      ),
    };
  }

  /**
   * Calcula un margen ponderado expresado
   * en puntos básicos.
   *
   * 3514 representa 35,14 %.
   */
  private calculateMarginBps(beneficioMicros: number, ventasPvpMicros: number): number {
    if (ventasPvpMicros === 0) {
      return 0;
    }

    return Math.round((beneficioMicros / ventasPvpMicros) * 10_000);
  }

  /**
   * Calcula una proporción porcentual
   * expresada en puntos básicos.
   */
  private calculatePercentageBps(value: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    return Math.round((value / total) * 10_000);
  }
}
