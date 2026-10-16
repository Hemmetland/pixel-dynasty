// Bygger spelet till en enda HTML-fil (dist/index.html) samt ett fragment
// för publicering som Artifact (dist/artifact.html).
import { build, context, transform } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');
const dev = process.argv.includes('--dev');

const TITLE = 'Pixel Dynasty';
const DESC = 'Bygg ett spelimperium från garaget till skyskrapan.';
const FONTS =
  'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Jersey+10&display=swap';

async function bundle() {
  const js = await build({
    entryPoints: [resolve(root, 'src/main.js')],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    minify: !dev,
    legalComments: 'none',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const css = await transform(await readFile(resolve(root, 'src/style.css'), 'utf8'), {
    loader: 'css',
    minify: !dev,
  });
  const code = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  return { code, css: css.code };
}

function fragment({ code, css }) {
  return `<title>${TITLE}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${css}</style>
<div id="app"></div>
<script>${code}</script>
`;
}

function document_(parts) {
  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="${DESC}">
${fragment(parts)}</head>
</html>
`;
}

async function emitDev() {
  const { readdir } = await import('node:fs/promises');
  let files = [];
  try { files = (await readdir(resolve(root, 'src/dev'))).filter((f) => f.endsWith('.js')); } catch { return; }
  await mkdir(resolve(root, 'dist/dev'), { recursive: true });
  for (const f of files) {
    const out = await build({ entryPoints: [resolve(root, 'src/dev', f)], bundle: true, write: false, format: 'iife', target: 'es2020' });
    await writeFile(resolve(root, 'dist/dev', f.replace('.js', '.html')), `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#1b1d28}</style><body><div id="app"></div><script>${out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`);
  }
}

// Ljuslabbet (WebGL-jämförelse): dist/lab.html (fristående) och dist/lab-artifact.html (fragment).
async function emitLab() {
  const out = await build({ entryPoints: [resolve(root, 'src/lab/gl-lab.js')], bundle: true, write: false, format: 'iife', target: 'es2020', minify: !dev, legalComments: 'none' });
  const css = await transform(await readFile(resolve(root, 'src/lab/lab.css'), 'utf8'), { loader: 'css', minify: !dev });
  const code = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const frag = `<title>Pixel Dynasty Ljuslabb</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${css.code}</style>
<div id="app"></div>
<script>${code}</script>
`;
  await writeFile(resolve(root, 'dist/lab-artifact.html'), frag);
  await writeFile(resolve(root, 'dist/lab.html'), `<!doctype html>\n<html lang="sv">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${frag}</head>\n</html>\n`);
  console.log(`✔ dist/lab.html + dist/lab-artifact.html (${(Buffer.byteLength(frag) / 1024).toFixed(0)} kB)`);
}

async function emit() {
  const parts = await bundle();
  await mkdir(resolve(root, 'dist'), { recursive: true });
  await writeFile(resolve(root, 'dist/index.html'), document_(parts));
  await writeFile(resolve(root, 'dist/artifact.html'), fragment(parts));
  await emitLab();
  if (dev || process.argv.includes('--with-dev')) await emitDev();
  const kb = (Buffer.byteLength(fragment(parts)) / 1024).toFixed(0);
  console.log(`✔ dist/index.html + dist/artifact.html (${kb} kB)`);
}

if (watch) {
  const ctx = await context({
    entryPoints: [resolve(root, 'src/main.js')],
    bundle: true,
    write: false,
    format: 'iife',
    plugins: [
      {
        name: 'emit',
        setup(b) {
          b.onEnd(() => emit().catch((e) => console.error(e)));
        },
      },
    ],
  });
  await ctx.watch();
  console.log('Watching…');
} else {
  await emit();
}
