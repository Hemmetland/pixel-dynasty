// Personer som sprite (PixelLab-karaktären i sidovy) i stället för den procedurella figuren. En enda karaktär finns, så den
// färgbyts efter personens utseende: tröja, mössa, byxor, hud, hår och skor får personens färger med samma skuggning.
// Färgbytet görs i full upplösning (rena palettfärger), sedan skalas bilden ner till scenens mått (manifestets scale) och kantas hårt.
// Resultatet cachas per utseende. Saknas spriten returnerar funktionerna false så att den procedurella figuren ritas.
import { hex2rgb } from '../core/util.js';
import { getSprite, spritesVersion } from './sprites.js';
import { lookColors } from './people.js';

// Referensfärgen per material i originalbilden (den vanligaste nyansen); övriga nyanser behåller sin ljushet relativt den.
const REF = { shirt: '#43a09d', hat: '#e88a38', pants: '#3f5b83', skin: '#f7b5a3', shoe: '#d41f30', hair: '#412425' };
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const REF_L = Object.fromEntries(Object.entries(REF).map(([k, c]) => [k, lum(...hex2rgb(c))]));

function hsv(r, g, b) {
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255];
}

// Material för en pixel; ry = höjd i rutan (0 topp, 1 fot). Konturer, glasögon och ögonvitor behålls (null).
function material(r, g, b, ry) {
  const [h, s, v] = hsv(r, g, b);
  if (h >= 165 && h <= 195 && s > 0.45) return 'shirt';
  if (h >= 18 && h <= 32 && s > 0.7 && ry < 0.3) return 'hat';
  if (h >= 205 && h <= 222 && s > 0.4 && ry > 0.6) return 'pants';
  if ((h >= 350 || h <= 2) && s > 0.7 && v > 0.55) return 'shoe';
  if ((h <= 20 || h >= 340) && s > 0.35 && v < 0.3) return 'hair';
  if ((h <= 15 || h >= 345) && s >= 0.25 && s <= 0.6 && v >= 0.4) return 'skin';
  return null;
}

const cache = new WeakMap(); // look -> Map(nyckel -> färdig remsa)

function build(s, look) {
  const C = lookColors(look);
  const target = { shirt: C.shirt, hat: C.hat || C.hair, pants: C.pants, skin: C.skin, shoe: C.shoe, hair: C.hair };
  const T = Object.fromEntries(Object.entries(target).map(([k, c]) => [k, hex2rgb(c)]));
  const full = document.createElement('canvas');
  full.width = s.c.width;
  full.height = s.c.height;
  const fg = full.getContext('2d', { willReadFrequently: true });
  fg.drawImage(s.c, 0, 0);
  const img = fg.getImageData(0, 0, full.width, full.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const m = material(d[i], d[i + 1], d[i + 2], Math.floor(i / 4 / full.width) / s.fh);
    if (!m) continue;
    const k = lum(d[i], d[i + 1], d[i + 2]) / REF_L[m];
    const t = T[m];
    for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, Math.round(t[j] * k));
  }
  fg.putImageData(img, 0, 0);
  // ner till scenens skala, ruta för ruta så att grannrutor inte blöder in
  const W = Math.round(s.fw * s.scale);
  const H = Math.round(s.fh * s.scale);
  const c = document.createElement('canvas');
  c.width = W * s.frames;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  for (let f = 0; f < s.frames; f++) g.drawImage(full, f * s.fw, 0, s.fw, s.fh, f * W, 0, W, H);
  const out = g.getImageData(0, 0, c.width, H);
  const o = out.data;
  for (let i = 3; i < o.length; i += 4) {
    if (o[i] > 100) {
      // avmultiplicera halvgenomskinliga kantpixlar innan de görs täckande
      const a = o[i] / 255;
      for (let j = 1; j <= 3; j++) o[i - j] = Math.min(255, Math.round(o[i - j] / a));
      o[i] = 255;
    } else o[i] = 0;
  }
  g.putImageData(out, 0, 0);
  return { c, W, H, ax: Math.round(s.ax * s.scale), ay: Math.round(s.ay * s.scale), frames: s.frames, v: spritesVersion() };
}

// Ritar personen som sprite 'key' (t.ex. 'char.walk', 'char.stand', 'char.drink') med fötterna i (x, y), ruta frame.
export function drawCharSprite(ctx, key, x, y, look, frame = 0, dir = 1) {
  const s = getSprite(key);
  if (!s || typeof document === 'undefined') return false;
  let m = cache.get(look);
  if (!m) cache.set(look, (m = new Map()));
  let e = m.get(key);
  if (!e || e.v !== spritesVersion()) m.set(key, (e = build(s, look)));
  const f = (((frame | 0) % e.frames) + e.frames) % e.frames;
  const X = Math.round(x);
  const Y = Math.round(y);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000';
  ctx.fillRect(X - 5, Y, 11, 1);
  ctx.globalAlpha = 1;
  if (dir < 0) {
    ctx.save();
    ctx.translate(X, Y);
    ctx.scale(-1, 1);
    ctx.drawImage(e.c, f * e.W, 0, e.W, e.H, -e.ax, -e.ay, e.W, e.H);
    ctx.restore();
  } else ctx.drawImage(e.c, f * e.W, 0, e.W, e.H, X - e.ax, Y - e.ay, e.W, e.H);
  return true;
}

// Gående fotgängare; t = gångtid (fotgängarnas p.t, 6 per sekund). 6 rutor per steg-cykel i samma takt som den procedurella gången.
export const drawWalkerSprite = (ctx, x, y, look, t, dir = 1) => drawCharSprite(ctx, 'char.walk', x, y, look, Math.floor(t * 1.5), dir);

// Stående poser som har en sprite, med bildrutor per sekund. Sittande poser saknas i karaktären och ritas procedurellt.
const POSE_SPRITE = { walk: ['char.walk', 9], stand: ['char.stand', 0], drink: ['char.drink', 3] };
// Personal i huset: ritar posen som sprite om en sådan finns (t = sekunder), annars false.
export function drawPoseSprite(ctx, x, y, look, pose, t, dir = 1) {
  const p = POSE_SPRITE[pose];
  return !!p && drawCharSprite(ctx, p[0], x, y, look, Math.floor((t || 0) * p[1]), dir);
}
