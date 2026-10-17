import { NEON } from './pal.js';
import { drawText, textWidth, fitText } from './font.js';
import { lang } from '../core/i18n.js';
import * as V from './props2.js';
import { roomName, V2 } from './rooms.js';
import { GOLD, MARBLE, NAVY, crownIcon } from './tier5-props.js';

const { R, RA, blob } = V;

// Dynasti-tornets krona och fasad: helikopterplatta med helikopter, glaspaviljong, jättelik namnskylt med guldkrona,
// kylaggregat, antennmast med röd varningslampa, entréportik, balkonger och glashiss på husets sida.

const SIGN = { w: 168, h: 32 }; // namnskyltens panel (fast storlek så att glödlamporna kan placeras utan att känna till namnet)
const PAD = { x0: -272, x1: -184 }; // helikopterplattan
const PAV = 128; // paviljongens halva bredd
const MAST_X = 246;
const CHILL = [146, 174, 202]; // kylaggregatens vänsterkanter
const FLAG_X = 262; // flaggstången på taket (höger)
const TICKER = { x: -84, w: 168 }; // börsticker i bjälklaget mellan markplanet och våning 2

const deckOf = (topY) => topY - 5;
const elevY = (f) => -4 - f * V2.pitch;
const T = (sv, en) => (lang === 'en' ? en : sv);

// ── Helikoptern: deterministisk ur tiden (period 72 s) ──
const HP = 72;
const ease = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => Math.max(0, Math.min(1, u));
// Läge längs flygvägen: { x (relativt husets mitt), alt (px över plattan), dir, rotor (0..1), mode }  eller null när den är borta.
export function heliState(t) {
  const s = ((t % HP) + HP) % HP;
  const cx = (PAD.x0 + PAD.x1) / 2;
  const away = 190;
  if (s < 30) return null;
  if (s < 38) { const u = ease(clamp01((s - 30) / 8)); return { x: cx - away * (1 - u), alt: 38 - 3 * Math.sin(u * Math.PI), dir: 1, rotor: 1, mode: 'in', tilt: 1 - u }; }
  if (s < 42) return { x: cx, alt: 38 * (1 - ease((s - 38) / 4)), dir: 1, rotor: 1, mode: 'down', tilt: 0 };
  if (s < 45) return { x: cx, alt: 0, dir: 1, rotor: 1 - (s - 42) / 3, mode: 'park', tilt: 0 };
  if (s < 57) return { x: cx, alt: 0, dir: 1, rotor: 0, mode: 'park', tilt: 0 };
  if (s < 60) return { x: cx, alt: 0, dir: 1, rotor: (s - 57) / 3, mode: 'park', tilt: 0 };
  if (s < 64) return { x: cx, alt: 38 * ease((s - 60) / 4), dir: 1, rotor: 1, mode: 'up', tilt: 0 };
  const u = (s - 64) / 8;
  return { x: cx - away * u * u * 1.4, alt: 38 + 8 * u, dir: -1, rotor: 1, mode: 'out', tilt: u };
}

// Ritar helikoptern. (x, y) = mitten på medarna, vänd åt höger (dir 1) eller vänster.
function heli(A, x, y, h, t, night) {
  const d = h.dir;
  const px = (dx, dy, w, ht, c) => {
    A.fillStyle = c;
    A.fillRect(Math.round(x + (d > 0 ? dx : -dx - w)), Math.round(y + dy), w, ht);
  };
  const lean = h.tilt > 0.2 ? 1 : 0; // stjärten lyfts något när den flyger
  const rot = h.rotor;
  // medar och stöttor
  px(-11, 0, 22, 1, '#2a2f3c');
  px(10, -1, 2, 1, '#2a2f3c');
  px(-12, -1, 1, 1, '#2a2f3c');
  px(-6, -3, 1, 3, '#4a5268');
  px(5, -3, 1, 3, '#4a5268');
  // stjärtbom (avsmalnande), fena och stabilisator
  px(-17, -10 - lean, 8, 3, '#2e3f7a');
  px(-17, -10 - lean, 8, 1, '#5a6cae');
  px(-24, -9 - lean, 8, 2, '#2e3f7a');
  px(-24, -9 - lean, 8, 1, '#5a6cae');
  px(-20, -8 - lean, 4, 1, GOLD.md);
  px(-25, -16 - lean, 3, 8, '#243260');
  px(-25, -16 - lean, 1, 8, '#4a5c9a');
  px(-24, -14 - lean, 1, 2, GOLD.md);
  px(-22, -10 - lean, 4, 1, '#1a2450');
  // stjärtrotor
  if (rot > 0.15) {
    const k = Math.floor(t * 24) % 2;
    px(-27, -15 - lean + k * 2, 1, 4, '#9aa4b8');
    A.globalAlpha = 0.3;
    px(-27, -16 - lean, 1, 7, '#c8d0e0');
    A.globalAlpha = 1;
  } else px(-27, -13 - lean, 1, 3, '#4a5268');
  // kropp: rundad, ljus undersida och guldlist
  px(-6, -12, 12, 1, '#4a5c9a');
  px(-9, -11, 17, 1, '#4a5c9a');
  px(-10, -10, 20, 6, '#2e3f7a');
  px(-10, -10, 20, 1, '#5a6cae');
  px(-10, -10, 1, 6, '#4a5c9a');
  px(9, -9, 1, 5, '#243260');
  px(-9, -4, 18, 1, '#243260');
  px(-8, -3, 16, 1, '#1a2450');
  px(-9, -4, 18, 1, '#e8e4d8');
  px(-8, -3, 16, 1, '#bcb8ac');
  px(-10, -7, 20, 1, GOLD.md);
  px(-10, -8, 20, 1, GOLD.lt);
  // sidoruta och kabinglas
  px(-5, -10, 6, 4, '#10162a');
  px(-4, -10, 3, 2, 'rgba(124,242,255,0.4)');
  px(2, -11, 8, 7, '#7cf2ff');
  px(2, -11, 8, 1, '#e8fcff');
  px(2, -11, 1, 7, '#b8f6ff');
  px(6, -11, 1, 7, '#2e3f7a');
  px(8, -8, 2, 4, '#3aa8c8');
  px(10, -9, 1, 4, '#3aa8c8');
  // motorhus, avgasrör och rotoraxel
  px(-6, -15, 10, 3, '#32427a');
  px(-6, -15, 10, 1, '#5a6cae');
  px(-8, -14, 2, 1, '#2a2f3c');
  px(-1, -18, 2, 3, '#2a2f3c');
  px(-3, -19, 6, 1, '#4a5268');
  // huvudrotor
  const ry = -20;
  if (rot < 0.08) {
    px(-19, ry + 1, 9, 1, '#2a2f3c'); px(-20, ry + 2, 2, 1, '#2a2f3c');
    px(10, ry + 1, 9, 1, '#2a2f3c'); px(18, ry + 2, 2, 1, '#2a2f3c');
  } else {
    const a = Math.cos(t * 28) * 0.5 + 0.5;
    const half = Math.round(22 * (0.55 + 0.45 * a));
    A.globalAlpha = 0.16 + 0.2 * rot;
    px(-22, ry - 1, 44, 3, '#a8b4c8');
    A.globalAlpha = 1;
    px(-half, ry, half * 2, 1, '#2a2f3c');
    px(-half, ry - 1, half * 2, 1, 'rgba(200,210,230,0.6)');
  }
  // lampor: röd bak, grön fram, blinkar; strålkastare på natten under inflygningen
  const blink = Math.floor(t * 2) % 2;
  if (night > 0.15) {
    A.globalAlpha = Math.min(1, night * 1.2);
    if (blink) px(-26, -17 - lean, 1, 1, '#ff3a3a');
    px(10, -6, 1, 1, '#5cf2a0');
    px(0, -2, 1, 1, '#ffffff');
    if (h.mode === 'down' || h.mode === 'in') {
      for (let i = 0; i < 18; i++) {
        A.fillStyle = `rgba(255,248,210,${0.14 * (1 - i / 18)})`;
        A.fillRect(Math.round(x + (d > 0 ? 6 : -6) - i * 0.5 - 2), Math.round(y + i + 1), 4 + i, 1);
      }
    }
    A.globalAlpha = 1;
  }
}

// ── Namnskyltens text: en rad i skala 2 (med underrubrik), två rader eller en rad i skala 1 ──
function signLines(name, maxW) {
  const one = fitText(name, maxW, 3);
  if (one.scale >= 2) return { lines: [one.text], sc: one.scale };
  let cut = -1;
  for (let i = 0; i < name.length; i++) if (name[i] === ' ' && (cut < 0 || Math.abs(i - name.length / 2) < Math.abs(cut - name.length / 2))) cut = i;
  if (cut > 0 && textWidth(name.slice(0, cut), 2) <= maxW && textWidth(name.slice(cut + 1), 2) <= maxW) return { lines: [name.slice(0, cut), name.slice(cut + 1)], sc: 2 };
  return { lines: [fitText(name, maxW, 1).text], sc: 1 };
}

// Kylaggregat: låda med lameller och fläkthus (fläkten animeras i dynamic).
function chiller(ctx, x, deck) {
  R(ctx, x + 2, deck - 2, 2, 2, '#3a4256');
  R(ctx, x + 22, deck - 2, 2, 2, '#3a4256');
  R(ctx, x, deck - 15, 26, 13, '#d4dae8');
  R(ctx, x, deck - 15, 26, 1, '#ffffff');
  R(ctx, x, deck - 15, 1, 13, '#eef2fa');
  R(ctx, x + 25, deck - 14, 1, 12, '#8a92a8');
  R(ctx, x, deck - 3, 26, 1, '#9aa4b8');
  for (let i = 0; i < 6; i++) R(ctx, x + 3 + i * 3, deck - 11, 2, 6, '#8a96b0');
  for (let i = 0; i < 6; i++) R(ctx, x + 3 + i * 3, deck - 11, 1, 6, '#aab4c8');
  R(ctx, x + 20, deck - 12, 4, 3, '#2a2f3c');
  R(ctx, x + 21, deck - 11, 2, 1, NEON.green);
  R(ctx, x + 3, deck - 19, 20, 4, '#9aa4b8');
  R(ctx, x + 3, deck - 19, 20, 1, '#c8d0e0');
  R(ctx, x + 4, deck - 18, 18, 2, '#3a4256');
  for (let i = 0; i < 6; i++) R(ctx, x + 5 + i * 3, deck - 18, 1, 2, '#6a7488');
}

function mast(ctx, mx, deck, h) {
  const steel = '#b8c2d6';
  for (let i = 0; i < h; i++) {
    const hw = Math.round(5 - 4 * (i / h));
    R(ctx, mx - hw, deck - i, 1, 1, steel);
    R(ctx, mx + hw, deck - i, 1, 1, '#6a7488');
    if (i % 7 === 3) R(ctx, mx - hw, deck - i, hw * 2 + 1, 1, '#8a96b0');
    if (i % 14 === 0) for (let k = 0; k < 7 && i + k < h; k++) {
      const q = Math.round(5 - 4 * ((i + k) / h));
      R(ctx, mx - q + Math.round((k / 6) * q * 2), deck - i - k, 1, 1, '#7a849a');
    }
  }
  R(ctx, mx - 6, deck - 2, 13, 2, '#4a5470');
  // plattformar och antenner
  R(ctx, mx - 4, deck - 30, 9, 1, '#d0d8e8');
  R(ctx, mx - 8, deck - 31, 4, 1, '#d0d8e8');
  R(ctx, mx + 4, deck - 44, 7, 1, '#d0d8e8');
  R(ctx, mx + 9, deck - 49, 1, 5, '#8a92a8');
  R(ctx, mx + 7, deck - 52, 5, 3, '#e8ecf4');
  R(ctx, mx + 7, deck - 52, 5, 1, '#ffffff');
  R(ctx, mx - 1, deck - h - 6, 1, 7, '#c8d0e0');
  R(ctx, mx, deck - h - 10, 1, 5, '#c8d0e0');
  R(ctx, mx - 1, deck - h - 1, 3, 2, '#ff3a3a');
}

export const crownRoof = {
  // Ljus: skylten, helikopterplattan, kronan, masten
  lights(topY) {
    const d = deckOf(topY);
    return [
      { x: 0, y: d - 30, r: 86, i: 0.85, c: [0.5, 0.88, 1], kind: 1, pri: 1 },
      { x: 0, y: d - 62, r: 34, i: 0.42, c: [1, 0.86, 0.45], kind: 1, pri: 2 },
      { x: (PAD.x0 + PAD.x1) / 2, y: d - 8, r: 44, i: 0.42, c: [1, 0.86, 0.45], kind: 1, pri: 2 },
      { x: -PAV + 4, y: d - 8, r: 36, i: 0.3, c: [0.4, 0.88, 1], kind: 1, pri: 2 },
      { x: PAV - 4, y: d - 8, r: 36, i: 0.3, c: [0.4, 0.88, 1], kind: 1, pri: 2 },
      { x: MAST_X, y: d - 76, r: 22, i: 0.5, c: [1, 0.2, 0.16], kind: 1, pri: 2 },
    ];
  },
  // Blinkande lampor: marquee runt skylten och plattans kantlampor
  anim(topY) {
    const d = deckOf(topY);
    const bulbs = [];
    const sy = d - 14 - SIGN.h;
    let n = 0;
    for (let x = -SIGN.w / 2 + 3; x <= SIGN.w / 2 - 3; x += 8) {
      bulbs.push({ x, y: sy, c: '#fff4c0', p: n * 0.9 });
      bulbs.push({ x, y: sy + SIGN.h - 1, c: '#fff4c0', p: n++ * 0.9 + 1.4 });
    }
    n = 0;
    for (let x = PAD.x0 + 4; x <= PAD.x1 - 3; x += 12) bulbs.push({ x, y: d - 11, c: '#ffd84a', p: n++ * 1.3 });
    return { bulbs, neon: [{ x: -SIGN.w / 2, y: sy, w: SIGN.w, h: SIGN.h }] };
  },
  steam: [{ x: CHILL[0] + 12, dy: -26 }, { x: CHILL[2] + 12, dy: -26 }],

  // ── Fasaden: kolonner, bjälklag, entré, balkonger, glashiss, namnskyltar ──
  facade(ctx, L, opts) {
    const half = L.BW / 2;
    const { pitch, intH, topY } = L;
    const fyOf = (f) => -V2.found - f * pitch;
    // kolonner: guldpelare med cyan neonlist (den holografiska 'bladen')
    for (const sx of [-half, half - 6]) {
      R(ctx, sx, topY, 6, -topY, GOLD.md);
      R(ctx, sx, topY, 1, -topY, GOLD.hi);
      R(ctx, sx + 1, topY, 1, -topY, GOLD.lt);
      R(ctx, sx + 4, topY, 1, -topY, GOLD.dk);
      R(ctx, sx + 5, topY, 1, -topY, GOLD.ink);
      for (let y = topY + 6; y < -4; y += 6) R(ctx, sx + 1, y, 4, 1, GOLD.dk);
      V.neonLineV(ctx, sx + (sx < 0 ? 2 : 3), topY + 8, -topY - 12, NEON.cyanHi, NEON.cyan);
    }
    // bjälklag: guldkant, marinblå kärna och cyan neon
    const sx0 = L.left - 9;
    const sw = L.IW + 18;
    for (let f = 0; f <= L.floors; f++) {
      const y = f === L.floors ? topY : fyOf(f);
      const sh = f === 0 ? V2.found : pitch - intH;
      R(ctx, sx0, y, sw, sh, NAVY.dk);
      R(ctx, sx0, y, sw, 1, GOLD.hi);
      R(ctx, sx0, y + 1, sw, 1, GOLD.md);
      R(ctx, sx0, y + sh - 1, sw, 1, GOLD.dk);
      if (f > 0) {
        R(ctx, sx0, y + 3, sw, 1, NEON.cyan);
        RA(ctx, sx0, y + 2, sw, 3, NEON.cyan, 0.18);
      } else R(ctx, sx0, y + 2, sw, 1, GOLD.md);
      for (let x = 24; x < sw; x += 48) R(ctx, sx0 + x, y + 2, 1, sh - 3, GOLD.dk);
    }
    // gesims ovanpå taket: marmor med guldlist och tandsnitt
    const cx0 = -half - 6;
    const cw = L.BW + 12;
    R(ctx, cx0, topY - 5, cw, 5, MARBLE.lt);
    R(ctx, cx0, topY - 5, cw, 1, MARBLE.hi);
    R(ctx, cx0, topY - 1, cw, 1, MARBLE.dk);
    R(ctx, cx0, topY - 3, cw, 1, GOLD.md);
    for (let x = cx0 + 1; x < cx0 + cw; x += 3) R(ctx, x, topY - 4, 1, 1, MARBLE.md);
    // skiljeväggar: guldkapsyler
    for (let f = 0; f < L.floors; f++) {
      const fy = fyOf(f);
      const fr = L.rooms.filter((q) => q.floor === f);
      for (let i = 1; i < fr.length; i++) {
        const x = fr[i].x0;
        R(ctx, x - 2, fy - intH + 3, 5, 2, GOLD.md);
        R(ctx, x - 2, fy - intH + 3, 5, 1, GOLD.lt);
        R(ctx, x - 2, fy - 3, 5, 2, GOLD.dk);
      }
    }
    // glasdörrar i vänsterkolumnen (entré och balkongdörrar) och balkonger
    for (let f = 0; f < L.floors; f++) {
      const fy = fyOf(f);
      ctx.clearRect(-half + 1, fy - 34, 4, 31);
      RA(ctx, -half + 1, fy - 34, 4, 31, '#9fd6ff', 0.16);
      R(ctx, -half, fy - 36, 6, 2, GOLD.md);
      R(ctx, -half, fy - 36, 6, 1, GOLD.hi);
      R(ctx, -half, fy - 4, 6, 1, GOLD.dk);
      RA(ctx, -half + 1, fy - 32, 1, 10, '#ffffff', 0.45);
      if (f > 0) {
        const bx = -half - 17;
        R(ctx, bx, fy, 18, 3, NAVY.md);
        R(ctx, bx, fy, 18, 1, GOLD.lt);
        R(ctx, bx, fy + 2, 18, 1, GOLD.dk);
        R(ctx, bx, fy - 9, 1, 9, GOLD.md);
        R(ctx, bx, fy - 10, 17, 1, GOLD.lt);
        R(ctx, bx, fy - 5, 17, 1, GOLD.dk);
        for (let x = bx + 4; x < bx + 16; x += 4) R(ctx, x, fy - 9, 1, 8, GOLD.md);
        RA(ctx, bx + 1, fy - 9, 16, 8, '#bfe6ff', 0.07);
        // trädgårdskrukor med buxbom
        V.pot(ctx, bx + 2, fy, 5, 3, GOLD.dk);
        blob(ctx, bx + 4, fy - 6, 3, 3, '#3e9a52', '#7bd283', '#2a7440');
        if (f % 2) { V.pot(ctx, bx + 11, fy, 5, 3, GOLD.dk); blob(ctx, bx + 13, fy - 6, 3, 3, '#3e9a52', '#7bd283', '#2a7440'); }
      }
    }
    // entréportik på markplanet: baldakin med namnet, guldpelare, trappsteg och buxbomsbollar
    {
      const fy = fyOf(0);
      const cxl = -half - 38;
      const cwid = 44;
      R(ctx, cxl, fy - 48, cwid, 13, NAVY.dk);
      R(ctx, cxl, fy - 48, cwid, 1, GOLD.hi);
      R(ctx, cxl, fy - 47, cwid, 1, GOLD.md);
      R(ctx, cxl, fy - 36, cwid, 1, GOLD.dk);
      R(ctx, cxl, fy - 35, cwid, 1, NEON.cyan);
      RA(ctx, cxl, fy - 34, cwid, 5, NEON.cyan, 0.18);
      R(ctx, cxl + 2, fy - 35, 3, 32, GOLD.md);
      R(ctx, cxl + 2, fy - 35, 1, 32, GOLD.lt);
      R(ctx, cxl + 4, fy - 35, 1, 32, GOLD.dk);
      R(ctx, cxl + 1, fy - 5, 5, 2, GOLD.lt);
      const nm = lang === 'en' ? ['DYNASTY', 'TOWER'] : ['DYNASTI-', 'TORNET'];
      nm.forEach((l, i) => {
        const tx = cxl + 8 + Math.round((cwid - 12 - textWidth(l)) / 2);
        drawText(ctx, l, tx, fy - 45 + i * 6, NAVY.ink, 1);
        drawText(ctx, l, tx, fy - 46 + i * 6, GOLD.hi, 1);
      });
      R(ctx, cxl - 3, fy - 3, cwid + 6, 3, MARBLE.lt);
      R(ctx, cxl - 3, fy - 3, cwid + 6, 1, MARBLE.hi);
      R(ctx, cxl - 1, fy - 4 - 0, cwid + 2 - 6, 1, MARBLE.hi);
      R(ctx, cxl - 3, fy, cwid + 6, 1, MARBLE.md);
      // golvbelysning och matta
      R(ctx, cxl + 8, fy - 4, 28, 1, '#8a2a3a');
      V.pot(ctx, cxl + 38, fy - 4, 5, 3, GOLD.dk);
      blob(ctx, cxl + 40, fy - 11, 4, 4, '#3e9a52', '#7bd283', '#2a7440');
      R(ctx, cxl + 40, fy - 8, 1, 4, '#5a4a28');
      RA(ctx, cxl + 6, fy - 35, 30, 32, '#fff0c0', 0.05);
    }
    // glashiss på husets högra sida (hytten ritas i dynamic)
    {
      const ex = half + 4;
      R(ctx, ex - 2, topY - 16, 17, 10, NAVY.md);
      R(ctx, ex - 2, topY - 16, 17, 1, GOLD.hi);
      R(ctx, ex - 2, topY - 15, 17, 1, GOLD.md);
      R(ctx, ex - 2, topY - 7, 17, 1, GOLD.dk);
      R(ctx, ex + 2, topY - 13, 9, 3, '#10162a');
      R(ctx, ex + 3, topY - 12, 3, 1, NEON.green);
      RA(ctx, ex, topY - 6, 13, -topY + 2, '#9fd6ff', 0.16);
      R(ctx, ex, topY - 6, 1, -topY + 2, GOLD.md);
      R(ctx, ex + 12, topY - 6, 1, -topY + 2, GOLD.dk);
      for (let f = 0; f <= L.floors; f++) {
        const y = f === L.floors ? topY : fyOf(f);
        R(ctx, ex, y - (f === 0 ? 0 : 0), 13, 1, GOLD.md);
        R(ctx, ex + 13, y - 2, 4, 3, NAVY.md);
        R(ctx, ex + 13, y - 2, 4, 1, GOLD.lt);
      }
      R(ctx, ex + 6, topY - 6, 1, -topY + 2, 'rgba(255,255,255,0.18)');
    }
    // namnskyltar i guld ovanpå Studiohusets mörka skyltar
    const slotFac = new Map(Object.entries(opts.fac || {}).map(([id, f]) => [f.slot, { id, lvl: f.lvl }]));
    for (const r of L.rooms) {
      const name = roomName(r, slotFac);
      if (!name) continue;
      const w = Math.min(r.w - 8, textWidth(name) + 5);
      const x = r.x0 + 4;
      const y = fyOf(r.floor) - intH + 1;
      R(ctx, x, y, w, 7, '#0a1030');
      R(ctx, x, y, w, 1, GOLD.md);
      R(ctx, x, y + 6, w, 1, GOLD.dk);
      R(ctx, x, y, 1, 7, GOLD.md);
      R(ctx, x + w - 1, y, 1, 7, GOLD.dk);
      drawText(ctx, name.length * 4 > w ? name.slice(0, Math.floor((w - 1) / 4)) : name, x + 3, y + 1, GOLD.hi);
    }
    // börsticker i bjälklaget mellan markplanet och våning 2: mörk platta med guldkant (staplarna ritas i dynamic)
    {
      const ty = fyOf(1);
      R(ctx, TICKER.x - 2, ty, TICKER.w + 4, 6, '#0a1220');
      R(ctx, TICKER.x - 2, ty, 1, 6, GOLD.md);
      R(ctx, TICKER.x + TICKER.w + 1, ty, 1, 6, GOLD.dk);
    }
    // slogan i bjälklaget mellan våning 2 och 3
    {
      const s = T('HÄR BYGGS LEGENDER', 'LEGENDS ARE BUILT HERE');
      const by = fyOf(2);
      const bx = -Math.round(textWidth(s) / 2);
      R(ctx, bx - 3, by, textWidth(s) + 6, 6, '#0a1220');
      V.neonText(ctx, s, bx, by, GOLD.hi, GOLD.md);
    }
  },

  // ── Taket: helikopterplatta, paviljong, namnskylt med krona, kylaggregat och mast ──
  roof(ctx, L, opts) {
    const topY = L.topY;
    const half = L.BW / 2;
    const d = deckOf(topY);
    const name = (opts.name || 'STUDIO').toUpperCase();
    // trädäck och stenplattor
    R(ctx, -half + 2, d - 2, L.BW - 4, 2, '#cfc8b8');
    R(ctx, -half + 2, d - 2, L.BW - 4, 1, MARBLE.hi);
    for (let x = -half + 10; x < half - 2; x += 16) R(ctx, x, d - 1, 1, 1, MARBLE.dk);
    // helikopterplatta
    {
      const w = PAD.x1 - PAD.x0;
      R(ctx, PAD.x0 - 1, d - 3, w + 2, 3, '#3a4256'); // sockel
      R(ctx, PAD.x0 - 1, d - 3, w + 2, 1, '#6a7488');
      R(ctx, PAD.x0 + 6, d - 2, 2, 2, '#232838');
      R(ctx, PAD.x1 - 8, d - 2, 2, 2, '#232838');
      R(ctx, PAD.x0, d - 8, w, 5, '#8a93a8'); // plattans yta (sedd snett uppifrån)
      R(ctx, PAD.x0, d - 8, w, 1, '#c8d0e0');
      R(ctx, PAD.x0, d - 4, w, 1, '#5a6478');
      R(ctx, PAD.x0 + w - 1, d - 7, 1, 4, '#6a7488');
      // landningsmarkeringen i perspektiv: ring och H
      const pc = (PAD.x0 + PAD.x1) / 2;
      for (let i = -37; i <= 37; i++) {
        const k = Math.sqrt(Math.max(0, 1 - (i / 38) ** 2));
        R(ctx, pc + i, d - 6 - Math.round(1.6 * k), 1, 1, '#f6e070');
        R(ctx, pc + i, d - 6 + Math.round(1.6 * k) - 1, 1, 1, '#d8b840');
      }
      R(ctx, pc - 6, d - 7, 2, 4, '#ffffff');
      R(ctx, pc + 4, d - 7, 2, 4, '#ffffff');
      R(ctx, pc - 5, d - 6, 10, 1, '#ffffff');
      for (let x = PAD.x0 + 4; x <= PAD.x1 - 3; x += 12) {
        R(ctx, x, d - 10, 1, 2, '#8a92a8');
        R(ctx, x, d - 11, 1, 1, '#ffd84a');
      }
      // vindstrut
      R(ctx, PAD.x0 + 4, d - 20, 1, 15, '#c8d0e0');
      for (let i = 0; i < 6; i++) R(ctx, PAD.x0 + 5 + i, d - 20 + (i >> 1), 1, 3 - (i >> 2), i % 2 ? '#f4f4ff' : '#ff8a3a');
      // buxbomsträd i guldkrukor mellan plattan och paviljongen
      for (const tx of [-164, -146]) {
        R(ctx, tx - 4, d - 7, 9, 5, GOLD.md); R(ctx, tx - 4, d - 7, 9, 1, GOLD.hi); R(ctx, tx + 4, d - 6, 1, 4, GOLD.dk);
        R(ctx, tx, d - 14, 1, 7, '#5a4a28');
        blob(ctx, tx, d - 17, 5, 5, '#3e9a52', '#7bd283', '#2a7440');
      }
    }
    // paviljong: glasvåning med guldspröjs och marinblått tak
    {
      const h = 14;
      R(ctx, -PAV, d - h, PAV * 2, h - 2, '#14224a');
      for (let x = -PAV + 2; x < PAV - 2; x += 21) {
        R(ctx, x + 2, d - h + 2, 17, h - 6, '#2a4a7a');
        R(ctx, x + 2, d - h + 2, 17, 4, '#4a7ab0');
        R(ctx, x + 2, d - h + 8, 17, h - 12, '#f0c878');
        RA(ctx, x + 2, d - h + 2, 17, h - 6, '#fff4d0', 0.12);
        for (let k = 0; k < 3; k++) RA(ctx, x + 4 + k * 5, d - h + 3, 1, 8, '#ffffff', 0.25);
        // siluetter av växter och människor
        R(ctx, x + 6 + ((x * 7) & 3), d - 9, 3, 7, '#2a1c30');
        R(ctx, x + 12 + ((x * 3) & 3), d - 8, 2, 6, '#3a2a40');
        R(ctx, x, d - h + 2, 2, h - 4, GOLD.md);
        R(ctx, x, d - h + 2, 1, h - 4, GOLD.lt);
      }
      R(ctx, PAV - 2, d - h + 2, 2, h - 4, GOLD.md);
      R(ctx, -PAV - 2, d - h - 3, PAV * 2 + 4, 3, GOLD.md);
      R(ctx, -PAV - 2, d - h - 3, PAV * 2 + 4, 1, GOLD.hi);
      R(ctx, -PAV - 2, d - h - 1, PAV * 2 + 4, 1, GOLD.dk);
      R(ctx, -PAV, d - 2, PAV * 2, 2, GOLD.dk);
      V.neonLine(ctx, -PAV + 2, d - h - 4, PAV * 2 - 4, NEON.cyanHi, NEON.cyan);
    }
    // trappstegsvingar upp mot skylten
    {
      const base = d - 17;
      for (const sg of [-1, 1]) {
        [[84, 96, 28], [96, 108, 19], [108, 120, 10]].forEach(([a, b, hh]) => {
          const x0 = sg < 0 ? -b : a;
          R(ctx, x0, base - hh, b - a, hh, NAVY.md);
          R(ctx, x0, base - hh, b - a, 1, GOLD.lt);
          R(ctx, x0, base - hh, 1, hh, GOLD.md);
          R(ctx, x0 + b - a - 1, base - hh + 1, 1, hh - 1, NAVY.ink);
          for (let y = base - hh + 3; y < base; y += 4) R(ctx, x0 + 1, y, b - a - 2, 1, NAVY.lt);
          R(ctx, x0 + ((b - a) >> 1), base - hh + 2, 1, hh - 3, NEON.cyan);
        });
      }
    }
    // namnskylten
    {
      const sy = d - 14 - SIGN.h;
      const sx = -SIGN.w / 2;
      R(ctx, sx - 2, sy - 2, SIGN.w + 4, SIGN.h + 4, GOLD.dk);
      R(ctx, sx - 2, sy - 2, SIGN.w + 4, 1, GOLD.hi);
      R(ctx, sx - 2, sy - 1, SIGN.w + 4, 1, GOLD.lt);
      R(ctx, sx - 2, sy - 2, 1, SIGN.h + 4, GOLD.lt);
      R(ctx, sx, sy, SIGN.w, SIGN.h, '#080c20');
      R(ctx, sx + 1, sy + 1, SIGN.w - 2, SIGN.h - 2, '#0e1636');
      R(ctx, sx + 1, sy + 1, SIGN.w - 2, 1, '#1e2c5a');
      R(ctx, sx + 2, sy + 2, SIGN.w - 4, 1, GOLD.dk);
      R(ctx, sx + 2, sy + SIGN.h - 3, SIGN.w - 4, 1, GOLD.dk);
      const { lines, sc } = signLines(name, SIGN.w - 24);
      const two = lines.length === 2;
      const sub = T('DYNASTI-TORNET', 'DYNASTY TOWER');
      lines.forEach((s, i) => {
        const tw = textWidth(s, sc);
        const x = -Math.round(tw / 2);
        const y = two ? sy + 4 + i * 12 : sy + (sc === 3 ? 5 : sc === 2 ? 7 : 11);
        drawText(ctx, s, x, y + 1, '#1a8aa8', sc);
        drawText(ctx, s, x, y, '#e8fbff', sc);
      });
      if (!two) {
        const y = sy + 22;
        const tw = textWidth(sub);
        R(ctx, -Math.round(tw / 2) - 14, y + 2, 10, 1, GOLD.md);
        R(ctx, Math.round(tw / 2) + 5, y + 2, 10, 1, GOLD.md);
        drawText(ctx, sub, -Math.round(tw / 2), y, GOLD.lt, 1);
      }
      RA(ctx, sx - 4, sy - 4, SIGN.w + 8, SIGN.h + 8, NEON.cyan, 0.1);
      // marquee-hållare runt skylten
      for (let x = sx + 3; x <= sx + SIGN.w - 3; x += 8) {
        R(ctx, x, sy - 1, 1, 1, '#fff4c0');
        R(ctx, x, sy + SIGN.h, 1, 1, '#fff4c0');
      }
      crownIcon(ctx, -7, sy - 12, NEON.cyan);
    }
    // flaggstång med guldkula
    R(ctx, FLAG_X, d - 28, 1, 28, '#c8d0e0');
    R(ctx, FLAG_X - 1, d - 30, 3, 3, GOLD.md);
    R(ctx, FLAG_X - 1, d - 30, 1, 1, GOLD.hi);
    R(ctx, FLAG_X - 2, d - 2, 5, 2, '#6a7488');
    // kylaggregat, mast, parabol
    for (const x of CHILL) chiller(ctx, x, d);
    mast(ctx, MAST_X, d, 66);
    // glasräcke längs takkanten (utanför plattan och aggregaten)
    const rail = (x0, x1) => {
      RA(ctx, x0, d - 9, x1 - x0, 8, '#bfe6ff', 0.07);
      R(ctx, x0, d - 10, x1 - x0, 1, GOLD.lt);
      for (let x = x0; x <= x1; x += 22) R(ctx, x, d - 10, 1, 9, GOLD.md);
    };
    rail(-half + 2, PAD.x0);
    rail(-PAV - 2 - 28, -PAV - 2);
    rail(PAV + 2, half - 2);
  },

  // ── Dynamik: helikopter, kylfläktar, varningslampa, hytt i glashissen och ljuspulser i kolonnerna ──
  dynamic(A, cx, gy, L, time, night, st = {}) {
    const topY = L.topY;
    const d = deckOf(topY);
    const t = time;
    const still = !!st.reduced;
    // kylfläktar
    for (const x of CHILL) {
      const k = still ? 0 : Math.floor(t * 12) % 2;
      A.fillStyle = '#e8ecf4';
      A.fillRect(cx + x + 5 + k, gy + d - 18, 3, 1);
      A.fillRect(cx + x + 11 - k, gy + d - 18, 3, 1);
      A.fillRect(cx + x + 17 + k, gy + d - 18, 3, 1);
    }
    // varningslampa (röd) i masttoppen och på paviljongens hörn
    const on = still || Math.floor(t * 1.4) % 2 === 0;
    if (on) {
      A.fillStyle = '#ff5a4a';
      A.fillRect(cx + MAST_X - 1, gy + d - 66 - 1, 3, 2);
      A.fillStyle = '#ffd8d0';
      A.fillRect(cx + MAST_X, gy + d - 66 - 1, 1, 1);
      A.globalAlpha = 0.28 + 0.2 * night;
      A.fillStyle = '#ff2a1a';
      A.fillRect(cx + MAST_X - 3, gy + d - 66 - 3, 7, 6);
      A.globalAlpha = 1;
    }
    const on2 = still || Math.floor(t * 1.4 + 0.5) % 2 === 0;
    if (on2) {
      A.fillStyle = '#ff5a4a';
      A.fillRect(cx - PAV - 1, gy + d - 18, 2, 2);
      A.fillRect(cx + PAV - 1, gy + d - 18, 2, 2);
    }
    // sökljus som sveper över himlen från trappstegsvingarna (bara när det är mörkt)
    if (night > 0.12 && !still) {
      for (const [sx, k] of [[-98, 0], [98, 1]]) {
        const base = d - 47;
        const ang = (k ? -1 : 1) * (0.55 + 0.4 * Math.sin(t * 0.33 + k * 2.1)) - 1.5708; // -pi/2 = rakt upp
        const len = 150;
        const ex = sx + Math.cos(ang) * len;
        const ey = base + Math.sin(ang) * len;
        const nx = -Math.sin(ang) * 7;
        const ny = Math.cos(ang) * 7;
        A.fillStyle = `rgba(190,238,255,${0.1 * Math.min(1, night * 1.3)})`;
        A.beginPath();
        A.moveTo(cx + sx - 1, gy + base);
        A.lineTo(cx + ex + nx, gy + ey + ny);
        A.lineTo(cx + ex - nx, gy + ey - ny);
        A.lineTo(cx + sx + 1, gy + base);
        A.closePath();
        A.fill();
      }
    }
    // ljuspulser längs de gyllene kolonnerna
    if (!still) {
      for (const [sx, k] of [[-L.BW / 2 + 2, 0], [L.BW / 2 - 3, 1]]) {
        for (let i = 0; i < 3; i++) {
          const p = ((t * 26 + i * 70 + k * 35) % (-topY - 20));
          A.globalAlpha = 0.85;
          A.fillStyle = '#ffffff';
          A.fillRect(cx + sx, gy - 10 - p, 1, 5);
          A.globalAlpha = 0.3;
          A.fillStyle = NEON.cyanHi;
          A.fillRect(cx + sx, gy - 10 - p + 5, 1, 4);
          A.globalAlpha = 1;
        }
      }
    }
    // flaggan vajar (marinblå med guldrand och krona)
    {
      const fx = cx + FLAG_X + 1;
      const fy0 = gy + d - 27;
      for (let i = 0; i < 15; i++) {
        const off = still ? 0 : Math.round(Math.sin(t * 3.2 - i * 0.55) * (0.4 + i * 0.09));
        A.fillStyle = '#243260';
        A.fillRect(fx + i, fy0 + off, 1, 10);
        A.fillStyle = GOLD.md;
        A.fillRect(fx + i, fy0 + off, 1, 1);
        A.fillRect(fx + i, fy0 + off + 9, 1, 1);
        if (i > 3 && i < 11) {
          A.fillStyle = GOLD.lt;
          A.fillRect(fx + i, fy0 + off + (i % 3 === 1 ? 3 : 4), 1, i % 3 === 1 ? 3 : 2);
        }
      }
    }
    // börsticker: gröna och röda staplar glider åt vänster
    {
      const ty = gy + elevY(1);
      for (let k = 0; k < 24; k++) {
        const x = ((k * 7 - (still ? 0 : t * 16)) % (TICKER.w + 7) + (TICKER.w + 7)) % (TICKER.w + 7);
        if (x > TICKER.w - 3) continue;
        const up = (k * 5 + 3) % 7 < 4;
        const h = 2 + ((k * 3) % 3);
        A.fillStyle = up ? '#5cf2a0' : '#ff6a6a';
        A.fillRect(cx + TICKER.x + x, ty + (up ? 5 - h : 1), 3, h);
        A.fillStyle = up ? '#c8ffe0' : '#ffc0c0';
        A.fillRect(cx + TICKER.x + x, ty + (up ? 5 - h : 1), 1, h);
      }
    }
    // glashissen
    {
      const ex = L.BW / 2 + 4;
      let y = elevY(0);
      if (!still) {
        const stops = [0, 2, 3, 1, 0, 3];
        const u = (t % (stops.length * 5));
        const seg = Math.floor(u / 5);
        const w = u - seg * 5;
        const a = elevY(stops[seg]);
        const b = elevY(stops[(seg + 1) % stops.length]);
        y = w < 3 ? a + (b - a) * ease(w / 3) : b;
      } else y = elevY(1);
      const yy = Math.round(y);
      A.fillStyle = '#10162a';
      A.fillRect(cx + ex + 1, gy + yy - 13, 11, 12);
      A.fillStyle = '#f6e0a0';
      A.fillRect(cx + ex + 2, gy + yy - 12, 9, 10);
      A.fillStyle = '#fff8e0';
      A.fillRect(cx + ex + 2, gy + yy - 12, 9, 1);
      A.fillStyle = '#4a3a50';
      A.fillRect(cx + ex + 4, gy + yy - 8, 2, 6);
      A.fillRect(cx + ex + 8, gy + yy - 7, 2, 5);
      A.fillStyle = '#f6d6b8';
      A.fillRect(cx + ex + 4, gy + yy - 10, 2, 2);
      A.fillRect(cx + ex + 8, gy + yy - 9, 2, 2);
      A.fillStyle = GOLD.md;
      A.fillRect(cx + ex + 1, gy + yy - 1, 11, 1);
      if (night > 0.1) {
        A.globalAlpha = 0.18 * night;
        A.fillStyle = '#ffe8a0';
        A.fillRect(cx + ex - 2, gy + yy - 14, 17, 15);
        A.globalAlpha = 1;
      }
    }
    // helikoptern
    const padY = gy + d - 5; // plattans yta
    const h = still ? { x: (PAD.x0 + PAD.x1) / 2, alt: 0, dir: 1, rotor: 0, mode: 'park', tilt: 0 } : heliState(t);
    if (h) heli(A, cx + h.x, padY - h.alt, h, t, night);
  },
};

