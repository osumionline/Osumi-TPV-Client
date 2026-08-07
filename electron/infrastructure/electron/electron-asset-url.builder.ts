import type AssetUrlBuilder from '@backend/contracts/asset-url-builder.interface';

const FILES_PATH_PREFIX: string = 'files/';

const ASSET_URL_PREFIX: string = 'osumi://assets/';

export default class ElectronAssetUrlBuilder implements AssetUrlBuilder {
  build(relativePath: string | null): string | null {
    if (relativePath === null) {
      return null;
    }

    const normalizedPath: string = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');

    if (!normalizedPath.startsWith(FILES_PATH_PREFIX)) {
      throw new Error(
        ['La ruta del archivo no pertenece', `al directorio de assets: ${relativePath}.`].join(' '),
      );
    }

    const encodedPath: string = normalizedPath
      .split('/')
      .map((part: string): string => encodeURIComponent(part))
      .join('/');

    return `${ASSET_URL_PREFIX}${encodedPath}`;
  }
}
