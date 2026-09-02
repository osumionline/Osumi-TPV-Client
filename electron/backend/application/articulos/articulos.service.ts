import type ArticuloHistoricoRepositoryQuery from '@backend/contracts/articulos/articulo-historico-query.interface';
import type ArticulosRepository from '@backend/contracts/articulos/articulos.repository.interface';
import type ImageAssetPromoter from '@backend/contracts/files/image-asset-promoter.interface';
import type StagedImageDiscarder from '@backend/contracts/files/staged-image-discarder.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type {
  ArticuloHistoricoPageRecord,
  ArticuloHistoricoRecord,
} from '@backend/domain/articulos/articulo-historico-record.interface';
import type {
  ArticuloAccesoDirectoRecord,
  ArticuloCodigoBarrasRecord,
  ArticuloFotoRecord,
  ArticuloRecord,
} from '@backend/domain/articulos/articulo-record.interface';
import type {
  ArticuloFotoSaveRecord,
  ArticuloSaveRecord,
} from '@backend/domain/articulos/articulo-save-record.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';
import type ArticuloAccesoDirectoCommand from '@desktop-contracts/articulos/articulo-acceso-directo-command.interface';
import type ArticuloAccesoDirectoInterface from '@desktop-contracts/articulos/articulo-acceso-directo.interface';
import type {
  ArticuloHistoricoConsulta,
  ArticuloHistoricoItem,
  ArticuloHistoricoResultado,
  ArticuloHistoricoSortDirection,
  ArticuloHistoricoSortField,
} from '@desktop-contracts/articulos/articulo-historico.interface';
import type {
  ArticuloFotoSaveInterface,
  ArticuloSaveInterface,
} from '@desktop-contracts/articulos/articulo-save.interface';
import type {
  ArticuloCodigoBarrasInterface,
  ArticuloFotoInterface,
  ArticuloInterface,
} from '@desktop-contracts/articulos/articulo.interface';

/**
 * Expone los casos de uso del módulo Artículos.
 */
export default class ArticulosService {
  /**
   * Crea el servicio de Artículos.
   */
  constructor(
    private readonly articulosRepository: ArticulosRepository,
    private readonly assetUrlBuilder: AssetUrlBuilder,
    private readonly imageAssetPromoter: ImageAssetPromoter,
    private readonly stagedImageDiscarder: StagedImageDiscarder,
  ) {}

  /**
   * Obtiene el detalle de un artículo activo por su identificador.
   */
  async getById(idArticulo: number): Promise<ArticuloInterface | null> {
    if (!Number.isSafeInteger(idArticulo) || idArticulo <= 0) {
      return null;
    }

    const articulo: ArticuloRecord | null = await this.articulosRepository.findById(idArticulo);

    return articulo === null ? null : this.mapArticulo(articulo);
  }

  /**
   * Resuelve un localizador, acceso directo o código de barras.
   */
  async resolveByCode(codigo: string): Promise<ArticuloInterface | null> {
    const normalizedCode: string = codigo.trim();

    if (normalizedCode.length === 0) {
      return null;
    }

    const codigoNumerico: number | null = this.getNumericCode(normalizedCode);
    const idArticulo: number | null = await this.articulosRepository.resolveIdByCode(
      normalizedCode,
      codigoNumerico,
    );

    return idArticulo === null ? null : this.getById(idArticulo);
  }

  /**
   * Recupera una página validada del histórico de un artículo.
   */
  async getHistorico(consulta: ArticuloHistoricoConsulta): Promise<ArticuloHistoricoResultado> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta del histórico no es válida.');
    }

    if (!Number.isSafeInteger(consulta.idArticulo) || consulta.idArticulo <= 0) {
      throw new Error('El identificador del artículo no es válido.');
    }

    if (!Number.isSafeInteger(consulta.pagina) || consulta.pagina <= 0) {
      throw new Error('La página del histórico no es válida.');
    }

    if (![20, 50, 100, 200].includes(consulta.num)) {
      throw new Error('El tamaño de página del histórico no es válido.');
    }

    if (!this.isHistoricoSortField(consulta.orderBy)) {
      throw new Error('El campo de orden del histórico no es válido.');
    }

    if (!this.isHistoricoSortDirection(consulta.orderDirection)) {
      throw new Error('La dirección de orden del histórico no es válida.');
    }

    const offset: number = (consulta.pagina - 1) * consulta.num;

    if (!Number.isSafeInteger(offset)) {
      throw new Error('El desplazamiento del histórico supera el rango permitido.');
    }

    const repositoryQuery: ArticuloHistoricoRepositoryQuery = {
      idArticulo: consulta.idArticulo,
      offset,
      limit: consulta.num,
      orderBy: consulta.orderBy,
      orderDirection: consulta.orderDirection,
    };
    const result: ArticuloHistoricoPageRecord =
      await this.articulosRepository.findHistorico(repositoryQuery);

    return {
      total: result.total,
      items: result.items.map((item: ArticuloHistoricoRecord): ArticuloHistoricoItem => ({
        id: item.id,
        publicId: item.publicId,
        tipo: item.tipo,
        stockPrevio: item.stockPrevio,
        diferencia: item.diferencia,
        stockFinal: item.stockFinal,
        idVenta: item.idVenta,
        idPedido: item.idPedido,
        idMermaCaducidad: item.idMermaCaducidad,
        pucMicros: item.pucMicros,
        pvpMicros: item.pvpMicros,
        createdAt: item.createdAt,
      })),
    };
  }

  /**
   * Obtiene los accesos directos asignados actualmente.
   */
  async getAccesosDirectos(): Promise<readonly ArticuloAccesoDirectoInterface[]> {
    const accesos: readonly ArticuloAccesoDirectoRecord[] =
      await this.articulosRepository.findAccesosDirectos();

    return accesos.map((acceso: ArticuloAccesoDirectoRecord): ArticuloAccesoDirectoInterface => ({
      id: acceso.id,
      publicId: acceso.publicId,
      accesoDirecto: acceso.accesoDirecto,
      nombre: acceso.nombre,
    }));
  }

  /**
   * Asigna, modifica o elimina el acceso directo de un artículo.
   */
  async setAccesoDirecto(command: ArticuloAccesoDirectoCommand): Promise<void> {
    if (!Number.isSafeInteger(command.idArticulo) || command.idArticulo <= 0) {
      throw new Error('El identificador del artículo no es válido.');
    }

    if (
      command.accesoDirecto !== null &&
      (!Number.isSafeInteger(command.accesoDirecto) || command.accesoDirecto <= 0)
    ) {
      throw new Error('El acceso directo debe ser un entero positivo.');
    }

    await this.articulosRepository.setAccesoDirecto(command.idArticulo, command.accesoDirecto);
  }

  /**
   * Crea o actualiza un artículo y devuelve
   * su estado persistido definitivo.
   */
  async save(command: ArticuloSaveInterface): Promise<ArticuloInterface> {
    this.validateSavePhotos(command.fotos);

    const preparedAssets: PreparedImageAsset[] = [];
    let persisted: boolean = false;

    try {
      const fotos: readonly ArticuloFotoSaveRecord[] = await this.preparePhotos(
        command.fotos,
        preparedAssets,
      );

      const saveRecord: ArticuloSaveRecord = this.mapSaveRecord(command, fotos);

      let idArticulo: number;

      if (saveRecord.id === null) {
        idArticulo = await this.articulosRepository.create(saveRecord);
      } else {
        await this.articulosRepository.update(saveRecord);
        idArticulo = saveRecord.id;
      }

      persisted = true;

      await this.discardPreparedStaging(preparedAssets);

      const articulo: ArticuloInterface | null = await this.getById(idArticulo);

      if (articulo === null) {
        throw new Error('No se ha podido cargar el artículo después de guardarlo.');
      }

      return articulo;
    } catch (error: unknown) {
      if (!persisted) {
        await this.rollbackPreparedAssets(preparedAssets, error);
      }

      throw error;
    }
  }

  /**
   * Da de baja lógicamente un artículo activo.
   */
  async deactivate(idArticulo: number): Promise<void> {
    if (!Number.isSafeInteger(idArticulo) || idArticulo <= 0) {
      throw new Error('El identificador del artículo no es válido.');
    }

    await this.articulosRepository.deactivate(idArticulo);
  }

  /**
   * Comprueba que un campo de orden pertenece
   * al contrato público del histórico.
   */
  private isHistoricoSortField(value: unknown): value is ArticuloHistoricoSortField {
    switch (value) {
      case 'createdAt':
      case 'tipo':
      case 'stockPrevio':
      case 'diferencia':
      case 'stockFinal':
      case 'pucMicros':
      case 'pvpMicros':
      case 'idVenta':
      case 'idPedido':
        return true;

      default:
        return false;
    }
  }

  /**
   * Comprueba la dirección de orden solicitada.
   */
  private isHistoricoSortDirection(value: unknown): value is ArticuloHistoricoSortDirection {
    return value === 'asc' || value === 'desc';
  }

  /**
   * Valida las referencias de fotos recibidas desde el renderer
   * antes de preparar archivos definitivos.
   */
  private validateSavePhotos(fotos: readonly ArticuloFotoSaveInterface[]): void {
    const ids: Set<number> = new Set<number>();
    const stagingIds: Set<string> = new Set<string>();
    let principalCount: number = 0;

    for (const foto of fotos) {
      if (!Number.isSafeInteger(foto.orden) || foto.orden < 0) {
        throw new Error('El orden de una foto no es válido.');
      }

      const hasId: boolean = foto.id !== null;
      const hasStaging: boolean = foto.stagingId !== null && foto.stagingId.trim().length > 0;

      if (hasId === hasStaging) {
        throw new Error(
          'Cada foto debe indicar un archivo persistido o una imagen temporal, pero no ambos.',
        );
      }

      if (foto.id !== null) {
        if (!Number.isSafeInteger(foto.id) || foto.id <= 0) {
          throw new Error('El identificador de una foto no es válido.');
        }

        if (ids.has(foto.id)) {
          throw new Error('Hay fotos persistidas repetidas en el artículo.');
        }

        ids.add(foto.id);
      }

      if (foto.stagingId !== null) {
        const stagingId: string = foto.stagingId.trim();

        if (stagingId.length === 0) {
          throw new Error('El identificador temporal de una foto no es válido.');
        }

        if (stagingIds.has(stagingId)) {
          throw new Error('Hay imágenes temporales repetidas en el artículo.');
        }

        stagingIds.add(stagingId);
      }

      if (foto.principal) {
        principalCount++;
      }
    }

    if (principalCount > 1) {
      throw new Error('Un artículo no puede tener más de una foto principal.');
    }
  }

  /**
   * Convierte las referencias públicas de fotos
   * en records listos para el repository.
   */
  private async preparePhotos(
    fotos: readonly ArticuloFotoSaveInterface[],
    preparedAssets: PreparedImageAsset[],
  ): Promise<readonly ArticuloFotoSaveRecord[]> {
    const result: ArticuloFotoSaveRecord[] = [];

    for (const foto of fotos) {
      if (foto.id !== null) {
        result.push({
          idArchivo: foto.id,
          nuevoArchivo: null,
          orden: foto.orden,
          principal: foto.principal,
        });

        continue;
      }

      if (foto.stagingId === null) {
        throw new Error('Una foto nueva no contiene identificador temporal.');
      }

      const prepared: PreparedImageAsset = await this.imageAssetPromoter.prepare(
        foto.stagingId.trim(),
        'article_image',
      );

      preparedAssets.push(prepared);

      result.push({
        idArchivo: null,
        nuevoArchivo: prepared.archivo,
        orden: foto.orden,
        principal: foto.principal,
      });
    }

    return result;
  }

  /**
   * Convierte el contrato público de guardado
   * en el record interno utilizado por el repository.
   */
  private mapSaveRecord(
    command: ArticuloSaveInterface,
    fotos: readonly ArticuloFotoSaveRecord[],
  ): ArticuloSaveRecord {
    return {
      id: command.id,
      nombre: command.nombre,
      idMarca: command.idMarca,
      idProveedor: command.idProveedor,
      idsCategorias: [...command.idsCategorias],
      referencia: command.referencia,
      precioAlbaranMicros: command.precioAlbaranMicros,
      pucMicros: command.pucMicros,
      pvpCents: command.pvpCents,
      pvpDescuentoCents: command.pvpDescuentoCents,
      ivaBps: command.ivaBps,
      reBps: command.reBps,
      margenMicroporcentaje: command.margenMicroporcentaje,
      margenDescuentoMicroporcentaje: command.margenDescuentoMicroporcentaje,
      stock: command.stock,
      stockMin: command.stockMin,
      stockMax: command.stockMax,
      loteOptimo: command.loteOptimo,
      ventaOnline: command.ventaOnline,
      mostrarEnWeb: command.mostrarEnWeb,
      descripcionCorta: command.descripcionCorta,
      descripcionLarga: command.descripcionLarga,
      observaciones: command.observaciones,
      mostrarObservacionesPedidos: command.mostrarObservacionesPedidos,
      mostrarObservacionesVentas: command.mostrarObservacionesVentas,
      accesoDirecto: command.accesoDirecto,
      codigosBarrasAdicionales: command.codigosBarrasAdicionales.map((codigo) => ({
        id: codigo.id,
        codigo: codigo.codigo.trim(),
      })),
      fotos,
    };
  }

  /**
   * Revierte todas las copias definitivas preparadas
   * cuando la persistencia SQLite no se completa.
   */
  private async rollbackPreparedAssets(
    preparedAssets: readonly PreparedImageAsset[],
    originalError: unknown,
  ): Promise<void> {
    const rollbackErrors: unknown[] = [];

    for (const prepared of preparedAssets) {
      try {
        await this.imageAssetPromoter.rollback(prepared);
      } catch (rollbackError: unknown) {
        rollbackErrors.push(rollbackError);
      }
    }

    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [originalError, ...rollbackErrors],
        'No se ha podido guardar el artículo ni limpiar todas las imágenes preparadas.',
        {
          cause: originalError,
        },
      );
    }
  }

  /**
   * Descarta las imágenes staged ya persistidas.
   *
   * Un fallo de limpieza no convierte en fallido
   * un guardado que SQLite ya ha confirmado.
   */
  private async discardPreparedStaging(
    preparedAssets: readonly PreparedImageAsset[],
  ): Promise<void> {
    await Promise.allSettled(
      preparedAssets.map((prepared: PreparedImageAsset): Promise<void> =>
        this.stagedImageDiscarder.discard(prepared.stagingId),
      ),
    );
  }

  /**
   * Convierte un código positivo representable de forma segura
   * en su valor numérico.
   */
  private getNumericCode(codigo: string): number | null {
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
   * Convierte el record interno en el contrato público del artículo.
   */
  private mapArticulo(articulo: ArticuloRecord): ArticuloInterface {
    return {
      id: articulo.id,
      publicId: articulo.publicId,
      localizador: articulo.localizador,
      nombre: articulo.nombre,
      idMarca: articulo.idMarca,
      idProveedor: articulo.idProveedor,
      idsCategorias: [...articulo.idsCategorias],
      referencia: articulo.referencia,
      precioAlbaranMicros: articulo.precioAlbaranMicros,
      pucMicros: articulo.pucMicros,
      pvpCents: articulo.pvpCents,
      pvpDescuentoCents: articulo.pvpDescuentoCents,
      ivaBps: articulo.ivaBps,
      reBps: articulo.reBps,
      margenMicroporcentaje: articulo.margenMicroporcentaje,
      margenDescuentoMicroporcentaje: articulo.margenDescuentoMicroporcentaje,
      stock: articulo.stock,
      stockMin: articulo.stockMin,
      stockMax: articulo.stockMax,
      loteOptimo: articulo.loteOptimo,
      ventaOnline: articulo.ventaOnline,
      mostrarEnWeb: articulo.mostrarEnWeb,
      descripcionCorta: articulo.descripcionCorta,
      descripcionLarga: articulo.descripcionLarga,
      observaciones: articulo.observaciones,
      mostrarObservacionesPedidos: articulo.mostrarObservacionesPedidos,
      mostrarObservacionesVentas: articulo.mostrarObservacionesVentas,
      accesoDirecto: articulo.accesoDirecto,
      codigosBarras: articulo.codigosBarras.map(
        (codigo: ArticuloCodigoBarrasRecord): ArticuloCodigoBarrasInterface => ({
          id: codigo.id,
          publicId: codigo.publicId,
          codigo: codigo.codigo,
          porDefecto: codigo.porDefecto,
        }),
      ),
      fotos: articulo.fotos.map((foto: ArticuloFotoRecord): ArticuloFotoInterface =>
        this.mapFoto(foto),
      ),
    };
  }

  /**
   * Convierte una foto persistida en una URL segura para el renderer.
   */
  private mapFoto(foto: ArticuloFotoRecord): ArticuloFotoInterface {
    const url: string | null = this.assetUrlBuilder.build(foto.relativePath);

    if (url === null) {
      throw new Error('No se ha podido construir la URL de una foto del artículo.');
    }

    return {
      id: foto.id,
      publicId: foto.publicId,
      originalName: foto.originalName,
      url,
      mimeType: foto.mimeType,
      sizeBytes: foto.sizeBytes,
      width: foto.width,
      height: foto.height,
      orden: foto.orden,
      principal: foto.principal,
    };
  }
}
