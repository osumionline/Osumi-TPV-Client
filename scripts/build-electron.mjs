import { build } from 'esbuild';
import { rm } from 'node:fs/promises';

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: {
    main: 'electron/main.ts',
    preload: 'electron/preload.ts',
    'legacy-import-worker': 'electron/workers/legacy-import-worker.ts',
  },

  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2022',

  outdir: 'dist-electron',
  entryNames: '[name]',

  sourcemap: 'linked',
  minify: false,
  keepNames: true,

  external: ['electron', 'typeorm', 'typeorm/*', 'reflect-metadata', 'better-sqlite3'],

  tsconfig: 'electron/tsconfig.json',
  logLevel: 'info',
};

await rm('dist-electron', {
  recursive: true,
  force: true,
});

await build(buildOptions);
