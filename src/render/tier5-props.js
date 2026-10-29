import { NEON } from './pal.js';
import { shade } from '../core/util.js';
import { drawText, textWidth } from './font.js';
import * as V from './props2.js';
import * as F from './furniture.js';
import * as P from './props.js';

const { R, RA, hash, blob } = V;

// Dynasti-tornet (nivå 5): material och möbler. Ljus kommer uppifrån vänster: högdagrar uppe/vänster, skuggor nere/höger.
export const GOLD = { hi: '#fff3c4', lt: '#f7de8e', md: '#dcb050', dk: '#a97c2c', ink: '#5f4318' };
export const MARBLE = { hi: '#fbf8f0', lt: '#ece6d8', md: '#d4cdbd', dk: '#a9a294', vein: '#bdb5a4' };
export const NAVY = { hi: '#4a5c9a', lt: '#32427a', md: '#243260', dk: '#182246', ink: '#0e1530' };

// ── Material ──
export const goldH = (ctx, x, y, w) => {
  R(ctx, x, y, w, 1, GOLD.lt);
  R(ctx, x, y + 1, w, 1, GOLD.dk);
};
export const goldV = (ctx, x, y, h) => {
  R(ctx, x, y, 1, h, GOLD.lt);
  R(ctx, x + 1, y, 1, h, GOLD.dk);
};
// Guldlist under taket med tandsnitt.
export function crownMold(ctx, x, top, w) {
  R(ctx, x, top, w, 1, GOLD.hi);
  R(ctx, x, top + 1, w, 1, GOLD.md);
  R(ctx, x, top + 2, w, 1, GOLD.dk);
  for (let i = 1; i < w - 1; i += 3) R(ctx, x + i, top + 2, 1, 1, GOLD.md);
}
// Marmorpelare med guldkapitäl och guldfot.
export function pilaster(ctx, x, top, h, w = 4) {
  R(ctx, x, top, w, h, MARBLE.lt);
  R(ctx, x, top, 1, h, MARBLE.hi);
  R(ctx, x + w - 1, top, 1, h, MARBLE.dk);
  for (let y = top + 6; y < top + h - 4; y += 7) R(ctx, x + 1, y, w - 2, 1, MARBLE.md);
  R(ctx, x - 1, top, w + 2, 2, GOLD.lt);
  R(ctx, x - 1, top + 1, w + 2, 1, GOLD.dk);
  R(ctx, x - 1, top + h - 2, w + 2, 2, GOLD.md);
  R(ctx, x - 1, top + h - 1, w + 2, 1, GOLD.dk);
}
// Marmorgolv i rummets golvband (3 px): rutor och guldlist.
export function marbleFloor(ctx, x, fy, w, a = '#e6e0d2', b = '#c2baa8') {
  R(ctx, x, fy - 3, w, 3, a);
  for (let i = 0; i < w; i += 8) R(ctx, x + i + ((i >> 3) % 2 ? 4 : 0), fy - 3, 4, 3, b);
  R(ctx, x, fy - 3, w, 1, MARBLE.hi);
  R(ctx, x, fy - 1, w, 1, GOLD.dk);
}
// Kristallkrona, ca w x 18 (lite: bara övre kransen, ca 14 px), hänger från taket (top).
export function chandelier(ctx, cx, top, w = 26, lite = false) {
  RA(ctx, cx - w / 2 - 4, top + 3, w + 8, lite ? 14 : 18, '#fff0c0', 0.1);
  R(ctx, cx, top, 1, 5, GOLD.dk);
  R(ctx, cx - 2, top + 4, 5, 1, GOLD.lt);
  R(ctx, cx - 1, top + 5, 3, 1, GOLD.md);
  R(ctx, cx - w / 2, top + 7, w, 1, GOLD.lt);
  R(ctx, cx - w / 2 + 1, top + 8, w - 2, 1, GOLD.dk);
  for (let x = cx - w / 2 + 1; x < cx + w / 2; x += 3) {
    const l = lite ? 1 + ((x * 7) & 1) : 2 + ((x * 7) & 3);
    R(ctx, x, top + 9, 1, l, '#d8f0ff');
    R(ctx, x, top + 9 + l, 1, 1, '#ffffff');
  }
  if (!lite) {
    const w2 = Math.round(w * 0.5);
    R(ctx, cx - w2 / 2, top + 12, w2, 1, GOLD.md);
    for (let x = cx - w2 / 2 + 1; x < cx + w2 / 2; x += 3) {
      R(ctx, x, top + 13, 1, 3, '#c8e6ff');
      R(ctx, x, top + 16, 1, 1, '#ffffff');
    }
    R(ctx, cx, top + 13, 1, 6, '#ffffff');
  }
  for (let x = cx - w / 2; x <= cx + w / 2; x += 4) R(ctx, x, top + 6, 1, 1, '#fff6d0'); // ljuslågor
}
// Kronsymbol (guld med juveler), 15 x 9. x = vänsterkant, y = överkant.
export function crownIcon(ctx, x, y, jewel = '#4de1ff') {
  const sp = [[0, 0], [3, 2], [7, 0], [11, 2], [14, 0]]; // spetsar (x, y)
  for (const [sx, sy] of sp) {
    R(ctx, x + sx, y + sy, 1, 5 - sy, GOLD.lt);
    R(ctx, x + sx, y + sy - 1, 1, 1, '#ffffff');
  }
  R(ctx, x, y + 3, 15, 3, GOLD.md);
  for (let i = 0; i < 15; i++) if (i % 4 === 3 || i < 1) R(ctx, x + i, y + 2, 1, 1, GOLD.md);
  R(ctx, x, y + 3, 15, 1, GOLD.lt);
  R(ctx, x, y + 5, 15, 1, GOLD.dk);
  R(ctx, x + 1, y + 6, 13, 2, GOLD.md);
  R(ctx, x + 1, y + 7, 13, 1, GOLD.dk);
  R(ctx, x + 2, y + 4, 2, 2, '#ff4f6a');
  R(ctx, x + 6, y + 4, 3, 2, jewel);
  R(ctx, x + 11, y + 4, 2, 2, '#ff4f6a');
  R(ctx, x + 7, y + 4, 1, 1, '#ffffff');
}
// Hög fönsterram i guld över ett fönsterhål (överritar windowV2:s mörka ram). x,y,w,h = hålet.
export function goldFrame(ctx, x, y, w, h, mullions = 1) {
  R(ctx, x - 2, y - 2, w + 4, 2, GOLD.md);
  R(ctx, x - 2, y - 2, w + 4, 1, GOLD.lt);
  R(ctx, x - 2, y - 2, 2, h + 4, GOLD.md);
  R(ctx, x - 2, y - 2, 1, h + 4, GOLD.lt);
  R(ctx, x + w, y - 2, 2, h + 4, GOLD.dk);
  R(ctx, x - 3, y + h, w + 6, 1, GOLD.hi);
  R(ctx, x - 3, y + h + 1, w + 6, 2, MARBLE.lt);
  R(ctx, x - 3, y + h + 1, w + 6, 1, MARBLE.hi);
  R(ctx, x - 3, y + h + 3, w + 6, 1, GOLD.dk);
  for (let i = 1; i <= mullions; i++) {
    const mx = x + Math.round((w * i) / (mullions + 1));
    R(ctx, mx, y, 1, h, GOLD.md);
  }
  R(ctx, x, y + Math.floor(h * 0.62), w, 1, GOLD.md);
}
// Skira gardiner i sidenvitt vid ett fönster (tunna, med guldstång).
export function sheer(ctx, x, y, w, h, c = '#f4efe2') {
  R(ctx, x - 3, y - 3, w + 6, 1, GOLD.md);
  R(ctx, x - 3, y - 3, 1, 1, GOLD.hi);
  R(ctx, x + w + 2, y - 3, 1, 1, GOLD.hi);
  for (const sx of [x, x + w - 3]) {
    R(ctx, sx, y - 2, 3, h + 1, c);
    R(ctx, sx, y - 2, 1, h + 1, '#ffffff');
    R(ctx, sx + 1, y, 1, h - 1, shade(c, -0.1));
    R(ctx, sx + 2, y + 2, 1, h - 3, shade(c, -0.2));
  }
}

// ── Möbler ──
// Receptionsdisk i marmor och marinblått med guldkrona, w px bred. Hologrammet på disken ritas av rummets dynamic.
export function reception(ctx, x, fy, w = 34) {
  F.shadow(ctx, x, fy, w);
  R(ctx, x, fy - 14, w, 14, NAVY.md);
  R(ctx, x, fy - 14, w, 1, NAVY.hi);
  R(ctx, x, fy - 14, 1, 14, NAVY.lt);
  R(ctx, x + w - 1, fy - 14, 1, 14, NAVY.ink);
  for (let i = 4; i < w - 3; i += 5) R(ctx, x + i, fy - 12, 1, 9, NAVY.dk);
  R(ctx, x - 1, fy - 17, w + 2, 3, MARBLE.lt);
  R(ctx, x - 1, fy - 17, w + 2, 1, MARBLE.hi);
  R(ctx, x - 1, fy - 15, w + 2, 1, MARBLE.md);
  R(ctx, x - 1, fy - 14, w + 2, 1, GOLD.dk);
  crownIcon(ctx, x + Math.floor(w / 2) - 7, fy - 12, NEON.cyan);
  R(ctx, x + 2, fy - 2, w - 4, 1, NEON.cyan);
  RA(ctx, x + 1, fy - 3, w - 2, 3, NEON.cyan, 0.22);
  // på disken: holografisk projektor och orkidé till höger, receptionisten står bakom den vänstra halvan
  holoBase(ctx, x + w - 7, fy - 17, 6);
  R(ctx, x + w - 3, fy - 20, 3, 3, MARBLE.hi);
  R(ctx, x + w - 2, fy - 24, 1, 4, '#4a8a4a');
  R(ctx, x + w - 2, fy - 25, 2, 1, '#ff8ac8');
  R(ctx, x + w, fy - 22, 1, 2, '#ff8ac8');
}
// Trofévägg: glasskåp med två hyllor (P.trophyShelf ritar pokaler och spelboxar) och guldplakett. x = vänsterkant.
export function trophyWall(ctx, x, fy, awards, games, label) {
  const trophyShelf = P.trophyShelf;
  const top = fy - 41;
  R(ctx, x - 1, top - 1, 50, 40, GOLD.dk);
  R(ctx, x - 1, top - 1, 50, 1, GOLD.lt);
  R(ctx, x - 1, top - 1, 1, 40, GOLD.lt);
  R(ctx, x, top, 48, 38, '#12183a');
  for (let i = 0; i < 12; i++) R(ctx, x + 2 + ((i * 11) % 44), top + 2 + ((i * 7) % 30), 1, 1, '#3a4a8a'); // stjärnor
  RA(ctx, x, top, 48, 38, NEON.cyan, 0.05);
  for (let yy = top + 2; yy < top + 36; yy += 2) RA(ctx, x, yy, 48, 1, '#000000', 0.06);
  // hyllor och föremål
  // övre hyllan först (i ögonhöjd), överflödet hamnar på den undre
  const k1 = Math.max(0, 5 - Math.min(awards, 5));
  trophyShelf(ctx, x + 2, fy, awards, games);
  trophyShelf(ctx, x + 2, fy + 14, Math.max(0, awards - 5), games.slice(0, Math.max(0, games.length - k1)));
  if (!awards && !games.length) {
    for (const [gx, gy] of [[8, 14], [20, 14], [34, 14], [14, 28], [28, 28]]) {
      RA(ctx, x + gx, fy - gy - 7, 5, 4, GOLD.md, 0.3);
      RA(ctx, x + gx + 1, fy - gy - 3, 3, 3, GOLD.dk, 0.3);
    }
  }
  // spotlights
  for (const sx of [10, 24, 38]) {
    R(ctx, x + sx, top, 4, 1, GOLD.lt);
    for (let i = 0; i < 12; i += 2) RA(ctx, x + sx - 1 - (i >> 1), top + 1 + i, 6 + i, 2, '#fff4c8', 0.05);
  }
  // glasreflex
  for (let i = 0; i < 7; i++) RA(ctx, x + 4 + i + (i >> 1), top + 3 + i * 3, 1, 5, '#ffffff', 0.16);
  // sockel med plakett
  R(ctx, x - 1, fy - 3 - 9, 50, 12, NAVY.md);
  R(ctx, x - 1, fy - 12, 50, 1, GOLD.lt);
  R(ctx, x - 1, fy - 2, 50, 2, GOLD.dk);
  R(ctx, x, fy - 11, 1, 9, NAVY.hi);
  const tw = textWidth(label) + 4;
  R(ctx, x + 24 - Math.round(tw / 2), fy - 10, tw, 7, GOLD.md);
  R(ctx, x + 24 - Math.round(tw / 2), fy - 10, tw, 1, GOLD.hi);
  R(ctx, x + 24 - Math.round(tw / 2), fy - 4, tw, 1, GOLD.dk);
  drawText(ctx, label, x + 24 - Math.round(tw / 2) + 2, fy - 8, NAVY.ink);
}
// Glasbord för sofforna: marmorskiva med guldben, w px.
export function coffeeTable(ctx, x, fy, w = 14) {
  F.shadow(ctx, x, fy, w, 0.25);
  R(ctx, x + 1, fy - 5, 1, 5, GOLD.md);
  R(ctx, x + w - 2, fy - 5, 1, 5, GOLD.dk);
  R(ctx, x, fy - 7, w, 2, MARBLE.lt);
  R(ctx, x, fy - 7, w, 1, MARBLE.hi);
  R(ctx, x, fy - 5, w, 1, GOLD.dk);
}
// Bardisk: marinblå front med guldlister, marmorskiva och cyan LED i foten.
export function bar(ctx, x, fy, w) {
  F.shadow(ctx, x, fy, w, 0.3);
  R(ctx, x, fy - 16, w, 16, NAVY.md);
  R(ctx, x, fy - 16, w, 1, NAVY.hi);
  R(ctx, x, fy - 16, 1, 16, NAVY.lt);
  R(ctx, x + w - 1, fy - 15, 1, 15, NAVY.ink);
  for (let i = 3; i < w - 2; i += 4) {
    R(ctx, x + i, fy - 14, 1, 11, GOLD.md);
    R(ctx, x + i + 1, fy - 14, 1, 11, GOLD.dk);
  }
  R(ctx, x - 1, fy - 19, w + 2, 3, MARBLE.lt);
  R(ctx, x - 1, fy - 19, w + 2, 1, MARBLE.hi);
  R(ctx, x - 1, fy - 17, w + 2, 1, GOLD.dk);
  R(ctx, x + 1, fy - 2, w - 2, 1, NEON.cyan);
  RA(ctx, x, fy - 3, w, 3, NEON.cyan, 0.22);
}
// Barstol (sitsen i höjd med disken).
export function stool(ctx, x, fy, c = '#8a2a4a') {
  F.shadow(ctx, x - 1, fy, 7, 0.25);
  R(ctx, x + 2, fy - 9, 1, 8, GOLD.md);
  R(ctx, x, fy - 12, 6, 3, c);
  R(ctx, x, fy - 12, 6, 1, shade(c, 0.4));
  R(ctx, x + 5, fy - 11, 1, 2, shade(c, -0.3));
  R(ctx, x, fy - 6, 5, 1, GOLD.dk);
  R(ctx, x, fy - 1, 6, 1, GOLD.dk);
}
// Flaskhylla med bakgrundsljus (amber och cyan), w px, y = hyllans överkant.
export function bottleShelf(ctx, x, y, w) {
  R(ctx, x - 1, y, w + 2, 19, '#2a1a40');
  RA(ctx, x - 1, y, w + 2, 19, '#ffb450', 0.5);
  RA(ctx, x - 1, y + 9, w + 2, 2, NEON.cyanHi, 0.45);
  for (let r = 0; r < 2; r++) {
    const sy = y + 8 + r * 9;
    R(ctx, x - 1, sy, w + 2, 1, GOLD.lt);
    R(ctx, x - 1, sy + 1, w + 2, 1, GOLD.dk);
    for (let i = 1; i < w - 2; i += 4) {
      const c = ['#e8a040', '#4ac86a', '#4a90e0', '#e8504a', '#c8a0ff', '#f2e0a0'][Math.floor(hash(x + i + r * 7) * 6)];
      const h = 3 + Math.floor(hash(i * 3 + r) * 3);
      R(ctx, x + i, sy - h, 3, h, c);
      R(ctx, x + i, sy - h, 1, h, shade(c, 0.45));
      R(ctx, x + i + 1, sy - h - 2, 1, 2, shade(c, -0.2));
      R(ctx, x + i + 1, sy - h - 3, 1, 1, GOLD.lt);
    }
  }
}
// Läderstol (marinblå med guldknappar), dir 1 = vänd åt höger. Sittplatsen som chair2: personen sitter på x+2.
export function leatherChair(ctx, x, fy, c = '#243a6a', dir = 1) {
  ctx.save();
  if (dir < 0) {
    ctx.translate(x + 4, 0);
    ctx.scale(-1, 1);
    F.chair2(ctx, -2, fy, c);
    R(ctx, -2, fy - 18, 1, 1, GOLD.lt);
    R(ctx, -2, fy - 14, 1, 1, GOLD.lt);
  } else {
    F.chair2(ctx, x, fy, c);
    R(ctx, x - 2, fy - 18, 1, 1, GOLD.lt);
    R(ctx, x - 2, fy - 14, 1, 1, GOLD.lt);
  }
  ctx.restore();
}
// Hologram (statisk del): genomskinlig cyan skiva med projektor, glöden animeras i rummets dynamic.
export function holoBase(ctx, cx, fy, w = 8) {
  R(ctx, cx - w / 2, fy - 2, w, 2, GOLD.md);
  R(ctx, cx - w / 2, fy - 2, w, 1, GOLD.lt);
  R(ctx, cx - w / 2 + 1, fy - 3, w - 2, 1, NAVY.dk);
  R(ctx, cx - 1, fy - 3, 3, 1, NEON.cyanHi);
}
export function holoGlobe(ctx, cx, cy, r = 5) {
  for (let y = -r; y <= r; y++) {
    const k = y / (r + 0.5);
    const w = Math.round(r * Math.sqrt(1 - k * k));
    RA(ctx, cx - w, cy + y, w * 2 + 1, 1, NEON.cyan, y % 2 ? 0.18 : 0.32);
  }
  RA(ctx, cx - r, cy, r * 2 + 1, 1, NEON.cyanHi, 0.7);
  for (let a = -r + 2; a < r - 1; a += 3) RA(ctx, cx + a, cy - r, 1, r * 2 + 1, NEON.cyanHi, 0.2);
}
// Lysande skylt i guld med marinblå botten. Returnerar bredden.
export function plaque(ctx, text, x, y, c = GOLD.hi) {
  const w = textWidth(text) + 5;
  R(ctx, x, y, w, 7, '#0a1030');
  R(ctx, x, y, w, 1, GOLD.md);
  R(ctx, x, y + 6, w, 1, GOLD.dk);
  R(ctx, x, y, 1, 7, GOLD.md);
  R(ctx, x + w - 1, y, 1, 7, GOLD.dk);
  drawText(ctx, text, x + 3, y + 1, c);
  return w;
}
// Läderstolens rygg sedd bakifrån (stolar på långsidan av bordet, ritas före bordet).
export function chairBack(ctx, x, fy, c = '#243a6a') {
  R(ctx, x, fy - 24, 8, 10, c);
  R(ctx, x, fy - 24, 8, 1, shade(c, 0.45));
  R(ctx, x, fy - 24, 1, 10, shade(c, 0.25));
  R(ctx, x + 7, fy - 23, 1, 9, shade(c, -0.35));
  R(ctx, x + 3, fy - 21, 2, 1, GOLD.lt);
  R(ctx, x + 3, fy - 18, 2, 1, GOLD.lt);
  R(ctx, x + 3, fy - 14, 2, 4, '#1a1e28');
}
// Styrelsebord i valnöt med guldkant, w px.
export function boardTable(ctx, x, fy, w) {
  F.shadow(ctx, x + 2, fy, w - 4, 0.35);
  for (const lx of [x + 4, x + w - 7]) {
    R(ctx, lx, fy - 12, 3, 12, NAVY.dk);
    R(ctx, lx, fy - 12, 1, 12, NAVY.lt);
    R(ctx, lx, fy - 2, 3, 1, GOLD.md);
  }
  R(ctx, x + 7, fy - 4, w - 14, 1, GOLD.dk);
  R(ctx, x, fy - 15, w, 3, '#b8804e');
  R(ctx, x, fy - 15, w, 1, '#e8b680');
  R(ctx, x, fy - 13, w, 1, '#7a4c2c');
  R(ctx, x, fy - 12, w, 1, GOLD.lt);
  for (let i = 6; i < w - 8; i += 13) R(ctx, x + i, fy - 15, 5, 1, '#fff0d0');
  R(ctx, x + 6, fy - 14, w - 12, 1, '#d09a62');
}
// Café-disk: turkos front med guldlist och marmorskiva.
export function cafeCounter(ctx, x, fy, w) {
  F.shadow(ctx, x, fy, w, 0.3);
  R(ctx, x, fy - 14, w, 14, '#2e8a86');
  R(ctx, x, fy - 14, w, 1, '#5ac8c0');
  R(ctx, x, fy - 14, 1, 14, '#46b0aa');
  R(ctx, x + w - 1, fy - 13, 1, 13, '#1a5a58');
  for (let i = 4; i < w - 2; i += 4) R(ctx, x + i, fy - 12, 1, 9, '#237470');
  R(ctx, x, fy - 12, w, 1, GOLD.md);
  R(ctx, x - 1, fy - 17, w + 2, 3, MARBLE.lt);
  R(ctx, x - 1, fy - 17, w + 2, 1, MARBLE.hi);
  R(ctx, x - 1, fy - 15, w + 2, 1, MARBLE.md);
  R(ctx, x + 1, fy - 2, w - 2, 1, NEON.cyan);
  RA(ctx, x, fy - 3, w, 3, NEON.cyan, 0.2);
}
// Svarta tavlan med krita (meny).
export function chalkBoard(ctx, x, y, w, h) {
  R(ctx, x - 1, y - 1, w + 2, h + 2, GOLD.dk);
  R(ctx, x - 1, y - 1, w + 2, 1, GOLD.lt);
  R(ctx, x, y, w, h, '#161c2c');
  for (let r = 2; r < h - 1; r += 3) RA(ctx, x + 1, y + r, w - 2 - ((r * 3) % 4), 1, '#f4efe0', 0.65);
  R(ctx, x + 1, y + 1, 3, 1, '#ffe27a');
}
// Spelomslag i guldram.
export function cover(ctx, x, y, w, h, c1, c2, kind) {
  R(ctx, x - 1, y - 1, w + 2, h + 2, GOLD.md);
  R(ctx, x - 1, y - 1, w + 2, 1, GOLD.hi);
  R(ctx, x, y, w, h, c2);
  R(ctx, x, y, w, Math.floor(h * 0.6), c1);
  if (kind === 0) { blob(ctx, x + w / 2, y + 4, 2, 2, '#fff2a0'); R(ctx, x, y + h - 4, w, 4, shade(c2, -0.3)); }
  else if (kind === 1) { for (let i = 0; i < w; i++) R(ctx, x + i, y + h - 4 - Math.round(Math.abs(Math.sin(i * 0.9)) * 3), 1, 6, shade(c2, -0.2)); R(ctx, x + 1, y + 1, 1, 1, '#ffffff'); }
  else { R(ctx, x + w / 2 - 1, y + 3, 2, h - 6, '#f4f4ff'); R(ctx, x + 1, y + h - 5, w - 2, 1, '#ffe27a'); }
  R(ctx, x + 1, y + h - 2, w - 2, 1, '#f4f0e4');
  R(ctx, x, y, 1, h, 'rgba(255,255,255,0.3)');
}
// Akustikpanel med diamantmönster och guldram.
export function acoustic(ctx, x, y, w, h, c1 = NAVY.md, c2 = '#5a2a4a') {
  R(ctx, x - 1, y - 1, w + 2, h + 2, GOLD.dk);
  for (let j = 0; j < h; j += 4) for (let i = 0; i < w; i += 4) {
    const c = ((i + j) >> 2) % 2 ? c1 : c2;
    R(ctx, x + i, y + j, Math.min(4, w - i), Math.min(4, h - j), c);
    R(ctx, x + i, y + j, Math.min(4, w - i), 1, shade(c, 0.3));
    R(ctx, x + i + 2, y + j + 2, 1, 1, shade(c, -0.4));
  }
}
// Guldskiva i ram.
export function goldRecord(ctx, x, y) {
  R(ctx, x, y, 11, 11, NAVY.dk);
  R(ctx, x, y, 11, 1, GOLD.md);
  R(ctx, x, y, 1, 11, GOLD.md);
  R(ctx, x + 10, y + 1, 1, 10, GOLD.dk);
  R(ctx, x, y + 10, 11, 1, GOLD.dk);
  blob(ctx, x + 5, y + 5, 4, 4, '#14161e', '#3a3e4e', '#0a0c12');
  R(ctx, x + 4, y + 4, 3, 3, GOLD.md);
  R(ctx, x + 5, y + 5, 1, 1, '#14161e');
  R(ctx, x + 2, y + 2, 2, 1, 'rgba(255,255,255,0.5)');
}
// Checklista med bock och buggsymbol.
export function checklist(ctx, x, y, w, h) {
  R(ctx, x - 1, y - 1, w + 2, h + 2, GOLD.md);
  R(ctx, x - 1, y - 1, w + 2, 1, GOLD.hi);
  R(ctx, x, y, w, h, '#f6f8ff');
  for (let r = 0; r < Math.floor((h - 3) / 4); r++) {
    const yy = y + 2 + r * 4;
    R(ctx, x + 2, yy + 2, 1, 1, '#2a8a4a');
    R(ctx, x + 3, yy + 1, 1, 1, '#2a8a4a');
    R(ctx, x + 4, yy, 1, 1, '#2a8a4a');
    R(ctx, x + 7, yy + 1, w - 18 - ((r * 5) % 6), 1, r === 2 ? '#e8504a' : '#9aa4b8');
  }
  R(ctx, x + w - 9, y + 3, 6, 5, '#e8504a');
  R(ctx, x + w - 8, y + 2, 1, 1, '#3a2a2a');
  R(ctx, x + w - 4, y + 2, 1, 1, '#3a2a2a');
  R(ctx, x + w - 10, y + 5, 1, 1, '#3a2a2a');
  R(ctx, x + w - 2, y + 5, 1, 1, '#3a2a2a');
  R(ctx, x + w - 7, y + 4, 2, 2, '#ffe27a');
}
// Ritning (blåkopia) med kugghjul.
export function blueprint(ctx, x, y, w, h) {
  R(ctx, x - 1, y - 1, w + 2, h + 2, GOLD.md);
  R(ctx, x - 1, y - 1, w + 2, 1, GOLD.hi);
  R(ctx, x, y, w, h, '#123a6a');
  for (let i = 0; i < w; i += 4) R(ctx, x + i, y, 1, h, 'rgba(124,242,255,0.18)');
  for (let j = 0; j < h; j += 4) R(ctx, x, y + j, w, 1, 'rgba(124,242,255,0.18)');
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2) - 1;
  blob(ctx, cx, cy, 4, 4, '#123a6a', NEON.cyan, '#123a6a');
  R(ctx, cx - 1, cy - 1, 3, 3, '#123a6a');
  R(ctx, cx, cy, 1, 1, NEON.cyanHi);
  for (const [dx, dy] of [[-5, 0], [5, 0], [0, -5], [0, 5]]) R(ctx, cx + dx, cy + dy, 1, 1, NEON.cyanHi);
  R(ctx, x + 2, y + h - 4, w - 4, 1, NEON.cyan);
}
