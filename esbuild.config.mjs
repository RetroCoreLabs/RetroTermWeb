import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const serve = args.includes('--serve');

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

/** @type {esbuild.BuildOptions} */
const sharedOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  target: 'es2020',
  define: {
    'process.env.VERSION': JSON.stringify(pkg.version),
  },
};

// IIFE bundle for <script> tag usage (global RetroTerm)
/** @type {esbuild.BuildOptions} */
const iifeOptions = {
  ...sharedOptions,
  outfile: 'dist/retroterm.js',
  format: 'iife',
  globalName: 'RetroTerm',
  minify: !watch,
};

// ES module for modern bundlers
/** @type {esbuild.BuildOptions} */
const esmOptions = {
  ...sharedOptions,
  outfile: 'dist/retroterm.esm.js',
  format: 'esm',
  minify: !watch,
};

async function build() {
  if (watch) {
    const iifeCtx = await esbuild.context(iifeOptions);
    const esmCtx = await esbuild.context(esmOptions);

    await iifeCtx.watch();
    await esmCtx.watch();

    console.log('Watching for changes...');

    if (serve) {
      const { host, port } = await iifeCtx.serve({
        servedir: '.',
        port: 3000,
      });
      console.log(`Serving at http://${host}:${port}`);
    }
  } else {
    await Promise.all([
      esbuild.build(iifeOptions),
      esbuild.build(esmOptions),
    ]);
    console.log('Build complete.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
