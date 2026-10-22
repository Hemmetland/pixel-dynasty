import { shade, mix, hex2rgb } from '../core/util.js';
import { SKINS, HAIRS, SHIRTS, PANTS, HATS, GEAR, SHOES, FRAMES } from './pal.js';

// Ritar en person i profil mot höger. (x,y) = fötternas mittpunkt. dir=-1 speglar. Figuren är ca 30 px hög.
// pose: 'sit' | 'sitIdle' | 'stand' | 'walk' | 'cheer' | 'drink' | 'read' | 'sleep' | 'think'
//     | 'type' | 'talk' | 'present' | 'laptop' | 'tired' | 'wave'   (okänd pose ritas som 'stand')
// frame: heltal, varvas per pose (se POSE_FRAMES). opts (alla valfria):
//   blink  – blunka nu            t     – tid i sekunder (andning, automatisk blinkning, ånga, svajande hår)
//   mood   – 0-100 (lågt = trött blick, högt = leende)       seated – sittande ben/kropp även i poser som annars står
//   noShadow
// look: { skin, hair, hairColor, shirt, pants, acc } + valfria hat, glasses, beard, headphones, backpack, hoodie, pattern.
export const POSE_FRAMES = {
  sit: 2, sitIdle: 2, stand: 2, walk: 4, cheer: 2, drink: 3, read: 2, sleep: 2, think: 2,
  type: 4, talk: 4, present: 4, laptop: 4, tired: 4, wave: 4,
};
export const POSES = Object.keys(POSE_FRAMES);
export const HAIR_STYLES = 14;
export const SEATED = new Set(['sit', 'sitIdle', 'read', 'sleep', 'think', 'type']);

const idx = (v, n) => (((v | 0) % n) + n) % n;
const lum = (c) => {
  const [r, g, b] = hex2rgb(c);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
const hashLook = (look, salt) => {
  let h = Math.imul(salt + 1, 2654435761) | 0;
  for (const k of ['skin', 'hair', 'hairColor', 'shirt', 'pants']) h = Math.imul(h ^ ((look[k] | 0) + 7), 16777619);
  return (h ^ (h >>> 15)) >>> 0;
};
const NATURAL_HAIR = [0, 1, 2, 3, 4, 5, 6, 9, 10, 13];

const cache = new WeakMap();
function colors(look) {
  let c = cache.get(look);
  if (c) return c;
  const skin = SKINS[idx(look.skin, SKINS.length)];
  const shirt = SHIRTS[idx(look.shirt, SHIRTS.length)];
  const pants = PANTS[idx(look.pants, PANTS.length)];
  const hairIdx = idx(look.hairColor, HAIRS.length);
  const hair = HAIRS[hairIdx];
  // nya fält; saknas alla räknas gamla acc-värden om (1 glasögon, 2 hörlurar, 3 keps, 4 pannband)
  const legacy = look.hat === undefined && look.glasses === undefined && look.headphones === undefined;
  const acc = look.acc | 0;
  let hat = legacy ? (acc === 3 ? 2 : acc === 4 ? 3 : 0) : look.hat | 0;
  const glasses = legacy ? (acc === 1 ? 1 : 0) : look.glasses | 0;
  const phones = legacy ? acc === 2 : !!look.headphones;
  let hatC = HATS[hashLook(look, 1) % HATS.length];
  if (hatC === shirt) hatC = HATS[(HATS.indexOf(hatC) + 3) % HATS.length];
  if (legacy) hatC = acc === 3 ? '#e8504a' : '#f2c84a';
  const beardBase = NATURAL_HAIR.includes(hairIdx) ? hair : '#3a2a1c';
  const light = lum(shirt) > 0.62;
  const shoe = SHOES[hashLook(look, 2) % SHOES.length];
  let gear = GEAR[hashLook(look, 3) % GEAR.length];
  if (gear === shirt) gear = GEAR[(GEAR.indexOf(gear) + 2) % GEAR.length];
  c = {
    skin, skinSh: shade(skin, -0.16), skinHi: shade(skin, 0.1), skinDk: shade(skin, -0.34),
    shirt, shirtSh: shade(shirt, -0.22), shirtHi: shade(shirt, 0.15),
    pants, pantsSh: shade(pants, -0.25), pantsHi: shade(pants, 0.12),
    hair, hairHi: shade(hair, 0.2), hairSh: shade(hair, -0.25),
    brow: lum(hair) > 0.55 ? shade(hair, -0.5) : shade(hair, -0.12),
    hat, hatC, hatSh: shade(hatC, -0.25), hatHi: shade(hatC, 0.22),
    glasses, glassC: glasses === 2 ? FRAMES[hashLook(look, 4) % FRAMES.length] : '#20242c',
    phones, phoneC: gear, phoneSh: shade(gear, -0.3), phoneHi: shade(gear, 0.25),
    beard: look.beard | 0, beardC: beardBase, beardSh: shade(beardBase, -0.25), stubble: mix(skin, beardBase, 0.5),
    hoodie: !!look.hoodie, backpack: !!look.backpack, pattern: look.pattern | 0,
    patC: light ? shade(shirt, -0.3) : mix(shirt, '#ffffff', 0.62),
    shoe, sole: lum(shoe) > 0.6 ? '#aab0c0' : shade(shoe, 0.28),
    gear, gearSh: shade(gear, -0.3), gearHi: shade(gear, 0.2),
    style: idx(look.hair, HAIR_STYLES),
    longSleeve: !!look.hoodie || (look.pattern | 0) === 3 || hashLook(look, 9) % 4 === 0,
    shorts: hashLook(look, 8) % 7 === 0,
    freckles: (hairIdx === 5 || hairIdx === 10) && look.beard !== 2 ? mix(skin, '#b0502a', 0.5) : null,
    earring: hashLook(look, 10) % 8 === 0,
    lanyard: !look.hoodie && !look.backpack && hashLook(look, 11) % 6 === 0,
    lanyardC: GEAR[hashLook(look, 12) % GEAR.length],
    flip: (hashLook(look, 5) % 5) === 0, // kepsen bakvänd
    pom: (hashLook(look, 6) & 1) === 1, // luva med tott
    ph: (hashLook(look, 7) % 628) / 100, // fasförskjutning för andning/blinkning
  };
  cache.set(look, c);
  return c;
}

// Frisyrer: [dx, dy, w, h, färg] relativt huvudet (hx,hy). Färg: 0 hår, 1 ljus, 2 skuggad. Kropp x 0-6, hy+1 är skallens översta rad.
const HAIR = [
  [[-1, 0, 9, 2, 0], [-1, 2, 2, 4, 0], [5, 1, 2, 1, 2], [1, 0, 3, 1, 1]], // 0 kort
  [[0, 0, 7, 1, 0], [-1, 1, 2, 3, 2], [2, 0, 2, 1, 1]], // 1 raspat
  [[-1, 0, 9, 2, 0], [-2, 2, 3, 9, 0], [-2, 7, 3, 4, 2], [-1, 1, 1, 8, 1], [5, 2, 2, 1, 0]], // 2 långt
  [[-1, 0, 8, 2, 0], [-1, 2, 2, 3, 0], [-2, -3, 4, 3, 0], [-1, -3, 2, 1, 1], [-2, -1, 4, 1, 2]], // 3 knut
  [[-3, -1, 11, 3, 0], [-3, 2, 4, 5, 0], [-2, -2, 8, 1, 0], [-1, -1, 2, 1, 1], [3, -1, 2, 1, 1], [-3, 4, 1, 1, 1], [0, 2, 1, 1, 2], [5, 0, 1, 1, 2]], // 4 afro
  [[-1, 0, 9, 1, 0], [0, -2, 2, 2, 0], [3, -3, 2, 3, 0], [5, -2, 2, 2, 0], [-1, 1, 2, 3, 0], [3, -3, 1, 1, 1], [7, 1, 1, 1, 0]], // 5 piggar
  [[-1, 0, 8, 2, 0], [3, 2, 4, 1, 0], [-1, 2, 2, 4, 0], [1, 0, 3, 1, 1], [3, 2, 1, 1, 2]], // 6 lugg
  [[-1, 0, 9, 2, 0], [-1, 2, 2, 3, 0], [1, 0, 3, 1, 1]], // 7 hästsvans (svansen läggs till i koden)
  [[-1, 0, 9, 2, 0], [-2, 2, 3, 7, 0], [-2, 6, 3, 3, 2], [4, 2, 3, 1, 0], [-1, 1, 1, 7, 1], [1, 0, 3, 1, 1]], // 8 page
  [[0, 0, 7, 1, 2], [0, -1, 7, 2, 0], [1, -2, 5, 1, 0], [2, -3, 3, 1, 0], [-1, 1, 2, 3, 2], [2, -1, 2, 1, 1]], // 9 mohawk
  [[-1, 2, 2, 4, 0], [0, 1, 2, 1, 0], [-1, 1, 1, 1, 2], [2, 1, 2, 1, 4]], // 10 flint (kal, 4 = glans)
  [[-1, 0, 9, 2, 0], [0, -1, 2, 1, 0], [3, -1, 3, 1, 0], [6, -1, 1, 1, 0], [-2, 1, 3, 5, 0], [-2, 3, 1, 1, 1], [0, 0, 1, 1, 1], [4, 0, 1, 1, 1], [-2, 5, 1, 1, 2]], // 11 lockigt
  [[-1, 0, 8, 2, 0], [2, -1, 6, 1, 0], [3, -2, 5, 1, 0], [4, -3, 3, 1, 0], [-1, 2, 2, 3, 2], [4, -2, 1, 1, 1], [3, 0, 3, 1, 1]], // 12 tuppkam
  [[-1, 0, 9, 2, 0], [-1, 2, 2, 3, 0], [1, 0, 3, 1, 1]], // 13 flätan (flätan läggs till i koden)
];

export function drawPerson(ctx, x, y, look, pose = 'stand', frame = 0, dir = 1, opts = {}) {
  opts = opts || {};
  if (!Object.prototype.hasOwnProperty.call(POSE_FRAMES, pose)) pose = 'stand';
  const C = colors(look);
  const nf = POSE_FRAMES[pose];
  const f = (((frame | 0) % nf) + nf) % nf;
  const t = opts.t;
  const seated = SEATED.has(pose) || !!opts.seated;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (dir < 0) ctx.scale(-1, 1);
  const R = (dx, dy, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(dx, dy, w, h);
  };
  // linje med 2x2-pensel (armar, ben)
  const line = (x0, y0, x1, y1, c, w = 2) => {
    ctx.fillStyle = c;
    if (x0 === x1 || y0 === y1) {
      ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) + w, Math.abs(y1 - y0) + w);
      return;
    }
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), w, w);
  };
  const breath = t != null ? (Math.sin(t * 2.4 + C.ph) > 0.2 ? 1 : 0) : f % 2;

  // ── Hållning per pose (rig) ──
  const rig = { legs: seated ? 'sit' : 'stand', lf: 0, bob: 0, dty: 0, dtx: 0, hdx: 0, hdy: 0, eyes: 'open', mouth: 'flat', near: null, far: null, prop: null, lean: 0 };
  const arm = (e, w) => ({ e, w });
  switch (pose) {
    case 'stand':
      rig.dty = breath;
      rig.near = arm([0, 4], [1, 7]);
      rig.far = arm([2, 4], [3, 7]);
      break;
    case 'walk':
    case 'laptop': {
      if (pose === 'laptop' && seated) {
        rig.eyes = 'down';
        rig.hdy = 1;
        rig.near = arm([1, 5], [5, 6]);
        rig.far = arm([3, 5], [7, 6]);
        rig.prop = 'laptop';
        break;
      }
      rig.legs = 'walk';
      rig.lf = f;
      rig.bob = f % 2 ? 0 : -1;
      const a = [0, -1, 0, 1][f];
      if (pose === 'walk') {
        rig.near = a < 0 ? arm([-1, 4], [-2, 7]) : a > 0 ? arm([2, 4], [4, 6]) : arm([0, 4], [1, 7]);
        rig.far = a < 0 ? arm([3, 4], [5, 6]) : a > 0 ? arm([-1, 4], [-2, 7]) : arm([1, 4], [2, 7]);
      } else {
        rig.eyes = 'down';
        rig.near = arm([0, 5], [4, 4]);
        rig.far = arm([3, 4], [6, 4]);
        rig.prop = 'laptop';
        rig.hdy = 1;
      }
      break;
    }
    case 'sit':
      rig.lean = 1;
      rig.near = arm([2, 4], [6 + (f ? 1 : 0), 5 + (f ? 0 : 1)]);
      break;
    case 'type': {
      rig.lean = 1;
      rig.hdy = f % 2;
      rig.eyes = 'down';
      const a = f % 2;
      rig.near = arm([2, 4], [6 + a, 4 + (a ? 0 : 2)]);
      rig.far = arm([4, 4], [8 + (1 - a), 4 + (a ? 2 : 0)]);
      break;
    }
    case 'sitIdle':
      rig.dty = breath;
      rig.near = arm([1, 4], [4, 7]);
      break;
    case 'think':
      rig.hdy = -1;
      rig.eyes = 'up';
      rig.near = arm([2, 4], [5, f ? -3 : -2]);
      rig.mouth = f ? 'o' : 'flat';
      break;
    case 'read':
      rig.eyes = 'down';
      rig.hdy = 1;
      rig.near = arm([1, 3], [4, 4]);
      rig.prop = 'book';
      break;
    case 'sleep':
      rig.dtx = 1;
      rig.hdx = 3;
      rig.hdy = 2 + breath;
      rig.eyes = 'closed';
      rig.mouth = breath ? 'o' : 'flat';
      rig.near = arm([1, 3], [3, 6]);
      break;
    case 'cheer':
      if (f && !seated) rig.bob = -2;
      if (f && !seated) rig.legs = 'hop';
      rig.eyes = 'happy';
      rig.mouth = 'grin';
      rig.near = arm([6, -1], [7, f ? -12 : -11]);
      rig.far = arm([-4, -2], [-5, f ? -9 : -11]);
      break;
    case 'drink':
      rig.dty = f === 2 ? 0 : breath;
      rig.near = f === 0 ? arm([2, 4], [4, 3]) : f === 1 ? arm([2, 4], [4, 1]) : arm([2, 3], [4, -1]);
      rig.prop = 'mug';
      if (f === 2) {
        rig.hdy = -1;
        rig.hdx = 0;
        rig.eyes = 'closed';
      }
      break;
    case 'talk': {
      rig.dty = f % 2;
      rig.hdy = f === 1 ? 1 : 0;
      rig.mouth = ['open', 'half', 'open', 'flat'][f];
      rig.near = [arm([3, 4], [6, 3]), arm([3, 3], [7, 0]), arm([3, 4], [6, 2]), arm([2, 4], [4, 6])][f];
      rig.far = f === 2 ? arm([4, 3], [8, 3]) : arm([2, 4], [3, 7]);
      break;
    }
    case 'present': {
      rig.dtx = 1;
      rig.mouth = ['open', 'half', 'open', 'flat'][f];
      rig.near = arm([4, 1], [8 + (f === 2 ? 1 : 0), -3 + (f === 1 ? 1 : 0)]);
      rig.far = arm([-1, 5], [2, 7]);
      rig.prop = 'pointer';
      break;
    }
    case 'tired':
      rig.dtx = -1;
      rig.dty = 1;
      rig.hdx = f < 2 ? 2 : 1;
      rig.hdy = f === 0 ? 2 : f === 1 ? 3 : f === 2 ? 1 : 0;
      rig.eyes = f === 0 ? 'half' : 'closed';
      rig.mouth = f === 2 ? 'half' : f === 3 ? 'yawn' : f === 1 ? 'o' : 'flat';
      rig.near = f >= 2 ? arm([3, 3], [5, -3]) : arm([0, 4], [1, 8]);
      rig.far = arm([2, 4], [3, 8]);
      break;
    case 'wave': {
      rig.dty = f % 2 ? 0 : 1;
      rig.eyes = 'happy';
      rig.mouth = 'smile';
      const w = [-1, 1, -1, 1][f];
      rig.near = arm([6, 0], [7 + w, -7]);
      rig.far = arm([2, 4], [3, 7]);
      break;
    }
    default:
  }
  // humör påverkar neutral min
  if (opts.mood != null && rig.eyes === 'open' && rig.mouth === 'flat') {
    if (opts.mood < 30) rig.eyes = 'half';
    else if (opts.mood > 85) rig.mouth = 'smile';
  }
  if (rig.eyes === 'open') {
    const bl = opts.blink != null ? opts.blink : t != null && (t * 1.1 + C.ph) % 4 < 0.12;
    if (bl) rig.eyes = 'blink';
  }

  const sit = rig.legs === 'sit';
  const ty = -19 + rig.bob + (sit ? 1 : 0) + rig.dty;
  const tx = -3 + rig.dtx;
  const hx = tx + rig.hdx + (rig.lean || 0);
  const hy = ty - 9 + rig.hdy;
  const sx = tx + 2; // axelled (nära arm)
  const sy = ty + 1;

  // skugga
  if (!opts.noShadow) {
    ctx.globalAlpha = 0.22;
    R(-5, 0, 11, 1, '#000');
    ctx.globalAlpha = 1;
  }

  // armritning: övre del ärm, underarm hud (eller ärm), hand
  const drawArm = (a, far) => {
    const sl = far ? C.shirtSh : C.shirtHi;
    const sk = far ? C.skinSh : C.skin;
    const ex = sx + a.e[0];
    const ey = sy + a.e[1];
    const wx = sx + a.w[0];
    const wy = sy + a.w[1];
    line(sx, sy, ex, ey, sl);
    line(ex, ey, wx, wy, C.longSleeve ? sl : sk);
    if (C.longSleeve) R(wx, wy, 2, 1, C.shirtSh); // muddkant
    R(wx, wy + (C.longSleeve ? 1 : 0), 2, 2, sk);
    return [wx, wy];
  };

  // ── Bakre arm och ryggsäck (bakom kroppen) ──
  if (rig.far) drawArm(rig.far, true);
  if (C.backpack && !sit) {
    R(tx - 3, ty + 1, 3, 8, C.gear);
    R(tx - 3, ty + 1, 3, 2, C.gearHi);
    R(tx - 3, ty + 7, 3, 2, C.gearSh);
    R(tx - 2, ty + 4, 1, 2, C.gearSh);
  }

  // ── Ben ──
  const shoeAt = (sxp, syp, w = 4) => {
    R(sxp, syp, w, 1, C.shoe);
    R(sxp, syp + 1, w, 1, C.sole);
  };
  if (sit) {
    R(-3, -10, 8, 3, C.pants); // lår
    R(-3, -8, 8, 1, C.pantsSh);
    R(-3, -10, 8, 1, C.pantsHi);
    R(3, -8, 3, 7, C.shorts ? C.skin : C.pants); // vad
    R(5, -8, 1, 7, C.shorts ? C.skinSh : C.pantsSh);
    R(3, -2, 5, 1, C.shoe);
    R(3, -1, 5, 1, C.sole);
  } else if (rig.legs === 'walk') {
    // f0/f2: passande ben (ett ben böjt framåt), f1/f3: steg (främre benet framåt, bakre bakåt)
    const leg = (c, kx, fx, fy) => {
      const sc = C.shorts ? (c === C.pants ? C.skin : C.skinSh) : c; // bara vaden bara med shorts
      if (kx == null) {
        line(-1, -10 + rig.bob, fx, fy, c, 3);
        if (C.shorts) line(Math.round(-1 + (fx + 1) * 0.55), -6 + rig.bob, fx, fy, sc, 3);
      } else {
        line(-1, -10 + rig.bob, kx, -6 + rig.bob, c, 3);
        line(kx, -6 + rig.bob, fx, fy, sc, 3);
      }
      shoeAt(fx - 1 + (fx > 0 ? 1 : 0), fy + 1);
    };
    const F = rig.lf;
    // bakre ben (mörkare) först, främre ben över
    if (F === 0) leg(C.pantsSh, null, -1, -3);
    else if (F === 1) leg(C.pantsSh, null, -4, -3);
    else if (F === 2) leg(C.pantsSh, 1, -3, -5);
    else leg(C.pantsSh, null, 2, -3);
    if (F === 0) leg(C.pants, 1, -3, -5);
    else if (F === 1) leg(C.pants, null, 2, -3);
    else if (F === 2) leg(C.pants, null, -1, -3);
    else leg(C.pants, null, -4, -3);
  } else if (rig.legs === 'hop') {
    R(-4, -9, 3, 7, C.pantsSh);
    R(1, -9, 3, 7, C.pants);
    if (C.shorts) {
      R(-4, -5, 3, 3, C.skinSh);
      R(1, -5, 3, 3, C.skin);
    }
    shoeAt(-5, -3);
    shoeAt(1, -3);
  } else {
    R(-3, -10, 3, 8, C.pantsSh);
    R(0, -10, 3, 8, C.pants);
    R(-3, -10, 6, 1, C.pantsHi);
    if (C.shorts) {
      R(-3, -6, 3, 4, C.skinSh);
      R(0, -6, 3, 4, C.skin);
    }
    shoeAt(-3, -2);
    shoeAt(0, -2);
  }

  // ── Överkropp ──
  R(tx, ty, 7, 9, C.shirt);
  if (C.pattern === 1) for (let r = 1; r < 8; r += 2) R(tx, ty + r, 7, 1, C.patC);
  else if (C.pattern === 3) {
    ctx.globalAlpha = 0.28;
    R(tx + 1, ty, 1, 9, '#000');
    R(tx + 4, ty, 1, 9, '#000');
    R(tx, ty + 2, 7, 1, '#000');
    R(tx, ty + 6, 7, 1, '#000');
    ctx.globalAlpha = 0.22;
    R(tx + 2, ty, 1, 9, '#fff');
    R(tx, ty + 4, 7, 1, '#fff');
    ctx.globalAlpha = 1;
  } else if (C.pattern === 2) {
    R(tx + 2, ty + 2, 3, 3, C.gear); // logga på bröstet
    R(tx + 3, ty + 3, 1, 1, C.shirt);
  }
  if (look.acc === 5) R(tx + 1, ty + 1, 5, 3, '#f4f4ff'); // laboratorierock/skjorta (reserv)
  ctx.globalAlpha = 0.24;
  R(tx + 5, ty, 2, 9, '#0a0a1e');
  R(tx, ty + 7, 7, 2, '#0a0a1e');
  ctx.globalAlpha = 0.16;
  R(tx, ty, 7, 1, '#fff');
  ctx.globalAlpha = 1;
  if (C.hoodie) {
    R(tx - 1, ty - 1, 5, 3, C.shirtHi); // huvan bunten bakom nacken
    R(tx - 1, ty + 1, 5, 1, C.shirtSh);
    R(tx + 3, ty - 1, 1, 1, C.skinSh);
    R(tx + 2, ty + 5, 4, 2, C.shirtSh); // ficka
    R(tx + 2, ty + 5, 4, 1, C.shirtHi);
    R(tx + 4, ty + 1, 1, 3, '#e8e8f0'); // snören
    R(tx + 6, ty + 1, 1, 2, '#e8e8f0');
  }
  if (C.lanyard) {
    R(tx + 4, ty, 1, 5, C.lanyardC); // passerkort i band
    R(tx + 4, ty + 5, 2, 2, '#f4f4ff');
    R(tx + 4, ty + 5, 2, 1, C.lanyardC);
  }
  if (C.backpack) {
    R(tx + 4, ty, 1, 6, C.gearSh); // axelrem
    R(tx + 1, ty + 5, 4, 1, C.gearSh);
  }

  // ── Huvud ──
  R(hx + 3, hy + 8, 2, 1, C.skinSh); // hals
  R(hx, hy + 1, 7, 7, C.skin);
  R(hx + 5, hy + 1, 2, 7, C.skinHi); // ljus på ansiktets framkant
  R(hx + 1, hy + 7, 6, 1, C.skinSh); // haka
  R(hx + 7, hy + 4, 1, 2, C.skin); // näsa
  R(hx + 7, hy + 5, 1, 1, C.skinSh);
  R(hx + 1, hy + 4, 1, 2, C.skinSh); // öra

  // skägg
  if (C.beard === 1) {
    R(hx + 1, hy + 6, 6, 2, C.stubble);
    R(hx + 4, hy + 5, 3, 1, C.stubble);
  } else if (C.beard === 2) {
    R(hx, hy + 5, 7, 3, C.beardC);
    R(hx + 3, hy + 8, 4, 1, C.beardC);
    R(hx + 7, hy + 5, 1, 1, C.beardC);
    R(hx, hy + 7, 7, 1, C.beardSh);
    R(hx + 2, hy + 5, 3, 1, C.beardSh);
  }
  if (C.freckles) {
    R(hx + 3, hy + 5, 1, 1, C.freckles);
    R(hx + 5, hy + 5, 1, 1, C.freckles);
  }
  if (C.earring) R(hx + 1, hy + 6, 1, 1, '#f2c84a');
  // mun
  const mc = C.beard === 2 ? C.beardSh : C.skinDk;
  switch (rig.mouth) {
    case 'smile':
      R(hx + 4, hy + 6, 3, 1, C.beard === 2 ? mc : '#8a3a3a');
      break;
    case 'grin':
      R(hx + 4, hy + 6, 3, 2, '#5a1e2a');
      R(hx + 4, hy + 6, 3, 1, '#f4f4ff');
      break;
    case 'open':
      R(hx + 5, hy + 6, 2, 2, '#5a1e2a');
      R(hx + 5, hy + 7, 2, 1, '#c8504a');
      break;
    case 'half':
      R(hx + 5, hy + 6, 2, 1, '#5a1e2a');
      break;
    case 'o':
      R(hx + 5, hy + 6, 1, 1, '#5a1e2a');
      break;
    case 'yawn':
      R(hx + 5, hy + 5, 2, 3, '#5a1e2a');
      R(hx + 5, hy + 7, 2, 1, '#c8504a');
      break;
    default:
      R(hx + 5, hy + 6, 1, 1, mc);
  }
  // ögon
  const ink = '#1a1626';
  switch (rig.eyes) {
    case 'blink':
    case 'closed':
      R(hx + 4, hy + 4, 2, 1, '#2a1a1a');
      break;
    case 'happy':
      R(hx + 4, hy + 4, 1, 1, ink);
      R(hx + 5, hy + 3, 1, 1, ink);
      R(hx + 6, hy + 4, 1, 1, ink);
      R(hx + 4, hy + 5, 2, 1, 'rgba(255,110,110,0.4)');
      break;
    case 'half':
      R(hx + 4, hy + 3, 2, 1, C.skinSh);
      R(hx + 4, hy + 4, 1, 1, '#f4f4ff');
      R(hx + 5, hy + 4, 1, 1, ink);
      R(hx + 4, hy + 5, 2, 1, 'rgba(110,70,150,0.38)');
      break;
    case 'up':
      R(hx + 4, hy + 3, 1, 1, '#f4f4ff');
      R(hx + 5, hy + 3, 1, 1, ink);
      R(hx + 4, hy + 4, 2, 1, C.skin);
      break;
    case 'down':
      R(hx + 4, hy + 3, 2, 1, C.skinSh);
      R(hx + 4, hy + 4, 1, 1, '#f4f4ff');
      R(hx + 5, hy + 4, 1, 1, ink);
      break;
    default:
      R(hx + 4, hy + 3, 1, 2, '#f4f4ff');
      R(hx + 5, hy + 3, 1, 2, ink);
      if (!C.glasses) R(hx + 4, hy + 2, 2, 1, C.brow);
  }

  // glasögon
  if (C.glasses === 1) {
    const g = C.glassC;
    R(hx + 4, hy + 2, 2, 1, g);
    R(hx + 4, hy + 5, 2, 1, g);
    R(hx + 3, hy + 3, 1, 2, g);
    R(hx + 6, hy + 3, 1, 2, g);
    R(hx + 1, hy + 3, 2, 1, g);
    R(hx + 4, hy + 3, 2, 2, 'rgba(190,230,255,0.28)');
  } else if (C.glasses === 2) {
    const g = C.glassC;
    R(hx + 3, hy + 2, 4, 1, g);
    R(hx + 3, hy + 5, 4, 1, g);
    R(hx + 3, hy + 3, 1, 2, g);
    R(hx + 6, hy + 3, 1, 2, g);
    R(hx + 1, hy + 3, 2, 1, g);
    R(hx + 4, hy + 3, 2, 2, 'rgba(190,230,255,0.28)');
  } else if (C.glasses === 3) {
    R(hx + 3, hy + 3, 4, 3, '#14161e');
    R(hx + 1, hy + 3, 2, 1, '#14161e');
    R(hx + 4, hy + 3, 1, 1, '#5a6a8a');
  }

  // hår
  const hair = HAIR[C.style];
  const hatted = C.hat === 1 || C.hat === 2;
  const hc = [C.hair, C.hairHi, C.hairSh, C.hair, C.skinHi];
  const sway = t != null ? Math.round(Math.sin(t * 2 + C.ph)) : f % 2 ? -1 : 0;
  for (const [dx, dy, w, h, k] of hair) {
    let yy = dy;
    let hh = h;
    if (hatted && yy < 2) {
      hh -= 2 - yy;
      yy = 2;
      if (hh <= 0) continue;
    }
    R(hx + dx, hy + yy, w, hh, hc[k]);
  }
  if (C.style === 7) {
    // hästsvans med resår, svajar
    R(hx - 3, hy + 1, 2, 2, C.hair);
    R(hx - 2, hy + 1, 1, 1, '#e8504a');
    R(hx - 4 + sway, hy + 3, 2, 5, C.hair);
    R(hx - 4 + sway, hy + 6, 2, 2, C.hairSh);
  } else if (C.style === 13) {
    // fläta
    R(hx - 2, hy + 3, 2, 2, C.hair);
    R(hx - 3 + sway, hy + 5, 2, 2, C.hairSh);
    R(hx - 3 + sway, hy + 7, 2, 2, C.hair);
    R(hx - 3 + sway, hy + 9, 2, 1, C.hairSh);
    R(hx - 3 + sway, hy + 10, 2, 1, '#e8504a');
  }

  // mössor och kepsar
  if (C.hat === 1) {
    R(hx, hy - 2, 7, 1, C.hatC);
    R(hx - 1, hy - 1, 9, 2, C.hatC);
    R(hx - 1, hy + 1, 9, 1, C.hatHi);
    R(hx + 1, hy - 1, 1, 2, C.hatSh);
    R(hx + 3, hy - 1, 1, 2, C.hatSh);
    R(hx + 5, hy - 1, 1, 2, C.hatSh);
    if (C.pom) R(hx + 2, hy - 4, 3, 2, C.hatHi);
  } else if (C.hat === 2) {
    R(hx - 1, hy - 1, 8, 3, C.hatC);
    R(hx, hy - 1, 3, 1, C.hatHi);
    R(hx + 3, hy - 2, 1, 1, C.hatHi);
    if (C.flip) {
      R(hx - 4, hy + 1, 4, 1, C.hatSh);
      R(hx - 1, hy + 1, 8, 1, C.hatSh);
    } else {
      R(hx - 1, hy + 1, 8, 1, C.hatSh);
      R(hx + 6, hy + 1, 4, 1, C.hatSh);
      R(hx + 7, hy, 2, 1, C.hatC);
    }
  } else if (C.hat === 3) {
    R(hx - 1, hy + 1, 9, 1, C.hatC);
    R(hx - 3, hy + 1, 2, 1, C.hatC);
    R(hx - 3 + (sway < 0 ? -1 : 0), hy + 2, 1, 2, C.hatSh);
  }
  // hörlurar
  if (C.phones) {
    R(hx + 1, hy - 1, 5, 1, C.phoneSh);
    R(hx + 1, hy, 1, 3, C.phoneSh);
    R(hx, hy + 3, 3, 4, C.phoneSh);
    R(hx, hy + 3, 3, 3, C.phoneC);
    R(hx, hy + 3, 2, 1, C.phoneHi);
    R(hx + 3, hy + 4, 1, 2, C.phoneSh);
  }

  // ── Främre arm ──
  if (rig.near) {
    const [wx, wy] = drawArm(rig.near, false);
    // rekvisita i handen
    if (rig.prop === 'mug') {
      const my = wy - 3 + (rig.near.w[1] < 0 ? -1 : 0);
      R(wx + 1, my + 1, 3, 3, '#f4f4ff');
      R(wx + 1, my + 1, 3, 1, '#6b4229');
      R(wx + 4, my + 2, 1, 1, '#f4f4ff');
      for (let i = 0; i < 2; i++) {
        const ph = ((t != null ? t * 0.9 : f * 0.37) + i * 0.5) % 1;
        ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - ph)})`;
        ctx.fillRect(wx + 2 + (i ? 1 : 0) + (ph > 0.5 ? (i ? -1 : 1) : 0), Math.round(my - 1 - ph * 4), 1, 1);
      }
    } else if (rig.prop === 'book') {
      R(wx, wy - 2, 5, 4, '#f4f0e4');
      R(wx, wy - 2, 1, 4, '#c8643a');
      R(wx + 2, wy - 1, 2, 1, '#9aa4b8');
      if (f) R(wx + 2, wy - 3, 3, 1, '#f4f0e4');
    } else if (rig.prop === 'laptop') {
      R(wx - 1, wy + 1, 7, 1, '#aab4c8');
      R(wx - 1, wy + 2, 7, 1, '#6a7488');
      R(wx + 5, wy - 4, 1, 5, '#c8d0e0');
      R(wx + 5, wy - 4, 1, 1, '#7cf2ff');
    } else if (rig.prop === 'pointer') {
      line(wx + 1, wy, wx + 4, wy - 3, '#c8d0e0', 1);
      R(wx + 5, wy - 4, 1, 1, f % 2 ? '#ff6a6a' : '#ffd0d0');
    }
  }

  ctx.restore();
}

// Utseendets huvudfärger (för sprites som färgbyts efter personen, se charsprite.js). hat är null utan huvudbonad.
export function lookColors(look) {
  const C = colors(look);
  return { skin: C.skin, shirt: C.shirt, pants: C.pants, hair: C.hair, hat: C.hat ? C.hatC : null, shoe: C.shoe, hatted: C.hat === 1 || C.hat === 2, style: C.style };
}

// Förhandsgranskning (för UI): ritar en person i liten canvas.
export function personCanvas(look, scale = 4, pose = 'stand') {
  const c = document.createElement('canvas');
  c.width = 22;
  c.height = 34;
  const g = c.getContext('2d');
  drawPerson(g, 10, 32, look, pose, 0, 1, { noShadow: true });
  c.style.width = c.width * scale + 'px';
  c.style.height = c.height * scale + 'px';
  c.style.imageRendering = 'pixelated';
  return c;
}

const avCache = new Map();
// Dataadress för en avatar (för HTML). pose: 'stand' | 'cheer' | 'sit' | valfri annan pose; frame och opts (t.ex. { mood }) valfria
export function avatarURL(look, scale = 3, pose = 'stand', frame = 0, opts = null) {
  const key = JSON.stringify(look) + scale + pose + frame + (opts ? JSON.stringify(opts) : '');
  let u = avCache.get(key);
  if (!u) {
    const c = document.createElement('canvas');
    c.width = 24;
    c.height = 34;
    const g = c.getContext('2d');
    drawPerson(g, 11, 32, look, pose, frame, 1, { ...opts, noShadow: true });
    const o = document.createElement('canvas');
    o.width = 24 * scale;
    o.height = 34 * scale;
    const og = o.getContext('2d');
    og.imageSmoothingEnabled = false;
    og.drawImage(c, 0, 0, o.width, o.height);
    u = o.toDataURL();
    avCache.set(key, u);
  }
  return u;
}
export const avatarImg = (look, scale = 3, pose = 'stand', frame = 0, opts = null) => `<img class="avatar" src="${avatarURL(look, scale, pose, frame, opts)}" width="${24 * scale}" height="${34 * scale}" alt="" draggable="false">`;
