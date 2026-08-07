import type MarcaRepository from '@backend/contracts/marca.repository.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';

const FILES_PATH_PREFIX: string = 'files/';

const ASSET_URL_PREFIX: string = 'osumi://assets/';

export default class MarcasService {
  constructor(private readonly marcaRepository: MarcaRepository) {}

  async getAll(): Promise<readonly MarcaInterface[]> {
    const marcas: readonly MarcaRecord[] = await this.marcaRepository.findAll();

    return marcas.map((marca: MarcaRecord): MarcaInterface => ({
      id: marca.id,
      publicId: marca.publicId,
      nombre: marca.nombre,
      direccion: marca.direccion,
      foto: this.createAssetUrl(marca.fotoRelativePath),
      telefono: marca.telefono,
      email: marca.email,
      web: marca.web,
      observaciones: marca.observaciones,
    }));
  }

  private createAssetUrl(relativePath: string | null): string | null {
    if (relativePath === null) {
      return null;
    }

    const normalizedPath: string = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');

    if (!normalizedPath.startsWith(FILES_PATH_PREFIX)) {
      throw new Error(
        ['La imagen de una marca contiene', `una ruta de archivo no válida: ${relativePath}.`].join(
          ' ',
        ),
      );
    }

    const encodedPath: string = normalizedPath
      .split('/')
      .map((part: string): string => encodeURIComponent(part))
      .join('/');

    return `${ASSET_URL_PREFIX}${encodedPath}`;
  }
}
