import type CrearMarcaRecordCommand from '@backend/contracts/marcas/crear-marca-record-command.interface';
import type MarcaRepository from '@backend/contracts/marcas/marca.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';
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
   * Crea una marca después de normalizar sus datos.
   */
  async create(command: CrearMarcaCommand): Promise<MarcaInterface> {
    const recordCommand: CrearMarcaRecordCommand = {
      nombre: this.requireText(command.nombre, 'nombre de la marca', 100),
      telefono: this.normalizeOptionalText(command.telefono),
      email: this.normalizeOptionalEmail(command.email),
      direccion: this.normalizeOptionalText(command.direccion),
      web: this.normalizeOptionalText(command.web),
      observaciones: this.normalizeOptionalText(command.observaciones),
      crearProveedor: command.crearProveedor === true,
    };

    const marca: MarcaRecord = await this.marcaRepository.create(recordCommand);

    return this.toInterface(marca);
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
