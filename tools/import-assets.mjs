// Läser in nya PNG-filer i assets/ och skriver assets/manifest.json åt dig (bevarar handskrivna fält som prompt, seed och kostnad).
//   node tools/import-assets.mjs            (kör efter: node build.mjs --with-dev ; kräver playwright-core och en Chromium, se test/scene-shot.mjs)
// Filnamn blir nycklar:  assets/props/<namn>.png -> prop.<namn>      assets/vehicles/<namn>.png -> veh.<namn>
//   Punkter i namnet är en del av nyckeln (vehicles/car.1.png -> veh.car.1). Varianter: <namn>_v0.png, <namn>_v1.png -> <nyckel>#0, #1.
// Genomskinliga kanter beskärs (crop i manifestet, originalet rörs inte). Ankaret hämtas från docs/ASSET_SPECS.md om nyckeln finns där
// (skalat efter bildens storlek), annars nedre mitten. Rapporten visar bilder vars storlek avviker mycket från måttstocken.
import { chromium } from 'playwright-core';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';

const root = resolve('assets');
const GROUPS = { props: 'prop', vehicles: 'veh' };

async function walk(dir) {
  const out = [];
  for (const f of await readdir(dir)) {
    const p = join(dir, f);
    if ((await stat(p)).isDirectory()) out.push(...(await walk(p)));
    else if (f.toLowerCase().endsWith('.png')) out.push(p);
  }
  return out;
}

const specs = {};
try {
  for (const m of (await readFile('docs/ASSET_SPECS.md', 'utf8')).matchAll(/\| `([^`]+)` \| (\d+)×(\d+) \| (\d+), (\d+) \|/g)) specs[m[1]] = { w: +m[2], h: +m[3], ax: +m[4], ay: +m[5] };
} catch { /* ingen måttstock */ }

let manifest = { sprites: {} };
try { manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')); } catch { /* ny */ }
manifest.sprites ||= {};

const files = [];
for (const g of Object.keys(GROUPS)) {
  try { files.push(...(await walk(join(root, g)))); } catch { /* mappen saknas */ }
}
if (!files.length) { console.log('Inga PNG-filer i assets/props eller assets/vehicles.'); process.exit(0); }

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
const report = [];
for (const file of files) {
  const rel = relative(root, file).split(sep);
  const prefix = GROUPS[rel[0]];
  let base = rel[rel.length - 1].replace(/\.png$/i, '');
  const v = base.match(/^(.*)_v(\d+)$/);
  let key = `${prefix}.${v ? v[1] : base}`;
  if (v) key += `#${v[2]}`;
  const data = (await readFile(file)).toString('base64');
  const box = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) if (d[(j * c.width + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    return { w: img.width, h: img.height, x0, y0, x1, y1 };
  }, data);
  if (box.x1 < 0) { report.push(`${key}: helt genomskinlig, hoppas över`); continue; }
  const cw = box.x1 - box.x0 + 1;
  const ch = box.y1 - box.y0 + 1;
  const sp = specs[key.split('#')[0]];
  const ax = sp ? Math.round((sp.ax * cw) / sp.w) : Math.round(cw / 2);
  const ay = sp ? ch - Math.round(((sp.h - sp.ay) * ch) / sp.h) : ch;
  const old = manifest.sprites[key] || {};
  manifest.sprites[key] = { ...old, file: rel.join('/'), crop: [box.x0, box.y0, cw, ch], fw: cw, fh: ch, ax, ay, frames: old.frames || 1 };
  const note = sp && (Math.abs(cw - sp.w) > sp.w * 0.35 || Math.abs(ch - sp.h) > sp.h * 0.35) ? `  (måttstock ${sp.w}×${sp.h}, avviker)` : '';
  report.push(`${key}: ${cw}×${ch}${note}`);
}
await browser.close();
await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(report.join('\n') + `\n${files.length} filer, manifestet har nu ${Object.keys(manifest.sprites).length} sprites. Kör node build.mjs.`);
