import type AlmacenRepository from '@backend/contracts/almacen/almacen.repository.interface';
import type InventarioRepositoryQuery from '@backend/contracts/almacen/inventario-query.interface';
import type {
  InventarioResultadoRecord,
  InventarioRowRecord,
} from '@backend/domain/almacen/inventario-record.interface';
import type {
  InventarioConsulta,
  InventarioResultado,
  InventarioRowInterface,
} from '@desktop-contracts/almacen/inventario.interface';

const INVENTARIO_PAGE_SIZES: readonly number[] = [20, 50, 100, 200];

/**
 * Expone los casos de uso del módulo Almacén.
 */
export default class AlmacenService {
  /**
   * Crea el servicio de Almacén.
   */
  constructor(
    private readonly almacenRepository: AlmacenRepository,
    private readonly currentDateProvider: () => Date = (): Date => new Date(),
  ) {}

  /**
   * Valida y ejecuta una consulta paginada de Inventario.
   */
  async searchInventario(consulta: InventarioConsulta): Promise<InventarioResultado> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de inventario no es válida.');
    }

    const idProveedor: number | null = this.validateOptionalId(
      consulta.idProveedor,
      'El proveedor del filtro no es válido.',
    );
    const idMarca: number | null = this.validateOptionalId(
      consulta.idMarca,
      'La marca del filtro no es válida.',
    );
    const idCategoria: number | null = this.validateOptionalId(
      consulta.idCategoria,
      'La categoría del filtro no es válida.',
    );

    if (typeof consulta.texto !== 'string') {
      throw new Error('El texto de búsqueda de inventario no es válido.');
    }

    if (typeof consulta.conDescuento !== 'boolean') {
      throw new Error('El filtro de descuento de inventario no es válido.');
    }

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

    const texto: string = consulta.texto.trim();
    const repositoryQuery: InventarioRepositoryQuery = {
      idProveedor,
      idMarca,
      idCategoria,
      texto: texto.length === 0 ? null : texto,
      conDescuento: consulta.conDescuento,
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
}
