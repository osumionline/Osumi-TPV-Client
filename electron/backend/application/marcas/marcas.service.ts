import type MarcaRepository from '@backend/contracts/marcas/marca.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';

export default class MarcasService {
  constructor(
    private readonly marcaRepository: MarcaRepository,
    private readonly assetUrlBuilder: AssetUrlBuilder,
  ) {}

  async getAll(): Promise<readonly MarcaInterface[]> {
    const marcas: readonly MarcaRecord[] = await this.marcaRepository.findAll();

    return marcas.map((marca: MarcaRecord): MarcaInterface => ({
      id: marca.id,
      publicId: marca.publicId,
      nombre: marca.nombre,
      direccion: marca.direccion,
      foto: this.assetUrlBuilder.build(marca.fotoRelativePath),
      telefono: marca.telefono,
      email: marca.email,
      web: marca.web,
      observaciones: marca.observaciones,
    }));
  }
}
