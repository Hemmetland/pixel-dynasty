import { shade } from '../core/util.js';
import { SKINS, HAIRS, SHIRTS, PANTS } from './pal.js';

// Ritar en person i profil mot höger. (x,y) = fötternas mittpunkt. dir=-1 speglar.
// pose: 'sit' | 'sitIdle' | 'stand' | 'walk' | 'cheer' | 'drink' | 'read' | 'sleep' | 'think'
const cache = new WeakMap();
function colors(look) {
  let c = cache.get(look);
  if (c) return c;
  const skin = SKINS[look.skin % SKINS.length];
  const shirt = SHIRTS[look.shirt % SHIRTS.length];
  const pants = PANTS[look.pants % PANTS.length];
  const hair = HAIRS[look.hairColor % HAIRS.length];
  c = {
    skin, skinSh: shade(skin, -0.16), skinHi: shade(skin, 0.1),
    shirt, shirtSh: shade(shirt, -0.22), shirtHi: shade(shirt, 0.15),
    pants, pantsSh: shade(pants, -0.25),
    hair, hairHi: shade(hair, 0.2), hairSh: shade(hair, -0.25),
  };
  cache.set(look, c);
  return c;
}

export function drawPerson(ctx, x, y, look, pose = 'stand', frame = 0, dir = 1, opts = {}) {
  const C = colors(look);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (dir < 0) ctx.scale(-1, 1);
  const R = (dx, dy, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(dx, dy, w, h);
  };
  const sit = pose === 'sit' || pose === 'sitIdle' || pose === 'read' || pose === 'sleep' || pose === 'think';
  const bob = pose === 'walk' && (frame === 1 || frame === 3) ? -1 : 0;
  const lean = pose === 'sit' ? 1 : 0;
  const headDown = pose === 'sleep' ? 2 : 0;

  // skugga
  if (!opts.noShadow) {
    ctx.globalAlpha = 0.22;
    R(-5, 0, 11, 1, '#000');
    ctx.globalAlpha = 1;
  }

  // ── Ben ──
  const shoe = '#1c1c28';
  if (sit) {
    R(-3, -10, 8, 3, C.pants); // lår
    R(-3, -7, 8, 1, C.pantsSh);
    R(3, -8, 3, 8, C.pants); // vad
    R(5, -8, 1, 7, C.pantsSh);
    R(3, -1, 5, 2, shoe);
  } else if (pose === 'walk') {
    const f = frame % 4;
    const sw = [0, 2, 0, -2][f];
    // bakre ben
    R(-1 - sw, -10 + bob, 3, 7, C.pantsSh);
    R(-1 - sw * 1.5, -3 + bob, 3, 2, C.pantsSh);
    R(-2 - sw * 1.5, -1, 4, 1, shoe);
    // främre ben
    R(-1 + sw, -10 + bob, 3, 7, C.pants);
    R(-1 + sw * 1.5, -3 + bob, 3, 2, C.pants);
    R(-1 + sw * 1.5, -1, 4, 1, shoe);
  } else {
    R(-3, -10, 3, 9, C.pantsSh);
    R(0, -10, 3, 9, C.pants);
    R(-3, -1, 4, 1, shoe);
    R(0, -1, 4, 1, shoe);
  }

  // ── Överkropp ──
  const ty = -19 + bob + (sit ? 1 : 0);
  const tx = -3 + (pose === 'sleep' ? 1 : 0);
  R(tx, ty, 7, 9, C.shirt);
  R(tx + 5, ty, 2, 9, C.shirtSh); // ryggsida mot kameran
  R(tx, ty + 7, 7, 2, C.shirtSh);
  R(tx, ty, 7, 1, C.shirtHi);
  if (look.acc === 5) R(tx + 1, ty + 1, 5, 3, '#f4f4ff'); // laboratorierock/skjorta (reserv)

  // ── Huvud ──
  const hx = -3 + lean + (pose === 'sleep' ? 3 : 0);
  const hy = ty - 9 + headDown;
  R(hx + 3, hy + 8, 2, 1, C.skinSh); // hals (fram)
  R(hx, hy + 1, 7, 7, C.skin);
  R(hx + 5, hy + 1, 2, 7, C.skinHi); // ljus på ansiktets framkant
  R(hx + 1, hy + 7, 6, 1, C.skinSh); // haka
  R(hx + 7, hy + 4, 1, 2, C.skin); // näsa
  R(hx - 1, hy + 4, 1, 2, C.skinSh); // öra
  // ögon
  const blink = opts.blink;
  if (pose === 'sleep') R(hx + 4, hy + 4, 2, 1, '#2a1a1a');
  else if (blink) R(hx + 4, hy + 4, 2, 1, '#2a1a1a');
  else {
    R(hx + 4, hy + 3, 1, 2, '#1a1626');
    R(hx + 3, hy + 3, 1, 1, '#f4f4ff');
  }
  if (pose === 'cheer' || pose === 'drink') R(hx + 4, hy + 6, 2, 1, '#8a3a3a');
  else R(hx + 5, hy + 6, 1, 1, C.skinSh);

  // hår
  const hc = C.hair;
  const st = look.hair % 7;
  if (st === 0) {
    R(hx - 1, hy, 9, 2, hc);
    R(hx - 1, hy + 2, 2, 4, hc);
    R(hx + 5, hy + 1, 2, 1, C.hairSh);
  } else if (st === 1) {
    R(hx, hy, 7, 1, hc);
    R(hx - 1, hy + 1, 2, 3, C.hairSh);
  } else if (st === 2) {
    R(hx - 1, hy, 9, 2, hc);
    R(hx - 2, hy + 2, 3, 9, hc);
    R(hx - 2, hy + 7, 3, 4, C.hairSh);
  } else if (st === 3) {
    R(hx - 1, hy, 8, 2, hc);
    R(hx - 1, hy + 2, 2, 3, hc);
    R(hx - 2, hy - 3, 4, 3, hc);
    R(hx - 1, hy - 3, 2, 1, C.hairHi);
  } else if (st === 4) {
    R(hx - 2, hy - 1, 10, 3, hc);
    R(hx - 2, hy + 2, 3, 4, hc);
    R(hx - 1, hy - 1, 2, 1, C.hairHi);
    R(hx + 3, hy - 1, 2, 1, C.hairHi);
  } else if (st === 5) {
    R(hx - 1, hy, 9, 1, hc);
    R(hx, hy - 2, 1, 2, hc);
    R(hx + 2, hy - 3, 1, 3, hc);
    R(hx + 4, hy - 2, 1, 2, hc);
    R(hx - 1, hy + 1, 2, 3, hc);
  } else {
    R(hx - 1, hy, 8, 2, hc);
    R(hx + 3, hy + 2, 4, 1, hc);
    R(hx - 1, hy + 2, 2, 4, hc);
  }
  // tillbehör
  if (look.acc === 1) {
    R(hx + 3, hy + 3, 5, 1, '#20242c');
    R(hx + 4, hy + 4, 3, 2, 'rgba(160,220,255,0.55)');
    R(hx + 3, hy + 3, 1, 1, '#20242c');
  } else if (look.acc === 2) {
    R(hx - 1, hy - 1, 9, 1, '#2a2e3c');
    R(hx - 1, hy, 1, 3, '#2a2e3c');
    R(hx - 2, hy + 3, 3, 4, '#e8504a');
  } else if (look.acc === 3) {
    R(hx - 1, hy - 1, 9, 3, '#e8504a');
    R(hx + 6, hy + 1, 3, 1, '#b83a34');
  } else if (look.acc === 4) {
    R(hx - 1, hy + 1, 9, 1, '#f2c84a');
  }

  // ── Armar ──
  const arm = (sx, sy, ex, ey, hand = true) => {
    // enkel tvåsegmentsarm: övre del ärm, underarm hud
    const mx = Math.round((sx + ex) / 2);
    const my = Math.round((sy + ey) / 2);
    R(Math.min(sx, mx), Math.min(sy, my), Math.abs(mx - sx) + 2, Math.abs(my - sy) + 2, C.shirtHi);
    R(Math.min(mx, ex), Math.min(my, ey), Math.abs(ex - mx) + 2, Math.abs(ey - my) + 2, C.skin);
    if (hand) R(ex, ey, 2, 2, C.skinSh);
  };
  const sy = ty + 1;
  if (pose === 'sit') {
    const k = frame % 2;
    arm(-1, sy, 5 + k, sy + 5 + (k ? 0 : 1));
  } else if (pose === 'sitIdle' || pose === 'think') {
    if (pose === 'think') arm(-1, sy, 4, sy - 3);
    else arm(-1, sy, 3, sy + 6);
  } else if (pose === 'read') {
    arm(-1, sy, 4, sy + 3);
    R(4, sy + 1, 5, 4, '#f4f0e4');
    R(4, sy + 1, 1, 4, '#c8643a');
    R(6, sy + 2, 2, 1, '#9aa4b8');
  } else if (pose === 'walk') {
    const f = frame % 4;
    const sw = [0, -2, 0, 2][f];
    arm(-1 + sw, sy + 1, 0 + sw * 1.5, sy + 7);
  } else if (pose === 'cheer') {
    const up = frame % 2 ? 1 : 0;
    arm(-1, sy, 2, sy - 7 - up);
    arm(1, sy, 4, sy - 6 + up);
  } else if (pose === 'drink') {
    arm(-1, sy, 4, sy + 1);
    R(4, sy - 1, 3, 4, '#f4f4ff');
    R(5, sy, 1, 1, '#6b4229');
  } else if (pose === 'sleep') {
    arm(-1, sy, 2, sy + 5);
  } else arm(-1, sy, 0, sy + 7);

  ctx.restore();
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
// Dataadress för en avatar (för HTML). pose: 'stand' | 'cheer' | 'sit'
export function avatarURL(look, scale = 3, pose = 'stand') {
  const key = JSON.stringify(look) + scale + pose;
  let u = avCache.get(key);
  if (!u) {
    const c = document.createElement('canvas');
    c.width = 24;
    c.height = 34;
    const g = c.getContext('2d');
    drawPerson(g, 11, 32, look, pose, 0, 1, { noShadow: true });
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
export const avatarImg = (look, scale = 3, pose = 'stand') => `<img class="avatar" src="${avatarURL(look, scale, pose)}" width="${24 * scale}" height="${34 * scale}" alt="" draggable="false">`;
