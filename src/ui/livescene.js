// Levande scener i fönstren: en liten pixelbild överst som visar att något händer. Skapa spel visar studion där utvecklarna
// jobbar (tangentbord, kaffe, tankebubblor, katten sover), Hårdvara visar labbet och fabriken (lödning, löpande band, robotarm,
// bärare med lådor). Personerna är studions egen personal med spelets figur. Allt ritas av tiden (inga tillstånd), så scenen
// överlever att fönstret ritas om. En enda timer ritar alla synliga scenbilder, och den står still när fönstret är dolt.
import { t } from './core.js';
import { drawPoseSprite } from '../render/charsprite.js';
import { drawPerson, POSE_FRAMES } from '../render/people.js';
import { drawEmote } from '../render/emotes.js';
import { drawCat } from '../render/props.js';
import * as F from '../render/furniture.js';
import * as V from '../render/props2.js';
import { labBench } from '../render/props.js';

const R = V.R;
const H = 56; // logisk höjd; bredden följer fönstret (3 skärmpixlar per pixel, 2 på smal skärm)
const CFG = {}; // senaste inställningarna per sort
const FALLBACK = [
  { skin: 1, hair: 3, hairColor: 2, shirt: 5, pants: 0, acc: 0, body: 0 },
  { skin: 2, hair: 1, hairColor: 1, shirt: 9, pants: 1, acc: 0, body: 0 },
  { skin: 0, hair: 5, hairColor: 4, shirt: 2, pants: 3, acc: 0, body: 0 },
  { skin: 3, hair: 2, hairColor: 0, shirt: 7, pants: 0, acc: 0, body: 0 },
  { skin: 1, hair: 4, hairColor: 5, shirt: 12, pants: 2, acc: 0, body: 0 },
];

// Bildens HTML. kind: 'studio' | 'factory'. extra: { color } (hårdvarans färg). Staben hämtas ur G.staff.
export function sceneHTML(kind, G, extra = {}) {
  const looks = (G.staff || []).map((s) => s.look).filter(Boolean);
  for (const l of FALLBACK) if (looks.length < 6) looks.push(l);
  CFG[kind] = { looks, n: Math.max(1, Math.min(5, (G.staff || []).length)), ...extra };
  start();
  const cap = kind === 'studio' ? t('ls.studio', { n: CFG[kind].n }) : t('ls.factory');
  return `<div class="ls ls-${kind}"><canvas class="ls-cv" data-ls="${kind}" width="200" height="${H}"></canvas><span class="ls-cap"><i></i>${cap}</span></div>`;
}

// ── Gemensamt ──
const frameOf = (pose, t_) => Math.floor(t_ * ({ type: 8, walk: 9, drink: 3, fix: 5, notes: 4, walkBox: 9, walkCup: 9, present: 3, stand: 0 }[pose] || 4)) % (POSE_FRAMES[pose] || 1);
function person(ctx, x, y, look, pose, tm, dir = 1, seated = false, off = 0) {
  if (drawPoseSprite(ctx, x, y, look, pose, tm + off, dir, seated)) return;
  drawPerson(ctx, x, y, look, pose, frameOf(pose, tm + off), dir, { t: tm, seated, noShadow: false });
}
const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
function steam(ctx, x, y, tm, n = 3, a = 0.5) {
  for (let i = 0; i < n; i++) {
    const p = (tm * 0.6 + i / n) % 1;
    ctx.globalAlpha = (1 - p) * a;
    ctx.fillStyle = '#ffffff';
    const s = 1 + Math.floor(p * 2);
    ctx.fillRect(Math.round(x + Math.sin(tm * 2 + i * 2) * 1.5 * p), Math.round(y - p * 14), s, s);
  }
  ctx.globalAlpha = 1;
}

// ── Studion ──
function drawStudio(ctx, W, tm, cfg) {
  const fy = H - 6;
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
  // plansch och kanbantavla
  F.kanban(ctx, W - 92, 7, 24, 16, 5);
  // golv
  R(ctx, 0, H - 11, W, 11, '#5a3d27');
  for (let x = -((tm * 0) | 0); x < W; x += 18) R(ctx, x, H - 11, 1, 11, '#47301e');
  R(ctx, 0, H - 11, W, 1, '#7a5636');
  R(ctx, 0, H - 6, W, 1, '#4c3320');
  // skrivbord och utvecklare
  const nd = Math.max(2, Math.min(cfg.n, Math.floor((W - 96) / 56)));
  const pitch = 56;
  const x0 = 10;
  for (let i = 0; i < nd; i++) {
    const dx = x0 + i * pitch;
    F.chair2(ctx, dx + 3, fy, ['#3a4a6a', '#6a3a4a', '#3a6a5a', '#5a4a7a'][i % 4]);
    F.desk2(ctx, dx + 3, fy, i % 5, i + 1, 2);
    // skärmen i profil lever: kodrader som rullar
    const sx = dx + 3 + 16;
    const sy = fy - 27;
    for (let r = 0; r < 4; r++) {
      const len = 2 + Math.floor(V.hash(Math.floor(tm * 2) * 7 + r * 3 + i * 11) * 5);
      R(ctx, sx, sy + r * 2, len, 1, ['#7cf2ff', '#ff7ab8', '#ffe27a', '#8aff9a'][(r + Math.floor(tm * 2) + i) % 4]);
    }
    const look = cfg.looks[i];
    const typing = Math.floor((tm + i * 3.1) / 6) % 4 !== 3; // då och då en paus då personen tänker
    person(ctx, dx + 3 + 3, fy, look, typing ? 'type' : 'think', tm, 1, true, i * 0.37);
  }
  // kaffehörnan
  const cx = W - 52;
  F.kitchenCounter(ctx, cx, fy, 42);
  F.espresso(ctx, cx + 8, fy - 16);
  steam(ctx, cx + 14, fy - 30, tm, 3, 0.45);
  // någon går efter kaffe: dörren, kaffemaskinen och tillbaka
  const walker = cfg.looks[Math.min(cfg.looks.length - 1, nd)];
  const cyc = 18;
  const k = tm % cyc;
  const wxA = x0 + nd * pitch - 4;
  const wxB = cx - 8;
  if (k < 5) person(ctx, lerp(wxA, wxB, k / 5), fy + 2, walker, 'walk', tm, 1);
  else if (k < 9) person(ctx, wxB, fy + 2, walker, 'drink', tm, 1);
  else if (k < 14) person(ctx, lerp(wxB, wxA, (k - 9) / 5), fy + 2, walker, 'walkCup', tm, -1);
  else person(ctx, wxA, fy + 2, walker, 'stand', tm, 1);
  // tankebubblor över skrivborden
  const era = Math.floor(tm / 5.5);
  const who = era % nd;
  const age = tm - era * 5.5;
  drawEmote(ctx, x0 + who * pitch + 8, fy - 31, ['bulb', 'coffee', 'heart', 'exclam', 'question', 'bulb'][era % 6], age, 2.4, tm);
  // katten sover vid kaffehörnan
  drawCat(ctx, cx - 18, fy + 3, 'sleep', Math.floor(tm * 1.5), 1, 0);
  // varmt ljus från taklamporna
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < nd; i++) {
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.moveTo(x0 + i * pitch + 14, 0);
    ctx.lineTo(x0 + i * pitch + 40, fy);
    ctx.lineTo(x0 + i * pitch - 10, fy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Labbet och fabriken ──
function drawBoxedItem(ctx, x, ty, p, col) {
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
    R(ctx, x, ty - 9, 12, 9, '#c49a62');
    R(ctx, x, ty - 9, 12, 1, '#dcb680');
    R(ctx, x + 5, ty - 9, 2, 9, '#e8dcc0');
    R(ctx, x + 1, ty - 5, 3, 3, col);
  }
}
function drawFactory(ctx, W, tm, cfg) {
  const fy = H - 6;
  const col = cfg.color || '#4de1d0';
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
  const label = 'HARDWARE';
  R(ctx, Math.round(W / 2 - 21), 3, 42, 12, '#0c1020');
  R(ctx, Math.round(W / 2 - 21), 3, 42, 1, '#3a4256');
  V.neonText(ctx, label, Math.round(W / 2 - 17), 6, '#ffffff', col, 1);
  // golv med varningslinje
  R(ctx, 0, H - 12, W, 12, '#363d4e');
  for (let x = -6 + (Math.floor(tm * 8) % 6) * 0; x < W; x += 6) {
    R(ctx, x, H - 12, 3, 2, '#f2c84a');
    R(ctx, x + 3, H - 12, 3, 2, '#1c212c');
  }
  R(ctx, 0, H - 4, W, 1, '#262c3a');
  // labbänken med lödaren
  labBench(ctx, 6, fy, 2);
  person(ctx, 6 + 44, fy + 1, cfg.looks[0], 'fix', tm, -1);
  if (Math.floor(tm * 7) % 4 < 2) {
    for (let i = 0; i < 4; i++) {
      const a = (tm * 9 + i * 1.7) % 1;
      R(ctx, Math.round(6 + 38 - a * 6 + Math.sin(i * 5) * 2), Math.round(fy - 15 - a * 5 + a * a * 10), 1, 1, i % 2 ? '#ffe27a' : '#ffffff');
    }
  }
  // löpande bandet
  const bx0 = 72;
  const bx1 = W - 78;
  const bw = Math.max(40, bx1 - bx0);
  const ty = fy - 9; // bandets ovansida
  R(ctx, bx0 - 3, ty, bw + 6, 4, '#2b3040');
  R(ctx, bx0 - 3, ty, bw + 6, 1, '#4a5268');
  for (let x = bx0; x < bx0 + bw; x++) if (((x + Math.floor(tm * 14)) % 6) < 3) R(ctx, x, ty + 1, 1, 2, '#3a4258');
  for (let x = bx0 + 4; x < bx0 + bw; x += 12) { R(ctx, x, ty + 4, 2, 5, '#4a5268'); R(ctx, x - 1, fy - 1, 4, 1, '#1c212c'); }
  const pace = 12;
  const gap = 32;
  const off = (tm * pace) % gap;
  for (let kx = -gap; kx < bw + gap; kx += gap) {
    const ix = bx0 + kx + off;
    if (ix < bx0 - 1 || ix > bx0 + bw - 10) continue;
    drawBoxedItem(ctx, Math.round(ix), ty, (ix - bx0) / bw, col);
  }
  // robotarmen vid mitten av bandet
  const rx = Math.round(bx0 + bw * 0.4);
  R(ctx, rx - 5, 22, 10, 3, '#4a5268');
  const sw = Math.sin(tm * 1.9);
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
  if (sw > 0.82 && Math.floor(tm * 20) % 2) {
    R(ctx, a1x - 1, a1y + 5, 3, 1, '#ffffff');
    R(ctx, a1x - 3 + Math.floor(V.hash(Math.floor(tm * 30)) * 6), a1y + 4, 1, 1, '#7cf2ff');
  }
  // kontrollpanel med blinkande lampor
  R(ctx, bx0 + bw - 20, ty - 20, 14, 12, '#2a3042');
  R(ctx, bx0 + bw - 19, ty - 19, 12, 5, '#0e1a30');
  R(ctx, bx0 + bw - 18, ty - 17, 6 + Math.floor(Math.sin(tm * 2) * 2 + 2), 1, '#8aff9a');
  for (let i = 0; i < 3; i++) R(ctx, bx0 + bw - 18 + i * 4, ty - 12, 2, 2, Math.floor(tm * 2 + i) % 3 === i ? '#ff6a6a' : '#3a4256');
  // någon kollar kvalitet, en annan bär lådor till lagret
  person(ctx, bx0 + 20, fy + 2, cfg.looks[1], 'notes', tm, 1, false, 0.5);
  F.boxes(ctx, W - 40, fy);
  F.boxes(ctx, W - 54, fy);
  F.boxes(ctx, W - 27, fy);
  const carrier = cfg.looks[2];
  const cyc = 12;
  const k = tm % cyc;
  const ax = bx0 + bw + 2;
  const bxx = W - 60;
  if (k < 5) person(ctx, lerp(ax, bxx, k / 5), fy + 2, carrier, 'walkBox', tm, 1);
  else if (k < 6) person(ctx, bxx, fy + 2, carrier, 'stand', tm, 1);
  else if (k < 11) person(ctx, lerp(bxx, ax, (k - 6) / 5), fy + 2, carrier, 'walk', tm, -1);
  else person(ctx, ax, fy + 2, carrier, 'stand', tm, 1);
  // vänd skylt över lagret
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

// ── Timer ──
let timer = 0;
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function tick() {
  if (typeof document === 'undefined' || document.hidden) return;
  const cvs = document.querySelectorAll('canvas.ls-cv');
  if (!cvs.length) return;
  const tm = reduced ? 3 : performance.now() / 1000;
  for (const cv of cvs) {
    const cw = cv.clientWidth;
    if (!cw) continue;
    const sc = cw >= 640 ? 3 : 2;
    const W = Math.max(120, Math.round(cw / sc));
    if (cv.width !== W) cv.width = W;
    const cfg = CFG[cv.dataset.ls];
    if (!cfg) continue;
    cv.style.height = H * sc + 'px';
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    if (cv.dataset.ls === 'studio') drawStudio(ctx, W, tm, cfg);
    else drawFactory(ctx, W, tm, cfg);
  }
}
function start() {
  if (timer || typeof setInterval === 'undefined') return;
  timer = setInterval(tick, reduced ? 1000 : 66);
  setTimeout(tick, 0);
}
