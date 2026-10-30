import { shade } from '../core/util.js';
import { drawSprite, hasSprite } from './sprites.js';

// Fordon i profil, ritade mot höger (x = bakkant, y = marken under hjulen). dir=-1 speglar.
// Måtten är satta mot människorna (30 px höga): en bil är ca dubbelt så lång som en människa är hög.

const TYRE = '#14151d';
const ARCH = '#0d0e14';
const RIM = '#8d93a6';
const RIM_HI = '#dde2f0';
const GLASS = ['#e2f4ff', '#b4daf6', '#84b8e6'];
const CHROME = '#c4c9d6';
const DARK = '#2a2d3a';

const CARS = [
  // 80-tal: kantig halvkombi
  { L: 52, H: 17, belt: -10, bp: 23, wheels: [10, 41], cab: [[14, 33], [12, 35], [11, 36], [10, 37], [9, 38], [8, 39], [7, 40]], top: -17 },
  // 90-tal: rundare sedan
  { L: 56, H: 16, belt: -10, bp: 26, wheels: [11, 45], cab: [[17, 34], [14, 38], [12, 40], [10, 42], [9, 43], [8, 44]], top: -16 },
  // 2000-tal och framåt: sportig crossover
  { L: 60, H: 18, belt: -11, bp: 29, wheels: [12, 48], cab: [[18, 40], [15, 43], [13, 45], [11, 47], [10, 48], [9, 49], [7, 50]], top: -18 },
];

export function vehicleSize(c) {
  if (c.type === 'bus') return { w: 100, h: 28 };
  if (c.type === 'truck') return { w: 86, h: 29 };
  if (c.type === 'van') return { w: 62, h: 22 };
  const m = CARS[c.era] || CARS[1];
  return { w: m.L, h: m.H };
}

function makeR(ctx, x, y, d) {
  return (dx, dy, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(d > 0 ? x + dx : x - dx - w, y + dy, w, h);
  };
}

function wheel(R, cx, r, spin) {
  const D = r * 2;
  // däck med rundade hörn
  R(cx - r + 2, -D, D - 4, 1, TYRE);
  R(cx - r + 1, -D + 1, D - 2, 1, TYRE);
  R(cx - r, -D + 2, D, D - 4, TYRE);
  R(cx - r + 1, -2, D - 2, 1, TYRE);
  R(cx - r + 2, -1, D - 4, 1, TYRE);
  // fälg
  const hr = r - 2;
  R(cx - hr + 1, -r - hr + 1, hr * 2 - 2, hr * 2 - 2, RIM);
  R(cx - hr, -r - hr + 2, hr * 2, hr * 2 - 4, RIM);
  R(cx - 1, -r - 1, 2, 2, RIM_HI);
  // eker som snurrar
  const k = spin & 3;
  const sp = [[-hr + 1, -r, 1, 1], [0, -r - hr + 1, 1, 1], [hr - 2, -r, 1, 1], [0, -r + hr - 2, 1, 1]][k];
  R(cx + sp[0], sp[1], 1, 1, '#4a4f62');
  R(cx - sp[0] - 1, -r * 2 - sp[1], 1, 1, '#4a4f62');
}

function arch(R, cx, r) {
  R(cx - r - 1, -r * 2 - 1, r * 2 + 2, r * 2, ARCH);
  R(cx - r, -r * 2 - 2, r * 2, 1, ARCH);
}

function glassRows(R, rows, x0, x1, bpx) {
  // rows: [[dy, x0, x1]] rutorna, två rutor åt gången
  rows.forEach(([dy, a, b], i) => {
    const col = GLASS[Math.min(2, Math.floor((i / rows.length) * 3))];
    if (bpx != null) {
      R(a, dy, bpx - a, 1, col);
      R(bpx + 2, dy, b - bpx - 2, 1, col);
    } else {
      R(a, dy, b - a, 1, col);
    }
  });
  void x0; void x1;
}

function drawCar(R, c, spin) {
  const m = CARS[c.era] || CARS[1];
  const { L, belt, bp, wheels, cab, top } = m;
  const col = c.color;
  const hi = shade(col, 0.3);
  const lo = shade(col, -0.28);
  const lo2 = shade(col, -0.5);
  // skugga mot asfalten
  R(3, 0, L - 6, 1, 'rgba(0,0,0,0.30)');
  R(6, 1, L - 12, 1, 'rgba(0,0,0,0.14)');
  // underrede
  R(2, -4, L - 4, 3, ARCH);
  // kaross
  cab.forEach(([a, b], i) => R(a, top + i, b - a, 1, col));
  R(2, belt, L - 4, 1, col);
  R(1, belt + 1, L - 2, 1, col);
  R(0, belt + 2, L, -3 - (belt + 2), col);
  R(1, -3, L - 2, 1, lo2);
  // ljus/skugga
  R(cab[0][0] + 1, top, cab[0][1] - cab[0][0] - 2, 1, hi);
  R(3, belt, L - 6, 1, hi);
  R(0, -6, L, 1, lo);
  R(0, -5, L, 1, lo);
  R(1, -4, L - 2, 1, lo2);
  // dörrar
  R(bp + 1, belt + 1, 1, -5 - belt, lo);
  R(bp - 12, belt + 2, 1, -6 - belt - 1, lo);
  R(bp + 12, belt + 2, 1, -6 - belt - 1, lo);
  R(bp - 4, belt + 2, 3, 1, hi);
  R(bp + 4, belt + 2, 3, 1, hi);
  // rutor
  const rows = cab.slice(1).map(([a, b], i) => [top + 1 + i, a + 2, b - 2]);
  glassRows(R, rows, 0, L, bp);
  // förare
  R(bp + 5, top + 3, 3, 3, '#27324c');
  R(bp + 6, top + 6, 2, 1, '#27324c');
  // hjulhus + hjul
  for (const cx of wheels) {
    arch(R, cx, 4);
  }
  for (const cx of wheels) wheel(R, cx, 4, spin);
  // främre och bakre delar
  R(L - 2, -8, 2, 4, CHROME);
  R(L - 3, belt + 2, 3, 2, '#fff7cf');
  R(L - 3, belt + 3, 3, 1, '#ffe27a');
  R(0, -8, 2, 4, '#8d93a6');
  R(0, belt + 2, 2, 2, '#e8303a');
  if (c.era === 2) {
    R(0, belt + 1, 2, 1, '#ff6a72');
    R(L - 6, belt + 4, 5, 1, lo);
  }
  // glans i rutan
  R(cab[2][0] + 3, top + 2, 1, 1, '#ffffff');
  R(cab[2][0] + 4, top + 1, 1, 1, '#ffffff');
}

function drawVan(R, c, spin) {
  const L = 62;
  const col = c.color;
  const hi = shade(col, 0.28);
  const lo = shade(col, -0.28);
  R(3, 0, L - 6, 1, 'rgba(0,0,0,0.30)');
  R(6, 1, L - 12, 1, 'rgba(0,0,0,0.14)');
  R(2, -4, L - 4, 3, ARCH);
  // lastutrymme
  R(0, -22, 40, 18, col);
  R(1, -23, 38, 1, col);
  R(2, -23, 36, 1, hi);
  R(0, -22, 40, 1, hi);
  // hytt
  const cab = [[40, 44], [40, 46], [40, 48], [40, 50], [40, 52], [40, 54], [40, 55], [40, 56], [40, 57], [40, 58]];
  cab.forEach(([a, b], i) => R(a, -22 + i, b - a, 1, col));
  R(40, -12, 22, 8, col);
  R(41, -22, 2, 1, hi);
  // list längs sidan
  R(0, -12, 62, 1, hi);
  R(0, -6, 62, 2, lo);
  R(0, -5, 62, 1, shade(col, -0.45));
  R(0, -10, 40, 1, shade(col, -0.12));
  // bakdörrsfog
  R(1, -21, 1, 16, lo);
  R(20, -21, 1, 16, lo);
  // logga
  R(6, -19, 10, 4, '#ffffff');
  R(7, -18, 3, 2, col);
  R(11, -18, 4, 1, shade(col, -0.2));
  // sidoruta i hytten
  const rows = [];
  for (let i = 0; i < 8; i++) rows.push([-21 + i, 43, Math.min(57, 43 + 4 + i * 2)]);
  rows.forEach(([dy, a, b], i) => R(a, dy, b - a - 1, 1, GLASS[Math.min(2, Math.floor((i / 8) * 3))]));
  R(46, -19, 1, 1, '#fff');
  R(45, -20, 1, 1, '#fff');
  for (const cx of [11, 49]) arch(R, cx, 4);
  for (const cx of [11, 49]) wheel(R, cx, 4, spin);
  R(L - 3, -12, 3, 2, '#fff7cf');
  R(L - 2, -9, 2, 4, CHROME);
  R(0, -11, 2, 3, '#e8303a');
  R(0, -8, 2, 4, '#8d93a6');
}

// Studions egen lastbil (en hårdvaruorder levereras): produkten i loggan, 7x5 pixlar i produktens färg
const GLYPH = {
  console: [[0, 1, 7, 3, 'd'], [1, 2, 3, 1, 'l'], [5, 2, 1, 1, '#7ff0ff']],
  handheld: [[1, 0, 5, 5, 'd'], [2, 1, 3, 2, 'l'], [4, 4, 1, 1, '#ff6fae']],
  vr: [[0, 1, 7, 3, 'd'], [1, 2, 2, 1, '#7ff0ff'], [4, 2, 2, 1, '#7ff0ff'], [3, 0, 1, 1, 'l']],
  gpu: [[0, 0, 1, 5, '#8d93a6'], [1, 1, 6, 3, 'd'], [2, 2, 2, 1, 'l'], [5, 2, 1, 1, 'l']],
  cpu: [[1, 0, 5, 1, '#d8b25a'], [1, 1, 5, 3, 'd'], [2, 2, 3, 1, 'l'], [1, 4, 5, 1, '#d8b25a']],
  pc: [[2, 0, 3, 5, 'd'], [3, 1, 1, 2, 'l'], [3, 4, 1, 1, '#7ff0ff']],
  sound: [[0, 3, 7, 2, 'd'], [4, 0, 1, 3, 'l'], [2, 2, 3, 1, 'l']],
};
function brandLogo(R, type, col) {
  R(6, -25, 22, 7, '#ffffff');
  R(6, -19, 22, 1, '#d4d9e6');
  const d = shade(col, -0.35);
  const l = shade(col, 0.35);
  for (const [x, y, w, h, k] of GLYPH[type] || GLYPH.console) R(8 + x, -24 + y, w, h, k === 'd' ? d : k === 'l' ? l : k);
  R(17, -23, 9, 1, d);
  R(17, -21, 6, 1, shade(col, -0.1));
}

function drawTruck(R, c, spin) {
  const L = 86;
  const body = '#e9ecf4';
  const col = c.color;
  R(3, 0, L - 6, 1, 'rgba(0,0,0,0.30)');
  R(8, 1, L - 16, 1, 'rgba(0,0,0,0.14)');
  // chassi
  R(0, -7, L, 4, '#23252f');
  // lastbox
  R(0, -26, 58, 20, body);
  R(0, -26, 58, 1, '#ffffff');
  R(0, -8, 58, 2, '#c4c9d8');
  R(0, -7, 58, 1, '#a4abbd');
  for (let x = 14; x < 58; x += 14) R(x, -25, 1, 18, '#cfd4e2');
  // randning och logga
  R(0, -17, 58, 3, col);
  R(0, -17, 58, 1, shade(col, 0.25));
  if (c.brand) brandLogo(R, c.brand.type, col);
  else {
    R(7, -24, 18, 5, '#ffffff');
    R(9, -23, 5, 3, col);
    R(16, -23, 7, 1, '#9aa2b8');
    R(16, -21, 5, 1, '#9aa2b8');
  }
  // hytt
  const cab = [[62, 74], [60, 76], [60, 78], [60, 79], [60, 80], [60, 81], [60, 82]];
  cab.forEach(([a, b], i) => R(a, -22 + i, b - a, 1, col));
  R(60, -15, 26, 9, col);
  R(61, -15, 24, 1, shade(col, 0.28));
  R(60, -8, 26, 2, shade(col, -0.28));
  R(80, -13, 6, 4, shade(col, -0.18));
  // ruta
  for (let i = 0; i < 7; i++) {
    const g = GLASS[Math.min(2, Math.floor((i / 7) * 3))];
    R(63 + (i < 2 ? 0 : 0), -21 + i, 10 + Math.min(i, 4) * 2, 1, g);
  }
  R(64, -20, 1, 1, '#fff');
  R(65, -21, 1, 1, '#fff');
  R(71, -15, 8, 1, shade(col, -0.3));
  for (const cx of [13, 25, 70]) arch(R, cx, 5);
  for (const cx of [13, 25, 70]) wheel(R, cx, 5, spin);
  R(L - 3, -13, 3, 2, '#fff7cf');
  R(L - 3, -9, 3, 3, CHROME);
  R(0, -10, 2, 3, '#e8303a');
  R(57, -28, 3, 22, '#4a4f62');
  R(57, -28, 1, 22, '#6a7088');
  R(56, -29, 5, 1, '#8a90a8');
}

function drawBus(R, c, spin) {
  const L = 100;
  const col = '#f3c64a';
  const hi = '#ffe388';
  const lo = '#c89a20';
  R(4, 0, L - 8, 1, 'rgba(0,0,0,0.30)');
  R(10, 1, L - 20, 1, 'rgba(0,0,0,0.14)');
  R(2, -5, L - 4, 3, ARCH);
  // kaross
  R(0, -24, L - 2, 19, col);
  R(2, -25, L - 8, 1, col);
  R(4, -25, L - 12, 1, hi);
  R(L - 2, -21, 2, 16, col);
  R(L - 5, -25, 4, 1, col);
  R(0, -24, L - 2, 1, hi);
  R(0, -9, L, 1, lo);
  R(0, -8, L, 4, lo);
  R(0, -5, L, 1, shade(col, -0.45));
  // randning
  R(0, -12, L, 2, '#d8382e');
  R(0, -13, L, 1, '#ffffff');
  // sidofönster
  const seed = c.color.charCodeAt(1) || 0;
  for (let i = 0; i < 8; i++) {
    const x = 5 + i * 9;
    for (let r = 0; r < 8; r++) R(x, -21 + r, 8, 1, GLASS[Math.min(2, Math.floor((r / 8) * 3))]);
    R(x + 1, -20, 1, 1, '#fff');
    R(x + 2, -21, 1, 1, '#fff');
    // passagerare
    if ((i * 5 + seed) % 3 !== 0) {
      R(x + 3, -18, 3, 3, '#3a4668');
      R(x + 3, -15, 3, 1, '#2a3350');
    }
  }
  // dörrar fram
  for (let r = 0; r < 15; r++) R(80, -21 + r, 8, 1, GLASS[Math.min(2, Math.floor((r / 15) * 3))]);
  R(83, -21, 1, 15, lo);
  R(88, -21, 1, 15, lo);
  // vindruta
  for (let r = 0; r < 9; r++) R(90, -21 + r, 8 - Math.floor(r / 5), 1, GLASS[Math.min(2, Math.floor((r / 9) * 3))]);
  // linjeskylt
  R(90, -24, 8, 3, '#14151d');
  R(91, -23, 2, 1, '#ffb030');
  R(94, -23, 3, 1, '#ffb030');
  // aircondition på taket
  R(26, -27, 28, 2, '#d8dce8');
  R(26, -28, 28, 1, '#f4f6fc');
  for (const cx of [17, 77]) arch(R, cx, 5);
  for (const cx of [17, 77]) wheel(R, cx, 5, spin);
  R(L - 3, -10, 3, 3, '#fff7cf');
  R(0, -12, 2, 3, '#e8303a');
  R(L - 2, -7, 2, 3, CHROME);
}

export function drawVehicle(ctx, c, y) {
  // Sprite från PixelLab om den finns: 'veh.<typ>[.<epok>]', varianter väljs efter färgen
  const key = c.type === 'car' ? `veh.car.${c.era}` : `veh.${c.type}`;
  if (hasSprite(key) && drawSprite(ctx, key, Math.round(c.x), y, { dir: c.dir, variant: Math.abs(c.color.charCodeAt(1) + c.color.charCodeAt(3)) })) return;
  const x = Math.round(c.x);
  const R = makeR(ctx, x, y, c.dir);
  const spin = Math.floor(Math.abs(c.x) / 2.5);
  if (c.type === 'bus') drawBus(R, c, spin);
  else if (c.type === 'truck') drawTruck(R, c, spin);
  else if (c.type === 'van') drawVan(R, c, spin);
  else drawCar(R, c, spin);
  void DARK;
}
