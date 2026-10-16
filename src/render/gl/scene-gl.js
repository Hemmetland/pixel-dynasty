// WebGL-vägen för Scene: samma pixelartlager som canvasvägen, men ritade orörda (utan färgning) och belysta av GLFX.
import { clamp } from '../../core/util.js';
import { STREET } from '../world.js';
import { vehicleSize } from '../vehicles.js';
import { PITCH, INT_H } from '../building.js';
import { GLFX, glSupported, MAX_LIGHTS } from './fx.js';

const cv = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};
const mixv = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const norm3 = (x, y, z) => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const glMethods = {
  // Slår på/av WebGL-läget. Returnerar false om det inte går (då fortsätter canvasläget).
  setGL(on, opts = {}) {
    if (!on) {
      this.glOn = false;
      this.canvas.style.opacity = '';
      if (this.glCanvas) this.glCanvas.style.display = 'none';
      return true;
    }
    this.dual = !!opts.dual;
    if (!this.glfx) {
      if (!glSupported()) return false;
      try {
        const c = document.createElement('canvas');
        c.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
        this.canvas.after(c);
        this.glCanvas = c;
        this.glfx = new GLFX(c);
        c.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          this.setGL(false);
        });
      } catch (e) {
        console.warn('WebGL kunde inte startas, kör canvasläge', e);
        if (this.glCanvas) this.glCanvas.remove();
        this.glCanvas = null;
        this.glfx = null;
        return false;
      }
    }
    this.glOn = true;
    this.glCanvas.style.display = '';
    this.canvas.style.opacity = this.dual ? '' : '0';
    this.glLayers = null;
    this.sizeGL();
    return true;
  },

  sizeGL() {
    if (!this.glfx) return;
    const s = this.scale;
    const cssW = this.iw * s;
    const cssH = this.ih * s;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    while (cssW * cssH * dpr * dpr > 3.4e6 && dpr > 0.5) dpr *= 0.9;
    const ow = Math.max(2, Math.round(cssW * dpr));
    const oh = Math.max(2, Math.round(cssH * dpr));
    this.glCanvas.style.width = cssW + 'px';
    this.glCanvas.style.height = cssH + 'px';
    this.glfx.resize(this.iw, this.ih, ow, oh);
    this.glLayers = null;
  },

  // Ljuskällor i pixelartens koordinater (y nedåt).
  collectLights(cx, gy, night, lampOn) {
    const L = this.L;
    const G = this.G;
    const wd = this.world;
    const out = [];
    // skylt
    if (night > 0.05) out.push({ x: cx, y: gy + L.topY - 18, r: 64, i: 0.6 * night, c: [1, 0.5, 0.78], kind: 1, dx: 1 });
    // gatlyktor
    if (night > 0.1) {
      for (const x of wd.lamps) {
        if (x < -30 || x > this.iw + 30) continue;
        out.push({ x: x - 3, y: gy - 33, r: 66, i: 1.05 * night, c: [1, 0.87, 0.6], kind: 1, dx: 1 });
        out.push({ x: x - 3, y: gy + 3, r: 46, i: 0.75 * night, c: [1, 0.85, 0.58], kind: 1, dx: 1.9 });
      }
    }
    // fordonens ljus
    if (night > 0.1) {
      for (const c of wd.cars) {
        const len = vehicleSize(c).w;
        const y = gy + wd.laneY(c);
        const front = Math.round(c.x) + c.dir * (len - 1);
        const rear = Math.round(c.x);
        const lampY = y - (c.type === 'bus' ? 7 : c.type === 'truck' ? 9 : 8);
        out.push({ x: front, y: lampY, r: 70, i: 1.0 * night, c: [1, 0.96, 0.76], kind: 3, dx: c.dir, dy: 0 });
        out.push({ x: rear - c.dir * 2, y: lampY, r: 14, i: 0.55 * night, c: [1, 0.18, 0.15], kind: 1, dx: 1.4 });
      }
    }
    // ljus som läcker ut från fönstren på trottoaren
    if (lampOn > 0.1) {
      for (let k = 0; k < 3; k++) out.push({ x: cx + (k - 1) * L.IW * 0.3, y: gy + 2, r: 58, i: 0.26 * lampOn, c: [1, 0.82, 0.55], kind: 1, dx: 2.2 });
    }
    // innelampor (högst fyra per våning)
    const per = Math.min(4, Math.max(2, Math.floor(L.IW / 56)));
    for (let f = 0; f < L.floors; f++) {
      const fy = gy - 4 - f * PITCH;
      for (let l = 0; l < per; l++) {
        const lx = cx + Math.round(L.left + (l + 0.5) * (L.IW / per)) + 2;
        out.push({ x: lx, y: fy - INT_H + 5, r: Math.max(52, (L.IW / per) * 0.95), i: 0.95 * (0.2 + 0.8 * lampOn), c: [1, 0.78, 0.48], kind: 0, y0: fy - INT_H, y1: fy });
      }
    }
    // skärmsken från de som arbetar
    const working = !!G.job && !this.paused;
    if (working) {
      for (const a of this.actors.values()) {
        if (a.pose !== 'sit') continue;
        const d = L.desks[a.desk];
        if (!d) continue;
        const floorY = gy + d.fy + 2;
        out.push({ x: cx + d.x + 9, y: gy + d.fy - 19, r: 20, i: 0.62 * (0.55 + 0.6 * night) * (0.88 + 0.12 * Math.sin(this.time * 9 + a.id)), c: [0.43, 0.86, 1], kind: 2, y0: floorY - INT_H, y1: floorY });
      }
    }
    return out.slice(0, MAX_LIGHTS);
  },

  drawGL() {
    const G = this.G;
    const L = this.L;
    const gl = this.glfx;
    const wd = this.world;
    if (!gl || !G || !L) return;
    const iw = this.iw;
    const ih = this.ih;
    const gy = this.groundY;
    const cx = Math.round(iw / 2);
    const info = wd.info();
    const night = info.night;
    if (!this.glLayers || this.glLayers.iw !== iw || this.glLayers.ih !== ih) {
      const mk = () => {
        const c = cv(iw, ih);
        return { c, g: c.getContext('2d') };
      };
      this.glLayers = { iw, ih, sky: mk(), bg: mk(), emis: mk(), ground: mk(), house: mk(), front: mk(), fx: mk(), bgFor: null, bgGy: -1, groundKey: '' };
    }
    const R = this.glLayers;
    const clear = (l) => {
      l.g.setTransform(1, 0, 0, 1, 0, 0);
      l.g.globalCompositeOperation = 'source-over';
      l.g.globalAlpha = 1;
      l.g.clearRect(0, 0, iw, ih);
      return l.g;
    };

    // himmel (moln, fåglar och stjärnor rör sig)
    wd.drawSky(clear(R.sky));
    gl.upload('sky', R.sky.c);
    // skyline och tända fönster ändras bara när staden byggs om
    if (R.bgFor !== wd.layers || R.bgGy !== gy) {
      wd.drawBackdrop(clear(R.bg));
      gl.upload('bg', R.bg.c);
      wd.drawLitWindows(clear(R.emis), 1);
      gl.upload('emis', R.emis.c);
      R.bgFor = wd.layers;
      R.bgGy = gy;
    }
    // mark och träd ändras med årstid och väder
    const wz = wd.weather;
    const gk = [wd.month, wz.type, wz.amt > 0.3, gy, iw].join('|');
    if (gk !== R.groundKey) {
      const g = clear(R.ground);
      wd.drawGround(g);
      wd.drawTrees(g);
      gl.upload('ground', R.ground.c);
      R.groundKey = gk;
    }
    // huset med människor
    {
      const g = clear(R.house);
      const st = this.statics;
      g.drawImage(st.layer, cx - st.w / 2, gy - st.h);
      this.drawDynamic(g, cx, gy, night);
      gl.upload('house', R.house.c);
    }
    // gata, fordon, fotgängare, väder
    {
      const g = clear(R.front);
      wd.drawStreetFront(g, night);
      wd.drawWeather(g);
      gl.upload('front', R.front.c);
    }
    // överlägg som inte ska belysas: flytande tal, konfetti, nedtoning, markering
    const fxOn = this.floaters.length > 0 || this.fx.length > 0 || this.fade > 0.01 || !!this.hover;
    if (fxOn) {
      const g = clear(R.fx);
      this.drawFloaters(g);
      this.drawFx(g);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      if (this.fade > 0) {
        g.fillStyle = `rgba(8,10,24,${this.fade})`;
        g.fillRect(0, 0, iw, ih);
      }
      if (this.hover && this.hover.type === 'staff') {
        const a = this.actors.get(this.hover.id);
        if (a) this.drawOutline(g, cx + a.x - 9, gy + a.fy - 30, 19, 31);
      }
      if (this.hover && this.hover.type === 'slot') {
        const s = this.L.slots[this.hover.idx];
        this.drawOutline(g, cx + s.x - 1, gy + s.fy - 40, s.w + 2, 40);
      }
      gl.upload('fx', R.fx.c);
    }

    // ── ljusparametrar ──
    const am = info.amb.map((v) => v / 255);
    const k = clamp(night * 0.8, 0, 0.8);
    const warm = [0.52, 0.43, 0.39];
    const ambB = [am[0] + (warm[0] - am[0]) * k, am[1] + (warm[1] - am[1]) * k, am[2] + (warm[2] - am[2]) * k];
    const bad = wz.type === 'clear' ? 0 : wz.amt;
    const lampOn = clamp(night * 1.25 + bad * 0.35, 0, 1);
    const sun = wd.sun;
    const moon = wd.moon;
    const house = [cx, gy - 40];
    let sunL = [0, 0, 1];
    let sunC = [0, 0, 0];
    let sunUv = null;
    let shaft = 0;
    let warmGrade = 0;
    if (sun) {
      sunL = norm3(sun.x - house[0], sun.y - house[1], 90);
      const strength = (0.30 + 0.4 * sun.low) * (1 - bad * 0.75);
      sunC = mixv([1, 0.96, 0.84], [1, 0.58, 0.28], clamp(sun.low * 1.2, 0, 1)).map((v) => v * strength);
      sunUv = [sun.x / iw, 1 - sun.y / ih];
      shaft = clamp(0.1 + sun.low * 0.95, 0, 1) * (1 - bad * 0.85) * 0.85;
      warmGrade = smooth(0.25, 0.9, sun.low);
    }
    let moonL = [0, 0, 1];
    let moonC = [0, 0, 0];
    if (moon) {
      moonL = norm3(moon.x - house[0], moon.y - house[1], 90);
      moonC = [0.42, 0.52, 1].map((v) => v * 0.3 * night * (1 - bad * 0.6));
    }
    const gradeHi = mixv(mixv([1, 1, 1], [1.08, 1.0, 0.88], warmGrade), [0.9, 0.97, 1.1], night);
    const gradeLo = mixv([0.97, 0.99, 1.03], [0.88, 0.95, 1.12], night);
    const p = {
      lights: this.collectLights(cx, gy, night, lampOn),
      sunL, sunC, moonL, moonC,
      relief: 1,
      amb: am,
      ambB,
      night,
      gy,
      roadTop: STREET.roadTop,
      roadBot: STREET.roadBot,
      wet: wz.type === 'rain' ? wz.amt : 0,
      time: this.time,
      bgBlur: 0.75,
      emisK: 1.15,
      reflect: this.glReflect ?? 1,
      hazeCol: [0.8, 0.88, 1],
      bloomThr: 0.9 - 0.06 * night,
      bloomK: this.glBloom ?? 0.34 + 0.5 * night + 0.1 * warmGrade,
      sunUv,
      shaft,
      shaftCol: mixv([1, 0.95, 0.8], [1, 0.62, 0.34], warmGrade),
      sunGlow: sun ? (0.05 + 0.3 * sun.low) * (1 - bad * 0.8) : 0,
      sunGlowCol: mixv([1, 0.95, 0.8], [1, 0.55, 0.25], warmGrade),
      gradeHi, gradeLo,
      sat: 1.07 + 0.06 * warmGrade,
      vignette: 0.28 + 0.14 * night,
      grain: 0.022,
      fxOn,
    };
    gl.render(p);
  },
};
