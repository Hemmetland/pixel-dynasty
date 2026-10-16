import { TOPIC } from '../data/topics.js';
import { GENRE } from '../data/genres.js';
import { PLATFORM } from '../data/platforms.js';
import { glyphCanvas } from './glyphs.js';
import { drawText } from './font.js';
import { hex2rgb, lerp, shade } from '../core/util.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const cache = new Map();

function rng32(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

// Genererad pixelart-förpackning (48×64). spec: { id, title, topic, genre, platform }
export function coverCanvas(spec, scale = 3) {
  const W = 48;
  const H = 64;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const tp = TOPIC[spec.topic];
  const ge = GENRE[spec.genre];
  const r = rng32((spec.id || 1) * 7919 + 13);
  // bakgrund med dither
  const a = hex2rgb(tp.c1);
  const b = hex2rgb(tp.c2);
  const img = g.createImageData(W, H);
  const N = 9;
  for (let y = 0; y < H; y++) {
    const v = (y / (H - 1)) * N;
    const b0 = Math.min(N - 1, Math.floor(v));
    const fr = v - b0;
    for (let x = 0; x < W; x++) {
      const t = (fr > BAYER[(y & 3) * 4 + (x & 3)] ? b0 + 1 : b0) / N;
      const i = (y * W + x) * 4;
      img.data[i] = lerp(a[0], b[0], t);
      img.data[i + 1] = lerp(a[1], b[1], t);
      img.data[i + 2] = lerp(a[2], b[2], t);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // genre-bakgrund
  const hz = 40;
  g.fillStyle = 'rgba(0,0,0,0.28)';
  if (['adventure', 'rpg', 'simulation'].includes(spec.genre)) {
    g.fillStyle = shade(tp.c2, -0.1);
    let x = 0;
    while (x < W) {
      const w = 6 + Math.floor(r() * 10);
      const h = 6 + Math.floor(r() * 12);
      for (let i = 0; i < h; i++) g.fillRect(x + Math.floor(i / 2), hz - i, Math.max(1, w - i), 1);
      x += w - 3;
    }
    g.fillStyle = shade(tp.c2, -0.35);
    g.fillRect(0, hz, W, H - hz);
  } else if (spec.genre === 'racing') {
    g.fillStyle = 'rgba(0,0,0,0.55)';
    for (let y = hz - 8; y < H; y++) {
      const w = 2 + (y - (hz - 8)) * 1.1;
      g.fillRect(Math.round(W / 2 - w / 2), y, Math.round(w), 1);
    }
    g.fillStyle = 'rgba(255,255,255,0.7)';
    for (let y = hz - 6; y < H; y += 5) g.fillRect(W / 2 - 1, y, 1, 3);
  } else if (['strategy'].includes(spec.genre)) {
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = hz - 10; y < H; y += 6) g.fillRect(0, y, W, 1);
    for (let x = 0; x < W; x += 8) g.fillRect(x, hz - 10, 1, H);
  } else if (spec.genre === 'casual') {
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(255,255,255,${0.12 + r() * 0.2})`;
      const s = 2 + Math.floor(r() * 5);
      g.fillRect(Math.floor(r() * W), Math.floor(r() * (hz + 6)), s, s);
    }
  } else {
    g.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(r() * W);
      g.fillRect(x, 8, 1, 40);
      g.fillRect(x + 1, 12, 1, 24);
    }
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(0, hz + 2, W, H - hz);
  }
  // hjälteglyph med ljuspunkt
  g.fillStyle = 'rgba(255,255,255,0.14)';
  for (const [rad, al] of [[19, 0.08], [15, 0.1], [11, 0.12]]) {
    g.fillStyle = `rgba(255,255,255,${al})`;
    for (let y = -rad; y <= rad; y++) {
      const w = Math.floor(Math.sqrt(rad * rad - y * y));
      g.fillRect(24 - w, 25 + y, w * 2, 1);
    }
  }
  const gl = glyphCanvas(tp.glyph, shade(tp.c1, 0.78), 2, true);
  g.drawImage(gl, 24 - 17, 25 - 16);
  // titelband
  g.fillStyle = 'rgba(8,10,24,0.82)';
  g.fillRect(0, H - 20, W, 20);
  g.fillStyle = ge.color;
  g.fillRect(0, H - 20, W, 1);
  const words = String(spec.title || '').toUpperCase().split(/\s+/);
  const lines = [''];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + ' ' + w).trim().length <= 11) lines[lines.length - 1] = (cur + ' ' + w).trim();
    else if (lines.length < 3) lines.push(w.slice(0, 11));
  }
  lines.slice(0, 3).forEach((ln, i) => drawText(g, ln, Math.round(24 - (ln.length * 4 - 1) / 2), H - 18 + i * 6, '#fff6d8', 1, 'rgba(0,0,0,.6)'));
  // plattformsremsa
  const pf = PLATFORM[spec.platform];
  g.fillStyle = pf ? pf.color : '#8fb2d0';
  g.fillRect(0, 0, W, 8);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 7, W, 1);
  const pname = (pf ? pf.name : 'PC').toUpperCase().slice(0, 11);
  drawText(g, pname, Math.round(24 - (pname.length * 4 - 1) / 2), 1, '#10121c', 1);
  // glans och ram
  g.fillStyle = 'rgba(255,255,255,0.16)';
  for (let i = 0; i < 20; i++) g.fillRect(8 + i, 9 + (20 - i), 2, 1);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(0, 0, W, 1);
  g.fillRect(0, 0, 1, H);
  g.fillStyle = 'rgba(0,0,0,0.4)';
  g.fillRect(W - 1, 0, 1, H);
  g.fillRect(0, H - 1, W, 1);
  const out = document.createElement('canvas');
  out.width = W * scale;
  out.height = H * scale;
  const og = out.getContext('2d');
  og.imageSmoothingEnabled = false;
  og.drawImage(c, 0, 0, W * scale, H * scale);
  return out;
}

export function coverURL(spec, scale = 3) {
  const key = [spec.id, spec.title, spec.topic, spec.genre, spec.platform, scale].join('|');
  let u = cache.get(key);
  if (!u) {
    u = coverCanvas(spec, scale).toDataURL();
    cache.set(key, u);
  }
  return u;
}
export const coverImg = (spec, w = 96, cls = '') => `<img class="cover ${cls}" src="${coverURL(spec, Math.max(2, Math.round(w / 48)))}" width="${w}" height="${Math.round((w * 64) / 48)}" alt="" draggable="false">`;
