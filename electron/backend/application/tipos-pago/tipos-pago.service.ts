import createTipoPagoEstadisticasResult from '@backend/application/tipos-pago/tipo-pago-estadisticas.utils';
import type ImageAssetPromoter from '@backend/contracts/files/image-asset-promoter.interface';
import type StagedImageDiscarder from '@backend/contracts/files/staged-image-discarder.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type ActualizarTipoPagoRecordCommand from '@backend/contracts/tipos-pago/actualizar-tipo-pago-record-command.interface';
import type CrearTipoPagoRecordCommand from '@backend/contracts/tipos-pago/crear-tipo-pago-record-command.interface';
import type TipoPagoEstadisticasRepositoryQuery from '@backend/contracts/tipos-pago/tipo-pago-estadisticas-query.interface';
import type TipoPagoRepository from '@backend/contracts/tipos-pago/tipo-pago.repository.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';
import type { TipoPagoEstadisticasRepositoryResult } from '@backend/domain/tipos-pago/tipo-pago-estadisticas-record.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';
import type ActualizarTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/actualizar-tipo-pago-command.interface';
import type CrearTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/crear-tipo-pago-command.interface';
import ReordenarTiposPagoCommand from '@desktop-contracts/configuration/tipos-pago/reordenar-tipos-pago-command.interface';
import type {
  TipoPagoEstadisticasConsulta,
  TipoPagoEstadisticasResultado,
} from '@desktop-contracts/configuration/tipos-pago/tipo-pago-estadisticas.interface';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';

const EFECTIVO_SLUG: string = 'efectivo';

interface TipoPagoEditableFields {
  readonly nombre: string;
  readonly slug: string;
  readonly afectaCaja: boolean;
  readonly fisico: boolean;
}

export default class TiposPagoService {
  /**
   * Crea el servicio de Tipos de pago.
   */
  constructor(
    private readonly repository: TipoPagoRepository,
    private readonly assetUrlBuilder: AssetUrlBuilder,
    private readonly imageAssetPromoter: ImageAssetPromoter,
    private readonly stagedImageDiscarder: StagedImageDiscarder,
  ) {}

  /**
   * Obtiene todos los tipos de pago activos
   * disponibles para la aplicación.
   *
   * Incluye Efectivo porque forma parte
   * del maestro interno global.
   */
  async getAll(): Promise<readonly TipoPagoInterface[]> {
    const tiposPago: readonly TipoPagoRecord[] = await this.repository.findAll();

    return tiposPago.map((tipoPago: TipoPagoRecord): TipoPagoInterface =>
      this.toInterface(tipoPago),
    );
  }

  /**
   * Recupera las estadísticas históricas
   * del tipo de pago solicitado.
   */
  async getEstadisticas(
    consulta: TipoPagoEstadisticasConsulta,
  ): Promise<TipoPagoEstadisticasResultado> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de estadísticas no es válida.');
    }

    const idTipoPago: number = this.validateTipoPagoId(consulta.idTipoPago);

    if (
      consulta.year !== null &&
      (!Number.isSafeInteger(consulta.year) || consulta.year < 1 || consulta.year > 9999)
    ) {
      throw new Error('El año de las estadísticas no es válido.');
    }

    if (
      consulta.month !== null &&
      (!Number.isSafeInteger(consulta.month) || consulta.month < 1 || consulta.month > 12)
    ) {
      throw new Error('El mes de las estadísticas no es válido.');
    }

    if (consulta.year === null && consulta.month !== null) {
      throw new Error('No se puede seleccionar un mes sin seleccionar un año.');
    }

    const tipoPago: TipoPagoRecord | null = await this.repository.findById(idTipoPago);

    if (tipoPago === null) {
      throw new Error('El tipo de pago indicado no existe o ya no está activo.');
    }

    const repositoryQuery: TipoPagoEstadisticasRepositoryQuery = {
      idTipoPago,
      year: consulta.year,
      month: consulta.month,
    };

    const repositoryResult: TipoPagoEstadisticasRepositoryResult =
      await this.repository.findEstadisticas(repositoryQuery);

    return createTipoPagoEstadisticasResult(consulta, repositoryResult);
  }

  /**
   * Crea un nuevo tipo de pago configurable.
   *
   * El slug se genera internamente a partir del
   * nombre y el logo es siempre obligatorio.
   */
  async create(command: CrearTipoPagoCommand): Promise<TipoPagoInterface> {
    this.requireCommand(command);

    const editableFields: TipoPagoEditableFields = this.normalizeEditableFields(command);

    await this.ensureSlugAvailable(editableFields.slug, null);

    const stagingId: string = this.requireLogoStagingId(command.logoStagingId);

    let preparedAsset: PreparedImageAsset | null = null;

    let persisted: boolean = false;

    try {
      preparedAsset = await this.imageAssetPromoter.prepare(stagingId, 'payment_type_icon');

      const recordCommand: CrearTipoPagoRecordCommand = {
        ...editableFields,
        nuevoLogo: preparedAsset.archivo,
      };

      const tipoPago: TipoPagoRecord = await this.repository.create(recordCommand);

      persisted = true;

      await this.discardPreparedStaging(preparedAsset);

      return this.toInterface(tipoPago);
    } catch (error: unknown) {
      if (!persisted && preparedAsset !== null) {
        await this.rollbackPreparedAsset(preparedAsset, error);
      }

      throw error;
    }
  }

  /**
   * Actualiza un tipo de pago configurable.
   *
   * Efectivo es estructural y no puede modificarse.
   */
  async update(id: number, command: ActualizarTipoPagoCommand): Promise<TipoPagoInterface> {
    const validId: number = this.validateTipoPagoId(id);

    this.requireCommand(command);

    const current: TipoPagoRecord | null = await this.repository.findById(validId);

    if (current === null) {
      throw new Error('El tipo de pago indicado no existe o ya no está activo.');
    }

    this.assertConfigurable(current);

    const editableFields: TipoPagoEditableFields = this.normalizeEditableFields(command);

    if (current.slug !== editableFields.slug) {
      await this.ensureSlugAvailable(editableFields.slug, validId);
    }

    const stagingId: string | null = this.normalizeOptionalLogoStagingId(command.logoStagingId);

    if (stagingId === null && current.fotoRelativePath === null) {
      throw new Error('El logo del tipo de pago es obligatorio.');
    }

    let preparedAsset: PreparedImageAsset | null = null;

    let persisted: boolean = false;

    try {
      if (stagingId !== null) {
        preparedAsset = await this.imageAssetPromoter.prepare(stagingId, 'payment_type_icon');
      }

      const recordCommand: ActualizarTipoPagoRecordCommand = {
        ...editableFields,
        nuevoLogo: preparedAsset?.archivo ?? null,
      };

      const tipoPago: TipoPagoRecord = await this.repository.update(validId, recordCommand);

      persisted = true;

      await this.discardPreparedStaging(preparedAsset);

      return this.toInterface(tipoPago);
    } catch (error: unknown) {
      if (!persisted && preparedAsset !== null) {
        await this.rollbackPreparedAsset(preparedAsset, error);
      }

      throw error;
    }
  }

  /**
   * Reordena todos los tipos de pago configurables.
   *
   * El comando debe contener exactamente una vez
   * cada tipo configurable activo. Efectivo queda
   * excluido y conserva su orden estructural.
   */
  async reorder(command: ReordenarTiposPagoCommand): Promise<readonly TipoPagoInterface[]> {
    const ids: readonly number[] = this.normalizeReorderIds(command);

    const current: readonly TipoPagoRecord[] = await this.repository.findAll();

    const configurableIds: ReadonlySet<number> = new Set<number>(
      current
        .filter(
          (tipoPago: TipoPagoRecord): boolean =>
            tipoPago.slug.toLocaleLowerCase('es-ES') !== EFECTIVO_SLUG,
        )
        .map((tipoPago: TipoPagoRecord): number => tipoPago.id),
    );

    const matchesCurrentMaster: boolean =
      ids.length === configurableIds.size &&
      ids.every((id: number): boolean => configurableIds.has(id));

    if (!matchesCurrentMaster) {
      throw new Error('El orden recibido no coincide con los tipos de pago configurables activos.');
    }

    const tiposPago: readonly TipoPagoRecord[] = await this.repository.reorder(ids);

    return tiposPago.map((tipoPago: TipoPagoRecord): TipoPagoInterface =>
      this.toInterface(tipoPago),
    );
  }

  /**
   * Da de baja lógicamente un tipo de pago configurable.
   *
   * Efectivo es estructural y no puede eliminarse.
   */
  async deactivate(id: number): Promise<void> {
    const validId: number = this.validateTipoPagoId(id);

    const current: TipoPagoRecord | null = await this.repository.findById(validId);

    if (current === null) {
      throw new Error('El tipo de pago indicado no existe o ya no está activo.');
    }

    this.assertConfigurable(current);

    await this.repository.deactivate(validId);
  }

  /**
   * Valida y normaliza el comando recibido
   * para reordenar Tipos de pago.
   */
  private normalizeReorderIds(command: ReordenarTiposPagoCommand): readonly number[] {
    if (typeof command !== 'object' || command === null || !Array.isArray(command.ids)) {
      throw new Error('El orden de tipos de pago no es válido.');
    }

    const ids: readonly number[] = [...command.ids];

    if (ids.some((id: number): boolean => !Number.isSafeInteger(id) || id <= 0)) {
      throw new Error('El orden contiene un identificador de tipo de pago no válido.');
    }

    if (new Set<number>(ids).size !== ids.length) {
      throw new Error('El orden de tipos de pago contiene identificadores duplicados.');
    }

    return ids;
  }

  /**
   * Normaliza los campos editables y genera
   * el slug interno a partir del nombre.
   */
  private normalizeEditableFields(
    command: CrearTipoPagoCommand | ActualizarTipoPagoCommand,
  ): TipoPagoEditableFields {
    const nombre: string = this.requireText(command.nombre, 'nombre del tipo de pago', 100);

    if (typeof command.afectaCaja !== 'boolean') {
      throw new Error('El valor afectaCaja del tipo de pago no es válido.');
    }

    if (typeof command.fisico !== 'boolean') {
      throw new Error('El valor fisico del tipo de pago no es válido.');
    }

    return {
      nombre,
      slug: this.createSlug(nombre),
      afectaCaja: command.afectaCaja,
      fisico: command.fisico,
    };
  }

  /**
   * Genera el identificador interno usado históricamente
   * por los tipos de pago a partir de su nombre.
   */
  private createSlug(value: string): string {
    /*
     * Estas sustituciones mantienen los casos especiales
     * más relevantes del slugify usado por el TPV antiguo.
     */
    const normalized: string = value
      .replaceAll('Ä', 'Ae')
      .replaceAll('ä', 'ae')
      .replaceAll('Ö', 'Oe')
      .replaceAll('ö', 'oe')
      .replaceAll('Ü', 'Ue')
      .replaceAll('ü', 'ue')
      .replaceAll('ß', 'ss')
      .replaceAll('Œ', 'OE')
      .replaceAll('œ', 'oe')
      .replaceAll('Æ', 'AE')
      .replaceAll('æ', 'ae')
      .replaceAll('Þ', 'TH')
      .replaceAll('þ', 'th')
      .replaceAll('Ð', 'DH')
      .replaceAll('ð', 'dh')
      .replaceAll('Ø', 'O')
      .replaceAll('ø', 'o')
      .replaceAll('Ł', 'L')
      .replaceAll('ł', 'l')
      .replaceAll('µ', 'u')
      .replace(/[”“‘’'ºª¿]/gu, '')
      .replaceAll('_', '-')
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/\W/gu, ' ')
      .trim()
      .replace(/\s+/gu, '-')
      .replace(/^-+|-+$/gu, '');

    const slug: string = normalized.slice(0, 100).replace(/-+$/gu, '');

    if (slug === '') {
      throw new Error('No se ha podido generar un slug válido para el tipo de pago.');
    }

    return slug;
  }

  /**
   * Impide utilizar un slug que ya pertenece
   * a otro tipo de pago activo.
   */
  private async ensureSlugAvailable(slug: string, excludeId: number | null): Promise<void> {
    const exists: boolean = await this.repository.existsActiveBySlug(slug, excludeId);

    if (exists) {
      throw new Error('Ya existe un tipo de pago activo con ese nombre.');
    }
  }

  /**
   * Protege el tipo de pago estructural Efectivo
   * frente a cualquier modificación o baja.
   */
  private assertConfigurable(tipoPago: TipoPagoRecord): void {
    if (tipoPago.slug.toLocaleLowerCase('es-ES') === EFECTIVO_SLUG) {
      throw new Error('El tipo de pago Efectivo es estructural y no puede modificarse.');
    }
  }

  /**
   * Normaliza un staging opcional utilizado
   * durante una actualización.
   */
  private normalizeOptionalLogoStagingId(stagingId: string | null): string | null {
    if (stagingId === null) {
      return null;
    }

    return this.requireLogoStagingId(stagingId);
  }

  /**
   * Valida el identificador de un logo staged.
   */
  private requireLogoStagingId(stagingId: string): string {
    if (typeof stagingId !== 'string') {
      throw new Error('El identificador temporal del logo no es válido.');
    }

    const normalizedStagingId: string = stagingId.trim();

    if (normalizedStagingId === '') {
      throw new Error('El logo del tipo de pago es obligatorio.');
    }

    return normalizedStagingId;
  }

  /**
   * Revierte una copia definitiva preparada
   * cuando SQLite no ha podido persistirla.
   */
  private async rollbackPreparedAsset(
    preparedAsset: PreparedImageAsset,
    originalError: unknown,
  ): Promise<void> {
    try {
      await this.imageAssetPromoter.rollback(preparedAsset);
    } catch (rollbackError: unknown) {
      throw new AggregateError(
        [originalError, rollbackError],
        'No se ha podido guardar el tipo de pago ni limpiar el logo preparado.',
        {
          cause: rollbackError,
        },
      );
    }
  }

  /**
   * Descarta el staging de un logo cuya
   * persistencia ya ha sido confirmada.
   *
   * Un fallo de limpieza posterior al COMMIT
   * no convierte el guardado en fallido.
   */
  private async discardPreparedStaging(preparedAsset: PreparedImageAsset | null): Promise<void> {
    if (preparedAsset === null) {
      return;
    }

    await Promise.allSettled([this.stagedImageDiscarder.discard(preparedAsset.stagingId)]);
  }

  /**
   * Valida un identificador interno
   * de Tipo de pago.
   */
  private validateTipoPagoId(id: number): number {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('El identificador del tipo de pago no es válido.');
    }

    return id;
  }

  /**
   * Comprueba la estructura básica del
   * comando recibido desde el renderer.
   */
  private requireCommand(command: CrearTipoPagoCommand | ActualizarTipoPagoCommand): void {
    if (typeof command !== 'object' || command === null) {
      throw new Error('Los datos del tipo de pago no son válidos.');
    }
  }

  /**
   * Normaliza un texto obligatorio.
   */
  private requireText(value: string, field: string, maxLength: number): string {
    if (typeof value !== 'string') {
      throw new Error(`El ${field} no es válido.`);
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue.length === 0) {
      throw new Error(`El ${field} no puede estar vacío.`);
    }

    if (normalizedValue.length > maxLength) {
      throw new Error(`El ${field} no puede superar los ${maxLength} caracteres.`);
    }

    return normalizedValue;
  }

  /**
   * Convierte el record interno al
   * contrato público del renderer.
   */
  private toInterface(tipoPago: TipoPagoRecord): TipoPagoInterface {
    return {
      id: tipoPago.id,
      publicId: tipoPago.publicId,
      nombre: tipoPago.nombre,
      slug: tipoPago.slug,
      foto: this.assetUrlBuilder.build(tipoPago.fotoRelativePath),
      afectaCaja: tipoPago.afectaCaja,
      orden: tipoPago.orden,
      fisico: tipoPago.fisico,
    };
  }
}
