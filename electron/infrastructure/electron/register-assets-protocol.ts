import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import { net, protocol } from 'electron';
import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ASSETS_HOST: string = 'assets';

const LOGO_PATH: string = '/logo';

const FILES_PATH_PREFIX: string = '/files/';

const APPLICATION_ASSETS_PATH_PREFIX: string = '/app/';

export default function registerAssetsProtocol(
  paths: ApplicationPaths,
  applicationAssetsDirectory: string,
): void {
  protocol.handle(
    'osumi',

    async (request: Request): Promise<Response> => {
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
    },
  );
}

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

  if (decodedPath.startsWith(APPLICATION_ASSETS_PATH_PREFIX)) {
    return resolveSafeFilePath(
      applicationAssetsDirectory,
      decodedPath.slice(APPLICATION_ASSETS_PATH_PREFIX.length),
    );
  }

  return null;
}

async function resolveSafeFilePath(
  rootDirectory: string,
  requestedRelativePath: string,
): Promise<string | null> {
  if (requestedRelativePath.length === 0 || requestedRelativePath.includes('\0')) {
    return null;
  }

  const candidatePath: string = resolve(rootDirectory, requestedRelativePath);

  const relativeCandidatePath: string = relative(rootDirectory, candidatePath);

  if (
    relativeCandidatePath.length === 0 ||
    relativeCandidatePath === '..' ||
    relativeCandidatePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(relativeCandidatePath)
  ) {
    return null;
  }

  const realRootDirectory: string | null = await getRealPath(rootDirectory);

  const realCandidatePath: string | null = await getRealPath(candidatePath);

  if (realRootDirectory === null || realCandidatePath === null) {
    return null;
  }

  const relativeRealPath: string = relative(realRootDirectory, realCandidatePath);

  if (
    relativeRealPath.length === 0 ||
    relativeRealPath === '..' ||
    relativeRealPath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(relativeRealPath)
  ) {
    return null;
  }

  return realCandidatePath;
}

async function serveFile(filePath: string): Promise<Response> {
  const fileExists: boolean = await isFile(filePath);

  if (!fileExists) {
    return notFound();
  }

  return net.fetch(pathToFileURL(filePath).toString());
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    const fileStats: Awaited<ReturnType<typeof stat>> = await stat(filePath);

    return fileStats.isFile();
  } catch {
    return false;
  }
}

async function getRealPath(filePath: string): Promise<string | null> {
  try {
    return await realpath(filePath);
  } catch {
    return null;
  }
}

function notFound(): Response {
  return new Response(null, {
    status: 404,
  });
}
