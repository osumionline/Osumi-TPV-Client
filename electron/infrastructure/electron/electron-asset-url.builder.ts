import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';

const ALLOWED_PATH_PREFIXES: readonly string[] = ['files/', 'staging/'];

const ASSET_URL_PREFIX: string = 'osumi://assets/';

export default class ElectronAssetUrlBuilder implements AssetUrlBuilder {
  build(relativePath: string | null): string | null {
    if (relativePath === null) {
      return null;
    }

    const normalizedPath: string = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');

    const allowed: boolean = ALLOWED_PATH_PREFIXES.some((prefix: string): boolean =>
      normalizedPath.startsWith(prefix),
    );

    if (!allowed) {
      throw new Error(
        [
          'La ruta del archivo no pertenece',
          `al almacenamiento administrado: ${relativePath}.`,
        ].join(' '),
      );
    }

    const encodedPath: string = normalizedPath
      .split('/')
      .map((part: string): string => encodeURIComponent(part))
      .join('/');

    return `${ASSET_URL_PREFIX}${encodedPath}`;
  }
}
