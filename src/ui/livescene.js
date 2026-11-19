// Levande scener i fönstren: en liten pixelbild överst som visar att något händer. Skapa spel visar studion där teamet jobbar,
// Hårdvara visar labbet och fabriken. Personerna är studions egen personal med spelets figur. Scenerna visar spelets verkliga
// läge (sim/life.js lifeState: vem som sitter vid skärmarna, övertid, buggar, hur långt projektet har kommit, vilka produkter som
// ritas, tillverkas och beställs) och reagerar på händelserna ('life' på bussen) med pratbubblor, jubel, konfetti, pizza, gäster,
// lastbilar och en tickerrad. Allt ritas av tiden (inga tillstånd i bilden), så scenen överlever att fönstret ritas om.
// En enda timer ritar alla synliga scenbilder och den står still när fönstret är dolt.
import { t } from './core.js';
import { drawText } from '../render/font.js';
import { getSprite } from '../render/sprites.js';
import { hwArtKey } from '../render/hwart.js';
import { yearOf } from '../sim/const.js';
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
import { fmtNum } from '../core/util.js';
import { topSellers } from '../sim/market.js';

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
const BIG = ['launch', 'done', 'sold', 'chart', 'disc', 'party', 'anniv', 'engine', 'fans', 'hwLaunch', 'wedding', 'dreamDone'];

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
  shop: (G) => lifeState(G, 'store'),
  market: (G) => {
    let top = [];
    try { top = topSellers(G, 12, 5); } catch { top = []; }
    return { top, looks: (G.staff || []).filter((x) => !x.away).map((x) => x.look) };
  },
  hall: (G) => {
    const h = lifeState(G, 'hall');
    return { ...h, games: (G.games || []).slice(-8).map((g) => ({ id: g.id, score: g.score || 0 })), n: (G.games || []).length, fans: G.fans || 0 };
  },
  crisis: (G) => ({ ...lifeState(G, 'crisis'), looks: (G.staff || []).filter((x) => !x.away).map((x) => x.look) }),
  war: (G) => ({ ...lifeState(G, 'war'), looks: (G.staff || []).filter((x) => !x.away).map((x) => x.look) }),
  press: (G) => lifeState(G, 'press'),
  history: (G) => lifeState(G, 'history'),
  react: (G) => lifeState(G, 'react'),
  fans: (G) => lifeState(G, 'fans'),
  expo: (G) => ({ ...lifeState(G, 'expo'), looks: (G.staff || []).filter((x) => !x.away).map((x) => x.look) }),
  bank: (G) => ({ money: G.money, hist: (G.hist && G.hist.cash ? G.hist.cash.slice(-40).map((p) => p.v) : []), looks: (G.staff || []).filter((x) => !x.away).map((x) => x.look) }),
  live: (G, cfg) => {
    const l = lifeState(G, 'live');
    const g = l.games.find((x) => x.id === cfg.gid) || l.games[0] || null;
    return { ...l, g };
  },
  lab: (G) => {
    const l = lifeState(G, 'lab');
    const staff = (G.staff || []).filter((x) => !x.away).map((x) => x.look);
    return { ...l, looks: staff };
  },
};
const TICK_SC = { studio: ['dev', 'studio'], factory: ['hw'], engine: ['eng'], group: ['group'], lab: ['lab'], shop: ['store'], live: ['live'], bank: ['dev', 'studio'], market: ['dev'], hall: ['hall'], crisis: ['crisis'], war: ['hw'], expo: ['expo'], press: ['press'], fans: ['fans'], history: ['staff'], react: ['world'] };
const LOG_SC = { studio: 'dev', factory: 'hw', engine: 'eng', group: 'group', lab: 'lab', shop: 'store', live: 'live', bank: 'studio', market: 'dev', hall: 'hall', crisis: 'crisis', war: 'hw', expo: 'expo', press: 'press', fans: 'fans', history: 'staff', react: 'world' };
function refresh(kind, cfg) {
  try {
    cfg.st = STATE[kind](cfg.G, cfg);
  } catch {
    cfg.st = null;
  }
}
function caption(kind, cfg) {
  const st = cfg.st;
  if (kind === 'studio') return !st ? t('ls.studio') : st.active ? t('ls.studio.on', { title: st.title || '…' }) : st.report ? t('ls.studio.report') : t('ls.studio.idle');
  if (kind === 'engine') return st && st.active ? t('ls.engine.on', { name: st.name }) : st && st.team ? t('ls.engine.team', { team: st.team.name }) : t('ls.engine');
  if (kind === 'history') return !st || !st.wall.length ? t('ls.hist.none') : t('ls.hist', { n: st.wall.length });
  if (kind === 'react') return !st ? t('ls.react') : st.coming.length ? t('ls.react.coming', { n: st.coming.length }) : t('ls.react');
  if (kind === 'press') return !st || !st.issue ? t('ls.press.none') : t('ls.press', { n: st.issue.n });
  if (kind === 'fans') return !st || !st.games.length ? t('ls.fans.none') : st.hot ? t('ls.fans.hot') : st.angry ? t('ls.fans.angry') : t('ls.fans', { n: st.games.length });
  if (kind === 'market') return t('ls.market');
  if (kind === 'expo') return !st || !st.open ? t('ls.expo.locked') : st.next > 0 ? t('ls.expo.next', { n: st.next }) : t('ls.expo.on');
  if (kind === 'war') return !st || !st.opp ? t('ls.war.none') : st.supply && st.supply.short ? t('ls.war.short', { name: st.supply.short.partner }) : st.patent && st.patent.on ? t('ls.war.patent', { name: st.opp.maker }) : t(['ls.war.0', 'ls.war.1', 'ls.war.2', 'ls.war.3'][st.level] || 'ls.war.0', { name: st.opp.maker });
  if (kind === 'crisis') return !st || !st.rival ? t('ls.crisis.none') : t(['ls.crisis.0', 'ls.crisis.1', 'ls.crisis.2', 'ls.crisis.3'][st.level] || 'ls.crisis.0', { name: st.rival.name });
  if (kind === 'hall') return !st || !st.n ? t('ls.hall.empty') : st.ach ? t('ls.hall.ach', { n: st.n, a: st.ach, m: st.total }) : t('ls.hall', { n: st.n });
  if (kind === 'bank') return !st ? t('ls.bank') : st.money < 0 ? t('ls.bank.red') : t('ls.bank');
  if (kind === 'live') return !st || !st.g ? t('ls.live') : st.g.world && st.g.world.final ? t('ls.live.final') : st.g.world && st.g.world.feud ? t('ls.live.feud', { a: st.g.world.feud.a, b: st.g.world.feud.b }) : st.g.ops && !st.g.event ? t('ls.live.ops') : st.g.event ? t('ls.live.ev') : st.g.patch ? t('ls.live.patch') : st.g.season ? t('ls.live.season') : t('ls.live.on', { n: fmtNum(st.g.subs) });
  if (kind === 'shop') return !st || !st.open ? t('ls.shop') : st.paused ? t('ls.shop.closed') : st.ev ? t('ls.shop.ev', { name: st.ev }) : t('ls.shop.on');
  if (kind === 'lab') return st && st.active.length ? t('ls.lab.on', { n: st.active.length }) : t('ls.lab');
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
// Små figurer för personalens liv
const heart = (ctx, x, y, c) => { R(ctx, x, y, 1, 1, c); R(ctx, x + 2, y, 1, 1, c); R(ctx, x, y + 1, 3, 1, c); R(ctx, x + 1, y + 2, 1, 1, c); };
const brokenHeart = (ctx, x, y, c, dx) => { R(ctx, x - dx, y, 1, 1, c); R(ctx, x - dx, y + 1, 2, 1, c); R(ctx, x + 2 + dx, y, 1, 1, c); R(ctx, x + 1 + dx, y + 1, 2, 1, c); R(ctx, x + 1, y + 2, 1, 1, c); };
const sparkle = (ctx, x, y, c) => { R(ctx, x, y - 1, 1, 3, c); R(ctx, x - 1, y, 3, 1, c); };
function cake(ctx, x, y, tm) {
  R(ctx, x - 1, y, 11, 1, '#e8ecf8');
  R(ctx, x, y - 4, 9, 4, '#e86a9a');
  R(ctx, x, y - 5, 9, 1, '#fff2f8');
  R(ctx, x + 2, y - 3, 1, 1, '#fff2f8'); R(ctx, x + 6, y - 2, 1, 1, '#fff2f8');
  for (const cx of [x + 2, x + 4, x + 6]) { R(ctx, cx, y - 7, 1, 2, '#6ad0ff'); R(ctx, cx, y - 8 - (Math.floor(tm * 6 + cx) % 2), 1, 1, '#ffd84a'); }
}
function balloons(ctx, x, y, tm, seed) {
  const cols = ['#ff5a7a', '#ffd84a', '#4ab8ff', '#7adf8a'];
  for (let i = 0; i < 3; i++) {
    const bx = x + i * 5 - 4 + Math.round(Math.sin(tm * 1.3 + i + seed) * 1.2);
    const by = y - 3 - (i % 2) * 4;
    R(ctx, bx, by, 4, 5, cols[(i + seed) % 4]);
    R(ctx, bx + 1, by - 1, 2, 1, cols[(i + seed) % 4]);
    R(ctx, bx + 1, by + 1, 1, 1, '#ffffff');
    R(ctx, bx + 2, by + 5, 1, 8, '#c8d0e0');
  }
}
function garland(ctx, W, tm) {
  const cols = ['#ff5a7a', '#ffd84a', '#4ab8ff', '#7adf8a', '#c08aff'];
  for (let x = 0; x < W; x += 5) {
    const sy = 1 + Math.round(Math.sin(x / 14) * 2 + 2);
    R(ctx, x, sy, 5, 1, '#c8d0e0');
    const c = cols[(x / 5) % cols.length];
    R(ctx, x + 1, sy + 1, 3, 2, c);
    R(ctx, x + 2, sy + 3, 1, 1, c);
  }
}
const EMO = { idea: 'bulb', bug: 'exclam', fix: 'heart', tired: 'sweat', crunch: 'coffee', relax: 'heart', pizza: 'heart', phase: 'bulb', half: 'bulb', quarter: 'bulb', almost: 'exclam', launch: 'heart', hired: 'heart', visitor: 'question', contract: 'heart', birthday: 'heart', hangover: 'sweat', friends: 'heart', couple: 'heart', wedding: 'heart', breakup: 'sweat', miss: 'question', headhunt: 'exclam', dream: 'bulb', dreamGo: 'heart', dreamNo: 'sweat', dreamDone: 'heart', dreamQuit: 'sweat' };

// ── Dag, natt och väder ──
// Vädret räknas ut ur spelets datum (ingen slump i simen): årstiden följer veckan på året och dagens väder en hash av veckan. Dygnet är bara utseende och går
// ett varv på ett par minuter. Övertid håller natten kvar i studions fönster.
const SEASON_W = 12;
export function skyOf(G, tm, night = false) {
  const t0 = (G && G.t) || 0;
  const season = Math.floor((((t0 % 48) + 48) % 48) / SEASON_W);
  const r = V.hash(t0 * 7 + 3);
  const kind =
    season === 0 ? (r < 0.4 ? 'snow' : r < 0.55 ? 'fog' : 'clear')
    : season === 1 ? (r < 0.35 ? 'rain' : r < 0.5 ? 'fog' : 'clear')
    : season === 2 ? (r < 0.12 ? 'rain' : r < 0.17 ? 'storm' : 'clear')
    : r < 0.4 ? 'rain' : r < 0.55 ? 'fog' : 'clear';
  const phase = (tm / 80 + 0.3) % 1;
  const light = night ? 0 : Math.max(0, Math.min(1, Math.sin(phase * Math.PI * 2 - Math.PI / 2) * 0.7 + 0.5));
  return { season, kind, phase, light };
}
const mixc = (a, b, k) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (sh) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};
// Nederbörd i ett fönster eller över en utomhusbild (x0..x1, y0..y1)
function precip(ctx, x0, y0, x1, y1, sky, tm, seed = 0) {
  const w = x1 - x0, h = y1 - y0;
  if (sky.kind === 'rain' || sky.kind === 'storm') {
    ctx.globalAlpha = 0.7;
    const n = Math.max(6, Math.round((w * h) / 90));
    for (let i = 0; i < n; i++) {
      const x = x0 + Math.floor(V.hash(i * 3 + seed) * w);
      const y = y0 + Math.floor(((tm * 34 + V.hash(i * 7 + seed) * h) % h));
      R(ctx, x, y, 1, 2, '#9ab4e8');
    }
    ctx.globalAlpha = 1;
    if (sky.kind === 'storm' && Math.floor(tm * 1.7 + seed) % 7 === 0) { ctx.globalAlpha = 0.3; R(ctx, x0, y0, w, h, '#ffffff'); ctx.globalAlpha = 1; }
  } else if (sky.kind === 'snow') {
    const n = Math.max(6, Math.round((w * h) / 70));
    for (let i = 0; i < n; i++) {
      const x = x0 + Math.floor(((V.hash(i * 3 + seed) * w + Math.sin(tm * 0.8 + i) * 2 + w) % w));
      const y = y0 + Math.floor(((tm * 7 + V.hash(i * 7 + seed) * h) % h));
      R(ctx, x, y, 1, 1, '#ffffff');
    }
  } else if (sky.kind === 'fog') {
    ctx.globalAlpha = 0.28;
    R(ctx, x0, y0 + Math.floor(h * 0.45), w, Math.ceil(h * 0.55), '#c8d0e0');
    ctx.globalAlpha = 1;
  }
}

function drawStudio(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { active: false, crunch: false, bugs: 0, crew: [] };
  const crunch = !!st.crunch && st.active;
  R(ctx, 0, 0, W, H, '#1a2044');
  R(ctx, 0, 30, W, H - 40, '#212a58');
  R(ctx, 0, H - 13, W, 2, '#12172f');
  // fönster mot gatan: dygnet, årstiden och dagens väder (övertid håller natten kvar)
  const sky = skyOf(cfg.G, tm, crunch);
  const day = sky.light;
  const skyTop = mixc('#0f1a42', sky.kind === 'clear' ? '#78b4f0' : '#8a98b8', day);
  const skyLow = mixc('#15235a', day > 0.35 && day < 0.65 ? '#f0a860' : sky.kind === 'clear' ? '#b4d8f8' : '#a8b4c8', day);
  const nw = Math.max(2, Math.floor((W - 90) / 80));
  for (let i = 0; i < nw; i++) {
    const wx = Math.round(14 + ((W - 100) * (i + 0.5)) / nw) - 14;
    R(ctx, wx - 1, 4, 30, 24, '#0c1028');
    R(ctx, wx, 5, 28, 22, skyTop);
    R(ctx, wx, 17, 28, 10, skyLow);
    if (day < 0.4) for (let k = 0; k < 6; k++) {
      const sx = wx + 2 + Math.floor(V.hash(i * 9 + k) * 24);
      const sy = 6 + Math.floor(V.hash(i * 5 + k + 3) * 10);
      R(ctx, sx, sy, 1, 1, sky.kind === 'clear' ? (Math.floor(tm * 1.5 + k) % 3 ? '#ffffff' : '#7a88c8') : '#4a5278');
    }
    for (let k = 0; k < 7; k++) {
      const bh = 4 + Math.floor(V.hash(i * 11 + k) * 8);
      R(ctx, wx + k * 4, 27 - bh, 4, bh, day > 0.5 ? '#5a6a90' : '#0a0f2a');
      if (day < 0.5 && V.hash(i * 3 + k) > 0.45 && Math.floor(tm * 0.3 + k + i) % 5) R(ctx, wx + k * 4 + 1, 27 - bh + 2, 1, 1, '#ffd36a');
    }
    if (i === 0 && sky.kind === 'clear') { if (day > 0.5) R(ctx, wx + 6, 8, 4, 4, '#fff2a0'); else R(ctx, wx + 20, 7, 3, 3, '#f6f2d8'); }
    precip(ctx, wx, 5, wx + 28, 27, sky, tm, i * 11);
    if (sky.kind === 'snow') R(ctx, wx - 1, 27, 30, 2, '#e8f0ff');
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
  // personalens liv (händelser från folket): vem som är bakis, firas eller går ut med en kartong just nu
  const hangE = recent(['hangover'], 12, tm)[0];
  const bdE = recent(['birthday'], 9, tm)[0];
  const dreamE = recent(['dream', 'dreamGo', 'dreamDone'], 8, tm)[0];
  const hhE = recent(['headhunt'], 16, tm)[0];
  const quitE = recent(['dreamQuit'], 14, tm)[0];
  const poseFor = (id) => {
    if (!id) return null;
    if (hangE && (hangE.b.s === id || hangE.b.s2 === id)) return 'tired';
    if (bdE && bdE.b.s === id && tm - bdE.t0 < 6) return 'cheer';
    if (dreamE && dreamE.b.s === id && dreamE.b.k !== 'dream') return 'cheer';
    return null;
  };
  const gone = (id) => {
    if (!id) return false;
    const x = (hhE && hhE.b.v === 2 && hhE.b.s === id && tm - hhE.t0 > 8) || (quitE && quitE.b.s === id && tm - quitE.t0 > 6);
    return !!x;
  };
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
    const pose = poseFor(c && c.id) || (cheer ? 'cheer' : tired && st.active ? 'tired' : st.active ? (typing ? 'type' : 'think') : Math.floor((tm + i * 5) / 7) % 3 === 0 ? 'read' : 'sitIdle');
    if (!gone(c && c.id)) person(ctx, dx + 3 + 3, fy, look, pose, tm, 1, true, i * 0.37);
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
  // personalens liv: fest, födelsedag, vänner, par, bröllop, bakis, rekryterare och drömmar
  const seatOf = (id, n) => seat.find((q) => id && q.id === id) || seat[n % seat.length] || seat[0];
  const partyE = recent(['party', 'wedding', 'anniv'], 12, tm)[0];
  if (partyE) garland(ctx, W, tm);
  if (bdE) {
    const sp = seatOf(bdE.b.s, bdE.b.n);
    cake(ctx, sp.x + 8, fy - 11, tm);
    balloons(ctx, sp.x + 26, fy - 30, tm, bdE.b.n);
  }
  if (partyE && partyE.b.k === 'party') balloons(ctx, Math.round(W * 0.5), fy - 26, tm, 1);
  const pairE = recent(['friends', 'couple', 'wedding', 'breakup', 'miss'], 7, tm)[0];
  if (pairE && seat.length > 1) {
    const age = tm - pairE.t0;
    const sa = seatOf(pairE.b.s, 0);
    let sb = seatOf(pairE.b.s2, 1);
    if (sb === sa) sb = seat.find((q) => q !== sa) || sb;
    const mx = Math.round((sa.x + sb.x) / 2);
    const k = pairE.b.k;
    if (k === 'friends') {
      sparkle(ctx, mx, fy - 30 - Math.round(Math.sin(age * 4)), '#ffe27a');
      bubble(ctx, sb.x, fy - 31, 'heart', age, 2.4, tm);
    } else if (k === 'couple' || k === 'wedding') {
      for (let i = 0; i < 5; i++) {
        const ph = (age * 0.5 + i * 0.2) % 1;
        heart(ctx, mx - 6 + Math.round(Math.sin(i * 2.1 + age * 2) * 6), Math.round(fy - 20 - ph * 22), i % 2 ? '#ff6a9a' : '#ff9ac0');
      }
      bubble(ctx, sb.x, fy - 31, 'heart', age, 2.4, tm);
    } else if (k === 'breakup') {
      brokenHeart(ctx, mx, fy - 32, '#ff5a7a', Math.min(3, Math.floor(age)));
      bubble(ctx, sb.x, fy - 31, 'sweat', age, 2.4, tm);
    } else if (k === 'miss') {
      R(ctx, sa.x + 9, fy - 14, 4, 5, '#e8dcc0');
      R(ctx, sa.x + 10, fy - 13, 2, 3, '#7a6a8a');
    }
  }
  // en bakis efter releasefesten: en tom burk och lite ånga från krukan
  if (hangE) for (const id of [hangE.b.s, hangE.b.s2]) {
    const sp = seatOf(id, hangE.b.n);
    R(ctx, sp.x + 6, fy - 14, 3, 3, '#7a8aa0');
    steam(ctx, sp.x + 7, fy - 15, tm + id, 2, 0.4);
  }
  // drömmar: gnistor kring den som drömmer
  if (dreamE) {
    const sp = seatOf(dreamE.b.s, dreamE.b.n);
    for (let i = 0; i < 4; i++) if (Math.floor(tm * 3 + i) % 3) sparkle(ctx, sp.x - 8 + i * 6, fy - 36 - (i % 2) * 5, i % 2 ? '#fff2a0' : '#7cf2ff');
  }
  // rivalens rekryterare på besök (v 0 ringer, 1 får nej, 2 får ja) och den som slutar med en kartong
  if (hhE) {
    const age = tm - hhE.t0;
    const sp = seatOf(hhE.b.s, hhE.b.n);
    const suit = { skin: 1, hair: 0, hairColor: 0, shirt: 14, pants: 0, acc: 0, body: 0 };
    const tx = sp.x + 24;
    if (hhE.b.v === 0) {
      // telefonen ringer vid skrivbordet
      R(ctx, sp.x + 8, fy - 14, 4, 2, '#222a3a');
      if (Math.floor(tm * 6) % 2) { R(ctx, sp.x + 7, fy - 17, 1, 2, '#ffd84a'); R(ctx, sp.x + 13, fy - 17, 1, 2, '#ffd84a'); }
    } else {
      const inX = lerp(-10, tx, Math.min(1, age / 5));
      if (age < 5) person(ctx, inX, fy + 3, suit, 'walk', tm, 1);
      else if (age < 9) { person(ctx, tx, fy + 3, suit, 'talk', tm, 1); R(ctx, tx + 8, fy - 8 + (Math.floor(tm * 3) % 2), 3, 2, '#ffffff'); }
      else if (hhE.b.v === 1) person(ctx, lerp(tx, -10, Math.min(1, (age - 9) / 5)), fy + 3, suit, 'walk', tm, -1);
      else {
        person(ctx, lerp(tx, -10, Math.min(1, (age - 9) / 5)), fy + 3, suit, 'walk', tm, -1);
        const gl = (cfg.G.staff.find((q) => q.id === hhE.b.s) || {}).look || FALLBACK[0];
        person(ctx, lerp(tx - 12, -4, Math.min(1, (age - 9) / 5)), fy + 3, gl, 'walkCup', tm, -1);
      }
    }
  }
  if (quitE) {
    const age = tm - quitE.t0;
    if (age > 6) {
      const gl = (cfg.G.staff.find((q) => q.id === quitE.b.s) || {}).look || FALLBACK[1];
      const sp = seatOf(quitE.b.s, quitE.b.n);
      const bx = lerp(sp.x - 6, -10, Math.min(1, (age - 6) / 7));
      person(ctx, bx, fy + 3, gl, 'walkCup', tm, -1);
      R(ctx, Math.round(bx) + 2, fy - 9, 7, 5, '#c49a62');
    }
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
function drawBoxedItem(ctx, x, ty, p, col, bad, art = null) {
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
  } else if (art && !bad) { // färdig produkt: modellen (64 px halverad)
    const was = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art.c, 0, 0, art.fw, art.fh, x - 10, ty - 32, 32, 32);
    ctx.imageSmoothingEnabled = was;
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
  const art = type0 && HW_TYPES[type0.type] ? getSprite(hwArtKey(type0.type, yearOf(type0.t ?? cfg.G.t), type0.id)) : null;
  const gap = 32;
  const off = short ? 0 : phase % gap;
  for (let kx = -gap; kx < bw + gap; kx += gap) {
    const ix = bx0 + kx + off;
    if (ix < bx0 - 1 || ix > bx0 + bw - 10) continue;
    drawBoxedItem(ctx, Math.round(ix), ty, (ix - bx0) / bw, col, batch, art);
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

// ── Forskningslabbet ──
function drawLab(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { lab: 0, active: [], done: 0, teams: 0, looks: [] };
  const act = st.active;
  const on = act.length > 0;
  R(ctx, 0, 0, W, H, '#16303a');
  for (let x = 0; x < W; x += 12) R(ctx, x, 0, 1, H - 12, '#1b3844');
  R(ctx, 0, H - 12, W, 12, '#2a3a46');
  R(ctx, 0, H - 12, W, 1, '#5a7686');
  R(ctx, 0, H - 4, W, 1, '#1c2a34');
  // bokhylla
  R(ctx, 6, 6, 28, 30, '#3a2a20');
  for (let r = 0; r < 3; r++) {
    R(ctx, 7, 7 + r * 10, 26, 9, '#241a14');
    for (let b = 0; b < 8; b++) R(ctx, 8 + b * 3, 8 + r * 10 + (b % 3), 2, 8 - (b % 3), ['#e8504a', '#4a90e0', '#f2c84a', '#6cc86a', '#b46bff'][(b + r) % 5]);
  }
  // tavlan med formler och en atom som snurrar
  const bx = 42;
  R(ctx, bx, 6, 56, 30, '#e9eefb');
  R(ctx, bx - 1, 5, 58, 1, '#6a7488');
  for (let i = 0; i < 4; i++) R(ctx, bx + 4, 10 + i * 5, 14 + ((i * 7) % 9), 1, '#5a6a9a');
  const ax = bx + 40, ay = 21;
  R(ctx, ax - 1, ay - 1, 3, 3, '#e8504a');
  for (let o = 0; o < 3; o++) {
    const a = tm * (on ? 2.2 : 0.6) + (o * Math.PI) / 3;
    for (let k = 0; k < 2; k++) {
      const q = a + k * Math.PI;
      R(ctx, Math.round(ax + Math.cos(q) * 11 * Math.cos(o)), Math.round(ay + Math.sin(q) * 5 + Math.cos(q) * 6 * Math.sin(o)), 2, 2, '#4a90e0');
    }
  }
  // provrör på väggen: ett per pågående forskning, de fylls när den närmar sig mål
  const tubes = Math.max(1, Math.min(3, st.lab >= 3 ? 3 : st.lab >= 2 ? 2 : 1));
  const tx0 = Math.round(W * 0.5) - 8;
  for (let i = 0; i < tubes; i++) {
    const x = tx0 + i * 9;
    R(ctx, x, 8, 6, 22, '#0c1c24');
    R(ctx, x, 8, 6, 1, '#7a98a8');
    const a = act[i];
    const lvl = a ? Math.max(1, Math.round(20 * a.pct)) : 0;
    const col = ['#4de1d0', '#ff7ab8', '#ffd36a'][i % 3];
    if (lvl) {
      R(ctx, x + 1, 29 - lvl, 4, lvl, col);
      R(ctx, x + 1, 29 - lvl, 4, 1, '#ffffff');
      for (let b = 0; b < 2; b++) {
        const p = (tm * 0.8 + b * 0.5 + i * 0.3) % 1;
        R(ctx, x + 2 + b, Math.round(28 - p * lvl), 1, 1, '#ffffff');
      }
    }
  }
  // bänken med kolvar som bubblar och ångar medan forskningen pågår
  const bench = Math.round(W * 0.5) + 28;
  labBench(ctx, bench, fy, Math.max(1, Math.min(3, st.lab || 1)));
  if (on) {
    steam(ctx, bench + 5, fy - 22, tm, 3, 0.5, '#9fffe0');
    steam(ctx, bench + 14, fy - 18, tm + 1, 2, 0.4, '#ffb0d8');
  }
  // teamet: en antecknar vid tavlan, en vid bänken, en granskar proverna
  const lk = (i) => (st.looks && st.looks[i]) || cfg.looks[i];
  person(ctx, bx + 24, fy + 1, lk(0), on ? 'notes' : 'stand', tm, 1, false, 0.2);
  person(ctx, bench - 8, fy + 1, lk(1), on ? 'laptop' : 'stand', tm, 1, false, 0.9);
  person(ctx, bench + 50, fy + 2, lk(2), 'talk', tm, -1, false, 1.4);
  // klar forskning: glödlampa och konfetti
  for (const e of recent(['research'], 4.6, tm)) {
    bubble(ctx, bx + 28, fy - 24, 'bulb', tm - e.t0, 2.6, tm);
    confetti(ctx, W, tm - e.t0, e.b.n);
  }
  darken(ctx, W, 0.04, '#7cffd8');
}

// ── Butiken ──
function drawShop(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st && cfg.st.open ? cfg.st : { lvl: 1, spots: 0, deals: 0, bundles: 0, ev: null, team: null, paused: false };
  const lvl = Math.max(1, Math.min(6, st.lvl));
  const sale = st.deals + st.bundles + st.spots > 0;
  const down = recent(['shopDown'], 8, tm).length > 0 || st.paused;
  const event = !!st.ev;
  R(ctx, 0, 0, W, H, event ? '#2a1c40' : '#1f2a3e');
  for (let x = 0; x < W; x += 10) R(ctx, x, 0, 1, H - 12, event ? '#33224e' : '#26334a');
  R(ctx, 0, H - 12, W, 12, '#3a3448');
  R(ctx, 0, H - 12, W, 1, '#6a5a80');
  for (let x = 0; x < W; x += 14) R(ctx, x, H - 11, 1, 11, '#2e2a3c');
  R(ctx, 0, H - 4, W, 1, '#241f30');
  // skylt
  const sx = Math.round(W * 0.5 - 24);
  R(ctx, sx, 3, 48, 13, '#0c1020');
  R(ctx, sx, 3, 48, 1, '#3a4256');
  if (!down || Math.floor(tm * 2) % 2) V.neonText(ctx, 'STORE', sx + 8, 6, '#ffffff', event ? '#ff7ab8' : '#4de1d0', 1);
  // vimplar vid temaveckor
  if (event) for (let x = 0; x < W; x += 6) {
    R(ctx, x, 1 + (x % 12 ? 1 : 0), 3, 3, ['#ff6a8a', '#ffe27a', '#7cf2ff', '#8aff9a'][(x / 6) % 4 | 0]);
  }
  // hyllor med spelaskar: fler ju högre nivå
  const nShelf = Math.min(4, 1 + Math.ceil(lvl / 2));
  const shelfW = Math.min(46, Math.round((W - 120) / Math.max(1, nShelf)) - 2);
  for (let k = 0; k < nShelf; k++) {
    const x = 8 + k * (shelfW + 4);
    if (x + shelfW > sx - 4 && x < sx + 52) continue;
    R(ctx, x, 20, shelfW, 24, '#3a2a20');
    for (let r = 0; r < 2; r++) {
      R(ctx, x + 1, 21 + r * 11, shelfW - 2, 10, '#241a14');
      for (let b = 0; b < Math.floor((shelfW - 3) / 4); b++) R(ctx, x + 2 + b * 4, 22 + r * 11 + (b % 2), 3, 9 - (b % 2), ['#e8504a', '#4a90e0', '#f2c84a', '#6cc86a', '#b46bff', '#ff7ab8'][(b + r + k) % 6]);
    }
  }
  // rea: skyltar och prisbrickor blinkar
  if (sale) {
    const bx = W - 70;
    R(ctx, bx, 18, 30, 12, '#e8504a');
    R(ctx, bx, 18, 30, 1, '#ff9a8a');
    if (Math.floor(tm * 2) % 2) V.neonText(ctx, '-%', bx + 10, 21, '#ffffff', '#ff4a3c', 1);
  }
  // disken med kassa
  const cx = Math.round(W * 0.5 + 6);
  R(ctx, cx, fy - 14, 52, 14, '#8a4ac8');
  R(ctx, cx, fy - 14, 52, 1, '#b684e8');
  R(ctx, cx - 1, fy - 16, 54, 3, '#e8d8b8');
  R(ctx, cx - 1, fy - 16, 54, 1, '#fff4dc');
  for (let i = 0; i < 4; i++) R(ctx, cx + 4 + i * 13, fy - 11, 9, 9, '#7a3cb8');
  R(ctx, cx + 36, fy - 24, 10, 8, '#2a2f3c');
  R(ctx, cx + 37, fy - 23, 8, 4, '#10303a');
  R(ctx, cx + 38, fy - 22, 3, 1, '#8aff9a');
  // kassör
  person(ctx, cx + 24, fy - 1, cfg.looks[0], down ? 'sitIdle' : 'type', tm, 1, true, 0.4);
  // kunder går in, tittar och går ut med en kasse; fler ju fler kunder (butiksnivå, rea och tema)
  const crowd = Math.min(5, down ? 0 : 1 + Math.floor(lvl / 2) + (sale ? 1 : 0) + (event ? 1 : 0));
  for (let i = 0; i < crowd; i++) {
    const period = 12 + i * 2.3;
    const k = (tm + i * 4.7) % period;
    const look = cfg.looks[(i + 1) % cfg.looks.length];
    const xa = 6 + (i * 37) % Math.max(20, cx - 30);
    if (k < 3) person(ctx, lerp(-8, xa, k / 3), fy + 2 + (i % 2), look, 'walk', tm, 1, false, i);
    else if (k < 8) person(ctx, xa, fy + 2 + (i % 2), look, 'notes', tm, 1, false, i);
    else if (k < 10) person(ctx, lerp(xa, cx - 4, (k - 8) / 2), fy + 2 + (i % 2), look, 'walk', tm, 1, false, i);
    else person(ctx, lerp(cx - 4, W + 8, (k - 10) / (period - 10)), fy + 2 + (i % 2), look, 'walk', tm, 1, false, i);
  }
  if (down) for (let i = 0; i < 3; i++) R(ctx, 8 + i * 10, 8, 6, 6, Math.floor(tm * 4 + i) % 2 ? '#ff5050' : '#702020');
  for (const e of recent(['shopLevel', 'shopRecord', 'shopTop', 'shopUsers'], 4.6, tm)) confetti(ctx, W, tm - e.t0, e.b.n);
  darken(ctx, W, 0.04, '#ffd0ff');
}

// ── Onlinespelet ──
function drawLive(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { g: null, server: 1 };
  const g = st.g || { subs: 0, fresh: 50, season: false, patch: false, event: false, region: false, ops: false };
  const down = recent(['liveDown'], 8, tm).length > 0;
  const subs = g.subs;
  // natthimmel, berg och spelets värld
  R(ctx, 0, 0, W, H, '#0e1634');
  R(ctx, 0, 14, W, 10, '#162248');
  R(ctx, 0, 24, W, 12, '#1f2c5a');
  for (let i = 0; i < Math.floor(W / 12); i++) R(ctx, Math.floor(V.hash(i * 5) * W), 2 + Math.floor(V.hash(i * 11) * 16), 1, 1, Math.floor(tm * 1.2 + i) % 4 ? '#ffffff' : '#6a78b8');
  for (let x = 0; x < W; x += 2) R(ctx, x, 30 - Math.round(Math.abs(Math.sin(x * 0.045)) * 12 + Math.sin(x * 0.13) * 3), 2, 14, '#141c40');
  // slottet i mitten
  const cx = Math.round(W * 0.5);
  R(ctx, cx - 16, 18, 32, 22, '#2a3470');
  R(ctx, cx - 16, 18, 32, 1, '#5a6ab0');
  for (const tx of [cx - 20, cx + 14]) { R(ctx, tx, 12, 8, 28, '#323e82'); R(ctx, tx - 1, 10, 10, 3, '#3a488e'); R(ctx, tx + 3, 5, 1, 5, '#8a94aa'); R(ctx, tx + 4, 5 + (Math.floor(tm * 2) % 2), 4, 3, g.event ? '#ff7ab8' : '#4de1d0'); }
  R(ctx, cx - 4, 30, 8, 10, '#0c1230');
  for (let k = 0; k < 6; k++) if (Math.floor(tm * 0.5 + k * 1.3) % 5) R(ctx, cx - 12 + (k % 3) * 10, 22 + Math.floor(k / 3) * 6, 3, 3, '#ffd36a');
  // marken
  R(ctx, 0, 40, W, H - 40, '#1c3a30');
  R(ctx, 0, 40, W, 2, '#2a5a44');
  R(ctx, 0, H - 6, W, 6, '#2a3a30');
  // onlinevärlden: läktare som växer med nivån, banderoller för de fem främsta gillena, sändningsfinal och fejder
  const wd = g.world;
  if (wd) {
    const hue = (n) => hashStr('g' + n) % 360;
    const hot = wd.heat > 60;
    for (const side of [-1, 1]) for (let r = 0; r < wd.tier; r++) for (let k = 0; k < 4 + r * 2; k++) {
      const x = cx + side * (28 + k * 3) - 1;
      const y = 37 - r * 3 - (hot && Math.floor(tm * 3 + k + r) % 2 ? 1 : 0);
      R(ctx, x, y, 2, 2, `hsl(${(hue(k + r * 7 + side) + 20) % 360},50%,55%)`);
    }
    const nbn = wd.guilds.length;
    wd.guilds.forEach((gd, i) => {
      const bx = Math.round(W * 0.14 + i * ((W * 0.58) / Math.max(1, nbn - 1 || 1)));
      R(ctx, bx, 34, 1, 14, '#8a94aa');
      const wave = Math.floor(tm * 3 + i) % 2;
      ctx.fillStyle = `hsl(${hue(gd.name)},65%,50%)`;
      ctx.fillRect(bx + 1, 34 + wave, 7, 6);
      R(ctx, bx + 2, 35 + wave, 5, 1, 'rgba(255,255,255,.45)');
      if (gd.name === wd.lead) R(ctx, bx + 3, 31, 3, 2, '#ffd36a');
    });
    if (wd.feud && Math.floor(tm * 7) % 2) {
      const ia = wd.guilds.findIndex((x) => x.name === wd.feud.a), ib = wd.guilds.findIndex((x) => x.name === wd.feud.b);
      if (ia >= 0 && ib >= 0) {
        const xa = Math.round(W * 0.14 + ia * ((W * 0.58) / Math.max(1, nbn - 1))), xb = Math.round(W * 0.14 + ib * ((W * 0.58) / Math.max(1, nbn - 1)));
        for (let k = 0; k < 8; k++) R(ctx, Math.round(xa + ((xb - xa) * (k + V.hash(k + Math.floor(tm * 7)))) / 8), 32 + Math.floor(V.hash(k * 3 + Math.floor(tm * 7)) * 5), 1, 1, k % 2 ? '#ff5a50' : '#ffd36a');
      }
    }
    if (wd.final) {
      // finalens scen: ljusstrålar, två banderoller och kameror när den sänds
      ctx.globalAlpha = 0.10 + 0.04 * Math.sin(tm * 2);
      for (const sd of [-1, 1]) for (let k = 0; k < 6; k++) R(ctx, cx + sd * (4 + k * 3), 8 + k * 5, 6, 4, '#fff0b0');
      ctx.globalAlpha = 1;
      R(ctx, cx - 16, 40, 32, 3, '#6a5a8a');
      R(ctx, cx - 16, 40, 32, 1, '#a090c8');
      for (const [fi, nm] of [[-1, wd.final.a], [1, wd.final.b]]) {
        const fx = cx + fi * 9;
        R(ctx, fx, 28, 1, 12, '#c0c8d8');
        ctx.fillStyle = `hsl(${hue(nm || 'x')},70%,52%)`;
        ctx.fillRect(fx + 1, 28 + (Math.floor(tm * 4) % 2), 7, 7);
      }
      if (wd.final.prod >= 1) for (const cxm of [cx - 30, cx + 28]) {
        R(ctx, cxm, 38, 6, 4, '#2a3040');
        R(ctx, cxm + 1, 36, 4, 2, '#4a5470');
        R(ctx, cxm + 4, 35, 1, 1, Math.floor(tm * 2) % 2 ? '#ff4a3c' : '#702020');
        R(ctx, cxm + 2, 42, 1, 6, '#2a3040');
      }
    }
  }
  // spelare: fler ju fler prenumeranter (grovt log), små figurer som vandrar och slåss mot en drake ibland
  const crowd = subs <= 0 ? 0 : Math.min(26, 3 + Math.round(Math.log10(Math.max(10, subs)) * 4));
  for (let i = 0; i < crowd; i++) {
    const sp = 4 + V.hash(i * 3) * 8;
    const px = ((V.hash(i * 7) * (W + 40) + tm * sp * (i % 2 ? 1 : -1)) % (W + 40) + (W + 40)) % (W + 40) - 20;
    const py = 44 + Math.floor(V.hash(i * 13) * 8);
    const col = ['#e8504a', '#4a90e0', '#f2c84a', '#6cc86a', '#b46bff', '#ff7ab8'][i % 6];
    R(ctx, Math.round(px), py - 4 + (Math.floor(tm * 4 + i) % 2), 2, 2, '#f2d0a0');
    R(ctx, Math.round(px), py - 2, 2, 3, col);
  }
  // säsong: lövregn eller snö
  if (g.season) for (let i = 0; i < 24; i++) {
    const x = (V.hash(i * 9) * W + tm * 6 + Math.sin(tm + i) * 3) % W;
    const y = ((tm * (6 + (i % 5)) + V.hash(i * 3) * 40) % 44);
    R(ctx, Math.round(x), Math.round(y), 1, 1, i % 3 ? '#ffffff' : '#ffd36a');
  }
  // serverhallen till höger: fler rack med högre nivå, lamporna blinkar fortare med fler spelare
  const racks = Math.max(1, Math.min(4, st.server || 1));
  const busy = Math.min(8, 2 + subs / 40000);
  for (let r = 0; r < racks; r++) {
    const rx = W - 20 - r * 16;
    F.rack(ctx, rx, fy - 1, 14, 38, r + 5);
    for (let u = 0; u < 8; u++) if (Math.floor(tm * busy + u * 1.7 + r) % 3 === 0) R(ctx, rx + 10, fy - 36 + u * 4, 1, 1, down ? '#ff5a50' : '#5cf2a0');
  }
  // driftteamet vid sina skärmar till vänster
  F.desk2(ctx, 8, fy, 1, 2, 3);
  F.chair2(ctx, 8, fy, '#3a6a5a');
  person(ctx, 11, fy, cfg.looks[0], down ? 'sitIdle' : 'type', tm, 1, true, 0.3);
  if (g.ops) person(ctx, 42, fy + 2, cfg.looks[1], 'laptop', tm, 1, false, 0.8);
  if (down) {
    bubble(ctx, 14, fy - 26, 'exclam', (tm * 1.0) % 2, 1.8, tm);
    for (let i = 0; i < 3; i++) R(ctx, 4 + i * 8, 4, 5, 5, Math.floor(tm * 4 + i) % 2 ? '#ff5050' : '#702020');
  }
  // underhåll: gnistor över slottet
  if (g.patch) for (let i = 0; i < 5; i++) if (Math.floor(tm * 6 + i) % 2) R(ctx, cx - 10 + Math.floor(V.hash(Math.floor(tm * 6) + i) * 20), 8 + Math.floor(V.hash(i * 3 + Math.floor(tm * 5)) * 10), 1, 1, '#ffe27a');
  // eventet och nya regioner: fyrverkerier
  if (g.event || recent(['liveEvent', 'liveExp', 'liveRegion', 'liveSeason', 'worldTier', 'worldChamp'], 6, tm).length) for (let f = 0; f < 3; f++) {
    const k = (tm * 0.6 + f * 0.37) % 1;
    const fx = Math.round(V.hash(f * 5 + Math.floor(tm * 0.6 + f * 0.37)) * (W - 40)) + 20;
    const fyy = 8 + Math.round(V.hash(f * 3 + Math.floor(tm * 0.6)) * 8);
    if (k < 0.7) for (let a = 0; a < 10; a++) {
      const an = (a / 10) * Math.PI * 2;
      const rr = k * 12;
      ctx.globalAlpha = 1 - k / 0.7;
      R(ctx, Math.round(fx + Math.cos(an) * rr), Math.round(fyy + Math.sin(an) * rr), 1, 1, ['#ff7ab8', '#ffd36a', '#7cf2ff'][f % 3]);
    }
    ctx.globalAlpha = 1;
  }
  for (const e of recent(['liveLaunch', 'liveExp', 'worldChamp', 'worldTier'], 4.6, tm)) confetti(ctx, W, tm - e.t0, e.b.n);
  darken(ctx, W, 0.04, '#7cc8ff');
}

// ── Ekonomin ──
function drawBank(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { money: 0, hist: [], looks: [] };
  const red = st.money < 0;
  R(ctx, 0, 0, W, H, '#14261f');
  for (let x = 0; x < W; x += 12) R(ctx, x, 0, 1, H - 12, '#193228');
  R(ctx, 0, H - 12, W, 12, '#26342e');
  R(ctx, 0, H - 12, W, 1, '#5a7a68');
  R(ctx, 0, H - 4, W, 1, '#1a2620');
  // valvet: tung dörr med hjul som snurrar sakta, lampan visar läget
  const vx = 12;
  R(ctx, vx, 6, 38, 38, '#3a4a4a');
  R(ctx, vx, 6, 38, 1, '#7a9090');
  R(ctx, vx + 4, 10, 30, 30, '#202c2c');
  R(ctx, vx + 6, 12, 26, 26, '#5a6e6e');
  const wx = vx + 19, wy = 25;
  for (let k = 0; k < 4; k++) {
    const a = tm * 0.5 + (k * Math.PI) / 4;
    for (let r = -9; r <= 9; r += 1) R(ctx, Math.round(wx + Math.cos(a) * r), Math.round(wy + Math.sin(a) * r), 1, 1, '#c0d0d0');
  }
  R(ctx, wx - 2, wy - 2, 5, 5, '#2a3a3a');
  R(ctx, vx + 30, 8, 3, 3, red ? (Math.floor(tm * 3) % 2 ? '#ff4a3c' : '#702020') : '#5cf2a0');
  // väggskärmen visar kassakurvan
  const sx = Math.round(W * 0.5) - 20;
  V.wallScreen(ctx, sx, 7, 44, 26, 'chart', 5);
  const h = st.hist;
  if (h.length > 1) {
    let lo = Infinity, hi = -Infinity;
    for (const v of h) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const span = Math.max(1, hi - lo);
    for (let i = 0; i < 40; i++) {
      const v = h[Math.min(h.length - 1, Math.floor((i / 40) * h.length))];
      R(ctx, sx + 2 + i, 29 - Math.round(((v - lo) / span) * 17), 1, 1, '#8aff9a');
    }
    R(ctx, sx + 2 + Math.floor((tm * 8) % 40), 8, 1, 21, 'rgba(255,255,255,.12)');
  }
  // myntstaplar: högre ju mer pengar (grovt log)
  const stacks = st.money <= 0 ? 0 : Math.min(7, Math.max(1, Math.round(Math.log10(st.money + 10) - 2)));
  const cx0 = sx + 56;
  for (let i = 0; i < stacks; i++) {
    const hh = 3 + (i % 3) * 3 + Math.min(6, i);
    for (let k = 0; k < hh; k++) R(ctx, cx0 + i * 9, fy - 1 - k * 2, 7, 2, k % 2 ? '#ffd36a' : '#e8b848');
    R(ctx, cx0 + i * 9, fy - hh * 2 - 1, 7, 1, '#fff2b0');
  }
  // revisorn vid skrivbordet
  const dx = sx + 4;
  F.desk2(ctx, dx, fy, 1, 4, 3);
  F.chair2(ctx, dx, fy, '#3a6a5a');
  person(ctx, dx + 3, fy, st.looks[0] || cfg.looks[0], 'type', tm, 1, true, 0.3);
  // pengar sprutar när något säljer eller kvartalet summeras
  for (const e of recent(['sold', 'launch', 'chart', 'done'], 3.2, tm)) {
    const age = tm - e.t0;
    for (let i = 0; i < 10; i++) {
      const hh = V.hash(e.b.n * 9 + i);
      const x = Math.round(cx0 + hh * 40);
      const y = Math.round(fy - 6 - Math.sin(Math.min(1, age * 1.2) * Math.PI) * (10 + hh * 14) + Math.max(0, age - 0.8) * 8);
      ctx.globalAlpha = Math.max(0, 1 - age / 3.2);
      R(ctx, x, y, 3, 3, '#ffd36a');
      R(ctx, x + 1, y + 1, 1, 1, '#fff2b0');
    }
    ctx.globalAlpha = 1;
  }
  darken(ctx, W, 0.04, '#7cffb0');
}

// ── Marknaden ──
function drawMarket(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { top: [], looks: [] };
  R(ctx, 0, 0, W, H, '#121a3a');
  for (let x = 0; x < W; x += 14) R(ctx, x, 0, 1, H - 12, '#18214a');
  R(ctx, 0, H - 12, W, 12, '#242c4a');
  R(ctx, 0, H - 12, W, 1, '#5a6aa0');
  R(ctx, 0, H - 4, W, 1, '#181e36');
  // löpande nyhetsband högst upp
  R(ctx, 0, 2, W, 6, '#0a0f24');
  for (let i = 0; i < 12; i++) {
    const x = Math.round(((i * 46 - tm * 14) % (W + 46) + (W + 46)) % (W + 46)) - 20;
    R(ctx, x, 4, 8 + (i * 5) % 14, 2, ['#4de1d0', '#ffd36a', '#ff7ab8', '#8aff9a'][i % 4]);
  }
  // topplistan som stapeldiagram på en stor skärm
  const sw = Math.min(150, Math.round(W * 0.42)), sx = Math.round(W * 0.5 - sw / 2);
  R(ctx, sx - 2, 10, sw + 4, 32, '#0c1226');
  R(ctx, sx - 2, 10, sw + 4, 1, '#5a6aa0');
  R(ctx, sx - 2, 41, sw + 4, 1, '#3a4670');
  const top = st.top;
  const mx = Math.max(1, ...top.map((r) => (Number.isFinite(r.rev) ? r.rev : 0)));
  const flash = recent(['chart', 'disc'], 3, tm).length;
  top.slice(0, 5).forEach((r, i) => {
    const bw = Math.max(4, Math.round(((Number.isFinite(r.rev) ? r.rev : 0) / mx) * (sw - 8)));
    const y = 13 + i * 5.6;
    const col = r.yours ? '#ffd36a' : r.color || '#6a8ad8';
    R(ctx, sx + 2, Math.round(y), bw, 4, col);
    R(ctx, sx + 2, Math.round(y), bw, 1, 'rgba(255,255,255,.35)');
    if (r.yours && flash && Math.floor(tm * 6) % 2) R(ctx, sx + 2 + bw + 1, Math.round(y), 2, 4, '#ffffff');
  });
  if (!top.length) for (let i = 0; i < 5; i++) R(ctx, sx + 2, 13 + i * 6, 10 + i * 6, 3, '#26335e');
  // analytiker vid sina skrivbord och en som pekar på skärmen
  const lk = (i) => (st.looks && st.looks[i]) || cfg.looks[i];
  person(ctx, sx - 12, fy + 1, lk(0), 'present', tm, 1, false, 0.3);
  if (W >= 260) {
    F.desk2(ctx, 10, fy, 1, 6, 3);
    F.chair2(ctx, 10, fy, '#3a5a8a');
    person(ctx, 13, fy, lk(1), 'type', tm, 1, true, 0.6);
  }
  F.desk2(ctx, sx + sw + 14, fy, 1, 7, 3);
  F.chair2(ctx, sx + sw + 14, fy, '#3a5a8a');
  person(ctx, sx + sw + 17, fy, lk(2), 'type', tm, 1, true, 1.1);
  for (const e of recent(['chart', 'disc'], 4.6, tm)) confetti(ctx, W, tm - e.t0, e.b.n);
  darken(ctx, W, 0.04, '#7caaff');
}

// ── Spelhyllan (biblioteket) ──
function drawHall(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { games: [], n: 0, awards: 0, fans: 0, ach: 0, total: 1, discs: [0, 0, 0, 0], decade: 0, no1: 0, best: null };
  R(ctx, 0, 0, W, H, '#2a2036');
  for (let x = 0; x < W; x += 16) R(ctx, x, 0, 1, H - 12, '#312640');
  R(ctx, 0, H - 12, W, 12, '#3e3040');
  R(ctx, 0, H - 12, W, 1, '#7a6488');
  R(ctx, 0, H - 4, W, 1, '#241a2c');
  const wide = W >= 330;
  // inramade affischer: en per spel, ljusare färg ju bättre betyg, bästa spelet får en stjärnglans och listettor en krona
  const slots = Math.max(2, Math.min(8, Math.floor((W - (wide ? 190 : 90)) / 28)));
  const gs = st.games.slice(-slots);
  let bestI = -1;
  gs.forEach((g, i) => { if (bestI < 0 || g.score > gs[bestI].score) bestI = i; });
  for (let i = 0; i < slots; i++) {
    const x = 10 + i * 28;
    const g = gs[i];
    R(ctx, x, 8, 22, 28, '#1a1424');
    R(ctx, x, 8, 22, 1, '#8a7a4a');
    if (g) {
      const hue = (g.id * 47) % 360;
      ctx.fillStyle = `hsl(${hue},55%,${28 + Math.min(10, g.score) * 3}%)`;
      ctx.fillRect(x + 2, 10, 18, 24);
      R(ctx, x + 5, 14, 12, 3, 'rgba(255,255,255,.55)');
      R(ctx, x + 5, 20, 8, 1, 'rgba(255,255,255,.4)');
      for (let k = 0; k < Math.min(5, Math.round(g.score / 2)); k++) R(ctx, x + 4 + k * 3, 29, 2, 2, '#ffe27a');
      if (i === bestI && Math.floor(tm * 1.2) % 3 === 0) R(ctx, x + 18, 11 + (Math.floor(tm * 3) % 2), 2, 2, '#ffffff');
      if (i === bestI && st.no1 > 0) { R(ctx, x + 7, 4, 8, 3, '#ffd36a'); R(ctx, x + 7, 3, 2, 2, '#ffd36a'); R(ctx, x + 10, 2, 2, 3, '#ffd36a'); R(ctx, x + 13, 3, 2, 2, '#ffd36a'); }
    } else R(ctx, x + 2, 10, 18, 24, '#241c30');
    ctx.globalAlpha = 0.06;
    R(ctx, x - 2, 0, 26, 8, '#fff0b0');
    ctx.globalAlpha = 1;
  }
  // ny rekordbetalning: ljuskäglan ligger på bästa affischen
  if (bestI >= 0 && recent(['hallRecord'], 4, tm).length) {
    ctx.globalAlpha = 0.18 + 0.08 * Math.sin(tm * 6);
    for (let k = 0; k < 10; k++) R(ctx, 10 + bestI * 28 + 11 - k, 8 + k * 3, 2 + k * 2, 3, '#fff0b0');
    ctx.globalAlpha = 1;
  }
  const tx = W - 70;
  if (wide) {
    // prestationsväggen: ett band per tolv prestationer, de klara lyser
    const mx0 = 10 + slots * 28 + 6;
    const medals = 12;
    const lit = st.ach ? Math.max(1, Math.round((medals * st.ach) / Math.max(1, st.total))) : 0;
    const fresh = recent(['hallAch'], 3, tm).length;
    for (let i = 0; i < medals; i++) {
      const col = ['#e8504a', '#4a90e0', '#f2c84a', '#6cc86a', '#b46bff', '#ff7ab8'][i % 6];
      const mx = mx0 + (i % 6) * 8, my = 10 + Math.floor(i / 6) * 13;
      R(ctx, mx + 2, my, 1, 5, '#8a7a4a');
      if (i < lit) {
        R(ctx, mx, my + 4, 5, 5, col);
        R(ctx, mx + 1, my + 5, 3, 1, 'rgba(255,255,255,.5)');
        if (fresh && i === lit - 1 && Math.floor(tm * 6) % 2) R(ctx, mx - 1, my + 3, 7, 7, 'rgba(255,255,255,.4)');
      } else R(ctx, mx, my + 4, 5, 5, '#231b2e');
    }
    // skivorna: silver, guld, platina och diamant, en lysande skiva per nivå som finns
    ['#c8d0dc', '#ffd36a', '#e8f0ff', '#7cf2ff'].forEach((c, i) => {
      const dx = mx0 + i * 12, dy = 38;
      const has = (st.discs[i] || 0) > 0;
      R(ctx, dx + 1, dy, 6, 6, has ? c : '#2a2236');
      R(ctx, dx + 3, dy + 2, 2, 2, '#1a1424');
      if (has && Math.floor(tm * 1.4 + i * 1.3) % 5 === 0) R(ctx, dx + 1, dy, 1, 1, '#ffffff');
    });
  }
  // trofébyrå: en pokal per vunnet pris, nya pokaler glimmar
  R(ctx, tx, 22, 56, 22, '#3a2a20');
  R(ctx, tx + 1, 23, 54, 20, '#1a1410');
  const cups = Math.min(7, st.awards);
  const newAward = recent(['hallAward'], 4, tm).length;
  for (let i = 0; i < 7; i++) {
    const cx = tx + 4 + i * 7;
    if (i < cups) {
      R(ctx, cx, 30, 5, 5, '#ffd36a');
      R(ctx, cx + 1, 35, 3, 3, '#e8b848');
      R(ctx, cx - 1, 38, 7, 2, '#b8882a');
      if (Math.floor(tm * 1.5 + i * 1.7) % 6 === 0 || (newAward && i === cups - 1 && Math.floor(tm * 8) % 2)) R(ctx, cx + 1, 29, 1, 1, '#ffffff');
    } else R(ctx, cx + 1, 38, 3, 2, '#2a2018');
  }
  // årtiondet på skylten över skåpet
  if (st.decade) V.neonText(ctx, String(st.decade), tx + 12, 10, '#ffffff', '#c89aff', 1);
  // besökare går förbi och tittar, fler ju fler fans
  const vis = st.n ? Math.min(3, 1 + Math.floor(Math.log10(Math.max(10, st.fans)) / 2)) : 0;
  for (let i = 0; i < vis; i++) {
    const period = 16 + i * 3;
    const k = (tm + i * 6.1) % period;
    const xa = 20 + ((i * 53) % Math.max(30, W - 140));
    const look = cfg.looks[(i + 2) % cfg.looks.length];
    if (k < 3) person(ctx, lerp(-8, xa, k / 3), fy + 2, look, 'walk', tm, 1, false, i);
    else if (k < 10) person(ctx, xa, fy + 2, look, 'notes', tm, 1, false, i);
    else person(ctx, lerp(xa, W + 8, (k - 10) / (period - 10)), fy + 2, look, 'walk', tm, 1, false, i);
  }
  // fyrverkerier när ett nytt årtionde börjar
  for (const e of recent(['hallEra'], 6, tm)) {
    for (let f = 0; f < 3; f++) {
      const k = ((tm - e.t0) * 0.7 + f * 0.3) % 1;
      const fx = 30 + Math.round(V.hash(f * 7 + e.b.n) * (W - 60)), fyy = 12 + f * 4;
      for (let a2 = 0; a2 < 10; a2++) {
        const an = (a2 / 10) * Math.PI * 2;
        ctx.globalAlpha = 1 - k;
        R(ctx, Math.round(fx + Math.cos(an) * k * 12), Math.round(fyy + Math.sin(an) * k * 12), 1, 1, ['#ff7ab8', '#ffd36a', '#7cf2ff'][f % 3]);
      }
      ctx.globalAlpha = 1;
    }
  }
  for (const e of recent(['launch', 'done', 'disc', 'anniv', 'hallAward', 'hallAch', 'hallRecord'], 4.6, tm)) confetti(ctx, W, tm - e.t0, e.b.n);
  darken(ctx, W, 0.04, '#ffd8ff');
}

// ── Rivaler och kriser ──
function drawCrisis(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { rival: null, heat: 0, level: 0, shield: 0, open: '', looks: [] };
  const lv = st.level | 0;
  const war = lv >= 3;
  const hit = recent(['crisisHit'], 9, tm);
  const move = recent(['huntMove'], 8, tm);
  const solved = recent(['crisisSolved'], 3, tm);
  const leak = hit.some((e) => e.b.v === 0), strike = hit.some((e) => e.b.v === 1), flop = hit.some((e) => e.b.v === 2);
  // himmel: mörkare och rödare ju hetare
  R(ctx, 0, 0, W, H, ['#101a40', '#1a1a44', '#2a1a3c', '#3a1a30'][lv]);
  R(ctx, 0, 16, W, 12, ['#162248', '#221f4c', '#34203e', '#4a2030'][lv]);
  for (let i = 0; i < Math.floor(W / 14); i++) R(ctx, Math.floor(V.hash(i * 5) * W), 2 + Math.floor(V.hash(i * 11) * 14), 1, 1, war ? '#6a3a4a' : Math.floor(tm * 1.2 + i) % 4 ? '#ffffff' : '#6a78b8');
  const gy = H - 12;
  R(ctx, 0, gy, W, 12, '#26283a');
  R(ctx, 0, gy, W, 1, '#4a4e6a');
  for (let x = 0; x < W; x += 12) R(ctx, x, gy + 6, 6, 1, '#3a3e58');
  // din studio till vänster
  const sx = W >= 200 ? 84 : 10, sw = 54, sh = 31;
  R(ctx, sx, gy - sh, sw, sh, '#2a3470');
  R(ctx, sx, gy - sh, sw, 2, '#5a6ab0');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (Math.floor(tm * 0.4 + r * 3 + c) % 9) R(ctx, sx + 5 + c * 12, gy - sh + 5 + r * 8, 7, 5, '#ffd36a');
  R(ctx, sx + 22, gy - 12, 10, 12, '#0c1230');
  V.neonText(ctx, 'STUDIO', sx + 7, gy - sh - 7, '#ffffff', '#4de1d0', 1);
  // skölden: en ljusbåge runt studion, tjockare med högre skydd
  const sa = 0.07 + st.shield * 0.004 + (solved.length ? 0.2 * Math.abs(Math.sin(tm * 8)) : 0);
  ctx.globalAlpha = Math.min(0.5, sa);
  for (let a = Math.PI; a < Math.PI * 2; a += 0.06) R(ctx, Math.round(sx + sw / 2 + Math.cos(a) * 36), Math.round(gy + Math.sin(a) * 44), 2, 2, '#7cf2ff');
  ctx.globalAlpha = 1;
  // rivalens byggnad till höger
  const rx = W - 66, rw = 50, rh = 34;
  const col = (st.rival && st.rival.color) || '#6a7a9a';
  R(ctx, rx, gy - rh, rw, rh, '#1c2040');
  R(ctx, rx, gy - rh, rw, 3, col);
  const wcol = ['#cfe8ff', '#ffd36a', '#ff9a4a', '#ff4a3c'][lv];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (st.rival && (lv < 2 || Math.floor(tm * (lv + 1) + r * 2 + c) % 4)) R(ctx, rx + 5 + c * 11, gy - rh + 7 + r * 9, 6, 5, wcol);
  if (st.rival) V.neonText(ctx, String(st.rival.name).slice(0, 7).toUpperCase(), rx + 3, gy - rh - 7, '#ffffff', col, 1);
  // gatlampa och gata
  const lx = Math.round((sx + sw + rx) / 2);
  R(ctx, lx, gy - 20, 1, 20, '#6a728a');
  R(ctx, lx - 2, gy - 22, 5, 2, '#6a728a');
  ctx.globalAlpha = 0.12;
  R(ctx, lx - 6, gy - 20, 13, 20, '#ffe9a8');
  ctx.globalAlpha = 1;
  // blixtar och regn vid hett läge
  if (lv >= 2 && Math.floor(tm * 1.3) % 3 === 0) {
    let bx = rx - 2, by = 6;
    for (let k = 0; k < 9; k++) { R(ctx, Math.round(bx), by + k * 3, 2, 3, '#fff2a0'); bx -= (rx - sx - sw) / 9 * (0.6 + V.hash(k + Math.floor(tm * 1.3)) * 0.8); }
  }
  if (war) for (let i = 0; i < 30; i++) R(ctx, Math.round((V.hash(i * 3) * W + tm * 20) % W), Math.round((tm * 40 + V.hash(i * 7) * 50) % gy), 1, 3, '#7a8aaa');
  { const sk = skyOf(cfg.G, tm); if (!war) precip(ctx, 0, 0, W, gy, sk, tm, 5); }
  // folk: din personal vid dörren, strejkande med plakat vid kris
  const lk = (i) => (st.looks && st.looks[i]) || cfg.looks[i];
  if (strike) {
    for (let i = 0; i < 3; i++) {
      const px = sx + 10 + i * 14 + Math.round(Math.sin(tm * 1.5 + i) * 4);
      person(ctx, px, fy + 2, lk(i), 'walk', tm, i % 2 ? -1 : 1, false, i);
      R(ctx, px + 2, fy - 22, 1, 12, '#c8b890');
      R(ctx, px - 3, fy - 28, 10, 7, '#f4f0e4');
      R(ctx, px - 1, fy - 25, 6, 1, '#e8504a');
    }
  } else {
    person(ctx, sx + 12, fy + 2, lk(0), 'stand', tm, 1, false, 0.3);
    person(ctx, sx + 38, fy + 2, lk(1), 'talk', tm, -1, false, 0.9);
  }
  // rivalens drag: spion (värvning), rykten, kopia, flopp
  for (const e of move) {
    const age = tm - e.t0, v = e.b.v;
    if (v === 1) {
      const px = lerp(rx - 6, sx + sw + 4, Math.min(1, age / 3));
      person(ctx, px, fy + 3, cfg.looks[3], age < 3 ? 'walk' : 'notes', tm, -1, false, 1.2);
      R(ctx, Math.round(px) - 2, fy - 20, 8, 3, '#2a2f3c');
    } else if (v === 2) bubble(ctx, sx + 30, gy - sh - 10, 'question', age, 2.2, tm);
    else if (v === 3) { ctx.globalAlpha = 0.5; R(ctx, lx + 8, gy - 26, 12, 16, '#e9eefb'); ctx.globalAlpha = 1; R(ctx, lx + 10, gy - 22, 8, 1, '#5a6a9a'); }
    else if (v === 4 && st.rival) steam(ctx, rx + 24, gy - rh, tm, 4, 0.6, '#aab4c8');
    else if (v === 0) { const k = Math.min(1, age / 3); R(ctx, Math.round(lerp(rx, sx + sw, k)), Math.round(gy - 40 - Math.sin(k * Math.PI) * 6), 5, 3, '#ff7ab8'); }
  }
  // läckt demo: skärm på gatan; flopp: moln över studion
  if (leak) { V.wallScreen(ctx, lx - 8, gy - 16, 16, 10, 'chart', 2); bubble(ctx, lx, gy - 26, 'exclam', (tm * 1.0) % 2, 1.8, tm); }
  if (flop) { ctx.globalAlpha = 0.75; for (let k = 0; k < 4; k++) R(ctx, sx + 4 + k * 12, gy - sh - 12 + (k % 2) * 3, 14, 6, '#4a4e66'); ctx.globalAlpha = 1; bubble(ctx, sx + 28, gy - sh - 20, 'sweat', (tm * 1.0) % 2, 1.8, tm); }
  // ett öppet beslut: studions lampa blinkar rött
  if (st.open && Math.floor(tm * 3) % 2) { R(ctx, sx + sw - 4, gy - sh - 5, 4, 4, '#ff4a3c'); ctx.globalAlpha = 0.25; R(ctx, sx + sw - 8, gy - sh - 9, 12, 12, '#ff4a3c'); ctx.globalAlpha = 1; }
  for (const e of solved) if (e.b.v === 0) confetti(ctx, W, tm - e.t0, e.b.n);
  darken(ctx, W, 0.04 + lv * 0.02, lv >= 2 ? '#ff7a6a' : '#7ca8ff');
}

// ── Hårdvarukriget ──
function drawWar(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { opp: null, own: null, level: 0, heat: 0, shield: 0, patent: { on: false, lic: 0 }, supply: { short: null }, looks: [] };
  const lv = st.level | 0;
  const opp = st.opp, own = st.own;
  const mv = recent(['warMove'], 9, tm);
  const solved = recent(['warSolved'], 3, tm);
  const has = (v) => mv.some((e) => e.b.v === v);
  const short = !!(st.supply && st.supply.short) || has(5);
  const oc = (opp && opp.color) || '#6a7a9a';
  const gy = H - 12;
  R(ctx, 0, 0, W, H, ['#16243a', '#201e3a', '#2e1e34', '#3c1c2c'][lv]);
  for (let x = 0; x < W; x += 12) R(ctx, x, 0, 1, gy, ['#1b2c46', '#262445', '#37243e', '#4a2434'][lv]);
  R(ctx, 0, gy, W, 12, '#2c3040');
  R(ctx, 0, gy, W, 1, '#5a6280');
  // marknadsandelen som rep: din färg mot konkurrentens, strecket flyttar sig med vikterna
  const bw = Math.max(40, Math.min(150, W - 106)), bx = Math.max(W >= 200 ? 100 : 6, Math.round(W * 0.5 - bw / 2));
  const ow = own ? Math.max(1, own.w) : 1, pw = opp ? Math.max(1, opp.w) : 1;
  const split = Math.round((bw * ow) / (ow + pw));
  R(ctx, bx - 1, 1, bw + 2, 6, '#0c1020');
  R(ctx, bx, 2, split, 4, '#4de1d0');
  R(ctx, bx + split, 2, bw - split, 4, oc);
  R(ctx, bx + split - 1, 0, 3, 8, '#ffffff');
  if (lv >= 2 && Math.floor(tm * 6) % 2) R(ctx, bx + split - 2, 8, 5, 2, '#ffd36a');
  // din monter till vänster: konsol på bordet och hylla med lådor (tom vid komponentbrist)
  const lx = Math.round(W * 0.18);
  R(ctx, lx, gy - 12, 36, 12, '#2a4a52');
  R(ctx, lx, gy - 12, 36, 1, '#6ac8c0');
  R(ctx, lx + 6, gy - 20, 22, 8, '#e8e8f0');
  R(ctx, lx + 6, gy - 20, 22, 1, '#ffffff');
  R(ctx, lx + 9, gy - 18, 8, 3, '#4de1d0');
  R(ctx, lx + 20, gy - 17, 5, 2, '#2a2f3c');
  R(ctx, lx - 2, gy - 38, 40, 14, '#1a2230');
  for (let k = 0; k < 6; k++) if (!short && k < 6) R(ctx, lx + k * 6, gy - 36 + (k % 2) * 6, 5, 5, ['#4de1d0', '#e8e8f0', '#6ac8c0'][k % 3]);
  if (short) { R(ctx, lx + 2, gy - 36, 30, 1, '#ff5a50'); if (Math.floor(tm * 2) % 2) V.neonText(ctx, '0', lx + 14, gy - 33, '#ff9a8a', '#ff4a3c', 1); }
  // skölden runt din monter
  ctx.globalAlpha = Math.min(0.5, 0.06 + st.shield * 0.004 + (solved.length ? 0.2 * Math.abs(Math.sin(tm * 8)) : 0));
  for (let a = Math.PI; a < Math.PI * 2; a += 0.07) R(ctx, Math.round(lx + 18 + Math.cos(a) * 30), Math.round(gy + Math.sin(a) * 40), 2, 2, '#7cf2ff');
  ctx.globalAlpha = 1;
  // konkurrentens monter till höger: skylt med namn, större konsol, prislapp som sänks vid prissänkning
  const rx = Math.round(W * 0.82) - 36;
  R(ctx, rx, gy - 12, 36, 12, '#3a2a40');
  R(ctx, rx, gy - 12, 36, 1, oc);
  R(ctx, rx + 6, gy - 22, 24, 10, oc);
  R(ctx, rx + 6, gy - 22, 24, 1, 'rgba(255,255,255,.5)');
  R(ctx, rx + 10, gy - 19, 10, 3, '#10142a');
  if (opp) V.neonText(ctx, String(opp.maker).slice(0, 7).toUpperCase(), rx - 2, gy - 32, '#ffffff', oc, 1);
  const cut = has(0);
  R(ctx, rx + 24, gy - 15, 10, 6, '#f4f0e4');
  if (cut && Math.floor(tm * 4) % 2) R(ctx, rx + 25, gy - 14, 8, 1, '#e8504a');
  else V.neonText(ctx, cut ? '-%' : '$', rx + 26, gy - 14, '#e8504a', '#e8504a', 1);
  if (has(1)) { R(ctx, rx + 8, gy - 30, 18, 6, '#e8504a'); V.neonText(ctx, 'EXCL', rx + 9, gy - 29, '#ffffff', '#ff4a3c', 1); }
  // folk: din personal vid montern, kunder som vandrar mellan montrarna, jurist, fankrig, korslicens
  const lk = (i) => (st.looks && st.looks[i]) || cfg.looks[i];
  person(ctx, lx - 8, fy + 2, lk(0), 'stand', tm, 1, false, 0.2);
  person(ctx, lx + 44, fy + 2, lk(1), 'talk', tm, -1, false, 0.9);
  for (let i = 0; i < 2; i++) {
    const period = 14 + i * 3, k = (tm + i * 6) % period;
    person(ctx, lerp(bx - 10, bx + bw + 10, i ? 1 - k / period : k / period), fy + 3, cfg.looks[(i + 3) % cfg.looks.length], 'walk', tm, i ? -1 : 1, false, i);
  }
  if (has(3) || (st.patent && st.patent.on && !st.patent.lic)) {
    const px = rx - 14;
    person(ctx, px, fy + 3, cfg.looks[4], 'stand', tm, -1, false, 1.4);
    R(ctx, px + 3, fy - 8, 7, 5, '#3a2a1a');
    R(ctx, px + 3, fy - 8, 7, 1, '#6a4a2a');
    if (Math.floor(tm * 2) % 4 === 0) R(ctx, px - 5, fy - 4, 5, 2, '#c8b890');
  }
  if (has(2)) for (let i = 0; i < 3; i++) { const px = bx + 20 + i * 24 + Math.round(Math.sin(tm * 3 + i) * 2); person(ctx, px, fy + 3, cfg.looks[(i + 2) % cfg.looks.length], 'walk', tm, i % 2 ? 1 : -1, false, i); R(ctx, px + 2, fy - 22, 1, 12, '#c8b890'); R(ctx, px - 2, fy - 27, 8, 6, '#f4f0e4'); }
  if (has(4) || (st.patent && st.patent.lic > 0)) {
    const hxx = Math.round(W * 0.5);
    R(ctx, hxx - 3, fy - 7, 6, 2, '#f2d0a0');
    if (Math.floor(tm * 2) % 2) R(ctx, hxx - 1, fy - 12, 2, 2, '#8aff9a');
  }
  // brand och brist
  if (has(6)) for (let i = 0; i < 5; i++) { const fx = lx + 4 + i * 6; R(ctx, fx, gy - 14 - (Math.floor(tm * 6 + i) % 3) * 2, 3, 4 + (i % 2) * 2, i % 2 ? '#ff9a3a' : '#ffd36a'); }
  if (has(6)) steam(ctx, lx + 16, gy - 20, tm, 4, 0.6, '#4a4e66');
  if (short && !has(6)) bubble(ctx, lx + 14, gy - 52, 'sweat', (tm * 1.0) % 2.4, 1.8, tm);
  for (const e of solved) if (e.b.v === 0) confetti(ctx, W, tm - e.t0, e.b.n);
  darken(ctx, W, 0.04 + lv * 0.02, lv >= 2 ? '#ff7a6a' : '#7ca8ff');
}

// ── Spelmässan ──
function drawExpo(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { open: false, next: 0, last: null, shows: 0, prizes: 0, looks: [] };
  const L = st.last;
  const live = recent(['expoOpen', 'expoKeynote', 'expoDemo', 'expoTrailer', 'expoStunt', 'expoPrize', 'expoVerdict'], 6, tm).length > 0;
  R(ctx, 0, 0, W, H, '#10163a');
  R(ctx, 0, 0, W, 8, '#070a1a');
  R(ctx, 0, H - 14, W, 14, '#1a2150');
  for (let x = 0; x < W; x += 24) R(ctx, x, H - 14, 1, 14, '#141a3c');
  // strålkastare som sveper över hallen
  for (let i = 0; i < 5; i++) {
    const lx = Math.round(W * (0.12 + i * 0.19)), sw2 = Math.sin(tm * (live ? 1.6 : 0.6) + i * 1.3) * 8;
    R(ctx, lx - 1, 8, 6, 2, i % 2 ? '#ffe9a8' : '#a8d8ff');
    ctx.globalAlpha = live ? 0.1 : 0.05;
    for (let k = 0; k < 8; k++) R(ctx, Math.round(lx + 2 + sw2 * (k / 8) - k), 10 + k * 5, 2 + k * 2, 5, i % 2 ? '#ffe9a8' : '#a8d8ff');
    ctx.globalAlpha = 1;
  }
  // banderoll med årtalet
  const bx0 = Math.round(W * 0.5 - 30);
  R(ctx, bx0, 12, 60, 11, '#0c1020');
  R(ctx, bx0, 12, 60, 1, '#4a5470');
  V.neonText(ctx, L ? String(L.year) : 'EXPO', bx0 + 10, 14, '#ffffff', '#ff7ab8', 1);
  // monter: större med mässans nivå, skärm och disk
  const lvl = L ? Math.max(1, Math.min(3, L.level)) : 1;
  const bw = 30 + lvl * 16, bx = Math.round(W * 0.5 - bw / 2);
  R(ctx, bx, fy - 28, bw, 24, '#1b2760');
  R(ctx, bx, fy - 28, bw, 2, '#4de1d0');
  R(ctx, bx - 2, fy - 8, bw + 4, 6, '#4de1d0');
  R(ctx, bx - 2, fy - 8, bw + 4, 1, '#b8fff4');
  for (let k = 0; k < lvl + 1; k++) { R(ctx, bx + 4 + k * 14, fy - 24, 10, 12, '#05081a'); R(ctx, bx + 5 + k * 14, fy - 23, 8, 10, `rgba(77,225,208,${0.4 + 0.3 * Math.sin(tm * 3 + k)})`); }
  for (let x = bx - 2, i = 0; x < bx + bw + 2; x += 6, i++) R(ctx, x, fy - 33 + (i % 3), 4, 3, ['#ff6b8a', '#ffe08a', '#4de1d0', '#9b7bff'][i % 4]);
  // rivalernas montrar
  (L && L.rivals ? L.rivals : []).slice(0, 3).forEach((rv, i) => {
    const rx = i % 2 ? Math.round(W * 0.68) + (i > 1 ? 40 : 0) : Math.round(W * 0.12) + i * 38;
    R(ctx, rx, fy - 20, 30, 16, '#141a3c');
    R(ctx, rx, fy - 20, 30, 3, rv.color || '#8a56dc');
  });
  // besökare: fler ju fler besökare på senaste mässan, och alla går in i hallen när en mässa pågår
  const crowd = Math.min(18, L ? 4 + Math.round(Math.log10(Math.max(10, L.visitors)) * 3) : 3);
  for (let i = 0; i < crowd; i++) {
    const sp = 3 + V.hash(i * 5) * 5, px0 = ((V.hash(i * 9) * (W + 20) + tm * sp * (i % 2 ? 1 : -1)) % (W + 20) + (W + 20)) % (W + 20) - 10;
    const py = fy - 2 + Math.floor(V.hash(i * 13) * 6);
    const col = ['#e8504a', '#4a90e0', '#f2c84a', '#6cc86a', '#b46bff', '#ff7ab8'][i % 6];
    R(ctx, Math.round(px0), py - 5 + (Math.floor(tm * 4 + i) % 2), 2, 2, '#f2d0a0');
    R(ctx, Math.round(px0), py - 3, 2, 3, col);
  }
  person(ctx, bx + bw * 0.3, fy - 4, cfg.looks[0], 'talk', tm, 1, false, 0.4);
  if (L && L.celeb) { person(ctx, Math.round(W * 0.5 + Math.sin(tm * 0.5) * 40), fy + 3, cfg.looks[3], 'walk', tm, 1, false, 0.9); if ((tm * 3) % 2.2 < 0.15) R(ctx, Math.round(W * 0.5 + 18), fy - 22, 3, 3, '#ffffff'); }
  for (const e of recent(['expoPrize', 'expoVerdict', 'expoStunt'], 4.6, tm)) confetti(ctx, W, tm - e.t0, e.b.n);
  darken(ctx, W, 0.04, '#ff9ac8');
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
  precip(ctx, 0, 0, W, 40, skyOf(cfg.G, tm, true), tm, 7);
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
// ── Tidningen och fansen ──
const COVER_HUE = { youTop: '#e8c040', youGood: '#4ad07a', youOk: '#4aa8ff', youFlop: '#e8504a', rivalHit: '#ff7a3a', rankUp: '#4ad07a', rankDown: '#e8a040', trend: '#ff7a3a', folk: '#ff6a9a', quiet: '#8a94aa', leader: '#e8c040', rumor: '#b08aff' };
// En liten bild på omslaget efter sort (9 gånger 9 pixlar)
function coverGlyph(ctx, k, x, y, tm) {
  const w = '#ffffff';
  if (k === 'youTop') { R(ctx, x + 1, y, 7, 4, '#ffd84a'); R(ctx, x, y + 1, 1, 2, '#ffd84a'); R(ctx, x + 8, y + 1, 1, 2, '#ffd84a'); R(ctx, x + 3, y + 4, 3, 2, '#ffd84a'); R(ctx, x + 2, y + 6, 5, 2, '#c89a2a'); R(ctx, x + 2, y + 1, 1, 2, w); }
  else if (k === 'youGood' || k === 'leader') { R(ctx, x + 4, y, 1, 9, '#ffe27a'); R(ctx, x, y + 4, 9, 1, '#ffe27a'); R(ctx, x + 2, y + 2, 5, 5, '#ffe27a'); R(ctx, x + 3, y + 3, 3, 3, w); }
  else if (k === 'youOk') { R(ctx, x, y + 1, 4, 7, w); R(ctx, x + 5, y + 1, 4, 7, w); R(ctx, x + 4, y + 1, 1, 7, '#8a94aa'); for (let i = 0; i < 3; i++) { R(ctx, x + 1, y + 2 + i * 2, 2, 1, '#8a94aa'); R(ctx, x + 6, y + 2 + i * 2, 2, 1, '#8a94aa'); } }
  else if (k === 'youFlop') { for (let i = 0; i < 9; i++) { R(ctx, x + i, y + i, 1, 1, '#ffd0d0'); R(ctx, x + 8 - i, y + i, 1, 1, '#ffd0d0'); } R(ctx, x + 4, y + 4, 1, 1, w); }
  else if (k === 'rivalHit') { R(ctx, x, y + 2, 1, 5, '#ffd84a'); R(ctx, x + 4, y, 1, 7, '#ffd84a'); R(ctx, x + 8, y + 2, 1, 5, '#ffd84a'); R(ctx, x, y + 7, 9, 2, '#e8b030'); R(ctx, x + 2, y + 4, 5, 3, '#ffd84a'); }
  else if (k === 'rankUp' || k === 'rankDown') { const up = k === 'rankUp'; for (let i = 0; i < 5; i++) R(ctx, x + 4 - i, up ? y + i : y + 8 - i, 1 + i * 2, 1, w); R(ctx, x + 3, up ? y + 5 : y, 3, 4, w); }
  else if (k === 'trend') { R(ctx, x + 3, y + 3, 4, 6, '#ff9a2a'); R(ctx, x + 2, y + 5, 6, 4, '#ff9a2a'); R(ctx, x + 4, y + 1 - (Math.floor(tm * 6) % 2), 2, 3, '#ffd84a'); R(ctx, x + 4, y + 5, 2, 4, '#fff2a0'); }
  else if (k === 'folk') { R(ctx, x + 1, y + 1, 3, 1, w); R(ctx, x + 5, y + 1, 3, 1, w); R(ctx, x, y + 2, 9, 3, w); R(ctx, x + 1, y + 5, 7, 1, w); R(ctx, x + 2, y + 6, 5, 1, w); R(ctx, x + 3, y + 7, 3, 1, w); R(ctx, x + 4, y + 8, 1, 1, w); }
  else if (k === 'rumor') { R(ctx, x, y + 3, 9, 3, w); R(ctx, x + 2, y + 2, 5, 5, w); R(ctx, x + 3, y + 3, 3, 3, '#6a4ab8'); R(ctx, x + 4, y + 4, 1, 1, '#101028'); }
  else { R(ctx, x + 1, y + 3, 6, 5, w); R(ctx, x + 7, y + 4, 2, 3, w); R(ctx, x + 2, y + 4, 4, 1, '#8a6a3a'); steam(ctx, x + 3, y + 3, tm, 2, 0.6); }
}
function drawPress(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { issue: null, count: 0, cover: null };
  const c = st.cover;
  const hue = c ? COVER_HUE[c.k] || '#4aa8ff' : '#4a5278';
  const printing = recent(['issue'], 9, tm)[0];
  R(ctx, 0, 0, W, H, '#241f38');
  R(ctx, 0, 30, W, H - 40, '#2d2646');
  R(ctx, 0, H - 11, W, 11, '#4e3a2c');
  for (let x = 0; x < W; x += 16) R(ctx, x, H - 11, 1, 11, '#3e2e22');
  R(ctx, 0, H - 11, W, 1, '#6e5440');
  // inramade gamla omslag på väggen
  for (let i = 0; i < 4; i++) {
    const fx = Math.round(W * 0.08) + i * 17;
    if (fx > W * 0.33) break;
    R(ctx, fx, 6, 13, 17, '#14141e');
    R(ctx, fx + 1, 7, 11, 15, i % 2 ? '#e8e0cc' : '#f2ecd8');
    R(ctx, fx + 2, 8, 9, 3, ['#e8504a', '#4aa8ff', '#4ad07a', '#ffd84a'][i]);
    R(ctx, fx + 2, 12, 9, 6, ['#6a5aa0', '#8a6a4a', '#4a7a8a', '#a05a6a'][(i + st.count) % 4]);
    R(ctx, fx + 2, 19, 6, 1, '#8a8a98');
  }
  // tryckpressen till vänster: valsar och papper som matas ut
  const px = 6;
  const py = fy - 24;
  R(ctx, px, py, 40, 24, '#5a6478');
  R(ctx, px, py, 40, 2, '#8a94aa');
  R(ctx, px + 2, py + 4, 12, 14, '#3a4256');
  R(ctx, px + 16, py + 4, 12, 14, '#3a4256');
  for (const rx of [px + 8, px + 22]) {
    for (let k = 0; k < 3; k++) R(ctx, rx - 3, py + 7 + k * 4, 7, 2, (Math.floor(tm * (printing ? 10 : 2) + k) % 2) ? '#cdd4e4' : '#8a94aa');
  }
  R(ctx, px + 30, py + 6, 8, 3, printing ? '#4ad07a' : '#3a4a3a');
  R(ctx, px + 30, py + 11, 8, 3, Math.floor(tm * 2) % 3 === 0 ? '#ffd84a' : '#4a4a2a');
  for (let k = 0; k < 4; k++) {
    const ph = ((tm * (printing ? 1.6 : 0.4) + k * 0.25) % 1);
    R(ctx, Math.round(px + 40 + ph * 14), fy - 4 - Math.round(Math.sin(ph * 3.1) * 2), 8, 1, '#f4f4f0');
  }
  // omslaget på ställningen i mitten (bläddrar mellan omslag och insida)
  const cx = Math.round(W * 0.5);
  const p6 = tm % 7;
  const page = Math.floor(tm / 7) % 2;
  const sc = p6 < 0.5 ? p6 / 0.5 : p6 > 6.5 ? (7 - p6) / 0.5 : 1;
  const mw = Math.max(2, Math.round(30 * sc));
  const mx = cx - Math.floor(mw / 2);
  R(ctx, cx - 1, fy - 8, 3, 8, '#3a2e22');
  R(ctx, cx - 7, fy - 2, 15, 2, '#3a2e22');
  R(ctx, mx - 1, 3, mw + 2, 41, '#12121c');
  R(ctx, mx, 4, mw, 39, '#f4f0e0');
  if (mw > 14) {
    const ix = cx - 13;
    if (page === 0 || !st.issue) {
      R(ctx, ix, 5, 27, 8, '#d83a3a');
      drawText(ctx, 'POSTEN', ix + 2, 7, '#ffffff', 1);
      R(ctx, ix + 1, 15, 25, 15, hue);
      R(ctx, ix + 1, 15, 25, 1, '#ffffff');
      if (c) coverGlyph(ctx, c.k, ix + 9, 18, tm);
      else drawText(ctx, '?', ix + 12, 20, '#ffffff', 2);
      R(ctx, ix + 2, 33, 23, 2, '#2a2a3a');
      R(ctx, ix + 2, 37, 14, 2, '#6a6a7a');
      R(ctx, ix + 18, 37, 6, 2, hue);
    } else {
      R(ctx, ix, 5, 27, 6, '#2a2a3a');
      drawText(ctx, 'TEST', ix + 2, 6, '#ffffff', 1);
      for (let i = 0; i < 4; i++) {
        const sc2 = 3 + Math.floor(V.hash(st.count * 7 + i) * 6);
        R(ctx, ix + 2, 14 + i * 7, 2, 2, '#2a2a3a');
        R(ctx, ix + 6, 14 + i * 7, 19, 2, '#c0c0c8');
        R(ctx, ix + 6, 17 + i * 7, 6 + sc2 * 2, 2, i === 0 ? '#4ad07a' : '#6a8ad8');
      }
    }
  }
  // tidningsstället till höger med de senaste numren
  const rx = W - 48;
  R(ctx, rx, fy - 30, 40, 30, '#3a3550');
  R(ctx, rx, fy - 30, 40, 2, '#5a5478');
  for (let i = 0; i < 6; i++) {
    const mxx = rx + 3 + (i % 3) * 12;
    const myy = fy - 28 + Math.floor(i / 3) * 14;
    R(ctx, mxx, myy, 10, 12, '#f2ecd8');
    R(ctx, mxx, myy, 10, 3, '#d83a3a');
    R(ctx, mxx + 1, myy + 4, 8, 6, Object.values(COVER_HUE)[(st.count + i * 5) % 12]);
  }
  if (printing) {
    // dagens nummer lyser upp i stället
    const g = 0.4 + Math.sin(tm * 8) * 0.2;
    ctx.globalAlpha = g;
    R(ctx, rx + 3, fy - 28, 10, 12, '#ffffff');
    ctx.globalAlpha = 1;
  }
  // redaktören läser och en tidningsbud springer förbi när numret kommit ut
  const eLook = cfg.looks[0];
  F.desk2(ctx, Math.round(W * 0.28), fy, 1, 3, 2);
  person(ctx, Math.round(W * 0.28) + 6, fy, eLook, Math.floor(tm / 6) % 2 ? 'read' : 'type', tm, 1, true);
  if (printing) {
    const age = tm - printing.t0;
    person(ctx, lerp(-10, W + 10, age / 8), fy + 3, FALLBACK[3], 'walkBox', tm, 1);
    if (age < 3) bubble(ctx, cx, 2, 'exclam', age, 2.8, tm);
  }
  // läsare som stannar vid stället
  const rd = Math.floor(tm / 9) % 3;
  if (rd === 1) person(ctx, rx - 12, fy + 3, FALLBACK[2], 'read', tm, 1);
  steam(ctx, Math.round(W * 0.28) + 18, fy - 14, tm, 2, 0.4);
  if (st.count && c && (c.k === 'youTop' || c.k === 'leader')) for (const e of [1]) confetti(ctx, W, tm % 12, e + st.count);
}

function monitor(ctx, x, y, w, h, tm, mode, seed) {
  R(ctx, x - 1, y - 1, w + 2, h + 2, '#12121e');
  R(ctx, x, y, w, h, '#0e2236');
  if (mode === 'forum') {
    const n = Math.floor((h - 2) / 4);
    const off = Math.floor(tm * 1.2) % 4;
    for (let i = 0; i < n; i++) {
      const hh = V.hash(seed * 13 + i + Math.floor(tm * 1.2 / 4) * 3);
      R(ctx, x + 1, y + 1 + i * 4 + 1 - off % 1, 2, 2, ['#ff7ab8', '#7cf2ff', '#ffe27a', '#8aff9a'][Math.floor(hh * 4)]);
      R(ctx, x + 4, y + 1 + i * 4, Math.max(3, Math.round((w - 7) * (0.4 + hh * 0.6))), 1, '#9ab0d8');
      R(ctx, x + 4, y + 2 + i * 4, Math.round((w - 7) * 0.35 * (0.5 + hh)), 1, '#4a5a80');
    }
  } else if (mode === 'game') {
    R(ctx, x, y, w, h, '#1a3a5a');
    R(ctx, x, y + h - 4, w, 4, '#2a6a3a');
    R(ctx, x + 3 + Math.round((Math.sin(tm * 2) + 1) * (w - 9) / 2), y + h - 7, 3, 3, '#ffd84a');
  } else if (mode === 'chat') {
    for (let i = 0; i < Math.floor(h / 3); i++) {
      const hh = V.hash(seed * 7 + i + Math.floor(tm * 3));
      R(ctx, x + 1, y + 1 + i * 3, 2, 1, ['#ff7ab8', '#7cf2ff', '#ffe27a'][Math.floor(hh * 3)]);
      R(ctx, x + 4, y + 1 + i * 3, 2 + Math.floor(hh * (w - 7)), 1, '#8a9ac0');
    }
  }
}
function drawFans(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { games: [], hot: false, angry: false };
  const strE = recent(['streamer'], 22, tm)[0];
  const thrE = recent(['thread'], 3, tm)[0];
  const memE = recent(['meme'], 8, tm)[0];
  const artE = recent(['fanart'], 7, tm)[0];
  const upE = recent(['viralUp'], 7, tm)[0];
  const dnE = recent(['viralDown'], 7, tm)[0];
  const hot = st.hot || !!upE;
  const angry = st.angry || !!dnE;
  R(ctx, 0, 0, W, H, '#1c1a34');
  R(ctx, 0, 28, W, H - 38, '#26224a');
  R(ctx, 0, H - 11, W, 11, '#3a2f48');
  for (let x = 0; x < W; x += 20) R(ctx, x, H - 11, 1, 11, '#2c2438');
  R(ctx, 0, H - 11, W, 1, '#5a4a6a');
  // neonslinga längs taket
  V.neonLine(ctx, 4, 3, W - 8, hot ? '#7cf2ff' : angry ? '#ff7a7a' : '#c08aff', hot ? '#4ad0ff' : angry ? '#ff3a3a' : '#9a5aff');
  // vänster: forumdatorn där trådarna dyker upp
  const fx = 8;
  F.desk2(ctx, fx + 3, fy, 2, 4, 2);
  F.chair2(ctx, fx + 3, fy, '#4a3a6a');
  monitor(ctx, fx + 16, fy - 33, 20, 17, tm, 'forum', st.games.length + 2);
  if (thrE) R(ctx, fx + 16, fy - 33, 20, 2, 'rgba(255,255,255,.5)');
  person(ctx, fx + 6, fy, cfg.looks[1] || FALLBACK[0], 'type', tm, 1, true, 0.2);
  // mitten: streamern med ringlampa, kamera och chatt
  const sx = Math.round(W * 0.42);
  F.desk2(ctx, sx, fy, 3, 6, 2);
  F.chair2(ctx, sx, fy, '#3a6a5a');
  monitor(ctx, sx + 14, fy - 33, 18, 17, tm, 'game', 4);
  monitor(ctx, sx + 35, fy - 31, 12, 15, tm, 'chat', 3);
  person(ctx, sx + 3, fy, cfg.looks[0] || FALLBACK[1], strE ? 'cheer' : 'type', tm, 1, true, 0.5);
  // ringlampa och kamera
  const rlx = sx - 6, rly = fy - 36;
  for (let a = 0; a < 12; a++) R(ctx, Math.round(rlx + Math.cos(a / 12 * 6.283) * 5), Math.round(rly + Math.sin(a / 12 * 6.283) * 5), 1, 1, strE ? '#fff6c0' : '#a09a78');
  R(ctx, rlx, rly + 6, 1, fy - rly - 8, '#3a3f4c');
  R(ctx, rlx - 1, rly - 1, 3, 3, '#14141e');
  if (strE) {
    // LIVE-skylt, tittarsiffra och hjärtan från chatten
    R(ctx, sx + 36, fy - 40, 14, 6, '#d83a3a');
    R(ctx, sx + 37, fy - 39, 2, 2, Math.floor(tm * 3) % 2 ? '#ffffff' : '#ff9a9a');
    drawText(ctx, 'LIVE', sx + 40, fy - 39, '#ffffff', 1);
    for (let i = 0; i < 4; i++) {
      const ph = (tm * 0.6 + i * 0.25) % 1;
      heart(ctx, sx + 36 + Math.round(Math.sin(i * 2 + tm) * 4) + i * 3, Math.round(fy - 44 - ph * 8), '#ff6a9a');
    }
  }
  // höger: anslagstavlan med fanart, och en meme som poppar upp
  const bx = W - 82;
  R(ctx, bx, 6, 74, 36, '#4a3a2a');
  R(ctx, bx + 2, 8, 70, 32, '#8a6a46');
  const arts = Math.min(6, 2 + st.games.length + (artE ? 1 : 0));
  for (let i = 0; i < arts; i++) {
    const ax = bx + 4 + (i % 3) * 23;
    const ay = 10 + Math.floor(i / 3) * 15;
    const drop = artE && i === arts - 1 ? Math.max(0, 1 - (tm - artE.t0) * 2) * -12 : 0;
    R(ctx, ax, ay + drop, 20, 13, '#f2ecd8');
    R(ctx, ax + 1, ay + 1 + drop, 18, 11, ['#4a7ad8', '#d84a7a', '#4ad08a', '#e8a83a', '#8a5ad8', '#3aa8c8'][(i + st.games.length) % 6]);
    R(ctx, ax + 4 + (i % 2) * 3, ay + 4 + drop, 5, 5, '#ffe9c8');
    R(ctx, ax + 11, ay + 7 + drop, 5, 4, ['#2a2a3a', '#d8d8f0'][i % 2]);
    R(ctx, ax + 9, ay - 1 + drop, 2, 2, i % 2 ? '#e8504a' : '#4ad07a');
  }
  if (artE && tm - artE.t0 < 1.6) sparkle(ctx, bx + 4 + ((arts - 1) % 3) * 23 + 10, 12 + Math.floor((arts - 1) / 3) * 15, '#fff2a0');
  if (memE) {
    const age = tm - memE.t0;
    const mx = Math.round(W * 0.66);
    const my = Math.round(lerp(40, 6, Math.min(1, age * 1.4)));
    R(ctx, mx, my, 26, 24, '#f6f6f2');
    R(ctx, mx + 1, my + 1, 24, 17, memE.b.v === 2 ? '#8a3a3a' : memE.b.v === 1 ? '#3a8a5a' : '#4a5a9a');
    // ett glatt ansikte
    R(ctx, mx + 8, my + 4, 10, 10, '#ffd84a');
    R(ctx, mx + 10, my + 7, 2, 2, '#14141e'); R(ctx, mx + 14, my + 7, 2, 2, '#14141e');
    if (memE.b.v === 2) { R(ctx, mx + 10, my + 12, 6, 1, '#14141e'); R(ctx, mx + 9, my + 13, 1, 1, '#14141e'); R(ctx, mx + 16, my + 13, 1, 1, '#14141e'); }
    else R(ctx, mx + 10, my + 11, 6, 2, '#14141e');
    R(ctx, mx + 2, my + 19, 22, 1, '#2a2a3a');
    R(ctx, mx + 5, my + 21, 16, 1, '#2a2a3a');
  }
  // viralt: pilen över scenen, med eld eller regn
  if (hot || angry) {
    const ax = Math.round(W * 0.3);
    const col = hot ? '#4ad07a' : '#e8504a';
    for (let i = 0; i < 5; i++) {
      const yy = hot ? 22 - i * 2 : 12 + i * 2;
      R(ctx, ax + i * 4, yy, 4, 3, col);
    }
    R(ctx, ax + 20, hot ? 10 : 22, 5, 2, col);
    R(ctx, ax + 22, hot ? 8 : 22, 1, 5, col);
    if (hot) for (let i = 0; i < 4; i++) { const ph = (tm * 0.9 + i * 0.25) % 1; heart(ctx, ax + 4 + i * 6, Math.round(24 - ph * 18), '#ffe27a'); }
    else for (let i = 0; i < 6; i++) { const ph = (tm * 1.2 + i * 0.17) % 1; R(ctx, ax + i * 4, Math.round(8 + ph * 18), 1, 2, '#7a90d8'); }
  }
  if (upE) for (let i = 0; i < 5; i++) { const ph = ((tm - upE.t0) * 0.7 + i * 0.2) % 1; heart(ctx, Math.round(W * 0.2 + i * (W * 0.12)), Math.round(40 - ph * 36), '#ff6a9a'); }
  if (dnE) bubble(ctx, fx + 22, fy - 40, 'sweat', tm - dnE.t0, 3, tm);
  if (thrE) bubble(ctx, fx + 8, fy - 38, 'exclam', tm - thrE.t0, 2.4, tm);
  // katten på bordet
  drawCat(ctx, sx + 58, fy + 3, 'sleep', Math.floor(tm * 1.5), 1, 0);
}

// ── Historien och världen ──
const FRAME_COL = { gold: ['#e8c040', '#fff0a0'], silver: ['#aab4c8', '#eef2ff'], bronze: ['#b87a4a', '#f0c09a'], plain: ['#4a4a5a', '#8a8a9a'] };
function drawHistory(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { wall: [], veterans: [], milestones: [] };
  const memE = recent(['memory'], 11, tm)[0];
  R(ctx, 0, 0, W, H, '#2a2236');
  R(ctx, 0, 0, W, 30, '#322840');
  R(ctx, 0, 30, W, 1, '#4a3c58');
  R(ctx, 0, H - 11, W, 11, '#5a3d27');
  for (let x = 0; x < W; x += 18) R(ctx, x, H - 11, 1, 11, '#47301e');
  R(ctx, 0, H - 11, W, 1, '#7a5636');
  // väggen med de senaste inramade spelen, en strålkastare över varje
  const n = Math.max(3, Math.min(st.wall.length || 3, Math.floor((W - 160) / 22)));
  const x0 = 56;
  for (let i = 0; i < n; i++) {
    const w = st.wall[i];
    const fx = x0 + i * 22;
    const fc = FRAME_COL[(w && w.frame) || 'plain'];
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.moveTo(fx + 8, 0); ctx.lineTo(fx + 16, 30); ctx.lineTo(fx, 30); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    R(ctx, fx, 4, 18, 24, fc[0]);
    R(ctx, fx, 4, 18, 1, fc[1]);
    R(ctx, fx + 2, 6, 14, 20, '#14141e');
    const hue = ((w ? w.id : i) * 47 + (w ? w.genre.length : 3) * 31) % 360;
    R(ctx, fx + 3, 7, 12, 12, `hsl(${hue},45%,40%)`);
    R(ctx, fx + 3, 14, 12, 5, `hsl(${(hue + 40) % 360},40%,28%)`);
    R(ctx, fx + 6, 9, 5, 5, `hsl(${(hue + 160) % 360},50%,70%)`);
    R(ctx, fx + 3, 20, 12, 1, '#c8c8d8');
    R(ctx, fx + 4, 22, 10, 2, w ? (w.score >= 8 ? '#e8c040' : w.score >= 7 ? '#8a94aa' : '#6a5a4a') : '#4a4a5a');
    if (w && w.cert) R(ctx, fx + 14, 24, 3, 3, '#e8e8f4');
    if (w && w.top) { R(ctx, fx + 7, 1, 4, 2, '#ffd84a'); R(ctx, fx + 6, 2, 1, 1, '#ffd84a'); R(ctx, fx + 11, 2, 1, 1, '#ffd84a'); }
    // glansen som sveper över ramarna
    const sw = ((tm * 0.35 + i * 0.06) % 3);
    if (sw < 0.3) R(ctx, fx + 2 + Math.round(sw / 0.3 * 14), 6, 2, 20, 'rgba(255,255,255,.35)');
  }
  // vitrinskåp med skivor och pokaler till höger
  const cx0 = W - 80;
  R(ctx, cx0, 6, 34, 40, '#3a2e22');
  R(ctx, cx0 + 2, 8, 30, 36, '#1a1a28');
  for (let r = 0; r < 3; r++) {
    R(ctx, cx0 + 2, 18 + r * 12, 30, 1, '#6a5a44');
    for (let k = 0; k < 4; k++) {
      const x = cx0 + 4 + k * 7;
      if (r === 1) { R(ctx, x, 21, 5, 5, ['#e8c040', '#c8d0e0', '#e8c040', '#9ad0ff'][k]); R(ctx, x + 2, 23, 1, 1, '#14141e'); }
      else { R(ctx, x + 1, 10 + r * 12, 3, 3, '#ffd84a'); R(ctx, x + 2, 13 + r * 12, 1, 3, '#c89a2a'); R(ctx, x, 16 + r * 12, 5, 1, '#c89a2a'); }
    }
  }
  // soffan med veteranen som minns och en yngre som lyssnar
  const sx = Math.round(W * 0.5);
  R(ctx, sx - 4, fy - 10, 38, 10, '#6a3a48');
  R(ctx, sx - 4, fy - 14, 38, 5, '#8a4a5a');
  R(ctx, sx - 6, fy - 12, 4, 12, '#5a2a38');
  R(ctx, sx + 32, fy - 12, 4, 12, '#5a2a38');
  const staff = cfg.G.staff || [];
  const vet = staff.slice().sort((a, b) => (a.hired || 0) - (b.hired || 0))[0];
  const vlook = vet && vet.look ? { ...vet.look, hairColor: 5 } : FALLBACK[2];
  const youngLook = cfg.looks[Math.min(cfg.looks.length - 1, 1)];
  person(ctx, sx + 6, fy - 4, vlook, memE ? 'talk' : 'sitIdle', tm, 1, true, 0.3);
  person(ctx, sx + 22, fy - 4, youngLook, memE ? 'sitIdle' : 'read', tm, -1, true, 0.7);
  R(ctx, sx + 30, fy - 9, 3, 3, '#f4f4ff');
  steam(ctx, sx + 31, fy - 10, tm, 2, 0.4);
  if (memE) {
    // en tankebubbla med en liten bild från minnet
    const age = tm - memE.t0;
    const bx = sx + 8, by = 0;
    const a = Math.min(1, age * 2) * Math.min(1, (11 - age) * 2);
    ctx.globalAlpha = a;
    R(ctx, bx, by, 28, 18, '#f6f6ff');
    R(ctx, bx + 2, by + 18, 3, 2, '#f6f6ff');
    const v = memE.b.v;
    R(ctx, bx + 2, by + 2, 24, 14, v === 1 ? '#5a3a4a' : v === 2 ? '#3a3a6a' : v === 3 ? '#3a5a4a' : '#3a6a4a');
    if (v === 0) { R(ctx, bx + 11, by + 5, 6, 5, '#ffd84a'); R(ctx, bx + 13, by + 10, 2, 3, '#ffd84a'); R(ctx, bx + 10, by + 13, 8, 1, '#c89a2a'); }
    else if (v === 1) { for (let k = 0; k < 6; k++) R(ctx, bx + 6 + k * 3, by + 5 + k, 1, 6, '#7a90d8'); }
    else if (v === 2) { for (let k = 0; k < 3; k++) { R(ctx, bx + 6 + k * 7, by + 8 - k % 2 * 3, 2, 6, '#ffd84a'); R(ctx, bx + 5 + k * 7, by + 6 - k % 2 * 3, 4, 2, '#ff6a6a'); } }
    else sparkle(ctx, bx + 14, by + 9, '#fff2a0');
    ctx.globalAlpha = 1;
  }
  // gamla spel på en hylla med konsol
  R(ctx, 4, fy - 4, 24, 4, '#4a3a58');
  R(ctx, 8, fy - 8, 12, 4, '#8a94aa');
  R(ctx, 10, fy - 7, 6, 1, '#14141e');
  if (recent(['launch', 'done', 'hallAward'], 4, tm).length) confetti(ctx, W, tm % 4.6, 3);
}

function drawReact(ctx, W, tm, cfg) {
  const fy = H - 6;
  const st = cfg.st || { genre: [], topic: [], clones: [], coming: [], swings: [] };
  const swE = recent(['trendSwing'], 7, tm)[0];
  const clE = recent(['clone'], 9, tm)[0];
  R(ctx, 0, 0, W, H, '#161a30');
  R(ctx, 0, 0, W, 30, '#1c2140');
  R(ctx, 0, H - 11, W, 11, '#2a2a40');
  for (let x = 0; x < W; x += 20) R(ctx, x, H - 11, 1, 11, '#222236');
  R(ctx, 0, H - 11, W, 1, '#4a4a68');
  // världskartan med blinkande punkter där spel säljs
  const mx = 8, mw = Math.min(70, Math.round(W * 0.3));
  R(ctx, mx, 5, mw, 30, '#0e2236');
  R(ctx, mx, 5, mw, 1, '#3a4a6a');
  for (let y = 0; y < 8; y++) for (let x = 0; x < mw / 3; x++) {
    const land = V.hash(x * 3 + y * 17 + 2) > 0.52 && Math.abs(y - 4) < 4 - Math.abs(x - mw / 6) / (mw / 12);
    if (land) R(ctx, mx + 2 + x * 3, 8 + y * 3, 2, 2, '#2a6a4a');
  }
  for (let k = 0; k < 6; k++) if (Math.floor(tm * 1.5 + k * 2) % 4) R(ctx, mx + 4 + Math.floor(V.hash(k * 11) * (mw - 10)), 9 + Math.floor(V.hash(k * 7 + 1) * 22), 2, 2, k % 2 ? '#ffd84a' : '#7cf2ff');
  // trendtavlan: staplar för de varmaste genrerna och ämnena, grönt upp och rött ner
  const bx = mx + mw + 8;
  R(ctx, bx, 5, 64, 30, '#0c1022');
  R(ctx, bx, 5, 64, 1, '#3a4a6a');
  const rows = [...st.genre.slice(0, 2), ...st.topic.slice(0, 2)];
  for (let i = 0; i < 4; i++) {
    const r = rows[i];
    const pct = r ? r.pct : 0;
    const len = Math.min(26, Math.round(Math.abs(pct) / 4) + 2);
    const col = pct > 0 ? '#4ad07a' : pct < 0 ? '#e8504a' : '#6a7a98';
    R(ctx, bx + 4, 9 + i * 7, 18, 1, '#4a5a80');
    R(ctx, bx + 4, 11 + i * 7, 18, 2, '#222a48');
    R(ctx, bx + 34, 8 + i * 7, 2, 5, '#4a5a80');
    R(ctx, bx + (pct < 0 ? 35 - len : 35), 9 + i * 7, len, 3, col);
    if (swE && r && ((swE.b.v === 1 && pct < 0) || (swE.b.v !== 1 && pct > 0)) && Math.floor(tm * 6) % 2) R(ctx, bx + 3, 8 + i * 7, 58, 5, 'rgba(255,255,255,.2)');
  }
  if (swE) {
    const up = swE.b.v !== 1;
    for (let k = 0; k < 5; k++) { const ph = ((tm - swE.t0) * 0.6 + k * 0.2) % 1; R(ctx, bx + 46 + (k % 3) * 4, Math.round(up ? 32 - ph * 26 : 8 + ph * 24), 2, 3, up ? '#4ad07a' : '#e8504a'); }
  }
  // kopiatorn: spottar ut kopior av ens spel när en konkurrent släpper en kopia
  const kx = Math.round(W * 0.58);
  R(ctx, kx, fy - 18, 28, 18, '#8a94aa');
  R(ctx, kx, fy - 18, 28, 2, '#c8d0e0');
  R(ctx, kx + 3, fy - 14, 22, 4, '#2a3248');
  R(ctx, kx + 4, fy - 6, 16, 2, '#4a5470');
  const on = !!clE || st.coming.length > 0;
  R(ctx, kx + 22, fy - 7, 3, 3, on && Math.floor(tm * 4) % 2 ? '#4ad07a' : '#2a4a3a');
  if (clE) {
    const age = tm - clE.t0;
    const sh = Math.floor(age * 6) % 2;
    R(ctx, kx + 3, fy - 13 + sh, 22, 1, '#fffff0');
    for (let k = 0; k < 4; k++) {
      const ph = Math.min(1, Math.max(0, age * 0.8 - k * 0.2));
      if (ph > 0 && ph < 1) { R(ctx, kx + 4 + k * 5, fy - 4 + Math.round(ph * 6), 4, 5, '#f4f4f0'); R(ctx, kx + 5 + k * 5, fy - 3 + Math.round(ph * 6), 2, 2, k % 2 ? '#d84a7a' : '#4a7ad8'); }
    }
    drawText(ctx, 'KOPIA', kx + 1, fy - 24, '#ff7a7a', 1);
  }
  // konkurrenten i kostym som tittar på (och lite surt eller nöjt)
  const rival = { skin: 2, hair: 0, hairColor: 0, shirt: 14, pants: 0, acc: 0, body: 0 };
  person(ctx, kx + 40, fy + 2, rival, clE ? 'wave' : 'stand', tm, -1);
  if (clE) bubble(ctx, kx + 41, fy - 32, clE.b.v === 1 ? 'sweat' : 'exclam', tm - clE.t0, 3, tm);
  // analytikern vid skärmen
  F.desk2(ctx, Math.round(W * 0.82), fy, 2, 5, 2);
  person(ctx, Math.round(W * 0.82) + 6, fy, cfg.looks[0], Math.floor(tm / 8) % 2 ? 'think' : 'type', tm, 1, true);
}

const DRAW = { studio: drawStudio, factory: drawFactory, engine: drawEngine, group: drawGroup, lab: drawLab, shop: drawShop, live: drawLive, bank: drawBank, market: drawMarket, hall: drawHall, crisis: drawCrisis, war: drawWar, expo: drawExpo, press: drawPress, fans: drawFans, history: drawHistory, react: drawReact };

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
