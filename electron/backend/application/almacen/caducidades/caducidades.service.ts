import validateOptionalId from '@backend/application/almacen/validate-optional-id';
import type CaducidadFilterQuery from '@backend/contracts/almacen/caducidades/caducidad-filter-query.interface';
import type CaducidadRepositoryQuery from '@backend/contracts/almacen/caducidades/caducidad-query.interface';
import type CaducidadReportProvider from '@backend/contracts/almacen/caducidades/caducidad-report-provider.interface';
import type CaducidadesRepository from '@backend/contracts/almacen/caducidades/caducidades.repository.interface';
import type {
  CaducidadArticuloSearchRecord,
  CaducidadCreateRecord,
} from '@backend/domain/almacen/caducidades/caducidad-create-record.interface';
import type {
  CaducidadFilterOptionsRecord,
  CaducidadMarcaFilterRecord,
  CaducidadResultadoRecord,
  CaducidadRowRecord,
} from '@backend/domain/almacen/caducidades/caducidad-record.interface';
import type {
  CaducidadReportAnioRecord,
  CaducidadReportMarcaRecord,
  CaducidadReportMesRecord,
  CaducidadReportRecord,
} from '@backend/domain/almacen/caducidades/caducidad-report-record.interface';
import type {
  CaducidadArticuloSearchInterface,
  CaducidadCreateCommand,
} from '@desktop-contracts/almacen/caducidades/caducidad-create.interface';
import type {
  CaducidadReportAnioInterface,
  CaducidadReportConsulta,
  CaducidadReportInterface,
  CaducidadReportMarcaInterface,
  CaducidadReportMesInterface,
} from '@desktop-contracts/almacen/caducidades/caducidad-report.interface';
import type {
  CaducidadConsulta,
  CaducidadFilterOptionsInterface,
  CaducidadFilters,
  CaducidadMarcaFilterInterface,
  CaducidadResultado,
  CaducidadRowInterface,
} from '@desktop-contracts/almacen/caducidades/caducidad.interface';
import { PAGE_SIZE_OPTIONS } from '@desktop-contracts/shared/pagination.constants';

/**
 * Expone los casos de uso propios de Caducidades.
 */
export default class CaducidadesService implements CaducidadReportProvider {
  /**
   * Crea el servicio de Caducidades.
   */
  constructor(
    private readonly caducidadesRepository: CaducidadesRepository,
    private readonly currentDateProvider: () => Date = (): Date => new Date(),
  ) {}

  /**
   * Busca artículos activos candidatos a registrar
   * una pérdida por caducidad.
   */
  async searchCaducidadArticulos(
    texto: string,
  ): Promise<readonly CaducidadArticuloSearchInterface[]> {
    if (typeof texto !== 'string') {
      throw new Error('El texto de búsqueda de artículos no es válido.');
    }

    const normalizedText: string = texto.trim();

    if (normalizedText.length === 0) {
      return [];
    }
    if (normalizedText.length > 200) {
      throw new Error('El texto de búsqueda de artículos es demasiado largo.');
    }

    const rows: readonly CaducidadArticuloSearchRecord[] =
      await this.caducidadesRepository.searchCaducidadArticulos(normalizedText);

    return rows.map((row: CaducidadArticuloSearchRecord): CaducidadArticuloSearchInterface => ({
      id: row.id,
      localizador: row.localizador,
      marcaNombre: row.marcaNombre,
      nombre: row.nombre,
      stock: row.stock,
      pucMicros: row.pucMicros,
      pvpCents: row.pvpCents,
    }));
  }

  /**
   * Valida y registra una nueva caducidad.
   */
  async createCaducidad(command: CaducidadCreateCommand): Promise<void> {
    if (typeof command !== 'object' || command === null) {
      throw new Error('La caducidad indicada no es válida.');
    }

    if (!Number.isSafeInteger(command.idArticulo) || command.idArticulo <= 0) {
      throw new Error('El artículo seleccionado no es válido.');
    }
    if (!Number.isSafeInteger(command.unidades) || command.unidades <= 0) {
      throw new Error('Las unidades deben ser un entero mayor que cero.');
    }

    const currentDate: Date = this.currentDateProvider();

    if (!Number.isFinite(currentDate.getTime())) {
      throw new Error('No se ha podido determinar la fecha de la caducidad.');
    }

    const record: CaducidadCreateRecord = {
      idArticulo: command.idArticulo,
      unidades: command.unidades,
      fechaBaja: currentDate.toISOString(),
    };

    await this.caducidadesRepository.createCaducidad(record);
  }

  /**
   * Valida y revierte una pérdida por caducidad.
   */
  async deactivateCaducidad(idCaducidad: number): Promise<void> {
    if (!Number.isSafeInteger(idCaducidad) || idCaducidad <= 0) {
      throw new Error('El identificador de la caducidad no es válido.');
    }

    await this.caducidadesRepository.deactivateCaducidad(idCaducidad);
  }

  /**
   * Valida y ejecuta una consulta paginada de Caducidades.
   */
  async searchCaducidades(consulta: CaducidadConsulta): Promise<CaducidadResultado> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de caducidades no es válida.');
    }

    const filter: CaducidadFilterQuery = this.mapCaducidadFilterQuery(consulta);

    if (!Number.isSafeInteger(consulta.pagina) || consulta.pagina <= 0) {
      throw new Error('La página de caducidades no es válida.');
    }

    if (!PAGE_SIZE_OPTIONS.includes(consulta.num)) {
      throw new Error('El tamaño de página de caducidades no es válido.');
    }

    const offset: number = (consulta.pagina - 1) * consulta.num;

    if (!Number.isSafeInteger(offset)) {
      throw new Error('El desplazamiento de caducidades supera el rango permitido.');
    }

    const repositoryQuery: CaducidadRepositoryQuery = {
      ...filter,
      offset,
      limit: consulta.num,
    };

    const result: CaducidadResultadoRecord =
      await this.caducidadesRepository.searchCaducidades(repositoryQuery);

    return {
      rows: result.rows.map((row: CaducidadRowRecord): CaducidadRowInterface => ({
        id: row.id,
        publicId: row.publicId,
        idArticulo: row.idArticulo,
        localizador: row.localizador,
        idMarca: row.idMarca,
        marcaNombre: row.marcaNombre,
        nombre: row.nombre,
        unidades: row.unidades,
        pvpCents: row.pvpCents,
        pucMicros: row.pucMicros,
        totalPvpCents: row.totalPvpCents,
        fechaBaja: row.fechaBaja,
      })),
      totalRows: result.totalRows,
      totalUnidades: result.totalUnidades,
      totalPvpCents: result.totalPvpCents,
      totalPucMicros: result.totalPucMicros,
    };
  }

  /**
   * Valida los filtros y recupera el informe
   * agregado persistido de Caducidades.
   */
  async getCaducidadReport(consulta: CaducidadReportConsulta): Promise<CaducidadReportInterface> {
    const query: CaducidadFilterQuery = this.mapCaducidadFilterQuery(consulta);

    const result: CaducidadReportRecord =
      await this.caducidadesRepository.getCaducidadReport(query);

    return {
      anios: result.anios.map((anio: CaducidadReportAnioRecord): CaducidadReportAnioInterface => ({
        anio: anio.anio,
        unidades: anio.unidades,
        totalPvpCents: anio.totalPvpCents,
        totalPucMicros: anio.totalPucMicros,
        meses: anio.meses.map((mes: CaducidadReportMesRecord): CaducidadReportMesInterface => ({
          mes: mes.mes,
          unidades: mes.unidades,
          totalPvpCents: mes.totalPvpCents,
          totalPucMicros: mes.totalPucMicros,
          marcas: mes.marcas.map(
            (marca: CaducidadReportMarcaRecord): CaducidadReportMarcaInterface => ({
              idMarca: marca.idMarca,
              nombre: marca.nombre,
              unidades: marca.unidades,
              totalPvpCents: marca.totalPvpCents,
              totalPucMicros: marca.totalPucMicros,
            }),
          ),
        })),
      })),
      totalUnidades: result.totalUnidades,
      totalPvpCents: result.totalPvpCents,
      totalPucMicros: result.totalPucMicros,
    };
  }

  /**
   * Recupera las opciones históricas disponibles
   * para los filtros de Caducidades.
   */
  async getCaducidadFilterOptions(): Promise<CaducidadFilterOptionsInterface> {
    const result: CaducidadFilterOptionsRecord =
      await this.caducidadesRepository.getCaducidadFilterOptions();

    return {
      anios: [...result.anios],
      marcas: result.marcas.map(
        (marca: CaducidadMarcaFilterRecord): CaducidadMarcaFilterInterface => ({
          idMarca: marca.idMarca,
          nombre: marca.nombre,
        }),
      ),
    };
  }

  /**
   * Valida y normaliza los filtros compartidos
   * de Caducidades.
   */
  private mapCaducidadFilterQuery(filters: CaducidadFilters): CaducidadFilterQuery {
    if (typeof filters !== 'object' || filters === null) {
      throw new Error('La consulta de caducidades no es válida.');
    }

    let anio: number | null = null;

    if (filters.anio !== null) {
      if (
        typeof filters.anio !== 'number' ||
        !Number.isSafeInteger(filters.anio) ||
        filters.anio < 1 ||
        filters.anio > 9999
      ) {
        throw new Error('El año del filtro de caducidades no es válido.');
      }

      anio = filters.anio;
    }

    let mes: number | null = null;

    if (filters.mes !== null) {
      if (
        typeof filters.mes !== 'number' ||
        !Number.isSafeInteger(filters.mes) ||
        filters.mes < 1 ||
        filters.mes > 12
      ) {
        throw new Error('El mes del filtro de caducidades no es válido.');
      }

      mes = filters.mes;
    }

    const idMarca: number | null = validateOptionalId(
      filters.idMarca,
      'La marca del filtro de caducidades no es válida.',
    );

    if (typeof filters.nombre !== 'string') {
      throw new Error('El nombre del filtro de caducidades no es válido.');
    }

    const nombre: string = filters.nombre.trim();

    return {
      anio,
      mes,
      idMarca,
      nombre: nombre.length === 0 ? null : nombre,
    };
  }
}
