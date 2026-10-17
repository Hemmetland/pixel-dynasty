import { PAL, NEON } from './pal.js';
import { shade } from '../core/util.js';
import { R, RA, blob, hash, plantSmall } from './props2.js';

// Möbler och apparater för Studiohuset (v2). Konvention: x = vänsterkant, fy = golvets y (föremål står på fy).

const DESK_TOP = ['#e2cfa8', '#ecdcb8', '#a88a62'];

// Kontorsstol i profil (samma yta som props.chair: sitsen vid x-1..x+8, personen sitter på x+2).
export function chair2(ctx, x, fy, color = '#3a4a6a') {
  shadow(ctx, x, fy, 9, 0.22);
  R(ctx, x - 2, fy - 22, 3, 13, color);
  R(ctx, x - 2, fy - 22, 1, 13, shade(color, 0.3));
  R(ctx, x - 2, fy - 22, 3, 1, shade(color, 0.3));
  R(ctx, x, fy - 14, 1, 5, shade(color, -0.25));
  R(ctx, x - 1, fy - 9, 10, 2, color);
  R(ctx, x - 1, fy - 9, 10, 1, shade(color, 0.3));
  R(ctx, x - 1, fy - 7, 10, 1, shade(color, -0.35));
  R(ctx, x + 3, fy - 6, 2, 4, PAL.metalLo);
  R(ctx, x, fy - 2, 8, 1, PAL.metalDk);
  R(ctx, x, fy - 1, 2, 1, '#14151c');
  R(ctx, x + 6, fy - 1, 2, 1, '#14151c');
}

// Skärminnehåll för andra skärmen (statiskt; animeras av rooms.dynamic).
export function screenContent(ctx, x, y, w, h, kind, seed = 1) {
  if (kind === 0) { // kod
    R(ctx, x, y, w, h, '#10243a');
    for (let r = 0; r < h; r += 2) {
      const l = 2 + Math.floor(hash(seed + r) * (w - 3));
      R(ctx, x + 1 + (r % 4 === 2 ? 1 : 0), y + r, l, 1, ['#7cf2ff', '#ff7ab8', '#ffe27a', '#8aff9a'][Math.floor(hash(seed * 3 + r) * 4)]);
    }
  } else if (kind === 1) { // diagram
    R(ctx, x, y, w, h, '#0e2a3a');
    for (let i = 0; i < w - 2; i += 2) R(ctx, x + 1 + i, y + h - 1 - Math.round(1 + hash(seed + i) * (h - 2)), 1, 1 + Math.round(hash(seed + i) * (h - 2)), '#4de1ff');
  } else if (kind === 2) { // design
    R(ctx, x, y, w, h, '#2a2450');
    R(ctx, x + 1, y + 1, 3, 2, '#ff7ab8');
    R(ctx, x + 4, y + 2, 2, 3, '#4de1ff');
    R(ctx, x + 1, y + 3, 2, 2, '#ffe27a');
  } else { // webb
    R(ctx, x, y, w, h, '#e8eef8');
    R(ctx, x, y, w, 1, '#4a64c8');
    R(ctx, x + 1, y + 2, w - 4, 1, '#8a94b0');
    R(ctx, x + 1, y + 4, 3, 2, '#e8504a');
  }
}

// Skrivbord med dubbla skärmar. Samma ytor som props.desk (era 2): profilskärm vid x+15 (animeras av Scene),
// andra skärmen vänd mot betraktaren vid x+19..x+27.
export function desk2(ctx, x, fy, variant = 0, seed = 1, era = 2) {
  shadow(ctx, x + 1, fy, 26, 0.25);
  const top = fy - 12;
  // under skivan: pc och lådor
  R(ctx, x + 2, top + 3, 2, 9, PAL.metalDk);
  R(ctx, x + 2, top + 3, 1, 9, PAL.metalLo);
  R(ctx, x + 6, top + 4, 6, 8, '#262b3a');
  R(ctx, x + 6, top + 4, 1, 8, '#3a4256');
  R(ctx, x + 9, top + 6, 1, 1, NEON.cyan);
  R(ctx, x + 8, top + 9, 3, 1, '#151824');
  R(ctx, x + 16, top + 3, 11, 9, '#b8a07a');
  R(ctx, x + 16, top + 3, 11, 1, '#d6bf96');
  R(ctx, x + 16, top + 7, 11, 1, '#8a7452');
  R(ctx, x + 16, top + 3, 1, 9, '#d0b88c');
  R(ctx, x + 26, top + 3, 1, 9, '#6a5438');
  R(ctx, x + 20, top + 5, 3, 1, PAL.metalHi);
  R(ctx, x + 20, top + 9, 3, 1, PAL.metalHi);
  // skiva
  R(ctx, x + 1, top, 26, 2, DESK_TOP[1]);
  R(ctx, x + 1, top, 26, 1, '#f6ead0');
  R(ctx, x + 1, top + 2, 26, 1, DESK_TOP[2]);
  // tangentbord + mus
  R(ctx, x + 3, top - 1, 8, 1, '#c8d0e0');
  R(ctx, x + 4, top - 2, 6, 1, '#8a92a8');
  R(ctx, x + 12, top - 1, 2, 1, '#e8e8f0');
  if (era === 2) {
    // skärm 1 (profil, animeras av Scene vid x+15)
    R(ctx, x + 16, top - 14, 2, 12, '#2a2f3c');
    R(ctx, x + 15, top - 13, 1, 10, '#101820');
    R(ctx, x + 17, top - 14, 1, 1, '#8a92a8');
    R(ctx, x + 16, top - 3, 2, 3, '#4a5064');
    R(ctx, x + 14, top - 1, 6, 1, '#3a4054');
    // skärm 2 (framifrån)
    R(ctx, x + 19, top - 13, 9, 8, '#171b26');
    R(ctx, x + 19, top - 13, 9, 1, '#4a5470');
    screenContent(ctx, x + 20, top - 12, 7, 6, (variant + seed) % 4, seed * 5 + variant);
    RA(ctx, x + 20, top - 12, 7, 1, '#ffffff', 0.22);
    R(ctx, x + 23, top - 5, 2, 3, '#4a5064');
    R(ctx, x + 21, top - 2, 6, 1, '#3a4054');
  } else if (era === 0) {
    // beige CRT i profil (som props.desk)
    R(ctx, x + 13, top - 12, 11, 10, PAL.beige);
    R(ctx, x + 13, top - 12, 11, 1, PAL.beigeHi);
    R(ctx, x + 20, top - 10, 5, 6, PAL.beigeLo);
    R(ctx, x + 12, top - 11, 2, 8, PAL.beigeLo);
    R(ctx, x + 11, top - 10, 1, 6, '#101820');
    R(ctx, x + 15, top - 2, 6, 2, PAL.beigeLo);
  } else {
    R(ctx, x + 13, top - 13, 11, 11, '#8a8f9c');
    R(ctx, x + 13, top - 13, 11, 1, '#b4bac8');
    R(ctx, x + 20, top - 11, 6, 7, '#6a7080');
    R(ctx, x + 12, top - 12, 2, 9, '#6a7080');
    R(ctx, x + 11, top - 11, 1, 7, '#101820');
    R(ctx, x + 15, top - 2, 6, 2, '#5a6070');
  }
  // tillbehör
  if (variant === 0) {
    R(ctx, x + 24, top - 4, 3, 3, '#f4f4ff'); R(ctx, x + 27, top - 3, 1, 1, '#f4f4ff'); R(ctx, x + 24, top - 4, 3, 1, '#6b4229');
  } else if (variant === 1) {
    plantSmall(ctx, x + 23, top - 1, seed, '#d8d0c0');
  } else if (variant === 2) {
    R(ctx, x + 22, top - 4, 2, 4, '#e8504a'); R(ctx, x + 22, top - 6, 2, 2, '#f6d6b8'); R(ctx, x + 22, top - 7, 2, 1, '#2a2f3c');
    R(ctx, x + 25, top - 3, 2, 3, '#4de1ff');
  } else if (variant === 3) {
    R(ctx, x + 21, top - 5, 5, 4, '#f4f0e4'); R(ctx, x + 21, top - 5, 5, 1, '#d8d4c4'); R(ctx, x + 22, top - 3, 3, 1, '#8a8470');
    R(ctx, x + 24, top - 7, 1, 2, '#6cc86a');
  } else {
    R(ctx, x + 22, top - 3, 5, 3, '#4a90e0'); R(ctx, x + 22, top - 3, 5, 1, '#8ac0ff'); R(ctx, x + 23, top - 5, 4, 2, '#e8504a');
  }
  // post-it på skärmen
  if (variant % 2 === 0) R(ctx, x + 19, top - 11, 1, 2, '#ffe27a');
}

// Soffa framifrån. Sitsen ligger på fy-9 så att personer i profil "sitter på" den.
export function sofa(ctx, x, fy, w = 38, c = '#3a9a5a', pillow = '#f2c84a') {
  shadow(ctx, x, fy, w);
  const hi = shade(c, 0.3);
  const lo = shade(c, -0.22);
  R(ctx, x + 2, fy - 21, w - 4, 12, c);
  R(ctx, x + 3, fy - 22, w - 6, 1, c);
  R(ctx, x + 2, fy - 21, w - 4, 1, hi);
  R(ctx, x + 3, fy - 22, w - 6, 1, hi);
  R(ctx, x + 3, fy - 17, w - 6, 1, lo);
  R(ctx, x + 4, fy - 12, w - 8, 6, shade(c, 0.12));
  R(ctx, x + 4, fy - 12, w - 8, 1, shade(c, 0.4));
  R(ctx, x + Math.floor(w / 2), fy - 12, 1, 6, lo);
  R(ctx, x, fy - 15, 5, 13, shade(c, -0.08));
  R(ctx, x, fy - 15, 5, 2, hi);
  R(ctx, x, fy - 15, 1, 13, hi);
  R(ctx, x + w - 5, fy - 15, 5, 13, shade(c, -0.08));
  R(ctx, x + w - 5, fy - 15, 5, 2, hi);
  R(ctx, x + w - 1, fy - 14, 1, 12, lo);
  R(ctx, x + 1, fy - 5, w - 2, 3, shade(c, -0.4));
  R(ctx, x + 2, fy - 2, 2, 2, '#1a1a22');
  R(ctx, x + w - 4, fy - 2, 2, 2, '#1a1a22');
  R(ctx, x + 6, fy - 17, 5, 6, pillow);
  R(ctx, x + 6, fy - 17, 5, 1, shade(pillow, 0.35));
  R(ctx, x + 10, fy - 12, 1, 1, shade(pillow, -0.3));
}

export function beanbag(ctx, x, fy, w = 15, c = '#ff8a4a') {
  shadow(ctx, x, fy, w, 0.3);
  const h = Math.round(w * 0.72);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 3, fy - h - 3, w + 6, h + 3);
  ctx.clip();
  // lutande klot: breddast nertill, nedtryckt upptill
  blob(ctx, x + Math.floor(w / 2), fy - Math.round(h * 0.45), Math.floor(w / 2), Math.round(h * 0.56), c);
  ctx.restore();
  R(ctx, x + Math.floor(w * 0.35), fy - h + 1, 1, Math.round(h * 0.55), shade(c, -0.25));
  R(ctx, x + Math.floor(w * 0.62), fy - h + 2, 1, Math.round(h * 0.5), shade(c, -0.22));
  R(ctx, x + Math.floor(w * 0.4), fy - h, Math.round(w * 0.25), 1, shade(c, 0.5));
}

export function floorLamp(ctx, x, fy, h = 38, c = '#ffd88a') {
  shadow(ctx, x - 2, fy, 5, 0.25);
  R(ctx, x - 2, fy - 1, 5, 1, '#1b1e2a');
  R(ctx, x - 1, fy - 2, 3, 1, '#2a2f3c');
  R(ctx, x, fy - h + 4, 1, h - 6, '#2a2f3c');
  R(ctx, x - 2, fy - h, 5, 1, shade(c, 0.5));
  R(ctx, x - 3, fy - h + 1, 7, 2, c);
  R(ctx, x - 4, fy - h + 3, 9, 3, shade(c, -0.08));
  R(ctx, x - 4, fy - h + 3, 2, 3, shade(c, 0.3));
  R(ctx, x + 2, fy - h + 3, 3, 3, shade(c, -0.25));
  R(ctx, x - 3, fy - h + 6, 7, 1, '#fff4c8');
  RA(ctx, x - 9, fy - h - 3, 19, 17, c, 0.1);
  RA(ctx, x - 6, fy - h, 13, 11, c, 0.1);
}

export function rug(ctx, x, fy, w, c1 = '#8a3a4a', c2 = '#e8a05a') {
  R(ctx, x, fy - 2, w, 2, c1);
  R(ctx, x + 1, fy - 2, w - 2, 1, c2);
  for (let i = 3; i < w - 3; i += 5) R(ctx, x + i, fy - 1, 2, 1, c2);
}

export function fridge(ctx, x, fy, c = '#c8d4dc') {
  shadow(ctx, x, fy, 14);
  R(ctx, x, fy - 35, 14, 35, c);
  R(ctx, x, fy - 35, 14, 1, '#f0f6fa');
  R(ctx, x, fy - 35, 1, 35, '#e8f0f6');
  R(ctx, x + 13, fy - 34, 1, 34, shade(c, -0.3));
  R(ctx, x, fy - 23, 14, 1, shade(c, -0.35));
  R(ctx, x + 10, fy - 33, 1, 8, '#5a6478');
  R(ctx, x + 10, fy - 20, 1, 10, '#5a6478');
  R(ctx, x + 1, fy - 1, 12, 1, shade(c, -0.4));
  // magneter och lappar
  R(ctx, x + 3, fy - 31, 3, 4, '#f4f0e4');
  R(ctx, x + 3, fy - 31, 3, 1, '#e8504a');
  R(ctx, x + 7, fy - 18, 2, 2, '#4a90e0');
  R(ctx, x + 3, fy - 15, 3, 3, '#ffe27a');
  R(ctx, x + 6, fy - 11, 2, 2, '#e86aa8');
}

// Köksbänk med överskåp. Underskåp 14 px, bänkskiva 2 px, stänkskydd av kakel till överskåp.
export function kitchenCounter(ctx, x, fy, w, c = '#2e8a86') {
  shadow(ctx, x, fy, w);
  // kakel
  R(ctx, x, fy - 32, w, 17, '#f4f1e8');
  for (let yy = fy - 32; yy < fy - 16; yy += 4) R(ctx, x, yy + 3, w, 1, '#d6d0be');
  for (let xx = 0; xx < w; xx += 5) R(ctx, x + xx, fy - 32, 1, 17, '#e0dac8');
  // underskåp
  R(ctx, x, fy - 14, w, 14, c);
  R(ctx, x, fy - 14, w, 1, shade(c, 0.3));
  R(ctx, x, fy - 14, 1, 14, shade(c, 0.18));
  R(ctx, x + w - 1, fy - 14, 1, 14, shade(c, -0.3));
  for (let xx = 0; xx < w - 4; xx += 12) {
    R(ctx, x + xx + 11, fy - 13, 1, 11, shade(c, -0.3));
    R(ctx, x + xx + 9, fy - 12, 1, 3, '#e8e8f0');
  }
  R(ctx, x, fy - 2, w, 2, '#1d2030');
  // bänkskiva
  R(ctx, x - 1, fy - 16, w + 2, 2, '#c8a070');
  R(ctx, x - 1, fy - 16, w + 2, 1, '#e4c492');
  // överskåp
  R(ctx, x + 1, fy - 45, w - 2, 12, '#f0e8d4');
  R(ctx, x + 1, fy - 45, w - 2, 1, '#ffffff');
  R(ctx, x + 1, fy - 34, w - 2, 1, '#b8ae98');
  for (let xx = 0; xx < w - 4; xx += 12) {
    R(ctx, x + xx + 12, fy - 44, 1, 10, '#c8bea8');
    R(ctx, x + xx + 10, fy - 38, 1, 3, '#8a8470');
  }
}

export function espresso(ctx, x, cy) {
  R(ctx, x, cy - 12, 12, 12, '#c83a34');
  R(ctx, x, cy - 12, 12, 1, '#ff8a7a');
  R(ctx, x, cy - 12, 1, 12, '#e8605a');
  R(ctx, x + 11, cy - 11, 1, 11, '#8a2420');
  R(ctx, x + 1, cy - 11, 10, 2, '#d8dee8');
  R(ctx, x + 2, cy - 8, 6, 3, '#151824');
  R(ctx, x + 3, cy - 8, 4, 1, '#5cf2a0');
  R(ctx, x + 8, cy - 8, 2, 2, '#ffe27a');
  R(ctx, x + 3, cy - 5, 6, 1, '#9aa4b8');
  R(ctx, x + 5, cy - 4, 2, 2, '#2a2f3c');
  R(ctx, x + 4, cy - 2, 4, 2, '#f4f4ff');
  R(ctx, x + 1, cy - 1, 10, 1, '#6a7488');
  R(ctx, x + 12, cy - 8, 1, 5, '#c8d0dc');
  R(ctx, x + 12, cy - 3, 2, 1, '#c8d0dc');
}

export function mug(ctx, x, y, c = '#f4f4ff') {
  R(ctx, x, y - 3, 3, 3, c);
  R(ctx, x + 3, y - 2, 1, 1, c);
  R(ctx, x, y - 3, 3, 1, '#6b4229');
}

export function laptop(ctx, x, y, dir = 1) {
  // y = bordsyta. Profil: bas + upprätt skärm i ena änden.
  R(ctx, x, y - 1, 8, 1, '#9aa4b8');
  R(ctx, x, y - 1, 8, 1, '#aab4c8');
  if (dir > 0) { R(ctx, x + 7, y - 6, 1, 5, '#2a2f3c'); R(ctx, x + 6, y - 5, 1, 3, '#7cf2ff'); }
  else { R(ctx, x, y - 6, 1, 5, '#2a2f3c'); R(ctx, x + 1, y - 5, 1, 3, '#7cf2ff'); }
}

export function meetingTable(ctx, x, fy, w = 44) {
  shadow(ctx, x + 2, fy, w - 4);
  R(ctx, x + 3, fy - 13, 2, 13, '#2a2f3c');
  R(ctx, x + 3, fy - 13, 1, 13, '#4a5470');
  R(ctx, x + w - 5, fy - 13, 2, 13, '#2a2f3c');
  R(ctx, x + 5, fy - 3, w - 10, 1, '#3a4256');
  R(ctx, x, fy - 15, w, 2, '#c89a64');
  R(ctx, x, fy - 15, w, 1, '#e8be88');
  R(ctx, x + 1, fy - 13, w - 2, 1, '#6a4a2c');
  R(ctx, x + w - 1, fy - 15, 1, 2, '#8a6a42');
}

// Reception: främre panel med LED-list och logoplatta.
export function receptionDesk(ctx, x, fy, w = 38) {
  shadow(ctx, x, fy, w);
  R(ctx, x, fy - 14, w, 14, '#26353e');
  R(ctx, x, fy - 14, w, 1, '#3e5460');
  R(ctx, x, fy - 14, 1, 14, '#3e5460');
  R(ctx, x + w - 1, fy - 14, 1, 14, '#141c22');
  for (let i = 3; i < w - 3; i += 4) R(ctx, x + i, fy - 12, 1, 9, '#2e4048');
  R(ctx, x - 1, fy - 17, w + 2, 3, '#ece4d4');
  R(ctx, x - 1, fy - 17, w + 2, 1, '#ffffff');
  R(ctx, x - 1, fy - 15, w + 2, 1, '#b8ae98');
  // logoplatta
  const lx = x + Math.floor(w / 2) - 6;
  R(ctx, lx, fy - 11, 12, 6, '#10161c');
  R(ctx, lx + 5, fy - 10, 2, 4, NEON.cyan);
  R(ctx, lx + 3, fy - 9, 6, 2, NEON.purple);
  R(ctx, lx + 5, fy - 9, 2, 2, '#ffffff');
  // LED-list
  R(ctx, x + 2, fy - 2, w - 4, 1, NEON.cyan);
  RA(ctx, x + 1, fy - 3, w - 2, 3, NEON.cyan, 0.2);
  // på bänken
  R(ctx, x + 4, fy - 24, 9, 7, '#1d2030');
  R(ctx, x + 5, fy - 23, 7, 5, '#38506a');
  R(ctx, x + 7, fy - 17, 3, 1, '#3a4054');
  R(ctx, x + w - 10, fy - 19, 4, 2, '#e8c050');
  R(ctx, x + w - 9, fy - 20, 2, 1, '#fff2a0');
  mug(ctx, x + 15, fy - 17, '#e8504a');
  R(ctx, x + 22, fy - 19, 5, 2, '#f4f0e4');
}

// Glasdörr (ramen; själva glaset är ett hål i bakväggen).
export function doorFrame(ctx, x, y, w, h) {
  const F = '#2a3042';
  R(ctx, x - 2, y - 2, w + 4, 2, F);
  R(ctx, x - 2, y - 2, w + 4, 1, '#5a6684');
  R(ctx, x - 2, y - 2, 2, h + 2, F);
  R(ctx, x + w, y - 2, 2, h + 2, '#1a1e2c');
  R(ctx, x + Math.floor(w / 2), y, 1, h, F);
  R(ctx, x, y + Math.floor(h * 0.45), w, 1, F);
  R(ctx, x, y + h - 4, w, 4, '#3a4256');
  R(ctx, x, y + h - 4, w, 1, '#6a7694');
  // handtag
  R(ctx, x + Math.floor(w / 2) - 3, y + Math.floor(h * 0.55), 1, 6, '#c8d0dc');
  R(ctx, x + Math.floor(w / 2) + 3, y + Math.floor(h * 0.55), 1, 6, '#c8d0dc');
  for (let i = 0; i < 3; i++) RA(ctx, x + 3 + i * 3, y + 3 + i * 2, 1, 7, '#ffffff', 0.2);
}

// Serverrack. Returnerar inget; lysdioderna ritas dynamiskt (se rackLeds).
export function rack(ctx, x, fy, w = 14, h = 38, seed = 1) {
  shadow(ctx, x, fy, w, 0.4);
  R(ctx, x, fy - h, w, h, '#151824');
  R(ctx, x, fy - h, w, 1, '#4a5470');
  R(ctx, x, fy - h, 1, h, '#323a50');
  R(ctx, x + w - 1, fy - h + 1, 1, h - 1, '#0a0c12');
  const units = Math.floor((h - 4) / 4);
  for (let u = 0; u < units; u++) {
    const y = fy - h + 2 + u * 4;
    R(ctx, x + 1, y, w - 2, 3, u % 3 === 1 ? '#2a3350' : '#1f2638');
    R(ctx, x + 1, y, w - 2, 1, '#323c5a');
    for (let k = 0; k < 3; k++) R(ctx, x + 2 + k * 2, y + 2, 1, 1, '#0c0e16');
    R(ctx, x + w - 4, y + 1, 1, 1, '#1f6a3a');
    R(ctx, x + w - 6, y + 1, 1, 1, '#6a4a1a');
  }
  R(ctx, x, fy - 1, w, 1, '#0a0c12');
  R(ctx, x + 1, fy - 2, 2, 1, '#2a2f3c');
}
// Positioner för rackets lysdioder (delas av ritning och dynamik): [{x, y, k}] där k = 0 grön, 1 gul.
export function rackLeds(x, fy, w = 14, h = 38) {
  const out = [];
  const units = Math.floor((h - 4) / 4);
  for (let u = 0; u < units; u++) {
    const y = fy - h + 2 + u * 4 + 1;
    out.push({ x: x + w - 4, y, k: 0 }, { x: x + w - 6, y, k: 1 });
  }
  return out;
}

export function cableTray(ctx, x, y, w) {
  R(ctx, x, y, w, 2, '#3a4256');
  R(ctx, x, y, w, 1, '#6a769a');
  R(ctx, x + 1, y - 1, w - 2, 1, '#ff9a4a');
  R(ctx, x + 3, y - 2, w - 8, 1, '#4de1ff');
  for (let i = 4; i < w - 4; i += 11) R(ctx, x + i, y + 2, 1, 3, '#1d2030');
}

export function acUnit(ctx, x, y, w = 18) {
  R(ctx, x, y, w, 6, '#e8ecf4');
  R(ctx, x, y, w, 1, '#ffffff');
  R(ctx, x + w - 1, y + 1, 1, 5, '#b0b8c8');
  R(ctx, x + 1, y + 4, w - 2, 1, '#9aa4b8');
  for (let i = 2; i < w - 2; i += 2) R(ctx, x + i, y + 5, 1, 1, '#7a849a');
  R(ctx, x + w - 4, y + 1, 1, 1, NEON.green);
}

// Stor whiteboard med anteckningar, diagram och klisterlappar.
export function whiteboardBig(ctx, x, y, w, h, seed = 1) {
  R(ctx, x - 1, y - 1, w + 2, h + 2, '#6a7488');
  R(ctx, x - 1, y - 1, w + 2, 1, '#aab4c8');
  R(ctx, x, y, w, h, '#f6f8ff');
  R(ctx, x, y + h - 2, w, 2, '#e6eaf6');
  R(ctx, x + w - 2, y, 2, h, '#e6eaf6');
  // rubrik och text
  R(ctx, x + 3, y + 3, Math.floor(w * 0.35), 1, '#2a3a8a');
  R(ctx, x + 3, y + 5, Math.floor(w * 0.22), 1, '#2a3a8a');
  // diagram (lådor + pilar)
  const bx = x + Math.floor(w * 0.5);
  for (let i = 0; i < 3; i++) {
    const px = bx + i * 9 - (i === 2 ? 1 : 0);
    const py = y + 3 + (i % 2) * 5;
    R(ctx, px, py, 7, 1, '#e8504a'); R(ctx, px, py + 4, 7, 1, '#e8504a'); R(ctx, px, py, 1, 5, '#e8504a'); R(ctx, px + 6, py, 1, 5, '#e8504a');
    if (i < 2) R(ctx, px + 7, py + 2, 2, 1, '#2a3a8a');
  }
  R(ctx, bx, y + 14, 18, 1, '#2a8a4a');
  R(ctx, bx + 18, y + 12, 1, 3, '#2a8a4a');
  // klisterlappar
  const cols = ['#ffe27a', '#ff9ac8', '#7cf2ff', '#8aff9a', '#ffb06a'];
  const rows = Math.max(1, Math.floor((h - 10) / 4));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < Math.floor(w * 0.4 / 4); c++) {
      if (hash(seed + r * 7 + c * 3) < 0.78) {
        const px = x + 3 + c * 4 + Math.floor(hash(seed + c) * 1);
        const py = y + 9 + r * 4;
        R(ctx, px, py, 3, 3, cols[Math.floor(hash(seed * 2 + r * 5 + c) * cols.length)]);
        R(ctx, px, py, 3, 1, 'rgba(255,255,255,0.45)');
        R(ctx, px, py + 2, 3, 1, 'rgba(0,0,0,0.12)');
      }
    }
  }
  R(ctx, x, y + h, w, 2, '#8a92a8');
  R(ctx, x + 3, y + h - 1, 3, 1, '#e8504a'); R(ctx, x + 8, y + h - 1, 3, 1, '#2a3a8a'); R(ctx, x + 13, y + h - 1, 3, 1, '#2a8a4a');
}

export function benchSeat(ctx, x, fy, w = 24, c = '#c86a4a') {
  shadow(ctx, x, fy, w);
  R(ctx, x, fy - 9, w, 3, c);
  R(ctx, x, fy - 9, w, 1, shade(c, 0.35));
  R(ctx, x, fy - 6, w, 1, shade(c, -0.35));
  R(ctx, x + 2, fy - 5, 2, 5, '#2a2f3c');
  R(ctx, x + w - 4, fy - 5, 2, 5, '#2a2f3c');
}

export function armchair(ctx, x, fy, c = '#e8a04a') {
  shadow(ctx, x, fy, 14);
  R(ctx, x + 1, fy - 17, 12, 9, c);
  R(ctx, x + 1, fy - 17, 12, 1, shade(c, 0.35));
  R(ctx, x + 3, fy - 10, 8, 4, shade(c, 0.12));
  R(ctx, x, fy - 12, 3, 9, shade(c, -0.1));
  R(ctx, x + 11, fy - 12, 3, 9, shade(c, -0.1));
  R(ctx, x, fy - 12, 3, 1, shade(c, 0.3));
  R(ctx, x + 11, fy - 12, 3, 1, shade(c, 0.3));
  R(ctx, x + 1, fy - 4, 12, 2, shade(c, -0.4));
  R(ctx, x + 2, fy - 2, 2, 2, '#1a1a22');
  R(ctx, x + 10, fy - 2, 2, 2, '#1a1a22');
}

// Lila podfåtölj (äggform) för takterrassen.
export function podChair(ctx, x, fy, c = '#8a5ae0') {
  RA(ctx, x - 1, fy - 1, 16, 1, '#000000', 0.3);
  R(ctx, x + 6, fy - 5, 3, 4, '#2a2f3c');
  R(ctx, x + 3, fy - 2, 9, 1, '#3a4256');
  R(ctx, x + 3, fy - 1, 9, 1, '#1a1e2a');
  // skal: ett "C" öppet åt höger (rundad rygg, armar upptill och nedtill), mjuk kudde inuti
  const top = fy - 21;
  for (let yy = 0; yy < 17; yy++) {
    const dy = (yy - 8) / 8.6;
    const s = Math.sqrt(Math.max(0, 1 - dy * dy));
    const x0 = Math.round(8 - 8 * s);
    const arm = yy <= 2 || yy >= 14;
    const x1 = arm ? 13 : x0 + 3;
    R(ctx, x + x0, top + yy, x1 - x0 + 1, 1, c);
    R(ctx, x + x0, top + yy, 1, 1, shade(c, 0.45));
    if (!arm) R(ctx, x + x0 + 1, top + yy, 1, 1, shade(c, 0.2));
    R(ctx, x + x1, top + yy, 1, 1, shade(c, -0.4));
    if (yy === 0 || yy === 16) R(ctx, x + x0, top + yy, x1 - x0 + 1, 1, yy === 0 ? shade(c, 0.45) : shade(c, -0.4));
    if (!arm) R(ctx, x + x1 + 1, top + yy, 2, 1, yy > 4 && yy < 12 ? shade(c, 0.5) : c);
  }
  // sits och ryggkudde
  R(ctx, x + 6, top + 12, 9, 3, shade(c, 0.55));
  R(ctx, x + 6, top + 12, 9, 1, '#ffffff');
  R(ctx, x + 6, top + 14, 9, 1, shade(c, 0.1));
}

// Mjuk kontaktskugga på golvbandet (ritas före föremålet).
export function shadow(ctx, x, fy, w, a = 0.3) {
  RA(ctx, x - 1, fy - 2, w + 3, 2, '#000000', a * 0.5);
  RA(ctx, x, fy - 1, w + 1, 1, '#000000', a);
}

export function copier(ctx, x, fy) {
  shadow(ctx, x, fy, 18);
  R(ctx, x, fy - 15, 18, 15, '#d4d9e4');
  R(ctx, x, fy - 15, 18, 1, '#f4f6fc');
  R(ctx, x, fy - 15, 1, 15, '#e8ecf4');
  R(ctx, x + 17, fy - 14, 1, 14, '#8a92a8');
  R(ctx, x, fy - 16, 18, 2, '#aab2c4');
  R(ctx, x + 1, fy - 17, 9, 1, '#c8d0e0');
  R(ctx, x + 11, fy - 13, 5, 3, '#10202a');
  R(ctx, x + 12, fy - 12, 3, 1, '#5cf2a0');
  R(ctx, x + 2, fy - 10, 8, 2, '#8a92a8');
  R(ctx, x + 2, fy - 7, 14, 1, '#aab2c4');
  R(ctx, x + 3, fy - 5, 12, 4, '#b8c0d0');
  R(ctx, x + 3, fy - 5, 12, 1, '#f4f4ff');
  R(ctx, x + 12, fy - 20, 5, 4, '#f4f4ff');
  R(ctx, x + 12, fy - 20, 5, 1, '#d8d4c4');
}

export function boxes(ctx, x, fy) {
  shadow(ctx, x, fy, 13);
  R(ctx, x, fy - 8, 13, 8, '#c49a62');
  R(ctx, x, fy - 8, 13, 1, '#dcb680');
  R(ctx, x + 12, fy - 7, 1, 7, '#8a6a3c');
  R(ctx, x + 6, fy - 8, 2, 8, '#e8dcc0');
  R(ctx, x + 2, fy - 14, 9, 6, '#d2a870');
  R(ctx, x + 2, fy - 14, 9, 1, '#e8c490');
  R(ctx, x + 10, fy - 13, 1, 5, '#8a6a3c');
  R(ctx, x + 5, fy - 14, 2, 6, '#e8dcc0');
}

export function waterCooler(ctx, x, fy) {
  shadow(ctx, x, fy, 9);
  R(ctx, x, fy - 12, 9, 12, '#dfe5ee');
  R(ctx, x, fy - 12, 9, 1, '#ffffff');
  R(ctx, x + 8, fy - 11, 1, 11, '#9aa4b8');
  R(ctx, x + 2, fy - 8, 2, 2, '#4a90e0');
  R(ctx, x + 5, fy - 8, 2, 2, '#e8504a');
  R(ctx, x + 2, fy - 4, 5, 1, '#9aa4b8');
  R(ctx, x + 1, fy - 22, 7, 10, 'rgba(140,200,255,0.75)');
  R(ctx, x + 1, fy - 22, 7, 1, '#cfeaff');
  R(ctx, x + 2, fy - 20, 1, 5, 'rgba(255,255,255,0.6)');
  R(ctx, x + 3, fy - 24, 3, 2, '#9ab8d8');
}

export function trashBin(ctx, x, fy, c = '#4a5470') {
  R(ctx, x, fy - 8, 6, 8, c);
  R(ctx, x, fy - 8, 6, 1, shade(c, 0.4));
  R(ctx, x, fy - 8, 1, 8, shade(c, 0.2));
  R(ctx, x + 5, fy - 7, 1, 7, shade(c, -0.3));
  R(ctx, x + 1, fy - 9, 4, 1, '#f4f0e4');
}

export function umbrellaStand(ctx, x, fy) {
  R(ctx, x, fy - 8, 6, 8, '#3a3f56');
  R(ctx, x, fy - 8, 6, 1, '#6a769a');
  R(ctx, x + 1, fy - 13, 1, 5, '#e8504a');
  R(ctx, x + 3, fy - 12, 1, 4, '#2a2f3c');
  R(ctx, x + 4, fy - 11, 1, 3, '#4a90e0');
}

// Väggakvarium (fiskarna ritas dynamiskt).
export function fishTank(ctx, x, y, w, h) {
  R(ctx, x - 1, y - 2, w + 2, h + 4, '#10141e');
  R(ctx, x - 1, y - 2, w + 2, 1, '#4a5470');
  R(ctx, x, y, w, h, '#1c6aa8');
  R(ctx, x, y, w, 2, '#4aa8e8');
  for (let i = 0; i < h; i += 2) RA(ctx, x, y + i, w, 1, '#0a2a5a', 0.04 * i);
  R(ctx, x, y + h - 3, w, 3, '#d8c890');
  R(ctx, x, y + h - 3, w, 1, '#f0e0a8');
  R(ctx, x + 4, y + h - 6, 4, 3, '#6a7488');
  R(ctx, x + 5, y + h - 7, 2, 1, '#8a96aa');
  for (const [px, ph] of [[w - 8, 6], [w - 5, 4], [10, 3]]) {
    R(ctx, x + px, y + h - 3 - ph, 1, ph, '#2a8a4a');
    R(ctx, x + px + 1, y + h - 2 - ph, 1, ph - 1, '#4ac86a');
  }
  RA(ctx, x + 1, y + 1, 2, h - 6, '#ffffff', 0.18);
  RA(ctx, x - 3, y - 4, w + 6, h + 8, '#4aa8e8', 0.09);
  R(ctx, x + 2, y - 3, w - 4, 1, '#c8d0dc');
}

export function kanban(ctx, x, y, w, h, seed = 1) {
  R(ctx, x - 1, y - 1, w + 2, h + 2, '#5a6478');
  R(ctx, x, y, w, h, '#f6f8ff');
  const cols = 3;
  const cw = Math.floor(w / cols);
  const nc = ['#ffe27a', '#ff9ac8', '#7cf2ff', '#8aff9a'];
  for (let c = 0; c < cols; c++) {
    if (c) R(ctx, x + c * cw, y + 1, 1, h - 2, '#b8c0d4');
    R(ctx, x + c * cw + 2, y + 2, cw - 4, 1, c === 0 ? '#e8504a' : c === 1 ? '#f2a63a' : '#2a8a4a');
    const n = 1 + Math.floor(hash(seed + c * 3) * 3) + (c === 0 ? 1 : 0);
    for (let k = 0; k < n && 5 + k * 4 + 3 < h; k++) {
      R(ctx, x + c * cw + 2 + (k % 2), y + 5 + k * 4, 3, 3, nc[Math.floor(hash(seed + c * 7 + k) * 4)]);
      R(ctx, x + c * cw + 2 + (k % 2), y + 5 + k * 4, 3, 1, 'rgba(255,255,255,0.4)');
    }
  }
}

export function monitorPanel(ctx, x, y, w, h) {
  R(ctx, x, y, w, h, '#0c0e16');
  R(ctx, x, y, w, 1, '#4a5470');
  R(ctx, x + 1, y + 1, w - 2, h - 2, '#0a2a1e');
  for (let i = 0; i < w - 3; i += 2) R(ctx, x + 2 + i, y + h - 2 - Math.round(1 + hash(i + 3) * (h - 5)), 1, 1 + Math.round(hash(i + 3) * (h - 5)), '#5cf2a0');
  R(ctx, x + 1, y + 1, w - 2, 1, '#14503a');
}

export function neonPad(ctx, x, y, c, glow) {
  // spelkontroll i neon, 13×7
  const px = [[2, 0, 9, 1], [1, 1, 11, 1], [0, 2, 13, 3], [1, 5, 3, 2], [9, 5, 3, 2], [4, 5, 5, 1]];
  RA(ctx, x - 2, y - 2, 17, 11, glow, 0.12);
  for (const [a, b, w, h] of px) R(ctx, x + a, y + b, w, h, glow);
  for (const [a, b, w] of px) R(ctx, x + a, y + b, w, 1, c);
  R(ctx, x + 2, y + 2, 1, 3, '#10141e'); R(ctx, x + 1, y + 3, 3, 1, '#10141e');
  R(ctx, x + 9, y + 2, 1, 1, '#10141e'); R(ctx, x + 10, y + 3, 1, 1, '#10141e'); R(ctx, x + 8, y + 3, 1, 1, '#10141e'); R(ctx, x + 9, y + 4, 1, 1, '#10141e');
}
