import { WALLS } from './pal.js';
import { shade } from '../core/util.js';
import { drawText, textWidth, fitText } from './font.js';
import * as P from './props.js';
import { layoutV2, drawShellV2, hasV2 } from './rooms.js';

export const PITCH = 44;
export const INT_H = 40;
export const FOUND = 4;
export const WALL = 6;

const GEO = [
  { BW: 200, floors: 1, desks: 2, slots: 1, slotW: 74, roof: 'garage' },
  { BW: 300, floors: 1, desks: 5, slots: 2, slotW: 62, roof: 'shop' },
  { BW: 300, floors: 2, desks: 5, slots: 2, slotW: 62, roof: 'flat' },
  { BW: 300, floors: 3, desks: 5, slots: 2, slotW: 62, roof: 'terrace' },
  { BW: 340, floors: 4, desks: 6, slots: 2, slotW: 64, roof: 'modern' },
  { BW: 440, floors: 4, desks: 9, slots: 3, slotW: 58, roof: 'tower' },
];

// Layout: positioner för skrivbord, anläggningar och våningar.
export function makeLayout(tier) {
  if (hasV2(tier)) return tier === 3 ? tuneStations(layoutV2(tier)) : layoutV2(tier); // nivåer med rumssystemet (rooms.js): Studiohuset m.fl.
  const g = GEO[tier];
  const IW = g.BW - WALL * 2;
  const left = -IW / 2;
  const deskArea = IW - g.slots * g.slotW - 14;
  const sp = Math.min(48, Math.floor(deskArea / g.desks));
  const desks = [];
  const slots = [];
  for (let f = 0; f < g.floors; f++) {
    const fy = -FOUND - f * PITCH;
    for (let d = 0; d < g.desks; d++) desks.push({ x: left + 10 + d * sp, fy, floor: f, idx: desks.length, sp });
    for (let s = 0; s < g.slots; s++) slots.push({ x: left + IW - (g.slots - s) * g.slotW - 2, w: g.slotW - 4, fy, floor: f, idx: slots.length });
  }
  const roofH = { garage: 30, shop: 22, flat: 28, terrace: 34, modern: 40, tower: 64 }[g.roof];
  const H = FOUND + g.floors * PITCH + roofH;
  return { tier, ...g, IW, left, desks, slots, sp, roofH, H, W: g.BW + 40, topY: -(FOUND + g.floors * PITCH) };
}

// Stationer för beteendet (behavior.js): ger två personer som står vid samma möbel minst ~10 px mellan fötterna
// (rumsdefinitionerna placerar dem tätare, och då skulle de stå i varandra).
function tuneStations(L) {
  const SHIFT = { 'f0-lobby-0': 34, 'f0-lobby-1': 22, 'f0-lobby-2': 10, 'f1-meeting-3': 6, 'f1-kitchen-1': 49 }; // x relativt rummets vänsterkant
  for (const s of L.stations) {
    const k = SHIFT[s.id];
    const room = k !== undefined && L.rooms.find((r) => r.id === s.room);
    if (room) s.x = room.x0 + k;
  }
  return L;
}

const rect = (ctx, x, y, w, h, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

function seedRng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

// Ritar hela den statiska byggnaden. opts: { era, name, awards, games, fac:{id:{lvl,slot}}, tier }
export function drawShell(ctx, L, opts) {
  if (L.v2) return drawShellV2(ctx, L, opts);
  const { BW, IW, floors } = L;
  const pitch = L.pitch ?? PITCH;
  const intH = L.intH ?? INT_H;
  const rng = seedRng(1234 + L.tier * 77);
  const eraIdx = opts.era; // 0,1,2
  const hole = []; // fönsterhål
  // ── Grund ──
  rect(ctx, -BW / 2 - 2, -FOUND, BW + 4, FOUND, '#6c6a74');
  rect(ctx, -BW / 2 - 2, -FOUND, BW + 4, 1, '#9a98a4');
  // ── Våningar ──
  for (let f = 0; f < floors; f++) {
    const fy = -FOUND - f * pitch;
    const top = fy - intH;
    const wall = WALLS[(f + (L.tier > 3 ? 1 : 0)) % WALLS.length];
    // bakvägg
    rect(ctx, L.left, top, IW, intH, wall.a);
    for (let x = 0; x < IW; x += 10) rect(ctx, L.left + x, top, 1, intH - 12, wall.b);
    // lister
    rect(ctx, L.left, top, IW, 2, shade(wall.a, -0.22));
    rect(ctx, L.left, fy - 12, IW, 1, wall.trim);
    rect(ctx, L.left, fy - 11, IW, 11, wall.dado);
    for (let x = 0; x < IW; x += 7) rect(ctx, L.left + x, fy - 10, 1, 9, shade(wall.dado, -0.12));
    rect(ctx, L.left, fy - 2, IW, 2, shade(wall.dado, -0.3));
    // golv (planka) + bjälklag
    rect(ctx, L.left - WALL, fy, IW + WALL * 2, 4, '#8a6a4a');
    rect(ctx, L.left - WALL, fy, IW + WALL * 2, 1, '#b08a60');
    for (let x = 0; x < IW; x += 12) rect(ctx, L.left + ((x + f * 5) % IW), fy + 1, 1, 2, '#6a4a2a');
    rect(ctx, L.left - WALL, fy + 3, IW + WALL * 2, 1, '#4a3420');
    // yttre väggar
    const brick = L.tier <= 1 ? '#a8604a' : L.tier <= 3 ? '#8a5a4a' : '#5a6478';
    const brickHi = L.tier <= 1 ? '#c27a5e' : L.tier <= 3 ? '#a8705a' : '#7a869c';
    for (const sx of [-BW / 2, L.left + IW]) {
      rect(ctx, sx, top - 4, WALL, intH + 4, brick);
      for (let y = top; y < fy; y += 4) rect(ctx, sx, y, WALL, 1, brickHi);
      rect(ctx, sx + (sx < 0 ? 0 : WALL - 1), top - 4, 1, intH + 4, shade(brick, -0.3));
    }
    // fönster (hål) över varannat skrivbord
    const winY = top + 7;
    const winH = 17;
    L.desks.filter((d) => d.floor === f).forEach((d, i) => {
      if (i % 2 === 0) hole.push([d.x + 5, winY, 20, winH, f]);
    });
    // ceiling lamps
    const nLamps = Math.floor(IW / 56);
    for (let l = 0; l < nLamps; l++) P.ceilingLamp(ctx, Math.round(L.left + 28 + l * (IW / nLamps)), top + 2);
  }
  // ── Fönsterhål och ramar ──
  for (const [x, y, w, h] of hole) {
    ctx.clearRect(x, y, w, h);
  }
  for (const [x, y, w, h, f] of hole) {
    P.windowFrame(ctx, x, y, w, h, ['#e8504a', '#4a90e0', '#f2a63a', '#6cc86a', '#c860c8'][(f + (x >> 3)) % 5]);
  }
  // ── Möbler: inredning per våning ──
  for (let f = 0; f < floors; f++) {
    const fy = -FOUND - f * pitch;
    // affischer/klocka/whiteboard över varannat skrivbord (mellan fönstren)
    const nd = L.desks.filter((d) => d.floor === f);
    for (let i = 0; i < nd.length; i++) {
      const d = nd[i];
      if (i % 2 === 0) continue;
      const r = rng();
      const cx = d.x + 15;
      if (r < 0.34) P.posterArt(ctx, cx - 5, fy - 36, 10, 14, Math.floor(rng() * 4), ['#4a90e0', '#e8504a', '#6cc86a', '#c860c8'][i % 4], '#101830');
      else if (r < 0.62) P.clock(ctx, cx - 3, fy - 34);
      else P.whiteboard(ctx, cx - 10, fy - 37, 20, 13);
    }
    if (L.tier === 0) {
      // garage: pegboard + verktyg + hyllor
      rect(ctx, L.left + 90, fy - 36, 38, 22, '#b89a6a');
      for (let y = 0; y < 22; y += 4) for (let x = 0; x < 38; x += 4) rect(ctx, L.left + 91 + x, fy - 35 + y, 1, 1, '#8a6a42');
      rect(ctx, L.left + 94, fy - 33, 3, 12, '#9aa4b8'); rect(ctx, L.left + 94, fy - 33, 3, 3, '#e8504a');
      rect(ctx, L.left + 102, fy - 33, 8, 3, '#f2a63a'); rect(ctx, L.left + 104, fy - 30, 4, 9, '#7c5232');
      rect(ctx, L.left + 114, fy - 32, 8, 6, '#c8d0e0'); rect(ctx, L.left + 118, fy - 26, 2, 7, '#c8d0e0');
      // rullport
      for (let y = 0; y < 8; y += 2) { rect(ctx, L.left, fy - intH + 2 + y, IW, 2, y % 4 === 0 ? '#aeb4c4' : '#8a90a2'); }
      rect(ctx, L.left, fy - intH + 10, IW, 1, '#5a6070');
      P.bookshelf(ctx, L.left + 140 - 32 + 56, fy, 20, 26, 7);
    }
    // gemensamma tillägg
    if (f === 0 && L.tier >= 1) {
      P.plant(ctx, L.left + 1, fy, 1.4);
    }
    if (f > 0 || L.tier >= 2) {
      const d = nd[nd.length - 1];
      P.plant(ctx, d.x + d.sp - 8, fy, 1);
    }
    if (L.tier >= 3 && f % 2 === 1) P.filingCabinet(ctx, nd[1].x + 28, fy);
  }

  // ── Skrivbord + stolar ──
  for (const d of L.desks) {
    P.chair(ctx, d.x + 3, d.fy, ['#3a4a6a', '#6a3a4a', '#3a6a5a', '#5a4a7a'][d.idx % 4]);
    P.desk(ctx, d.x + 3, d.fy, eraIdx, d.idx % 4);
  }

  // ── Anläggningar ──
  for (const [id, f] of Object.entries(opts.fac || {})) {
    const slot = L.slots[f.slot];
    if (!slot) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(slot.x - 1, slot.fy - intH, slot.w + 2, intH);
    ctx.clip();
    const fn = { coffee: P.coffee, lab: P.labBench, qa: P.qaLab, training: P.trainingRoom, gameroom: P.gameRoom, marketing: P.marketingRoom, server: P.serverRoom }[id];
    if (fn) fn(ctx, slot.x + 3, slot.fy, f.lvl);
    ctx.restore();
  }
  // Tomma slots: lite förvaring
  const used = new Set(Object.values(opts.fac || {}).map((f) => f.slot));
  for (const s of L.slots) {
    if (used.has(s.idx)) continue;
    if (L.tier === 0) {
      rect(ctx, s.x + 6, s.fy - 14, 50, 14, '#6a4a2a');
      rect(ctx, s.x + 6, s.fy - 14, 50, 2, '#8a6a44');
      rect(ctx, s.x + 10, s.fy - 22, 14, 8, '#c8643a'); rect(ctx, s.x + 30, s.fy - 18, 10, 4, '#9aa4b8');
      rect(ctx, s.x + 48, s.fy - 28, 14, 14, '#6a7a9a');
      P.couch(ctx, s.x + 60 - 60, s.fy, '#4a6ab0');
    } else if (s.idx % 3 === 2) P.vending(ctx, s.x + 10, s.fy);
    else P.plant(ctx, s.x + 8, s.fy, 1.2);
  }
  // Pokaler + spelboxar på första våningen
  const f0 = L.desks.filter((d) => d.floor === 0);
  if ((opts.awards || opts.games.length) && L.tier >= 1) {
    const mid = f0[Math.min(f0.length - 1, 1)];
    P.trophyShelf(ctx, mid.x + 22, -FOUND, opts.awards, opts.games);
  } else if (L.tier === 0 && (opts.awards || opts.games.length)) {
    P.trophyShelf(ctx, L.left + 6, -FOUND, opts.awards, opts.games);
  }

  // ── Tak och fasad ──
  drawRoof(ctx, L, opts, rng);
  return hole;
}

function drawRoof(ctx, L, opts, rng) {
  const { BW } = L;
  const topY = L.topY;
  const name = (opts.name || 'STUDIO').toUpperCase();
  const half = BW / 2;
  const roof = L.roof;
  if (roof === 'garage') {
    // sadeltak
    const apex = 26;
    for (let i = 0; i < apex; i++) {
      const inset = Math.round((i / apex) * (half - 20));
      const y = topY - 4 - i;
      const c = i % 4 === 0 ? '#5a3a4a' : '#6e4a5a';
      rect(ctx, -half - 8 + inset, y, BW + 16 - inset * 2, 1, c);
    }
    rect(ctx, -half - 8, topY - 5, BW + 16, 2, '#3a2230');
    for (let i = 2; i < apex; i += 4) {
      const inset = Math.round((i / apex) * (half - 20));
      for (let x = -half - 8 + inset + 3; x < half + 8 - inset - 3; x += 8) rect(ctx, x + ((i >> 2) % 2) * 4, topY - 5 - i, 1, 2, '#4a2e3c');
    }
    // skylt
    const f = fitText(name, 96, 1);
    const w = Math.max(60, textWidth(f.text, f.scale) + 12);
    rect(ctx, -w / 2, topY - 20, w, 9, '#2a1a2a'); rect(ctx, -w / 2 + 1, topY - 19, w - 2, 7, '#f2d28a');
    drawText(ctx, f.text, Math.round(-textWidth(f.text, f.scale) / 2), topY - 18, '#3a2214');
    // skorsten
    rect(ctx, half - 40, topY - 24, 8, 16, '#8a4a3a'); rect(ctx, half - 41, topY - 26, 10, 3, '#6a3a2a');
  } else {
    const parapet = roof === 'tower' ? 8 : 5;
    const baseC = L.tier <= 1 ? '#7a4a3a' : L.tier <= 3 ? '#6a4a42' : '#3a4256';
    rect(ctx, -half - 3, topY - parapet, BW + 6, parapet, baseC);
    rect(ctx, -half - 3, topY - parapet, BW + 6, 2, shade(baseC, 0.3));
    rect(ctx, -half - 3, topY - 1, BW + 6, 1, shade(baseC, -0.3));
    // takutrustning
    if (roof === 'shop') {
      const f = fitText(name, 170, 2);
      const w = Math.max(70, textWidth(f.text, f.scale) + 16);
      rect(ctx, -w / 2, topY - 22, w, 17, '#1a1a2e'); rect(ctx, -w / 2 + 1, topY - 21, w - 2, 15, '#2a2f4c');
      drawText(ctx, f.text, Math.round(-textWidth(f.text, f.scale) / 2), topY - 18 + (f.scale === 1 ? 4 : 0), '#ffd66a', f.scale, '#6a4a1a');
      rect(ctx, -half + 10, topY - 12, 12, 7, '#aab0c0'); rect(ctx, -half + 12, topY - 14, 8, 2, '#d0d6e4'); // AC
    } else if (roof === 'flat') {
      rect(ctx, half - 60, topY - 22, 22, 17, '#8a92a8'); rect(ctx, half - 56, topY - 26, 14, 4, '#6a7488'); // vattentank
      rect(ctx, half - 58, topY - 5, 2, 5, '#4a5368'); rect(ctx, half - 42, topY - 5, 2, 5, '#4a5368');
      const f = fitText(name, 170, 2);
      const w = Math.max(60, textWidth(f.text, f.scale) + 14);
      rect(ctx, -w / 2 - 40, topY - 20, w, 15, '#10162a'); rect(ctx, -w / 2 - 39, topY - 19, w - 2, 13, '#1a2a4a');
      drawText(ctx, f.text, Math.round(-textWidth(f.text, f.scale) / 2 - 40), topY - 16 + (f.scale === 1 ? 2 : 0), '#7cf2ff', f.scale, '#0a3a4a');
    } else if (roof === 'terrace') {
      rect(ctx, -half + 20, topY - 18, 24, 13, '#8a9ab0'); rect(ctx, -half + 18, topY - 20, 28, 3, '#c8d0e0');
      P.plant(ctx, -half + 52, topY - 5 + 5, 1.4); P.plant(ctx, half - 40, topY - 5 + 5, 1.2);
      rect(ctx, half - 90, topY - 14, 20, 2, '#e8504a'); rect(ctx, half - 81, topY - 12, 2, 7, '#c8d0e0'); rect(ctx, half - 94, topY - 16, 28, 3, '#e8504a');
      const f = fitText(name, 200, 2);
      const w = Math.max(70, textWidth(f.text, f.scale) + 14);
      rect(ctx, -w / 2, topY - 30, w, 20, '#0a0e1c'); rect(ctx, -w / 2 + 1, topY - 29, w - 2, 18, '#16203a');
      drawText(ctx, f.text, Math.round(-textWidth(f.text, f.scale) / 2), topY - 24 + (f.scale === 1 ? 3 : 0), '#ff5c9d', f.scale, '#5a1a3a');
    } else if (roof === 'modern') {
      rect(ctx, -half + 30, topY - 34, 2, 30, '#8a92a8'); rect(ctx, -half + 26, topY - 34, 10, 1, '#e8504a'); // antenn
      rect(ctx, half - 70, topY - 14, 40, 9, '#3a4256'); rect(ctx, half - 68, topY - 22, 36, 8, 'rgba(160,214,255,.7)'); rect(ctx, half - 70, topY - 14, 40, 1, '#8a92a8');
      const f = fitText(name, 210, 3);
      const w = Math.max(80, textWidth(f.text, f.scale) + 16);
      rect(ctx, -w / 2 - 20, topY - 36, w, 28, '#0a0e1c'); rect(ctx, -w / 2 - 19, topY - 35, w - 2, 26, '#101a34');
      drawText(ctx, f.text, Math.round(-textWidth(f.text, f.scale) / 2 - 20), topY - 28 + (f.scale === 1 ? 6 : f.scale === 2 ? 3 : 0), '#4de1d0', f.scale, '#0a4a44');
    } else {
      // torn: glaskupol + spira + jättelogga
      rect(ctx, -60, topY - 28, 120, 20, 'rgba(160,214,255,.55)'); rect(ctx, -60, topY - 28, 120, 2, '#c8d0e0');
      for (let x = -60; x <= 60; x += 20) rect(ctx, x, topY - 28, 1, 20, '#c8d0e0');
      rect(ctx, -2, topY - 62, 4, 36, '#aab2c8'); rect(ctx, -3, topY - 62, 6, 3, '#e8504a');
      const f = fitText(name, 250, 3);
      const w = Math.max(110, textWidth(f.text, f.scale) + 20);
      rect(ctx, -w / 2, topY - 54, w, 22, '#0a0e1c'); rect(ctx, -w / 2 + 1, topY - 53, w - 2, 20, '#12183a');
      drawText(ctx, f.text, Math.round(-textWidth(f.text, f.scale) / 2), topY - 48 + (f.scale === 1 ? 4 : f.scale === 2 ? 2 : 0), '#ffd66a', f.scale, '#6a4a1a');
    }
  }
}

export const eraOf = (year) => (year < 1991 ? 0 : year < 2004 ? 1 : 2);

// Miniatyr av en byggnad (för UI). Returnerar dataURL.
const prevCache = new Map();
export function buildingPreview(tier, name, era, fac = {}, scale = 2) {
  const key = [tier, name, era, JSON.stringify(fac), scale].join('|');
  if (prevCache.has(key)) return prevCache.get(key);
  const L = makeLayout(tier);
  const w = L.W + 8;
  const h = L.H + 26;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#3a5aa8');
  sky.addColorStop(0.75, '#f0b08a');
  sky.addColorStop(1, '#ffd49a');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#4a4a5a';
  g.fillRect(0, h - 14, w, 14);
  g.fillStyle = '#6a6a7c';
  g.fillRect(0, h - 14, w, 2);
  const layer = document.createElement('canvas');
  layer.width = L.W + 40;
  layer.height = L.H + 40;
  const lg = layer.getContext('2d');
  lg.translate(layer.width / 2, layer.height);
  drawShell(lg, L, { era, name, awards: 0, games: [], fac });
  g.drawImage(layer, w / 2 - layer.width / 2, h - 14 - layer.height);
  const o = document.createElement('canvas');
  o.width = w * scale;
  o.height = h * scale;
  const og = o.getContext('2d');
  og.imageSmoothingEnabled = false;
  og.drawImage(c, 0, 0, o.width, o.height);
  const u = o.toDataURL();
  prevCache.set(key, u);
  return u;
}
