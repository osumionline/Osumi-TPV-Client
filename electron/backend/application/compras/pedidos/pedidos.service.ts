import type PedidoRepositoryQuery from '@backend/contracts/compras/pedidos/pedido-query.interface';
import type PedidosRepository from '@backend/contracts/compras/pedidos/pedidos.repository.interface';
import type PedidoArticuloRecord from '@backend/domain/compras/pedidos/pedido-articulo-record.interface';
import type {
  PedidoCabeceraRecord,
  PedidoFormOptionsRecord,
  PedidoSaveRecord,
} from '@backend/domain/compras/pedidos/pedido-cabecera-record.interface';
import type PedidoLineaRecord from '@backend/domain/compras/pedidos/pedido-linea-record.interface';
import type {
  PedidoFilterOptionsRecord,
  PedidoGuardadoRowRecord,
  PedidoProveedorFilterRecord,
  PedidoRecepcionadoRowRecord,
  PedidosGuardadosResultadoRecord,
  PedidosRecepcionadosResultadoRecord,
} from '@backend/domain/compras/pedidos/pedido-listado-record.interface';
import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
  PedidoSaveCommand,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import { PEDIDO_OPTIONAL_COLUMN_IDS } from '@desktop-contracts/compras/pedidos/pedido-columnas.constants';
import type PedidoLineaInterface from '@desktop-contracts/compras/pedidos/pedido-linea.interface';
import type {
  PedidoFilterOptionsInterface,
  PedidoGuardadoRowInterface,
  PedidoListadoConsulta,
  PedidoProveedorFilterInterface,
  PedidoRecepcionadoRowInterface,
  PedidosGuardadosResultado,
  PedidosRecepcionadosResultado,
} from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import { PAGE_SIZE_OPTIONS } from '@desktop-contracts/shared/pagination.constants';

/**
 * Expone los casos de uso propios de Pedidos.
 */
export default class PedidosService {
  /**
   * Crea el servicio de Pedidos.
   */
  constructor(private readonly pedidosRepository: PedidosRepository) {}

  /**
   * Recupera una página validada de pedidos pendientes.
   */
  async searchPedidosGuardados(
    consulta: PedidoListadoConsulta,
  ): Promise<PedidosGuardadosResultado> {
    const query: PedidoRepositoryQuery = this.mapRepositoryQuery(consulta);
    const result: PedidosGuardadosResultadoRecord =
      await this.pedidosRepository.searchPedidosGuardados(query);

    return {
      rows: result.rows.map((row: PedidoGuardadoRowRecord): PedidoGuardadoRowInterface => ({
        id: row.id,
        publicId: row.publicId,
        fechaPedido: row.fechaPedido,
        idProveedor: row.idProveedor,
        proveedorNombre: row.proveedorNombre,
        tipo: row.tipo,
        numero: row.numero,
        importeMicros: row.importeMicros,
        observaciones: row.observaciones,
      })),
      totalRows: result.totalRows,
    };
  }

  /**
   * Recupera una página validada de pedidos recepcionados.
   */
  async searchPedidosRecepcionados(
    consulta: PedidoListadoConsulta,
  ): Promise<PedidosRecepcionadosResultado> {
    const query: PedidoRepositoryQuery = this.mapRepositoryQuery(consulta);
    const result: PedidosRecepcionadosResultadoRecord =
      await this.pedidosRepository.searchPedidosRecepcionados(query);

    return {
      rows: result.rows.map((row: PedidoRecepcionadoRowRecord): PedidoRecepcionadoRowInterface => ({
        id: row.id,
        publicId: row.publicId,
        fechaPedido: row.fechaPedido,
        fechaRecepcionado: row.fechaRecepcionado,
        fechaPago: row.fechaPago,
        idProveedor: row.idProveedor,
        proveedorNombre: row.proveedorNombre,
        tipo: row.tipo,
        numero: row.numero,
        importeMicros: row.importeMicros,
        observaciones: row.observaciones,
        europeo: row.europeo,
      })),
      totalRows: result.totalRows,
    };
  }

  /**
   * Recupera los proveedores disponibles para los filtros.
   */
  async getPedidoFilterOptions(): Promise<PedidoFilterOptionsInterface> {
    const result: PedidoFilterOptionsRecord = await this.pedidosRepository.getPedidoFilterOptions();

    return {
      proveedores: result.proveedores.map(
        (proveedor: PedidoProveedorFilterRecord): PedidoProveedorFilterInterface => ({
          idProveedor: proveedor.idProveedor,
          nombre: proveedor.nombre,
        }),
      ),
    };
  }

  /**
   * Recupera un pedido para editar su cabecera.
   */
  async getPedido(idPedido: number): Promise<PedidoCabeceraInterface | null> {
    this.validatePedidoId(idPedido);

    const record: PedidoCabeceraRecord | null = await this.pedidosRepository.getPedido(idPedido);

    return record === null
      ? null
      : {
          ...record,
          columnasVisibles: [...record.columnasVisibles],
        };
  }

  /**
   * Recupera las líneas persistidas de un pedido.
   */
  async getPedidoLineas(idPedido: number): Promise<readonly PedidoLineaInterface[]> {
    this.validatePedidoId(idPedido);

    const records: readonly PedidoLineaRecord[] =
      await this.pedidosRepository.getPedidoLineas(idPedido);

    return records.map((record: PedidoLineaRecord): PedidoLineaInterface => ({
      id: record.id,
      publicId: record.publicId,
      orden: record.orden,
      idArticulo: record.idArticulo,
      localizador: record.localizador,
      nombreArticulo: record.nombreArticulo,
      referencia: record.referencia,
      marcaNombre: record.marcaNombre,
      codigoBarras: record.codigoBarras,
      unidades: record.unidades,
      stockActual: record.stockActual,
      stockFinal: record.stockFinal,
      palbMicros: record.palbMicros,
      pucMicros: record.pucMicros,
      pvpMicros: record.pvpMicros,
      margenMicroporcentaje: record.margenMicroporcentaje,
      ivaBps: record.ivaBps,
      recargoEquivalenciaBps: record.recargoEquivalenciaBps,
      descuentoBps: record.descuentoBps,
    }));
  }

  /**
   * Recupera las opciones disponibles de la ficha.
   */
  async getPedidoFormOptions(): Promise<PedidoFormOptionsInterface> {
    const result: PedidoFormOptionsRecord = await this.pedidosRepository.getPedidoFormOptions();

    return {
      proveedores: result.proveedores.map((proveedor) => ({ ...proveedor })),
      tiposPago: result.tiposPago.map((tipoPago) => ({ ...tipoPago })),
    };
  }

  /**
   * Crea o actualiza una cabecera de Pedido.
   */
  async savePedido(command: PedidoSaveCommand): Promise<number> {
    const record: PedidoSaveRecord = this.normalizeSaveCommand(command);

    return this.pedidosRepository.savePedido(record);
  }

  /**
   * Elimina un pedido todavía pendiente.
   */
  async deletePedido(idPedido: number): Promise<void> {
    this.validatePedidoId(idPedido);

    await this.pedidosRepository.deletePedido(idPedido);
  }

  /**
   * Resuelve un código introducido o escaneado mediante
   * acceso directo, localizador o código de barras.
   */
  async resolvePedidoArticulo(codigo: string): Promise<PedidoArticuloInterface | null> {
    if (typeof codigo !== 'string') {
      throw new Error('El código del artículo no es válido.');
    }

    const normalizedCode: string = codigo.trim();

    if (normalizedCode.length === 0) {
      return null;
    }

    if (normalizedCode.length > 100) {
      throw new Error('El código del artículo es demasiado largo.');
    }

    const codigoNumerico: number | null = this.getPedidoArticuloNumericCode(normalizedCode);

    const record: PedidoArticuloRecord | null = await this.pedidosRepository.resolvePedidoArticulo(
      normalizedCode,
      codigoNumerico,
    );

    return record === null ? null : this.mapPedidoArticulo(record);
  }

  /**
   * Busca artículos activos mediante el texto libre
   * introducido en la ficha de Pedido.
   */
  async searchPedidoArticulos(texto: string): Promise<readonly PedidoArticuloInterface[]> {
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

    const searchPattern: string | null = this.getPedidoArticuloSearchPattern(normalizedText);

    if (searchPattern === null) {
      return [];
    }

    const records: readonly PedidoArticuloRecord[] =
      await this.pedidosRepository.searchPedidoArticulos(searchPattern);

    return records.map((record: PedidoArticuloRecord): PedidoArticuloInterface =>
      this.mapPedidoArticulo(record),
    );
  }

  /**
   * Convierte un código numérico positivo y seguro
   * en el valor utilizado por localizador/acceso directo.
   */
  private getPedidoArticuloNumericCode(codigo: string): number | null {
    if (!/^\d+$/.test(codigo)) {
      return null;
    }

    const numericCode: number = Number(codigo);

    if (!Number.isSafeInteger(numericCode) || numericCode <= 0) {
      return null;
    }

    return numericCode;
  }

  /**
   * Convierte un texto libre en el patrón utilizado
   * contra el slug normalizado de los artículos.
   */
  private getPedidoArticuloSearchPattern(texto: string): string | null {
    const normalizedText: string = texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

    if (normalizedText.length === 0) {
      return null;
    }

    return `%${normalizedText.split(/\s+/).join('%')}%`;
  }

  /**
   * Convierte el record interno del artículo en el
   * contrato público utilizado por Compras.
   */
  private mapPedidoArticulo(record: PedidoArticuloRecord): PedidoArticuloInterface {
    return {
      id: record.id,
      publicId: record.publicId,
      localizador: record.localizador,
      nombre: record.nombre,
      referencia: record.referencia,
      marcaNombre: record.marcaNombre,
      stock: record.stock,
      palbMicros: record.palbMicros,
      pucMicros: record.pucMicros,
      pvpMicros: record.pvpMicros,
      margenMicroporcentaje: record.margenMicroporcentaje,
      ivaBps: record.ivaBps,
      recargoEquivalenciaBps: record.recargoEquivalenciaBps,
      tieneCodigoBarrasAdicional: record.tieneCodigoBarrasAdicional,
      observaciones: record.observaciones,
      mostrarObservacionesPedidos: record.mostrarObservacionesPedidos,
    };
  }

  /**
   * Valida un identificador de Pedido.
   */
  private validatePedidoId(idPedido: number): void {
    if (!Number.isSafeInteger(idPedido) || idPedido <= 0) {
      throw new Error('El identificador del pedido no es válido.');
    }
  }

  /**
   * Normaliza la cabecera antes de persistirla.
   */
  private normalizeSaveCommand(command: PedidoSaveCommand): PedidoSaveRecord {
    if (typeof command !== 'object' || command === null) {
      throw new Error('Los datos del pedido no son válidos.');
    }

    if (command.id !== null) {
      this.validatePedidoId(command.id);
    }

    if (!Number.isSafeInteger(command.idProveedor) || command.idProveedor <= 0) {
      throw new Error('Debes seleccionar un proveedor.');
    }

    if (
      command.idTipoPago !== null &&
      (!Number.isSafeInteger(command.idTipoPago) || command.idTipoPago <= 0)
    ) {
      throw new Error('La forma de pago seleccionada no es válida.');
    }

    if (!['albaran', 'factura', 'abono'].includes(command.tipo)) {
      throw new Error('El tipo documental del pedido no es válido.');
    }

    const columnasVisibles: readonly number[] = [...new Set<number>(command.columnasVisibles)];

    if (
      columnasVisibles.some(
        (idColumna: number): boolean =>
          !Number.isSafeInteger(idColumna) || !PEDIDO_OPTIONAL_COLUMN_IDS.includes(idColumna),
      )
    ) {
      throw new Error('La configuración de columnas del pedido no es válida.');
    }

    return {
      id: command.id,
      idProveedor: command.idProveedor,
      idTipoPago: command.idTipoPago,
      formaPago: this.normalizeOptionalText(command.formaPago, 100),
      tipo: command.tipo,
      numero: this.normalizeOptionalText(command.numero, 200),
      fechaPedido: this.normalizePedidoDate(command.fechaPedido),
      fechaPago: this.normalizePedidoDate(command.fechaPago),
      recargoEquivalencia: command.recargoEquivalencia,
      europeo: command.europeo,
      observaciones: this.normalizeOptionalText(command.observaciones, null),
      columnasVisibles,
    };
  }

  /**
   * Normaliza un texto opcional.
   */
  private normalizeOptionalText(value: string | null, maxLength: number | null): string | null {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new Error('Uno de los textos del pedido no es válido.');
    }

    const normalized: string = value.trim();

    if (normalized === '') {
      return null;
    }

    if (maxLength !== null && normalized.length > maxLength) {
      throw new Error('Uno de los textos del pedido es demasiado largo.');
    }

    return normalized;
  }

  /**
   * Normaliza una fecha civil opcional.
   */
  private normalizePedidoDate(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    return this.normalizeOptionalDate(value, 'Una de las fechas del pedido no es válida.');
  }

  /**
   * Valida y transforma una consulta pública en una consulta de repository.
   */
  private mapRepositoryQuery(consulta: PedidoListadoConsulta): PedidoRepositoryQuery {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de pedidos no es válida.');
    }

    const fechaDesde: string | null = this.normalizeOptionalDate(
      consulta.fechaDesde,
      'La fecha inicial del filtro de pedidos no es válida.',
    );
    const fechaHasta: string | null = this.normalizeOptionalDate(
      consulta.fechaHasta,
      'La fecha final del filtro de pedidos no es válida.',
    );

    if (fechaDesde !== null && fechaHasta !== null && fechaDesde > fechaHasta) {
      throw new Error('La fecha inicial no puede ser posterior a la fecha final.');
    }

    const idProveedor: number | null = this.normalizeOptionalProviderId(consulta.idProveedor);
    const numero: string | null = this.normalizeNumero(consulta.numero);
    const importeDesdeMicros: number | null = this.normalizeOptionalAmount(
      consulta.importeDesdeMicros,
      'El importe mínimo del filtro de pedidos no es válido.',
    );
    const importeHastaMicros: number | null = this.normalizeOptionalAmount(
      consulta.importeHastaMicros,
      'El importe máximo del filtro de pedidos no es válido.',
    );

    if (
      importeDesdeMicros !== null &&
      importeHastaMicros !== null &&
      importeDesdeMicros > importeHastaMicros
    ) {
      throw new Error('El importe mínimo no puede ser superior al importe máximo.');
    }

    if (!Number.isSafeInteger(consulta.pagina) || consulta.pagina <= 0) {
      throw new Error('La página de pedidos no es válida.');
    }

    if (!PAGE_SIZE_OPTIONS.includes(consulta.num)) {
      throw new Error('El tamaño de página de pedidos no es válido.');
    }

    const offset: number = (consulta.pagina - 1) * consulta.num;

    if (!Number.isSafeInteger(offset)) {
      throw new Error('El desplazamiento de pedidos supera el rango permitido.');
    }

    return {
      fechaDesde,
      fechaHasta,
      idProveedor,
      numero,
      importeDesdeMicros,
      importeHastaMicros,
      offset,
      limit: consulta.num,
    };
  }

  /**
   * Normaliza una fecha civil opcional en formato YYYY-MM-DD.
   */
  private normalizeOptionalDate(value: string | null, message: string): string | null {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(message);
    }

    const year: number = Number(value.slice(0, 4));
    const month: number = Number(value.slice(5, 7));
    const day: number = Number(value.slice(8, 10));
    const date: Date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error(message);
    }

    return value;
  }

  /**
   * Normaliza el proveedor opcional del filtro.
   */
  private normalizeOptionalProviderId(value: number | null): number | null {
    if (value === null) {
      return null;
    }

    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('El proveedor del filtro de pedidos no es válido.');
    }

    return value;
  }

  /**
   * Normaliza el número documental buscado.
   */
  private normalizeNumero(value: string): string | null {
    if (typeof value !== 'string') {
      throw new Error('El número del filtro de pedidos no es válido.');
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length > 200) {
      throw new Error('El número del filtro de pedidos es demasiado largo.');
    }

    return normalizedValue === '' ? null : normalizedValue;
  }

  /**
   * Normaliza un importe opcional expresado en microeuros.
   */
  private normalizeOptionalAmount(value: number | null, message: string): number | null {
    if (value === null) {
      return null;
    }

    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(message);
    }

    return value;
  }
}
