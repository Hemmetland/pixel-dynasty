import { NEON } from './pal.js';
import { shade } from '../core/util.js';
import * as P from './props.js';
import * as V from './props2.js';
import * as F from './furniture.js';
import { GOLD, MARBLE, NAVY, crownMold } from './tier5-props.js';

const { R, RA, blob } = V;

// Dynasti-tornets tolv anläggningsplatser (tre per våning). Tomma platser blir tolv olika lyxrum; byggda anläggningar ritas av
// rooms.js (P.coffee, P.labBench ...) men får rummets vägg och färger härifrån. Varje funktion ritar ett rum på 56 px (rx = vänsterkant).

const S = (wall, dado, trim, floor, light) => ({ wall, wall2: shade(wall, -0.06), dado, trim, floor, floorHi: shade(floor, 0.22), light });
const STYLE = [
  S('#ddd4c2', '#2c3a66', GOLD.md, '#6a5a4c', [1, 0.92, 0.78]), // 0 galleri
  S('#27305a', '#171d3c', GOLD.md, '#3a3450', [1, 0.88, 0.6]), // 1 ärans hall
  S('#2e4a5a', '#1c3040', '#5ac8d8', '#3a4048', [0.8, 0.95, 1]), // 2 gym
  S('#d8e0ea', '#4a5c80', '#7ab4e0', '#8a92a0', [0.85, 0.95, 1]), // 3 prototyp
  S('#3a1e32', '#22101e', GOLD.md, '#2a1a28', [1, 0.6, 0.65]), // 4 ljudstudio
  S('#c8bca2', '#5a4a38', GOLD.dk, '#7a6a52', [1, 0.9, 0.7]), // 5 arkiv
  S('#5a1e2e', '#2e1018', GOLD.md, '#3a2428', [1, 0.7, 0.6]), // 6 vinbar
  S('#1c1a3a', '#10102a', NEON.magenta, '#18162e', [0.8, 0.6, 1]), // 7 spelhall
  S('#bcd8c0', '#3a6a4c', '#6aa87a', '#8a9a7a', [0.9, 1, 0.8]), // 8 trädgård
  S('#3a1620', '#220c14', GOLD.md, '#2a1a1e', [1, 0.7, 0.6]), // 9 auditorium
  S('#4a3a2c', '#2e2218', GOLD.md, '#4a3a2e', [1, 0.85, 0.6]), // 10 bibliotek
  S('#d0d8c8', '#5a6a52', '#8aa27a', '#a89a80', [0.92, 1, 0.88]), // 11 zen
];
export const FAC_STYLES = Object.fromEntries(STYLE.map((s, i) => [`tw_f${i}`, s]));
export const FAC_NAMES = [
  ['GALLERI', 'GALLERY'], ['ÄRANS HALL', 'HALL OF FAME'], ['TRÄNING', 'GYM'],
  ['PROTOTYP', 'PROTOTYPES'], ['LJUDSTUDIO', 'RECORDING'], ['ARKIV', 'ARCHIVE'],
  ['VINBAR', 'WINE BAR'], ['SPELHALL', 'ARCADE'], ['TRÄDGÅRD', 'GARDEN'],
  ['AUDITORIUM', 'AUDITORIUM'], ['BIBLIOTEK', 'LIBRARY'], ['ZEN-RUM', 'ZEN ROOM'],
];

const spot = (ctx, x, y, w = 10, h = 14) => {
  R(ctx, x + Math.floor(w / 2) - 2, y - 2, 5, 1, GOLD.lt);
  R(ctx, x + Math.floor(w / 2), y - 1, 1, 1, GOLD.dk);
  for (let i = 0; i < h; i += 2) RA(ctx, x - (i >> 2), y + i, w + (i >> 1), 2, '#fff4c8', 0.06 * (1 - i / h));
};
const gframe = (ctx, x, y, w, h, kind, seed) => V.frame(ctx, x, y, w, h, kind, seed, GOLD.md);

export const FAC_VARIANTS = [
  // 0 galleri: tavlor med tavelbelysning, piedestal med guldskulptur och rep
  (ctx, rx, fy) => {
    crownMold(ctx, rx, fy - 48, 56);
    gframe(ctx, rx + 5, fy - 40, 16, 20, 0, 3); spot(ctx, rx + 5, fy - 42, 16, 16);
    gframe(ctx, rx + 25, fy - 38, 11, 15, 3, 5); spot(ctx, rx + 25, fy - 40, 11, 14);
    gframe(ctx, rx + 40, fy - 39, 12, 12, 1, 2); spot(ctx, rx + 40, fy - 41, 12, 12);
    F.shadow(ctx, rx + 24, fy, 10);
    R(ctx, rx + 24, fy - 11, 10, 11, MARBLE.lt); R(ctx, rx + 24, fy - 11, 10, 1, MARBLE.hi); R(ctx, rx + 24, fy - 11, 1, 11, MARBLE.hi); R(ctx, rx + 33, fy - 10, 1, 10, MARBLE.dk);
    R(ctx, rx + 23, fy - 13, 12, 2, GOLD.md); R(ctx, rx + 23, fy - 13, 12, 1, GOLD.lt);
    blob(ctx, rx + 29, fy - 19, 4, 4, GOLD.md, GOLD.hi, GOLD.dk);
    R(ctx, rx + 28, fy - 19, 3, 2, '#2a1a10'); R(ctx, rx + 27, fy - 23, 1, 1, '#ffffff');
    for (const x of [rx + 4, rx + 14]) { R(ctx, x, fy - 8, 1, 8, GOLD.md); R(ctx, x - 1, fy - 9, 3, 2, GOLD.lt); R(ctx, x - 1, fy - 1, 3, 1, GOLD.dk); }
    R(ctx, rx + 5, fy - 6, 9, 1, '#b8283a'); R(ctx, rx + 7, fy - 5, 5, 1, '#b8283a');
  },
  // 1 ärans hall: stor guldpokal i strålkastarljus och två montrar
  (ctx, rx, fy) => {
    crownMold(ctx, rx, fy - 48, 56);
    for (const mx of [rx + 3, rx + 41]) {
      R(ctx, mx - 1, fy - 31, 14, 29, GOLD.dk); R(ctx, mx, fy - 30, 12, 27, '#0e1430'); R(ctx, mx - 1, fy - 31, 14, 1, GOLD.lt);
      R(ctx, mx, fy - 17, 12, 1, GOLD.md); R(ctx, mx, fy - 3, 12, 1, GOLD.md);
      for (const [yy, o] of [[fy - 18, 0], [fy - 4, 1]]) {
        R(ctx, mx + 3, yy - 6, 5, 4, GOLD.md); R(ctx, mx + 4, yy - 2, 3, 2, GOLD.dk); R(ctx, mx + 3, yy - 6, 5, 1, GOLD.hi); R(ctx, mx + 2 + o, yy - 5, 1, 2, GOLD.md);
      }
      for (let i = 0; i < 5; i++) RA(ctx, mx + 2 + i * 2, fy - 28 + i * 4, 1, 6, '#ffffff', 0.15);
    }
    spot(ctx, rx + 22, fy - 46, 12, 30);
    F.shadow(ctx, rx + 21, fy, 14);
    R(ctx, rx + 22, fy - 12, 12, 12, NAVY.md); R(ctx, rx + 22, fy - 12, 12, 1, NAVY.hi); R(ctx, rx + 21, fy - 14, 14, 2, GOLD.md); R(ctx, rx + 21, fy - 14, 14, 1, GOLD.lt);
    R(ctx, rx + 25, fy - 9, 6, 3, GOLD.md);
    R(ctx, rx + 27, fy - 20, 2, 6, GOLD.md); R(ctx, rx + 24, fy - 16, 8, 2, GOLD.dk);
    R(ctx, rx + 23, fy - 30, 10, 8, GOLD.lt); R(ctx, rx + 24, fy - 22, 8, 3, GOLD.md); R(ctx, rx + 26, fy - 19, 4, 1, GOLD.dk);
    R(ctx, rx + 21, fy - 29, 2, 4, GOLD.md); R(ctx, rx + 33, fy - 29, 2, 4, GOLD.dk);
    R(ctx, rx + 24, fy - 30, 1, 7, GOLD.hi); R(ctx, rx + 27, fy - 28, 3, 1, GOLD.hi);
  },
  // 2 gym: löpband, spegel, hantlar
  (ctx, rx, fy) => {
    R(ctx, rx + 3, fy - 41, 33, 24, GOLD.dk); R(ctx, rx + 4, fy - 40, 31, 22, '#8fb4cc'); R(ctx, rx + 4, fy - 40, 31, 2, '#b8d8ec');
    for (let i = 0; i < 6; i++) RA(ctx, rx + 7 + i * 5, fy - 38 + (i % 2) * 2, 2, 17, '#ffffff', 0.22);
    F.rug(ctx, rx + 2, fy, 52, '#1c3040', '#5aa0c8');
    R(ctx, rx + 6, fy - 4, 24, 4, '#1a1e28'); R(ctx, rx + 6, fy - 4, 24, 1, '#4a5268'); R(ctx, rx + 28, fy - 28, 2, 24, '#4a5268');
    R(ctx, rx + 24, fy - 33, 10, 6, '#161a28'); R(ctx, rx + 25, fy - 32, 8, 3, NEON.cyan); R(ctx, rx + 26, fy - 31, 3, 1, '#c8faff');
    R(ctx, rx + 22, fy - 22, 7, 1, '#8a92a8');
    R(ctx, rx + 38, fy - 15, 16, 2, '#3a4054'); R(ctx, rx + 39, fy - 13, 2, 13, '#2a2f3c'); R(ctx, rx + 51, fy - 13, 2, 13, '#2a2f3c');
    for (let i = 0; i < 4; i++) { R(ctx, rx + 39 + i * 4, fy - 20, 3, 5, i % 2 ? GOLD.md : '#4a90e0'); R(ctx, rx + 39 + i * 4, fy - 20, 3, 1, 'rgba(255,255,255,0.4)'); }
    R(ctx, rx + 42, fy - 6, 8, 5, '#2a2f3c'); R(ctx, rx + 41, fy - 5, 2, 3, GOLD.md); R(ctx, rx + 49, fy - 5, 2, 3, GOLD.md);
    V.neonLine(ctx, rx + 4, fy - 45, 48, NEON.cyanHi, NEON.cyan);
  },
  // 3 prototyplabb: 3D-skrivare, robotarm och hologram
  (ctx, rx, fy) => {
    R(ctx, rx + 2, fy - 13, 38, 2, '#ece8e0'); R(ctx, rx + 3, fy - 11, 36, 11, '#5a6a8a'); R(ctx, rx + 3, fy - 11, 36, 1, '#3a4a6a'); R(ctx, rx + 14, fy - 11, 1, 11, '#3a4a6a'); R(ctx, rx + 27, fy - 11, 1, 11, '#3a4a6a');
    R(ctx, rx + 4, fy - 34, 16, 21, '#2a3042'); R(ctx, rx + 5, fy - 33, 14, 18, 'rgba(160,230,255,0.45)'); R(ctx, rx + 5, fy - 33, 14, 1, '#cfeaff');
    R(ctx, rx + 6, fy - 28, 12, 1, '#7a849a'); R(ctx, rx + 11, fy - 28, 2, 4, '#ff9a4a'); RA(ctx, rx + 8, fy - 24, 8, 8, '#ff9a4a', 0.2);
    R(ctx, rx + 8, fy - 17, 8, 4, '#e8e8f0'); R(ctx, rx + 9, fy - 20, 6, 3, '#ffe27a');
    V.pot(ctx, rx + 30, fy - 13, 8, 2, '#3a4a6a');
    R(ctx, rx + 33, fy - 24, 2, 11, '#6a7a9a'); R(ctx, rx + 31, fy - 26, 8, 2, '#4a5a7a'); R(ctx, rx + 38, fy - 28, 2, 4, '#8aa0c0'); R(ctx, rx + 38, fy - 29, 3, 1, '#ff4a4a');
    for (let y = 0; y < 8; y++) RA(ctx, rx + 44 - (y > 3 ? 7 - y : y), fy - 36 + y, 5 + (y > 3 ? 7 - y : y) * 2, 1, NEON.cyan, 0.3);
    R(ctx, rx + 41, fy - 28, 8, 2, GOLD.md); R(ctx, rx + 44, fy - 27, 2, 1, NEON.cyanHi);
    V.wallShelf(ctx, rx + 40, fy - 20, 14, 'ptc', 3);
  },
  // 4 ljudstudio: akustikpaneler, mixerbord, mikrofon och REC-lampa
  (ctx, rx, fy) => {
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
      const x = rx + 4 + i * 8; const y = fy - 44 + j * 7;
      R(ctx, x, y, 7, 6, (i + j) % 2 ? NAVY.md : '#5a2a4a'); R(ctx, x, y, 7, 1, shade((i + j) % 2 ? NAVY.md : '#5a2a4a', 0.3)); R(ctx, x + 3, y + 2, 1, 2, 'rgba(0,0,0,0.3)');
    }
    R(ctx, rx + 2, fy - 12, 34, 3, '#2a2f3c'); R(ctx, rx + 2, fy - 12, 34, 1, '#6a769a'); R(ctx, rx + 4, fy - 9, 2, 9, '#1a1e28'); R(ctx, rx + 32, fy - 9, 2, 9, '#1a1e28');
    for (let i = 0; i < 8; i++) { R(ctx, rx + 5 + i * 4, fy - 15, 2, 3, '#3a4262'); R(ctx, rx + 5 + i * 4, fy - 15 + (i % 3), 2, 1, i % 2 ? GOLD.lt : NEON.cyan); }
    R(ctx, rx + 40, fy - 28, 1, 28, '#3a4054'); R(ctx, rx + 40, fy - 2, 7, 2, '#2a2f3c'); R(ctx, rx + 38, fy - 31, 5, 4, '#10141c'); R(ctx, rx + 39, fy - 30, 3, 2, '#6a769a'); R(ctx, rx + 36, fy - 26, 8, 1, '#9aa4b8');
    R(ctx, rx + 47, fy - 12, 6, 12, '#1a1e28'); R(ctx, rx + 48, fy - 10, 4, 4, '#3a4054'); R(ctx, rx + 49, fy - 9, 2, 2, '#8a92a8'); R(ctx, rx + 49, fy - 4, 2, 2, '#3a4054');
    R(ctx, rx + 40, fy - 39, 12, 4, '#2a0a10'); R(ctx, rx + 41, fy - 38, 3, 2, '#ff3a4a'); R(ctx, rx + 45, fy - 38, 6, 1, '#ff3a4a'); RA(ctx, rx + 38, fy - 40, 16, 8, '#ff3a4a', 0.16);
  },
  // 5 arkiv: rullhyllor med arkivlådor, stege och lampa
  (ctx, rx, fy) => {
    for (const x of [rx + 3, rx + 29]) {
      R(ctx, x, fy - 38, 24, 38, '#4a3a28'); R(ctx, x + 1, fy - 37, 22, 36, '#2a2016');
      for (let r = 0; r < 4; r++) {
        const sy = fy - 37 + r * 9;
        R(ctx, x + 1, sy + 8, 22, 1, '#8a6a42');
        for (let k = 0; k < 4; k++) { R(ctx, x + 2 + k * 5, sy + 1, 4, 7, ['#c8a470', '#b89460', '#d8b480', '#a88450'][(k + r) % 4]); R(ctx, x + 3 + k * 5, sy + 3, 2, 2, '#f4f0e4'); }
      }
    }
    R(ctx, rx + 26, fy - 41, 1, 40, '#aab4c8'); R(ctx, rx + 24, fy - 40, 6, 1, '#6a7488');
    R(ctx, rx + 27, fy - 34, 3, 1, '#aab4c8'); R(ctx, rx + 27, fy - 24, 3, 1, '#aab4c8'); R(ctx, rx + 27, fy - 14, 3, 1, '#aab4c8');
    F.shadow(ctx, rx + 3, fy, 24); F.floorLamp(ctx, rx + 54, fy, 24, GOLD.lt);
  },
  // 6 vinbar: vinställ, högt bord med pallar
  (ctx, rx, fy) => {
    R(ctx, rx + 2, fy - 44, 52, 30, '#2e1018');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
      const x = rx + 4 + c * 5 + (r % 2 ? 2 : 0); const y = fy - 42 + r * 7;
      if (x > rx + 50) continue;
      R(ctx, x, y, 4, 4, '#1a0a10'); R(ctx, x + 1, y + 1, 2, 2, ['#3a6a3a', '#8a2a3a', '#3a3a5a'][(r + c) % 3]); R(ctx, x + 1, y + 1, 1, 1, '#ffffff');
    }
    R(ctx, rx + 2, fy - 44, 52, 1, GOLD.md); R(ctx, rx + 2, fy - 14, 52, 1, GOLD.md);
    F.shadow(ctx, rx + 6, fy, 20, 0.3);
    R(ctx, rx + 15, fy - 15, 1, 14, GOLD.md); R(ctx, rx + 10, fy - 2, 11, 1, GOLD.dk);
    R(ctx, rx + 6, fy - 18, 20, 3, '#0e1018'); R(ctx, rx + 6, fy - 18, 20, 1, '#6a769a'); R(ctx, rx + 6, fy - 16, 20, 1, GOLD.dk);
    R(ctx, rx + 10, fy - 25, 1, 7, '#e8f0ff'); R(ctx, rx + 9, fy - 27, 3, 2, '#c8305a'); R(ctx, rx + 20, fy - 25, 1, 7, '#e8f0ff'); R(ctx, rx + 19, fy - 27, 3, 2, '#e8d070');
    for (const x of [rx + 31, rx + 44]) { R(ctx, x + 2, fy - 10, 1, 9, GOLD.md); R(ctx, x, fy - 13, 6, 3, '#6a1830'); R(ctx, x, fy - 13, 6, 1, '#c85a7a'); R(ctx, x, fy - 1, 6, 1, GOLD.dk); }
  },
  // 7 spelhall: tre arkadmaskiner med guldmarkis och neongolv
  (ctx, rx, fy) => {
    [[rx + 3, NEON.magenta, '#5cf2a0', '#ffe27a'], [rx + 21, NEON.cyan, '#ff6a6a', '#c8faff'], [rx + 39, GOLD.lt, '#5cf2a0', '#ff6a6a']].forEach(([x, mq, p1, p2]) => {
      R(ctx, x, fy - 32, 14, 32, '#14172c'); R(ctx, x, fy - 32, 14, 1, '#3a4262'); R(ctx, x, fy - 32, 14, 5, mq);
      R(ctx, x + 1, fy - 31, 12, 1, 'rgba(255,255,255,0.5)'); R(ctx, x + 2, fy - 25, 10, 9, '#0a1a2c');
      R(ctx, x + 3, fy - 23, 2, 2, p1); R(ctx, x + 7, fy - 20, 2, 2, p2); R(ctx, x + 5, fy - 18, 4, 1, p1);
      R(ctx, x + 1, fy - 13, 12, 3, '#2a2f50'); R(ctx, x + 3, fy - 12, 1, 1, '#ff5a5a'); R(ctx, x + 6, fy - 12, 1, 1, GOLD.lt); R(ctx, x + 9, fy - 12, 1, 1, '#5cf2a0');
      R(ctx, x, fy - 33, 14, 1, GOLD.md); RA(ctx, x - 2, fy - 33, 18, 36, mq, 0.08);
    });
    R(ctx, rx + 2, fy - 2, 52, 1, NEON.magenta); R(ctx, rx + 2, fy - 1, 52, 1, NEON.cyan); RA(ctx, rx + 2, fy - 5, 52, 4, NEON.magenta, 0.1);
    V.neonText(ctx, 'PLAY', rx + 20, fy - 39, GOLD.hi, NEON.orange);
  },
  // 8 trädgård: palmer, ormbunkar, damm och bänk
  (ctx, rx, fy) => {
    for (let i = 0; i < 7; i++) RA(ctx, rx + 3 + i * 7, fy - 47, 3, 7, '#fff8c0', 0.08);
    R(ctx, rx + 2, fy - 47, 52, 1, '#9acaa0');
    V.palm(ctx, rx + 12, fy, 36, 2);
    V.palm(ctx, rx + 44, fy, 30, 1);
    V.plantFloor(ctx, rx + 22, fy, 16, 3, '#c8643a');
    R(ctx, rx + 24, fy - 3, 14, 2, '#4aa8e8'); R(ctx, rx + 24, fy - 3, 14, 1, '#9ad8ff'); R(ctx, rx + 23, fy - 2, 16, 2, MARBLE.md);
    V.plantHang(ctx, rx + 28, fy - 45, 3, 10, 5);
    V.plantSmall(ctx, rx + 3, fy, 2, '#d8d0c0');
  },
  // 9 auditorium: stor skärm och rader av röda stolar
  (ctx, rx, fy) => {
    R(ctx, rx + 3, fy - 40, 50, 22, GOLD.dk); R(ctx, rx + 4, fy - 39, 48, 20, '#0a0e1c');
    R(ctx, rx + 5, fy - 38, 46, 18, '#14305a'); R(ctx, rx + 5, fy - 38, 46, 4, '#2a5aa8');
    R(ctx, rx + 8, fy - 31, 20, 2, '#f4f6ff'); R(ctx, rx + 8, fy - 27, 28, 1, '#7cf2ff'); R(ctx, rx + 8, fy - 24, 16, 1, '#7cf2ff');
    blob(ctx, rx + 42, fy - 28, 5, 5, '#e8504a', '#ff8a7a', '#a82a2a'); R(ctx, rx + 40, fy - 31, 4, 4, '#f2c84a');
    RA(ctx, rx + 4, fy - 39, 48, 1, '#ffffff', 0.35);
    R(ctx, rx + 2, fy - 17, 52, 2, GOLD.md); R(ctx, rx + 2, fy - 17, 52, 1, GOLD.lt);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
      const x = rx + 3 + i * 9 + (r ? 4 : 0); const y = fy - 8 - r * 3;
      if (r && x > rx + 47) continue;
      const c = r ? '#6a1428' : '#8a1e3a';
      R(ctx, x, y - 8, 7, 9, c); R(ctx, x, y - 8, 7, 1, shade(c, 0.4)); R(ctx, x, y - 8, 1, 9, shade(c, 0.2)); R(ctx, x + 6, y - 7, 1, 8, shade(c, -0.3));
      R(ctx, x + 1, y - 9, 5, 1, GOLD.md);
    }
    R(ctx, rx + 2, fy - 1, 52, 1, '#2a0a14');
    [4, 38].forEach((hx, i) => { R(ctx, rx + hx + 2, fy - 17, 3, 4, ['#2a1a10', '#c8a070'][i % 2]); R(ctx, rx + hx + 2, fy - 18, 3, 1, ['#e8c898', '#2a1a10'][i % 2]); });
  },
  // 10 bibliotek: två bokhyllor, stege, läderfåtölj, globe
  (ctx, rx, fy) => {
    P.bookshelf(ctx, rx + 2, fy, 22, 43, 5);
    P.bookshelf(ctx, rx + 26, fy, 16, 43, 8);
    R(ctx, rx + 2, fy - 44, 40, 2, GOLD.md); R(ctx, rx + 2, fy - 44, 40, 1, GOLD.lt);
    R(ctx, rx + 24, fy - 44, 1, 44, GOLD.dk);
    R(ctx, rx + 44, fy - 40, 1, 40, '#8a6a42'); R(ctx, rx + 49, fy - 40, 1, 40, '#8a6a42');
    for (let y = fy - 38; y < fy - 2; y += 5) R(ctx, rx + 44, y, 6, 1, '#a8824f');
    F.shadow(ctx, rx + 44, fy, 8, 0.3);
    F.armchair(ctx, rx + 31, fy, '#7a4a2a');
    F.floorLamp(ctx, rx + 52, fy, 30, GOLD.lt);
    blob(ctx, rx + 28, fy - 8, 3, 3, '#3a78c8', '#7ab4f0', '#1a4a98'); R(ctx, rx + 28, fy - 5, 1, 4, GOLD.dk);
  },
  // 11 zenrum: bambu, bonsai, grusträdgård och pappershänglampa
  (ctx, rx, fy) => {
    for (const [x, h, c] of [[rx + 5, 40, '#6a9a4a'], [rx + 9, 34, '#7aaa5a'], [rx + 13, 38, '#5a8a3a']]) {
      R(ctx, x, fy - h, 2, h, c); R(ctx, x, fy - h, 1, h, shade(c, 0.3));
      for (let y = fy - h + 6; y < fy - 4; y += 8) R(ctx, x, y, 2, 1, shade(c, -0.35));
      blob(ctx, x + 1, fy - h, 3, 2, '#5a9a4a', '#9ad87a', '#3a6a2a');
    }
    R(ctx, rx + 3, fy - 3, 14, 3, '#4a4a40'); R(ctx, rx + 4, fy - 3, 12, 1, '#6a6a5a');
    R(ctx, rx + 22, fy - 3, 30, 3, '#d8d0b0'); for (let x = rx + 23; x < rx + 51; x += 3) R(ctx, x, fy - 2, 1, 1, '#b8b090');
    for (const [x, w] of [[rx + 30, 5], [rx + 40, 4], [rx + 46, 3]]) { R(ctx, x, fy - 5, w, 3, '#6a6a70'); R(ctx, x, fy - 5, w, 1, '#9a9aa4'); }
    R(ctx, rx + 21, fy - 12, 20, 2, '#2a2218'); R(ctx, rx + 22, fy - 10, 2, 10, '#2a2218'); R(ctx, rx + 38, fy - 10, 2, 10, '#2a2218');
    V.pot(ctx, rx + 27, fy - 12, 8, 3, '#3a3a50'); R(ctx, rx + 30, fy - 18, 2, 6, '#5a4028'); blob(ctx, rx + 31, fy - 20, 6, 3, '#3a8a4a', '#6ac86a', '#2a5a2a'); blob(ctx, rx + 27, fy - 17, 3, 2, '#3a8a4a', '#6ac86a', '#2a5a2a');
    R(ctx, rx + 40, fy - 47, 1, 12, '#3a3f4c'); blob(ctx, rx + 40, fy - 30, 5, 5, '#fff4d0', '#ffffff', '#e8c890'); RA(ctx, rx + 32, fy - 38, 17, 16, '#ffd890', 0.12);
  },
];
