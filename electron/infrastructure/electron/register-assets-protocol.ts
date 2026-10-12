import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import { net, protocol } from 'electron';
import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const ASSETS_HOST: string = 'assets';
const LOGO_PATH: string = '/logo';
const FILES_PATH_PREFIX: string = '/files/';
const STAGING_FILES_PATH_PREFIX: string = '/staging/';
const APPLICATION_ASSETS_PATH_PREFIX: string = '/app/';

/**
 * Registra el protocolo local utilizado
 * para servir assets administrados.
 */
export default function registerAssetsProtocol(
  paths: ApplicationPaths,
  applicationAssetsDirectory: string,
  applicationLogger: ApplicationLogger,
): void {
  protocol.handle(
    'osumi',

    async (request: Request): Promise<Response> => {
      try {
        return await handleAssetRequest(paths, applicationAssetsDirectory, request);
      } catch (error: unknown) {
        applicationLogger.warn({
          area: 'files',
          operation: 'serve-local-asset',
          message: 'No se ha podido resolver o servir un asset local.',
          error,
        });

        return notFound();
      }
    },
  );
}

/**
 * Resuelve una petición segura del protocolo local.
 */
async function handleAssetRequest(
  paths: ApplicationPaths,
  applicationAssetsDirectory: string,
  request: Request,
): Promise<Response> {
  const url: URL = new URL(request.url);

  if (url.host !== ASSETS_HOST) {
    return notFound();
  }

  if (url.pathname === LOGO_PATH) {
    return serveFile(paths.logoFile);
  }

  const filePath: string | null = await resolveAssetFilePath(
    paths,
    applicationAssetsDirectory,
    url.pathname,
  );

  if (filePath === null) {
    return notFound();
  }

  return serveFile(filePath);
}

/**
 * Resuelve la ruta física correspondiente
 * a una URL pública de assets.
 */
async function resolveAssetFilePath(
  paths: ApplicationPaths,
  applicationAssetsDirectory: string,
  pathname: string,
): Promise<string | null> {
  let decodedPath: string;

  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (decodedPath.startsWith(FILES_PATH_PREFIX)) {
    return resolveSafeFilePath(paths.filesDirectory, decodedPath.slice(FILES_PATH_PREFIX.length));
  }

  if (decodedPath.startsWith(STAGING_FILES_PATH_PREFIX)) {
    return resolveSafeFilePath(
      paths.stagingFilesDirectory,
      decodedPath.slice(STAGING_FILES_PATH_PREFIX.length),
    );
  }

  if (decodedPath.startsWith(APPLICATION_ASSETS_PATH_PREFIX)) {
    return resolveSafeFilePath(
      applicationAssetsDirectory,
      decodedPath.slice(APPLICATION_ASSETS_PATH_PREFIX.length),
    );
  }

  return null;
}

/**
 * Resuelve una ruta administrada comprobando
 * tanto su forma léxica como su ruta física real.
 */
async function resolveSafeFilePath(
  rootDirectory: string,
  requestedRelativePath: string,
): Promise<string | null> {
  if (requestedRelativePath.length === 0 || requestedRelativePath.includes('\0')) {
    return null;
  }

  const rootPath: string = resolve(rootDirectory);
  const candidatePath: string = resolve(rootPath, requestedRelativePath);

  const relativeCandidatePath: string = relative(rootPath, candidatePath);

  if (isOutsideRoot(relativeCandidatePath)) {
    return null;
  }

  const realRootDirectory: string = await getRequiredRealPath(rootPath);

  const realCandidatePath: string | null = await getOptionalRealPath(candidatePath);

  if (realCandidatePath === null) {
    return null;
  }

  const relativeRealPath: string = relative(realRootDirectory, realCandidatePath);

  if (isOutsideRoot(relativeRealPath)) {
    return null;
  }

  return realCandidatePath;
}

/**
 * Sirve un archivo existente mediante
 * el fetch nativo de Electron.
 */
async function serveFile(filePath: string): Promise<Response> {
  const fileExists: boolean = await isFile(filePath);

  if (!fileExists) {
    return notFound();
  }

  return net.fetch(pathToFileURL(filePath).toString());
}

/**
 * Comprueba si una ruta existente representa un archivo.
 *
 * La ausencia física es un estado esperado. Cualquier
 * otro fallo del filesystem se considera técnico.
 */
async function isFile(filePath: string): Promise<boolean> {
  try {
    const fileStats: Awaited<ReturnType<typeof stat>> = await stat(filePath);

    return fileStats.isFile();
  } catch (error: unknown) {
    if (isFileNotFoundError(error)) {
      return false;
    }

    throw new Error('No se ha podido comprobar el archivo solicitado por el protocolo de assets.', {
      cause: error,
    });
  }
}

/**
 * Resuelve el directorio raíz administrado.
 *
 * Su ausencia no es equivalente a la ausencia de un asset:
 * los directorios administrados deben existir.
 */
async function getRequiredRealPath(filePath: string): Promise<string> {
  try {
    return await realpath(filePath);
  } catch (error: unknown) {
    throw new Error('No se ha podido resolver el directorio administrado de assets.', {
      cause: error,
    });
  }
}

/**
 * Resuelve un asset candidato.
 *
 * La ausencia del candidato es un 404 esperado;
 * otros fallos del filesystem se propagan.
 */
async function getOptionalRealPath(filePath: string): Promise<string | null> {
  try {
    return await realpath(filePath);
  } catch (error: unknown) {
    if (isFileNotFoundError(error)) {
      return null;
    }

    throw new Error('No se ha podido resolver la ruta física de un asset.', {
      cause: error,
    });
  }
}

/**
 * Comprueba si una ruta relativa abandona
 * el directorio raíz administrado.
 */
function isOutsideRoot(relativePath: string): boolean {
  return (
    relativePath.length === 0 ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  );
}

/**
 * Comprueba si un error del filesystem
 * representa ausencia física del recurso.
 */
function isFileNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return error.code === 'ENOENT' || error.code === 'ENOTDIR';
}

/**
 * Genera la respuesta uniforme para
 * recursos locales no disponibles.
 */
function notFound(): Response {
  return new Response(null, {
    status: 404,
  });
}
