import { NEON, GRAPH } from './pal.js';
import { drawText, textWidth, fitText } from './font.js';
import * as V from './props2.js';
import * as F from './furniture.js';

const { R, RA, hash, blob } = V;

// Takträdgård och fasad för Studiohuset (v2): häckar, träd, ljusslingor, räcke, aggregat, loungestolar, skylt,
// samt entré, balkonger och murgröna längs fasadkanten.

// Ljusslingans lampor (delas av ritning, dynamik och ljus).
function stringPoints(topY, BW) {
  const h = BW / 2 - 4;
  const poles = [[-h, -34], [-96, -30], [96, -30], [h, -34]];
  const out = [];
  for (let s = 0; s < poles.length - 1; s++) {
    const [x0, y0] = poles[s];
    const [x1, y1] = poles[s + 1];
    const n = Math.max(3, Math.round((x1 - x0) / 9));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push({ x: Math.round(x0 + (x1 - x0) * t), y: Math.round(topY + y0 + (y1 - y0) * t + 7 * 4 * t * (1 - t)), s });
    }
  }
  return { poles, pts: out };
}

const BULB = ['#ffe27a', '#ff9a6a', '#ffd0f0', '#fff4c0'];

export function roofAnim(topY, BW) {
  const { pts } = stringPoints(topY, BW);
  return {
    bulbs: pts.map((p, i) => ({ x: p.x, y: p.y + 1, c: BULB[i % BULB.length], p: i * 1.9 })),
    neon: [],
  };
}

export function roofLights(topY, BW) {
  const L = [];
  L.push({ x: 0, y: topY - 18, r: 58, i: 0.6, c: [0.35, 0.85, 1], kind: 1, pri: 1 });
  L.push({ x: -140, y: topY - 24, r: 52, i: 0.38, c: [1, 0.85, 0.5], kind: 1, pri: 2 });
  L.push({ x: 140, y: topY - 24, r: 52, i: 0.38, c: [1, 0.85, 0.5], kind: 1, pri: 2 });
  L.push({ x: -190, y: topY - 10, r: 30, i: 0.3, c: [0.7, 0.4, 1], kind: 1, pri: 2 });
  void BW;
  return L;
}

function tree(ctx, x, deck, seed, h = 30) {
  // odlingslåda
  R(ctx, x - 8, deck - 7, 17, 7, '#3a3f56');
  R(ctx, x - 8, deck - 7, 17, 1, '#6a769a');
  R(ctx, x - 8, deck - 7, 1, 7, '#505a78');
  R(ctx, x + 8, deck - 6, 1, 6, '#1a1e2c');
  R(ctx, x - 7, deck - 7, 15, 2, '#4a3a2a');
  R(ctx, x - 1, deck - 7 - h * 0.45, 3, h * 0.45, '#6a4a2a');
  R(ctx, x - 1, deck - 7 - h * 0.45, 1, h * 0.45, '#8a6a3a');
  const cy = deck - 7 - h * 0.62;
  const g = [['#2a7440', '#46a458', '#7bd283'], ['#2c6a58', '#3aa07c', '#72d4a8']][seed % 2];
  blob(ctx, x, cy, 13, 10, g[1], g[2], g[0]);
  blob(ctx, x - 9, cy + 3, 7, 6, g[1], g[2], g[0]);
  blob(ctx, x + 9, cy + 2, 7, 6, g[1], g[2], g[0]);
  blob(ctx, x - 2, cy - 7, 8, 5, g[1], g[2], g[0]);
  for (let i = 0; i < 9; i++) {
    const px = x - 11 + Math.floor(hash(seed + i * 3) * 22);
    const py = cy - 7 + Math.floor(hash(seed + i * 5) * 15);
    R(ctx, px, py, 1, 1, i % 4 === 0 ? '#ff9ac8' : g[2]);
  }
}

function hedge(ctx, x, deck, w, seed) {
  R(ctx, x, deck - 5, w, 5, '#3a3f56');
  R(ctx, x, deck - 5, w, 1, '#6a769a');
  R(ctx, x, deck - 5, 1, 5, '#505a78');
  R(ctx, x + w - 1, deck - 4, 1, 4, '#1a1e2c');
  for (let i = 0; i < w - 2; i += 3) blob(ctx, x + 2 + i, deck - 9, 3, 4, '#3e9a52', '#7bd283', '#2a7440');
  R(ctx, x + 1, deck - 8, w - 2, 3, '#3e9a52');
  for (let i = 0; i < w; i += 2) R(ctx, x + i, deck - 13 + Math.floor(hash(seed + i) * 3), 2, 2, i % 6 ? '#49a85a' : '#7bd283');
  for (let i = 0; i < 4; i++) R(ctx, x + 3 + Math.floor(hash(seed + i * 7) * (w - 6)), deck - 12 + Math.floor(hash(seed + i) * 5), 1, 1, '#ff9ac8');
}

function logoMark(ctx, x, y) {
  // sexkantslogotyp 14×14, cyan kant och lila kärna
  const rows = [4, 8, 10, 12, 14, 14, 14, 14, 14, 12, 10, 8, 4];
  rows.forEach((w, i) => {
    R(ctx, x + 7 - w / 2, y + i, w, 1, NEON.cyan);
    if (w > 4) R(ctx, x + 8 - (w - 2) / 2, y + i, w - 2, 1, i < 6 ? NEON.purple : NEON.purpleLo);
  });
  R(ctx, x + 6, y + 3, 2, 7, '#ffffff');
  R(ctx, x + 4, y + 5, 6, 2, '#ffffff');
  RA(ctx, x - 2, y - 2, 18, 17, NEON.cyan, 0.12);
}

export function drawRoofGarden(ctx, L, opts) {
  const topY = L.topY;
  const half = L.BW / 2;
  const name = (opts.name || 'STUDIO').toUpperCase();
  const deck = topY;
  // trädäck (golvband som inomhus, så att föremålen står på något)
  R(ctx, -half + 2, deck - 3, L.BW - 4, 3, '#8a6a48');
  R(ctx, -half + 2, deck - 3, L.BW - 4, 1, '#b8946a');
  for (let x = -half + 10; x < half - 2; x += 14) R(ctx, x, deck - 2, 1, 2, '#6a4a2e');
  // bakre aggregat: vattentank och luftaggregat (längst bak, bakom häckarna)
  const tx = 126;
  R(ctx, tx + 2, deck - 6, 2, 6, '#4a5368');
  R(ctx, tx + 18, deck - 6, 2, 6, '#4a5368');
  R(ctx, tx, deck - 28, 22, 22, '#8a96ac');
  R(ctx, tx, deck - 28, 22, 1, '#c8d0e0');
  R(ctx, tx, deck - 28, 3, 22, '#aab4c8');
  R(ctx, tx + 19, deck - 27, 3, 21, '#5a6478');
  for (const yy of [-22, -15, -8]) R(ctx, tx, deck + yy, 22, 1, '#5a6478');
  R(ctx, tx + 8, deck - 31, 6, 3, '#6a7488');
  R(ctx, tx + 4, deck - 8, 14, 2, '#3a4256');
  for (let i = 0; i < 2; i++) {
    const ax = tx + 30 + i * 22;
    R(ctx, ax, deck - 13, 19, 13, '#d0d6e4');
    R(ctx, ax, deck - 13, 19, 1, '#ffffff');
    R(ctx, ax + 18, deck - 12, 1, 12, '#8a92a8');
    blob(ctx, ax + 6, deck - 7, 4, 4, '#3a4256', '#6a7488', '#1a1e2c');
    for (let k = -2; k <= 2; k += 2) R(ctx, ax + 6 + k, deck - 10, 1, 7, '#5a6478');
    for (let k = 0; k < 4; k++) R(ctx, ax + 12, deck - 11 + k * 3, 5, 1, '#9aa4b8');
    R(ctx, ax, deck - 1, 19, 1, '#6a7488');
  }
  R(ctx, tx + 78, deck - 24, 5, 24, '#8a92a8');
  R(ctx, tx + 77, deck - 26, 7, 3, '#aab4c8');
  // loungestolar (lila pod-fåtöljer) med bord
  F.podChair(ctx, -207, deck, '#8a5ae0');
  F.shadow(ctx, -190, deck, 9, 0.3);
  R(ctx, -190, deck - 9, 9, 1, '#8a96b8');
  R(ctx, -186, deck - 8, 1, 8, '#3a3f56');
  R(ctx, -188, deck - 1, 5, 1, '#3a3f56');
  R(ctx, -188, deck - 12, 3, 3, '#f4f4ff');
  R(ctx, -188, deck - 12, 3, 1, '#6b4229');
  R(ctx, -183, deck - 11, 2, 2, '#ffe27a');
  ctx.save();
  ctx.translate(-164, 0);
  ctx.scale(-1, 1);
  F.podChair(ctx, 0, deck, '#a46bff');
  ctx.restore();
  // häckar och träd
  hedge(ctx, -150, deck, 34, 3);
  tree(ctx, -105, deck, 1, 32);
  hedge(ctx, 52, deck, 36, 8);
  tree(ctx, 112, deck, 2, 28);
  hedge(ctx, 18, deck, 2, 1);
  // ljusslinga
  const { poles, pts } = stringPoints(topY, L.BW);
  for (const [px, py] of poles) {
    R(ctx, px, topY + py, 1, -py, '#5a6478');
    R(ctx, px - 1, topY + py - 1, 3, 1, '#8a92a8');
  }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (a.s !== b.s) continue;
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    for (let k = 0; k <= steps; k++) R(ctx, Math.round(a.x + ((b.x - a.x) * k) / steps), Math.round(a.y + ((b.y - a.y) * k) / steps), 1, 1, '#2a2f3c');
  }
  pts.forEach((p, i) => {
    R(ctx, p.x, p.y + 1, 1, 2, BULB[i % BULB.length]);
    RA(ctx, p.x - 1, p.y, 3, 4, BULB[i % BULB.length], 0.28);
  });
  // skylt på ben
  // långa namn delas på två rader i stor stil, annars en rad som får plats
  let lines = [name];
  let sc = fitText(name, 100, 2).scale;
  if (sc === 1) {
    let cut = -1;
    for (let i = 0; i < name.length; i++) if (name[i] === ' ' && (cut < 0 || Math.abs(i - name.length / 2) < Math.abs(cut - name.length / 2))) cut = i;
    if (cut > 0 && textWidth(name.slice(0, cut), 2) <= 100 && textWidth(name.slice(cut + 1), 2) <= 100) {
      lines = [name.slice(0, cut), name.slice(cut + 1)];
      sc = 2;
    } else lines = [fitText(name, 100, 1).text];
  } else lines = [fitText(name, 100, 2).text];
  const tw = Math.max(...lines.map((s) => textWidth(s, sc)));
  const sw = tw + 40;
  const sx = -Math.round(sw / 2);
  const SH = lines.length === 2 ? 33 : 27; // tvåradiga skyltar är högre
  const sy = deck - 40 - (SH - 27); // högre än räcket så att tvåradiga namn inte krockar med räcket
  R(ctx, sx + 8, sy + SH, 3, deck - sy - SH, '#2a2f3c');
  R(ctx, sx + sw - 11, sy + SH, 3, deck - sy - SH, '#2a2f3c');
  R(ctx, sx - 1, sy - 1, sw + 2, SH + 2, NEON.cyan);
  R(ctx, sx, sy, sw, SH, '#0a0e1c');
  R(ctx, sx + 1, sy + 1, sw - 2, SH - 2, '#101a34');
  R(ctx, sx + 1, sy + 1, sw - 2, 1, '#1e2c54');
  R(ctx, sx, sy + SH - 1, sw, 1, '#050810');
  logoMark(ctx, sx + 6, sy + 6);
  const tx0 = sx + 26;
  if (lines.length === 2) {
    lines.forEach((s, i) => {
      drawText(ctx, s, tx0, sy + 5 + i * 13, i ? '#7a2e66' : '#1a8aa8', sc, null);
      drawText(ctx, s, tx0, sy + 4 + i * 13, i ? '#ffd0f0' : '#e8fbff', sc);
    });
  } else {
    const ty = sy + 6 + (sc === 1 ? 3 : 0);
    drawText(ctx, lines[0], tx0, ty + 1, '#1a8aa8', sc);
    drawText(ctx, lines[0], tx0, ty, '#e8fbff', sc);
    R(ctx, tx0, sy + 19, tw, 1, NEON.magenta);
    RA(ctx, tx0 - 1, sy + 18, tw + 2, 3, NEON.magenta, 0.25);
  }
  RA(ctx, sx - 3, sy - 3, sw + 6, SH + 6, NEON.cyan, 0.1);
  // glasräcke längst fram
  const rl = -half + 2;
  const rr = half - 2;
  RA(ctx, rl, deck - 10, rr - rl, 9, '#bfe6ff', 0.06);
  R(ctx, rl, deck - 11, rr - rl, 1, '#c8d0e0');
  R(ctx, rl, deck - 12, rr - rl, 1, '#8a92a8');
  for (let x = rl; x <= rr; x += 26) {
    R(ctx, x, deck - 12, 1, 12, '#aab4c8');
    R(ctx, x, deck - 12, 1, 1, '#e0e8f4');
  }
  for (let x = rl + 6; x < rr; x += 13) R(ctx, x, deck - 9, 1, 5, 'rgba(255,255,255,0.35)');
  R(ctx, rl, deck - 1, rr - rl, 1, '#3a4256');
}

// Fasaden: entréportal, balkonger, murgröna och neonkanter.
export function drawFacade(ctx, L, opts) {
  const half = L.BW / 2;
  const { pitch, intH, topY } = L;
  const fyOf = (f) => -4 - f * pitch;
  // glasdörrar i vänsterkolumnen (entré + balkongdörrar)
  for (let f = 0; f < L.floors; f++) {
    const fy = fyOf(f);
    ctx.clearRect(-half, fy - 33, 6, 30);
    R(ctx, -half - 1, fy - 35, 8, 2, '#10131c');
    R(ctx, -half - 1, fy - 35, 8, 1, '#5a6684');
    RA(ctx, -half, fy - 33, 6, 30, '#9fd6ff', 0.14);
    R(ctx, -half, fy - 33, 1, 30, '#3a4256');
    R(ctx, -half, fy - 4, 6, 1, '#3a4256');
    RA(ctx, -half + 1, fy - 31, 1, 10, '#ffffff', 0.4);
    if (f > 0) {
      // balkong
      const bx = -half - 15;
      R(ctx, bx, fy, 16, 2, '#4a5470');
      R(ctx, bx, fy, 16, 1, '#8a96b8');
      R(ctx, bx + 1, fy + 2, 14, 1, GRAPH.ink);
      for (let x = bx + 2; x < bx + 15; x += 3) R(ctx, x, fy + 1, 1, 1, '#2a3042');
      R(ctx, bx, fy - 9, 1, 9, '#9aa4b8');
      R(ctx, bx, fy - 10, 15, 1, '#c8d0e0');
      R(ctx, bx, fy - 5, 15, 1, '#6a7488');
      for (let x = bx + 4; x < bx + 14; x += 4) R(ctx, x, fy - 9, 1, 8, '#7a849a');
      V.plantSmall(ctx, bx + 3, fy, f + 1, '#c8643a');
    }
  }
  // entrémarkis över dörren på markplan
  {
    const fy = fyOf(0);
    R(ctx, -half - 15, fy - 41, 22, 4, '#1a1e2c');
    R(ctx, -half - 15, fy - 41, 22, 1, '#5a6684');
    R(ctx, -half - 15, fy - 38, 22, 1, NEON.cyan);
    RA(ctx, -half - 15, fy - 37, 22, 3, NEON.cyan, 0.2);
    R(ctx, -half - 13, fy - 37, 1, 33, 'rgba(0,0,0,0)');
    // trappsteg och mattan
    R(ctx, -half - 15, fy, 16, 1, '#8a8a98');
    // entrélampa
    R(ctx, -half - 8, fy - 36, 4, 1, '#fff4c0');
  }
  // murgröna längs högerkanten och lite till vänster
  V.vine(ctx, half - 6, 10, topY - 2, -62, 11);
  V.vine(ctx, half - 20, 18, topY + 4, topY + 18, 5);
  V.vine(ctx, -half - 2, 5, topY - 2, topY + 40, 17);
  for (const f of [1, 2]) V.vine(ctx, half - 4, 6, fyOf(f) - 4, fyOf(f) + 14, 20 + f);
  // vertikal neonlist i vänsterkolumnen mellan dörrarna
  for (let f = 0; f < L.floors; f++) {
    const fy = fyOf(f);
    V.neonLineV(ctx, -half + 2, fy - pitch + 6, 8, NEON.cyan, NEON.cyanLo);
  }
  void intH;
  void opts;
}
