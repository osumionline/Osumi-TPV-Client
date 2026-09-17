import type ImageAssetPromoter from '@backend/contracts/files/image-asset-promoter.interface';
import type StagedImageDiscarder from '@backend/contracts/files/staged-image-discarder.interface';
import type ActualizarComercialRecordCommand from '@backend/contracts/proveedores/actualizar-comercial-record-command.interface';
import type ActualizarProveedorRecordCommand from '@backend/contracts/proveedores/actualizar-proveedor-record-command.interface';
import type CrearComercialRecordCommand from '@backend/contracts/proveedores/crear-comercial-record-command.interface';
import type CrearProveedorRecordCommand from '@backend/contracts/proveedores/crear-proveedor-record-command.interface';
import type ProveedorLogoUpdateRecord from '@backend/contracts/proveedores/proveedor-logo-update-record.type';
import type ProveedorRepository from '@backend/contracts/proveedores/proveedor.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';
import type ComercialRecord from '@backend/domain/proveedores/comercial-record.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';
import type ActualizarComercialCommand from '@desktop-contracts/compras/proveedores/actualizar-comercial-command.interface';
import type ActualizarProveedorCommand from '@desktop-contracts/compras/proveedores/actualizar-proveedor-command.interface';
import type CrearComercialCommand from '@desktop-contracts/compras/proveedores/crear-comercial-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/compras/proveedores/crear-proveedor-command.interface';
import type ProveedorLogoUpdateCommand from '@desktop-contracts/compras/proveedores/proveedor-logo-update-command.type';
import type {
  ComercialInterface,
  ProveedorInterface,
} from '@desktop-contracts/compras/proveedores/proveedor.interface';

type ProveedorEditableFields = Omit<ActualizarProveedorRecordCommand, 'logo'>;

interface PreparedProveedorLogoUpdate {
  readonly record: ProveedorLogoUpdateRecord;
  readonly preparedAsset: PreparedImageAsset | null;
}

export default class ProveedoresService {
  constructor(
    private readonly proveedorRepository: ProveedorRepository,
    private readonly assetUrlBuilder: AssetUrlBuilder,
    private readonly imageAssetPromoter: ImageAssetPromoter,
    private readonly stagedImageDiscarder: StagedImageDiscarder,
  ) {}

  /**
   * Obtiene todos los proveedores activos.
   */
  async getAll(): Promise<readonly ProveedorInterface[]> {
    const proveedores: readonly ProveedorRecord[] = await this.proveedorRepository.findAll();

    return proveedores.map((proveedor: ProveedorRecord): ProveedorInterface =>
      this.toInterface(proveedor),
    );
  }

  /**
   * Recupera un proveedor activo por su identificador.
   */
  async getById(id: number): Promise<ProveedorInterface | null> {
    const validId: number = this.validateProveedorId(id);

    const proveedor: ProveedorRecord | null = await this.proveedorRepository.findById(validId);

    return proveedor === null ? null : this.toInterface(proveedor);
  }

  /**
   * Crea un proveedor después de normalizar sus datos,
   * validar su nombre, marcas y logo opcional.
   */
  async create(command: CrearProveedorCommand): Promise<ProveedorInterface> {
    this.requireCommand(command);

    const editableFields: ProveedorEditableFields = this.normalizeEditableFields(command);

    await this.ensureNameAvailable(editableFields.nombre, null);

    const stagingId: string | null = this.normalizeOptionalLogoStagingId(command.logoStagingId);

    let preparedAsset: PreparedImageAsset | null = null;
    let persisted: boolean = false;

    try {
      if (stagingId !== null) {
        preparedAsset = await this.imageAssetPromoter.prepare(stagingId, 'provider_image');
      }

      const recordCommand: CrearProveedorRecordCommand = {
        ...editableFields,
        nuevoLogo: preparedAsset?.archivo ?? null,
      };

      const proveedor: ProveedorRecord = await this.proveedorRepository.create(recordCommand);

      persisted = true;

      await this.discardPreparedStaging(preparedAsset);

      return this.toInterface(proveedor);
    } catch (error: unknown) {
      if (!persisted && preparedAsset !== null) {
        await this.rollbackPreparedAsset(preparedAsset, error);
      }

      throw error;
    }
  }

  /**
   * Actualiza un proveedor activo después de normalizar
   * sus datos y aplicar la modificación solicitada al logo.
   */
  async update(id: number, command: ActualizarProveedorCommand): Promise<ProveedorInterface> {
    const validId: number = this.validateProveedorId(id);

    this.requireCommand(command);

    const current: ProveedorRecord | null = await this.proveedorRepository.findById(validId);

    if (current === null) {
      throw new Error('El proveedor indicado no existe o ya no está activo.');
    }

    const editableFields: ProveedorEditableFields = this.normalizeEditableFields(command);

    if (!this.areNamesEquivalent(current.nombre, editableFields.nombre)) {
      await this.ensureNameAvailable(editableFields.nombre, validId);
    }

    let preparedLogo: PreparedProveedorLogoUpdate | null = null;
    let persisted: boolean = false;

    try {
      preparedLogo = await this.prepareLogoUpdate(command.logo);

      const recordCommand: ActualizarProveedorRecordCommand = {
        ...editableFields,
        logo: preparedLogo.record,
      };

      const proveedor: ProveedorRecord = await this.proveedorRepository.update(
        validId,
        recordCommand,
      );

      persisted = true;

      await this.discardPreparedStaging(preparedLogo.preparedAsset);

      return this.toInterface(proveedor);
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
   * Da de baja lógicamente un proveedor activo.
   */
  async deactivate(id: number): Promise<void> {
    const validId: number = this.validateProveedorId(id);

    await this.proveedorRepository.deactivate(validId);
  }

  /**
   * Crea un Comercial independiente dentro
   * de un Proveedor activo.
   */
  async createComercial(
    idProveedor: number,
    command: CrearComercialCommand,
  ): Promise<ComercialInterface> {
    const validProveedorId: number = this.validateProveedorId(idProveedor);

    this.requireComercialCommand(command);

    const editableFields: ActualizarComercialRecordCommand =
      this.normalizeComercialEditableFields(command);

    const recordCommand: CrearComercialRecordCommand = {
      idProveedor: validProveedorId,
      ...editableFields,
    };

    const comercial: ComercialRecord =
      await this.proveedorRepository.createComercial(recordCommand);

    return this.toComercialInterface(comercial);
  }

  /**
   * Actualiza un Comercial comprobando que
   * continúe perteneciendo al Proveedor indicado.
   */
  async updateComercial(
    idProveedor: number,
    idComercial: number,
    command: ActualizarComercialCommand,
  ): Promise<ComercialInterface> {
    const validProveedorId: number = this.validateProveedorId(idProveedor);

    const validComercialId: number = this.validateComercialId(idComercial);

    this.requireComercialCommand(command);

    const editableFields: ActualizarComercialRecordCommand =
      this.normalizeComercialEditableFields(command);

    const comercial: ComercialRecord = await this.proveedorRepository.updateComercial(
      validProveedorId,
      validComercialId,
      editableFields,
    );

    return this.toComercialInterface(comercial);
  }

  /**
   * Da de baja un Comercial activo del
   * Proveedor al que pertenece.
   */
  async deactivateComercial(idProveedor: number, idComercial: number): Promise<void> {
    const validProveedorId: number = this.validateProveedorId(idProveedor);

    const validComercialId: number = this.validateComercialId(idComercial);

    await this.proveedorRepository.deactivateComercial(validProveedorId, validComercialId);
  }

  /**
   * Normaliza los campos editables comunes
   * al alta y edición de un Comercial.
   */
  private normalizeComercialEditableFields(
    command: CrearComercialCommand | ActualizarComercialCommand,
  ): ActualizarComercialRecordCommand {
    return {
      nombre: this.requireText(command.nombre, 'nombre del comercial', 100),
      telefono: this.normalizeOptionalText(command.telefono),
      email: this.normalizeOptionalEmail(command.email),
      observaciones: this.normalizeOptionalText(command.observaciones),
    };
  }

  /**
   * Valida un identificador interno
   * de Comercial.
   */
  private validateComercialId(id: number): number {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('El identificador del comercial no es válido.');
    }

    return id;
  }

  /**
   * Comprueba que el command de Comercial
   * tenga una estructura mínima válida.
   */
  private requireComercialCommand(
    command: CrearComercialCommand | ActualizarComercialCommand,
  ): void {
    if (typeof command !== 'object' || command === null) {
      throw new Error('Los datos del comercial no son válidos.');
    }
  }

  /**
   * Convierte un Comercial de dominio
   * a su contrato público.
   */
  private toComercialInterface(comercial: ComercialRecord): ComercialInterface {
    return {
      id: comercial.id,
      publicId: comercial.publicId,
      idProveedor: comercial.idProveedor,
      nombre: comercial.nombre,
      telefono: comercial.telefono,
      email: comercial.email,
      observaciones: comercial.observaciones,
    };
  }

  /**
   * Prepara la modificación solicitada sobre el logo
   * para que el repository pueda persistirla.
   */
  private async prepareLogoUpdate(
    logo: ProveedorLogoUpdateCommand | undefined,
  ): Promise<PreparedProveedorLogoUpdate> {
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
      'provider_image',
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
   * utilizado al crear un Proveedor.
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
        'No se ha podido guardar el proveedor ni limpiar el logo preparado.',
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
   * y a la actualización de un proveedor.
   */
  private normalizeEditableFields(
    command: CrearProveedorCommand | ActualizarProveedorCommand,
  ): ProveedorEditableFields {
    return {
      nombre: this.requireText(command.nombre, 'nombre del proveedor', 150),
      direccion: this.normalizeOptionalText(command.direccion),
      email: this.normalizeOptionalEmail(command.email),
      web: this.normalizeOptionalText(command.web),
      telefono: this.normalizeOptionalText(command.telefono),
      observaciones: this.normalizeOptionalText(command.observaciones),
      idsMarcas: this.normalizeMarcaIds(command.idsMarcas),
    };
  }

  /**
   * Impide utilizar el nombre de otro proveedor activo.
   */
  private async ensureNameAvailable(nombre: string, excludeId: number | null): Promise<void> {
    const exists: boolean = await this.proveedorRepository.existsActiveByName(nombre, excludeId);

    if (exists) {
      throw new Error('Ya existe un proveedor activo con ese nombre.');
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
   * Valida un identificador interno de proveedor.
   */
  private validateProveedorId(id: number): number {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('El identificador del proveedor no es válido.');
    }

    return id;
  }

  /**
   * Comprueba que el command recibido tenga una estructura
   * mínima válida antes de acceder a sus propiedades.
   */
  private requireCommand(command: CrearProveedorCommand | ActualizarProveedorCommand): void {
    if (typeof command !== 'object' || command === null) {
      throw new Error('Los datos del proveedor no son válidos.');
    }
  }

  /**
   * Convierte un proveedor de dominio a su contrato público.
   */
  private toInterface(proveedor: ProveedorRecord): ProveedorInterface {
    return {
      id: proveedor.id,
      publicId: proveedor.publicId,
      nombre: proveedor.nombre,
      foto: this.assetUrlBuilder.build(proveedor.fotoRelativePath),
      direccion: proveedor.direccion,
      telefono: proveedor.telefono,
      email: proveedor.email,
      web: proveedor.web,
      observaciones: proveedor.observaciones,
      marcas: [...proveedor.marcas],
      comerciales: proveedor.comerciales.map((comercial: ComercialRecord): ComercialInterface =>
        this.toComercialInterface(comercial),
      ),
    };
  }

  /**
   * Normaliza los identificadores de marcas seleccionadas.
   */
  private normalizeMarcaIds(idsMarcas: readonly number[]): readonly number[] {
    const result: number[] = [];

    for (const idMarca of idsMarcas) {
      if (!Number.isSafeInteger(idMarca) || idMarca <= 0) {
        throw new Error('Una de las marcas seleccionadas no es válida.');
      }

      if (!result.includes(idMarca)) {
        result.push(idMarca);
      }
    }

    return result;
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
