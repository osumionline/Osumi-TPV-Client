import type ApplicationPaths from '@backend/contracts/application-paths.interface';
import { net, protocol } from 'electron';
import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
}

export default function registerAssetsProtocol(paths: ApplicationPaths): void {
  protocol.handle('osumi', async (request: Request): Promise<Response> => {
    const url: URL = new URL(request.url);

    if (url.host !== 'assets' || url.pathname !== '/logo') {
      return new Response(null, {
        status: 404,
      });
    }

    const logoExists: boolean = await fileExists(paths.logoFile);

    if (!logoExists) {
      return new Response(null, {
        status: 404,
      });
    }

    return net.fetch(pathToFileURL(paths.logoFile).toString());
  });
}
