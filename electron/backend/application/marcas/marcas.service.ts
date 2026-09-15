import type ImageAssetPromoter from '@backend/contracts/files/image-asset-promoter.interface';
import type StagedImageDiscarder from '@backend/contracts/files/staged-image-discarder.interface';
import type ActualizarMarcaRecordCommand from '@backend/contracts/marcas/actualizar-marca-record-command.interface';
import type CrearMarcaRecordCommand from '@backend/contracts/marcas/crear-marca-record-command.interface';
import type MarcaLogoUpdateRecord from '@backend/contracts/marcas/marca-logo-update-record.type';
import type MarcaRepository from '@backend/contracts/marcas/marca.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';
import type ActualizarMarcaCommand from '@desktop-contracts/marcas/actualizar-marca-command.interface';
import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';
import type MarcaLogoUpdateCommand from '@desktop-contracts/marcas/marca-logo-update-command.type';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';
import createMarcaEstadisticasResult from '@backend/application/marcas/marca-estadisticas.utils';
import type MarcaEstadisticasRepositoryQuery from '@backend/contracts/marcas/marca-estadisticas-query.interface';
import type { MarcaEstadisticasRepositoryResult } from '@backend/domain/marcas/marca-estadisticas-record.interface';
import type {
  MarcaEstadisticasConsulta,
  MarcaEstadisticasResultado,
  MarcaEstadisticasTipo,
} from '@desktop-contracts/marcas/marca-estadisticas.interface';

interface PreparedMarcaLogoUpdate {
  readonly record: MarcaLogoUpdateRecord;
  readonly preparedAsset: PreparedImageAsset | null;
}

export default class MarcasService {
  /**
   * Crea el servicio de gestión de Marcas.
   */
  constructor(
    private readonly marcaRepository: MarcaRepository,
    private readonly assetUrlBuilder: AssetUrlBuilder,
    private readonly imageAssetPromoter: ImageAssetPromoter,
    private readonly stagedImageDiscarder: StagedImageDiscarder,
  ) {}

  /**
   * Obtiene todas las marcas activas.
   */
  async getAll(): Promise<readonly MarcaInterface[]> {
    const marcas: readonly MarcaRecord[] = await this.marcaRepository.findAll();

    return marcas.map((marca: MarcaRecord): MarcaInterface => this.toInterface(marca));
  }

  /**
   * Recupera una marca activa por su identificador.
   */
  async getById(id: number): Promise<MarcaInterface | null> {
    const validId: number = this.validateMarcaId(id);
    const marca: MarcaRecord | null = await this.marcaRepository.findById(validId);

    return marca === null ? null : this.toInterface(marca);
  }
  
  /**
 * Recupera las estadísticas históricas de ventas
 * correspondientes a los filtros de una Marca.
 */
async getEstadisticas(
  consulta: MarcaEstadisticasConsulta,
): Promise<MarcaEstadisticasResultado> {
  if (
    typeof consulta !== 'object' ||
    consulta === null
  ) {
    throw new Error(
      'La consulta de estadísticas no es válida.',
    );
  }

  const idMarca: number =
    this.validateMarcaId(
      consulta.idMarca,
    );

  if (
    !this.isEstadisticasTipo(
      consulta.tipo,
    )
  ) {
    throw new Error(
      'El tipo de estadísticas no es válido.',
    );
  }

  if (
    consulta.year !== null &&
    (
      !Number.isSafeInteger(
        consulta.year,
      ) ||
      consulta.year < 1 ||
      consulta.year > 9999
    )
  ) {
    throw new Error(
      'El año de las estadísticas no es válido.',
    );
  }

  if (
    consulta.month !== null &&
    (
      !Number.isSafeInteger(
        consulta.month,
      ) ||
      consulta.month < 1 ||
      consulta.month > 12
    )
  ) {
    throw new Error(
      'El mes de las estadísticas no es válido.',
    );
  }

  if (
    consulta.year === null &&
    consulta.month !== null
  ) {
    throw new Error(
      'No se puede seleccionar un mes sin seleccionar un año.',
    );
  }

  const repositoryQuery:
    MarcaEstadisticasRepositoryQuery = {
      idMarca,
      metric: consulta.tipo,
      year: consulta.year,
      month: consulta.month,
    };

  const repositoryResult:
    MarcaEstadisticasRepositoryResult =
    await this.marcaRepository.findEstadisticas(
      repositoryQuery,
    );

  return createMarcaEstadisticasResult(
    consulta,
    repositoryResult,
  );
}

  /**
   * Crea una marca después de normalizar sus datos,
   * validar su nombre y preparar opcionalmente su logo.
   */
  async create(command: CrearMarcaCommand): Promise<MarcaInterface> {
    this.requireCommand(command);

    const editableFields: Omit<ActualizarMarcaRecordCommand, 'logo'> =
      this.normalizeEditableFields(command);

    await this.ensureNameAvailable(editableFields.nombre, null);

    const stagingId: string | null = this.normalizeOptionalLogoStagingId(command.logoStagingId);

    let preparedAsset: PreparedImageAsset | null = null;
    let persisted: boolean = false;

    try {
      if (stagingId !== null) {
        preparedAsset = await this.imageAssetPromoter.prepare(stagingId, 'brand_image');
      }

      const recordCommand: CrearMarcaRecordCommand = {
        ...editableFields,
        crearProveedor: command.crearProveedor === true,
        nuevoLogo: preparedAsset?.archivo ?? null,
      };

      const marca: MarcaRecord = await this.marcaRepository.create(recordCommand);

      persisted = true;

      await this.discardPreparedStaging(preparedAsset);

      return this.toInterface(marca);
    } catch (error: unknown) {
      if (!persisted && preparedAsset !== null) {
        await this.rollbackPreparedAsset(preparedAsset, error);
      }

      throw error;
    }
  }

  /**
   * Actualiza una marca activa normalizando sus datos,
   * validando su nombre y aplicando el cambio de logo.
   */
  async update(id: number, command: ActualizarMarcaCommand): Promise<MarcaInterface> {
    const validId: number = this.validateMarcaId(id);

    this.requireCommand(command);

    const current: MarcaRecord | null = await this.marcaRepository.findById(validId);

    if (current === null) {
      throw new Error('La marca indicada no existe o ya no está activa.');
    }

    const editableFields: Omit<ActualizarMarcaRecordCommand, 'logo'> =
      this.normalizeEditableFields(command);

    if (!this.areNamesEquivalent(current.nombre, editableFields.nombre)) {
      await this.ensureNameAvailable(editableFields.nombre, validId);
    }

    let preparedLogo: PreparedMarcaLogoUpdate | null = null;
    let persisted: boolean = false;

    try {
      preparedLogo = await this.prepareLogoUpdate(command.logo);

      const recordCommand: ActualizarMarcaRecordCommand = {
        ...editableFields,
        logo: preparedLogo.record,
      };

      const marca: MarcaRecord = await this.marcaRepository.update(validId, recordCommand);

      persisted = true;

      await this.discardPreparedStaging(preparedLogo.preparedAsset);

      return this.toInterface(marca);
    } catch (error: unknown) {
      if (
        !persisted &&
        preparedLogo?.preparedAsset !== null &&
        preparedLogo?.preparedAsset !== undefined
      ) {
        await this.rollbackPreparedAsset(preparedLogo.preparedAsset, error);
      }

      throw error;
    }
  }

  /**
   * Da de baja lógicamente una marca activa.
   */
  async deactivate(id: number): Promise<void> {
    const validId: number = this.validateMarcaId(id);

    await this.marcaRepository.deactivate(validId);
  }
  
  /**
 * Comprueba el tipo solicitado para las
 * estadísticas históricas de una Marca.
 */
private isEstadisticasTipo(
  value: unknown,
): value is MarcaEstadisticasTipo {
  return (
    value === 'amount' ||
    value === 'units'
  );
}

  /**
   * Prepara la modificación solicitada sobre el logo
   * para que el repository pueda persistirla.
   */
  private async prepareLogoUpdate(
    logo: MarcaLogoUpdateCommand | undefined,
  ): Promise<PreparedMarcaLogoUpdate> {
    if (logo === undefined || logo.action === 'keep') {
      return {
        record: {
          action: 'keep',
        },
        preparedAsset: null,
      };
    }

    if (logo.action === 'remove') {
      return {
        record: {
          action: 'remove',
        },
        preparedAsset: null,
      };
    }

    const stagingId: string = this.requireLogoStagingId(logo.stagingId);

    const preparedAsset: PreparedImageAsset = await this.imageAssetPromoter.prepare(
      stagingId,
      'brand_image',
    );

    return {
      record: {
        action: 'replace',
        nuevoArchivo: preparedAsset.archivo,
      },
      preparedAsset,
    };
  }

  /**
   * Normaliza un identificador temporal opcional
   * utilizado al crear una Marca.
   */
  private normalizeOptionalLogoStagingId(stagingId: string | null | undefined): string | null {
    if (stagingId === null || stagingId === undefined) {
      return null;
    }

    return this.requireLogoStagingId(stagingId);
  }

  /**
   * Valida y normaliza un identificador temporal de logo.
   */
  private requireLogoStagingId(stagingId: string): string {
    const normalizedStagingId: string = stagingId.trim();

    if (normalizedStagingId.length === 0) {
      throw new Error('El identificador temporal del logo no es válido.');
    }

    return normalizedStagingId;
  }

  /**
   * Revierte una copia definitiva preparada cuando
   * la persistencia SQLite posterior ha fallado.
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
        'No se ha podido guardar la marca ni limpiar el logo preparado.',
        {
          cause: rollbackError,
        },
      );
    }
  }

  /**
   * Descarta el staging de un logo ya persistido.
   *
   * Un fallo de limpieza posterior al COMMIT no convierte
   * en fallido un guardado que SQLite ya ha confirmado.
   */
  private async discardPreparedStaging(preparedAsset: PreparedImageAsset | null): Promise<void> {
    if (preparedAsset === null) {
      return;
    }

    await Promise.allSettled([this.stagedImageDiscarder.discard(preparedAsset.stagingId)]);
  }

  /**
   * Normaliza los campos editables comunes al alta
   * y a la actualización de una marca.
   */
  private normalizeEditableFields(
    command: CrearMarcaCommand | ActualizarMarcaCommand,
  ): Omit<ActualizarMarcaRecordCommand, 'logo'> {
    return {
      nombre: this.requireText(command.nombre, 'nombre de la marca', 100),
      telefono: this.normalizeOptionalText(command.telefono),
      email: this.normalizeOptionalEmail(command.email),
      direccion: this.normalizeOptionalText(command.direccion),
      web: this.normalizeOptionalText(command.web),
      observaciones: this.normalizeOptionalText(command.observaciones),
    };
  }

  /**
   * Impide utilizar el nombre de otra marca activa.
   */
  private async ensureNameAvailable(nombre: string, excludeId: number | null): Promise<void> {
    const exists: boolean = await this.marcaRepository.existsActiveByName(nombre, excludeId);

    if (exists) {
      throw new Error('Ya existe una marca activa con ese nombre.');
    }
  }

  /**
   * Comprueba si dos nombres representan el mismo
   * valor ignorando únicamente diferencias de mayúsculas.
   */
  private areNamesEquivalent(first: string, second: string): boolean {
    return first.toLocaleLowerCase('es-ES') === second.toLocaleLowerCase('es-ES');
  }

  /**
   * Valida un identificador interno de Marca.
   */
  private validateMarcaId(id: number): number {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('El identificador de la marca no es válido.');
    }

    return id;
  }

  /**
   * Comprueba que el command recibido tenga una estructura
   * mínima válida antes de acceder a sus propiedades.
   */
  private requireCommand(command: CrearMarcaCommand | ActualizarMarcaCommand): void {
    if (typeof command !== 'object' || command === null) {
      throw new Error('Los datos de la marca no son válidos.');
    }
  }

  /**
   * Convierte una marca de dominio a su contrato público.
   */
  private toInterface(marca: MarcaRecord): MarcaInterface {
    return {
      id: marca.id,
      publicId: marca.publicId,
      nombre: marca.nombre,
      direccion: marca.direccion,
      foto: this.assetUrlBuilder.build(marca.fotoRelativePath),
      telefono: marca.telefono,
      email: marca.email,
      web: marca.web,
      observaciones: marca.observaciones,
    };
  }

  /**
   * Normaliza un campo obligatorio.
   */
  private requireText(value: string, field: string, maxLength: number): string {
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
   * Normaliza un texto opcional.
   */
  private normalizeOptionalText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const normalizedValue: string = value.trim();

    return normalizedValue === '' ? null : normalizedValue;
  }

  /**
   * Normaliza y valida un email opcional.
   */
  private normalizeOptionalEmail(value: string | null): string | null {
    const email: string | null = this.normalizeOptionalText(value);

    if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('El email indicado no tiene un formato válido.');
    }

    return email;
  }
}
