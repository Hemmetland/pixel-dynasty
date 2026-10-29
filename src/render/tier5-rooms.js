import { NEON } from './pal.js';
import { shade } from '../core/util.js';
import { lang } from '../core/i18n.js';
import * as V from './props2.js';
import * as F from './furniture.js';
import * as T from './tier5-props.js';
import { FAC_VARIANTS, FAC_STYLES, FAC_NAMES } from './tier5-fac.js';

const { R, RA } = V;
const { GOLD } = T;

// Dynasti-tornets rum (nivå 5). Varje rum är en definition i samma form som DEF i rooms.js:
// windows, stations, pendants, wallArt, decor, plus valfritt lights, anim (listor för rooms.js dynamic) och dynamic (egen animation).

// ── Stilar: vägg, rand, dado, list, golv, rumsljus ──
const S = (wall, dado, trim, floor, light) => ({ wall, wall2: shade(wall, -0.06), dado, trim, floor, floorHi: shade(floor, 0.22), light });
const DEV_F = [
  ['#3a4d88', '#222f58', GOLD.md, '#5a4a42', [1, 0.86, 0.6]], // 0: marinblått
  ['#2a6280', '#183c50', GOLD.md, '#3a5058', [0.74, 0.94, 1]], // 1: djup turkos
  ['#5e3e86', '#38244f', GOLD.lt, '#5a4054', [1, 0.8, 0.78]], // 2: aubergine
  ['#444a62', '#262a3c', GOLD.lt, '#4a4a56', [1, 0.92, 0.74]], // 3: grafit
];
export const TW_STYLES = {
  tw_lobby: S('#e8dcc4', '#1c2748', GOLD.md, '#d8d2c4', [1, 0.9, 0.68]),
  tw_board: S('#4a3426', '#2a1c14', GOLD.md, '#2a2230', [1, 0.9, 0.72]),
  tw_skybar: S('#2b2250', '#161030', '#c8a050', '#2a2048', [0.78, 0.62, 1]),
  tw_cafe: S('#e6e0d4', '#2e8a86', GOLD.md, '#c8c0b0', [1, 0.92, 0.78]),
  tw_server: S('#0e1a3a', '#08102a', '#3a8ac8', '#0a1020', [0.4, 0.7, 1]),
  tw_mocap: S('#14121e', '#0c0a16', '#ff4fb8', '#0c0a14', [0.82, 0.55, 1]),
  ...FAC_STYLES,
};
for (let f = 0; f < 4; f++) for (const k of ['a', 'b']) TW_STYLES[`tw_dev${f}${k}`] = S(...DEV_F[f]);

// ── Utvecklarrummen: fönster, väggskärm och avdelningens inredning ──
// WIN: [x, bredd] per fönster (alla 24 px höga med guldram). SCR: [x, typ, frö] för den animerade väggskärmen (32 x 17).
const WIN = {
  tw_dev0a: [[8, 30], [118, 30]], tw_dev0b: [[8, 30]],
  tw_dev1a: [[8, 30], [88, 30]], tw_dev1b: [[8, 30], [46, 30]],
  tw_dev2a: [[8, 30], [118, 30]], tw_dev2b: [[8, 30]],
  tw_dev3a: [[8, 30], [46, 30]], tw_dev3b: [[8, 30]],
};
const SCR = {
  tw_dev0a: [64, 'chart', 1], tw_dev0b: [47, 'video', 2],
  tw_dev1a: [47, 'code', 3], tw_dev1b: [86, 'map', 4],
  tw_dev2a: [48, 'video', 5], tw_dev2b: [44, 'chart', 6],
  tw_dev3a: [86, 'slides', 7], tw_dev3b: [44, 'chart', 8],
};
const WIDTH = { tw_dev0a: 156, tw_dev0b: 126, tw_dev1a: 126, tw_dev1b: 156, tw_dev2a: 156, tw_dev2b: 126, tw_dev3a: 156, tw_dev3b: 126 };
const SCR_Y = 38; // väggskärmens överkant: fy - 38

const plantH = (ctx, x, y, s) => V.plantHang(ctx, x, y, 3, 8, s);
const COVERS = [['#e8504a', '#f2c84a'], ['#4a90e0', '#7cf2ff'], ['#6cc86a', '#f2f2a0'], ['#c860c8', '#ffd0f0']];

const DEV_DECOR = {
  tw_dev0a(ctx, rx, fy) { // produktion: kanban, pokalhylla och tavlor
    F.kanban(ctx, rx + 46, fy - 41, 14, 15, 4);
    V.wallShelf(ctx, rx + 99, fy - 30, 15, 'tcp', 3);
    V.frame(ctx, rx + 98, fy - 44, 8, 11, 1, 5, GOLD.md);
    V.frame(ctx, rx + 107, fy - 43, 7, 9, 4, 9, GOLD.md);
  },
  tw_dev0b(ctx, rx, fy) { // utgivning: spelomslag på väggen
    for (let i = 0; i < 3; i++) T.cover(ctx, rx + 85 + i * 12, fy - 42, 9, 14, ...COVERS[i], i);
    plantH(ctx, rx + 80, fy - 46, 2);
  },
  tw_dev1a(ctx, rx, fy) { // programmering: datadiod-rad under taket
    V.neonLine(ctx, rx + 44, fy - 44, 38, NEON.cyanHi, NEON.cyan);
    for (let i = 0; i < 9; i++) R(ctx, rx + 46 + i * 4, fy - 43, 2, 1, i % 3 ? '#4de1ff' : '#ffe27a');
    plantH(ctx, rx + 84, fy - 45, 1);
  },
  tw_dev1b(ctx, rx, fy) { // motor & teknik: ritning
    T.blueprint(ctx, rx + 123, fy - 42, 22, 16);
    plantH(ctx, rx + 80, fy - 45, 3);
  },
  tw_dev2a(ctx, rx, fy) { // art: inramade verk
    T.crownMold(ctx, rx, fy - 48, 156);
    V.frame(ctx, rx + 88, fy - 42, 11, 14, 0, 3, GOLD.md);
    V.frame(ctx, rx + 101, fy - 40, 10, 10, 3, 5, GOLD.md);
    plantH(ctx, rx + 41, fy - 45, 4);
  },
  tw_dev2b(ctx, rx, fy) { // ljud: akustikpaneler och guldskivor
    T.acoustic(ctx, rx + 81, fy - 42, 12, 14);
    T.goldRecord(ctx, rx + 96, fy - 42);
    T.goldRecord(ctx, rx + 108, fy - 42);
    R(ctx, rx + 97, fy - 30, 21, 1, GOLD.dk);
  },
  tw_dev3a(ctx, rx, fy) { // speldesign: stor whiteboard med lappar
    F.whiteboardBig(ctx, rx + 123, fy - 42, 24, 16, 11);
    plantH(ctx, rx + 80, fy - 45, 5);
  },
  tw_dev3b(ctx, rx, fy) { // kvalitet: checklista och buggaffisch
    T.checklist(ctx, rx + 83, fy - 42, 28, 17);
    V.frame(ctx, rx + 113, fy - 40, 7, 10, 2, 8, GOLD.md);
  },
};

function devDef(id) {
  const w = WIDTH[id];
  const wins = WIN[id];
  const scr = SCR[id];
  return {
    windows: (rx, fy) => wins.map(([x, ww]) => ({ x: rx + x, y: fy - 40, w: ww, h: 22, kind: 'plain' })),
    stations: () => [],
    pendants: (rx) => {
      // lamporna hänger mitt för fönstren så att de inte täcker väggskärmen eller väggdekorationerna
      const xs = wins.map(([x, ww]) => x + ww / 2);
      return xs.map((x) => ({ x: Math.round(rx + x), kind: 'cone', c: '#b8883a', drop: 5 }));
    },
    wallArt(ctx, rx, rw, fy) {
      for (let x = 0; x < rw; x += 12) R(ctx, rx + x, fy - 45, 1, 33, 'rgba(0,0,0,0.06)');
    },
    decor(ctx, r, fy) {
      const rx = r.x0;
      T.crownMold(ctx, rx, fy - 48, w);
      wins.forEach(([x, ww], i) => {
        T.goldFrame(ctx, rx + x, fy - 40, ww, 22, 1);
        if ((i + r.floor) % 2 === 0) T.sheer(ctx, rx + x, fy - 40, ww, 22);
        RA(ctx, rx + x, fy - 40, ww, 22, '#fff4d0', 0.04);
      });
      T.pilaster(ctx, rx + 2, fy - 45, 33, 3);
      T.pilaster(ctx, rx + w - 5, fy - 45, 33, 3);
      V.wallScreen(ctx, rx + scr[0], fy - SCR_Y, 32, 17, scr[1], scr[2]);
      DEV_DECOR[id](ctx, rx, fy);
    },
    anim: (rx, fy) => ({ screens: [{ x: rx + scr[0], y: fy - SCR_Y, w: 32, h: 17, kind: scr[1], seed: scr[2] }] }),
  };
}
const DEV = Object.fromEntries(Object.keys(WIDTH).map((id) => [id, devDef(id)]));

// Hologram: glob med skanlinje och roterande meridian (ritas varje bildruta, billigt).
function holoGlobeDyn(A, x, y, r, t) {
  for (let yy = -r; yy <= r; yy++) {
    const k = yy / (r + 0.5);
    const w = Math.round(r * Math.sqrt(1 - k * k));
    A.fillStyle = `rgba(77,225,255,${0.24 + 0.14 * Math.sin(t * 3 + yy)})`;
    A.fillRect(x - w, y + yy, w * 2 + 1, 1);
  }
  const off = Math.round(Math.sin(t * 2) * (r - 1));
  A.fillStyle = 'rgba(200,250,255,0.55)';
  A.fillRect(x + off, y - r + 1, 1, r * 2 - 1);
  const sl = Math.floor(t * 9) % (r * 2 + 1);
  A.fillStyle = 'rgba(255,255,255,0.7)';
  A.fillRect(x - Math.round(r * 0.7), y - r + sl, Math.round(r * 1.4) + 1, 1);
}
const floorY = (room, L) => -4 - room.floor * L.pitch;

// ── Lobby: atrium med glasvägg, reception, kristallkrona och trofévägg ──
const LOBBY = {
  windows: (rx, fy) => [{ x: rx + 5, y: fy - 41, w: 15, h: 33, kind: 'plain' }],
  stations: (rx) => [
    // bakom diskens vänstra halva, vänd mot entrén; scene.js målar diskens front ovanpå (FRONT nedan)
    { kind: 'reception', x: rx + 31, dir: -1, pose: 'stand' },
    { kind: 'stand', x: rx + 14, dir: 1, pose: 'stand' },
    { kind: 'window', x: rx + 8, dir: 1, pose: 'stand' },
  ],
  pendants: () => [],
  wallArt(ctx, rx, w, fy) {
    for (let i = 0; i < w; i += 8) R(ctx, rx + i, fy - 44, 1, 32, 'rgba(160,130,70,0.14)');
  },
  decor(ctx, r, fy, env) {
    const rx = r.x0;
    T.crownMold(ctx, rx, fy - 48, r.w);
    T.goldFrame(ctx, rx + 5, fy - 41, 15, 33, 1);
    T.sheer(ctx, rx + 5, fy - 41, 15, 33);
    T.marbleFloor(ctx, rx, fy, r.w);
    T.pilaster(ctx, rx + 22, fy - 45, 42, 3);
    T.reception(ctx, rx + 24, fy, 22);
    T.chandelier(ctx, rx + 35, fy - 44, 22, true);
    V.plantFloor(ctx, rx + 5, fy, 16, 3, GOLD.dk);
    T.trophyWall(ctx, rx + 48, fy, env.opts.awards || 0, env.opts.games || [], lang === 'en' ? 'HALL OF FAME' : 'ÄRANS HALL');
  },
  lights: (rx, fy) => [{ x: rx + 35, y: fy - 28, r: 34, i: 0.5, c: [1, 0.92, 0.7], kind: 1, pri: 1 }],
  dynamic(A, cx, gy, L, r, t) {
    const fy = floorY(r, L);
    holoGlobeDyn(A, cx + r.x0 + 39, gy + fy - 24, 4, t);
    // kristallkronan glittrar
    [[-9, 11], [-3, 12], [4, 12], [10, 11], [-6, 12], [3, 12]].forEach(([dx, dy], i) => {
      if ((Math.floor(t * 4) + i * 2) % 7 !== 0) return;
      A.fillStyle = 'rgba(255,255,255,0.95)';
      A.fillRect(cx + r.x0 + 35 + dx, gy + fy - 44 + dy, 1, 1);
      A.fillStyle = 'rgba(255,255,255,0.5)';
      A.fillRect(cx + r.x0 + 35 + dx - 1, gy + fy - 44 + dy, 3, 1);
      A.fillRect(cx + r.x0 + 35 + dx, gy + fy - 44 + dy - 1, 1, 3);
    });
  },
};

// ── Styrelserummet: valnötspaneler, panoramafönster, bord och hologram ──
const BOARD = {
  windows: (rx, fy) => [{ x: rx + 34, y: fy - 40, w: 54, h: 22, kind: 'plain' }],
  stations: (rx) => [
    { kind: 'seat', x: rx + 17, dir: 1, pose: 'sit' },
    { kind: 'seat', x: rx + 80, dir: -1, pose: 'sit' },
    { kind: 'stand', x: rx + 48, dir: 1, pose: 'present' },
    { kind: 'board', x: rx + 6, dir: 1, pose: 'present' },
    { kind: 'stand', x: rx + 91, dir: -1, pose: 'stand' },
    { kind: 'window', x: rx + 60, dir: 1, pose: 'stand' },
  ],
  pendants: (rx) => [{ x: rx + 40, kind: 'cone', c: '#b8883a', drop: 4 }, { x: rx + 64, kind: 'cone', c: '#b8883a', drop: 4 }],
  wallArt(ctx, rx, w, fy) {
    for (let x = 0; x < w; x += 6) R(ctx, rx + x, fy - 45, 5, 33, x % 12 ? '#523a2a' : '#4a3426');
    for (let x = 0; x < w; x += 12) R(ctx, rx + x + 5, fy - 45, 1, 33, GOLD.dk);
  },
  decor(ctx, r, fy) {
    const rx = r.x0;
    T.crownMold(ctx, rx, fy - 48, r.w);
    T.goldFrame(ctx, rx + 34, fy - 40, 54, 22, 2);
    T.sheer(ctx, rx + 34, fy - 40, 54, 22, '#f0e6d0');
    V.wallScreen(ctx, rx + 4, fy - 38, 24, 16, 'slides', 3);
    R(ctx, rx + 3, fy - 39, 26, 1, GOLD.md);
    R(ctx, rx + 3, fy - 22, 26, 1, GOLD.dk);
    for (const sx of [rx + 31, rx + 90]) { R(ctx, sx, fy - 33, 2, 5, GOLD.md); R(ctx, sx, fy - 34, 2, 1, GOLD.hi); RA(ctx, sx - 2, fy - 36, 6, 9, '#ffe8a0', 0.18); }
    T.pilaster(ctx, rx + 30, fy - 45, 33, 3);
    T.pilaster(ctx, rx + 91, fy - 45, 33, 3);
    // stolar på långsidan (ryggar), bordet och det som står på det
    [29, 41, 53, 65].forEach((x, i) => T.chairBack(ctx, rx + x, fy, ['#243a6a', '#6a2a3a'][i % 2]));
    T.boardTable(ctx, rx + 22, fy, 54);
    T.leatherChair(ctx, rx + 15, fy, '#243a6a', 1);
    T.leatherChair(ctx, rx + 78, fy, '#243a6a', -1);
    F.laptop(ctx, rx + 25, fy - 15, 1);
    F.laptop(ctx, rx + 62, fy - 15, -1);
    R(ctx, rx + 55, fy - 19, 2, 4, '#9ad8f0');
    R(ctx, rx + 55, fy - 19, 1, 4, '#d8f4ff');
    F.mug(ctx, rx + 66, fy - 15);
    R(ctx, rx + 31, fy - 16, 5, 1, '#f4f0e4');
    T.holoBase(ctx, rx + 44, fy - 15, 7);
    V.plantFloor(ctx, rx + 93, fy, 14, 4, GOLD.dk);
  },
  anim: (rx, fy) => ({ screens: [{ x: rx + 4, y: fy - 38, w: 24, h: 16, kind: 'slides', seed: 0 }] }),
  lights: (rx, fy) => [{ x: rx + 16, y: fy - 36, r: 26, i: 0.5, c: [0.75, 0.9, 1], kind: 2, pri: 2 }],
  dynamic(A, cx, gy, L, r, t) {
    holoGlobeDyn(A, cx + r.x0 + 44, gy + floorY(r, L) - 24, 4, t + 1);
  },
};

// ── Skybar: panoramafönster, soffa, fåtölj och bar med flaskor i baklysning ──
const SKYBAR = {
  windows: (rx, fy) => [{ x: rx + 4, y: fy - 40, w: 34, h: 22, kind: 'plain' }],
  stations: (rx) => [
    { kind: 'sofa', x: rx + 10, dir: 1, pose: 'sit' },
    { kind: 'sofa', x: rx + 22, dir: 1, pose: 'sit' },
    { kind: 'sofa', x: rx + 40, dir: -1, pose: 'sit' },
    { kind: 'stand', x: rx + 57, dir: -1, pose: 'stand' },
    { kind: 'window', x: rx + 33, dir: 1, pose: 'stand' },
  ],
  pendants: (rx) => [{ x: rx + 22, kind: 'dome', c: '#4a3a7a', drop: 3 }],
  wallArt() {},
  decor(ctx, r, fy) {
    const rx = r.x0;
    T.crownMold(ctx, rx, fy - 48, r.w);
    T.goldFrame(ctx, rx + 4, fy - 40, 34, 22, 2);
    F.rug(ctx, rx + 1, fy, 46, '#3a2a62', '#a08adc');
    F.sofa(ctx, rx + 2, fy, 28, '#3a9aa8', '#f2c84a');
    F.armchair(ctx, rx + 32, fy, '#c8508a');
    T.bottleShelf(ctx, rx + 49, fy - 44, 17);
    T.bar(ctx, rx + 48, fy, 18);
    T.stool(ctx, rx + 49, fy);
    T.stool(ctx, rx + 61, fy);
  },
  lights: (rx, fy) => [{ x: rx + 57, y: fy - 18, r: 28, i: 0.5, c: [0.4, 0.88, 1], kind: 1, pri: 1 }],
  dynamic(A, cx, gy, L, r, t) {
    const fy = floorY(r, L);
    A.fillStyle = `rgba(77,225,255,${0.18 + 0.14 * Math.sin(t * 2.4)})`;
    A.fillRect(cx + r.x0 + 48, gy + fy - 4, 18, 3);
  },
};

// ── Café: liten kaffebar med marmor och espresso ──
const CAFE = {
  windows: () => [],
  stations: (rx) => [
    { kind: 'coffee', x: rx + 22, dir: -1, pose: 'drink' },
    { kind: 'stand', x: rx + 9, dir: 1, pose: 'talk' },
  ],
  pendants: (rx) => [{ x: rx + 20, kind: 'globe', drop: 4 }],
  wallArt() {},
  decor(ctx, r, fy) {
    const rx = r.x0;
    T.crownMold(ctx, rx, fy - 48, r.w);
    T.marbleFloor(ctx, rx, fy, r.w);
    T.chalkBoard(ctx, rx + 3, fy - 38, 9, 11);
    T.cafeCounter(ctx, rx + 13, fy, 16);
    F.espresso(ctx, rx + 15, fy - 17);
    F.mug(ctx, rx + 24, fy - 17, '#f4efe2');
    V.plantSmall(ctx, rx + 2, fy, 2, GOLD.md);
  },
  anim: (rx, fy) => ({ steam: [{ x: rx + 21, y: fy - 32 }] }),
};

// ── Serverhall: kylda racks med cyan kanter och dataströmmar ──
const SERVER = {
  windows: () => [],
  stations: (rx) => [
    { kind: 'rack', x: rx + 24, dir: 1, pose: 'laptop' },
    { kind: 'rack', x: rx + 10, dir: 1, pose: 'stand' },
  ],
  pendants: () => [],
  wallArt(ctx, rx, w, fy) {
    for (let y = fy - 44; y < fy - 12; y += 6) R(ctx, rx, y + 5, w, 1, 'rgba(100,170,255,0.10)');
  },
  racks: (rx, fy) => [rx + 3, rx + 18, rx + 33].map((x, i) => ({ x, y: fy, w: 13, h: 38, seed: 3 + i })),
  decor(ctx, r, fy) {
    const rx = r.x0;
    T.crownMold(ctx, rx, fy - 48, r.w);
    F.cableTray(ctx, rx + 2, fy - 45, r.w - 4);
    for (const k of this.racks(rx, fy)) {
      F.rack(ctx, k.x, k.y, k.w, k.h, k.seed);
      R(ctx, k.x - 1, fy - 38, 1, 38, NEON.cyan);
      RA(ctx, k.x - 2, fy - 38, 3, 38, NEON.cyan, 0.25);
      R(ctx, k.x + k.w, fy - 38, 1, 38, '#2a5a8a');
    }
    // statusskärm och hologram-spira
    F.monitorPanel(ctx, rx + 48, fy - 36, 6, 14);
    R(ctx, rx + 2, fy - 2, 52, 1, NEON.cyan);
    RA(ctx, rx + 2, fy - 5, 52, 4, NEON.cyan, 0.12);
    for (let x = rx + 2; x < rx + 54; x += 6) R(ctx, x, fy - 1, 3, 1, GOLD.md);
  },
  lights: (rx, fy) => [{ x: rx + 28, y: fy - 22, r: 34, i: 0.5, c: [0.3, 0.55, 1], kind: 1, pri: 1 }],
  dynamic(A, cx, gy, L, r, t) {
    const fy = floorY(r, L);
    for (let k = 0; k < 4; k++) {
      const x = r.x0 + 16 + k * 15 - (k === 3 ? 2 : 0);
      const p = (t * 16 + k * 13) % 34;
      A.fillStyle = 'rgba(160,240,255,0.85)';
      A.fillRect(cx + x, gy + fy - 5 - p, 1, 2);
      A.fillStyle = 'rgba(77,225,255,0.35)';
      A.fillRect(cx + x, gy + fy - 3 - p, 1, 3);
    }
  },
};

// ── Mocap-scen: svart rum med markörer, kameror och en hologram-avatar ──
const MOCAP = {
  windows: () => [],
  stations: (rx) => [
    { kind: 'board', x: rx + 12, dir: 1, pose: 'present' },
    { kind: 'board', x: rx + 24, dir: 1, pose: 'present' },
    { kind: 'stand', x: rx + 35, dir: -1, pose: 'talk' },
  ],
  pendants: () => [],
  wallArt(ctx, rx, w, fy) {
    for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) {
      if (V.hash(i * 5 + j * 11) < 0.35) continue;
      RA(ctx, rx + 3 + i * 6, fy - 41 + j * 6, 1, 1, (i + j) % 2 ? NEON.cyanHi : NEON.magentaHi, 0.55);
    }
  },
  decor(ctx, r, fy) {
    const rx = r.x0;
    T.crownMold(ctx, rx, fy - 48, r.w);
    // truss med spotlights
    R(ctx, rx + 2, fy - 45, r.w - 4, 2, '#4a5268');
    R(ctx, rx + 2, fy - 45, r.w - 4, 1, '#8a96b0');
    for (let x = rx + 4; x < rx + r.w - 3; x += 3) R(ctx, x, fy - 44, 1, 1, '#2a2f3c');
    [[8, NEON.cyan], [18, NEON.magenta], [28, NEON.cyan], [37, NEON.magenta]].forEach(([dx, c]) => {
      R(ctx, rx + dx, fy - 43, 3, 3, '#1a1e28');
      R(ctx, rx + dx + 1, fy - 41, 1, 1, c);
      for (let i = 0; i < 9; i += 2) RA(ctx, rx + dx - (i >> 1), fy - 40 + i, 3 + i, 2, c, 0.07);
    });
    // fångstvolymen: hörnmarkeringar i cyan
    for (const [bx, by, dx, dy] of [[rx + 8, fy - 34, 1, 1], [rx + 34, fy - 34, -1, 1], [rx + 8, fy - 6, 1, -1], [rx + 34, fy - 6, -1, -1]]) {
      RA(ctx, dx > 0 ? bx : bx - 4, by, 5, 1, NEON.cyanHi, 0.8);
      RA(ctx, bx, dy > 0 ? by : by - 4, 1, 5, NEON.cyanHi, 0.8);
    }
    // scenskiva
    R(ctx, rx + 3, fy - 3, 36, 3, '#1a1430');
    R(ctx, rx + 3, fy - 3, 36, 1, NEON.cyan);
    R(ctx, rx + 3, fy - 1, 36, 1, NEON.magenta);
    RA(ctx, rx + 3, fy - 6, 36, 4, NEON.cyan, 0.1);
    // kameror på stativ
    for (const [x, d] of [[rx + 3, 1], [rx + 38, -1]]) {
      R(ctx, x + 1, fy - 12, 1, 12, '#4a5268');
      R(ctx, x - 1, fy - 2, 5, 2, '#2a2f3c');
      R(ctx, d > 0 ? x : x - 3, fy - 17, 6, 5, '#1a1e28');
      R(ctx, d > 0 ? x : x - 3, fy - 17, 6, 1, '#6a769a');
      R(ctx, d > 0 ? x + 4 : x - 3, fy - 16, 2, 3, '#ff3a4a');
      RA(ctx, d > 0 ? x + 5 : x - 5, fy - 17, 4, 5, '#ff3a4a', 0.2);
    }
  },
  lights: (rx, fy) => [{ x: rx + 21, y: fy - 22, r: 30, i: 0.5, c: [0.8, 0.5, 1], kind: 1, pri: 1 }],
  dynamic(A, cx, gy, L, r, t) {
    // hologram-avatar: trådfigur som rör sig (dansar) i takt med tiden
    const fy = floorY(r, L);
    const x = cx + r.x0 + 21;
    const y = gy + fy - 8;
    const a = Math.sin(t * 3.1);
    const b = Math.sin(t * 3.1 + 2);
    const line = (x0, y0, x1, y1, c) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      A.fillStyle = c;
      for (let i = 0; i <= n; i++) A.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
    };
    A.globalAlpha = 0.8;
    const hx = Math.round(Math.sin(t * 1.5) * 1);
    line(x + hx, y - 12, x, y - 20, '#7cf2ff');
    A.fillStyle = '#c8faff';
    A.fillRect(x + hx - 1, y - 24, 3, 3);
    line(x, y - 18, x + Math.round(a * 5), y - 12 - Math.round(Math.abs(a) * 2), '#7cf2ff');
    line(x, y - 18, x - Math.round(b * 5), y - 12 - Math.round(Math.abs(b) * 2), '#7cf2ff');
    line(x + hx, y - 12, x + Math.round(b * 4), y, '#4de1ff');
    line(x + hx, y - 12, x - Math.round(a * 4), y, '#4de1ff');
    A.fillStyle = '#ff7ad8';
    for (const [px, py] of [[x + Math.round(a * 5), y - 12 - Math.round(Math.abs(a) * 2)], [x - Math.round(b * 5), y - 12 - Math.round(Math.abs(b) * 2)], [x + Math.round(b * 4), y], [x - Math.round(a * 4), y], [x + hx, y - 12]]) A.fillRect(px, py, 1, 1);
    A.globalAlpha = 1;
  },
};

// Den som står vid en disk ritas bakom den: scene.js kopierar de här rutorna (x, y, b, h, i husets koordinater) från det
// statiska lagret ovanpå personen. Lobbyn: receptionsdiskens marmorskiva och front (T.reception på rx + 24, 22 px bred).
export const FRONT = {
  tw_lobby: (rx, fy) => [
    [rx + 23, fy - 17, 24, 3],
    [rx + 24, fy - 14, 22, 14],
  ],
};
export const TW_ROOMS = { tw_lobby: LOBBY, tw_board: BOARD, tw_skybar: SKYBAR, tw_cafe: CAFE, tw_server: SERVER, tw_mocap: MOCAP, ...DEV };

// ── Anläggningsplatserna: tolv olika rum när de är tomma, och guldinredning när något är byggt ──
export const TW_FAC = {
  room: (slot) => ({ def: `tw_f${slot}`, name: FAC_NAMES[slot % FAC_NAMES.length] }),
  empty(ctx, rx, fy, v, room) {
    FAC_VARIANTS[v % FAC_VARIANTS.length](ctx, rx, fy, room);
  },
  // byggd anläggning: guldlist, tavla och växt så att den hör till tornets stil
  extra(ctx, room, fy, fac) {
    const rx = room.x0;
    T.crownMold(ctx, rx, fy - 48, 56);
    V.pendant(ctx, rx + 28, fy - 44, 4, 'cone', '#b8883a', '255,230,170');
    if (fac.id === 'coffee') { V.frame(ctx, rx + 36, fy - 40, 10, 8, 1, 6, GOLD.md); }
    else if (fac.id === 'lab' || fac.id === 'qa') V.frame(ctx, rx + 44, fy - 41, 8, 10, 4, room.slot, GOLD.md);
    else if (fac.id === 'marketing') V.plantFloor(ctx, rx + 44, fy, 14, room.slot, GOLD.dk);
    else if (fac.id === 'training') V.frame(ctx, rx + 6, fy - 44, 12, 8, 0, room.slot, GOLD.md);
    else if (fac.id === 'gameroom') V.neonLine(ctx, rx + 6, fy - 44, 44, NEON.cyanHi, NEON.cyan);
  },
};
