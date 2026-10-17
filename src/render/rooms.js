import { roomStyle, NEON, GRAPH } from './pal.js';
import { shade } from '../core/util.js';
import { textWidth, drawText } from './font.js';
import { lang } from '../core/i18n.js';
import * as P from './props.js';
import * as V from './props2.js';
import * as F from './furniture.js';
import { drawFacade, drawRoofGarden, roofLights, roofAnim } from './rooftop.js';

const { R, RA } = V;

// Studiohuset (nivå 3, "v2"): rumsplan, layout-data (rooms/stations/lights) och ritning av hela byggnaden.
// Koordinater: x relativt husets mitt (som desks[].x), y relativt marken (negativt uppåt), fy = golvets y.
export const V2 = { pitch: 54, intH: 48, slotW: 56, deskSp: 30, wall: 6, found: 4 };

// Byggnadsnivåer som ritas med rumssystemet: { BW, floors, roofH, roof, plan, slotsPerFloor, band }.
// plan = rumsplan per våning (vänster till höger, [typ, bredd] eller [typ, bredd, extra]); anläggningsplatserna (slots) fyller alltid högerkanten
// (slotsPerFloor per våning, standard 2). Utvecklarrum får (bredd - 6) / deskSp skrivbord om inte extra.desks anges.
// roof = nyckel i ROOFS (takterrass, fasad och skylt). band = neonskylt i bjälklaget mellan våning 1 och 2.
export const V2_TIERS = {
  3: {
    BW: 424, floors: 3, roofH: 44, roof: 'garden', band: 'BETTER CODE TOGETHER',
    plan: [
      [['lobby', 78], ['lounge', 66], ['dev', 156]],
      [['meeting', 90], ['dev', 156], ['kitchen', 54]],
      [['dev', 156], ['server', 60], ['whiteboard', 84]],
    ],
  },
};
export const registerTier = (tier, cfg) => { V2_TIERS[tier] = cfg; };
export const hasV2 = (tier) => !!V2_TIERS[tier];

// Tak: { lights(topY, BW), anim(topY, BW) -> { bulbs, neon }, steam: [{ x, dy }], facade(ctx, L, opts), roof(ctx, L, opts) }
const ROOFS = { garden: { lights: roofLights, anim: roofAnim, steam: [{ x: 206, dy: -27 }], facade: drawFacade, roof: drawRoofGarden } };
export const registerRoof = (kind, def) => { ROOFS[kind] = def; };

// Rumsljusets styrka per rumstyp (ljusa väggar behöver mindre, mörka serverrummet mer)
export const LIGHT_I = { lobby: 0.8, lounge: 0.85, dev: 0.8, meeting: 0.75, kitchen: 0.62, whiteboard: 0.6, server: 0.95 };
const bandX = (sign) => -Math.round(textWidth(sign) / 2) - 30;

// ── Rumsdefinitioner: fönster, stationer, lampor och möbler ──
// rx = rummets vänsterkant, w = bredd, fy = golv. Alla x/y nedan är i layoutkoordinater.
export const DEF = {};

// Pendlar (delas av ritning och ljus): [{ x, kind, drop? }]
const pendants = (rx, w, n, kind) => Array.from({ length: n }, (_, i) => ({ x: Math.round(rx + (i + 0.5) * (w / n)), kind }));

DEF.lobby = {
  windows: (rx, fy) => [{ x: rx + 3, y: fy - 35, w: 24, h: 32, kind: 'door' }],
  stations: (rx) => [
    { kind: 'reception', x: rx + 32, dir: 1, pose: 'stand' },
    { kind: 'stand', x: rx + 16, dir: 1, pose: 'stand' },
    { kind: 'window', x: rx + 12, dir: 1, pose: 'stand' },
  ],
  pendants: (rx) => [{ x: rx + 9, kind: 'globe', drop: 8 }, { x: rx + 20, kind: 'globe', drop: 13 }],
  wallArt(ctx, rx, w, fy) {
    for (let i = 0; i < 46; i += 3) R(ctx, rx + 30 + i, fy - 34, 2, 23, i % 6 ? '#86684a' : '#775a3e');
    R(ctx, rx + 30, fy - 34, 46, 1, '#a88460');
    R(ctx, rx + 30, fy - 12, 46, 1, '#5a4430');
    RA(ctx, rx + 30, fy - 34, 46, 23, '#000000', 0.08);
  },
  decor(ctx, r, fy, env) {
    const rx = r.x0;
    F.doorFrame(ctx, rx + 3, fy - 35, 24, 32);
    R(ctx, rx + 2, fy - 3, 26, 3, '#2a3042');
    R(ctx, rx + 5, fy - 2, 20, 1, '#8a2a3a');
    F.umbrellaStand(ctx, rx + 29, fy);
    V.plantFloor(ctx, rx + 30, fy - 8, 14, 3, '#d8d0c0');
    F.receptionDesk(ctx, rx + 39, fy, 36);
    if (env.opts.awards || env.opts.games.length) P.trophyShelf(ctx, rx + 32, fy - 2, env.opts.awards, env.opts.games);
    else {
      V.frame(ctx, rx + 36, fy - 29, 8, 10, 2, 4);
      V.frame(ctx, rx + 47, fy - 28, 12, 8, 0, 1);
      V.frame(ctx, rx + 62, fy - 29, 10, 10, 4, 2);
    }
  },
};

DEF.lounge = {
  windows: (rx, fy) => [{ x: rx + 47, y: fy - 40, w: 15, h: 14, kind: 'curtain', curtain: '#8a5ae0' }],
  stations: (rx) => [
    { kind: 'sofa', x: rx + 10, dir: 1, pose: 'sit' },
    { kind: 'sofa', x: rx + 22, dir: 1, pose: 'sit' },
    { kind: 'sofa', x: rx + 41, dir: -1, pose: 'sit' },
    { kind: 'stand', x: rx + 57, dir: -1, pose: 'stand' },
    { kind: 'window', x: rx + 47, dir: 1, pose: 'stand' },
  ],
  pendants: (rx) => [{ x: rx + 12, kind: 'dome', c: '#4a3a7a', drop: 3 }, { x: rx + 30, kind: 'dome', c: '#4a3a7a', drop: 3 }],
  wallArt(ctx, rx, w, fy) {
    for (let y = fy - 44; y < fy - 11; y += 4) for (let x = (y >> 2) % 2 ? 0 : 4; x < w; x += 8) R(ctx, rx + x, y + 3, 7, 1, 'rgba(0,0,0,0.12)');
  },
  decor(ctx, r, fy) {
    const rx = r.x0;
    F.fishTank(ctx, rx + 5, fy - 33, 30, 12);
    F.rug(ctx, rx + 1, fy, 52, '#3a2a62', '#a08adc');
    F.sofa(ctx, rx + 2, fy, 30, '#3a9a5a', '#f2c84a');
    F.armchair(ctx, rx + 34, fy, '#2fb0b8');
    F.floorLamp(ctx, rx + 51, fy, 38);
    F.beanbag(ctx, rx + 53, fy, 13, '#ff8a4a');
    F.neonPad(ctx, rx + 44, fy - 36, NEON.magentaHi, NEON.magenta);
    V.plantHang(ctx, rx + 58, fy - 47, 4, 10, 2);
  },
};

DEF.dev = {
  windows: (rx, fy) => [{ x: rx + 7, y: fy - 40, w: 26, h: 22, kind: 'curtain', curtain: '#e8504a' }, { x: rx + 76, y: fy - 40, w: 26, h: 22, kind: 'curtain', curtain: '#4a90e0' }, { x: rx + 124, y: fy - 40, w: 24, h: 22, kind: 'plain' }],
  stations: () => [],
  pendants: (rx, w) => pendants(rx, w, 5, 'dome'),
  wallArt(ctx, rx, w, fy) {
    for (let x = 0; x < w; x += 12) R(ctx, rx + x, fy - 45, 1, 33, 'rgba(0,0,0,0.05)');
  },
  decor(ctx, r, fy) {
    const rx = r.x0;
    const f = r.floor;
    R(ctx, rx + 36, fy - 40, 36, 21, 'rgba(0,0,0,0.12)');
    V.wallScreen(ctx, rx + 38, fy - 38, 32, 17, ['chart', 'code', 'map'][f % 3], 3 + f);
    if (f === 1) F.kanban(ctx, rx + 105, fy - 40, 17, 14, 4);
    else {
      V.frame(ctx, rx + 105, fy - 39, 8, 11, f + 2, 5 + f);
      V.frame(ctx, rx + 114, fy - 37, 8, 8, f + 4, 9 + f);
    }
    V.wallShelf(ctx, rx + 104, fy - 24, 20, f === 0 ? 'bpc' : 'cbp', 3 + f);
    V.wallClock(ctx, rx + 140, fy - 38);
    V.plantHang(ctx, rx + 22, fy - 45, 3, 8, 1 + f);
    V.plantHang(ctx, rx + 113, fy - 45, 3, 8, 4 + f);
    F.trashBin(ctx, rx + 143, fy);
  },
};

DEF.meeting = {
  windows: (rx, fy) => [{ x: rx + 71, y: fy - 40, w: 15, h: 14, kind: 'curtain', curtain: '#f2a63a' }],
  stations: (rx) => [
    { kind: 'seat', x: rx + 17, dir: 1, pose: 'sit' },
    { kind: 'seat', x: rx + 71, dir: -1, pose: 'sit' },
    { kind: 'stand', x: rx + 44, dir: 1, pose: 'present' },
    { kind: 'board', x: rx + 12, dir: 1, pose: 'present' },
    { kind: 'stand', x: rx + 83, dir: -1, pose: 'stand' },
  ],
  pendants: (rx) => [{ x: rx + 20, kind: 'cone' }, { x: rx + 72, kind: 'cone' }],
  wallArt(ctx, rx, w, fy) {
    for (let x = 2; x < w - 2; x += 9) R(ctx, rx + x, fy - 44, 8, 32, x % 18 ? '#52729a' : '#4a6a90');
    for (let x = 2; x < w - 2; x += 9) R(ctx, rx + x + 8, fy - 44, 1, 32, 'rgba(0,0,0,0.2)');
    for (let x = 2; x < w - 2; x += 9) R(ctx, rx + x, fy - 44, 1, 32, 'rgba(255,255,255,0.1)');
  },
  decor(ctx, r, fy) {
    const rx = r.x0;
    F.whiteboardBig(ctx, rx + 3, fy - 44, 17, 13, 7);
    V.wallScreen(ctx, rx + 26, fy - 44, 38, 19, 'slides', 3);
    // stolar bakom bordet (ryggar)
    for (const sx of [rx + 33, rx + 50]) {
      R(ctx, sx + 1, fy - 24, 7, 9, '#b83a34');
      R(ctx, sx, fy - 23, 9, 7, '#d8483f');
      R(ctx, sx + 1, fy - 24, 7, 1, '#ff8a7a');
      R(ctx, sx, fy - 23, 1, 7, '#e8605a');
      R(ctx, sx + 8, fy - 22, 1, 6, '#8a2824');
      R(ctx, sx + 3, fy - 17, 3, 2, '#3a3f4c');
    }
    F.meetingTable(ctx, rx + 22, fy, 46);
    F.chair2(ctx, rx + 15, fy, '#e8504a');
    ctx.save();
    ctx.translate(rx + 71, 0);
    ctx.scale(-1, 1);
    F.chair2(ctx, -2, fy, '#e8504a');
    ctx.restore();
    F.laptop(ctx, rx + 26, fy - 15, 1);
    F.laptop(ctx, rx + 54, fy - 15, -1);
    F.mug(ctx, rx + 42, fy - 15);
    R(ctx, rx + 36, fy - 16, 5, 1, '#f4f0e4');
    R(ctx, rx + 38, fy - 17, 5, 1, '#e8e4d4');
    V.plantFloor(ctx, rx + 79, fy, 16, 4, '#2f3446');
  },
};

DEF.kitchen = {
  windows: () => [],
  stations: (rx) => [
    { kind: 'coffee', x: rx + 38, dir: -1, pose: 'drink' },
    { kind: 'stand', x: rx + 44, dir: -1, pose: 'talk' },
  ],
  pendants: (rx) => [{ x: rx + 38, kind: 'cone', c: '#e8a030', drop: 5 }],
  wallArt(ctx, rx, w, fy) {
    R(ctx, rx, fy - 12, w, 1, '#a8582e');
  },
  decor(ctx, r, fy) {
    const rx = r.x0;
    F.fridge(ctx, rx + 4, fy);
    F.kitchenCounter(ctx, rx + 17, fy, 36);
    F.espresso(ctx, rx + 21, fy - 16);
    R(ctx, rx + 36, fy - 21, 9, 5, '#2a2f3c');
    R(ctx, rx + 37, fy - 20, 5, 3, '#10202a');
    R(ctx, rx + 43, fy - 20, 1, 3, '#ffe27a');
    F.mug(ctx, rx + 47, fy - 16, '#4a90e0');
    V.wallClock(ctx, rx + 11, fy - 44);
  },
};

DEF.server = {
  windows: () => [],
  stations: (rx) => [
    { kind: 'rack', x: rx + 27, dir: 1, pose: 'laptop' },
    { kind: 'rack', x: rx + 10, dir: 1, pose: 'stand' },
  ],
  pendants: () => [],
  wallArt(ctx, rx, w, fy) {
    for (let y = fy - 44; y < fy - 12; y += 6) R(ctx, rx, y + 5, w, 1, 'rgba(100,170,255,0.10)');
  },
  racks: (rx, fy) => [rx + 3, rx + 19, rx + 35].map((x, i) => ({ x, y: fy, w: 14, h: 38, seed: 3 + i })),
  decor(ctx, r, fy) {
    const rx = r.x0;
    F.cableTray(ctx, rx + 2, fy - 45, 48);
    for (const k of this.racks(rx, fy)) F.rack(ctx, k.x, k.y, k.w, k.h, k.seed);
    F.monitorPanel(ctx, rx + 51, fy - 36, 8, 12);
    F.acUnit(ctx, rx + 51, fy - 44, 8);
    for (let x = rx + 2; x < rx + 58; x += 6) R(ctx, x, fy - 1, 3, 1, '#f2c84a');
    RA(ctx, rx + 2, fy - 5, 56, 4, NEON.cyan, 0.1);
  },
};

DEF.whiteboard = {
  windows: (rx, fy) => [{ x: rx + 62, y: fy - 40, w: 18, h: 16, kind: 'blind' }],
  stations: (rx) => [
    { kind: 'board', x: rx + 30, dir: 1, pose: 'present' },
    { kind: 'board', x: rx + 14, dir: 1, pose: 'present' },
    { kind: 'stand', x: rx + 66, dir: -1, pose: 'talk' },
  ],
  pendants: (rx, w) => pendants(rx, w, 2, 'cone'),
  wallArt() {},
  decor(ctx, r, fy) {
    const rx = r.x0;
    F.whiteboardBig(ctx, rx + 4, fy - 42, 52, 28, 11);
    V.wallShelf(ctx, rx + 62, fy - 20, 18, 'pbc', 5);
    F.benchSeat(ctx, rx + 62, fy, 14, '#e8a04a');
    V.plantFloor(ctx, rx + 75, fy, 14, 6, '#d8d0c0');
  },
};

// Tom anläggningsplats: inredning tills något byggs. v = platsnummer.
function emptySlot(ctx, rx, fy, v) {
  const k = v % 6;
  if (k === 0) { // kopierings- och förråd
    F.copier(ctx, rx + 6, fy);
    F.boxes(ctx, rx + 28, fy);
    F.trashBin(ctx, rx + 43, fy);
    V.wallShelf(ctx, rx + 4, fy - 32, 22, 'bbc', 4 + v);
    V.frame(ctx, rx + 32, fy - 40, 13, 9, 5, 3 + v);
    V.neonLine(ctx, rx + 4, fy - 44, 46, NEON.cyanHi, NEON.cyan);
  } else if (k === 1) { // läshörna
    P.bookshelf(ctx, rx + 4, fy, 20, 36, 4 + v);
    F.rug(ctx, rx + 24, fy, 28, '#6a3a4a', '#e8a05a');
    F.armchair(ctx, rx + 28, fy, '#4a9ac8');
    F.floorLamp(ctx, rx + 46, fy, 34);
    V.plantHang(ctx, rx + 34, fy - 47, 4, 9, 3);
    V.frame(ctx, rx + 30, fy - 40, 9, 11, 2, 6);
  } else if (k === 2) { // pausplats
    F.waterCooler(ctx, rx + 6, fy);
    P.vending(ctx, rx + 20, fy);
    V.plantFloor(ctx, rx + 39, fy, 22, 5, '#c8643a');
    V.frame(ctx, rx + 6, fy - 40, 11, 12, 3 + v, 7 + v);
    V.neonLine(ctx, rx + 20, fy - 44, 30, NEON.magentaHi, NEON.magenta);
  } else if (k === 3) { // gym: löpband och hantlar
    F.rug(ctx, rx + 2, fy, 52, '#2a3a4a', '#5aa0c8');
    R(ctx, rx + 5, fy - 3, 26, 3, '#222633');
    R(ctx, rx + 6, fy - 4, 24, 1, '#4a5268');
    R(ctx, rx + 6, fy - 4, 3, 1, '#2a2f3c');
    R(ctx, rx + 28, fy - 26, 2, 22, '#4a5268');
    R(ctx, rx + 24, fy - 31, 10, 6, '#161a28');
    R(ctx, rx + 25, fy - 30, 8, 3, NEON.cyan);
    R(ctx, rx + 26, fy - 29, 3, 1, '#c8faff');
    R(ctx, rx + 21, fy - 19, 8, 1, '#8a92a8');
    R(ctx, rx + 21, fy - 19, 1, 6, '#6a7288');
    R(ctx, rx + 37, fy - 12, 16, 2, '#3a4054');
    R(ctx, rx + 38, fy - 10, 2, 10, '#2a2f3c');
    R(ctx, rx + 50, fy - 10, 2, 10, '#2a2f3c');
    for (let i = 0; i < 4; i++) {
      R(ctx, rx + 38 + i * 4, fy - 17, 3, 5, i % 2 ? '#e8504a' : '#4a90e0');
      R(ctx, rx + 38 + i * 4, fy - 17, 3, 1, 'rgba(255,255,255,0.4)');
    }
    R(ctx, rx + 44, fy - 5, 8, 2, '#8a5ae0');
    V.frame(ctx, rx + 6, fy - 42, 14, 8, 1, 8);
    V.neonLine(ctx, rx + 4, fy - 45, 48, NEON.green, NEON.green);
  } else if (k === 4) { // arkad
    V.neonText(ctx, 'PLAY', rx + 17, fy - 37, NEON.yellow, NEON.orange);
    [[rx + 5, NEON.magenta, '#5cf2a0', '#ffe27a'], [rx + 22, NEON.cyan, '#ff6a6a', '#c8faff']].forEach(([x, mq, p1, p2]) => {
      R(ctx, x, fy - 30, 14, 30, '#1c1f33');
      R(ctx, x, fy - 30, 14, 1, '#3a4262');
      R(ctx, x, fy - 30, 14, 5, mq);
      R(ctx, x + 1, fy - 29, 12, 1, 'rgba(255,255,255,0.45)');
      R(ctx, x + 2, fy - 23, 10, 9, '#0a1a2c');
      R(ctx, x + 3, fy - 21, 2, 2, p1);
      R(ctx, x + 7, fy - 18, 2, 2, p2);
      R(ctx, x + 5, fy - 16, 4, 1, p1);
      R(ctx, x + 1, fy - 12, 12, 3, '#2a2f50');
      R(ctx, x + 3, fy - 11, 1, 1, '#ff5a5a');
      R(ctx, x + 6, fy - 11, 1, 1, '#ffe27a');
      R(ctx, x + 9, fy - 11, 1, 1, '#5cf2a0');
      RA(ctx, x - 2, fy - 31, 18, 36, mq, 0.08);
    });
    F.beanbag(ctx, rx + 40, fy, 14, '#4a90e0');
  } else { // växthus: palmer och växtlampa
    R(ctx, rx + 4, fy - 44, 50, 2, '#ff7ad8');
    RA(ctx, rx + 2, fy - 43, 54, 26, '#ff7ad8', 0.07);
    V.palm(ctx, rx + 12, fy, 38, 2);
    V.plantFloor(ctx, rx + 31, fy, 26, 3, '#c8643a');
    V.plantFloor(ctx, rx + 44, fy, 20, 4, '#4a5a78');
    V.plantHang(ctx, rx + 22, fy - 42, 3, 12, 5);
    V.plantSmall(ctx, rx + 50, fy - 0, 2, '#e8a05a');
  }
}

// ── Layout ──
export function layoutV2(tier) {
  const { pitch, intH, slotW, deskSp, wall, found } = V2;
  const T = V2_TIERS[tier];
  const { BW, floors, roofH } = T;
  const IW = BW - wall * 2;
  const left = -IW / 2;
  const rooms = [];
  const desks = [];
  const slots = [];
  const stations = [];
  const lights = [];
  const anim = { leds: [], screens: [], neon: [], fish: [], steam: [] };
  const topY = -(found + floors * pitch);
  for (let f = 0; f < floors; f++) {
    const fy = -found - f * pitch;
    let x = left;
    const add = (type, w, extra = {}) => {
      const v = extra.slot !== undefined ? extra.slot : type === 'dev' ? f : 0;
      const st = roomStyle(type, v);
      const room = { id: `f${f}-${type}${extra.slot !== undefined ? extra.slot : ''}`, type, floor: f, x0: x, x1: x + w, w, v, light: st.light, lightRGB: st.light.map((c) => Math.round(c * 255)), wall: st.wall, ...extra };
      rooms.push(room);
      x += w;
      return room;
    };
    for (const [type, w, ex] of T.plan[f]) {
      const room = add(type, w, ex && ex.desks === undefined ? ex : {});
      const d = DEF[type];
      const rx = room.x0;
      if (type === 'dev') {
        const nd = ex && ex.desks !== undefined ? ex.desks : Math.floor((w - 6) / deskSp);
        for (let i = 0; i < nd; i++) desks.push({ x: rx + 3 + i * deskSp, fy, floor: f, idx: desks.length, sp: deskSp });
        anim.screens.push({ x: rx + 38, y: fy - 38, w: 32, h: 17, kind: ['chart', 'code', 'map'][f % 3], seed: f });
      }
      if (type === 'kitchen') anim.steam.push({ x: rx + 27, y: fy - 32 });
      if (type === 'lobby') anim.neon.push({ x: rx + 6, y: fy - 45, w: 115, h: 5 });
      if (T.band && type === 'dev' && f === 2) anim.neon.push({ x: bandX(T.band), y: fy, w: textWidth(T.band), h: 5 });
      if (type === 'meeting') anim.screens.push({ x: rx + 26, y: fy - 44, w: 38, h: 19, kind: 'slides', seed: 0 });
      if (type === 'lounge') {
        anim.fish.push({ x: rx + 5, y: fy - 41, w: 30, h: 12 });
      }
      (d.stations ? d.stations(rx, fy) : []).forEach((s, i) => stations.push({ id: `${room.id}-${i}`, kind: s.kind, room: room.id, floor: f, x: s.x, fy, dir: s.dir, pose: s.pose }));
      // rumsljus
      const base = { y: fy - intH + 8, c: room.light, kind: 0, floor: f, y0: fy - intH, y1: fy };
      lights.push({ ...base, x: Math.round(rx + w / 2), r: type === 'dev' ? 74 : Math.max(46, Math.round(w * 0.62 + 10)), i: LIGHT_I[type] ?? 0.8, pri: 0 });
      // stora rum får fler lampor så att ljuset följer pendlarna
      if (type === 'dev') for (const k of [1 / 6, 5 / 6]) lights.push({ ...base, x: Math.round(rx + w * k), r: 52, i: 0.7, pri: 1 });
      if (type === 'meeting') lights.push({ ...base, x: rx + 44, y: fy - 26, r: 30, i: 0.5, c: [0.75, 0.9, 1], kind: 2, pri: 2 });
      if (type === 'server') {
        for (const k of d.racks(rx, fy)) {
          for (const led of F.rackLeds(k.x, k.y, k.w, k.h)) anim.leds.push({ ...led, seed: anim.leds.length });
        }
        lights.push({ x: rx + 28, y: fy - 22, r: 34, i: 0.5, c: [0.3, 0.55, 1], kind: 1, floor: f, pri: 1 });
      }
      if (type === 'lounge') {
        lights.push({ x: rx + 51, y: fy - 34, r: 28, i: 0.6, c: [1, 0.8, 0.45], kind: 1, floor: f, pri: 1 });
        lights.push({ x: rx + 22, y: fy - 35, r: 26, i: 0.4, c: [0.3, 0.7, 1], kind: 1, floor: f, pri: 2 });
      }
      if (type === 'lobby') lights.push({ x: rx + 18, y: fy - 20, r: 32, i: 0.4, c: [1, 0.9, 0.7], kind: 1, floor: f, pri: 2 });
    }
    for (let s = 0; s < (T.slotsPerFloor ?? 2); s++) {
      const room = add('facility', slotW, { slot: slots.length });
      slots.push({ x: room.x0 + 2, w: slotW - 4, fy, floor: f, idx: slots.length });
      lights.push({ x: Math.round(room.x0 + slotW / 2), y: fy - intH + 6, r: 46, i: 0.6, c: room.light, kind: 0, floor: f, y0: fy - intH, y1: fy, pri: 1 });
    }
    // neon längs bjälklaget
    const neonC = f % 2 === 0 ? [0.3, 0.88, 1] : [1, 0.31, 0.72];
    for (const nx of [-130, 0, 130]) lights.push({ x: nx, y: fy + 3, r: 38, i: 0.32, c: neonC, kind: 1, floor: f, pri: 2 });
  }
  // takterrass och skylt
  const rf = ROOFS[T.roof];
  lights.push(...rf.lights(topY, BW));
  lights.sort((a, b) => a.pri - b.pri); // viktigast först: den som äger ljuset tar så många som ryms
  const ra = rf.anim(topY, BW);
  anim.neon.push(...ra.neon);
  for (const st of rf.steam || []) anim.steam.push({ x: st.x, y: topY + st.dy }); // ventilationsrör på taket
  anim.bulbs = ra.bulbs;
  return {
    tier, BW, floors, roof: T.roof, band: T.band, slotW, IW, left, desks, slots, sp: deskSp, roofH,
    H: found + floors * pitch + roofH, W: BW + 40, topY,
    v2: true, pitch, intH, rooms, stations, lights, anim,
  };
}

// ── Ritning ──
// Bakvägg, golvband och lister för ett rum.
function backWall(ctx, room, fy, intH) {
  const st = roomStyle(room.type, room.v);
  const { x0, w } = room;
  const top = fy - intH;
  R(ctx, x0, top, w, intH, st.wall);
  for (let x = 0; x < w; x += 12) R(ctx, x0 + x, top, 1, intH - 12, st.wall2);
  // takskugga
  for (let i = 0; i < 5; i++) RA(ctx, x0, top + 3 + i, w, 1, '#000000', 0.2 - i * 0.04);
  // sidoskugga mot väggar
  RA(ctx, x0, top, 2, intH, '#000000', 0.12);
  RA(ctx, x0 + w - 2, top, 2, intH, '#000000', 0.12);
  // dado och list
  R(ctx, x0, fy - 12, w, 1, st.trim);
  R(ctx, x0, fy - 11, w, 8, st.dado);
  for (let x = 3; x < w - 1; x += 7) R(ctx, x0 + x, fy - 10, 1, 6, shade(st.dado, -0.14));
  R(ctx, x0, fy - 11, w, 1, shade(st.dado, 0.2));
  // golvband (golvet i perspektiv)
  R(ctx, x0, fy - 3, w, 3, st.floor);
  R(ctx, x0, fy - 3, w, 1, st.floorHi);
  for (let x = 0; x < w; x += 9) R(ctx, x0 + ((x + room.floor * 4) % w), fy - 2, 1, 2, shade(st.floor, -0.2));
  R(ctx, x0, fy - 1, w, 1, shade(st.floor, -0.18));
  const d = DEF[room.type];
  if (d && d.wallArt) d.wallArt(ctx, x0, w, fy);
  // ljuspölar på golvet under lamporna
  const lc = room.lightRGB.join(',');
  if (d && d.pendants) for (const p of d.pendants(x0, w)) {
    RA(ctx, p.x - 11, fy - 3, 23, 3, `rgb(${lc})`, 0.1);
    RA(ctx, p.x - 6, fy - 3, 13, 3, `rgb(${lc})`, 0.1);
  }
  // takbjälke och LED-list i rumsljusets färg
  R(ctx, x0, top, w, 3, GRAPH.mid);
  R(ctx, x0, top, w, 1, GRAPH.lt);
  R(ctx, x0 + 2, top + 3, w - 4, 1, `rgb(${lc})`);
  RA(ctx, x0 + 2, top + 4, w - 4, 2, `rgb(${lc})`, 0.28);
}

// Vägg mellan rum: glas upptill, fast panel nedtill. kind: 'glass' | 'solid' | 'arch'
function partition(ctx, x, fy, intH, kind, c = '#9fd6ff') {
  const top = fy - intH;
  if (kind === 'arch') {
    R(ctx, x - 1, top, 3, 14, GRAPH.mid);
    R(ctx, x - 1, top + 12, 3, 2, GRAPH.lt);
    R(ctx, x - 1, top + 14, 1, intH - 14, GRAPH.dk);
    R(ctx, x + 1, top + 14, 1, intH - 14, GRAPH.ink);
    RA(ctx, x, top + 14, 1, intH - 14, '#9fd6ff', 0.2);
    return;
  }
  R(ctx, x - 1, top, 3, intH, GRAPH.mid);
  R(ctx, x - 1, top, 1, intH, GRAPH.lt);
  R(ctx, x + 1, top, 1, intH, GRAPH.dk);
  if (kind === 'glass') {
    RA(ctx, x - 2, top + 13, 5, intH - 27, c, 0.32);
    R(ctx, x - 2, top + 13, 5, 1, GRAPH.hi);
    R(ctx, x - 2, fy - 15, 5, 1, GRAPH.hi);
    R(ctx, x - 2, top + 13, 1, intH - 27, 'rgba(255,255,255,0.4)');
    R(ctx, x, top + 16, 1, 6, 'rgba(255,255,255,0.6)');
    R(ctx, x, top + 25, 1, 3, 'rgba(255,255,255,0.4)');
  } else {
    R(ctx, x - 2, top + 3, 5, intH - 4, GRAPH.mid);
    R(ctx, x - 2, top + 3, 1, intH - 4, GRAPH.lt);
    R(ctx, x + 2, top + 3, 1, intH - 4, GRAPH.ink);
  }
}

// Rummens namnskyltar (som i referensbilden). [sv, en]. Rum utan egen skylt (lobbyn har en stor neonskylt) hoppas över.
export const ROOM_NAMES = {
  lounge: ['PAUS & LOUNGE', 'LOUNGE'],
  meeting: ['MÖTESRUM', 'MEETING ROOM'],
  kitchen: ['KÖK', 'KITCHEN'],
  server: ['SERVER', 'SERVERS'],
  whiteboard: ['KONCEPT & DESIGN', 'CONCEPT & DESIGN'],
};
export const DEV_NAMES = [['PROGRAMMERING', 'PROGRAMMING'], ['ART & ANIMATION', 'ART & ANIMATION'], ['LJUD & MUSIK', 'AUDIO & MUSIC']];
const FAC_EMPTY = [['FÖRRÅD', 'STORAGE'], ['BIBLIOTEK', 'LIBRARY'], ['PAUS', 'BREAK ROOM'], ['TRÄNING', 'GYM'], ['SPELRUM', 'ARCADE'], ['VÄXTHUS', 'GREENHOUSE']];
const FAC_NAMES = { coffee: ['KAFFEBAR', 'COFFEE BAR'], lab: ['FORSKNING', 'RESEARCH'], qa: ['TEST & QA', 'TEST & QA'], training: ['UTBILDNING', 'TRAINING'], gameroom: ['SPELRUM', 'GAME ROOM'], marketing: ['MARKNAD', 'MARKETING'], server: ['SERVER & ONLINE', 'SERVER & ONLINE'] };
function roomName(r, fac) {
  const i = lang === 'en' ? 1 : 0;
  if (r.type === 'dev') return DEV_NAMES[r.floor % DEV_NAMES.length][i];
  if (r.type === 'facility') {
    const f = fac && fac.get(r.slot);
    return (f && FAC_NAMES[f.id] ? FAC_NAMES[f.id] : FAC_EMPTY[r.slot % FAC_EMPTY.length])[i];
  }
  const n = ROOM_NAMES[r.type];
  return n ? n[i] : null;
}
function namePlate(ctx, r, fy, intH, fac) {
  const name = roomName(r, fac);
  if (!name) return;
  const w = Math.min(r.w - 8, textWidth(name) + 5);
  const x = r.x0 + 4;
  const y = fy - intH + 1;
  R(ctx, x, y, w, 7, '#0c1020');
  R(ctx, x, y, w, 1, '#3a466e');
  R(ctx, x, y + 6, w, 1, '#05070f');
  drawText(ctx, name.length * 4 > w ? name.slice(0, Math.floor((w - 1) / 4)) : name, x + 3, y + 1, '#e4ecff');
}

export function drawShellV2(ctx, L, opts) {
  const { BW, IW, floors, pitch, intH, left } = L;
  const holes = [];
  const wins = [];
  const env = { L, opts };
  const topY = L.topY;
  const half = BW / 2;
  // ── Fasadens bärande kolumner ──
  for (const sx of [-half, left + IW]) {
    R(ctx, sx, topY, 6, -topY, GRAPH.mid);
    R(ctx, sx + (sx < 0 ? 0 : 5), topY, 1, -topY, GRAPH.hi);
    R(ctx, sx + (sx < 0 ? 5 : 0), topY, 1, -topY, GRAPH.ink);
    for (let y = topY + 6; y < 0; y += 6) R(ctx, sx + 1, y, 4, 1, GRAPH.dk);
  }
  // ── Rum, golv och bjälklag ──
  for (let f = 0; f < floors; f++) {
    const fy = -V2.found - f * pitch;
    const fr = L.rooms.filter((r) => r.floor === f);
    for (const r of fr) {
      backWall(ctx, r, fy, intH);
      const d = DEF[r.type];
      if (d && d.windows) for (const w of d.windows(r.x0, fy)) wins.push({ ...w, f, room: r });
      const lc = r.lightRGB.join(',');
      if (d && d.pendants) for (const p of d.pendants(r.x0, r.w)) V.lightCone(ctx, p.x, fy - intH + 14, 26, 30, lc, 0.07);
    }
    // bjälklag
    const sx0 = left - 9;
    const sw = IW + 18;
    const sh = f === 0 ? V2.found : pitch - intH;
    R(ctx, sx0, fy, sw, sh, GRAPH.lt);
    R(ctx, sx0, fy, sw, 1, GRAPH.hi);
    R(ctx, sx0, fy + 1, sw, 1, GRAPH.rim);
    R(ctx, sx0, fy + sh - 1, sw, 1, GRAPH.ink);
    R(ctx, sx0, fy + sh - 2, sw, 1, GRAPH.dk);
    for (let x = 24; x < sw; x += 48) R(ctx, sx0 + x, fy + 2, 1, sh - 3, GRAPH.mid);
    const nc = f % 2 === 0 ? [NEON.cyan, NEON.cyanLo] : [NEON.magenta, NEON.magentaLo];
    V.neonLine(ctx, sx0 + 1, fy + (f === 0 ? 2 : 3), sw - 2, nc[0], nc[1]);
  }
  // takplatta
  R(ctx, left - 9, topY, IW + 18, 6, GRAPH.lt);
  R(ctx, left - 9, topY, IW + 18, 1, GRAPH.hi);
  R(ctx, left - 9, topY + 5, IW + 18, 1, GRAPH.ink);
  V.neonLine(ctx, left - 8, topY + 3, IW + 16, NEON.magenta, NEON.magentaLo);
  // ── Fönster: hål, skyline-antydan och ramar ──
  for (const w of wins) {
    ctx.clearRect(w.x, w.y, w.w, w.h);
    holes.push([w.x, w.y, w.w, w.h, w.f]);
  }
  for (const w of wins) {
    if (w.kind !== 'door') V.skylineHint(ctx, w.x, w.y + Math.floor(w.h * 0.45), w.w, Math.ceil(w.h * 0.55), 3 + w.x);
    else V.skylineHint(ctx, w.x, w.y + 14, w.w, 18, 9 + w.x);
    if (w.kind !== 'door') V.windowV2(ctx, w.x, w.y, w.w, w.h, w.kind, w.curtain);
  }
  // ── Rummens inredning ──
  const slotFac = new Map(Object.entries(opts.fac || {}).map(([id, f]) => [f.slot, { id, lvl: f.lvl }]));
  for (let f = 0; f < floors; f++) {
    const fy = -V2.found - f * pitch;
    for (const r of L.rooms.filter((q) => q.floor === f)) {
      const d = DEF[r.type];
      if (d && d.decor) d.decor(ctx, r, fy, env);
      if (r.type === 'facility') drawFacility(ctx, L, r, fy, slotFac.get(r.slot));
    }
    // skrivbord och stolar
    for (const dk of L.desks.filter((q) => q.floor === f)) {
      F.chair2(ctx, dk.x + 3, dk.fy, ['#3a4a6a', '#6a3a4a', '#3a6a5a', '#5a4a7a'][dk.idx % 4]);
      F.desk2(ctx, dk.x + 3, dk.fy, dk.idx % 5, dk.idx + 1, opts.era);
    }
  }
  // ── Skiljeväggar ──
  for (let f = 0; f < floors; f++) {
    const fy = -V2.found - f * pitch;
    const fr = L.rooms.filter((q) => q.floor === f);
    for (let i = 1; i < fr.length; i++) {
      const a = fr[i - 1];
      const b = fr[i];
      const kind = b.type === 'facility' ? (a.type === 'facility' ? 'solid' : 'glass') : (a.type === 'server' || b.type === 'server' ? 'solid' : a.type === 'lobby' ? 'arch' : 'glass');
      partition(ctx, b.x0, fy, intH, kind);
    }
  }
  // ── Glasfasadens blänk: svaga diagonala reflexer framför varje våning ──
  for (let f = 0; f < floors; f++) {
    const fy = -V2.found - f * pitch;
    for (const [fx, wd, a] of [[0.07, 5, 0.075], [0.13, 2, 0.07], [0.52, 4, 0.065], [0.58, 1, 0.08], [0.86, 6, 0.065]]) {
      const bx = left + IW * fx + f * 17;
      for (let y = fy - intH + 5; y < fy - 3; y++) RA(ctx, Math.round(bx + (fy - y) * 0.55), y, wd, 1, '#ffffff', a);
    }
  }
  // ── Pendellampor och neonskyltar ──
  for (let f = 0; f < floors; f++) {
    const fy = -V2.found - f * pitch;
    const top = fy - intH;
    for (const r of L.rooms.filter((q) => q.floor === f)) {
      const d = DEF[r.type];
      if (d && d.pendants) for (const p of d.pendants(r.x0, r.w)) V.pendant(ctx, p.x, top + 4, p.drop || 8, p.kind || 'dome', p.c || '#2a2f3c', r.lightRGB.join(','));
    }
  }
  const lob = L.rooms.find((r) => r.type === 'lobby');
  if (lob) {
    const nx = Math.round(lob.x0 + 6);
    // neonskylt i lobbyn på två rader så att den ryms i rummet utan att krocka med namnskyltarna
    const l1 = 'GOOD IDEAS';
    const l2 = 'BUILD GREAT THINGS';
    const ny = -V2.found - 46;
    R(ctx, nx - 3, ny - 2, textWidth(l2) + 6, 15, '#0a1220');
    V.neonText(ctx, l1, nx, ny, NEON.cyanHi, NEON.cyan);
    V.neonText(ctx, l2, nx, ny + 7, NEON.magentaHi, NEON.magenta);
  }
  if (L.band) {
    // fasadskylt: blå neon i bjälklaget mellan våning 1 och 2
    const by = -V2.found - 2 * pitch;
    const bx = bandX(L.band);
    R(ctx, bx - 3, by, textWidth(L.band) + 6, 6, '#0a1220');
    V.neonText(ctx, L.band, bx, by, NEON.cyanHi, NEON.cyan);
  }
  {
    const fac = new Map(Object.entries(opts.fac || {}).map(([id, f]) => [f.slot, { id, lvl: f.lvl }]));
    for (const r of L.rooms) namePlate(ctx, r, -V2.found - r.floor * pitch, intH, fac);
  }
  const rf = ROOFS[L.roof];
  rf.facade(ctx, L, opts);
  rf.roof(ctx, L, opts);
  return holes;
}

function drawFacility(ctx, L, room, fy, fac) {
  const slot = L.slots[room.slot];
  const x = room.x0;
  if (!fac) {
    emptySlot(ctx, x, fy, room.slot);
    return;
  }
  const st = roomStyle('facility', room.slot);
  ctx.save();
  ctx.beginPath();
  ctx.rect(slot.x - 1, fy - V2.intH, slot.w + 2, V2.intH);
  ctx.clip();
  // egen bakvägg för anläggningen i rummets färg
  const wallC = { gameroom: '#4a3a78', server: '#1e2c4c' }[fac.id] || st.wall;
  R(ctx, x, fy - V2.intH + 3, room.w, V2.intH - 3, wallC);
  for (let i = 0; i < room.w; i += 12) R(ctx, x + i, fy - V2.intH + 3, 1, V2.intH - 15, shade(wallC, -0.08));
  for (let i = 0; i < 5; i++) RA(ctx, x, fy - V2.intH + 3 + i, room.w, 1, '#000000', 0.2 - i * 0.04);
  R(ctx, x, fy - 12, room.w, 1, shade(wallC, -0.3));
  R(ctx, x, fy - 11, room.w, 8, shade(wallC, -0.28));
  R(ctx, x, fy - 3, room.w, 3, st.floor);
  R(ctx, x, fy - 3, room.w, 1, st.floorHi);
  F.shadow(ctx, slot.x + 3, fy, 40, 0.25);
  const fn = { coffee: P.coffee, lab: P.labBench, qa: P.qaLab, training: P.trainingRoom, gameroom: P.gameRoom, marketing: P.marketingRoom, server: P.serverRoom }[fac.id];
  if (fn) fn(ctx, slot.x + 3, fy, fac.lvl);
  // småsaker i rummets tomma delar
  if (fac.id === 'coffee') { V.plantHang(ctx, x + 40, fy - 47, 4, 10, 2); V.frame(ctx, x + 36, fy - 38, 12, 8, 1, 6); }
  else if (fac.id === 'lab') { V.frame(ctx, x + 40, fy - 38, 10, 9, 4, 3); V.plantSmall(ctx, x + 47, fy - 12, 3); }
  else if (fac.id === 'qa') V.frame(ctx, x + 44, fy - 40, 8, 11, 2, 5);
  else if (fac.id === 'gameroom') { F.neonPad(ctx, x + 38, fy - 40, NEON.cyanHi, NEON.cyan); R(ctx, x + 6, fy - 40, 18, 1, NEON.magenta); }
  else if (fac.id === 'marketing') V.frame(ctx, x + 44, fy - 40, 8, 11, 0, 8);
  else if (fac.id === 'training') V.plantFloor(ctx, x + 46, fy, 14, 6, '#d8d0c0');
  ctx.restore();
}

// ── Dynamik: serverdioder, skärmar, akvarium, ånga och neon. Anropas varje bildruta från Scene.drawDynamic. ──
// st: { occupied: Map(skrivbordsindex -> aktör), working: bool, era }
export function drawRoomsDynamic(A, cx, gy, L, time, night, st = {}) {
  const t = st.reduced ? 0 : time; // minskad rörelse: ingen blinkning eller flimmer
  for (const led of L.anim.leds) {
    const ph = Math.sin(t * (2 + (led.seed % 5) * 0.9) + led.seed * 1.7);
    const on = ph > (led.k === 0 ? -0.55 : 0.1);
    A.fillStyle = led.k === 0 ? (on ? '#6cff9a' : '#1f6a3a') : (on ? '#ffb24a' : '#6a4a1a');
    A.fillRect(cx + led.x, gy + led.y, 1, 1);
  }
  // väggskärmar: löpande markör
  for (const s of L.anim.screens) {
    const k = Math.floor(t * 4 + s.seed * 3);
    const x = cx + s.x + 1;
    const y = gy + s.y + 1;
    if (s.kind === 'chart') {
      A.fillStyle = '#ffffff';
      A.fillRect(x + (k % (s.w - 2)), y + s.h - 3, 1, 1);
      A.fillStyle = '#ffe27a';
      A.fillRect(x + ((k * 2) % (s.w - 2)), y + 2 + (k % 3), 1, 1);
    } else if (s.kind === 'code') {
      A.fillStyle = ['#7cf2ff', '#8aff9a', '#ffe27a'][k % 3];
      A.fillRect(x + 2 + ((k * 3) % (s.w - 8)), y + 1 + ((k >> 1) % Math.floor((s.h - 2) / 2)) * 2, 2, 1);
    } else if (s.kind === 'slides') {
      A.fillStyle = '#e8504a';
      A.fillRect(x + 3, y + 5 + (Math.floor(t * 0.5 + s.seed) % 3) * 3, 1, 1);
    } else {
      A.fillStyle = k % 2 ? '#ffffff' : '#5cf2a0';
      A.fillRect(x + 2 + ((k * 5) % (s.w - 6)), y + 2 + ((k * 3) % (s.h - 5)), 2, 2);
    }
  }
  // andra skärmen på varje skrivbord lever när någon sitter och jobbar
  if (st.occupied && st.working && st.era === 2) {
    const tt = Math.floor(t * 3);
    for (const d of L.desks) {
      if (!st.occupied.has(d.idx)) continue;
      const bx = cx + d.x + 3 + 20;
      const by = gy + d.fy - 12 - 12;
      const r = (tt + d.idx * 3) % 6;
      A.fillStyle = ['#7cf2ff', '#8aff9a', '#ffe27a', '#ff7ab8'][(tt + d.idx) % 4];
      A.fillRect(bx + 1 + (r % 3), by + r, 2 + (r % 2), 1);
    }
  }
  // akvarium
  for (const a of L.anim.fish) {
    for (let i = 0; i < 3; i++) {
      const sp = 0.5 + i * 0.23;
      const ph = (t * sp * 0.12 + i * 0.37) % 1;
      const dir = i % 2 ? -1 : 1;
      const px = dir > 0 ? ph * (a.w - 3) : (1 - ph) * (a.w - 3);
      A.fillStyle = ['#ffa04a', '#ff6ab8', '#ffe27a'][i];
      A.fillRect(cx + a.x + Math.round(px), gy + a.y + 3 + i * 2 + Math.round(Math.sin(t * 2 + i * 2) * 0.6), 3, 1);
      A.fillStyle = '#ffffff';
      A.fillRect(cx + a.x + Math.round(px) + (dir > 0 ? 2 : 0), gy + a.y + 3 + i * 2 + Math.round(Math.sin(t * 2 + i * 2) * 0.6), 1, 1);
    }
  }
  // neonskyltar och ljusslinga
  L.anim.neon.forEach((n, i) => {
    // enstaka kort flimmer: skylten dämpas en stund
    if (st.reduced || Math.floor(t * 2.3 + i * 7) % 29 !== 0) return;
    A.globalAlpha = 0.45;
    A.fillStyle = '#10131c';
    A.fillRect(cx + n.x, gy + n.y, n.w, n.h);
    A.globalAlpha = 1;
  });
  for (const k of L.anim.steam) {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.7 + i * 0.33) % 1;
      A.fillStyle = `rgba(255,255,255,${0.55 * (1 - ph)})`;
      A.fillRect(cx + k.x + Math.round(Math.sin(ph * 6 + i * 2) * 1.2), gy + k.y - Math.round(ph * 9), 1, 2);
    }
  }
  A.globalAlpha = 1;
  for (const b of L.anim.bulbs) {
    const k = Math.sin(t * 2.2 + b.p);
    if (k > 0.2) {
      A.globalAlpha = 0.35 + 0.4 * k;
      A.fillStyle = b.c;
      A.fillRect(cx + b.x - 1, gy + b.y - 1, 3, 3);
      A.globalAlpha = 1;
      A.fillStyle = '#fffbe0';
      A.fillRect(cx + b.x, gy + b.y, 1, 1);
    }
  }
  void night;
}

// Enkel additiv rumsbelysning för canvasläget (anropas av den som äger ljuset): ritar L.rooms[].light som mjuka fält.
export function drawRoomLights(ctx, cx, gy, L, k = 1) {
  const intH = L.intH;
  for (const r of L.rooms) {
    const fy = gy - 4 - r.floor * L.pitch;
    const c = r.lightRGB.join(',');
    for (let i = 0; i < 4; i++) {
      const inset = i * 3;
      ctx.fillStyle = `rgba(${c},${0.03 * k})`;
      ctx.fillRect(cx + r.x0 + inset, fy - intH + 6 + inset, r.w - inset * 2, intH - 8 - inset * 2);
    }
  }
}
