import type ActualizarProveedorRecordCommand from '@backend/contracts/proveedores/actualizar-proveedor-record-command.interface';
import type CrearProveedorRecordCommand from '@backend/contracts/proveedores/crear-proveedor-record-command.interface';
import type ProveedorRepository from '@backend/contracts/proveedores/proveedor.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type ComercialRecord from '@backend/domain/proveedores/comercial-record.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';
import type ActualizarProveedorCommand from '@desktop-contracts/proveedores/actualizar-proveedor-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type {
  ComercialInterface,
  ProveedorInterface,
} from '@desktop-contracts/proveedores/proveedor.interface';

export default class ProveedoresService {
  constructor(
    private readonly proveedorRepository: ProveedorRepository,
    private readonly assetUrlBuilder: AssetUrlBuilder,
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
   * validar su nombre y las relaciones con marcas.
   */
  async create(command: CrearProveedorCommand): Promise<ProveedorInterface> {
    this.requireCommand(command);

    const recordCommand: CrearProveedorRecordCommand = this.normalizeEditableFields(command);

    await this.ensureNameAvailable(recordCommand.nombre, null);

    const proveedor: ProveedorRecord = await this.proveedorRepository.create(recordCommand);

    return this.toInterface(proveedor);
  }

  /**
   * Actualiza un proveedor activo después de normalizar
   * sus datos y validar su nombre y relaciones con marcas.
   */
  async update(id: number, command: ActualizarProveedorCommand): Promise<ProveedorInterface> {
    const validId: number = this.validateProveedorId(id);

    this.requireCommand(command);

    const current: ProveedorRecord | null = await this.proveedorRepository.findById(validId);

    if (current === null) {
      throw new Error('El proveedor indicado no existe o ya no está activo.');
    }

    const recordCommand: ActualizarProveedorRecordCommand = this.normalizeEditableFields(command);

    if (!this.areNamesEquivalent(current.nombre, recordCommand.nombre)) {
      await this.ensureNameAvailable(recordCommand.nombre, validId);
    }

    const proveedor: ProveedorRecord = await this.proveedorRepository.update(
      validId,
      recordCommand,
    );

    return this.toInterface(proveedor);
  }

  /**
   * Da de baja lógicamente un proveedor activo.
   */
  async deactivate(id: number): Promise<void> {
    const validId: number = this.validateProveedorId(id);

    await this.proveedorRepository.deactivate(validId);
  }

  /**
   * Normaliza los campos editables comunes al alta
   * y a la actualización de un proveedor.
   */
  private normalizeEditableFields(
    command: CrearProveedorCommand | ActualizarProveedorCommand,
  ): ActualizarProveedorRecordCommand {
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
      comerciales: proveedor.comerciales.map((comercial: ComercialRecord): ComercialInterface => ({
        id: comercial.id,
        publicId: comercial.publicId,
        idProveedor: comercial.idProveedor,
        nombre: comercial.nombre,
        telefono: comercial.telefono,
        email: comercial.email,
        observaciones: comercial.observaciones,
      })),
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
