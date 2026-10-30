import { clamp, lerp, hex2rgb } from '../core/util.js';
import { drawPerson } from './people.js';
import { randomLook } from '../sim/people.js';
import { drawVehicle, vehicleSize } from './vehicles.js';
import { drawBackdropCover } from './sprites.js';
import { drawWalkerSprite, drawBuyerSprite } from './charsprite.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

// Tid på dygnet: [tod, topp, mitt, horisont, ambient, stjärnor]
const KEYS = [
  [0.0, '#05081a', '#0b1236', '#1a2250', [66, 80, 142], 1],
  [0.2, '#0a1030', '#1a2250', '#3a3a70', [80, 92, 152], 0.8],
  [0.26, '#2a3a7a', '#c0607a', '#ffb070', [255, 214, 186], 0.1],
  [0.33, '#4a88e0', '#8ac4ff', '#ffe0b0', [255, 244, 232], 0],
  [0.5, '#3a90f0', '#7ac4ff', '#cdeaff', [255, 255, 255], 0],
  [0.67, '#4a8ee8', '#92c8ff', '#ffe8c0', [255, 246, 234], 0],
  [0.74, '#3a5ab0', '#ff9a6a', '#ffd080', [255, 210, 166], 0],
  [0.8, '#1c1a5a', '#8a3a7a', '#ff7a5a', [186, 150, 196], 0.25],
  [0.86, '#0a0c30', '#2a2a6a', '#6a3a7a', [102, 106, 168], 0.8],
  [1.0, '#05081a', '#0b1236', '#1a2250', [66, 80, 142], 1],
];
const KEYS_RGB = KEYS.map((k) => ({ t: k[0], top: hex2rgb(k[1]), mid: hex2rgb(k[2]), hor: hex2rgb(k[3]), amb: k[4], stars: k[5] }));

export function skyAt(tod) {
  let a = KEYS_RGB[0];
  let b = KEYS_RGB[1];
  for (let i = 0; i < KEYS_RGB.length - 1; i++) {
    if (tod >= KEYS_RGB[i].t && tod <= KEYS_RGB[i + 1].t) {
      a = KEYS_RGB[i];
      b = KEYS_RGB[i + 1];
      break;
    }
  }
  const f = (tod - a.t) / (b.t - a.t || 1);
  const mixc = (x, y) => [lerp(x[0], y[0], f), lerp(x[1], y[1], f), lerp(x[2], y[2], f)];
  const amb = mixc(a.amb, b.amb);
  return {
    top: mixc(a.top, b.top), mid: mixc(a.mid, b.mid), hor: mixc(a.hor, b.hor), amb,
    stars: lerp(a.stars, b.stars, f),
    night: clamp(1 - (amb[0] + amb[1] + amb[2]) / (255 * 3) * 1.15, 0, 1),
  };
}

function rng32(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// Gatans geometri i pixlar under husets markplan (gy). Scenen reserverar STREET.H så att hela gatan syns ovanför dockan.
export const STREET = {
  walk: 5, // trottoaren närmast huset: gy..gy+5
  roadTop: 7,
  roadBot: 35,
  laneFar: 26, // hjulens underkant i det bortre körfältet (fordon åt vänster)
  laneNear: 34, // ... och i det närmre (fordon åt höger)
  walk2: 37, // förgrundstrottoaren där fotgängarna går
  pedY: 42,
  H: 46,
};

const CAR_COLORS = ['#e8504a', '#4a90e0', '#f2c84a', '#6cc86a', '#e8e8f0', '#2a2f3c', '#c860c8', '#f2883a', '#3fb8a8', '#8a92a8'];

export class World {
  constructor(seed = 7) {
    this.seed = seed;
    this.tod = 0.62;
    this.W = 0;
    this.H = 0;
    this.groundY = 0;
    this.backdropDx = 0;
    this.backdrop = null; // sprite-nyckel (t.ex. 'bg.skyline-dusk') som ersätter himmel och stadssilhuett
    this.year = 1980;
    this.eraKey = -1;
    this.sky = null;
    this.skyKey = -1;
    this.clouds = [];
    this.cars = [];
    this.peds = [];
    this.nextCar = 2;
    this.nextPed = 3;
    this.weather = { type: 'clear', amt: 0, target: 0, timer: 30 };
    this.parts = [];
    this.time = 0;
    this.month = 0;
    this.stars = [];
    this.layers = [];
    this.lamps = [];
    this.lampX = 230; // avstånd från mitten till närmaste gatlykta (breda hus flyttar ut dem, se Scene.rebuildLayout)
    this.birds = [];
    this.nextBird = 6;
    this.fab = 0; // den egna fabrikens nivå (0 = ingen), syns bakom huset till höger
  }

  resize(W, H, groundY) {
    this.W = W;
    this.H = H;
    this.groundY = groundY;
    this.sky = cv(W, groundY + 2);
    this.skyKey = -1;
    this.eraKey = -1;
    const r = rng32(this.seed);
    this.stars = Array.from({ length: Math.round(W * groundY / 900) }, () => ({ x: Math.floor(r() * W), y: Math.floor(r() * groundY * 0.8), p: r() * 6, b: r() < 0.2 ? 2 : 1 }));
    this.clouds = Array.from({ length: Math.max(4, Math.round(W / 90)) }, (_, i) => this.makeCloud(r, i));
    this.lamps = [];
    for (let x = W / 2 - this.lampX; x > -40; x -= 150) this.lamps.push(x);
    for (let x = W / 2 + this.lampX; x < W + 40; x += 150) this.lamps.push(x);
    this.treeX = [W / 2 - 250, W / 2 + 255, W / 2 - 380, W / 2 + 390].filter((x) => x > -20 && x < W + 20);
  }

  makeCloud(r, i) {
    const w = 26 + Math.floor(r() * 40);
    const h = 8 + Math.floor(r() * 10);
    const c = cv(w, h);
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 7; k++) {
      const bw = 8 + Math.floor(r() * (w / 2));
      const bx = Math.floor(r() * (w - bw));
      const by = Math.floor(h * 0.35 + r() * (h * 0.45));
      g.fillRect(bx, by - Math.floor(bw / 4), bw, Math.floor(bw / 4) + 2);
      g.fillRect(bx + 2, by - Math.floor(bw / 3), bw - 4, 2);
    }
    g.fillRect(2, h - 3, w - 4, 3);
    g.fillStyle = '#cfdcf0';
    g.fillRect(2, h - 2, w - 4, 2);
    return { c, x: r() * this.W, y: 6 + r() * this.groundY * 0.42, v: 1.5 + r() * 3.5, z: 0.6 + r() * 0.4 };
  }

  setYear(year) {
    this.year = year;
    const era = year < 1991 ? 0 : year < 2004 ? 1 : 2;
    if (era !== this.eraKey && this.W) {
      this.eraKey = era;
      this.buildSkyline(era);
    }
  }

  buildSkyline(era) {
    const r = rng32(this.seed + era * 31);
    this.layers = [];
    const specs = [
      { base: '#6c7aa0', win: '#8a9ac4', hMin: 30, hMax: 56 + era * 22, wMin: 12, wMax: 26, gap: 0, haze: 0.5 },
      { base: '#4a5578', win: '#6a78a0', hMin: 22, hMax: 44 + era * 18, wMin: 14, wMax: 30, gap: 1, haze: 0.28 },
      { base: '#323a58', win: '#4a5580', hMin: 14, hMax: 30 + era * 12, wMin: 16, wMax: 34, gap: 2, haze: 0.1 },
    ];
    for (const sp of specs) {
      const H = sp.hMax + 24;
      const day = cv(this.W, H);
      const lit = cv(this.W, H);
      const g = day.getContext('2d');
      const l = lit.getContext('2d');
      let x = -6;
      while (x < this.W + 6) {
        const w = sp.wMin + Math.floor(r() * (sp.wMax - sp.wMin));
        const h = sp.hMin + Math.floor(r() * (sp.hMax - sp.hMin));
        const shadeK = 0.9 + r() * 0.2;
        const [br, bg, bb] = hex2rgb(sp.base);
        g.fillStyle = `rgb(${Math.round(br * shadeK)},${Math.round(bg * shadeK)},${Math.round(bb * shadeK)})`;
        g.fillRect(x, H - h, w, h);
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(x, H - h, 1, h);
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.fillRect(x + w - 1, H - h, 1, h);
        // tak/antenn/spira
        const tp = r();
        if (tp < 0.2) { g.fillStyle = sp.base; g.fillRect(x + Math.floor(w / 2), H - h - 6, 1, 6); }
        else if (era >= 1 && tp < 0.35) { g.fillStyle = sp.base; g.fillRect(x + 2, H - h - 3, w - 4, 3); }
        // fönster
        const step = era === 0 ? 4 : 3;
        for (let wy = H - h + 3; wy < H - 3; wy += step + 1) {
          for (let wx = x + 2; wx < x + w - 2; wx += step) {
            g.fillStyle = sp.win;
            g.fillRect(wx, wy, step - 2 > 0 ? step - 2 : 1, step - 2 > 0 ? step - 2 : 1);
            if (r() < 0.38) {
              l.fillStyle = r() < 0.7 ? '#ffd27a' : '#bfe8ff';
              l.fillRect(wx, wy, step - 2 > 0 ? step - 2 : 1, step - 2 > 0 ? step - 2 : 1);
            }
          }
        }
        x += w + sp.gap;
      }
      this.layers.push({ day, lit, H, haze: sp.haze });
    }
  }

  // ── Uppdatering ──
  update(dt, o) {
    this.time += dt;
    const speed = o.speed || 1;
    this.tod = (this.tod + (dt / 170) * (o.paused ? 0.15 : 0.5 + 0.5 * Math.min(speed, 3))) % 1;
    if (o.todLock != null) this.tod = o.todLock;
    this.month = o.month ?? 0;
    this.fab = o.fab || 0;
    for (const c of this.clouds) {
      c.x += c.v * dt * 0.6;
      if (c.x > this.W + 80) {
        c.x = -80;
        c.y = 6 + Math.random() * this.groundY * 0.42;
      }
    }
    // väder
    const wz = this.weather;
    if (o.weatherLock) {
      wz.type = o.weatherLock.type;
      wz.target = o.weatherLock.amt;
      wz.timer = 99;
      if (o.weatherLock.snap) wz.amt = o.weatherLock.amt;
    }
    wz.timer -= dt;
    if (wz.timer <= 0) {
      const winter = this.month === 11 || this.month <= 1;
      const rainy = [2, 3, 4, 8, 9, 10].includes(this.month);
      const roll = Math.random();
      if (winter) wz.type = roll < 0.55 ? 'snow' : 'clear';
      else wz.type = roll < (rainy ? 0.35 : 0.12) ? 'rain' : 'clear';
      wz.target = wz.type === 'clear' ? 0 : 0.5 + Math.random() * 0.5;
      wz.timer = 35 + Math.random() * 60;
    }
    wz.amt += (wz.target - wz.amt) * Math.min(1, dt * 0.5);
    if (wz.amt < 0.02 && wz.target === 0) wz.amt = 0;
    const n = Math.round(wz.amt * (o.reduced ? 0.35 : 1) * (wz.type === 'snow' ? 48 : 150) * (this.W / 640) * dt * 3);
    for (let i = 0; i < n; i++) {
      this.parts.push(
        wz.type === 'snow'
          ? { x: Math.random() * this.W, y: -2, vx: (Math.random() - 0.5) * 8, vy: 14 + Math.random() * 14, snow: true, life: 12 }
          : { x: Math.random() * (this.W + 40), y: -4, vx: -14, vy: 130 + Math.random() * 60, snow: false, life: 4 },
      );
    }
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0 && p.y < this.groundY + 28);
    // fåglar (dagtid)
    this.nextBird -= dt;
    if (this.nextBird <= 0) {
      this.nextBird = 7 + Math.random() * 16;
      const day = this.tod > 0.27 && this.tod < 0.72 && this.weather.type !== 'rain';
      if (day) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        const n = 1 + Math.floor(Math.random() * 3);
        const y0 = this.groundY * (0.1 + Math.random() * 0.35);
        for (let i = 0; i < n; i++) this.birds.push({ x: (dir > 0 ? -10 : this.W + 10) - dir * i * 9, y: y0 + i * 3 + Math.sin(i) * 3, vx: dir * (22 + Math.random() * 10), ph: Math.random() * 6, dir });
      }
    }
    for (const b of this.birds) {
      b.x += b.vx * dt;
      b.ph += dt * 9;
      b.y += Math.sin(b.ph * 0.5) * 3 * dt;
    }
    this.birds = this.birds.filter((b) => b.x > -30 && b.x < this.W + 30);
    // bilar och fotgängare
    this.nextCar -= dt;
    if (this.nextCar <= 0) {
      this.nextCar = 3.5 + Math.random() * 7;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const era = this.year < 1991 ? 0 : this.year < 2004 ? 1 : 2;
      const roll = Math.random();
      // när studions hårdvara levereras kör en del lastbilar i produktens färger
      const brand = o.brands && roll < 0.3 ? o.brands[Math.floor(Math.random() * o.brands.length)] : null;
      const type = brand ? 'truck' : roll < 0.1 ? 'bus' : roll < 0.22 ? 'van' : roll < 0.32 ? 'truck' : 'car';
      const c = { x: 0, dir, v: (34 + Math.random() * 24) * (type === 'bus' ? 0.8 : type === 'truck' ? 0.9 : 1), color: brand ? brand.color : CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], type, era, brand };
      const len = vehicleSize(c).w;
      c.x = dir > 0 ? -len - 2 : this.W + len + 2;
      // håll avstånd till bilen framför i samma körfält
      const entry = dir > 0 ? -2 : this.W + 2;
      let ahead = null;
      for (const o of this.cars) {
        if (o.dir !== dir) continue;
        const gap = dir > 0 ? o.x - entry : entry - o.x;
        if (gap < 160 && (!ahead || gap < ahead.gap)) ahead = { gap, v: o.v };
      }
      if (ahead && ahead.gap < 8) this.nextCar = 0.7;
      else {
        if (ahead) c.v = Math.min(c.v, ahead.v);
        this.cars.push(c);
      }
    }
    for (const c of this.cars) c.x += c.dir * c.v * dt;
    this.cars = this.cars.filter((c) => (c.dir > 0 ? c.x < this.W + 4 : c.x > -4));
    this.nextPed -= dt;
    if (this.nextPed <= 0) {
      this.nextPed = 4 + Math.random() * 8;
      const dir = Math.random() < 0.5 ? 1 : -1;
      // de första veckorna efter att studions hårdvara kommit ut bär en del fotgängare hem en låda i produktens färg
      const box = o.buyers && Math.random() < 0.45 ? o.buyers[Math.floor(Math.random() * o.buyers.length)] : null;
      this.peds.push({ x: dir > 0 ? -12 : this.W + 12, dir, v: 10 + Math.random() * 8, t: 0, look: randomLook(Math.random), box });
    }
    for (const p of this.peds) {
      p.x += p.dir * p.v * dt;
      p.t += dt * 6;
    }
    this.peds = this.peds.filter((p) => p.x > -20 && p.x < this.W + 20);
  }

  info() {
    const s = skyAt(this.tod);
    const w = this.weather;
    const dim = w.type === 'clear' ? 0 : w.amt * 0.14;
    return { ...s, amb: s.amb.map((v) => v * (1 - dim)), tod: this.tod };
  }

  // ── Ritning ──
  drawSky(ctx) {
    if (this.backdrop && drawBackdropCover(ctx, this.backdrop, this.W, this.groundY + 2, this.W >= 480 ? this.backdropDx : 0)) {
      this.sun = null;
      this.moon = null;
      return;
    }
    const s = skyAt(this.tod);
    const key = Math.round(this.tod * 360) + (this.weather.type === 'clear' ? 0 : 1000);
    if (key !== this.skyKey) {
      this.skyKey = key;
      const g = this.sky.getContext('2d');
      const W = this.sky.width;
      const H = this.sky.height;
      const img = g.createImageData(W, H);
      const N = 20;
      const pal = [];
      const grey = this.weather.type === 'clear' ? 0 : this.weather.amt * 0.45;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const a = t < 0.55 ? s.top : s.mid;
        const b = t < 0.55 ? s.mid : s.hor;
        const f = t < 0.55 ? t / 0.55 : (t - 0.55) / 0.45;
        let c = [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
        if (grey) {
          const l = (c[0] + c[1] + c[2]) / 3;
          c = [lerp(c[0], l * 0.95, grey), lerp(c[1], l * 0.98, grey), lerp(c[2], l * 1.02, grey)];
        }
        pal.push(c);
      }
      for (let y = 0; y < H; y++) {
        const v = clamp(y / (H - 1), 0, 1) * N;
        const b0 = Math.min(N - 1, Math.floor(v));
        const fr = v - b0;
        for (let x = 0; x < W; x++) {
          const th = BAYER[(y & 3) * 4 + (x & 3)];
          const c = pal[fr > th ? b0 + 1 : b0];
          const i = (y * W + x) * 4;
          img.data[i] = c[0];
          img.data[i + 1] = c[1];
          img.data[i + 2] = c[2];
          img.data[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    }
    ctx.drawImage(this.sky, 0, 0);
    // stjärnor
    if (s.stars > 0.02) {
      const tw = this.time;
      for (const st of this.stars) {
        const a = s.stars * (0.55 + 0.45 * Math.sin(tw * 1.3 + st.p));
        if (a < 0.15) continue;
        ctx.fillStyle = `rgba(255,255,255,${a * (this.weather.type === 'clear' ? 1 : 0.3)})`;
        ctx.fillRect(st.x, st.y, st.b, st.b);
      }
    }
    // sol och måne
    const gy = this.groundY;
    const t = this.tod;
    if (t > 0.23 && t < 0.78) {
      const pr = (t - 0.23) / 0.55;
      const x = this.W * 0.1 + this.W * 0.8 * pr;
      const y = gy - 8 - Math.sin(pr * Math.PI) * gy * 0.82;
      const low = 1 - Math.sin(pr * Math.PI);
      const col = low > 0.6 ? '#ffb070' : low > 0.3 ? '#ffe0a0' : '#fff6c8';
      if (this.weather.type === 'clear' || this.weather.amt < 0.7) {
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(x) - 7, Math.round(y) - 4, 14, 8);
        ctx.fillRect(Math.round(x) - 5, Math.round(y) - 7, 10, 14);
        ctx.fillRect(Math.round(x) - 4, Math.round(y) - 8, 8, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(x) - 3, Math.round(y) - 5, 6, 8);
      }
      this.sun = { x, y, low };
    } else this.sun = null;
    const mt = t > 0.7 ? (t - 0.7) / 0.6 : (t + 0.3) / 0.6;
    if (mt >= 0 && mt <= 1 && (t > 0.8 || t < 0.22)) {
      const x = this.W * 0.12 + this.W * 0.76 * mt;
      const y = gy - 14 - Math.sin(mt * Math.PI) * gy * 0.75;
      ctx.fillStyle = '#f4f2dc';
      ctx.fillRect(Math.round(x) - 5, Math.round(y) - 3, 10, 6);
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 5, 6, 10);
      ctx.fillRect(Math.round(x) - 4, Math.round(y) - 4, 8, 8);
      ctx.fillStyle = '#c8c8b4';
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 2, 2);
      ctx.fillRect(Math.round(x) + 1, Math.round(y) + 1, 2, 1);
      this.moon = { x, y };
    } else this.moon = null;
    // fåglar
    ctx.fillStyle = '#1a2036';
    for (const b of this.birds) {
      const up = Math.sin(b.ph) > 0;
      const x = Math.round(b.x);
      const y = Math.round(b.y);
      if (up) {
        ctx.fillRect(x - 3, y - 1, 2, 1);
        ctx.fillRect(x + 1, y - 1, 2, 1);
        ctx.fillRect(x - 1, y, 2, 1);
      } else {
        ctx.fillRect(x - 3, y + 1, 2, 1);
        ctx.fillRect(x + 1, y + 1, 2, 1);
        ctx.fillRect(x - 1, y, 2, 1);
      }
    }
    // moln
    for (const c of this.clouds) {
      ctx.globalAlpha = (0.55 + 0.4 * c.z) * (this.weather.type === 'clear' ? 1 : 0.7 + this.weather.amt * 0.3);
      ctx.drawImage(c.c, Math.round(c.x), Math.round(c.y));
    }
    ctx.globalAlpha = 1;
    if (this.weather.type !== 'clear' && this.weather.amt > 0.1) {
      ctx.fillStyle = `rgba(90,100,120,${this.weather.amt * 0.28})`;
      ctx.fillRect(0, 0, this.W, this.groundY);
    }
  }
  // röken från fabrikens skorstenar (i gatulagret, som ritas varje bildruta och ligger framför stadssilhuetten)
  drawSmoke(ctx) {
    if (!this.fab) return;
    const { tops } = this.fabLayout();
    for (let i = 0; i < tops.length; i++) {
      const { x, y } = tops[i];
      for (let k = 0; k < 6; k++) {
        const p = (this.time * 0.18 + k / 6 + i * 0.37) % 1;
        const sx = Math.round(x + p * 10 + Math.sin(p * 6 + i) * 1.5);
        const sy = Math.round(y - 2 - p * 26);
        const r = 1 + Math.round(p * 3);
        ctx.fillStyle = `rgba(226,230,240,${(1 - p) * 0.55})`;
        ctx.fillRect(sx - r, sy - r + 1, r * 2, r * 2 - 2);
        ctx.fillRect(sx - r + 1, sy - r, r * 2 - 2, r * 2);
      }
    }
  }

  // Stadssilhuett + träd + mark bakom byggnaden (ritas på objektlagret)
  drawBackdrop(ctx) {
    if (this.backdrop) {
      this.drawFactory(ctx, false);
      return;
    }
    const gy = this.groundY;
    const lyr = this.layers;
    for (let i = 0; i < lyr.length; i++) {
      const l = lyr[i];
      ctx.drawImage(l.day, 0, gy - l.H - 6 + i * 4);
    }
    // dimma vid horisonten
    const hz = ctx.createLinearGradient(0, gy - 60, 0, gy);
    hz.addColorStop(0, 'rgba(255,255,255,0)');
    hz.addColorStop(1, 'rgba(210,225,255,0.22)');
    ctx.fillStyle = hz;
    ctx.fillRect(0, gy - 60, this.W, 60);
    this.drawFactory(ctx, false);
  }
  drawLitWindows(ctx, night) {
    if (night < 0.05) return;
    const gy = this.groundY;
    ctx.globalAlpha = clamp(night * 1.2, 0, 1);
    if (!this.backdrop) for (let i = 0; i < this.layers.length; i++) ctx.drawImage(this.layers[i].lit, 0, gy - this.layers[i].H - 6 + i * 4);
    this.drawFactory(ctx, true);
    ctx.globalAlpha = 1;
  }

  // Den egna fabriken: en hall med sågtandstak per nivå och en skorsten per hall, strax utanför den första gatlyktan
  // till höger om huset
  fabLayout() {
    const n = this.fab;
    const x0 = Math.round(this.W / 2 + this.lampX + 14);
    const halls = [];
    const tops = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 30;
      halls.push(x);
      tops.push({ x: x + 24, y: this.groundY - 40 - (i === 0 ? 4 : 0) });
    }
    return { x0, halls, tops };
  }
  drawFactory(ctx, lit) {
    if (!this.fab) return;
    const gy = this.groundY;
    const { halls, tops } = this.fabLayout();
    const R = (x, y, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    for (let i = 0; i < halls.length; i++) {
      const x = halls[i];
      const wallTop = gy - 20;
      if (!lit) {
        // skorsten bakom taket, med röda och vita band
        const t = tops[i];
        R(t.x - 2, t.y, 5, gy - t.y, '#6c6f82');
        R(t.x - 2, t.y, 1, gy - t.y, '#8a8ea4');
        R(t.x - 2, t.y + 2, 5, 2, '#c8584a');
        R(t.x - 2, t.y + 6, 5, 2, '#e8e8f0');
        R(t.x - 3, t.y, 7, 1, '#4a4d5e');
        // väggen och sågtandstaket med glas mot norr
        R(x, wallTop, 30, 20, '#9a6656');
        R(x, wallTop, 30, 1, '#b8806c');
        R(x + 29, wallTop, 1, 20, '#74483e');
        for (let k = 3; k < 20; k += 4) R(x + 1, wallTop + k, 28, 1, '#8c5a4c');
        R(x, wallTop + 10, 30, 1, '#c8c4bc');
        for (let k = 0; k < 3; k++) {
          const tx = x + k * 10;
          for (let j = 0; j < 6; j++) R(tx + j + 1, wallTop - j - 1, 10 - j - 1, 1, '#4f5469');
          R(tx + 1, wallTop - 6, 1, 6, '#9fc4e8');
        }
        // fönsterrad och port
        for (let k = 0; k < 4; k++) R(x + 3 + k * 7, wallTop + 4, 4, 4, '#2e3348');
        R(x + 11, gy - 9, 8, 9, '#4a4f63');
        for (let k = 1; k < 9; k += 2) R(x + 11, gy - 9 + k, 8, 1, '#5a6075');
      } else {
        for (let k = 0; k < 4; k++) R(x + 3 + k * 7, wallTop + 4, 4, 4, k % 3 === 1 ? '#bfe8ff' : '#ffd27a');
        R(x + 1, wallTop - 6, 1, 5, '#ffe6a8');
        R(x + 11, wallTop - 6, 1, 5, '#ffe6a8');
        R(x + 21, wallTop - 6, 1, 5, '#ffe6a8');
      }
    }
    if (!lit) {
      // skylt i studions accentfärg på den första hallen
      const x = halls[0];
      R(x + 4, gy - 31, 22, 6, '#f4f6fb');
      R(x + 4, gy - 26, 22, 1, '#c8ccd8');
      R(x + 6, gy - 30, 4, 4, '#2fb8a8');
      R(x + 12, gy - 29, 12, 1, '#4a5068');
      R(x + 12, gy - 27, 8, 1, '#7a8098');
      R(x + 9, gy - 25, 1, 5, '#4a4d5e');
      R(x + 21, gy - 25, 1, 5, '#4a4d5e');
    }
  }

  drawGround(ctx, sky) {
    const gy = this.groundY;
    const W = this.W;
    const H = this.H;
    const S = STREET;
    const winter = this.month === 11 || this.month <= 1;
    const snowy = this.weather.type === 'snow' && this.weather.amt > 0.3;
    const walkA = winter && snowy ? '#d8dcea' : '#a4a4b4';
    const walkB = winter && snowy ? '#f0f4ff' : '#c0c0d0';
    // trottoar närmast huset
    ctx.fillStyle = walkA;
    ctx.fillRect(0, gy, W, S.walk);
    ctx.fillStyle = walkB;
    ctx.fillRect(0, gy, W, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < W; x += 14) ctx.fillRect(x, gy + 1, 1, S.walk - 1);
    // kantsten
    ctx.fillStyle = '#6a6a7a';
    ctx.fillRect(0, gy + S.walk, W, 2);
    ctx.fillStyle = '#8a8a9a';
    ctx.fillRect(0, gy + S.walk, W, 1);
    // väg
    ctx.fillStyle = '#3a3c4a';
    ctx.fillRect(0, gy + S.roadTop, W, S.roadBot - S.roadTop);
    ctx.fillStyle = '#464858';
    ctx.fillRect(0, gy + S.roadTop, W, 1);
    ctx.fillStyle = '#34364a';
    for (let x = 0; x < W; x += 11) ctx.fillRect(x + ((x * 5) % 7), gy + S.roadTop + 4 + ((x * 3) % 18), 2, 1);
    ctx.fillStyle = '#d8c860';
    for (let x = 0; x < W; x += 28) ctx.fillRect(x, gy + 21, 14, 1);
    ctx.fillStyle = '#6a6a7a';
    ctx.fillRect(0, gy + S.roadBot, W, 2);
    // förgrundstrottoar
    ctx.fillStyle = winter && snowy ? '#e4e8f4' : '#a8a8b8';
    ctx.fillRect(0, gy + S.roadBot + 2, W, S.H - S.roadBot - 2 - 1);
    ctx.fillStyle = walkB;
    ctx.fillRect(0, gy + S.roadBot + 2, W, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < W; x += 18) ctx.fillRect(x, gy + S.roadBot + 3, 1, S.H - S.roadBot - 5);
    ctx.fillStyle = '#7a7a8a';
    ctx.fillRect(0, gy + S.H - 1, W, 1);
    // gräs
    ctx.fillStyle = winter ? '#dfe6f4' : '#4a8a4a';
    ctx.fillRect(0, gy + S.H, W, Math.max(0, H - gy - S.H));
    ctx.fillStyle = winter ? '#c8d0e4' : '#3a7a3a';
    for (let x = 0; x < W; x += 9) ctx.fillRect(x, gy + S.H + 2 + ((x * 7) % 9), 2, 1);
    void sky;
  }

  drawTrees(ctx) {
    const gy = this.groundY;
    const autumn = this.month >= 8 && this.month <= 10;
    const winter = this.month === 11 || this.month <= 1;
    const spring = this.month >= 2 && this.month <= 4;
    for (const x of this.treeX || []) {
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(x - 1, gy - 22, 3, 22);
      ctx.fillStyle = '#7a5232';
      ctx.fillRect(x - 1, gy - 22, 1, 22);
      const leaf = winter ? null : autumn ? ['#d8782a', '#e8a03a', '#b8501a'] : spring ? ['#5ab85a', '#8ad87a', '#f2a8c8'] : ['#3f9a4a', '#5ab85a', '#2f7a3a'];
      if (leaf) {
        ctx.fillStyle = leaf[2];
        ctx.fillRect(x - 11, gy - 36, 23, 10);
        ctx.fillStyle = leaf[0];
        ctx.fillRect(x - 13, gy - 34, 27, 8);
        ctx.fillRect(x - 9, gy - 41, 19, 7);
        ctx.fillStyle = leaf[1];
        ctx.fillRect(x - 8, gy - 40, 7, 3);
        ctx.fillRect(x + 3, gy - 36, 6, 3);
      } else {
        ctx.fillStyle = '#4a2e1a';
        ctx.fillRect(x - 8, gy - 34, 1, 12);
        ctx.fillRect(x + 7, gy - 34, 1, 12);
        ctx.fillRect(x - 4, gy - 38, 1, 16);
        ctx.fillRect(x + 3, gy - 38, 1, 16);
        ctx.fillStyle = '#f4f8ff';
        ctx.fillRect(x - 9, gy - 35, 3, 1);
        ctx.fillRect(x + 6, gy - 35, 3, 1);
      }
    }
    // buskar
    ctx.fillStyle = winter ? '#dfe6f4' : '#2f7a3a';
    for (const x of [this.W / 2 - 122, this.W / 2 + 118]) {
      ctx.fillRect(x - 6, gy - 4, 13, 4);
      ctx.fillRect(x - 4, gy - 6, 9, 3);
    }
  }

  drawStreetFront(ctx, night) {
    const gy = this.groundY;
    this.drawSmoke(ctx);
    // lyktstolpar
    for (const x of this.lamps) {
      ctx.fillStyle = '#2a2f3c';
      ctx.fillRect(x, gy - 36, 2, 36);
      ctx.fillRect(x - 5, gy - 37, 8, 2);
      ctx.fillStyle = night > 0.3 ? '#fff4c0' : '#d8d8e0';
      ctx.fillRect(x - 6, gy - 36, 4, 2);
    }
    // fordon: bortre körfältet först, sedan det närmre
    const cars = this.cars.slice().sort((p, q) => this.laneY(p) - this.laneY(q));
    for (const c of cars) drawVehicle(ctx, c, gy + this.laneY(c));
    // fotgängare på förgrundstrottoaren, framför allt annat
    for (const p of this.peds) {
      if (p.box && drawBuyerSprite(ctx, p.x, gy + STREET.pedY, p.look, p.t, p.dir, p.box.color, p.box.dark, p.box.light)) continue;
      if (!drawWalkerSprite(ctx, p.x, gy + STREET.pedY, p.look, p.t, p.dir)) drawPerson(ctx, p.x, gy + STREET.pedY, p.look, 'walk', Math.floor(p.t) % 4, p.dir, {});
    }
  }

  // Fordonets markyta relativt gy. Fordon åt höger kör närmast kameran.
  laneY(c) {
    return c.dir > 0 ? STREET.laneNear : STREET.laneFar;
  }

  drawWeather(ctx) {
    for (const p of this.parts) {
      if (p.snow) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        const big = (p.x * 7) % 5 < 1.2;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), big ? 2 : 1, big ? 2 : 1);
      } else {
        ctx.fillStyle = 'rgba(170,200,255,0.55)';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 3);
      }
    }
  }
}
