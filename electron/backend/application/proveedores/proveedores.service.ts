import type CrearProveedorRecordCommand from '@backend/contracts/proveedores/crear-proveedor-record-command.interface';
import type ProveedorRepository from '@backend/contracts/proveedores/proveedor.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type ComercialRecord from '@backend/domain/proveedores/comercial-record.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';
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

  async getAll(): Promise<readonly ProveedorInterface[]> {
    const proveedores: readonly ProveedorRecord[] = await this.proveedorRepository.findAll();

    return proveedores.map((proveedor: ProveedorRecord): ProveedorInterface =>
      this.toInterface(proveedor),
    );
  }

  /**
   * Crea un proveedor después de normalizar sus datos
   * y las relaciones con marcas.
   */
  async create(command: CrearProveedorCommand): Promise<ProveedorInterface> {
    const idsMarcas: readonly number[] = this.normalizeMarcaIds(command.idsMarcas);

    const recordCommand: CrearProveedorRecordCommand = {
      nombre: this.requireText(command.nombre, 'nombre del proveedor', 150),
      direccion: this.normalizeOptionalText(command.direccion),
      email: this.normalizeOptionalEmail(command.email),
      web: this.normalizeOptionalText(command.web),
      telefono: this.normalizeOptionalText(command.telefono),
      observaciones: this.normalizeOptionalText(command.observaciones),
      idsMarcas,
    };

    const proveedor: ProveedorRecord = await this.proveedorRepository.create(recordCommand);

    return this.toInterface(proveedor);
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
