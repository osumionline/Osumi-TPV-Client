import type AlmacenRepository from '@backend/contracts/almacen/almacen.repository.interface';
import type CaducidadFilterQuery from '@backend/contracts/almacen/caducidad-filter-query.interface';
import type CaducidadRepositoryQuery from '@backend/contracts/almacen/caducidad-query.interface';
import type InventarioFilterQuery from '@backend/contracts/almacen/inventario-filter-query.interface';
import type InventarioRepositoryQuery from '@backend/contracts/almacen/inventario-query.interface';
import type InventarioReportProvider from '@backend/contracts/almacen/inventario-report-provider.interface';
import type {
  CaducidadArticuloSearchRecord,
  CaducidadCreateRecord,
} from '@backend/domain/almacen/caducidad-create-record.interface';
import type {
  CaducidadFilterOptionsRecord,
  CaducidadMarcaFilterRecord,
  CaducidadResultadoRecord,
  CaducidadRowRecord,
} from '@backend/domain/almacen/caducidad-record.interface';
import type {
  InventarioResultadoRecord,
  InventarioRowRecord,
} from '@backend/domain/almacen/inventario-record.interface';
import type {
  InventarioReportRecord,
  InventarioReportRowRecord,
} from '@backend/domain/almacen/inventario-report-record.interface';
import type InventarioSaveRecord from '@backend/domain/almacen/inventario-save-record.interface';
import type {
  CaducidadArticuloSearchInterface,
  CaducidadCreateCommand,
} from '@desktop-contracts/almacen/caducidad-create.interface';
import type {
  CaducidadConsulta,
  CaducidadFilterOptionsInterface,
  CaducidadFilters,
  CaducidadMarcaFilterInterface,
  CaducidadResultado,
  CaducidadRowInterface,
} from '@desktop-contracts/almacen/caducidad.interface';
import type {
  InventarioReportColumn,
  InventarioReportConsulta,
  InventarioReportInterface,
  InventarioReportRowInterface,
} from '@desktop-contracts/almacen/inventario-report.interface';
import type { InventarioSaveCommand } from '@desktop-contracts/almacen/inventario-save.interface';
import type {
  InventarioConsulta,
  InventarioFilters,
  InventarioResultado,
  InventarioRowInterface,
} from '@desktop-contracts/almacen/inventario.interface';

const INVENTARIO_PAGE_SIZES: readonly number[] = [20, 50, 100, 200];

const INVENTARIO_REPORT_COLUMNS: readonly InventarioReportColumn[] = [
  'localizador',
  'proveedor',
  'marca',
  'referencia',
  'categoria',
  'nombre',
  'stock',
  'precioAlbaran',
  'puc',
  'pvp',
  'margen',
  'codigoBarras',
];

const CADUCIDAD_PAGE_SIZES: readonly number[] = [20, 50, 100, 200];

/**
 * Expone los casos de uso del módulo Almacén.
 */
export default class AlmacenService implements InventarioReportProvider {
  /**
   * Crea el servicio de Almacén.
   */
  constructor(
    private readonly almacenRepository: AlmacenRepository,
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
      await this.almacenRepository.searchCaducidadArticulos(normalizedText);

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

    await this.almacenRepository.createCaducidad(record);
  }

  /**
   * Valida y ejecuta una consulta paginada de
   * Caducidades.
   */
  async searchCaducidades(consulta: CaducidadConsulta): Promise<CaducidadResultado> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de caducidades no es válida.');
    }

    const filter: CaducidadFilterQuery = this.mapCaducidadFilterQuery(consulta);

    if (!Number.isSafeInteger(consulta.pagina) || consulta.pagina <= 0) {
      throw new Error('La página de caducidades no es válida.');
    }

    if (!CADUCIDAD_PAGE_SIZES.includes(consulta.num)) {
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
      await this.almacenRepository.searchCaducidades(repositoryQuery);

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
   * Recupera las opciones históricas disponibles para
   * los filtros de Caducidades.
   */
  async getCaducidadFilterOptions(): Promise<CaducidadFilterOptionsInterface> {
    const result: CaducidadFilterOptionsRecord =
      await this.almacenRepository.getCaducidadFilterOptions();

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
   * Valida y ejecuta una consulta paginada de Inventario.
   */
  async searchInventario(consulta: InventarioConsulta): Promise<InventarioResultado> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de inventario no es válida.');
    }

    const filter: InventarioFilterQuery = this.mapFilterQuery(consulta);

    if (!Number.isSafeInteger(consulta.pagina) || consulta.pagina <= 0) {
      throw new Error('La página de inventario no es válida.');
    }

    if (!INVENTARIO_PAGE_SIZES.includes(consulta.num)) {
      throw new Error('El tamaño de página de inventario no es válido.');
    }

    const offset: number = (consulta.pagina - 1) * consulta.num;

    if (!Number.isSafeInteger(offset)) {
      throw new Error('El desplazamiento de inventario supera el rango permitido.');
    }

    const repositoryQuery: InventarioRepositoryQuery = {
      ...filter,
      ventasDesde: this.getVentasDesde(),
      offset,
      limit: consulta.num,
    };

    const result: InventarioResultadoRecord =
      await this.almacenRepository.searchInventario(repositoryQuery);

    return {
      rows: result.rows.map((row: InventarioRowRecord): InventarioRowInterface => ({
        id: row.id,
        publicId: row.publicId,
        localizador: row.localizador,
        idProveedor: row.idProveedor,
        proveedorNombre: row.proveedorNombre,
        idMarca: row.idMarca,
        marcaNombre: row.marcaNombre,
        referencia: row.referencia,
        idsCategorias: [...row.idsCategorias],
        nombre: row.nombre,
        stock: row.stock,
        precioAlbaranMicros: row.precioAlbaranMicros,
        pucMicros: row.pucMicros,
        pvpCents: row.pvpCents,
        margenMicroporcentaje: row.margenMicroporcentaje,
        ivaBps: row.ivaBps,
        reBps: row.reBps,
        tieneCodigoAdicional: row.tieneCodigoAdicional,
        sinVentasUltimos12Meses: row.sinVentasUltimos12Meses,
      })),
      totalRows: result.totalRows,
      mediaMargenMicroporcentaje: result.mediaMargenMicroporcentaje,
      totalPucMicros: result.totalPucMicros,
      totalPvpCents: result.totalPvpCents,
    };
  }

  /**
   * Recupera un snapshot persistido completo para reportes de Inventario.
   */
  async getInventarioReport(
    consulta: InventarioReportConsulta,
  ): Promise<InventarioReportInterface> {
    const filter: InventarioFilterQuery = this.mapFilterQuery(consulta);

    this.validateReportColumns(consulta.columnas);

    const result: InventarioReportRecord = await this.almacenRepository.getInventarioReport(filter);

    return {
      rows: result.rows.map((row: InventarioReportRowRecord): InventarioReportRowInterface => ({
        localizador: row.localizador,
        proveedorNombre: row.proveedorNombre,
        marcaNombre: row.marcaNombre,
        referencia: row.referencia,
        categorias: [...row.categorias],
        nombre: row.nombre,
        stock: row.stock,
        precioAlbaranMicros: row.precioAlbaranMicros,
        pucMicros: row.pucMicros,
        pvpCents: row.pvpCents,
        margenMicroporcentaje: row.margenMicroporcentaje,
        codigosBarrasAdicionales: [...row.codigosBarrasAdicionales],
      })),
      totalRows: result.totalRows,
      mediaMargenMicroporcentaje: result.mediaMargenMicroporcentaje,
      totalPucMicros: result.totalPucMicros,
      totalPvpCents: result.totalPvpCents,
    };
  }

  /**
   * Persiste una única fila modificada de Inventario.
   */
  async saveInventarioRow(command: InventarioSaveCommand): Promise<void> {
    const record: InventarioSaveRecord = this.mapSaveRecord(command);

    await this.almacenRepository.saveInventarioRows([record]);
  }

  /**
   * Persiste todas las filas indicadas dentro de una única transacción.
   */
  async saveInventarioRows(commands: readonly InventarioSaveCommand[]): Promise<void> {
    if (!Array.isArray(commands) || commands.length === 0) {
      throw new Error('No hay filas de inventario para guardar.');
    }

    const records: readonly InventarioSaveRecord[] = commands.map(
      (command: InventarioSaveCommand): InventarioSaveRecord => this.mapSaveRecord(command),
    );

    const ids: Set<number> = new Set<number>();

    for (const record of records) {
      if (ids.has(record.idArticulo)) {
        throw new Error('Hay artículos repetidos en el guardado de inventario.');
      }

      ids.add(record.idArticulo);
    }

    await this.almacenRepository.saveInventarioRows(records);
  }

  /**
   * Da de baja lógicamente un artículo desde Inventario.
   */
  async deactivateArticulo(idArticulo: number): Promise<void> {
    if (!Number.isSafeInteger(idArticulo) || idArticulo <= 0) {
      throw new Error('El identificador del artículo no es válido.');
    }

    await this.almacenRepository.deactivateArticulo(idArticulo);
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

    const idMarca: number | null = this.validateOptionalId(
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

  /**
   * Valida y normaliza los filtros compartidos de Inventario.
   */
  private mapFilterQuery(filters: InventarioFilters): InventarioFilterQuery {
    if (typeof filters !== 'object' || filters === null) {
      throw new Error('La consulta de inventario no es válida.');
    }

    const idProveedor: number | null = this.validateOptionalId(
      filters.idProveedor,
      'El proveedor del filtro no es válido.',
    );

    const idMarca: number | null = this.validateOptionalId(
      filters.idMarca,
      'La marca del filtro no es válida.',
    );

    const idCategoria: number | null = this.validateOptionalId(
      filters.idCategoria,
      'La categoría del filtro no es válida.',
    );

    if (typeof filters.texto !== 'string') {
      throw new Error('El texto de búsqueda de inventario no es válido.');
    }

    if (typeof filters.conDescuento !== 'boolean') {
      throw new Error('El filtro de descuento de inventario no es válido.');
    }

    const texto: string = filters.texto.trim();

    return {
      idProveedor,
      idMarca,
      idCategoria,
      texto: texto.length === 0 ? null : texto,
      conDescuento: filters.conDescuento,
    };
  }

  /**
   * Valida las columnas solicitadas para un reporte.
   */
  private validateReportColumns(columnas: readonly InventarioReportColumn[]): void {
    if (!Array.isArray(columnas) || columnas.length === 0) {
      throw new Error('Debes seleccionar al menos una columna para exportar.');
    }

    const uniqueColumns: Set<InventarioReportColumn> = new Set<InventarioReportColumn>();

    for (const column of columnas as readonly unknown[]) {
      if (
        typeof column !== 'string' ||
        !INVENTARIO_REPORT_COLUMNS.includes(column as InventarioReportColumn)
      ) {
        throw new Error('Una de las columnas seleccionadas no es válida.');
      }

      const typedColumn: InventarioReportColumn = column as InventarioReportColumn;

      if (uniqueColumns.has(typedColumn)) {
        throw new Error('Hay columnas repetidas en el reporte.');
      }

      uniqueColumns.add(typedColumn);
    }
  }

  /**
   * Valida un identificador opcional utilizado como filtro.
   */
  private validateOptionalId(value: unknown, message: string): number | null {
    if (value === null) {
      return null;
    }

    if (!Number.isSafeInteger(value) || typeof value !== 'number' || value <= 0) {
      throw new Error(message);
    }

    return value;
  }

  /**
   * Calcula el inicio del período móvil de los últimos doce meses.
   */
  private getVentasDesde(): string {
    const currentDate: Date = this.currentDateProvider();

    if (!Number.isFinite(currentDate.getTime())) {
      throw new Error('No se ha podido determinar la fecha actual.');
    }

    const ventasDesde: Date = new Date(currentDate.getTime());

    ventasDesde.setUTCMonth(ventasDesde.getUTCMonth() - 12);

    return ventasDesde.toISOString();
  }

  /**
   * Valida y normaliza una fila editable de Inventario.
   */
  private mapSaveRecord(command: InventarioSaveCommand): InventarioSaveRecord {
    if (typeof command !== 'object' || command === null) {
      throw new Error('La fila de inventario no es válida.');
    }

    if (!Number.isSafeInteger(command.idArticulo) || command.idArticulo <= 0) {
      throw new Error('El identificador del artículo no es válido.');
    }

    if (!Array.isArray(command.idsCategorias)) {
      throw new Error('Las categorías del artículo no son válidas.');
    }

    const idsCategorias: number[] = [];

    for (const value of command.idsCategorias as readonly unknown[]) {
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw new Error('Una de las categorías seleccionadas no es válida.');
      }

      if (!idsCategorias.includes(value)) {
        idsCategorias.push(value);
      }
    }

    idsCategorias.sort((a: number, b: number): number => a - b);

    if (!Number.isSafeInteger(command.stock)) {
      throw new Error('El stock no es válido.');
    }

    this.validateNonNegativeInteger(command.precioAlbaranMicros, 'El Precio albarán no es válido.');
    this.validateNonNegativeInteger(command.pucMicros, 'El PUC no es válido.');
    this.validateNonNegativeInteger(command.pvpCents, 'El PVP no es válido.');

    if (!Number.isSafeInteger(command.margenMicroporcentaje)) {
      throw new Error('El margen no es válido.');
    }

    let codigoAdicional: string | null = null;

    if (command.codigoAdicional !== null) {
      if (typeof command.codigoAdicional !== 'string') {
        throw new Error('El código de barras no es válido.');
      }

      const codigo: string = command.codigoAdicional.trim();

      if (codigo.length > 0) {
        if (codigo.length > 100) {
          throw new Error('El código de barras no puede superar los 100 caracteres.');
        }

        codigoAdicional = codigo;
      }
    }

    return {
      idArticulo: command.idArticulo,
      idsCategorias,
      stock: command.stock,
      precioAlbaranMicros: command.precioAlbaranMicros,
      pucMicros: command.pucMicros,
      pvpCents: command.pvpCents,
      margenMicroporcentaje: command.margenMicroporcentaje,
      codigoAdicional,
    };
  }

  /**
   * Valida un entero monetario positivo o cero.
   */
  private validateNonNegativeInteger(value: unknown, message: string): void {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
      throw new Error(message);
    }
  }
}
