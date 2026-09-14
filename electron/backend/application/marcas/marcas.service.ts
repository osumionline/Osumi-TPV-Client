import type ActualizarMarcaRecordCommand from '@backend/contracts/marcas/actualizar-marca-record-command.interface';
import type CrearMarcaRecordCommand from '@backend/contracts/marcas/crear-marca-record-command.interface';
import type MarcaRepository from '@backend/contracts/marcas/marca.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';
import type ActualizarMarcaCommand from '@desktop-contracts/marcas/actualizar-marca-command.interface';
import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';

export default class MarcasService {
  constructor(
    private readonly marcaRepository: MarcaRepository,
    private readonly assetUrlBuilder: AssetUrlBuilder,
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
   * Crea una marca después de normalizar sus datos
   * y comprobar que no duplica otra marca activa.
   */
  async create(command: CrearMarcaCommand): Promise<MarcaInterface> {
    this.requireCommand(command);

    const editableFields: Omit<ActualizarMarcaRecordCommand, 'logo'> =
      this.normalizeEditableFields(command);

    await this.ensureNameAvailable(editableFields.nombre, null);

    const recordCommand: CrearMarcaRecordCommand = {
      ...editableFields,
      crearProveedor: command.crearProveedor === true,
      nuevoLogo: null,
    };

    const marca: MarcaRecord = await this.marcaRepository.create(recordCommand);

    return this.toInterface(marca);
  }

  /**
   * Actualiza una marca activa después de normalizar
   * sus datos y validar un posible cambio de nombre.
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

    const recordCommand: ActualizarMarcaRecordCommand = {
      ...editableFields,
      logo: {
        action: 'keep',
      },
    };

    const marca: MarcaRecord = await this.marcaRepository.update(validId, recordCommand);

    return this.toInterface(marca);
  }

  /**
   * Da de baja lógicamente una marca activa.
   */
  async deactivate(id: number): Promise<void> {
    const validId: number = this.validateMarcaId(id);

    await this.marcaRepository.deactivate(validId);
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
