import { spawnSync } from 'node:child_process';
import process from 'node:process';

const npmExecPath = process.env.npm_execpath;

if (npmExecPath === undefined || npmExecPath.length === 0) {
  throw new Error(
    'No se ha podido localizar npm. Ejecuta este script mediante "npm run test:electron".',
  );
}

let testExitCode = 1;
let electronRebuildExitCode = 0;

try {
  const nodeRebuildExitCode = runNpm(['rebuild', 'better-sqlite3', '--foreground-scripts']);

  if (nodeRebuildExitCode !== 0) {
    testExitCode = nodeRebuildExitCode;
  } else {
    testExitCode = runNpm(['run', 'test:electron:vitest']);
  }
} finally {
  electronRebuildExitCode = runNpm(['run', 'rebuild:native']);
}

if (testExitCode !== 0) {
  process.exitCode = testExitCode;
} else if (electronRebuildExitCode !== 0) {
  console.error(
    'Los tests han terminado correctamente, pero no se ha podido reconstruir better-sqlite3 para Electron.',
  );

  process.exitCode = electronRebuildExitCode;
}

function runNpm(args) {
  const result = spawnSync(process.execPath, [npmExecPath, ...args], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error !== undefined) {
    console.error(result.error);

    return 1;
  }

  return result.status ?? 1;
}
