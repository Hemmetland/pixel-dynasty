// Personer som sprite (PixelLab-karaktären i sidovy) i stället för den procedurella figuren. En enda karaktär finns, så den
// färgbyts efter personens utseende: tröja, mössa, byxor, hud, hår och skor får personens färger med samma skuggning.
// Färgbytet görs i full upplösning (rena palettfärger), sedan skalas bilden ner till scenens mått (manifestets scale), kantas hårt
// och varje pixel får den närmaste färgen från samma ställe i originalet, så att figuren blir lika skarp som möblerna runt den.
// Resultatet cachas per utseende. Saknas spriten returnerar funktionerna false så att den procedurella figuren ritas.
import { hex2rgb } from '../core/util.js';
import { getSprite, spritesVersion, spriteNames } from './sprites.js';
import { lookColors, SEATED } from './people.js';

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
// Mössan känns igen ovanför hatRow (manifestets hatRow, annars 0.3), så poser där huvudet sjunker (sova) kan flytta gränsen.
function material(r, g, b, ry, hatRow = 0.3) {
  const [h, s, v] = hsv(r, g, b);
  if (h >= 165 && h <= 195 && s > 0.45) return 'shirt';
  if (h >= 18 && h <= 32 && s > 0.7 && ry < hatRow) return 'hat';
  if (h >= 205 && h <= 222 && s > 0.4 && ry > 0.6) return 'pants';
  if ((h >= 350 || h <= 2) && s > 0.7 && v > 0.55) return 'shoe';
  if ((h <= 20 || h >= 340) && s > 0.35 && v < 0.3) return 'hair';
  if ((h <= 15 || h >= 345) && s >= 0.25 && s <= 0.6 && v >= 0.4) return 'skin';
  return null;
}

const cache = new WeakMap(); // look -> Map(nyckel -> färdig remsa, 'hairV' -> { v: frisyrvariant, ver })

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
    const m = material(d[i], d[i + 1], d[i + 2], Math.floor(i / 4 / full.width) / s.fh, s.hatRow ?? 0.3);
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
  // hård kant (getImageData ger redan icke-förmultiplicerade färger, så halvgenomskinliga kantpixlar görs bara täckande)
  // och i stället för nedskalningens blandfärg den färg ur samma ställe i originalet (rutans block) som ligger närmast,
  // så att små detaljer som skor och glasögon behåller sina färger
  const fw = full.width;
  const near = (i, x0, x1, y0, y1) => {
    let best = -1;
    let bd = Infinity;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const j = (y * fw + x) * 4;
        if (!d[j + 3]) continue;
        const dr = o[i] - d[j];
        const dg = o[i + 1] - d[j + 1];
        const db = o[i + 2] - d[j + 2];
        const e = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (e < bd) {
          bd = e;
          best = j;
        }
      }
    }
    return best;
  };
  const sx = s.fw / W;
  const sy = s.fh / H;
  for (let i = 0; i < o.length; i += 4) {
    if (o[i + 3] <= 100) {
      o[i + 3] = 0;
      continue;
    }
    o[i + 3] = 255;
    const p = i / 4;
    const ox = p % c.width;
    const oy = (p - ox) / c.width;
    const f = Math.floor(ox / W);
    const lx = ox - f * W;
    const bx = f * s.fw;
    const x0 = bx + Math.floor(lx * sx);
    const y0 = Math.floor(oy * sy);
    // först blocket, annars ett block större åt alla håll (kantpixlar som bara fått färg från grannen)
    let j = near(i, x0, bx + Math.max(x0 - bx + 1, Math.ceil((lx + 1) * sx)), y0, Math.min(s.fh, Math.max(y0 + 1, Math.ceil((oy + 1) * sy))));
    if (j < 0) j = near(i, Math.max(bx, x0 - 2), Math.min(bx + s.fw, x0 + 4), Math.max(0, y0 - 2), Math.min(s.fh, y0 + 4));
    if (j < 0) {
      o[i + 3] = 0;
      continue;
    }
    o[i] = d[j];
    o[i + 1] = d[j + 1];
    o[i + 2] = d[j + 2];
  }
  g.putImageData(out, 0, 0);
  return { c, W, H, ax: Math.round(s.ax * s.scale), ay: Math.round(s.ay * s.scale), frames: s.frames, v: spritesVersion() };
}

// Frisyrvarianter 'nyckel#1'–'nyckel#3' (kort hår, hästsvans, lockigt; samma rutor och ankare, bara huvudet bytt): den som
// har mössa eller hatt ritas med grundspriten, övriga får den variant som liknar deras egen frisyr (people.js HAIR) och
// annars någon av dem som finns. En variant används först när den finns för alla char.*-remsor, annars skulle personen
// byta frisyr mellan poserna.
const HAIR_VARIANTS = [1, 2, 3];
// kort, raspat, långt, knut, afro, piggar, lugg, hästsvans, page, mohawk, flint, lockigt, tuppkam, fläta
const HAIR_KIND = [1, 1, 2, 2, 3, 1, 1, 2, 2, 1, 1, 3, 1, 2];
let fullVer = -1;
let fullV = [];
function fullVariants() {
  if (fullVer === spritesVersion()) return fullV;
  fullVer = spritesVersion();
  const bases = spriteNames().filter((n) => n.startsWith('char.') && !n.includes('#'));
  fullV = HAIR_VARIANTS.filter((v) => bases.length && bases.every((b) => getSprite(`${b}#${v}`)));
  return fullV;
}
const hairVariant = (look) => {
  const C = lookColors(look);
  const vs = fullVariants();
  if (C.hatted || !vs.length) return 0;
  return vs.includes(HAIR_KIND[C.style]) ? HAIR_KIND[C.style] : vs[C.style % vs.length];
};

// Ritar personen som sprite 'key' (t.ex. 'char.walk', 'char.stand', 'char.drink') med fötterna i (x, y), ruta frame.
export function drawCharSprite(ctx, key, x, y, look, frame = 0, dir = 1) {
  if (typeof document === 'undefined') return false;
  let m = cache.get(look);
  if (!m) cache.set(look, (m = new Map()));
  // frisyren väljs om när fler sprites har laddats
  let hv = m.get('hairV');
  if (!hv || hv.ver !== spritesVersion()) m.set('hairV', (hv = { v: hairVariant(look), ver: spritesVersion() }));
  const v = hv.v;
  const s = (v && getSprite(`${key}#${v}`)) || getSprite(key);
  if (!s) return false;
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
// En köpare som bär hem studions nya produkt: gången med lådan, och lådan målad i produktens färg med en vit logga
export function drawBuyerSprite(ctx, x, y, look, t, dir, color, dark, light) {
  if (!drawCharSprite(ctx, 'char.walkBox', x, y, look, Math.floor(t * 1.5), dir)) return false;
  const X = Math.round(x) + (dir < 0 ? -7 : -1);
  const Y = Math.round(y) - 18;
  ctx.fillStyle = dark;
  ctx.fillRect(X, Y, 8, 6);
  ctx.fillStyle = color;
  ctx.fillRect(X, Y, 8, 5);
  ctx.fillStyle = light;
  ctx.fillRect(X, Y, 8, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(X + (dir < 0 ? 2 : 4), Y + 2, 2, 2);
  return true;
}

// Poser som har en sprite, med bildrutor per sekund: stående och sittande för sig. Prata och dricka kaffe på en stol har
// egna sittande sprites (char.sitTalk, char.sitDrink, där klunken 0,1,2,2,2,1 är inbakad), liksom läsa och tänka (vid
// skrivbordet, armbågen på bordet), sova (huvudet mot bordet), gäspa (crunch) och laptop i knät (soffan; stående med laptop
// vid racket, i labbet och i QA har char.laptop). Jubel har egna sprites både stående (spelrummet) och på stolen (när studion
// firar), liksom presentation med pekpinne vid tavlan, spel på arkadmaskinen, att skruva i ett serverrack och att prata i
// telefon i receptionen, och att vinka vid skrivbordet när man kommer in. Saknas en sprite i manifestet ritas den
// procedurella figuren.
const STAND_SPRITE = {
  walk: ['char.walk', 9], stand: ['char.stand', 0], drink: ['char.drink', 3], talk: ['char.talk', 4.2], cheer: ['char.cheer', 5], present: ['char.present', 3],
  play: ['char.play', 7], fix: ['char.fix', 5], phone: ['char.phone', 4.2], laptop: ['char.laptop', 8], walkLaptop: ['char.walkLaptop', 9], wave: ['char.wave', 5],
  walkBox: ['char.walkBox', 9], walkCup: ['char.walkCup', 9], shake: ['char.shake', 4], notes: ['char.notes', 4], stretch: ['char.stretch', 3],
};
const WALK_WITH = new Set(['walkLaptop', 'walkBox', 'walkCup']);
const SEAT_SPRITE = {
  sit: ['char.sit', 1.5], sitIdle: ['char.sit', 1.5], type: ['char.type', 8],
  talk: ['char.sitTalk', 4.2], drink: ['char.sitDrink', 3], read: ['char.read', 1], think: ['char.think', 1.2],
  sleep: ['char.sleep', 0.75], tired: ['char.tired', 0.7], laptop: ['char.sitLaptop', 8], cheer: ['char.sitCheer', 5],
};
// Personal i huset: ritar posen som sprite om en sådan finns (t = sekunder, seated = sitter på en stol), annars false.
// Att prata på en stol har ingen rekvisita, så utan char.sitTalk ritas den som vanligt sittande.
export function drawPoseSprite(ctx, x, y, look, pose, t, dir = 1, seated = false) {
  const seat = seated || SEATED.has(pose);
  const p = (seat ? SEAT_SPRITE : STAND_SPRITE)[pose];
  const draw = (q) => drawCharSprite(ctx, q[0], x, y, look, Math.floor((t || 0) * q[1]), dir);
  // att gå med laptopen, flyttlådan eller muggen ritas som vanlig gång tills den ritade gången finns
  return !!p && (draw(p) || (seat && pose === 'talk' && draw(SEAT_SPRITE.sit)) || (WALK_WITH.has(pose) && draw(STAND_SPRITE.walk)));
}
