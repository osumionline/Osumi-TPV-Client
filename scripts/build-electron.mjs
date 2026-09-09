import { build } from 'esbuild';
import { rm } from 'node:fs/promises';

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: {
    main: 'electron/main.ts',
    preload: 'electron/preload.ts',
    'factura-preview-preload': 'electron/factura-preview-preload.ts',
    'inventario-print-preload': 'electron/inventario-print-preload.ts',
    'caducidad-report-preload': 'electron/caducidad-report-preload.ts',
    'imprenta-print-preload': 'electron/imprenta-print-preload.ts',
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

  external: ['electron', 'typeorm', 'typeorm/*', 'reflect-metadata', 'better-sqlite3', 'sharp'],

  tsconfig: 'electron/tsconfig.json',
  logLevel: 'info',
};

await rm('dist-electron', {
  recursive: true,
  force: true,
});

await build(buildOptions);
