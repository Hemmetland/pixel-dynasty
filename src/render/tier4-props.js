import { shade } from '../core/util.js';
import * as V from './props2.js';
import * as F from './furniture.js';
import { drawText, textWidth } from './font.js';

const { R, RA, blob, hash } = V;

// Nivå 4, "Modern": byggnadsdelar och möbler i glas och stål. Samma konvention som furniture.js: x = vänsterkant, fy = golvets y,
// ljus uppifrån vänster (högdagrar uppe/vänster, skugga nere/höger). Paletten är kall vit/turkos/bärnsten med orange neon.

// Aluminium och stål (ink mörkast, wh ljusast), turkos glas, bärnsten (varma lampor och trä) och orange neon.
export const ST = { ink: '#1a262e', dk: '#2f414c', mid: '#5f7684', lt: '#9fb4c0', hi: '#d5e2ea', wh: '#f3f8fb' };
export const TL = { dk: '#12373f', mid: '#1f6670', lt: '#2fa3a8', hi: '#7fe0dc', glass: '#8fe6e4' };
export const AM = { dk: '#b8741c', mid: '#ee9a2c', lt: '#ffbe55', hi: '#ffe29a' };
export const OR = { core: '#ffd9b0', neon: '#ff7a2e', glow: '#ff5a14', lo: '#b83a0a' };

// Orange neonlinje (vågrät) med varm glöd, i samma stil som V.neonLine men med nivåns orange.
export const neonH = (ctx, x, y, w) => V.neonLine(ctx, x, y, w, OR.core, OR.glow);
export const neonV = (ctx, x, y, h) => V.neonLineV(ctx, x, y, h, OR.core, OR.glow);

// ── Glasvägg ──
// Glaset i ett fönsterhål (hålet är redan urklippt): tonad ruta, diagonala reflexer, bågar och sprosslinjer.
// Ramen ritas utanför hålet (x-1..x+w, y-1..y+h). mull = avstånd mellan pelare (0 = inga), trans = höjd på tvärbalk (0 = ingen).
export function glass(ctx, x, y, w, h, { seed = 1, mull = 0, trans = 0, tint = '#6fd4d2' } = {}) {
  RA(ctx, x, y, w, h, tint, 0.1);
  RA(ctx, x, y, w, 4, '#ffffff', 0.1);
  RA(ctx, x, y + h - 5, w, 5, '#0d3a48', 0.12);
  // diagonala reflexer (uppåt åt höger)
  const n = 2 + (seed % 2);
  for (let i = 0; i < n; i++) {
    const bx = x + 3 + ((seed * 7 + i * 13) % Math.max(1, w - 6));
    const wd = [2, 1, 3][i % 3];
    const a = [0.2, 0.14, 0.1][i % 3];
    for (let r = 0; r < h; r++) {
      const px = Math.round(bx + (h - r) * 0.5);
      if (px >= x && px + wd <= x + w) RA(ctx, px, y + r, wd, 1, '#ffffff', a);
    }
  }
  for (let k = mull; mull > 0 && k < w - 1; k += mull) {
    R(ctx, x + k, y, 1, h, ST.hi);
    RA(ctx, x + k + 1, y, 1, h, ST.dk, 0.4);
  }
  if (trans) {
    R(ctx, x, y + trans, w, 1, ST.hi);
    RA(ctx, x, y + trans + 1, w, 1, ST.dk, 0.35);
  }
  // karm
  R(ctx, x - 1, y - 1, w + 2, 1, ST.lt);
  R(ctx, x - 1, y, 1, h, ST.hi);
  R(ctx, x + w, y, 1, h, ST.mid);
  R(ctx, x - 1, y + h, w + 2, 1, ST.wh);
}

// Bröstning under ett glasparti (täcker också skyline-antydan som ritats under glaset). Täcker fy-13..fy-4.
export function sillPanel(ctx, x, fy, w, c) {
  R(ctx, x - 1, fy - 13, w + 2, 1, ST.wh);
  R(ctx, x - 1, fy - 12, w + 2, 1, ST.lt);
  R(ctx, x - 1, fy - 11, w + 2, 8, c);
  R(ctx, x - 1, fy - 11, w + 2, 1, shade(c, 0.22));
  for (let i = 2; i < w; i += 6) R(ctx, x + i, fy - 10, 1, 6, shade(c, -0.14));
  R(ctx, x - 1, fy - 4, w + 2, 1, shade(c, -0.25));
  RA(ctx, x - 1, fy - 12, w + 2, 2, '#000000', 0.12);
}

// Rummets bakvägg: väggfärg, vit fris med LED-list, bröstning och golvband. sty: { wall, wall2, dado, trim, floor, floorHi, fascia, thin }.
// thin: smal fris (3 px) så att väggen och glaset når nästan upp i taket (lobbyn, som ska se högre ut).
export function wallShell(ctx, room, fy, intH, sty) {
  const { x0, w } = room;
  const top = fy - intH;
  const lc = room.lightRGB.join(',');
  const fh = sty.thin ? 3 : 7;
  R(ctx, x0, top, w, intH, sty.wall);
  for (let x = 0; x < w; x += 12) R(ctx, x0 + x, top + fh + 2, 1, intH - fh - 14, sty.wall2);
  // vit fris med LED-list i rumsljusets färg
  R(ctx, x0, top, w, 1, ST.lt);
  R(ctx, x0, top + 1, w, fh, sty.fascia || '#eef5f7');
  R(ctx, x0, top + 1, w, 1, '#ffffff');
  R(ctx, x0, top + fh, w, 1, '#bccfd6');
  R(ctx, x0 + 1, top + fh + 1, w - 2, 1, `rgb(${lc})`);
  RA(ctx, x0 + 1, top + fh + 2, w - 2, 2, `rgb(${lc})`, 0.32);
  for (let i = 0; i < 4; i++) RA(ctx, x0, top + fh + 2 + i, w, 1, '#000000', 0.15 - i * 0.04);
  RA(ctx, x0, top, 2, intH, '#000000', 0.1);
  RA(ctx, x0 + w - 2, top, 2, intH, '#000000', 0.1);
  // bröstning (dado) och list
  R(ctx, x0, fy - 12, w, 1, sty.trim);
  R(ctx, x0, fy - 11, w, 8, sty.dado);
  for (let x = 3; x < w - 1; x += 7) R(ctx, x0 + x, fy - 10, 1, 6, shade(sty.dado, -0.13));
  R(ctx, x0, fy - 11, w, 1, shade(sty.dado, 0.2));
  // golvband: ljust trä
  R(ctx, x0, fy - 3, w, 3, sty.floor);
  R(ctx, x0, fy - 3, w, 1, sty.floorHi);
  for (let x = 0; x < w; x += 11) R(ctx, x0 + ((x + room.floor * 5) % w), fy - 2, 1, 2, shade(sty.floor, -0.16));
  R(ctx, x0, fy - 1, w, 1, shade(sty.floor, -0.2));
}

// Ljuspöl på golvbandet under en lampa.
export const floorPool = (ctx, x, fy, rgb, a = 0.1) => {
  RA(ctx, x - 11, fy - 3, 23, 3, `rgb(${rgb})`, a);
  RA(ctx, x - 6, fy - 3, 13, 3, `rgb(${rgb})`, a);
};

// ── Armaturer ──
// Hängande LED-list (två wirar och en lysande skena). x = vänsterkant, w = längd, drop = hur långt ned från taket (y = takets underkant).
export function ceilBar(ctx, x, top, w, drop, rgb, c = '#f4fbff') {
  const y = top + drop;
  R(ctx, x + 2, top, 1, drop, ST.dk);
  R(ctx, x + w - 3, top, 1, drop, ST.dk);
  R(ctx, x, y, w, 2, ST.mid);
  R(ctx, x, y, w, 1, ST.hi);
  R(ctx, x + 1, y + 2, w - 2, 1, c);
  RA(ctx, x - 2, y + 2, w + 4, 5, `rgb(${rgb})`, 0.18);
  RA(ctx, x + 2, y + 3, w - 4, 8, `rgb(${rgb})`, 0.08);
}

// Infälld spotlight i friesen (3 px bred lysande platta).
export function spot(ctx, x, y, rgb) {
  R(ctx, x, y, 3, 1, '#ffffff');
  RA(ctx, x - 1, y + 1, 5, 2, `rgb(${rgb})`, 0.35);
}

// Klot-pendlar i olika längd (installation). items = [dx, drop, r?]. Små klot med dämpad glöd så att inget bakom drunknar.
export function globeCluster(ctx, x, top, items, glow = '255,200,120') {
  for (const [dx, drop, r = 2] of items) {
    const px = x + dx;
    R(ctx, px, top, 1, drop, '#1b262e');
    RA(ctx, px - r - 2, top + drop - 1, r * 2 + 5, r * 2 + 5, `rgb(${glow})`, 0.1);
    blob(ctx, px, top + drop + r, r, r, '#fff0c8', '#ffffff', '#f0b860');
  }
}

// Kupolpendel i metall (amber insida).
export function domeLamp(ctx, x, top, drop, c = ST.dk, glow = '255,200,120') {
  R(ctx, x, top, 1, drop, '#1b262e');
  const y = top + drop;
  R(ctx, x - 1, y, 3, 1, shade(c, 0.3));
  R(ctx, x - 4, y + 1, 9, 2, c);
  R(ctx, x - 4, y + 1, 2, 1, shade(c, 0.4));
  R(ctx, x - 5, y + 3, 11, 1, c);
  R(ctx, x - 4, y + 4, 9, 1, AM.hi);
  RA(ctx, x - 7, y + 4, 15, 6, `rgb(${glow})`, 0.2);
}

// ── Växter ──
// Betongkruka med högt gräs eller buske.
export function planter(ctx, x, fy, w = 14, h = 10, seed = 1, c = '#c9d2d6') {
  F.shadow(ctx, x, fy, w, 0.28);
  R(ctx, x, fy - h, w, h, c);
  R(ctx, x, fy - h, w, 1, shade(c, 0.4));
  R(ctx, x, fy - h, 1, h, shade(c, 0.2));
  R(ctx, x + w - 1, fy - h + 1, 1, h - 1, shade(c, -0.3));
  R(ctx, x + 1, fy - 1, w - 2, 1, shade(c, -0.3));
  R(ctx, x + 1, fy - h + 1, w - 2, 1, '#3a2c22');
  const g = [['#2b7a46', '#4fb066', '#9be08a'], ['#2a7f6c', '#43b894', '#9ae8c4']][seed % 2];
  for (let i = 1; i < w - 1; i += 2) {
    const bh = 5 + Math.floor(hash(seed * 11 + i) * 9);
    const lean = Math.floor(hash(seed * 5 + i) * 3) - 1;
    for (let k = 0; k < bh; k++) R(ctx, x + i + Math.round((lean * k) / 4), fy - h - 1 - k, 1, 1, k > bh - 3 ? g[2] : k % 2 ? g[1] : g[0]);
  }
}

// ── Möbler ──
// Låg modern soffa framifrån: smala metallben, raka armstöd, ryggkuddar. Sitsen ligger på fy-9 (som F.sofa).
export function sofaM(ctx, x, fy, w = 32, c = AM.mid, pillow = TL.lt) {
  F.shadow(ctx, x, fy, w);
  const hi = shade(c, 0.28);
  const lo = shade(c, -0.22);
  R(ctx, x + 2, fy - 20, w - 4, 11, c);
  R(ctx, x + 2, fy - 20, w - 4, 1, hi);
  R(ctx, x + 2, fy - 16, w - 4, 1, lo);
  for (let k = 2 + Math.floor((w - 4) / 2); k < w - 4; k += Math.floor((w - 4) / 2)) R(ctx, x + k, fy - 19, 1, 9, lo);
  R(ctx, x + 3, fy - 11, w - 6, 5, shade(c, 0.1));
  R(ctx, x + 3, fy - 11, w - 6, 1, shade(c, 0.38));
  R(ctx, x + Math.floor(w / 2), fy - 11, 1, 5, lo);
  R(ctx, x, fy - 14, 3, 10, shade(c, -0.06));
  R(ctx, x, fy - 14, 3, 1, hi);
  R(ctx, x, fy - 14, 1, 10, hi);
  R(ctx, x + w - 3, fy - 14, 3, 10, shade(c, -0.06));
  R(ctx, x + w - 3, fy - 14, 3, 1, hi);
  R(ctx, x + w - 1, fy - 13, 1, 9, lo);
  R(ctx, x + 1, fy - 5, w - 2, 2, lo);
  // ben
  for (const lx of [x + 2, x + w - 4]) {
    R(ctx, lx, fy - 3, 1, 3, '#d8c8a0');
    R(ctx, lx + 1, fy - 3, 1, 3, '#7a6a4a');
  }
  // kuddar
  R(ctx, x + 5, fy - 17, 5, 6, pillow);
  R(ctx, x + 5, fy - 17, 5, 1, shade(pillow, 0.35));
  R(ctx, x + 9, fy - 12, 1, 1, shade(pillow, -0.3));
  R(ctx, x + w - 10, fy - 16, 4, 5, '#f4f0e4');
  R(ctx, x + w - 10, fy - 16, 4, 1, '#ffffff');
}

// Fåtölj i skandinavisk stil: sits på träben (14 px bred).
export function chairLounge(ctx, x, fy, c = TL.lt) {
  F.shadow(ctx, x, fy, 13);
  R(ctx, x + 1, fy - 17, 11, 9, c);
  R(ctx, x + 1, fy - 17, 11, 1, shade(c, 0.35));
  R(ctx, x + 1, fy - 17, 1, 9, shade(c, 0.2));
  R(ctx, x + 3, fy - 10, 8, 3, shade(c, 0.12));
  R(ctx, x, fy - 12, 3, 5, shade(c, -0.1));
  R(ctx, x + 10, fy - 12, 3, 5, shade(c, -0.1));
  R(ctx, x + 11, fy - 16, 1, 9, shade(c, -0.3));
  R(ctx, x + 1, fy - 7, 11, 2, shade(c, -0.35));
  for (const lx of [x + 2, x + 10]) {
    R(ctx, lx, fy - 5, 1, 5, '#c89a62');
    R(ctx, lx + 1, fy - 5, 1, 5, '#7a5a38');
  }
}

// Rund soffbord med skiva i ljust trä (w px bred).
export function coffeeTable(ctx, x, fy, w = 14) {
  F.shadow(ctx, x, fy, w, 0.25);
  R(ctx, x, fy - 8, w, 2, '#e8d3a8');
  R(ctx, x, fy - 8, w, 1, '#fff0cc');
  R(ctx, x + 1, fy - 6, w - 2, 1, '#8a6a42');
  R(ctx, x + Math.floor(w / 2), fy - 5, 1, 5, ST.mid);
  R(ctx, x + Math.floor(w / 2) - 3, fy - 1, 7, 1, ST.dk);
}

// Barstol (sits på 14 px höjd).
export function barStool(ctx, x, fy, c = AM.mid) {
  R(ctx, x + 1, fy - 14, 6, 2, c);
  R(ctx, x + 1, fy - 14, 6, 1, shade(c, 0.4));
  R(ctx, x + 1, fy - 12, 6, 1, shade(c, -0.35));
  R(ctx, x + 3, fy - 11, 2, 10, ST.mid);
  R(ctx, x + 3, fy - 11, 1, 10, ST.hi);
  R(ctx, x, fy - 6, 8, 1, ST.lt);
  R(ctx, x + 1, fy - 1, 6, 1, ST.dk);
  R(ctx, x + 2, fy - 2, 4, 1, ST.mid);
}

// Konferensstol (skalstol, vit med turkos sits) i profil, speglas av anroparen. Samma yta som F.chair2.
export function chairShell(ctx, x, fy, c = TL.lt) {
  F.shadow(ctx, x, fy, 9, 0.22);
  R(ctx, x - 2, fy - 22, 3, 13, '#eef4f6');
  R(ctx, x - 2, fy - 22, 1, 13, '#ffffff');
  R(ctx, x - 2, fy - 22, 3, 1, '#ffffff');
  R(ctx, x, fy - 14, 1, 5, '#b6c6cc');
  R(ctx, x - 1, fy - 9, 10, 2, c);
  R(ctx, x - 1, fy - 9, 10, 1, shade(c, 0.35));
  R(ctx, x - 1, fy - 7, 10, 1, shade(c, -0.35));
  R(ctx, x + 3, fy - 6, 2, 4, ST.mid);
  R(ctx, x, fy - 2, 8, 1, ST.dk);
  R(ctx, x, fy - 1, 2, 1, '#14151c');
  R(ctx, x + 6, fy - 1, 2, 1, '#14151c');
}

// Konsolbord / sideboard i trä med vita luckor.
export function sideboard(ctx, x, fy, w = 24) {
  F.shadow(ctx, x, fy, w, 0.25);
  R(ctx, x, fy - 12, w, 10, '#f2f6f7');
  R(ctx, x, fy - 12, w, 1, '#ffffff');
  R(ctx, x + w - 1, fy - 11, 1, 9, '#aebcc2');
  for (let i = 8; i < w - 2; i += 8) R(ctx, x + i, fy - 11, 1, 8, '#c4d0d5');
  for (let i = 4; i < w - 2; i += 8) R(ctx, x + i, fy - 8, 2, 1, ST.mid);
  R(ctx, x - 1, fy - 14, w + 2, 2, '#c89a62');
  R(ctx, x - 1, fy - 14, w + 2, 1, '#e8be88');
  R(ctx, x + 2, fy - 2, 1, 2, '#7a5a38');
  R(ctx, x + w - 3, fy - 2, 1, 2, '#7a5a38');
}

// Abstrakt tavla i nivåns färger.
export function canvasArt(ctx, x, y, w, h, seed = 1) {
  R(ctx, x, y, w, h, '#f6fafb');
  R(ctx, x, y, w, 1, '#ffffff');
  R(ctx, x + w - 1, y + 1, 1, h - 1, '#aebcc2');
  R(ctx, x + 1, y + h - 1, w - 1, 1, '#aebcc2');
  const cols = [TL.lt, AM.mid, OR.neon, TL.mid, '#f4f0e4', ST.dk];
  const k = seed % 4;
  if (k === 0) {
    R(ctx, x + 2, y + 2, w - 4, h - 4, TL.mid);
    R(ctx, x + 2, y + h - 6, w - 4, 4, AM.mid);
    blob(ctx, x + Math.floor(w * 0.62), y + Math.floor(h * 0.4), 2, 2, OR.neon, AM.hi, OR.lo);
  } else if (k === 1) {
    for (let i = 0; i < w - 4; i += 2) R(ctx, x + 2 + i, y + 2, 2, h - 4, cols[(i / 2 + seed) % cols.length]);
  } else if (k === 2) {
    R(ctx, x + 2, y + 2, w - 4, h - 4, '#13313a');
    R(ctx, x + 2, y + Math.floor(h / 2), w - 4, 1, OR.neon);
    R(ctx, x + Math.floor(w / 2), y + 2, 1, h - 4, TL.hi);
    R(ctx, x + 3, y + 3, 3, 3, AM.mid);
  } else {
    R(ctx, x + 2, y + 2, w - 4, h - 4, '#f0e6d0');
    blob(ctx, x + Math.floor(w / 2), y + Math.floor(h / 2), Math.max(2, Math.floor(w / 3)), Math.max(2, Math.floor(h / 3)), TL.lt, TL.hi, TL.mid);
    R(ctx, x + 3, y + h - 5, w - 6, 1, OR.neon);
  }
}

// Digital skylt/skärm (liten): mörk ruta med ljus rad.
export function signage(ctx, x, y, w, h, c1 = TL.hi, c2 = AM.lt, seed = 1) {
  R(ctx, x, y, w, h, '#0a1a22');
  R(ctx, x, y, w, 1, ST.dk);
  R(ctx, x + 1, y + 1, w - 2, h - 2, '#0f2a34');
  for (let r = 0; r < Math.floor((h - 3) / 3); r++) R(ctx, x + 2, y + 2 + r * 3, 2 + Math.floor(hash(seed + r) * (w - 6)), 1, r % 2 ? c2 : c1);
  RA(ctx, x + 1, y + 1, w - 2, 1, '#ffffff', 0.2);
}

// ── Lobby och café ──
// Receptionsdisk: vit skiva, träribbor i fronten och orange LED vid golvet. Samma storlek som F.receptionDesk (14 px hög + skiva).
export function receptionM(ctx, x, fy, w = 40, label = '') {
  F.shadow(ctx, x, fy, w);
  R(ctx, x, fy - 14, w, 14, '#e9f1f3');
  R(ctx, x, fy - 14, w, 1, '#ffffff');
  R(ctx, x, fy - 14, 1, 14, '#ffffff');
  R(ctx, x + w - 1, fy - 13, 1, 13, '#a9bcc3');
  for (let i = 3; i < w - 3; i += 3) {
    R(ctx, x + i, fy - 12, 2, 9, i % 6 ? '#c98f48' : '#b97e3a');
    R(ctx, x + i, fy - 12, 1, 9, '#e0aa62');
  }
  // logoplatta
  const lx = x + Math.floor(w / 2) - 7;
  R(ctx, lx, fy - 11, 14, 7, '#10272e');
  R(ctx, lx, fy - 11, 14, 1, TL.mid);
  if (label) drawText(ctx, label, lx + Math.floor((14 - textWidth(label)) / 2), fy - 9, OR.core);
  else {
    R(ctx, lx + 4, fy - 9, 6, 3, OR.neon);
    R(ctx, lx + 6, fy - 8, 2, 1, '#ffffff');
  }
  R(ctx, x + 2, fy - 2, w - 4, 1, OR.neon);
  RA(ctx, x + 1, fy - 4, w - 2, 4, OR.glow, 0.22);
  // skiva
  R(ctx, x - 1, fy - 17, w + 2, 3, '#f7f4ec');
  R(ctx, x - 1, fy - 17, w + 2, 1, '#ffffff');
  R(ctx, x - 1, fy - 15, w + 2, 1, '#c7c1b0');
  // på disken: skärm, klocka, liten växt
  R(ctx, x + 4, fy - 25, 9, 8, '#1d2630');
  R(ctx, x + 5, fy - 24, 7, 6, '#2a7f86');
  R(ctx, x + 6, fy - 23, 3, 1, TL.hi);
  R(ctx, x + 7, fy - 18, 3, 1, '#3a4a54');
  R(ctx, x + w - 12, fy - 20, 4, 3, '#e8c050');
  R(ctx, x + w - 11, fy - 21, 2, 1, '#fff2a0');
  V.plantSmall(ctx, x + w - 6, fy - 17, 2, '#ffffff');
}

// Dryckeskylskåp med glasdörr och flaskor, turkos LED i toppen (14 x 36).
export function drinksFridge(ctx, x, fy) {
  F.shadow(ctx, x, fy, 14);
  R(ctx, x, fy - 36, 14, 36, '#26363f');
  R(ctx, x, fy - 36, 14, 1, '#5f7684');
  R(ctx, x, fy - 36, 1, 36, '#3a4e5a');
  R(ctx, x + 13, fy - 35, 1, 35, '#141e24');
  R(ctx, x + 1, fy - 35, 12, 2, TL.hi);
  R(ctx, x + 2, fy - 32, 10, 28, '#0c1a20');
  const cols = [TL.lt, AM.mid, OR.neon, '#f4f0e4', '#6cc86a', TL.hi];
  for (let s = 0; s < 4; s++) {
    const sy = fy - 31 + s * 7;
    R(ctx, x + 2, sy + 5, 10, 1, '#3a4e5a');
    for (let k = 0; k < 4; k++) {
      R(ctx, x + 3 + k * 2 + (k > 1 ? 0 : 0), sy, 1, 5, cols[(s * 2 + k) % cols.length]);
      R(ctx, x + 3 + k * 2, sy, 1, 1, '#ffffff');
    }
  }
  RA(ctx, x + 2, fy - 32, 3, 28, '#ffffff', 0.12);
  R(ctx, x + 11, fy - 20, 1, 6, '#c8d0d6');
  R(ctx, x + 1, fy - 2, 12, 1, '#10181c');
}

// Cafédisk: kaklad front, träskiva (2 px) 16 px hög. Plats för espressomaskinen (F.espresso, 12 px) på skivan.
export function cafeCounter(ctx, x, fy, w) {
  F.shadow(ctx, x, fy, w);
  R(ctx, x, fy - 14, w, 14, TL.mid);
  for (let yy = 0; yy < 12; yy += 3) for (let xx = (yy / 3) % 2 ? 2 : 0; xx < w; xx += 4) {
    R(ctx, x + xx, fy - 14 + yy, 3, 2, (xx + yy) % 8 ? TL.lt : '#3ab4b4');
    R(ctx, x + xx, fy - 14 + yy, 3, 1, TL.hi);
  }
  R(ctx, x, fy - 14, w, 1, TL.hi);
  R(ctx, x + w - 1, fy - 13, 1, 13, TL.dk);
  R(ctx, x, fy - 2, w, 2, '#10272e');
  R(ctx, x - 1, fy - 16, w + 2, 2, '#d9a35a');
  R(ctx, x - 1, fy - 16, w + 2, 1, '#f5cd8a');
  R(ctx, x - 1, fy - 14, w + 2, 1, '#8a5a24');
}

// Glasbehållare med bakverk (8 px bred, 6 px hög) att ställa på en bänk vid y = bänkens ovankant.
export function pastryCase(ctx, x, y) {
  R(ctx, x, y - 6, 9, 6, 'rgba(200,240,240,0.35)');
  R(ctx, x, y - 6, 9, 1, '#e8f6f6');
  R(ctx, x, y - 6, 1, 6, '#e8f6f6');
  R(ctx, x + 8, y - 5, 1, 5, '#7ab4b4');
  R(ctx, x + 1, y - 3, 7, 3, '#f4efe4');
  blob(ctx, x + 2, y - 4, 1, 1, AM.mid, AM.hi, AM.dk);
  blob(ctx, x + 5, y - 4, 1, 1, '#c8803a', AM.lt, '#8a5a24');
  R(ctx, x + 3, y - 2, 3, 1, '#e87a8a');
}

// Menytavla: mörk skiva med rubrik och rader. title sv/en väljs av anroparen.
export function menuBoard(ctx, x, y, w, h, title) {
  R(ctx, x - 1, y - 1, w + 2, h + 2, '#3a2a1c');
  R(ctx, x - 1, y - 1, w + 2, 1, '#8a6a42');
  R(ctx, x, y, w, h, '#11262c');
  drawText(ctx, title, x + 2, y + 1, AM.lt);
  for (let r = 0; r < Math.floor((h - 7) / 3); r++) {
    R(ctx, x + 2, y + 7 + r * 3, 8 + ((r * 5) % 7), 1, '#d8e4e6');
    R(ctx, x + w - 6, y + 7 + r * 3, 4, 1, AM.mid);
  }
}

// Revolvingdörr i sidovy: glascylinder med ram. Själva bladen ritas dynamiskt (se revolvingBlades).
export function revolvingFrame(ctx, x, fy, w = 18, h = 36) {
  RA(ctx, x, fy - h, w, h, TL.glass, 0.2);
  R(ctx, x, fy - h, w, 2, ST.mid);
  R(ctx, x, fy - h, w, 1, ST.hi);
  R(ctx, x, fy - 3, w, 3, ST.dk);
  R(ctx, x, fy - 3, w, 1, ST.lt);
  R(ctx, x, fy - h, 2, h, ST.mid);
  R(ctx, x, fy - h, 1, h, ST.hi);
  R(ctx, x + w - 2, fy - h, 2, h, ST.mid);
  R(ctx, x + w - 1, fy - h, 1, h, ST.dk);
  R(ctx, x + Math.floor(w / 2) - 1, fy - h + 2, 2, 1, ST.dk);
  for (let i = 0; i < 3; i++) RA(ctx, x + 4 + i * 3, fy - h + 5 + i * 2, 1, 9, '#ffffff', 0.25);
}

// ── Bibliotek och labb ──
// Öppen bokhylla i valnöt med LED under hyllorna (w px bred, h px hög).
export function libraryShelf(ctx, x, fy, w = 24, h = 40, seed = 1) {
  F.shadow(ctx, x, fy, w, 0.3);
  R(ctx, x, fy - h, w, h, '#4a3220');
  R(ctx, x, fy - h, w, 1, '#8a6240');
  R(ctx, x, fy - h, 1, h, '#6a4a30');
  R(ctx, x + w - 1, fy - h + 1, 1, h - 1, '#2a1c12');
  R(ctx, x + 1, fy - h + 1, w - 2, h - 2, '#241812');
  const cols = [TL.lt, AM.mid, OR.neon, '#f4f0e4', '#3a5a98', '#7aa86a', '#d8c8a0', TL.mid];
  const rows = Math.floor((h - 2) / 9);
  for (let r = 0; r < rows; r++) {
    const sy = fy - h + 2 + (r + 1) * 9 - 1;
    R(ctx, x + 1, sy, w - 2, 1, '#8a6240');
    RA(ctx, x + 1, sy + 1, w - 2, 1, AM.hi, 0.25);
    let cx = x + 2;
    let k = 0;
    while (cx < x + w - 3) {
      const bh = 4 + Math.floor(hash(seed * 13 + r * 7 + k) * 4);
      const bw = 1 + Math.floor(hash(seed * 5 + r * 3 + k * 2) * 2);
      if (hash(seed + r * 11 + k * 3) < 0.14 && cx < x + w - 8) {
        // föremål: kruka eller skål
        R(ctx, cx, sy - 3, 3, 3, '#e8e0cc');
        R(ctx, cx, sy - 3, 3, 1, '#ffffff');
        if (hash(seed + r + k) < 0.6) blob(ctx, cx + 1, sy - 5, 1, 2, '#4fb066', '#9be08a', '#2b7a46');
        cx += 4;
      } else {
        R(ctx, cx, sy - bh, bw, bh, cols[Math.floor(hash(seed * 3 + r * 17 + k * 5) * cols.length)]);
        R(ctx, cx, sy - bh, 1, 1, 'rgba(255,255,255,0.4)');
        cx += bw;
      }
      k++;
    }
  }
}

// Skrivbart glas / idévägg med lappar, skisser och pilar (w x h px).
export function designWall(ctx, x, y, w, h, seed = 1) {
  R(ctx, x - 1, y - 1, w + 2, h + 2, ST.mid);
  R(ctx, x - 1, y - 1, w + 2, 1, ST.hi);
  R(ctx, x, y, w, h, '#f4fafb');
  RA(ctx, x, y, w, h, TL.glass, 0.18);
  RA(ctx, x + 2, y + 1, 1, h - 3, '#ffffff', 0.5);
  RA(ctx, x + 5, y + 1, 1, Math.floor(h / 2), '#ffffff', 0.3);
  const notes = [AM.lt, '#ff9a5a', TL.hi, '#f4f0e4', '#ffd0e0'];
  // skisser: tre ramar med streck
  for (let i = 0; i < 3; i++) {
    const px = x + 3 + i * Math.floor((w - 6) / 3);
    const pw = Math.floor((w - 6) / 3) - 3;
    R(ctx, px, y + 3, pw, 1, TL.mid);
    R(ctx, px, y + 3, 1, 7, TL.mid);
    R(ctx, px + pw - 1, y + 3, 1, 7, TL.mid);
    R(ctx, px, y + 9, pw, 1, TL.mid);
    R(ctx, px + 2, y + 5, pw - 5, 1, OR.neon);
    R(ctx, px + 2, y + 7, Math.max(2, pw - 7), 1, AM.mid);
  }
  R(ctx, x + 4, y + 12, w - 10, 1, '#3a5a98');
  R(ctx, x + w - 8, y + 11, 1, 3, '#3a5a98');
  // klisterlappar i rader
  const rows = Math.max(1, Math.floor((h - 17) / 4));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < Math.floor((w - 6) / 4); c++) {
      if (hash(seed + r * 9 + c * 5) < 0.74) {
        const px = x + 3 + c * 4;
        const py = y + 16 + r * 4;
        R(ctx, px, py, 3, 3, notes[Math.floor(hash(seed * 2 + r * 3 + c * 7) * notes.length)]);
        R(ctx, px, py, 3, 1, 'rgba(255,255,255,0.5)');
      }
    }
  }
  R(ctx, x - 1, y + h + 1, w + 2, 2, ST.lt);
  R(ctx, x + 3, y + h, 3, 1, OR.neon);
  R(ctx, x + 8, y + h, 3, 1, TL.mid);
  R(ctx, x + 13, y + h, 3, 1, AM.mid);
}

// Kylenhet för serverhallen (16 x 30): vit låda med fläktgaller och status-LED.
export function coolerUnit(ctx, x, fy) {
  F.shadow(ctx, x, fy, 16, 0.4);
  R(ctx, x, fy - 30, 16, 30, '#dfe8ec');
  R(ctx, x, fy - 30, 16, 1, '#ffffff');
  R(ctx, x, fy - 30, 1, 30, '#f4f9fb');
  R(ctx, x + 15, fy - 29, 1, 29, '#8ea3ae');
  R(ctx, x + 2, fy - 27, 12, 12, '#2a3a44');
  for (let k = 0; k < 4; k++) R(ctx, x + 3, fy - 26 + k * 3, 10, 1, '#161f26');
  blob(ctx, x + 8, fy - 21, 4, 4, '#1c2830', '#3a4a56', '#10181c');
  R(ctx, x + 2, fy - 12, 12, 1, '#b8c8d0');
  R(ctx, x + 3, fy - 9, 4, 2, '#0c1a20');
  R(ctx, x + 4, fy - 9, 2, 1, '#5cf2a0');
  R(ctx, x + 9, fy - 9, 3, 2, TL.mid);
  R(ctx, x + 1, fy - 2, 14, 1, '#8ea3ae');
}

// Fikus med stora blad i vit kruka (h = kronans höjd över krukan). Ersätter V.plantFloor (som kan bli en sprite i annan stil).
export function ficus(ctx, x, fy, h = 24, seed = 1, potC = '#eef3f4') {
  const g = [['#2b7a46', '#4fb066', '#9be08a'], ['#2a7f6c', '#43b894', '#9ae8c4']][seed % 2];
  F.shadow(ctx, x - 1, fy, 10, 0.25);
  R(ctx, x, fy - 7, 8, 7, potC);
  R(ctx, x, fy - 7, 8, 1, '#ffffff');
  R(ctx, x, fy - 7, 1, 7, '#ffffff');
  R(ctx, x + 7, fy - 6, 1, 6, shade(potC, -0.25));
  R(ctx, x + 1, fy - 1, 6, 1, shade(potC, -0.3));
  R(ctx, x + 1, fy - 7, 6, 1, '#3a2c22');
  R(ctx, x + 3, fy - 7 - h + 4, 1, h - 3, '#6a5a3a');
  const n = 7 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const px = x + 4 + Math.round((hash(seed * 13 + i) - 0.5) * 10);
    const py = fy - 7 - 4 - Math.round(t * (h - 5)) + Math.round((hash(seed * 7 + i) - 0.5) * 2);
    blob(ctx, px, py, 3, 2, g[1], g[2], g[0]);
  }
  blob(ctx, x + 3, fy - 7 - h + 2, 3, 2, g[1], g[2], g[0]);
}

// Bågformad golvlampa med varm kupa (h = höjd). Ersätter F.floorLamp (som kan bli en sprite).
export function arcLamp(ctx, x, fy, h = 38) {
  F.shadow(ctx, x - 3, fy, 8, 0.25);
  R(ctx, x - 3, fy - 2, 8, 2, ST.dk);
  R(ctx, x - 3, fy - 2, 8, 1, ST.mid);
  R(ctx, x, fy - h + 6, 1, h - 8, ST.mid);
  R(ctx, x, fy - h + 6, 1, h - 8, ST.lt);
  // bågen åt vänster
  R(ctx, x - 4, fy - h + 4, 5, 1, ST.lt);
  R(ctx, x - 6, fy - h + 5, 2, 2, ST.mid);
  // skärm
  R(ctx, x - 10, fy - h + 7, 9, 2, AM.lt);
  R(ctx, x - 11, fy - h + 9, 11, 3, AM.mid);
  R(ctx, x - 11, fy - h + 9, 2, 3, AM.hi);
  R(ctx, x - 1, fy - h + 9, 1, 3, AM.dk);
  R(ctx, x - 9, fy - h + 12, 7, 1, '#fff4c8');
  RA(ctx, x - 16, fy - h + 6, 21, 18, AM.lt, 0.1);
  RA(ctx, x - 12, fy - h + 10, 13, 12, AM.lt, 0.1);
}

// Geometrisk matta (liggande på golvbandet).
export function rugM(ctx, x, fy, w, c1 = TL.mid, c2 = AM.mid) {
  R(ctx, x, fy - 2, w, 2, c1);
  R(ctx, x + 1, fy - 2, w - 2, 1, shade(c1, 0.25));
  for (let i = 3; i < w - 3; i += 6) R(ctx, x + i, fy - 1, 3, 1, c2);
}

// Solpanel-rad och takdetaljer finns i tier4.js (roof). Hjälpare här: glödande parallellogram.
export function slantedRect(ctx, x, y, w, h, shear, c) {
  for (let r = 0; r < h; r++) R(ctx, x + Math.round((r * shear) / h), y + r, w, 1, c);
}

export { drawText, textWidth, F, V };
