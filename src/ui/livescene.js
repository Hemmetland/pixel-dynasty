// Levande scener i fönstren: en liten pixelbild överst som visar att något händer. Skapa spel visar studion där teamet jobbar,
// Hårdvara visar labbet och fabriken. Personerna är studions egen personal med spelets figur. Scenerna visar spelets verkliga
// läge (sim/life.js lifeState: vem som sitter vid skärmarna, övertid, buggar, hur långt projektet har kommit, vilka produkter som
// ritas, tillverkas och beställs) och reagerar på händelserna ('life' på bussen) med pratbubblor, jubel, konfetti, pizza, gäster,
// lastbilar och en tickerrad. Allt ritas av tiden (inga tillstånd i bilden), så scenen överlever att fönstret ritas om.
// En enda timer ritar alla synliga scenbilder och den står still när fönstret är dolt.
import { t } from './core.js';
import { on } from '../core/bus.js';
import { drawPoseSprite } from '../render/charsprite.js';
import { drawPerson, POSE_FRAMES } from '../render/people.js';
import { drawEmote } from '../render/emotes.js';
import { drawCat, labBench } from '../render/props.js';
import * as F from '../render/furniture.js';
import * as V from '../render/props2.js';
import { HW_TYPES } from '../data/hardware.js';
import { lifeState, lifeLog, lifeText } from '../sim/life.js';
import { hashStr } from '../core/rng.js';

const R = V.R;
const H = 56; // logisk höjd; bredden följer fönstret (3 skärmpixlar per pixel, 2 på smal skärm)
const CFG = {}; // senaste inställningarna per sort
const FALLBACK = [
  { skin: 1, hair: 3, hairColor: 2, shirt: 5, pants: 0, acc: 0, body: 0 },
  { skin: 2, hair: 1, hairColor: 1, shirt: 9, pants: 1, acc: 0, body: 0 },
  { skin: 0, hair: 5, hairColor: 4, shirt: 2, pants: 3, acc: 0, body: 0 },
  { skin: 3, hair: 2, hairColor: 0, shirt: 7, pants: 0, acc: 0, body: 0 },
  { skin: 1, hair: 4, hairColor: 5, shirt: 12, pants: 2, acc: 0, body: 0 },
  { skin: 0, hair: 0, hairColor: 3, shirt: 3, pants: 1, acc: 0, body: 0 },
];
const now = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);

// ── Händelserna ──
const BEATS = []; // { b, t0 } de senaste händelserna från simen, med tiden de kom
on('life', (b) => {
  BEATS.push({ b, t0: now() });
  while (BEATS.length > 24) BEATS.shift();
});
const recent = (kinds, maxAge, tm) => BEATS.filter((e) => kinds.includes(e.b.k) && tm - e.t0 < maxAge && tm >= e.t0);
const BIG = ['launch', 'done', 'sold', 'chart', 'disc', 'party', 'anniv', 'engine', 'fans', 'hwLaunch'];

// Bildens HTML. kind: 'studio' | 'factory'. Staben och läget hämtas ur G.
export function sceneHTML(kind, G, extra = {}) {
  const looks = (G.staff || []).map((s) => s.look).filter(Boolean);
  for (const l of FALLBACK) if (looks.length < 8) looks.push(l);
  const cfg = (CFG[kind] = { G, looks, n: Math.max(1, Math.min(5, (G.staff || []).length)), st: null, stT: -9, ...extra });
  refresh(kind, cfg);
  start();
  const last = lifeLog(G, LOG_SC[kind], 0).slice(-1)[0];
  return `<div class="ls ls-${kind}"><canvas class="ls-cv" data-ls="${kind}" width="200" height="${H}"></canvas><span class="ls-cap"><i></i><b>${caption(kind, cfg)}</b></span><span class="ls-tick" data-seen="${last ? last.n : 0}"></span><div class="ls-prog" hidden><i></i></div></div>`;
}
// Läget per scen: studion och fabriken läser lifeState, motorrummet och koncernen läser spelets data direkt
const STATE = {
  studio: (G) => lifeState(G, 'dev'),
  factory: (G) => lifeState(G, 'hw'),
  engine: (G) => {
    const e = lifeState(G, 'eng');
    const b = e.builds[0];
    const byId = new Map((G.staff || []).map((x) => [x.id, x]));
    return {
      active: !!b, pct: b ? b.pct : 0, name: b ? b.name : '', parts: b ? b.feats : 0, built: e.engines.length, team: e.team,
      crew: e.crew.map((c) => byId.get(c.id)).filter(Boolean).map((x) => x.look),
    };
  },
  group: (G) => lifeState(G, 'group'),
};
const TICK_SC = { studio: ['dev', 'studio'], factory: ['hw'], engine: ['eng'], group: ['group'] };
const LOG_SC = { studio: 'dev', factory: 'hw', engine: 'eng', group: 'group' };
function refresh(kind, cfg) {
  try {
    cfg.st = STATE[kind](cfg.G);
  } catch {
    cfg.st = null;
  }
}
function caption(kind, cfg) {
  const st = cfg.st;
  if (kind === 'studio') return !st ? t('ls.studio') : st.active ? t('ls.studio.on', { title: st.title || '…' }) : st.report ? t('ls.studio.report') : t('ls.studio.idle');
  if (kind === 'engine') return st && st.active ? t('ls.engine.on', { name: st.name }) : st && st.team ? t('ls.engine.team', { team: st.team.name }) : t('ls.engine');
  if (kind === 'group') return st && st.subs.some((c) => c.mode === 'int') ? t('ls.group.int') : t('ls.group', { n: st ? st.subs.length : 0 });
  if (!st || !st.open) return t('ls.factory');
  return st.orders.length ? t('ls.factory.prod') : st.designing.length ? t('ls.factory.design') : t('ls.factory');
}

// ── Gemensamt ──
const frameOf = (pose, t_) => Math.floor(t_ * ({ type: 8, walk: 9, drink: 3, fix: 5, notes: 4, walkBox: 9, walkCup: 9, present: 3, wave: 5, cheer: 5, stand: 0 }[pose] || 4)) % (POSE_FRAMES[pose] || 1);
function person(ctx, x, y, look, pose, tm, dir = 1, seated = false, off = 0) {
  if (drawPoseSprite(ctx, x, y, look, pose, tm + off, dir, seated)) return;
  drawPerson(ctx, x, y, look, pose, frameOf(pose, tm + off), dir, { t: tm, seated, noShadow: false });
}
const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
const hx = (n) => (hashStr('ls' + n) % 1000) / 1000;
function steam(ctx, x, y, tm, n = 3, a = 0.5, col = '#ffffff') {
  for (let i = 0; i < n; i++) {
    const p = (tm * 0.6 + i / n) % 1;
    ctx.globalAlpha = (1 - p) * a;
    ctx.fillStyle = col;
    const s = 1 + Math.floor(p * 2);
    ctx.fillRect(Math.round(x + Math.sin(tm * 2 + i * 2) * 1.5 * p), Math.round(y - p * 14), s, s);
  }
  ctx.globalAlpha = 1;
}
function confetti(ctx, W, age, seed) {
  if (age > 4.6) return;
  const cols = ['#ff6a8a', '#ffe27a', '#7cf2ff', '#8aff9a', '#c89aff', '#ffffff'];
  for (let i = 0; i < 44; i++) {
    const r1 = hx(seed * 31 + i);
    const r2 = hx(seed * 17 + i * 7);
    const x = r1 * W + Math.sin(age * 3 + i) * 3;
    const y = -4 + age * (14 + r2 * 22) - (1 - Math.min(1, age * 3)) * 6;
    if (y > H) continue;
    ctx.globalAlpha = Math.min(1, (4.6 - age) / 1.2);
    R(ctx, Math.round(x), Math.round(y), 2, Math.floor(age * 6 + i) % 2 ? 1 : 2, cols[i % cols.length]);
  }
  ctx.globalAlpha = 1;
}
function bubble(ctx, x, y, kind, age, life, tm) {
  if (age >= 0 && age < life) drawEmote(ctx, x, y, kind, age, life, tm);
}
function darken(ctx, W, a, col = '#05081a') {
  ctx.globalAlpha = a;
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

// ── Studion ──
const EMO = { idea: 'bulb', bug: 'exclam', fix: 'heart', tired: 'sweat', crunch: 'coffee', relax: 'heart', pizza: 'heart', phase: 'bulb', half: 'bulb', quarter: 'bulb', almost: 'exclam', launch: 'heart', hired: 'heart', visitor: 'question', contract: 'heart' };
function drawStudio(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { active: false, crunch: false, bugs: 0, crew: [] };
  const crunch = !!st.crunch && st.active;
  R(ctx, 0, 0, W, H, '#1a2044');
  R(ctx, 0, 30, W, H - 40, '#212a58');
  R(ctx, 0, H - 13, W, 2, '#12172f');
  // fönster med natthimmel
  const nw = Math.max(2, Math.floor((W - 90) / 80));
  for (let i = 0; i < nw; i++) {
    const wx = Math.round(14 + ((W - 100) * (i + 0.5)) / nw) - 14;
    R(ctx, wx - 1, 4, 30, 24, '#0c1028');
    R(ctx, wx, 5, 28, 22, '#0f1a42');
    R(ctx, wx, 17, 28, 10, '#15235a');
    for (let k = 0; k < 6; k++) {
      const sx = wx + 2 + Math.floor(V.hash(i * 9 + k) * 24);
      const sy = 6 + Math.floor(V.hash(i * 5 + k + 3) * 10);
      R(ctx, sx, sy, 1, 1, Math.floor(tm * 1.5 + k) % 3 ? '#ffffff' : '#7a88c8');
    }
    for (let k = 0; k < 7; k++) {
      const bh = 4 + Math.floor(V.hash(i * 11 + k) * 8);
      R(ctx, wx + k * 4, 27 - bh, 4, bh, '#0a0f2a');
      if (V.hash(i * 3 + k) > 0.45 && Math.floor(tm * 0.3 + k + i) % 5) R(ctx, wx + k * 4 + 1, 27 - bh + 2, 1, 1, '#ffd36a');
    }
    if (i === 0) R(ctx, wx + 20, 7, 3, 3, '#f6f2d8'); // månen
    R(ctx, wx + 13, 5, 2, 22, '#2a3258');
    R(ctx, wx, 15, 28, 1, '#2a3258');
  }
  F.kanban(ctx, W - 92, 7, 24, 16, 5);
  // golv
  R(ctx, 0, H - 11, W, 11, '#5a3d27');
  for (let x = 0; x < W; x += 18) R(ctx, x, H - 11, 1, 11, '#47301e');
  R(ctx, 0, H - 11, W, 1, '#7a5636');
  R(ctx, 0, H - 6, W, 1, '#4c3320');
  // vilka som sitter vid skärmarna: de som kan jobba (annars bara de som finns)
  const crew = st.crew.filter((c) => !c.away);
  const pitch = 56;
  const x0 = 10;
  const cap = Math.max(2, Math.floor((W - 96) / pitch));
  const nd = Math.max(2, Math.min(cap, crew.length || cfg.n));
  const staffLook = (id, i) => (cfg.G.staff.find((s) => s.id === id) || {}).look || cfg.looks[i];
  const cheer = recent(['launch', 'done', 'sold', 'chart', 'disc', 'party', 'contract'], 3.4, tm).length > 0;
  const guestE = recent(['visitor'], 14, tm)[0];
  const pizzaE = recent(['pizza'], 13, tm)[0];
  const seat = [];
  for (let i = 0; i < nd; i++) {
    const dx = x0 + i * pitch;
    F.chair2(ctx, dx + 3, fy, ['#3a4a6a', '#6a3a4a', '#3a6a5a', '#5a4a7a'][i % 4]);
    F.desk2(ctx, dx + 3, fy, i % 5, i + 1, 2);
    const c = crew[i];
    const look = c ? staffLook(c.id, i) : cfg.looks[i];
    const tired = c && c.mood < 35;
    const typing = st.active ? Math.floor((tm + i * 3.1) / 6) % 4 !== 3 : false;
    // skärmen i profil: kodrader som rullar (bara när ett projekt pågår), annars en stilla skärmsläckare
    const sx = dx + 3 + 16;
    const sy = fy - 27;
    for (let r = 0; r < 4; r++) {
      if (st.active) {
        const len = 2 + Math.floor(V.hash(Math.floor(tm * 2) * 7 + r * 3 + i * 11) * 5);
        R(ctx, sx, sy + r * 2, len, 1, ['#7cf2ff', '#ff7ab8', '#ffe27a', '#8aff9a'][(r + Math.floor(tm * 2) + i) % 4]);
      } else R(ctx, sx + (Math.floor(tm + r) % 3), sy + r * 2, 2, 1, '#4a5a8a');
    }
    const pose = cheer ? 'cheer' : tired && st.active ? 'tired' : st.active ? (typing ? 'type' : 'think') : Math.floor((tm + i * 5) / 7) % 3 === 0 ? 'read' : 'sitIdle';
    person(ctx, dx + 3 + 3, fy, look, pose, tm, 1, true, i * 0.37);
    // en kaffemugg på bordet när det är övertid
    if (crunch) {
      R(ctx, dx + 3 + 11, fy - 14, 3, 3, '#f4f4ff');
      R(ctx, dx + 3 + 14, fy - 13, 1, 1, '#f4f4ff');
      steam(ctx, dx + 3 + 12, fy - 15, tm + i, 2, 0.4);
    }
    seat.push({ x: dx + 8, id: c ? c.id : 0 });
  }
  // buggar kryper över borden (ett par per tjugo buggar, högst fem)
  const bugs = Math.min(5, Math.ceil((st.bugs || 0) / 6));
  for (let k = 0; k < bugs; k++) {
    const p = ((tm * (0.05 + 0.02 * k) + k * 0.31) % 1) * (nd * pitch);
    const bx = Math.round(x0 + p);
    const by = fy - 12 + Math.round(Math.sin(tm * 4 + k) * 0.6);
    R(ctx, bx, by, 3, 2, '#5ad06a');
    R(ctx, bx + 1, by - 1, 1, 1, '#2f8a3c');
    R(ctx, bx, by + 2, 1, 1, Math.floor(tm * 8 + k) % 2 ? '#2f8a3c' : '#14301a');
    R(ctx, bx + 2, by + 2, 1, 1, Math.floor(tm * 8 + k) % 2 ? '#14301a' : '#2f8a3c');
  }
  // kaffehörnan
  const cx = W - 52;
  F.kitchenCounter(ctx, cx, fy, 42);
  F.espresso(ctx, cx + 8, fy - 16);
  steam(ctx, cx + 14, fy - 30, tm, 3, 0.45);
  // pizza på golvet efter ett pizzabeslut
  if (pizzaE) {
    const px = Math.round(W * 0.5);
    for (let k = 0; k < 3; k++) {
      R(ctx, px + k * 2, fy + 1 - k * 3, 12, 3, '#c49a62');
      R(ctx, px + k * 2, fy + 1 - k * 3, 12, 1, '#dcb680');
      R(ctx, px + k * 2 + 3, fy + 2 - k * 3, 6, 1, '#e8504a');
    }
    steam(ctx, px + 7, fy - 8, tm, 2, 0.4);
  }
  // någon går efter kaffe och tillbaka
  const walker = cfg.looks[Math.min(cfg.looks.length - 1, nd)];
  const cyc = 18;
  const k = tm % cyc;
  const wxA = x0 + nd * pitch - 4;
  const wxB = cx - 8;
  if (k < 5) person(ctx, lerp(wxA, wxB, k / 5), fy + 2, walker, 'walk', tm, 1);
  else if (k < 9) person(ctx, wxB, fy + 2, walker, 'drink', tm, 1);
  else if (k < 14) person(ctx, lerp(wxB, wxA, (k - 9) / 5), fy + 2, walker, 'walkCup', tm, -1);
  else person(ctx, wxA, fy + 2, walker, 'stand', tm, 1);
  // en gäst (journalist) kommer förbi och hälsar efter ett bra spel
  if (guestE) {
    const age = tm - guestE.t0;
    const gx = lerp(-10, wxA - 14, age / 5);
    const gl = { ...FALLBACK[guestE.b.n % FALLBACK.length], shirt: 8 };
    person(ctx, gx, fy + 3, gl, age < 5 ? 'walk' : age < 11 ? 'wave' : 'walk', tm, age < 11 ? 1 : -1);
    if (age >= 11) person(ctx, lerp(wxA - 14, -10, (age - 11) / 3), fy + 3, gl, 'walk', tm, -1);
  }
  // en nyanställd kommer in
  const hireE = recent(['hired'], 9, tm)[0];
  if (hireE) {
    const age = tm - hireE.t0;
    person(ctx, lerp(-10, wxA - 30, age / 6), fy + 3, cfg.looks[Math.min(cfg.looks.length - 1, nd + 1)], age < 6 ? 'walk' : 'wave', tm, 1);
  }
  // pratbubblor: händelserna först (över rätt person), annars då och då en av sig själv
  const ev = recent(Object.keys(EMO), 2.6, tm);
  for (const e of ev) {
    const idx = Math.max(0, seat.findIndex((s) => s.id === e.b.s));
    const sp = seat[e.b.s ? idx : e.b.n % seat.length] || seat[0];
    bubble(ctx, sp.x, fy - 31, EMO[e.b.k], tm - e.t0, 2.4, tm);
  }
  if (!ev.length) {
    const era = Math.floor(tm / 5.5);
    if (era % 2 === 0 || crunch) bubble(ctx, seat[era % nd].x, fy - 31, crunch ? 'coffee' : ['bulb', 'heart', 'question'][era % 3], tm - era * 5.5, 2.4, tm);
  }
  // katten sover vid kaffehörnan
  drawCat(ctx, cx - 18, fy + 3, 'sleep', Math.floor(tm * 1.5), 1, 0);
  // ljus: taklampor, och vid övertid mörkare med varmare sken
  if (crunch) darken(ctx, W, 0.22);
  ctx.globalAlpha = crunch ? 0.12 : 0.07;
  for (let i = 0; i < nd; i++) {
    ctx.fillStyle = crunch ? '#ffc060' : '#ffe9a8';
    ctx.beginPath();
    ctx.moveTo(x0 + i * pitch + 14, 0);
    ctx.lineTo(x0 + i * pitch + 40, fy);
    ctx.lineTo(x0 + i * pitch - 10, fy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const e of recent(BIG, 4.6, tm)) confetti(ctx, W, tm - e.t0, e.b.n);
}

// ── Labbet och fabriken ──
function drawBoxedItem(ctx, x, ty, p, col, bad) {
  if (p < 0.34) { // kretskort
    R(ctx, x, ty - 2, 11, 2, '#2f9a5a');
    R(ctx, x, ty - 2, 11, 1, '#4fd080');
    R(ctx, x + 3, ty - 4, 4, 2, '#1c2230');
    R(ctx, x + 8, ty - 3, 2, 1, '#e8c860');
  } else if (p < 0.68) { // skal med lysande skärm
    R(ctx, x, ty - 7, 11, 7, '#8a94aa');
    R(ctx, x, ty - 7, 11, 1, '#c8d0e0');
    R(ctx, x + 1, ty - 6, 7, 4, '#0e1a30');
    R(ctx, x + 2, ty - 5, 5, 1, col);
    R(ctx, x + 2, ty - 3, 3, 1, '#7cf2ff');
  } else { // färdig i kartong
    R(ctx, x, ty - 9, 12, 9, bad ? '#8a4a4a' : '#c49a62');
    R(ctx, x, ty - 9, 12, 1, bad ? '#b86a6a' : '#dcb680');
    R(ctx, x + 5, ty - 9, 2, 9, '#e8dcc0');
    R(ctx, x + 1, ty - 5, 3, 3, bad ? '#ff4a4a' : col);
  }
}
function truck(ctx, x, fy, tm, col) {
  R(ctx, x, fy - 22, 38, 20, '#dfe4f0');
  R(ctx, x, fy - 22, 38, 2, '#ffffff');
  R(ctx, x + 2, fy - 12, 34, 3, col);
  R(ctx, x + 38, fy - 15, 10, 13, '#4a90e0');
  R(ctx, x + 41, fy - 13, 6, 5, '#b8e0ff');
  R(ctx, x, fy - 4, 48, 2, '#2a2f3c');
  for (const wx of [x + 6, x + 32, x + 40]) { R(ctx, wx - 2, fy - 5, 6, 6, '#14161e'); R(ctx, wx, fy - 3, 2, 2, '#8a94aa'); }
  R(ctx, x + 47, fy - 7, 1, 2, Math.floor(tm * 3) % 2 ? '#ffe27a' : '#a08a3a');
}
function drawFactory(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st && cfg.st.open ? cfg.st : { designing: [], testing: [], prod: [], orders: [], fab: 0, lab: 1, crew: [], market: 0 };
  const type0 = (st.orders[0] && st.prod.find((p) => p.id === st.orders[0].p)) || st.prod[0] || st.designing[0] || st.testing[0];
  const col = (type0 && HW_TYPES[type0.type] && HW_TYPES[type0.type].color) || cfg.color || '#4de1d0';
  const short = recent(['hwShort'], 6, tm).length > 0;
  const batch = recent(['hwBatch'], 8, tm).length > 0;
  const leak = recent(['hwLeak'], 6, tm).length > 0;
  R(ctx, 0, 0, W, H, '#1e2534');
  R(ctx, 0, 0, W, 22, '#262f44');
  for (let x = 0; x < W; x += 24) R(ctx, x, 0, 1, H - 12, '#181e2c');
  // höga fabriksfönster
  for (let x = 6; x < W - 10; x += 22) {
    R(ctx, x, 4, 14, 9, '#10162a');
    const lit = V.hash(x * 7) > 0.35 && Math.floor(tm * 0.4 + x) % 7;
    R(ctx, x + 1, 5, 12, 7, lit ? '#f2d98a' : '#162044');
    R(ctx, x + 6, 5, 1, 7, '#10162a');
  }
  // rör med ångläckor
  R(ctx, 0, 19, W, 3, '#5a6478');
  R(ctx, 0, 19, W, 1, '#8a94aa');
  R(ctx, 0, 21, W, 1, '#3a4256');
  for (const px of [Math.round(W * 0.28), Math.round(W * 0.62)]) {
    R(ctx, px - 1, 17, 4, 7, '#7a8498');
    steam(ctx, px + 1, 17, tm + px, 4, 0.55);
  }
  // neonskylt
  R(ctx, Math.round(W / 2 - 21), 3, 42, 12, '#0c1020');
  R(ctx, Math.round(W / 2 - 21), 3, 42, 1, '#3a4256');
  V.neonText(ctx, 'HARDWARE', Math.round(W / 2 - 17), 6, '#ffffff', col, 1);
  // golv med varningslinje
  R(ctx, 0, H - 12, W, 12, '#363d4e');
  for (let x = 0; x < W; x += 6) {
    R(ctx, x, H - 12, 3, 2, '#f2c84a');
    R(ctx, x + 3, H - 12, 3, 2, '#1c212c');
  }
  R(ctx, 0, H - 4, W, 1, '#262c3a');
  // labbänken: skärmen visar hur långt första ritningen har kommit, och lödaren jobbar bara när något ritas
  labBench(ctx, 6, fy, 2);
  const d0 = st.designing[0];
  if (d0) {
    R(ctx, 6 + 11, fy - 20, 12, 1, '#10303a');
    R(ctx, 6 + 11, fy - 20, Math.max(1, Math.round(12 * d0.pct)), 1, '#8aff9a');
  }
  const chief = st.crew.find((c) => c.chief);
  const chiefLook = chief && (cfg.G.staff.find((s) => s.id === chief.id) || {}).look;
  const lab = chiefLook || cfg.looks[0];
  const busy = st.designing.some((p) => !p.paused);
  person(ctx, 6 + 44, fy + 1, lab, busy ? 'fix' : 'notes', tm, -1);
  if (chief) { // chefen märks med en liten guldkrona
    const kx = 6 + 44;
    R(ctx, kx - 3, fy - 36, 7, 1, '#ffd36a');
    R(ctx, kx - 3, fy - 38, 1, 2, '#ffd36a'); R(ctx, kx, fy - 39, 1, 3, '#ffd36a'); R(ctx, kx + 3, fy - 38, 1, 2, '#ffd36a');
  }
  if (busy && Math.floor(tm * 7) % 4 < 2) {
    for (let i = 0; i < 4; i++) {
      const a = (tm * 9 + i * 1.7) % 1;
      R(ctx, Math.round(6 + 38 - a * 6 + Math.sin(i * 5) * 2), Math.round(fy - 15 - a * 5 + a * a * 10), 1, 1, i % 2 ? '#ffe27a' : '#ffffff');
    }
  }
  // provstället: lampan visar om provserien gick fel (röd, rök) eller är klar (grön)
  const tst = st.testing[0];
  if (tst) {
    const tx = 6 + 56;
    R(ctx, tx, fy - 14, 10, 10, '#2a3042');
    R(ctx, tx, fy - 14, 10, 1, '#5a6478');
    R(ctx, tx + 2, fy - 12, 6, 3, '#0e1a30');
    const bad = tst.state === 'fail';
    R(ctx, tx + 3, fy - 17, 4, 3, bad ? (Math.floor(tm * 4) % 2 ? '#ff4a4a' : '#8a2a2a') : '#5cf2a0');
    if (bad) steam(ctx, tx + 5, fy - 17, tm, 3, 0.6, '#555a66');
  }
  // löpande bandet: går fortare med beställningar, långsamt annars, står still vid komponentbrist
  const bx0 = 76;
  const bx1 = W - 82;
  const bw = Math.max(40, bx1 - bx0);
  const ty = fy - 9;
  const pace = short ? 0 : st.orders.length ? 14 : st.prod.length ? 8 : 4;
  const phase = short ? 0 : (tm * pace) % 1e6;
  R(ctx, bx0 - 3, ty, bw + 6, 4, '#2b3040');
  R(ctx, bx0 - 3, ty, bw + 6, 1, '#4a5268');
  for (let x = bx0; x < bx0 + bw; x++) if (((x + Math.floor(phase)) % 6) < 3) R(ctx, x, ty + 1, 1, 2, '#3a4258');
  for (let x = bx0 + 4; x < bx0 + bw; x += 12) { R(ctx, x, ty + 4, 2, 5, '#4a5268'); R(ctx, x - 1, fy - 1, 4, 1, '#1c212c'); }
  const gap = 32;
  const off = short ? 0 : phase % gap;
  for (let kx = -gap; kx < bw + gap; kx += gap) {
    const ix = bx0 + kx + off;
    if (ix < bx0 - 1 || ix > bx0 + bw - 10) continue;
    drawBoxedItem(ctx, Math.round(ix), ty, (ix - bx0) / bw, col, batch);
  }
  // robotarmar: fler med en större fabrik
  const arms = Math.min(3, 1 + (st.fab >> 1));
  for (let a = 0; a < arms; a++) {
    const rx = Math.round(bx0 + bw * (arms === 1 ? 0.4 : 0.2 + (0.6 * a) / (arms - 1)));
    R(ctx, rx - 5, 22, 10, 3, '#4a5268');
    const sw = short ? 0.2 : Math.sin(tm * (pace ? 1.9 : 0.6) + a * 1.3);
    const a1x = rx + Math.round(sw * 6);
    const a1y = 38;
    for (let i = 0; i <= 12; i++) {
      const ax = Math.round(lerp(rx, a1x, i / 12));
      const ay = Math.round(lerp(24, a1y, i / 12));
      R(ctx, ax - 1, ay, 4, 3, '#59627a');
      R(ctx, ax, ay, 2, 2, i % 2 ? '#e8504a' : '#c8d0e0');
    }
    R(ctx, rx - 2, 22, 5, 5, '#e8504a');
    R(ctx, rx - 1, 23, 3, 1, '#ff9a8a');
    R(ctx, a1x - 2, a1y, 5, 3, '#8a94aa');
    R(ctx, a1x, a1y + 3, 1, 2, '#ffe27a');
    if (pace && sw > 0.82 && Math.floor(tm * 20) % 2) {
      R(ctx, a1x - 1, a1y + 5, 3, 1, '#ffffff');
      R(ctx, a1x - 3 + Math.floor(V.hash(Math.floor(tm * 30)) * 6), a1y + 4, 1, 1, '#7cf2ff');
    }
  }
  // kontrollpanel: lamporna blinkar rött vid komponentbrist eller läckta ritningar
  R(ctx, bx0 + bw - 20, ty - 20, 14, 12, '#2a3042');
  R(ctx, bx0 + bw - 19, ty - 19, 12, 5, '#0e1a30');
  R(ctx, bx0 + bw - 18, ty - 17, 6 + Math.floor(Math.sin(tm * 2) * 2 + 2), 1, short || leak ? '#ff6a6a' : '#8aff9a');
  for (let i = 0; i < 3; i++) R(ctx, bx0 + bw - 18 + i * 4, ty - 12, 2, 2, short || leak ? (Math.floor(tm * 4) % 2 ? '#ff4a4a' : '#3a4256') : Math.floor(tm * 2 + i) % 3 === i ? '#ff6a6a' : '#3a4256');
  if (leak && Math.floor(tm * 3) % 2) { // larmlampan
    R(ctx, 3, 24, 5, 4, '#ff4a4a');
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ff4a4a';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  // kvalitetskollen
  person(ctx, bx0 + 20, fy + 2, cfg.looks[1], 'notes', tm, 1, false, 0.5);
  // lagret: lådorna växer med lagersaldot
  const stock = st.prod.reduce((a, p) => a + p.stock, 0);
  const nb = Math.max(1, Math.min(6, 1 + Math.floor(Math.log10(stock + 1) * 1.4)));
  const wh = W - 56;
  for (let b = 0; b < nb; b++) F.boxes(ctx, wh + (b % 3) * 13 - 8, fy - Math.floor(b / 3) * 1 + (b >= 3 ? -1 : 0));
  // bäraren går med lådor till lagret
  const carrier = cfg.looks[2];
  const cyc = 12;
  const k = tm % cyc;
  const ax = bx0 + bw + 2;
  const bxx = wh - 14;
  if (k < 5) person(ctx, lerp(ax, bxx, k / 5), fy + 2, carrier, 'walkBox', tm, 1);
  else if (k < 6) person(ctx, bxx, fy + 2, carrier, 'stand', tm, 1);
  else if (k < 11) person(ctx, lerp(bxx, ax, (k - 6) / 5), fy + 2, carrier, 'walk', tm, -1);
  else person(ctx, ax, fy + 2, carrier, 'stand', tm, 1);
  // en lastbil kör in när en leverans går till lagret
  const tr = recent(['hwParts', 'hwLaunch'], 11, tm)[0];
  if (tr) {
    const age = tm - tr.t0;
    const target = W - 52;
    const x = age < 3 ? lerp(W + 4, target, age / 3) : age < 8 ? target : lerp(target, W + 4, (age - 8) / 3);
    truck(ctx, Math.round(x), fy + 1, tm, col);
  }
  // pratbubblor över bänken och provstället
  const ev = recent(['hwStart', 'hwHalf', 'hwProto', 'hwLeak', 'hwShort', 'hwBatch', 'hwRev'], 2.6, tm);
  for (const e of ev) {
    const bad = (e.b.k === 'hwProto' && !e.b.a) || ['hwLeak', 'hwShort', 'hwBatch'].includes(e.b.k);
    bubble(ctx, e.b.k === 'hwProto' ? 6 + 61 : 6 + 44, fy - 40, bad ? 'exclam' : e.b.k === 'hwProto' ? 'heart' : 'bulb', tm - e.t0, 2.4, tm);
  }
  darken(ctx, W, 0.04, '#ffe9a8');
  for (const e of recent(['hwLaunch', 'hwProto'], 4.6, tm)) if (e.b.k === 'hwLaunch' || e.b.a) confetti(ctx, W, tm - e.t0, e.b.n);
}

// ── Motorrummet ──
function gear(ctx, x, y, r, teeth, ang, col, hub) {
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy));
    R(ctx, x - hw, y + dy, hw * 2 + 1, 1, col);
  }
  for (let i = 0; i < teeth; i++) {
    const a = ang + (i * Math.PI * 2) / teeth;
    R(ctx, Math.round(x + Math.cos(a) * (r + 1)) - 1, Math.round(y + Math.sin(a) * (r + 1)) - 1, 3, 3, col);
  }
  const rr = Math.max(2, Math.floor(r / 2));
  for (let dy = -rr; dy <= rr; dy++) {
    const hw = Math.floor(Math.sqrt(rr * rr - dy * dy));
    R(ctx, x - hw, y + dy, hw * 2 + 1, 1, hub);
  }
  R(ctx, Math.round(x + Math.cos(ang) * rr * 0.6), Math.round(y + Math.sin(ang) * rr * 0.6), 1, 1, '#ffffff');
}
function drawEngine(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { active: false, pct: 0, parts: 0, built: 0 };
  const on = st.active;
  R(ctx, 0, 0, W, H, '#13203a');
  for (let x = 0; x < W; x += 8) R(ctx, x, 0, 1, H - 12, '#192a4a');
  for (let y = 4; y < H - 12; y += 8) R(ctx, 0, y, W, 1, '#192a4a');
  R(ctx, 0, H - 12, W, 12, '#2c3446');
  R(ctx, 0, H - 12, W, 1, '#4a5470');
  R(ctx, 0, H - 4, W, 1, '#1e2434');
  // tavlan med motorns delar: lamporna tänds en och en när bygget framskrider
  const bw = 54;
  R(ctx, 8, 6, bw, 30, '#e9eefb');
  R(ctx, 8, 6, bw, 1, '#ffffff');
  R(ctx, 7, 5, bw + 2, 1, '#6a7488');
  const nb = Math.max(4, Math.min(8, on ? st.parts : st.built ? 6 : 4));
  const lit = on ? Math.round(st.pct * nb) : st.built ? nb : 0;
  for (let i = 0; i < nb; i++) {
    const bx = 11 + (i % 4) * 13;
    const by = 9 + Math.floor(i / 4) * 12;
    const L = i < lit;
    R(ctx, bx, by, 11, 8, L ? '#4de1d0' : '#c4cbe0');
    R(ctx, bx, by, 11, 1, L ? '#9ffff4' : '#e4e9f6');
    R(ctx, bx + 2, by + 3, 7, 1, L ? '#0e4a52' : '#9aa4c0');
    if (i % 4 < 3 && i + 1 < nb) R(ctx, bx + 11, by + 4, 2, 1, '#8a94b0');
  }
  if (on && Math.floor(tm * 2) % 2) R(ctx, 11 + (lit % 4) * 13 + 3, 9 + Math.floor(lit / 4) * 12 + 5, 5, 1, '#ffe27a');
  // motorn: kuggar som snurrar när bygget pågår
  const cx = Math.round(W * 0.5);
  const spd = on ? 1.4 : 0.18;
  const flash = recent(['engine'], 3, tm).length ? Math.floor(tm * 10) % 2 : 0;
  gear(ctx, cx, 28, 11, 10, tm * spd, flash ? '#ffd36a' : '#6a7a9a', '#2a3350');
  gear(ctx, cx + 17, 20, 7, 8, -tm * spd * 1.55 + 0.2, flash ? '#ffe9a8' : '#8a9ab8', '#2a3350');
  gear(ctx, cx - 16, 21, 6, 7, -tm * spd * 1.8, flash ? '#ffe9a8' : '#8a9ab8', '#2a3350');
  R(ctx, cx - 3, 40, 7, 3, '#2a3350');
  R(ctx, cx - 5, 43, 11, 1, '#4a5470');
  if (on) steam(ctx, cx + 22, 14, tm, 3, 0.45);
  if (on && Math.floor(tm * 9) % 3 === 0) R(ctx, cx - 14 + Math.floor(V.hash(Math.floor(tm * 9)) * 28), 12 + Math.floor(V.hash(Math.floor(tm * 7) + 3) * 12), 1, 1, '#ffe27a');
  // serverracken som bygger (lysdioderna blinkar snabbare under bygget)
  for (let r = 0; r < 2; r++) {
    const rx = W - 62 + r * 18;
    F.rack(ctx, rx, fy - 1, 14, 38, r + 3);
    for (let u = 0; u < 8; u++) if (Math.floor(tm * (on ? 6 : 1.5) + u * 1.7 + r) % 3 === 0) R(ctx, rx + 10, fy - 36 + u * 4, 1, 1, '#5cf2a0');
  }
  // teamet: någon pekar på tavlan, en skriver, en står med laptop, en tittar på maskinen
  const own = (st.crew || []).concat((cfg.G.staff || []).filter((s) => !s.away).map((s) => s.look));
  const lk = (i) => own[i] || cfg.looks[i];
  person(ctx, 8 + bw + 8, fy + 1, lk(0), on ? 'present' : 'stand', tm, -1);
  F.desk2(ctx, cx - 70 < 80 ? 76 : cx - 70, fy, 1, 3, 2);
  F.chair2(ctx, (cx - 70 < 80 ? 76 : cx - 70) , fy, '#3a6a5a');
  person(ctx, (cx - 70 < 80 ? 76 : cx - 70) + 3, fy, lk(1), on ? 'type' : 'sitIdle', tm, 1, true, 0.3);
  person(ctx, W - 82, fy + 2, lk(2), on ? 'laptop' : 'stand', tm, 1, false, 0.7);
  person(ctx, cx + 36, fy + 3, lk(3), 'notes', tm, -1, false, 1.1);
  // testkörning: alla serverracken blinkar grönt
  if (recent(['engTest'], 3, tm).length) for (let r = 0; r < 2; r++) for (let u = 0; u < 8; u++) if (Math.floor(tm * 8 + u) % 2) R(ctx, W - 62 + r * 18 + 10, fy - 36 + u * 4, 1, 1, '#9affc0');
  for (const e of recent(['engine'], 4.6, tm)) confetti(ctx, W, tm - e.t0, e.b.n);
  darken(ctx, W, 0.05, '#7cf2ff');
}

// ── Koncernen ──
function drawGroup(ctx, W, tm, cfg) {
  const fy = H - 6;
  const subs = (cfg.st && cfg.st.subs) || [];
  // kvällshimmel och stadens siluett i ett stort fönster
  R(ctx, 0, 0, W, H, '#101a40');
  R(ctx, 0, 14, W, 14, '#1a2858');
  R(ctx, 0, 28, W, 12, '#2a2f6a');
  for (let i = 0; i < Math.floor(W / 14); i++) R(ctx, Math.floor(V.hash(i * 3) * W), 2 + Math.floor(V.hash(i * 7) * 14), 1, 1, Math.floor(tm * 1.3 + i) % 4 ? '#ffffff' : '#6a78b8');
  const nb = Math.floor(W / 12);
  for (let i = 0; i < nb; i++) {
    const bh = 12 + Math.floor(V.hash(i * 5) * 16);
    const bx = i * 12 + 2;
    R(ctx, bx, 40 - bh, 10, bh, '#0c1230');
    for (let k = 0; k < 6; k++) if (V.hash(i * 13 + k) > 0.5 && Math.floor(tm * 0.25 + i + k) % 6) R(ctx, bx + 2 + (k % 2) * 4, 40 - bh + 3 + Math.floor(k / 2) * 4, 2, 2, '#ffd36a');
  }
  // koncernens torn: huvudkontoret i mitten och ett torn per dotterbolag, med lampor som blinkar
  const towers = [{ big: true }, ...subs.slice(0, 6).map((c, i) => ({ c, i }))];
  const tw = 14;
  // tornen står till vänster om bordet så att mötet inte skymmer dem (tätare om det är många eller smalt)
  const room = Math.max(40, Math.round(W * 0.5 - 32) - 12);
  const step = Math.max(9, Math.min(tw + 8, Math.floor((room - tw) / Math.max(1, towers.length - 1))));
  const tx0 = 6;
  const span = step * (towers.length - 1) + tw;
  towers.forEach((tr, k) => {
    const bx = tx0 + k * step;
    const bh = tr.big ? 38 : 20 + Math.floor(V.hash((tr.c ? tr.c.id : 1) * 7) * 12);
    R(ctx, bx, 40 - bh, tw, bh, tr.big ? '#27336a' : '#1d2850');
    R(ctx, bx, 40 - bh, tw, 1, '#5a6ab0');
    R(ctx, bx, 40 - bh, 1, bh, '#3a4a88');
    for (let y = 40 - bh + 3; y < 38; y += 4) for (let x = bx + 2; x < bx + tw - 2; x += 4) if (Math.floor(tm * 0.3 + x + y) % 7) R(ctx, x, y, 2, 2, tr.big ? '#ffe9a8' : '#e8c880');
    R(ctx, bx + Math.floor(tw / 2), 40 - bh - 3, 1, 3, '#8a94aa');
    R(ctx, bx + Math.floor(tw / 2), 40 - bh - 4, 1, 1, Math.floor(tm * 2 + k) % 2 ? '#ff5050' : '#702020');
    const c = tr.c;
    if (c && c.mode === 'int') {
      // integrationen pågår: byggställning som fylls på, och en gul lampa som blinkar
      const sh = Math.round(bh * Math.max(0.15, c.integ));
      for (let y = 40 - sh; y < 40; y += 4) R(ctx, bx - 2, y, tw + 4, 1, '#c9a24a');
      R(ctx, bx - 2, 40 - sh, 1, sh, '#c9a24a');
      R(ctx, bx + tw + 1, 40 - sh, 1, sh, '#c9a24a');
      if (Math.floor(tm * 3 + k) % 2) R(ctx, bx + tw + 1, 40 - sh - 2, 2, 2, '#ffd36a');
    } else if (c && c.ceo) {
      // egen chef: en liten flagga på taket
      R(ctx, bx + 2, 40 - bh - 6, 1, 6, '#aab4c8');
      R(ctx, bx + 3, 40 - bh - 6 + (Math.floor(tm * 2 + k) % 2), 4, 3, '#4de1d0');
    }
    if (c && recent(['grpClash'], 2.5, tm).length && Math.floor(tm * 8 + k) % 3 === 0) R(ctx, bx, 40 - bh, tw, bh, 'rgba(255,80,80,.35)');
  });
  // nytt köp: guldregn över staden
  for (const e of recent(['grpBuy', 'grpDone', 'pubSign', 'licDeal'], 3.6, tm)) {
    const age = tm - e.t0;
    for (let i = 0; i < 14; i++) {
      const hh = V.hash(e.b.n * 13 + i);
      R(ctx, Math.round(tx0 + hh * span), Math.round(4 + age * 12 * (0.5 + V.hash(i + 9)) % 34), 2, 2, i % 2 ? '#ffd36a' : '#fff2b0');
    }
  }
  // helikopter över staden
  const hxx = Math.round(((tm * 10) % (W + 60)) - 30);
  R(ctx, hxx, 10, 8, 3, '#3a4258');
  R(ctx, hxx + 8, 10, 4, 1, '#3a4258');
  R(ctx, hxx - 3 + (Math.floor(tm * 18) % 2) * 5, 8, 10, 1, '#aab4c8');
  R(ctx, hxx + 2, 12, 1, 1, Math.floor(tm * 3) % 2 ? '#ff5050' : '#703030');
  // karmen runt fönstret och golvet
  R(ctx, 0, 40, W, 2, '#12172f');
  R(ctx, 0, 42, W, H - 42, '#2a2236');
  for (let x = 0; x < W; x += 16) R(ctx, x, 42, 1, H - 42, '#201a2c');
  R(ctx, 0, H - 6, W, 6, '#3a2c44');
  // styrelserummet: skärmen med stigande kurva, bordet och mötet
  const scx = W - 52;
  V.wallScreen(ctx, scx, 6, 38, 22, 'chart', 3);
  if (recent(['grpReport', 'grpBiz'], 3, tm).length && Math.floor(tm * 4) % 2) R(ctx, scx - 1, 5, 40, 1, '#ffe27a');
  for (let i = 0; i < 34; i++) R(ctx, scx + 2 + i, 24 - Math.round(i * 0.45 + Math.sin(i * 0.5 + tm) * 1.2), 1, 1, '#8aff9a');
  const tbx = Math.round(W * 0.5 - 32);
  const seats = [tbx + 6, tbx + 22, tbx + 38, tbx + 54];
  const crew = (cfg.G.staff || []).map((s) => s.look);
  seats.forEach((sx, i) => {
    const mtg = recent(['grpReport'], 6, tm).length;
    const pose = mtg || Math.floor((tm + i * 2.3) / 5) % 3 === 0 ? 'talk' : 'stand';
    person(ctx, sx, fy - 1, crew[i] || cfg.looks[i], pose, tm, i % 2 ? -1 : 1, false, i * 0.5);
  });
  F.meetingTable(ctx, tbx, fy + 1, 64);
  for (let i = 0; i < 4; i++) R(ctx, tbx + 6 + i * 16, fy - 18, 4, 3, i % 2 ? '#f4f4ff' : '#9fd6ff');
  // någon presenterar vid skärmen
  person(ctx, scx - 6, fy + 1, crew[4] || cfg.looks[4], 'present', tm, 1);
  // mynt som stiger ur dotterbolagen
  const coins = Math.min(8, 2 + subs.length);
  for (let i = 0; i < coins; i++) {
    const p = (tm * 0.35 + i / coins) % 1;
    const bx = tx0 + (i % Math.max(1, towers.length)) * step + 6;
    ctx.globalAlpha = Math.min(1, (1 - p) * 2);
    R(ctx, bx, Math.round(36 - p * 26), 3, 3, '#ffd36a');
    R(ctx, bx + 1, Math.round(36 - p * 26) + 1, 1, 1, '#fff2b0');
  }
  ctx.globalAlpha = 1;
  for (const e of recent(['party', 'anniv', 'fans', 'film', 'grpDone'], 4.6, tm)) confetti(ctx, W, tm - e.t0, e.b.n);
}
const DRAW = { studio: drawStudio, factory: drawFactory, engine: drawEngine, group: drawGroup };

// ── Timer ──
let timer = 0;
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function tick() {
  if (typeof document === 'undefined' || document.hidden) return;
  const cvs = document.querySelectorAll('canvas.ls-cv');
  if (!cvs.length) return;
  const tm = reduced ? 3 : now();
  for (const cv of cvs) {
    const cw = cv.clientWidth;
    if (!cw) continue;
    const sc = cw >= 640 ? 3 : 2;
    const W = Math.max(120, Math.round(cw / sc));
    if (cv.width !== W) cv.width = W;
    const kind = cv.dataset.ls;
    const cfg = CFG[kind];
    if (!cfg) continue;
    if (tm - cfg.stT > 0.5) {
      cfg.stT = tm;
      refresh(kind, cfg);
      const box = cv.parentNode;
      const cap = box.querySelector('.ls-cap b');
      const txt = caption(kind, cfg);
      if (cap && cap.textContent !== txt) cap.textContent = txt;
      const pr = box.querySelector('.ls-prog');
      if (pr) {
        const st = cfg.st;
        const show = (kind === 'studio' || kind === 'engine') && st && st.active;
        pr.hidden = !show;
        if (show) pr.firstChild.style.width = Math.round(st.pct * 100) + '%';
      }
      // tickern: senaste händelsen i den här scenen, i en rad som tonar bort efter en stund
      const tk = box.querySelector('.ls-tick');
      const sc2 = TICK_SC[kind];
      const last = BEATS.filter((e) => sc2.includes(e.b.sc)).slice(-1)[0];
      if (tk && last && String(last.b.n) !== tk.dataset.seen) {
        tk.dataset.seen = String(last.b.n);
        try {
          tk.textContent = lifeText(last.b);
        } catch {
          tk.textContent = '';
        }
        tk.classList.remove('on');
        void tk.offsetWidth;
        tk.classList.add('on');
      }
    }
    cv.style.height = H * sc + 'px';
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    DRAW[kind](ctx, W, tm, cfg);
  }
}
function start() {
  if (timer || typeof setInterval === 'undefined') return;
  timer = setInterval(tick, reduced ? 1000 : 66);
  setTimeout(tick, 0);
}
