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

/**
 * Ejecuta npm conservando el entorno del proceso,
 * excepto el override de scripts que antes se
 * eliminaba mediante una instrucción de CMD.
 */
function runNpm(args) {
  const npmEnvironment = { ...process.env };

  delete npmEnvironment.npm_config_allow_scripts;

  const result = spawnSync(process.execPath, [npmExecPath, ...args], {
    stdio: 'inherit',
    env: npmEnvironment,
  });

  if (result.error !== undefined) {
    console.error(result.error);

    return 1;
  }

  return result.status ?? 1;
}
