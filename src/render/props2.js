import { PAL, NEON } from './pal.js';
import { shade } from '../core/util.js';
import { drawText, textWidth } from './font.js';

// Dekor för Studiohuset (v2): växter, lampor, tavlor, skärmar, neon och fönster.
// Samma konvention som props.js: (ctx, x, fy, ...) där x = vänsterkant och fy = golvets y, om inget annat anges.
// Ljus kommer uppifrån vänster: högdagrar uppe/vänster, skuggor nere/höger.
export const R = (ctx, x, y, w, h, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};
export const RA = (ctx, x, y, w, h, c, a) => {
  ctx.globalAlpha = a;
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
};
export const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Skuggad ellips (blad, buskar, sittsäckar). hi/lo skapas om de saknas.
export function blob(ctx, cx, cy, rx, ry, c, hi = shade(c, 0.3), lo = shade(c, -0.3)) {
  const fill = (ox, oy, rx2, ry2, col) => {
    for (let y = -ry2; y <= ry2; y++) {
      const k = y / (ry2 + 0.6);
      const w = Math.round(rx2 * Math.sqrt(1 - k * k));
      R(ctx, cx + ox - w, cy + oy + y, w * 2 + 1, 1, col);
    }
  };
  fill(0, 0, rx, ry, lo);
  if (rx > 1) fill(-1, -1, Math.max(1, rx - 1), Math.max(1, ry - 1), c);
  if (rx > 3) fill(-1, -1, Math.round(rx * 0.55), Math.max(1, Math.round(ry * 0.5)), hi);
}

// Kruka (x = vänsterkant, fy = golv eller hyllkant).
export function pot(ctx, x, fy, w, h, c = '#2f3446') {
  R(ctx, x, fy - h, w, h, c);
  R(ctx, x, fy - h, w, 1, shade(c, 0.35));
  R(ctx, x, fy - h, 1, h, shade(c, 0.18));
  R(ctx, x + w - 1, fy - h + 1, 1, h - 1, shade(c, -0.3));
  R(ctx, x + 1, fy - 1, w - 2, 1, shade(c, -0.35));
  R(ctx, x + 1, fy - h + 1, w - 2, 1, '#3a2a22');
}

const GREENS = [['#2c7a40', '#49a85a', '#7bd283'], ['#2a7a62', '#3fae86', '#76dcae'], ['#4a7a2c', '#7aa84a', '#b0d870']];

// Stor krukväxt (gummiträd/monstera). h = bladkronans höjd över krukan.
export function plantFloor(ctx, x, fy, h = 24, seed = 1, potC = '#2f3446') {
  const g = GREENS[seed % GREENS.length];
  const ph = 7;
  pot(ctx, x, fy, 9, ph, potC);
  const cx = x + 4;
  R(ctx, cx, fy - ph - h + 4, 1, h - 3, '#5a6a3a');
  const n = 7 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const px = cx + Math.round((hash(seed * 13 + i) - 0.5) * 11);
    const py = fy - ph - 4 - Math.round(t * (h - 5)) + Math.round((hash(seed * 7 + i) - 0.5) * 3);
    blob(ctx, px, py, 3 + (i % 2), 2 + ((i + seed) % 2), g[1], g[2], g[0]);
  }
  blob(ctx, cx - 1, fy - ph - h + 1, 3, 2, g[1], g[2], g[0]);
}

// Liten krukväxt.
export function plantSmall(ctx, x, fy, seed = 1, potC = '#c8643a') {
  const g = GREENS[seed % GREENS.length];
  pot(ctx, x, fy, 5, 4, potC);
  R(ctx, x + 2, fy - 8, 1, 4, g[0]);
  blob(ctx, x + 1, fy - 8, 2, 2, g[1], g[2], g[0]);
  blob(ctx, x + 4, fy - 9, 2, 2, g[1], g[2], g[0]);
  blob(ctx, x + 2, fy - 11, 2, 2, g[1], g[2], g[0]);
}

// Hängväxt: snöre från taket (y0) och ranka som hänger ned len pixlar.
export function plantHang(ctx, x, y0, drop, len, seed = 1) {
  const g = GREENS[seed % GREENS.length];
  R(ctx, x + 3, y0, 1, drop, '#3a3f4c');
  pot(ctx, x, y0 + drop + 4, 7, 4, '#d8d0c0');
  blob(ctx, x + 3, y0 + drop + 1, 4, 2, g[1], g[2], g[0]);
  for (let v = 0; v < 4; v++) {
    const vx = x + 1 + v * 2;
    const l = Math.round(len * (0.5 + hash(seed + v * 3) * 0.5));
    R(ctx, vx, y0 + drop + 4, 1, l, g[0]);
    for (let k = 2; k < l; k += 3) R(ctx, vx + ((k >> 1) % 2 ? 1 : -1), y0 + drop + 4 + k, 2, 2, g[1 + (k % 2)]);
    R(ctx, vx - 1, y0 + drop + 4 + l - 1, 3, 2, g[2]);
  }
}

// Palm (kentia) med bågformade blad.
export function palm(ctx, x, fy, h = 36, seed = 1) {
  const g = GREENS[0];
  pot(ctx, x - 4, fy, 10, 8, '#3a3f56');
  const top = fy - 8 - h;
  R(ctx, x, top + 4, 2, h + 4, '#6a5a3a');
  R(ctx, x, top + 4, 1, h + 4, '#8a7a52');
  const fronds = [[-1, -0.35], [-1, 0.1], [-0.6, -0.8], [0, -1], [0.6, -0.8], [1, 0.1], [1, -0.35]];
  for (const [dx, dy] of fronds) {
    let px = x + 1;
    let py = top + 4;
    const len = 11 + Math.round(hash(seed + dx * 3 + dy * 5) * 3);
    for (let s = 0; s < len; s++) {
      const t = s / len;
      px += dx * (1 - t * 0.2);
      py += dy * (1 - t) + t * 0.9;
      R(ctx, Math.round(px), Math.round(py), 2, 1, s % 3 === 0 ? g[2] : g[1]);
      if (s % 2 === 0) R(ctx, Math.round(px), Math.round(py) + 1, 1, 1, g[0]);
    }
  }
}

// Pendellampa. kind: 'dome' | 'globe' | 'cone'. c = skärmfärg, glow = ljusfärg (rgb-sträng).
export function pendant(ctx, x, top, drop, kind = 'dome', c = '#2a2f3c', glow = '255,236,170') {
  R(ctx, x, top, 1, drop, '#1b1e2a');
  const y = top + drop;
  if (kind === 'globe') {
    blob(ctx, x, y + 3, 3, 3, '#fff1c8', '#ffffff', '#f0c870');
    RA(ctx, x - 5, y - 1, 11, 9, `rgb(${glow})`, 0.16);
  } else if (kind === 'cone') {
    R(ctx, x - 1, y, 3, 1, shade(c, 0.3));
    R(ctx, x - 3, y + 1, 7, 2, c);
    R(ctx, x - 5, y + 3, 11, 2, c);
    R(ctx, x - 5, y + 3, 1, 2, shade(c, 0.3));
    R(ctx, x - 4, y + 5, 9, 1, '#fff4c0');
    RA(ctx, x - 7, y + 5, 15, 5, `rgb(${glow})`, 0.2);
  } else {
    R(ctx, x - 1, y, 3, 1, shade(c, 0.3));
    R(ctx, x - 3, y + 1, 7, 1, c);
    R(ctx, x - 4, y + 2, 9, 2, c);
    R(ctx, x - 4, y + 2, 2, 1, shade(c, 0.35));
    R(ctx, x + 3, y + 3, 2, 1, shade(c, -0.3));
    R(ctx, x - 3, y + 4, 7, 1, '#fff4c0');
    RA(ctx, x - 6, y + 4, 13, 4, `rgb(${glow})`, 0.2);
  }
}

// Lampkägla (statisk glöd i rumsljusets färg) från (x, y) nedåt.
export function lightCone(ctx, x, y, h, w, rgb, a = 0.1) {
  for (let i = 0; i < h; i += 2) {
    const half = Math.round((w / 2) * (0.25 + (i / h) * 0.75));
    RA(ctx, x - half, y + i, half * 2 + 1, 2, `rgb(${rgb})`, a * (1 - i / h) + 0.012);
  }
}

// Neonskylt. Glöd bakom, kärna framför. Returnerar bredden.
export function neonText(ctx, text, x, y, color, glow, scale = 1) {
  const s = String(text);
  ctx.globalAlpha = 0.22;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) drawText(ctx, s, x + dx, y + dy, glow, scale);
  ctx.globalAlpha = 1;
  drawText(ctx, s, x, y + 1, shade(glow, -0.35), scale);
  drawText(ctx, s, x, y, color, scale);
  return textWidth(s, scale);
}

// Tunn neonlinje med glöd (vågrät).
export function neonLine(ctx, x, y, w, color, glow) {
  RA(ctx, x - 1, y - 2, w + 2, 5, glow, 0.14);
  RA(ctx, x, y - 1, w, 3, glow, 0.3);
  R(ctx, x, y, w, 1, color);
}
export function neonLineV(ctx, x, y, h, color, glow) {
  RA(ctx, x - 2, y - 1, 5, h + 2, glow, 0.14);
  RA(ctx, x - 1, y, 3, h, glow, 0.3);
  R(ctx, x, y, 1, h, color);
}

// Inramad bild. kind 0..5 = olika motiv.
export function frame(ctx, x, y, w, h, kind = 0, seed = 1, frameC = '#1d2030') {
  R(ctx, x, y, w, h, frameC);
  R(ctx, x, y, w, 1, shade(frameC, 0.35));
  R(ctx, x, y, 1, h, shade(frameC, 0.2));
  R(ctx, x + 1, y + 1, w - 2, h - 2, '#eee8d8');
  const ix = x + 2;
  const iy = y + 2;
  const iw = w - 4;
  const ih = h - 4;
  if (iw < 2 || ih < 2) return;
  const k = kind % 6;
  if (k === 0) { // landskap
    R(ctx, ix, iy, iw, ih, '#79b8e8');
    R(ctx, ix, iy + ih * 0.55, iw, ih * 0.45, '#3f8a56');
    for (let i = 0; i < iw; i++) R(ctx, ix + i, iy + Math.floor(ih * 0.55) - Math.round(Math.abs(Math.sin(i * 0.5 + seed)) * ih * 0.3), 1, 2, '#5a6a9a');
    R(ctx, ix + iw - 4, iy + 1, 2, 2, '#fff4a8');
  } else if (k === 1) { // abstrakt
    R(ctx, ix, iy, iw, ih, '#f2c84a');
    R(ctx, ix, iy, iw * 0.55, ih * 0.6, '#e8504a');
    R(ctx, ix + iw * 0.4, iy + ih * 0.35, iw * 0.6, ih * 0.65, '#3a64c8');
    R(ctx, ix + 1, iy + ih - 3, iw * 0.4, 2, '#1d2030');
  } else if (k === 2) { // porträtt-siluett
    R(ctx, ix, iy, iw, ih, '#c8604a');
    R(ctx, ix + iw / 2 - 2, iy + 2, 4, 4, '#1d2030');
    R(ctx, ix + iw / 2 - 3, iy + 6, 6, ih - 6, '#1d2030');
  } else if (k === 3) { // pixelkonst (ansikte)
    R(ctx, ix, iy, iw, ih, '#2a2060');
    R(ctx, ix + 1, iy + 1, iw - 2, ih - 2, '#46b86a');
    R(ctx, ix + 2, iy + 2, 2, 2, '#10142a');
    R(ctx, ix + iw - 4, iy + 2, 2, 2, '#10142a');
    R(ctx, ix + 2, iy + ih - 4, iw - 4, 1, '#10142a');
  } else if (k === 4) { // geometri
    R(ctx, ix, iy, iw, ih, '#14283a');
    R(ctx, ix + 1, iy + 1, iw - 2, 1, NEON.cyan);
    R(ctx, ix + 1, iy + ih - 2, iw - 2, 1, NEON.magenta);
    R(ctx, ix + iw / 2, iy + 1, 1, ih - 2, '#f4f4ff');
  } else { // text-affisch
    R(ctx, ix, iy, iw, ih, '#f4f0e4');
    R(ctx, ix + 1, iy + 1, iw - 2, 2, '#1d2030');
    for (let r = 4; r < ih - 1; r += 2) R(ctx, ix + 1, iy + r, iw - 2 - (r % 3), 1, '#9a948a');
  }
  R(ctx, x + w - 1, y + 1, 1, h - 1, shade(frameC, -0.3));
  R(ctx, x + 1, y + h - 1, w - 1, 1, shade(frameC, -0.3));
}

// Väggskärm. kind: 'chart' | 'code' | 'slides' | 'video' | 'map'.
export function wallScreen(ctx, x, y, w, h, kind = 'chart', seed = 1) {
  R(ctx, x, y, w, h, '#0c0e16');
  R(ctx, x, y, w, 1, '#3a4256');
  const ix = x + 1;
  const iy = y + 1;
  const iw = w - 2;
  const ih = h - 2;
  R(ctx, ix, iy, iw, ih, '#0e2236');
  if (kind === 'chart') {
    for (let i = 0; i < Math.floor(iw / 3); i++) {
      const bh = 2 + Math.round(hash(seed + i * 2.3) * (ih - 6));
      R(ctx, ix + 1 + i * 3, iy + ih - 1 - bh, 2, bh, i % 3 === 0 ? NEON.magenta : NEON.cyan);
    }
    R(ctx, ix, iy + ih - 1, iw, 1, '#3a5a7a');
    for (let i = 0; i < iw - 2; i++) R(ctx, ix + 1 + i, iy + 2 + Math.round(Math.abs(Math.sin(i * 0.3 + seed)) * (ih * 0.3)), 1, 1, '#ffe27a');
  } else if (kind === 'code') {
    for (let r = 0; r < Math.floor((ih - 1) / 2); r++) {
      let cx = ix + 1 + (hash(seed + r) < 0.4 ? 2 : 0);
      const cols = ['#7cf2ff', '#ff7ab8', '#ffe27a', '#8aff9a', '#c8d0e8'];
      let k = 0;
      while (cx < ix + iw - 2) {
        const len = 2 + Math.floor(hash(seed + r * 9 + k) * 6);
        R(ctx, cx, iy + 1 + r * 2, Math.min(len, ix + iw - 2 - cx), 1, cols[Math.floor(hash(seed + r * 5 + k * 3) * cols.length)]);
        cx += len + 1;
        k++;
        if (hash(seed + r * 3 + k) < 0.12) break;
      }
    }
  } else if (kind === 'slides') {
    R(ctx, ix, iy, iw, ih, '#f4f6ff');
    R(ctx, ix, iy, iw, 3, '#2a3a8a');
    R(ctx, ix + 2, iy + 1, Math.floor(iw * 0.4), 1, '#f4f6ff');
    for (let r = 0; r < 3; r++) R(ctx, ix + 3, iy + 5 + r * 3, Math.floor(iw * 0.35), 1, '#6a7494');
    const pcx = ix + iw - 8;
    const pcy = iy + Math.floor(ih / 2) + 1;
    blob(ctx, pcx, pcy, 4, 4, '#4a90e0', '#8ac0ff', '#2a60b0');
    R(ctx, pcx, pcy - 4, 5, 5, '#e8504a');
    R(ctx, pcx - 1, pcy + 1, 3, 3, '#f2c84a');
  } else if (kind === 'video') {
    R(ctx, ix, iy, iw, ih, '#3a1a6a');
    R(ctx, ix, iy + ih * 0.5, iw, ih * 0.5, '#e8504a');
    R(ctx, ix, iy + ih * 0.35, iw, ih * 0.2, '#ff9a4a');
    blob(ctx, ix + iw * 0.7, iy + ih * 0.35, 3, 3, '#ffe27a');
    R(ctx, ix + iw / 2 - 1, iy + ih / 2 - 2, 3, 5, '#f4f4ff');
    R(ctx, ix + iw / 2 + 2, iy + ih / 2 - 1, 1, 3, '#f4f4ff');
  } else { // karta
    R(ctx, ix, iy, iw, ih, '#12304a');
    for (let i = 0; i < 9; i++) R(ctx, ix + 2 + Math.floor(hash(seed + i) * (iw - 6)), iy + 2 + Math.floor(hash(seed + i * 4) * (ih - 5)), 2, 2, i % 2 ? NEON.green : NEON.cyan);
    R(ctx, ix, iy + Math.floor(ih / 2), iw, 1, '#1e4a6a');
    R(ctx, ix + Math.floor(iw / 2), iy, 1, ih, '#1e4a6a');
  }
  RA(ctx, ix, iy, iw, 1, '#ffffff', 0.25);
  RA(ctx, ix, iy, 1, ih, '#ffffff', 0.12);
}

// Vägghylla med småsaker. items: sträng med tecken: b=bok p=växt t=pokal c=kopp f=figur l=lampa
export function wallShelf(ctx, x, y, w, items = '', seed = 1) {
  R(ctx, x, y, w, 2, PAL.woodHi);
  R(ctx, x, y + 2, w, 1, PAL.woodLo);
  R(ctx, x + 2, y + 3, 1, 2, '#3a3f4c');
  R(ctx, x + w - 3, y + 3, 1, 2, '#3a3f4c');
  let cx = x + 2;
  const cols = ['#e8504a', '#4a90e0', '#f2c84a', '#6cc86a', '#c860c8', '#e8e8f0', '#3fb8a8'];
  for (let i = 0; i < items.length && cx < x + w - 3; i++) {
    const ch = items[i];
    if (ch === 'b') {
      const n = 2 + Math.floor(hash(seed + i) * 3);
      for (let k = 0; k < n; k++) {
        const bh = 4 + Math.floor(hash(seed + i * 5 + k) * 4);
        R(ctx, cx, y - bh, 2, bh, cols[Math.floor(hash(seed + i * 3 + k * 7) * cols.length)]);
        cx += 2;
      }
      cx += 1;
    } else if (ch === 'p') {
      plantSmall(ctx, cx, y, seed + i, '#d8d0c0');
      cx += 7;
    } else if (ch === 't') {
      R(ctx, cx, y - 5, 4, 3, '#f2c84a'); R(ctx, cx + 1, y - 2, 2, 1, '#d8a82a'); R(ctx, cx, y - 1, 4, 1, '#7a5a1a'); R(ctx, cx + 1, y - 6, 2, 1, '#fff2a0');
      cx += 6;
    } else if (ch === 'c') {
      R(ctx, cx, y - 3, 3, 3, '#f4f4ff'); R(ctx, cx + 3, y - 2, 1, 1, '#f4f4ff'); R(ctx, cx, y - 3, 3, 1, '#6b4229');
      cx += 5;
    } else if (ch === 'f') {
      R(ctx, cx, y - 5, 3, 5, NEON.purple); R(ctx, cx, y - 7, 3, 2, '#f6d6b8'); R(ctx, cx + 1, y - 6, 1, 1, '#1b1e2e');
      cx += 5;
    } else if (ch === 'l') {
      R(ctx, cx + 1, y - 4, 1, 4, PAL.metalLo); R(ctx, cx - 1, y - 7, 5, 3, '#ffd88a'); R(ctx, cx - 1, y - 7, 5, 1, '#fff2c0');
      cx += 6;
    }
  }
}

// Väggklocka (rund, 7 px).
export function wallClock(ctx, x, y, c = '#f4f4ff') {
  blob(ctx, x + 3, y + 3, 3, 3, c, '#ffffff', '#c8ccd8');
  R(ctx, x + 3, y + 1, 1, 3, '#222');
  R(ctx, x + 3, y + 3, 2, 1, '#222');
  R(ctx, x + 3, y - 1, 1, 1, '#1d2030');
}

// Fönster (efter att hålet gjorts). Ram + spröjs + gardin/persienn. kind: 'plain' | 'curtain' | 'blind' | 'tall'
export function windowV2(ctx, x, y, w, h, kind = 'plain', curtain = '#e8504a', frameC = '#2a3042') {
  R(ctx, x - 2, y - 2, w + 4, 2, frameC);
  R(ctx, x - 2, y - 2, w + 4, 1, shade(frameC, 0.4));
  R(ctx, x - 2, y + h, w + 4, 1, shade(frameC, 0.6));
  R(ctx, x - 3, y + h + 1, w + 6, 2, '#d8dce8');
  R(ctx, x - 3, y + h + 3, w + 6, 1, '#7a82a0');
  R(ctx, x - 2, y - 2, 2, h + 4, frameC);
  R(ctx, x + w, y - 2, 2, h + 4, shade(frameC, -0.25));
  R(ctx, x + Math.floor(w / 2), y, 1, h, frameC);
  if (h > 16) R(ctx, x, y + Math.floor(h * 0.62), w, 1, frameC);
  // glasreflex
  for (let i = 0; i < 3; i++) RA(ctx, x + 3 + i * 4, y + 2 + i, 1, Math.min(8, h - 4), '#ffffff', 0.18);
  if (kind === 'curtain') {
    R(ctx, x, y, 4, h - 1, curtain);
    R(ctx, x, y, 1, h - 1, shade(curtain, 0.3));
    R(ctx, x + 2, y, 1, h - 1, shade(curtain, -0.18));
    R(ctx, x + w - 4, y, 4, h - 1, curtain);
    R(ctx, x + w - 1, y, 1, h - 1, shade(curtain, -0.3));
    R(ctx, x + w - 3, y, 1, h - 1, shade(curtain, -0.18));
    R(ctx, x - 3, y - 3, w + 6, 1, PAL.metalLo);
  } else if (kind === 'blind') {
    for (let r = 0; r < 3; r++) {
      R(ctx, x, y + r * 2, w, 1, '#eceff6');
      R(ctx, x, y + r * 2 + 1, w, 1, '#a8afc4');
    }
  }
}

// Falsk skyline i ett fönster (halvtransparent siluett, anpassar sig till himmelen bakom).
export function skylineHint(ctx, x, y, w, h, seed = 1) {
  let cx = x;
  const base = y + h;
  while (cx < x + w) {
    const bw = 4 + Math.floor(hash(seed + cx) * 6);
    const bh = 3 + Math.floor(hash(seed * 3 + cx * 1.7) * Math.min(10, h * 0.55));
    const ww = Math.min(bw, x + w - cx);
    RA(ctx, cx, base - bh, ww, bh, '#2c3a68', 0.55);
    if (hash(seed + cx * 5) < 0.6 && ww > 3) RA(ctx, cx + 1, base - bh + 2, 1, 1, '#ffe8a0', 0.75);
    if (hash(seed + cx * 9) < 0.4 && ww > 4) RA(ctx, cx + 3, base - bh + 4, 1, 1, '#8ae8ff', 0.7);
    cx += bw + (hash(seed + cx * 2) < 0.3 ? 1 : 0);
  }
}

// Murgröna: hänger ned längs en kant. x = vänsterkant, w = bredd, från y0 till y1.
export function vine(ctx, x, w, y0, y1, seed = 1) {
  const g = GREENS[0];
  for (let y = y0; y < y1; y += 1) {
    const t = (y - y0) / (y1 - y0);
    const dens = 0.9 - t * 0.55;
    for (let k = 0; k < w; k++) {
      if (hash(seed + y * 1.7 + k * 3.1) < dens * 0.62) R(ctx, x + k, y, 1, 1, g[(y + k) % 3 === 0 ? 2 : (y * 3 + k) % 4 === 0 ? 0 : 1]);
    }
  }
  for (let i = 0; i < 7; i++) {
    const vx = x + Math.floor(hash(seed + i * 9) * w);
    const vy = y0 + Math.floor(hash(seed + i * 4.4) * (y1 - y0) * 0.9);
    blob(ctx, vx, vy, 2, 2, g[1], g[2], g[0]);
    if (i % 3 === 0) R(ctx, vx + 1, vy - 1, 1, 1, '#ff8ac8');
  }
}
