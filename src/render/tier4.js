import { registerTier, registerRoof, TIER_DEF } from './rooms.js';
import { lang } from '../core/i18n.js';
import * as P from './tier4-props.js';
import { fitText } from './font.js';
import { drawPerson } from './people.js';

const { R, RA, blob, hash } = P.V;
const { ST, TL, AM, OR } = P;
const F = P.F;
const V = P.V;

// ═══ Nivå 4: "Modern" ═══
// Glas- och stålhus i fyra våningar. Kall vit/turkos/bärnsten palett med orange neon (Studiohuset är grafit med cyan/magenta).
// Allt som är specifikt för nivån ligger här: rumsplan, rumsdefinitioner (TIER_DEF[4]), fasad och tak.
const T = 4;
const PITCH = 54;
const FOUND = 4;
const INT_H = 48;
const BW = 480;
const HALF = BW / 2;
const fOf = (fy) => Math.round((-fy - FOUND) / PITCH); // våningsnummer ur golvets y

// Rumsstilar: wall/wall2 bakvägg, dado bröstning, trim list, floor/floorHi golvband, fascia frisen, light rumsljus (0..1).
const STY = {
  lobby: { wall: '#ece9e0', wall2: '#e0ddd2', dado: '#2d6a70', trim: '#bfdcdc', floor: '#c7ab80', floorHi: '#e2c99c', fascia: '#f4f1ea', light: [1, 0.93, 0.78], thin: true },
  cafe: { wall: '#f3e8d2', wall2: '#e8dcc2', dado: '#2a8a8a', trim: '#d9b878', floor: '#c4a272', floorHi: '#dcc08c', fascia: '#f7efe0', light: [1, 0.82, 0.52] },
  pantry: { wall: '#e4f0ee', wall2: '#d6e6e4', dado: '#d9772c', trim: '#f0c690', floor: '#cdb792', floorHi: '#e6d3b0', fascia: '#f0f7f6', light: [1, 0.88, 0.64] },
  dev: [
    { wall: '#d7ebea', wall2: '#cbe2e0', dado: '#4d7077', trim: '#b5ccd1', floor: '#d3bd96', floorHi: '#ead8b6', fascia: '#eef5f7', light: [0.92, 0.98, 1] },
    { wall: '#d5e6ef', wall2: '#c8dce8', dado: '#3f6f86', trim: '#b0c8d4', floor: '#d3bd96', floorHi: '#ead8b6', fascia: '#edf4f8', light: [0.9, 0.97, 1] },
    { wall: '#dcede4', wall2: '#cfe3d9', dado: '#4f7a70', trim: '#b2cdc6', floor: '#d3bd96', floorHi: '#ead8b6', fascia: '#eef6f3', light: [0.94, 1, 0.97] },
    { wall: '#e0e6ee', wall2: '#d3dbe6', dado: '#5a6a80', trim: '#bcc8d4', floor: '#d3bd96', floorHi: '#ead8b6', fascia: '#f2f5f8', light: [0.96, 0.97, 1] },
  ],
  meeting: { wall: '#2f6870', wall2: '#295e66', dado: '#1d4a52', trim: '#7fc4c6', floor: '#9a8a72', floorHi: '#b8a688', fascia: '#e9f2f4', light: [0.85, 0.96, 1] },
  exec: { wall: '#27474f', wall2: '#223f46', dado: '#16303a', trim: '#c9a35a', floor: '#6a5640', floorHi: '#8a7258', fascia: '#e6eef0', light: [1, 0.9, 0.74] },
  lounge: { wall: '#2f5c60', wall2: '#2a5256', dado: '#1e3f43', trim: '#d9b878', floor: '#b08a5a', floorHi: '#cfa874', fascia: '#e8f0ee', light: [1, 0.82, 0.5] },
  whiteboard: { wall: '#eef2f4', wall2: '#e1e8ec', dado: '#e8742a', trim: '#ffd0a0', floor: '#d3bd96', floorHi: '#ead8b6', fascia: '#f2f6f7', light: [0.95, 1, 0.97] },
  server: { wall: '#12303c', wall2: '#0e2832', dado: '#0b1f29', trim: '#2fa3a8', floor: '#0c1a22', floorHi: '#1e4a58', fascia: '#c4d6dc', light: [0.35, 0.8, 1] },
  facility: { wall: '#e4edf0', wall2: '#d8e4e8', dado: '#58737b', trim: '#a9c0c6', floor: '#c9b48e', floorHi: '#e0cfae', fascia: '#eef5f7', light: [0.95, 0.96, 1] },
};
// Vilken stil ett rum har: nyckeln sparas i rummet ('sty') så att bakvägg, fasad och dekor är överens.
const styOf = (room) => {
  const k = room.sty;
  return k === 'dev' ? STY.dev[room.floor % 4] : STY[k] || STY.facility;
};
const rgbOf = (a) => a.map((c) => Math.round(c * 255));
const room4 = (type, w, sty, name, extra = {}) => {
  const st = sty === 'dev' ? STY.dev[0] : STY[sty];
  return [type, w, { sty, name, light: st.light, lightRGB: rgbOf(st.light), ...extra }];
};
const dev4 = (w, f, name) => {
  const st = STY.dev[f];
  return ['dev', w, { sty: 'dev', name, light: st.light, lightRGB: rgbOf(st.light) }];
};

registerTier(T, {
  BW, floors: 4, roofH: 52, roof: 'modern', slotsPerFloor: 2,
  plan: [
    [room4('lobby', 100, 'lobby', null), room4('kitchen', 70, 'cafe', ['CAFÉ', 'CAFÉ']), dev4(186, 0, ['PRODUKTION', 'PRODUCTION'])],
    [dev4(186, 1, ['PROGRAMMERING', 'PROGRAMMING']), room4('meeting', 104, 'meeting', ['KONFERENS', 'CONFERENCE']), room4('kitchen', 66, 'pantry', ['FIKARUM', 'PANTRY'])],
    [room4('server', 86, 'server', ['SERVERHALL', 'SERVER HALL']), dev4(186, 2, ['DESIGN & UX', 'DESIGN & UX']), room4('whiteboard', 84, 'whiteboard', ['DESIGNLAB', 'DESIGN LAB'])],
    [room4('lounge', 86, 'lounge', ['BOKLOUNGE', 'BOOK LOUNGE']), dev4(186, 3, ['LEDNING & PRODUKT', 'LEADERSHIP & PRODUCT']), room4('meeting', 84, 'exec', ['LEDNINGSRUM', 'EXECUTIVE ROOM'])],
  ],
});

const defs = (TIER_DEF[T] = {});

// ── Gemensamt för rummen ──
const backWall = (ctx, room, fy, intH) => P.wallShell(ctx, room, fy, intH, styOf(room));

// Glasparti: urklippt hål (rooms.js rensar det) plus karm, tonat glas och bröstning ritas i dekoren.
const bay = (ctx, rx, fy, dx, w, o = {}) => {
  P.glass(ctx, rx + dx, fy - 39, w, 26, { mull: o.mull ?? Math.floor(w / 2), trans: o.trans || 0, seed: o.seed ?? dx });
  P.sillPanel(ctx, rx + dx, fy, w, o.dado);
};
const glassWin = (rx, fy, dx, w) => ({ x: rx + dx, y: fy - 39, w, h: 26, kind: 'door' });
// Planteringslåda på bröstningen innanför glaset (gröna växter mot himlen).
const sillGreens = (ctx, x, fy, w, seed) => {
  R(ctx, x, fy - 17, w, 4, '#d3dde2');
  R(ctx, x, fy - 17, w, 1, '#f4f9fb');
  R(ctx, x + w - 1, fy - 16, 1, 3, '#8ea3ae');
  const g = [['#2b7a46', '#4fb066', '#9be08a'], ['#2a7f6c', '#43b894', '#9ae8c4']];
  for (let i = 1; i < w - 1; i += 3) {
    const k = hash(seed * 7 + i);
    const c = g[(i + seed) % 2];
    blob(ctx, x + i, fy - 19 - Math.floor(k * 3), 2, 2 + Math.floor(k * 2), c[1], c[2], c[0]);
    if (k > 0.82) R(ctx, x + i, fy - 24 - Math.floor(k * 2), 1, 1, k > 0.9 ? OR.neon : '#ffffff');
  }
};

// ── Öppet kontor (6 skrivbord) ──
// Fönstermodul: tre glaspartier och två pelare. Väggskärmen sitter på fast plats (rooms.js animerar den: rx+38, fy-38, 32x17).
const DEV_BAYS = [[5, 29], [78, 32], [148, 34]];
defs.dev = {
  backWall,
  windows: (rx, fy) => DEV_BAYS.map(([dx, w]) => glassWin(rx, fy, dx, w)),
  stations: () => [],
  pendants: () => [],
  decor(ctx, r, fy) {
    const rx = r.x0;
    const f = r.floor;
    const sty = styOf(r);
    const top = fy - INT_H;
    const lc = r.lightRGB.join(',');
    // glas och gröna bröstningar
    DEV_BAYS.forEach(([dx, w], i) => {
      bay(ctx, rx, fy, dx, w, { dado: sty.dado, seed: dx + f * 5, trans: i === 1 ? 17 : 0 });
      sillGreens(ctx, rx + dx, fy, w, i + f * 3);
    });
    // väggskärm (animeras) med ram
    R(ctx, rx + 36, fy - 40, 36, 21, 'rgba(0,0,0,0.12)');
    V.wallScreen(ctx, rx + 38, fy - 38, 32, 17, ['chart', 'code', 'map'][f % 3], 3 + f);
    // pelare B: varierar per våning
    const bx = rx + 112;
    if (f === 0) {
      P.canvasArt(ctx, bx, fy - 38, 12, 16, 1);
      P.canvasArt(ctx, bx + 15, fy - 36, 16, 11, 2);
      V.wallShelf(ctx, bx + 2, fy - 20, 26, 'cbp', 3);
    } else if (f === 1) {
      F.kanban(ctx, bx + 1, fy - 38, 30, 14, 4);
      V.wallClock(ctx, bx + 12, fy - 22);
    } else if (f === 2) {
      P.canvasArt(ctx, bx, fy - 38, 10, 14, 3);
      P.canvasArt(ctx, bx + 13, fy - 38, 10, 14, 0);
      P.canvasArt(ctx, bx + 26, fy - 38, 8, 14, 5);
      V.wallShelf(ctx, bx + 2, fy - 20, 28, 'pbf', 6);
    } else {
      V.wallShelf(ctx, bx + 1, fy - 34, 30, 'ttbf', 7);
      P.canvasArt(ctx, bx + 3, fy - 28, 26, 7, 1);
      V.wallClock(ctx, bx + 13, fy - 24);
    }
    // gång och kantlist till vänster om första skrivbordet
    V.plantHang(ctx, rx + 70, top + 11, 2, 10, 2 + f);
    V.plantHang(ctx, rx + 143, top + 11, 2, 9, 5 + f);
    // takarmaturer: tre hängande LED-listor
    for (const dx of [14, 78, 144]) {
      P.floorPool(ctx, rx + dx + 14, fy, lc, 0.08);
      V.lightCone(ctx, rx + dx + 14, top + 14, 26, 36, lc, 0.05);
      P.ceilBar(ctx, rx + dx, top + 9, 28, 1, lc);
    }
  },
};

// ── Lobby: glasvägg mot gatan, teal fondvägg med träribbor, mottagning och en installation av klotlampor ──
const T_WELCOME = ['VÄLKOMMEN', 'WELCOME'];
const T_OPEN = ['ÖPPET', 'OPEN'];
defs.lobby = {
  backWall,
  windows: (rx, fy) => [{ x: rx + 3, y: fy - 44, w: 34, h: 41, kind: 'door' }],
  stations: (rx) => [
    { kind: 'reception', x: rx + 40, dir: 1, pose: 'stand' },
    { kind: 'stand', x: rx + 26, dir: 1, pose: 'stand' },
    { kind: 'window', x: rx + 12, dir: 1, pose: 'stand' },
  ],
  pendants: () => [],
  decor(ctx, r, fy) {
    const rx = r.x0;
    const top = fy - INT_H;
    const lc = r.lightRGB.join(',');
    // glasvägg med dörrparti: handtag och sparkplåtar
    P.glass(ctx, rx + 3, fy - 44, 34, 41, { mull: 17, seed: 4, trans: 27 });
    R(ctx, rx + 16, fy - 25, 1, 9, ST.wh);
    R(ctx, rx + 23, fy - 25, 1, 9, ST.wh);
    R(ctx, rx + 3, fy - 9, 34, 5, '#c3d1d9');
    R(ctx, rx + 3, fy - 9, 34, 1, ST.wh);
    R(ctx, rx + 20, fy - 9, 1, 5, ST.mid);
    R(ctx, rx + 3, fy - 5, 34, 1, ST.mid);
    // fondvägg: når nästan upp i taket
    R(ctx, rx + 40, fy - 43, 59, 31, '#1f6670');
    for (let i = 0; i < 59; i += 3) {
      R(ctx, rx + 40 + i, fy - 43, 2, 31, (i / 3) % 2 ? '#237680' : '#1c626b');
      R(ctx, rx + 40 + i, fy - 43, 1, 31, '#2c8590');
    }
    R(ctx, rx + 40, fy - 43, 59, 1, '#3a9aa4');
    RA(ctx, rx + 40, fy - 42, 59, 4, '#000000', 0.18);
    // neonskylt "välkommen"
    const label = T_WELCOME[lang === 'en' ? 1 : 0];
    const tw = P.textWidth(label);
    const lx = rx + 70 - Math.round(tw / 2);
    V.neonText(ctx, label, lx, fy - 38, OR.core, OR.glow);
    P.neonH(ctx, lx - 2, fy - 31, tw + 4);
    // mottagning, växt, matta och klotlampor
    P.rugM(ctx, rx + 5, fy, 34, TL.mid, AM.mid);
    F.benchSeat(ctx, rx + 5, fy, 20, '#2f8a8a');
    P.receptionM(ctx, rx + 46, fy, 40);
    P.ficus(ctx, rx + 89, fy, 26, 3);
    V.plantHang(ctx, rx + 30, top + 7, 2, 8, 3);
    P.floorPool(ctx, rx + 38, fy, lc, 0.1);
    P.globeCluster(ctx, rx + 38, top + 5, [[-9, 4], [-4, 10], [1, 5], [6, 12], [11, 7]]);
  },
  // Neonskylten andas: varm glöd som pulserar långsamt över texten
  dynamic(A, cx, gy, L, r, t, st) {
    const label = T_WELCOME[lang === 'en' ? 1 : 0];
    const tw = P.textWidth(label);
    const k = st && st.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.6);
    A.globalAlpha = 0.06 + 0.1 * k;
    A.fillStyle = OR.glow;
    A.fillRect(cx + r.x0 + 70 - Math.round(tw / 2) - 2, gy - FOUND - 39, tw + 4, 8);
    A.globalAlpha = 1;
    // löpande ljus på mottagningens logoplatta
    if (!(st && st.reduced)) {
      A.fillStyle = TL.hi;
      A.fillRect(cx + r.x0 + 60 + (Math.floor(t * 9) % 12), gy - FOUND - 6, 2, 1);
    }
  },
};

// ── Café (våning 0) och fikarum (våning 1): samma stationer, espressomaskinen på samma plats ──
defs.kitchen = {
  backWall,
  windows: (rx, fy) => (fOf(fy) === 0 ? [glassWin(rx, fy, 46, 20)] : [glassWin(rx, fy, 44, 18)]),
  stations: (rx) => [
    { kind: 'coffee', x: rx + 36, dir: -1, pose: 'drink' },
    { kind: 'stand', x: rx + 50, dir: -1, pose: 'talk' },
  ],
  pendants: () => [],
  decor(ctx, r, fy) {
    const rx = r.x0;
    const top = fy - INT_H;
    const lc = r.lightRGB.join(',');
    const cafe = r.floor === 0;
    if (cafe) {
      bay(ctx, rx, fy, 46, 20, { dado: styOf(r).dado, mull: 10, seed: 3 });
      sillGreens(ctx, rx + 46, fy, 20, 5);
      P.drinksFridge(ctx, rx + 3, fy);
      P.cafeCounter(ctx, rx + 18, fy, 36);
      F.espresso(ctx, rx + 21, fy - 16);
      P.pastryCase(ctx, rx + 39, fy - 16);
      F.mug(ctx, rx + 35, fy - 16, '#f4f4ff');
      F.mug(ctx, rx + 49, fy - 16, TL.lt);
      P.menuBoard(ctx, rx + 19, fy - 38, 25, 9, lang === 'en' ? 'COFFEE' : 'KAFFE');
      V.wallShelf(ctx, rx + 45, fy - 27, 10, 'cc', 4);
      P.barStool(ctx, rx + 57, fy, AM.mid);
      P.planter(ctx, rx + 61, fy, 7, 9, 1);
      // neonskylt i fönstret och infällda spotlights
      const open = T_OPEN[lang === 'en' ? 1 : 0];
      V.neonText(ctx, open, rx + 47, fy - 34, OR.core, OR.glow);
      for (const dx of [26, 52]) {
        P.floorPool(ctx, rx + dx, fy, lc, 0.1);
        V.lightCone(ctx, rx + dx, top + 11, 22, 26, lc, 0.05);
        P.spot(ctx, rx + dx - 1, top + 8, lc);
      }
    } else {
      bay(ctx, rx, fy, 44, 18, { dado: styOf(r).dado, mull: 9, seed: 6 });
      sillGreens(ctx, rx + 44, fy, 18, 2);
      F.fridge(ctx, rx + 3, fy, '#cfd8dc');
      F.kitchenCounter(ctx, rx + 17, fy, 36, '#e0782a');
      F.espresso(ctx, rx + 21, fy - 16);
      R(ctx, rx + 36, fy - 21, 9, 5, '#cfd8dc');
      R(ctx, rx + 37, fy - 20, 5, 3, '#10202a');
      R(ctx, rx + 43, fy - 20, 1, 3, AM.lt);
      F.mug(ctx, rx + 47, fy - 16, TL.lt);
      P.planter(ctx, rx + 57, fy, 7, 9, 2);
      P.domeLamp(ctx, rx + 30, top + 9, 4, ST.dk, '255,190,120');
      P.floorPool(ctx, rx + 30, fy, lc, 0.1);
    }
  },
};

// ── Möten: konferensrum (våning 1, 104 px) och ledningsrum (våning 3, 84 px). Samma stationer i förhållande till rummets bredd. ──
const confTable = (ctx, x, fy, w, top = '#f1f5f6', edge = '#aebcc2', leg = ST.mid) => {
  F.shadow(ctx, x + 2, fy, w - 4);
  R(ctx, x + 6, fy - 13, 2, 13, leg);
  R(ctx, x + w - 8, fy - 13, 2, 13, leg);
  R(ctx, x + 6, fy - 13, 1, 13, ST.hi);
  R(ctx, x + 8, fy - 3, w - 16, 1, ST.dk);
  R(ctx, x, fy - 15, w, 2, top);
  R(ctx, x, fy - 15, w, 1, '#ffffff');
  R(ctx, x + 1, fy - 13, w - 2, 1, edge);
  R(ctx, x + w - 1, fy - 15, 1, 2, edge);
};
const rearChair = (ctx, sx, fy, c) => {
  R(ctx, sx + 1, fy - 24, 7, 9, '#e3ecef');
  R(ctx, sx, fy - 23, 9, 7, '#eef4f6');
  R(ctx, sx + 1, fy - 24, 7, 1, '#ffffff');
  R(ctx, sx + 2, fy - 22, 5, 4, c);
  R(ctx, sx + 8, fy - 22, 1, 6, '#9fb2ba');
  R(ctx, sx + 3, fy - 17, 3, 2, ST.dk);
};
defs.meeting = {
  backWall,
  windows: (rx, fy) => (fOf(fy) === 1 ? [glassWin(rx, fy, 68, 32)] : [glassWin(rx, fy, 66, 14)]),
  stations: (rx, fy) => {
    const big = fOf(fy) === 1;
    const [a, b, pr, bd, sd] = big ? [19, 89, 54, 9, 99] : [17, 67, 42, 7, 77];
    return [
      { kind: 'seat', x: rx + a, dir: 1, pose: 'sit' },
      { kind: 'seat', x: rx + b, dir: -1, pose: 'sit' },
      { kind: 'stand', x: rx + pr, dir: 1, pose: 'present' },
      { kind: 'board', x: rx + bd, dir: 1, pose: 'present' },
      { kind: 'stand', x: rx + sd, dir: -1, pose: 'stand' },
    ];
  },
  pendants: () => [],
  decor(ctx, r, fy) {
    const rx = r.x0;
    const top = fy - INT_H;
    const lc = r.lightRGB.join(',');
    const big = r.floor === 1;
    const exec = !big;
    const sty = styOf(r);
    // fönster
    if (big) {
      bay(ctx, rx, fy, 68, 32, { dado: sty.dado, mull: 16, seed: 9 });
      sillGreens(ctx, rx + 68, fy, 32, 7);
    } else {
      bay(ctx, rx, fy, 66, 14, { dado: sty.dado, mull: 0, seed: 2 });
      sillGreens(ctx, rx + 66, fy, 14, 4);
    }
    // skrivbart glas / konstverk till vänster, bildskärm i mitten (animeras av rooms.js på rx+26, fy-44)
    if (big) P.designWall(ctx, rx + 3, fy - 38, 19, 24, 5);
    else {
      V.frame(ctx, rx + 3, fy - 37, 11, 14, 4, 3, '#c9a35a');
    }
    R(ctx, rx + 24, fy - 46, 42, 23, 'rgba(0,0,0,0.14)');
    V.wallScreen(ctx, rx + 26, fy - 44, 38, 19, 'slides', 3);
    // bord, stolar
    const tx = rx + (big ? 24 : 22);
    const tw = big ? 60 : 44;
    for (const bx of big ? [34, 50, 66] : [32, 48]) rearChair(ctx, rx + bx, fy, exec ? '#3a4a5a' : TL.lt);
    if (exec) confTable(ctx, tx, fy, tw, '#5a3a24', '#2a1a10', '#c9a35a');
    else confTable(ctx, tx, fy, tw);
    const ec = exec ? '#2a3440' : TL.lt;
    P.chairShell(ctx, rx + (big ? 17 : 15), fy, ec);
    ctx.save();
    ctx.translate(rx + (big ? 89 : 67), 0);
    ctx.scale(-1, 1);
    P.chairShell(ctx, -2, fy, ec);
    ctx.restore();
    // på bordet
    F.laptop(ctx, tx + 4, fy - 15, 1);
    F.laptop(ctx, tx + tw - 12, fy - 15, -1);
    F.mug(ctx, tx + Math.floor(tw / 2) - 1, fy - 15, '#f4f4ff');
    R(ctx, tx + Math.floor(tw / 2) + 6, fy - 19, 2, 4, TL.glass);
    R(ctx, tx + Math.floor(tw / 2) + 6, fy - 19, 2, 1, '#ffffff');
    // infällda spotlights i friesen (ljuskäglor över bordet)
    for (const dx of big ? [30, 54, 78] : [28, 52]) {
      P.floorPool(ctx, rx + dx, fy, lc, 0.09);
      V.lightCone(ctx, rx + dx, top + 11, 22, 26, lc, 0.05);
      P.spot(ctx, rx + dx - 1, top + 8, lc);
    }
    if (exec) V.plantHang(ctx, rx + 68, top + 11, 2, 9, 3);
    else P.ficus(ctx, rx + 96, fy, 22, 2);
  },
};

// ── Bibliotek och lounge (våning 3): akvarium, soffa, fåtölj med läslampa och öppna bokhyllor ──
defs.lounge = {
  backWall,
  windows: (rx, fy) => [glassWin(rx, fy, 40, 20)],
  stations: (rx) => [
    { kind: 'sofa', x: rx + 10, dir: 1, pose: 'sit' },
    { kind: 'sofa', x: rx + 22, dir: 1, pose: 'sit' },
    { kind: 'sofa', x: rx + 41, dir: -1, pose: 'sit' },
    { kind: 'stand', x: rx + 57, dir: -1, pose: 'stand' },
    { kind: 'window', x: rx + 47, dir: 1, pose: 'stand' },
  ],
  pendants: () => [],
  decor(ctx, r, fy) {
    const rx = r.x0;
    const top = fy - INT_H;
    const lc = r.lightRGB.join(',');
    bay(ctx, rx, fy, 40, 20, { dado: styOf(r).dado, mull: 10, seed: 8 });
    sillGreens(ctx, rx + 40, fy, 20, 9);
    F.fishTank(ctx, rx + 5, fy - 41, 30, 12);
    P.rugM(ctx, rx + 1, fy, 54, '#8a5a2a', AM.lt);
    P.sofaM(ctx, rx + 2, fy, 32, AM.mid, TL.lt);
    P.chairLounge(ctx, rx + 36, fy, TL.lt);
    P.arcLamp(ctx, rx + 56, fy, 38);
    P.libraryShelf(ctx, rx + 62, fy, 22, 40, 5);
    P.floorPool(ctx, rx + 24, fy, lc, 0.1);
    V.lightCone(ctx, rx + 24, top + 14, 24, 40, lc, 0.05);
  },
};

// ── Designlab (våning 2): idévägg med skisser och lappar ──
defs.whiteboard = {
  backWall,
  windows: (rx, fy) => [glassWin(rx, fy, 62, 18)],
  stations: (rx) => [
    { kind: 'board', x: rx + 30, dir: 1, pose: 'present' },
    { kind: 'board', x: rx + 14, dir: 1, pose: 'present' },
    { kind: 'stand', x: rx + 66, dir: -1, pose: 'talk' },
  ],
  pendants: () => [],
  decor(ctx, r, fy) {
    const rx = r.x0;
    const top = fy - INT_H;
    const lc = r.lightRGB.join(',');
    bay(ctx, rx, fy, 62, 18, { dado: styOf(r).dado, mull: 9, seed: 12 });
    sillGreens(ctx, rx + 62, fy, 18, 6);
    P.designWall(ctx, rx + 4, fy - 39, 52, 27, 11);
    F.benchSeat(ctx, rx + 58, fy, 12, AM.mid);
    P.ficus(ctx, rx + 73, fy, 18, 4);
    for (const dx of [8, 34]) {
      P.floorPool(ctx, rx + dx + 12, fy, lc, 0.09);
      P.ceilBar(ctx, rx + dx, top + 9, 24, 1, lc);
    }
  },
};

// ── Serverhall (våning 2): racks i rad, kylenhet och turkos golvlist. rooms.js animerar dioderna från racks(). ──
defs.server = {
  backWall,
  windows: () => [],
  stations: (rx) => [
    { kind: 'rack', x: rx + 27, dir: 1, pose: 'laptop' },
    { kind: 'rack', x: rx + 10, dir: 1, pose: 'stand' },
  ],
  pendants: () => [],
  racks: (rx, fy) => [rx + 3, rx + 19, rx + 35, rx + 51].map((x, i) => ({ x, y: fy, w: 14, h: 38, seed: 3 + i })),
  decor(ctx, r, fy) {
    const rx = r.x0;
    F.cableTray(ctx, rx + 2, fy - 45, 64);
    for (const k of this.racks(rx, fy)) F.rack(ctx, k.x, k.y, k.w, k.h, k.seed);
    P.coolerUnit(ctx, rx + 68, fy);
    for (let x = rx + 2; x < rx + 66; x += 6) R(ctx, x, fy - 1, 3, 1, TL.hi);
    RA(ctx, rx + 2, fy - 5, 64, 4, TL.hi, 0.12);
    R(ctx, rx + 70, fy - 38, 12, 1, TL.mid);
    P.signage(ctx, rx + 69, fy - 37, 14, 6, '#5cf2a0', TL.hi, 4);
  },
};

// ── Anläggningsrummen (högerkanten) får nivåns väggar; möblerna och namnen kommer från rooms.js ──
defs.facility = { backWall, windows: () => [], stations: () => [], pendants: () => [] };

// ═══ Fasad: skalet ritas om i nivåns stil (aluminiumpelare, vita bjälklag med turkost glasband, orange neonlist) ═══
const COL_X = [-HALF, HALF - 6];

function column(ctx, x, topY) {
  R(ctx, x, topY, 6, -topY, '#c3d1d9');
  R(ctx, x, topY, 1, -topY, ST.wh);
  R(ctx, x + 1, topY, 1, -topY, ST.hi);
  R(ctx, x + 5, topY, 1, -topY, '#7d909b');
  for (let y = topY + 12; y < 0; y += 18) R(ctx, x + 1, y, 4, 1, '#8ea3ae');
}

function slab(ctx, L, f) {
  const fy = -FOUND - f * PITCH;
  const sx0 = L.left - 9;
  const sw = L.IW + 18;
  if (f === 0) {
    R(ctx, sx0, fy, sw, FOUND, ST.mid);
    R(ctx, sx0, fy, sw, 1, ST.hi);
    R(ctx, sx0, fy + 1, sw, 1, ST.lt);
    R(ctx, sx0, fy + FOUND - 1, sw, 1, ST.dk);
  } else {
    R(ctx, sx0, fy, sw, 6, '#c9d7de');
    R(ctx, sx0, fy, sw, 1, ST.wh);
    R(ctx, sx0, fy + 2, sw, 2, '#2c6068');
    R(ctx, sx0, fy + 2, sw, 1, '#3a8088');
    R(ctx, sx0, fy + 4, sw, 1, '#ffb56a');
    RA(ctx, sx0, fy + 3, sw, 1, '#ff7a2e', 0.35);
    R(ctx, sx0, fy + 5, sw, 1, '#7d909b');
  }
  for (let x = 24; x < sw; x += 48) R(ctx, sx0 + x, fy + 1, 1, f === 0 ? 2 : 1, '#8ea3ae');
}

// Skiljeväggar mellan rummen (ritas över rooms.js grafitväggar): aluminiumpelare, tonat glas, öppet valv efter lobbyn.
function partitions(ctx, L) {
  const intH = INT_H;
  for (let f = 0; f < L.floors; f++) {
    const fy = -FOUND - f * PITCH;
    const top = fy - intH;
    const fr = L.rooms.filter((r) => r.floor === f);
    for (let i = 1; i < fr.length; i++) {
      const a = fr[i - 1];
      const b = fr[i];
      const sa = styOf(a);
      const sb = styOf(b);
      const x = b.x0;
      const kind = b.type === 'facility' ? (a.type === 'facility' ? 'solid' : 'glass') : a.type === 'server' || b.type === 'server' ? 'solid' : a.type === 'lobby' ? 'arch' : 'glass';
      // underlag: de två rummens väggfärger, fris, LED-list och golvband
      for (const [x0, w, s, rm] of [[x - 2, 2, sa, a], [x, 3, sb, b]]) {
        const fh = s.thin ? 3 : 7;
        R(ctx, x0, top, w, intH, s.wall);
        R(ctx, x0, top, w, 1, ST.lt);
        R(ctx, x0, top + 1, w, fh, s.fascia);
        R(ctx, x0, top + fh, w, 1, '#bccfd6');
        R(ctx, x0, top + fh + 1, w, 1, `rgb(${rm.lightRGB.join(',')})`);
        R(ctx, x0, fy - 3, w, 3, s.floor);
      }
      if (kind === 'arch') {
        R(ctx, x - 1, top + 9, 3, 6, ST.hi);
        R(ctx, x - 1, top + 14, 3, 1, ST.mid);
        R(ctx, x - 1, top + 12, 3, 1, OR.neon);
        R(ctx, x - 1, top + 15, 1, intH - 18, ST.hi);
        R(ctx, x + 1, top + 15, 1, intH - 18, ST.dk);
        RA(ctx, x, top + 15, 1, intH - 18, TL.glass, 0.25);
        continue;
      }
      if (kind === 'solid') {
        R(ctx, x - 2, top + 9, 5, intH - 12, '#dbe5ea');
        R(ctx, x - 2, top + 9, 1, intH - 12, ST.wh);
        R(ctx, x + 2, top + 9, 1, intH - 12, ST.lt);
        R(ctx, x - 2, fy - 12, 5, 8, ST.mid);
        R(ctx, x - 2, fy - 12, 5, 1, ST.hi);
        continue;
      }
      R(ctx, x - 1, top + 9, 1, intH - 12, ST.wh);
      R(ctx, x, top + 9, 1, intH - 12, ST.hi);
      R(ctx, x + 1, top + 9, 1, intH - 12, ST.mid);
      RA(ctx, x - 2, top + 11, 1, intH - 25, TL.glass, 0.32);
      RA(ctx, x + 2, top + 11, 1, intH - 25, TL.glass, 0.32);
      R(ctx, x, top + 14, 1, 7, 'rgba(255,255,255,0.7)');
      R(ctx, x - 2, fy - 13, 5, 1, ST.wh);
      R(ctx, x - 2, fy - 12, 5, 8, ST.mid);
      R(ctx, x - 2, fy - 12, 1, 8, ST.lt);
    }
  }
}

// Entrépaviljong på markplan: glasad kub med revolvingdörr och luftig skärmtak med orange kant.
const VEST = { x0: -HALF - 22, w: 22 };
function vestibule(ctx) {
  const fy = -FOUND;
  const { x0, w } = VEST;
  // markplatta och skärmtak
  R(ctx, x0 - 6, fy, w + 12, 1, '#b4c4cc');
  R(ctx, x0 - 6, fy - 42, w + 12, 3, '#eef4f6');
  R(ctx, x0 - 6, fy - 42, w + 12, 1, '#ffffff');
  R(ctx, x0 - 6, fy - 39, w + 12, 1, '#2c6068');
  R(ctx, x0 - 6, fy - 38, w + 12, 1, OR.neon);
  RA(ctx, x0 - 6, fy - 37, w + 12, 3, OR.glow, 0.22);
  // glaspartier och stolpe
  RA(ctx, x0, fy - 38, w, 38, TL.glass, 0.16);
  R(ctx, x0, fy - 38, 2, 38, ST.mid);
  R(ctx, x0, fy - 38, 1, 38, ST.hi);
  R(ctx, x0 - 5, fy - 38, 1, 38, ST.lt);
  P.revolvingFrame(ctx, x0 + 2, fy, 18, 36);
  // planteringar
  P.planter(ctx, x0 - 17, fy, 11, 8, 1);
  P.planter(ctx, x0 - 5, fy, 6, 6, 2);
  // lampa under taket
  R(ctx, x0 + 9, fy - 37, 4, 1, '#fff4c0');
}

// Våningsdörr i vänsterkolumnen och glasbalkong (våning 1-3).
function leftDoors(ctx, L) {
  for (let f = 0; f < L.floors; f++) {
    const fy = -FOUND - f * PITCH;
    ctx.clearRect(-HALF, fy - 33, 6, 30);
    R(ctx, -HALF - 1, fy - 35, 8, 2, '#33444e');
    R(ctx, -HALF - 1, fy - 35, 8, 1, ST.hi);
    RA(ctx, -HALF, fy - 33, 6, 30, TL.glass, 0.18);
    R(ctx, -HALF, fy - 33, 1, 30, ST.mid);
    R(ctx, -HALF, fy - 4, 6, 1, ST.mid);
    RA(ctx, -HALF + 1, fy - 31, 1, 10, '#ffffff', 0.45);
    if (f === 0) continue;
    const bx = -HALF - 15;
    R(ctx, bx, fy, 16, 3, '#c9d7de');
    R(ctx, bx, fy, 16, 1, ST.wh);
    R(ctx, bx, fy + 2, 16, 1, '#7d909b');
    R(ctx, bx + 1, fy + 1, 14, 1, '#2c6068');
    R(ctx, bx, fy - 10, 1, 10, ST.hi);
    RA(ctx, bx + 1, fy - 9, 14, 8, TL.glass, 0.14);
    R(ctx, bx, fy - 10, 15, 1, ST.wh);
    R(ctx, bx + 15, fy - 10, 1, 10, ST.mid);
    P.planter(ctx, bx + 3, fy, 7, 5, f);
  }
}

// Orange neonlister längs de bärande pelarna och en lysande list på kanten av entrétaket.
function neonColumns(ctx, L) {
  for (let f = 0; f < L.floors; f++) {
    const fy = -FOUND - f * PITCH;
    // vänster: mellan dörrens överstycke och våningen ovanför; höger: längs hela våningen
    V.neonLineV(ctx, -HALF + 2, fy - 47, 10, OR.neon, OR.glow);
    V.neonLineV(ctx, HALF - 4, fy - 47, 42, OR.neon, OR.glow);
  }
}

// Anläggningsrummens färger kommer från rooms.js (Studiohusets paletter). Ett ljust, kallt täckskikt (bara över redan ritade pixlar)
// drar dem mot nivåns vita och turkosa utan att rummen tappar sin egen färg.
function washFacilities(ctx, L, opts) {
  const built = new Set(Object.values((opts && opts.fac) || {}).map((f) => f.slot));
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (const r of L.rooms) {
    if (r.type !== 'facility') continue;
    const fy = -FOUND - r.floor * PITCH;
    ctx.fillStyle = built.has(r.slot) ? 'rgba(226,242,244,0.34)' : 'rgba(226,242,244,0.16)';
    ctx.fillRect(r.x0 + 3, fy - INT_H + 9, r.w - 6, INT_H - 9);
  }
  ctx.restore();
}

function facade(ctx, L, opts) {
  const topY = L.topY;
  for (const sx of COL_X) column(ctx, sx, topY);
  for (let f = 0; f < L.floors; f++) slab(ctx, L, f);
  R(ctx, L.left - 9, topY, L.IW + 18, 6, '#c9d7de');
  R(ctx, L.left - 9, topY, L.IW + 18, 1, ST.wh);
  R(ctx, L.left - 9, topY + 2, L.IW + 18, 2, '#2c6068');
  R(ctx, L.left - 9, topY + 4, L.IW + 18, 1, '#ffb56a');
  R(ctx, L.left - 9, topY + 5, L.IW + 18, 1, '#7d909b');
  washFacilities(ctx, L, opts);
  partitions(ctx, L);
  // orange neonband längs lobbyns och caféets tak
  const lob = L.rooms.find((r) => r.type === 'lobby');
  if (lob) V.neonLine(ctx, lob.x0 + 6, -FOUND - 44, 92, OR.neon, OR.glow);
  leftDoors(ctx, L);
  vestibule(ctx);
  neonColumns(ctx, L);
}

// ═══ Tak: solpaneler, vindturbin, glasad takvåning, skylt, ventilation och antenn ═══
const ROOF = { sign: -64, turbine: -150, pent: 18, pentW: 110, hvac: 142, vent: 178, mast: 212, solar: -232 };

function solarPanel(ctx, x, y) {
  for (let r = 0; r < 9; r++) {
    const off = Math.round(((8 - r) * 4) / 8);
    const px = x + off;
    R(ctx, px, y + r, 16, 1, r % 3 === 2 ? '#3f6aa8' : '#1c3a6e');
    for (let k = 4; k < 16; k += 4) R(ctx, px + k, y + r, 1, 1, '#3f6aa8');
    R(ctx, px, y + r, 1, 1, '#c8d4dc');
    R(ctx, px + 15, y + r, 1, 1, '#9fb4c0');
  }
  R(ctx, x + 4, y, 16, 1, '#c8d4dc');
  R(ctx, x, y + 8, 16, 1, '#c8d4dc');
  for (let r = 1; r < 8; r++) RA(ctx, x + Math.round(((8 - r) * 4) / 8) + 5, y + r, 1, 1, '#ffffff', 0.3);
}

function solarField(ctx, deck) {
  const x0 = ROOF.solar;
  // bakre rad (högre) och främre rad
  for (const [row, y] of [[0, deck - 27], [1, deck - 13]]) {
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * 22 + (row ? 4 : 0);
      R(ctx, x + 3, y + 9, 1, deck - y - 9, '#7d909b');
      R(ctx, x + 13, y + 9, 1, deck - y - 9, '#7d909b');
      solarPanel(ctx, x, y);
    }
  }
}

function turbine(ctx, deck) {
  const x = ROOF.turbine;
  R(ctx, x, deck - 36, 3, 33, '#e8eef0');
  R(ctx, x, deck - 36, 1, 33, '#ffffff');
  R(ctx, x + 2, deck - 35, 1, 32, '#9fb4c0');
  R(ctx, x - 3, deck - 5, 9, 2, '#9fb4c0');
  R(ctx, x - 1, deck - 40, 7, 4, '#dfe8ec');
  R(ctx, x - 1, deck - 40, 7, 1, '#ffffff');
  R(ctx, x + 5, deck - 39, 1, 3, '#9fb4c0');
}

const PENT_H = 31; // takvåningens invändiga höjd
function penthouse(ctx, deck) {
  const x0 = ROOF.pent;
  const w = ROOF.pentW;
  const H = PENT_H;
  const t = deck - 3 - H;
  // inredning bakom glaset
  R(ctx, x0, t, w, H, '#efe6d2');
  for (let x = 6; x < w; x += 11) R(ctx, x0 + x, t + 3, 1, H - 5, '#e2d8c0');
  RA(ctx, x0, t, w, 4, '#000000', 0.18);
  RA(ctx, x0, t + 4, w, 2, '#000000', 0.08);
  R(ctx, x0, deck - 3, w, 3, '#c8a070');
  R(ctx, x0, deck - 3, w, 1, '#e0c090');
  P.rugM(ctx, x0 + 4, deck, 62, '#1f6670', AM.lt);
  V.frame(ctx, x0 + 8, t + 6, 11, 9, 4, 2, '#2f414c');
  V.frame(ctx, x0 + 46, t + 5, 9, 12, 1, 5, '#2f414c');
  P.sofaM(ctx, x0 + 6, deck, 30, AM.mid, TL.lt);
  P.coffeeTable(ctx, x0 + 40, deck, 12);
  P.chairLounge(ctx, x0 + 56, deck, TL.lt);
  // bar
  R(ctx, x0 + 82, deck - 12, 22, 12, '#2c6068');
  R(ctx, x0 + 82, deck - 12, 22, 1, TL.hi);
  R(ctx, x0 + 81, deck - 14, 24, 2, '#d9a35a');
  R(ctx, x0 + 81, deck - 14, 24, 1, '#f5cd8a');
  R(ctx, x0 + 82, deck - 2, 22, 2, '#10272e');
  F.mug(ctx, x0 + 86, deck - 14, '#f4f4ff');
  F.mug(ctx, x0 + 96, deck - 14, TL.lt);
  V.wallShelf(ctx, x0 + 84, deck - 25, 18, 'cbc', 3);
  P.ficus(ctx, x0 + 99, deck, 22, 5);
  P.globeCluster(ctx, x0 + 28, t + 3, [[-6, 2], [0, 6], [6, 3]]);
  P.globeCluster(ctx, x0 + 72, t + 3, [[-3, 3], [3, 5]]);
  // glasfront: stålpelare, tonat glas, reflexer
  RA(ctx, x0, t, w, H, TL.glass, 0.1);
  for (let x = 22; x < w - 1; x += 22) {
    R(ctx, x0 + x, t, 1, H, ST.hi);
    RA(ctx, x0 + x + 1, t, 1, H, ST.dk, 0.4);
  }
  R(ctx, x0, t, 2, H, ST.mid);
  R(ctx, x0, t, 1, H, ST.hi);
  R(ctx, x0 + w - 2, t, 2, H, ST.mid);
  R(ctx, x0 + w - 1, t, 1, H, ST.dk);
  for (const [fx, wd, a] of [[0.1, 4, 0.12], [0.16, 1, 0.16], [0.52, 5, 0.1], [0.58, 2, 0.13], [0.84, 3, 0.1]]) {
    for (let r = 2; r < H - 2; r++) RA(ctx, Math.round(x0 + w * fx + (H - r) * 0.5), t + r, wd, 1, '#ffffff', a);
  }
  // taklist med orange LED
  R(ctx, x0 - 3, t - 4, w + 6, 4, '#eef4f6');
  R(ctx, x0 - 3, t - 4, w + 6, 1, '#ffffff');
  R(ctx, x0 - 3, t - 1, w + 6, 1, '#9fb4c0');
  R(ctx, x0, t, w, 1, OR.neon);
  RA(ctx, x0, t + 1, w, 2, OR.glow, 0.25);
  // dörr
  R(ctx, x0 + w - 16, t + 3, 1, H - 3, ST.wh);
  R(ctx, x0 + w - 6, t + 3, 1, H - 3, ST.mid);
  R(ctx, x0 + w - 16, t + 3, 11, 1, ST.mid);
  R(ctx, x0 + w - 11, t + 14, 1, 6, ST.wh);
}

function hvac(ctx, deck) {
  for (let i = 0; i < 2; i++) {
    const ax = ROOF.hvac + i * 17;
    R(ctx, ax, deck - 13, 15, 13, '#dfe8ec');
    R(ctx, ax, deck - 13, 15, 1, '#ffffff');
    R(ctx, ax + 14, deck - 12, 1, 12, '#8ea3ae');
    blob(ctx, ax + 5, deck - 7, 4, 4, '#2a3a44', '#4a5a66', '#10181c');
    for (let k = -2; k <= 2; k += 2) R(ctx, ax + 5 + k, deck - 10, 1, 7, '#5f7684');
    for (let k = 0; k < 4; k++) R(ctx, ax + 10, deck - 11 + k * 3, 4, 1, '#9fb4c0');
    R(ctx, ax, deck - 1, 15, 1, '#7d909b');
  }
  // ventilationsrör (ångan kommer från roof.steam)
  R(ctx, ROOF.vent, deck - 24, 5, 24, '#9fb4c0');
  R(ctx, ROOF.vent, deck - 24, 1, 24, '#d5e2ea');
  R(ctx, ROOF.vent - 1, deck - 26, 7, 3, '#c3d1d9');
  R(ctx, ROOF.vent - 1, deck - 26, 7, 1, '#ffffff');
}

function mast(ctx, deck) {
  const x = ROOF.mast;
  R(ctx, x, deck - 56, 2, 56, '#9fb4c0');
  R(ctx, x, deck - 56, 1, 56, '#d5e2ea');
  for (const [y, w] of [[14, 11], [24, 9], [34, 7], [44, 5]]) {
    R(ctx, x - Math.floor(w / 2) + 1, deck - y, w, 1, '#c3d1d9');
    R(ctx, x - Math.floor(w / 2) + 1, deck - y + 1, 1, 2, '#9fb4c0');
    R(ctx, x + Math.floor(w / 2), deck - y + 1, 1, 2, '#9fb4c0');
  }
  R(ctx, x - 3, deck - 4, 8, 4, '#7d909b');
  // parabol
  blob(ctx, x - 14, deck - 12, 6, 4, '#eef4f6', '#ffffff', '#9fb4c0');
  R(ctx, x - 14, deck - 8, 2, 8, '#9fb4c0');
  R(ctx, x - 12, deck - 14, 7, 1, '#7d909b');
}

// Skylt med studions namn på stålram: vit text på mörk turkos tavla med orange neonlist.
function roofSign(ctx, name, deck) {
  let lines = [name];
  let sc = P.V.R ? 0 : 0;
  sc = fitText(name, 100, 2).scale;
  if (sc === 1) {
    let cut = -1;
    for (let i = 0; i < name.length; i++) if (name[i] === ' ' && (cut < 0 || Math.abs(i - name.length / 2) < Math.abs(cut - name.length / 2))) cut = i;
    if (cut > 0 && P.textWidth(name.slice(0, cut), 2) <= 100 && P.textWidth(name.slice(cut + 1), 2) <= 100) {
      lines = [name.slice(0, cut), name.slice(cut + 1)];
      sc = 2;
    } else lines = [fitText(name, 100, 1).text];
  } else lines = [fitText(name, 100, 2).text];
  const tw = Math.max(...lines.map((s) => P.textWidth(s, sc)));
  const sw = tw + 40;
  const SH = lines.length === 2 ? 33 : 27;
  const sx = ROOF.sign - Math.round(sw / 2);
  const sy = deck - 40 - (SH - 27);
  // ben och stag
  R(ctx, sx + 8, sy + SH, 3, deck - sy - SH, ST.dk);
  R(ctx, sx + sw - 11, sy + SH, 3, deck - sy - SH, ST.dk);
  R(ctx, sx + 8, sy + SH, 1, deck - sy - SH, ST.mid);
  R(ctx, sx + sw - 11, sy + SH, 1, deck - sy - SH, ST.mid);
  // tavla
  R(ctx, sx - 1, sy - 1, sw + 2, SH + 2, ST.lt);
  R(ctx, sx - 1, sy - 1, sw + 2, 1, ST.wh);
  R(ctx, sx, sy, sw, SH, '#08222a');
  R(ctx, sx + 1, sy + 1, sw - 2, SH - 2, '#0d3038');
  R(ctx, sx + 1, sy + 1, sw - 2, 1, '#1a5560');
  R(ctx, sx, sy + SH - 1, sw, 1, '#04141a');
  R(ctx, sx + 2, sy + SH - 3, sw - 4, 1, OR.neon);
  RA(ctx, sx + 1, sy + SH - 5, sw - 2, 4, OR.glow, 0.28);
  // logotyp: avrundad ruta, turkos och orange
  const lx = sx + 6;
  const ly = sy + Math.floor((SH - 14) / 2) - 1;
  R(ctx, lx + 1, ly, 12, 14, TL.lt);
  R(ctx, lx, ly + 1, 14, 12, TL.lt);
  R(ctx, lx + 1, ly, 12, 1, TL.hi);
  for (let r = 0; r < 8; r++) R(ctx, lx + 13 - r - 1, ly + 13 - r - 1 + 0, r + 1, 1, OR.neon);
  R(ctx, lx + 4, ly + 4, 3, 3, '#ffffff');
  RA(ctx, lx - 2, ly - 2, 18, 18, TL.hi, 0.12);
  const tx0 = sx + 26;
  const lit = (str, x, y) => {
    ctx.globalAlpha = 0.22;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) P.drawText(ctx, str, x + dx, y + dy, TL.hi, sc);
    ctx.globalAlpha = 1;
    P.drawText(ctx, str, x, y + 1, '#04545c', sc);
    P.drawText(ctx, str, x, y, '#f4fcfc', sc);
  };
  if (lines.length === 2) lines.forEach((s, i) => lit(s, tx0, sy + 5 + i * 13));
  else lit(lines[0], tx0, sy + 6 + (sc === 1 ? 3 : 0));
  RA(ctx, sx - 3, sy - 3, sw + 6, SH + 6, TL.hi, 0.07);
}

function railing(ctx, deck) {
  const rl = -HALF + 2;
  const rr = HALF - 2;
  RA(ctx, rl, deck - 10, rr - rl, 9, TL.glass, 0.1);
  R(ctx, rl, deck - 11, rr - rl, 1, ST.hi);
  R(ctx, rl, deck - 12, rr - rl, 1, ST.lt);
  for (let x = rl; x <= rr; x += 30) {
    R(ctx, x, deck - 12, 1, 12, ST.lt);
    R(ctx, x, deck - 12, 1, 1, ST.wh);
  }
  for (let x = rl + 7; x < rr; x += 15) R(ctx, x, deck - 9, 1, 5, 'rgba(255,255,255,0.32)');
  R(ctx, rl, deck - 1, rr - rl, 1, '#7d909b');
}

function roof(ctx, L, opts) {
  const deck = L.topY;
  const name = (opts.name || 'STUDIO').toUpperCase();
  // däck av ljusa betongplattor
  R(ctx, -HALF + 2, deck - 3, L.BW - 4, 3, '#cdd5d8');
  R(ctx, -HALF + 2, deck - 3, L.BW - 4, 1, '#eef2f3');
  for (let x = -HALF + 12; x < HALF - 2; x += 16) R(ctx, x, deck - 2, 1, 2, '#9fb0b6');
  mast(ctx, deck);
  hvac(ctx, deck);
  penthouse(ctx, deck);
  roofSign(ctx, name, deck);
  turbine(ctx, deck);
  solarField(ctx, deck);
  P.planter(ctx, ROOF.pent - 14, deck, 9, 7, 2);
  railing(ctx, deck);
}

// ── Dynamik: vindturbin, flygvarningslampa, solglimt, revolvingdörr och gäster på takvåningen ──
const GUESTS = [
  { dx: 16, look: { skin: 2, hair: 3, hairColor: 2, shirt: 4, pants: 2, acc: 0 }, pose: 'talk', seated: true },
  { dx: 28, look: { skin: 0, hair: 8, hairColor: 4, shirt: 14, pants: 4, acc: 1 }, pose: 'drink', seated: true },
  { dx: 92, look: { skin: 3, hair: 4, hairColor: 0, shirt: 9, pants: 5, acc: 0 }, pose: 'drink', seated: false },
];
// Alla glaspartier (samma hål som rooms.js klipper ut), för glansen som sveper över fasaden.
function glassRects(L) {
  if (L.t4glass) return L.t4glass;
  const out = [];
  for (const r of L.rooms) {
    const d = defs[r.type];
    if (!d || !d.windows) continue;
    for (const w of d.windows(r.x0, -FOUND - r.floor * PITCH)) out.push(w);
  }
  L.t4glass = out;
  return out;
}

function glassGlint(A, cx, gy, L, rt) {
  const ph = (rt % 15) / 15;
  if (ph > 0.5) return;
  const gx = -280 + (ph / 0.5) * 580; // glansens läge i byggnadens x-led (vänster till höger)
  A.fillStyle = '#ffffff';
  for (const g of glassRects(L)) {
    for (let k = 0; k < 4; k++) {
      const y0 = g.y + Math.floor((k * g.h) / 4);
      const y1 = g.y + Math.floor(((k + 1) * g.h) / 4);
      const bx = gx + (3 - k) * 2; // lutar uppåt åt höger
      for (const [off, wd, a] of [[0, 6, 0.1], [2, 2, 0.16]]) {
        const x0 = Math.max(g.x, bx + off);
        const x1 = Math.min(g.x + g.w, bx + off + wd);
        if (x1 <= x0) continue;
        A.globalAlpha = a;
        A.fillRect(cx + x0, gy + y0, x1 - x0, y1 - y0);
      }
    }
  }
  A.globalAlpha = 1;
}

function dynamicRoof(A, cx, gy, L, t, night, st) {
  const deck = gy + L.topY;
  const rt = st && st.reduced ? 0 : t;
  // vindturbinens blad
  const hx = cx + ROOF.turbine + 3;
  const hy = deck - 38;
  const spin = rt * 1.7;
  for (let b = 0; b < 3; b++) {
    const a = spin + (b * Math.PI * 2) / 3;
    for (let s = 1; s <= 10; s++) {
      A.fillStyle = s < 7 ? '#f4f9fb' : '#c3d1d9';
      A.fillRect(Math.round(hx + Math.cos(a) * s), Math.round(hy + Math.sin(a) * s), 1, s < 4 ? 2 : 1);
    }
  }
  A.fillStyle = '#9fb4c0';
  A.fillRect(hx - 1, hy - 1, 2, 2);
  // flygvarningslampa på masten
  const bx = cx + ROOF.mast;
  const by = deck - 58;
  const on = rt % 2 < 0.22 || (rt % 2 > 0.4 && rt % 2 < 0.55);
  A.fillStyle = '#6a1a1a';
  A.fillRect(bx, by, 2, 2);
  if (on) {
    A.globalAlpha = 0.35 + 0.35 * Math.min(1, night + 0.3);
    A.fillStyle = '#ff3a3a';
    A.fillRect(bx - 2, by - 2, 6, 6);
    A.globalAlpha = 1;
    A.fillStyle = '#ffe0d0';
    A.fillRect(bx, by, 2, 2);
  }
  // solglimt över panelerna
  const gp = Math.floor(rt * 0.7) % 6;
  const ph = (rt * 0.7) % 1;
  if (ph < 0.45) {
    const row = gp % 2;
    const px = cx + ROOF.solar + (gp >> 1) * 22 + (row ? 4 : 0) + 6;
    const py = deck - (row ? 13 : 27) + 4;
    A.globalAlpha = Math.sin((ph / 0.45) * Math.PI);
    A.fillStyle = '#ffffff';
    A.fillRect(px, py, 2, 1);
    A.fillRect(px, py - 1, 1, 3);
    A.fillRect(px - 1, py, 4, 1);
    A.globalAlpha = 1;
  }
  // glansen över glasfasaden
  if (!(st && st.reduced)) glassGlint(A, cx, gy, L, rt);
  // gäster på takvåningen
  const px0 = cx + ROOF.pent;
  const pdeck = deck;
  GUESTS.forEach((g, i) => {
    const fr = rt === 0 ? 0 : Math.floor(rt * (g.pose === 'talk' ? 4 : 1.7) + i * 3);
    drawPerson(A, px0 + g.dx, pdeck, g.look, g.pose, fr, i === 1 ? -1 : 1, { t: rt, seated: g.seated, noShadow: true });
  });
  // glasets reflexer ovanpå gästerna
  for (const [fx, wd, a] of [[0.1, 4, 0.14], [0.52, 5, 0.12], [0.84, 3, 0.12]]) {
    A.fillStyle = '#ffffff';
    for (let r = 2; r < PENT_H - 2; r++) {
      A.globalAlpha = a;
      A.fillRect(Math.round(px0 + ROOF.pentW * fx + (PENT_H - r) * 0.5), pdeck - 3 - PENT_H + r, wd, 1);
    }
  }
  A.globalAlpha = 1;
  // revolvingdörren vid entrén: tre blad som snurrar (sidovy: x = cos)
  const rx0 = cx + VEST.x0 + 2 + 9;
  const ry = gy - FOUND;
  for (let b = 0; b < 3; b++) {
    const a = rt * 0.9 + (b * Math.PI * 2) / 3;
    const x = Math.round(rx0 + Math.cos(a) * 7);
    const depth = Math.sin(a);
    A.globalAlpha = depth > 0 ? 0.85 : 0.5;
    A.fillStyle = depth > 0 ? '#dff3f3' : '#8ab8b8';
    A.fillRect(x, ry - 35, 1, 32);
    A.globalAlpha = 1;
  }
  A.fillStyle = ST.mid;
  A.fillRect(rx0, ry - 36, 1, 33);
}

const ROOF_LIGHTS = (topY) => [
  { x: ROOF.sign, y: topY - 24, r: 70, i: 0.8, c: [1, 0.7, 0.4], kind: 1, pri: 1 },
  { x: ROOF.pent + ROOF.pentW / 2, y: topY - 20, r: 62, i: 0.95, c: [1, 0.82, 0.5], kind: 0, y0: topY - 34, y1: topY - 3, pri: 1 },
  { x: ROOF.pent + ROOF.pentW / 2, y: topY - 16, r: 52, i: 0.45, c: [1, 0.82, 0.5], kind: 1, pri: 2 },
  { x: -HALF - 12, y: -FOUND - 24, r: 40, i: 0.55, c: [1, 0.78, 0.5], kind: 1, pri: 2 },
  { x: -64, y: -FOUND - 36, r: 44, i: 0.6, c: [1, 0.55, 0.25], kind: 1, pri: 2 },
  { x: HALF + 2, y: topY + 70, r: 38, i: 0.45, c: [1, 0.5, 0.2], kind: 1, pri: 2 },
  { x: ROOF.solar + 34, y: topY - 14, r: 34, i: 0.2, c: [0.5, 0.7, 1], kind: 1, pri: 2 },
];

registerRoof('modern', {
  lights: (topY) => ROOF_LIGHTS(topY),
  anim: (topY) => ({
    bulbs: Array.from({ length: 9 }, (_, i) => ({ x: ROOF.pent + 8 + i * 12, y: topY - 31, c: i % 2 ? '#ffe9b0' : '#ffd08a', p: i * 1.7 })),
    neon: Array.from({ length: 4 }, (_, f) => [
      { x: -HALF + 1, y: -FOUND - f * PITCH - 47, w: 3, h: 10 },
      { x: HALF - 5, y: -FOUND - f * PITCH - 47, w: 3, h: 42 },
    ]).flat(),
  }),
  steam: [{ x: ROOF.vent + 2, dy: -28 }],
  facade,
  roof,
  dynamic: dynamicRoof,
});
