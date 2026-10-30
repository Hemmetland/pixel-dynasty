import { clamp } from '../core/util.js';
import { World, STREET } from './world.js';
import { vehicleSize } from './vehicles.js';
import { makeLayout, drawShell, eraOf, PITCH, INT_H } from './building.js';
import { drawRoomsDynamic } from './rooms.js';
import { drawPerson } from './people.js';
import { drawPoseSprite } from './charsprite.js';
import { getSprite } from './sprites.js';
import { makeCrowd, updateCrowd, drawDoors, detach, forceAct } from './behavior.js';
import { drawEmote, EMOTE_LIFE } from './emotes.js';
import { drawTextOutlined, drawText, textWidth } from './font.js';
import { TOPIC } from '../data/topics.js';
import { drawCat } from './props.js';
import { FRONT } from './tier5-rooms.js';
import { yearOf, dateOf } from '../sim/const.js';
import { lang } from '../core/i18n.js';
import { glMethods } from './gl/scene-gl.js';

const SCALES = [0.6, 0.75, 0.9, 1, 1.5, 2, 2.5, 3, 4, 5, 6];
const STREET_SLACK = 26;
// Poser där en person vid skrivbordet inte tittar på skärmen (v2): skärmen dämpas
const DESK_IDLE = new Set(['sleep', 'read', 'sitIdle', 'cheer', 'wave']);

// Mjuk, pixelerad ellipsglöd (staplade ellipser, additivt läge förutsätts).
function glow(ctx, cx, cy, rx, ry, rgb, alpha, steps = 5) {
  for (let i = 0; i < steps; i++) {
    const f = 1 - i / steps;
    const rxi = rx * f;
    const ryi = ry * f;
    ctx.fillStyle = `rgba(${rgb},${alpha / steps * (1 + i * 0.55)})`;
    for (let y = -Math.floor(ryi); y <= Math.floor(ryi); y++) {
      const w = Math.floor(rxi * Math.sqrt(1 - (y / (ryi || 1)) ** 2));
      ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
    }
  }
}
const cv = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = new World(11);
    this.G = null;
    this.L = null;
    this.layout = null;
    this.scale = 3;
    this.iw = 320;
    this.ih = 180;
    this.insets = { top: 70, bottom: 110 };
    this.actors = new Map();
    this.crowd = null; // beteendet på Studiohuset (behavior.js), annars gamla vägen
    this.emotes = [];
    this.floaters = [];
    this.fx = [];
    this.statics = null;
    this.staticKey = '';
    this.time = 0;
    this.hover = null;
    this.speed = 1;
    this.paused = false;
    this.celebrate = 0;
    this.fade = 0;
    this.reduced = false;
    this.vw = 0;
    this.vh = 0;
    this.shake = 0;
    this.glCanvas = null;
    this.glfx = null;
    this.glOn = false;
    this.glLayers = null;
    this.todLock = null;
    this.dprScale = 1;
    this.cat = { x: 20, state: 'sit', timer: 3, dir: 1, target: null, frame: 0, kind: 0 };
    this.smoke = [];
    this.smokeT = 0;
  }

  setGame(G) {
    this.G = G;
    this.world.backdrop = null;
    this.world.backdropDx = 0;
    if (!G) return;
    this.rebuildLayout(true);
  }

  tierChanged() {
    this.rebuildLayout(false);
    this.fade = 1;
  }

  rebuildLayout(first) {
    const G = this.G;
    this.L = makeLayout(G.office.tier);
    this.statics = null;
    this.staticKey = '';
    this.actors.clear();
    this.crowd = this.L.v2 ? makeCrowd(this) : null;
    this.emotes = [];
    this.lightCache = null;
    this.world.lampX = this.L.BW > 424 ? Math.round(this.L.BW / 2 + 44) : 230; // gatlyktorna står utanför breda hus
    this.fit();
    this.syncActors(first);
    this.world.setYear(yearOf(G.t));
  }

  resize(vw, vh, insets) {
    this.vw = vw;
    this.vh = vh;
    if (insets) this.insets = insets;
    this.fit();
  }

  fit() {
    const vw = this.vw;
    const vh = this.vh;
    if (!vw || !vh || !this.L) return;
    const L = this.L;
    const bw = L.W;
    const bh = L.H + 14;
    const availW = vw * (vw < 700 ? 0.96 : 0.84);
    // Hela gatan (STREET.H) ska synas ovanför dockan, som själv har ca 28 px luft i sin nedre marginal.
    const availH = vh - this.insets.top - this.insets.bottom + STREET_SLACK;
    let s = SCALES[0];
    for (const c of SCALES) if (bw * c <= availW && (bh + STREET.H) * c <= availH) s = c;
    this.scale = s;
    this.iw = Math.ceil(vw / s);
    this.ih = Math.ceil(vh / s);
    this.canvas.width = this.iw;
    this.canvas.height = this.ih;
    this.canvas.style.width = this.iw * s + 'px';
    this.canvas.style.height = this.ih * s + 'px';
    this.sizeGL();
    this.objA = cv(this.iw, this.ih);
    this.objB = cv(this.iw, this.ih);
    this.bgA = cv(this.iw, this.ih);
    this.bgB = cv(this.iw, this.ih);
    let gyScreen = vh - this.insets.bottom + STREET_SLACK - STREET.H * s;
    if (vh > vw * 1.15) {
      // Stående skärm: centrera byggnad och gata i det lediga området.
      const free = vh - this.insets.top - this.insets.bottom + STREET_SLACK;
      gyScreen = this.insets.top + (free - (bh + STREET.H) * s) / 2 + bh * s;
    }
    this.groundY = Math.round(Math.min(gyScreen / s, this.ih - STREET.H - 2));
    this.world.resize(this.iw, this.ih, this.groundY);
    if (this.G) this.world.setYear(yearOf(this.G.t));
  }

  // ── Statiskt lager ──
  buildStatics() {
    const G = this.G;
    const L = this.L;
    const era = eraOf(yearOf(G.t));
    const games = G.games.slice(-5).map((g) => ({ c1: TOPIC[g.topic].c1, c2: TOPIC[g.topic].c2 }));
    const key = [lang, G.office.tier, era, G.studio, G.awards.length, games.map((g) => g.c1).join(''), JSON.stringify(G.office.fac)].join('|');
    if (key === this.staticKey && this.statics) return;
    this.staticKey = key;
    const w = L.W + 40;
    const h = L.H + 40;
    const layer = cv(w, h);
    const g = layer.getContext('2d');
    g.translate(w / 2, h);
    const holes = drawShell(g, L, { era, name: G.studio, awards: G.awards.length, games, fac: G.office.fac });
    // ljusmask: interiör utan fönster
    const lift = cv(w, h);
    const lg = lift.getContext('2d');
    lg.translate(w / 2, h);
    for (let f = 0; f < L.floors; f++) {
      const fy = -4 - f * (L.pitch ?? PITCH);
      lg.fillStyle = '#ffffff';
      lg.fillRect(L.left, fy - (L.intH ?? INT_H), L.IW, (L.intH ?? INT_H));
    }
    for (const [x, y, ww, hh] of holes) lg.clearRect(x - 2, y - 2, ww + 4, hh + 4);
    this.statics = { layer, lift, w, h, holes, glow: null };
    if (L.v2) this.statics.glow = this.buildGlowLayer(w, h);
  }

  // Studiohuset i canvasläget: rumsljus, neonglöd och fönsterglans i full styrka i ett eget lager (additivt, tonas med natten).
  // Samma ljuskällor (L.lights) som HD-ljuset, bara ritade som mjuka fält istället för beräknade per pixel.
  buildGlowLayer(w, h) {
    const L = this.L;
    const c = cv(w, h);
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    const ox = w / 2;
    const oy = h;
    for (const l of L.lights) {
      const rgb = l.c.map((v) => Math.round(v * 255)).join(',');
      const k = l.kind || 0;
      if (k === 1) {
        glow(g, ox + l.x, oy + l.y, l.r * 0.9, l.r * 0.5, rgb, 0.17 * l.i, 5);
        continue;
      }
      const room = L.rooms.find((r) => r.floor === l.floor && l.x >= r.x0 && l.x < r.x1);
      g.save();
      g.beginPath();
      if (room) g.rect(ox + room.x0, oy + l.y0, room.w, l.y1 - l.y0);
      else g.rect(ox + l.x - l.r, oy + l.y0, l.r * 2, l.y1 - l.y0);
      g.clip();
      if (k === 0) glow(g, ox + l.x, oy + l.y + 10, l.r, (l.y1 - l.y0) * 0.7, rgb, 0.2 * l.i, 6);
      else glow(g, ox + l.x, oy + l.y, l.r * 0.9, l.r * 0.7, rgb, 0.16 * l.i, 4);
      g.restore();
    }
    this.windowGlow(g, ox, oy, 1, false);
    return c;
  }

  // Fönsterglans: rummets ljus speglas i rutan (svagt färgat fält) och diagonala ljusstreck. a = styrka 0..1.
  // bloom = HD-ljuset: två streck som blommar, i canvasläget ett enda så att rutorna inte blir brusiga.
  windowGlow(ctx, ox, oy, a, bloom = true) {
    const L = this.L;
    for (const [x, y, w, h, f] of this.statics.holes) {
      const room = L.rooms.find((r) => r.floor === f && x + w / 2 >= r.x0 && x + w / 2 < r.x1);
      const c = room ? room.lightRGB.join(',') : '255,220,160';
      ctx.fillStyle = `rgba(${c},${0.1 * a})`;
      ctx.fillRect(ox + x, oy + y, w, h);
      ctx.fillStyle = `rgba(${c},${0.2 * a})`;
      ctx.fillRect(ox + x, oy + y + h - 2, w, 2);
      ctx.fillStyle = `rgba(255,244,214,${0.55 * a})`;
      const len = Math.min(9, h - 4);
      for (let i = 0; i < len; i++) {
        ctx.fillRect(ox + x + 3 + Math.round(i * 0.55), oy + y + h - 3 - i, 1, 1);
        if (bloom && w > 12 && i < len - 3) ctx.fillRect(ox + x + 8 + Math.round(i * 0.55), oy + y + h - 3 - i, 1, 1);
      }
    }
  }

  // ── Aktörer ──
  syncActors(first) {
    const G = this.G;
    const L = this.L;
    const ids = new Set(G.staff.map((s) => s.id));
    // den som slutar (eller blir VD för ett dotterbolag) går ut med en flyttlåda
    for (const [id, a] of this.actors) if (!ids.has(id) && !a.leaving) a.leaving = a.box = true;
    // Studiohuset: personalen fördelas över våningarna (behavior.js), annars i skrivbordsordning
    const order = this.crowd ? this.crowd.nav.order : null;
    G.staff.forEach((st, i) => {
      let a = this.actors.get(st.id);
      const di = order ? order[i] : i;
      const desk = L.desks[di];
      if (!desk) return;
      if (!a) {
        a = {
          id: st.id, desk: di, x: desk.x + 5, fy: desk.fy, floor: desk.floor, dir: 1,
          pose: 'sit', frame: 0, t: Math.random() * 3, state: 'work', target: null, timer: 1 + Math.random() * 4, blink: 0, say: null,
        };
        if (this.crowd) {
          // v2: bana (ly), sittande, gånghastighet, skrivbordspose, väntetid mellan aktiviteter och emotes
          Object.assign(a, {
            ly: 0, seated: true, spd: 0.92 + (st.id % 7) * 0.03, deskT: Math.random() * 4, deskPose: null,
            cool: 3 + Math.random() * 8, emoCool: 6 + Math.random() * 20, hello: 0, walkT: 0, carry: false, act: null, m: null,
          });
        }
        if (!first) {
          a.x = L.left - 6;
          a.state = 'enter';
          a.pose = 'walk';
          a.box = true; // nyanställda kommer in med en flyttlåda
        }
        this.actors.set(st.id, a);
      } else if (a.desk !== di) {
        if (this.crowd) detach(this.crowd, this, a);
        a.desk = di;
        a.fy = desk.fy;
        a.floor = desk.floor;
        a.state = a.state === 'work' ? 'work' : 'walkto';
      }
    });
    for (const [id, a] of this.actors) {
      if (a.leaving && (a.x < L.left - 12 || !ids.has(id) === false)) {
        if (this.crowd) detach(this.crowd, this, a);
        this.actors.delete(id);
      }
    }
  }

  deskX(a) {
    return this.L.desks[a.desk].x + 5;
  }

  facilityPoint(id, floorOnly = null) {
    const G = this.G;
    const f = G.office.fac[id];
    if (!f) return null;
    const slot = this.L.slots[f.slot];
    if (!slot) return null;
    if (floorOnly != null && slot.floor !== floorOnly) return null;
    return { x: slot.x + 14, fy: slot.fy, floor: slot.floor };
  }

  updateActors(dt) {
    if (this.crowd) return updateCrowd(this, dt);
    const G = this.G;
    const L = this.L;
    this.syncActors(false);
    const working = !!G.job && !this.paused;
    for (const a of this.actors.values()) {
      const st = G.staff.find((s) => s.id === a.id);
      a.t += dt;
      a.blink = (a.t * 10) % 40 < 1 ? 1 : 0;
      if (a.leaving) {
        a.state = 'leave';
      }
      const trainingNow = st && st.trainUntil > G.t;
      const dx = this.deskX(a);
      if (a.state === 'enter' || a.state === 'walkto' || a.state === 'leave' || a.state === 'go') {
        const tx = a.state === 'leave' ? L.left - 14 : a.state === 'go' ? a.target.x : dx;
        const v = 26 * dt;
        const d = tx - a.x;
        a.dir = d >= 0 ? 1 : -1;
        a.pose = 'walk';
        a.frame = Math.floor(a.t * 7) % 4;
        if (Math.abs(d) <= v) {
          a.x = tx;
          if (a.state === 'leave') {
            this.actors.delete(a.id);
            continue;
          }
          if (a.state === 'go') {
            a.state = 'at';
            a.timer = 2 + Math.random() * 3;
            a.pose = a.target.pose || 'stand';
            a.dir = a.target.dir || 1;
          } else {
            a.state = 'work';
            a.dir = 1;
          }
        } else a.x += Math.sign(d) * v;
        continue;
      }
      if (a.state === 'at') {
        a.timer -= dt;
        if (a.timer <= 0) a.state = 'walkto';
        a.pose = a.target.pose || 'stand';
        a.frame = Math.floor(a.t * 3) % 2;
        continue;
      }
      // vid skrivbordet
      a.x = dx;
      a.dir = 1;
      if (this.celebrate > 0) {
        a.pose = 'cheer';
        a.frame = Math.floor(a.t * 5) % 2;
        continue;
      }
      if (trainingNow) {
        a.pose = 'read';
        a.frame = 0;
        continue;
      }
      a.timer -= dt;
      if (working) {
        if (a.pose === 'drink') {
          if (a.timer <= 0) {
            a.pose = 'sit';
            a.timer = 4 + Math.random() * 8;
          }
        } else {
          a.pose = 'sit';
          a.frame = Math.floor(a.t * 6.5 + a.id) % 2;
          if (a.timer <= 0) {
            if (Math.random() < 0.3) {
              a.pose = 'drink';
              a.timer = 1.6;
            } else a.timer = 3 + Math.random() * 8;
            if (Math.random() < 0.16 && this.facilityPoint('coffee', a.floor)) {
              a.state = 'go';
              a.target = { ...this.facilityPoint('coffee', a.floor), pose: 'drink' };
            }
          }
        }
      } else {
        const mood = st ? st.mood : 70;
        if (a.pose === 'sit' || a.pose === 'drink' || !['sitIdle', 'think', 'read', 'sleep'].includes(a.pose)) {
          a.pose = 'sitIdle';
          a.timer = 2 + Math.random() * 4;
        }
        if (a.timer <= 0) {
          const r = Math.random();
          const opts = ['sitIdle', 'think', 'read'];
          if (mood < 28) opts.push('sleep', 'sleep');
          a.pose = opts[Math.floor(Math.random() * opts.length)];
          a.timer = 3 + Math.random() * 6;
          if (r < 0.14) {
            // i spelrummet spelar man på arkadmaskinen (vänd mot den) när den ritade spelposen finns
            const t = ['coffee', 'gameroom', 'training', 'lab']
              .map((id) => {
                const p = this.facilityPoint(id, a.floor);
                return p && id === 'gameroom' && getSprite('char.play') ? { ...p, x: p.x + 7, dir: -1, play: true } : p;
              })
              .filter(Boolean);
            if (t.length) {
              a.state = 'go';
              const p = t[Math.floor(Math.random() * t.length)];
              a.target = { ...p, pose: Math.random() < 0.5 ? 'drink' : 'stand' };
              if (p.play) a.target.pose = 'play';
            }
          }
        }
      }
    }
  }

  updateCat(dt) {
    const L = this.L;
    const c = this.cat;
    const lo = L.left + 10;
    const hi = L.left + L.IW - 24;
    c.x = Math.max(lo, Math.min(hi, c.x));
    c.timer -= dt;
    if (c.state === 'walk') {
      const d = c.target - c.x;
      c.dir = d >= 0 ? 1 : -1;
      c.frame = Math.floor(this.time * 6);
      if (Math.abs(d) < 1.5) {
        c.state = Math.random() < 0.55 ? 'sit' : 'sleep';
        c.timer = c.state === 'sleep' ? 9 + Math.random() * 14 : 3 + Math.random() * 5;
      } else c.x += Math.sign(d) * 14 * dt;
    } else if (c.timer <= 0) {
      c.state = 'walk';
      c.target = lo + Math.random() * (hi - lo);
    } else c.frame = Math.floor(this.time * 1.5);
    // skorstensrök (garaget)
    if (L.roof === 'garage') {
      this.smokeT -= dt;
      const winter = this.G && (dateOf(this.G.t).month >= 11 || dateOf(this.G.t).month <= 1);
      if (this.smokeT <= 0) {
        this.smokeT = winter ? 0.28 : 1.1;
        this.smoke.push({ x: L.BW / 2 - 36, y: L.topY - 28, vx: 3 + Math.random() * 3, vy: -7 - Math.random() * 3, life: 3.2, max: 3.2 });
      }
    }
    for (const s of this.smoke) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this.smoke = this.smoke.filter((s) => s.life > 0);
  }

  // ── Effekter ──
  float(kind, staffId, amount) {
    const a = this.actors.get(staffId);
    if (!a || !this.L) return;
    if (this.time - (a.lastFloat || 0) < 0.55) return;
    a.lastFloat = this.time;
    const colors = { design: '#7cd6ff', tech: '#8aff9a', bug: '#ff7a6a', fix: '#8aff9a', spark: '#ffe27a', rp: '#d8a8ff', money: '#8aff9a' };
    const sign = kind === 'fix' ? '-' : '+';
    const label = kind === 'spark' ? '*' + amount : sign + amount;
    // idéer och buggar syns också som bubblor över huvudet (Studiohuset)
    if (this.crowd && kind === 'spark') this.emote(staffId, 'bulb', undefined, true);
    else if (this.crowd && kind === 'bug' && Math.random() < 0.35) this.emote(staffId, Math.random() < 0.5 ? 'exclam' : 'sweat', undefined, true);
    this.floaters.push({
      x: a.x + 3 + (Math.random() * 10 - 5),
      y: a.fy - 31,
      vy: -10 - Math.random() * 2,
      text: label,
      color: colors[kind] || '#ffffff',
      life: 1.5,
      max: 1.5,
      kind,
    });
  }
  // Startar en aktivitet direkt på en våning (utvecklarverktyg/tester): scene.forceAct('meeting', 1, 4)
  forceAct(kind, floor, n = 0) {
    return this.crowd ? forceAct(this, kind, floor, n) : false;
  }
  // Ett handslag när en affär blir klar (uppköp, förlagsavtal, licensaffär): mötesrummen först, sedan lobbyn
  deal() {
    if (!this.crowd) return false;
    const n = this.crowd.nav.floors.length;
    for (let i = 1; i <= n; i++) if (forceAct(this, 'deal', i % n, 2)) return true;
    return false;
  }

  // Pratbubbla över en aktör. Högst tre samtidigt (fyra för händelser), en per person och inte två intill varandra.
  emote(id, kind, life, force = false) {
    const a = this.actors.get(id);
    if (!a || a.leaving || !EMOTE_LIFE[kind]) return false;
    if (this.emotes.length >= (force ? 4 : 3) || this.emotes.some((e) => e.id === id)) return false;
    for (const e of this.emotes) {
      const o = this.actors.get(e.id);
      if (o && o.floor === a.floor && Math.abs(o.x - a.x) < 16) return false;
    }
    this.emotes.push({ id, kind, t: 0, life: life ?? EMOTE_LIFE[kind] });
    return true;
  }
  // Intäkter: ovanför taket (inte över skylten), i turordning över fem spår så att samtidiga belopp inte hamnar på varandra; högst tre åt gången.
  moneyPop(text) {
    if (!this.L) return;
    const pops = this.floaters.filter((f) => f.kind === 'money');
    if (pops.length >= 3) this.floaters.splice(this.floaters.indexOf(pops[0]), 1);
    this.popLane = ((this.popLane ?? -1) + 1) % 5;
    const x = [-0.28, 0.14, -0.06, 0.32, 0.04][this.popLane] * this.L.BW;
    let y = this.L.topY - Math.min(this.L.roofH || 20, 30) - 10;
    for (const f of pops) if (Math.abs(f.x - x) < textWidth(text) + 6 && Math.abs(f.y - y) < 9) y = Math.min(y, f.y - 9);
    this.floaters.push({ x, y, vy: -8, text, color: '#8aff9a', life: 2.2, max: 2.2, kind: 'money' });
  }
  confetti(n = 80) {
    const iw = this.iw;
    for (let i = 0; i < n; i++) {
      this.fx.push({ t: 'conf', x: iw / 2 + (Math.random() - 0.5) * this.L.W, y: this.groundY - this.L.H - 10 - Math.random() * 20, vx: (Math.random() - 0.5) * 30, vy: 10 + Math.random() * 30, c: ['#ff5c9d', '#ffd66a', '#7cf2ff', '#8aff9a', '#d8a8ff', '#ff8a4a'][i % 6], life: 3 + Math.random() * 2, s: Math.random() < 0.3 ? 2 : 1, w: Math.random() * 6 });
    }
  }
  fireworks(n = 4) {
    for (let k = 0; k < n; k++) {
      const delay = k * 0.45;
      const cx = this.iw / 2 + (Math.random() - 0.5) * this.L.W * 1.2;
      const cy = this.groundY - this.L.H - 20 - Math.random() * 50;
      const color = ['#ff5c9d', '#ffd66a', '#7cf2ff', '#8aff9a', '#d8a8ff'][Math.floor(Math.random() * 5)];
      this.fx.push({ t: 'fwlaunch', x: cx, y: this.groundY - 10, ty: cy, vy: -90, delay, color });
    }
  }
  celebrateNow(sec = 3.2) {
    this.celebrate = sec;
  }
  shakeNow(v = 1) {
    this.shake = Math.max(this.shake, v);
  }

  updateFx(dt) {
    for (const f of this.floaters) {
      f.y += f.vy * dt;
      f.vy *= 0.97;
      f.life -= dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const e of this.emotes) e.t += dt;
    if (this.emotes.length) this.emotes = this.emotes.filter((e) => e.t < e.life && this.actors.has(e.id));
    const add = [];
    for (const p of this.fx) {
      if (p.t === 'conf') {
        p.x += p.vx * dt + Math.sin(p.w) * 6 * dt;
        p.w += dt * 6;
        p.y += p.vy * dt;
        p.life -= dt;
      } else if (p.t === 'fwlaunch') {
        if (p.delay > 0) {
          p.delay -= dt;
          continue;
        }
        p.y += p.vy * dt;
        if (p.y <= p.ty) {
          p.dead = true;
          for (let i = 0; i < 34; i++) {
            const ang = (i / 34) * Math.PI * 2;
            const sp = 28 + Math.random() * 18;
            add.push({ t: 'spark', x: p.x, y: p.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1.1 + Math.random() * 0.5, max: 1.4, c: p.color });
          }
        }
      } else if (p.t === 'spark') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 38 * dt;
        p.vx *= 0.985;
        p.life -= dt;
      }
    }
    this.fx = this.fx.filter((p) => !p.dead && (p.life === undefined || p.life > 0)).concat(add);
  }

  // ── Uppdatering ──
  update(dt) {
    const G = this.G;
    if (!G || !this.L) return;
    this.time += dt;
    const d = dateOf(G.t);
    this.world.update(dt, { speed: this.speed, paused: this.paused, month: d.month, reduced: this.reduced, todLock: this.todLock, weatherLock: this.weatherLock });
    this.updateActors(dt);
    this.updateCat(dt);
    this.updateFx(dt);
    this.celebrate = Math.max(0, this.celebrate - dt);
    this.fade = Math.max(0, this.fade - dt * 2.4);
    this.shake = Math.max(0, this.shake - dt * 3);
  }

  // ── Ritning ──
  draw() {
    const G = this.G;
    const L = this.L;
    if (!G || !L || !this.objA) return;
    this.buildStatics();
    if (this.glOn) {
      this.drawGL();
      if (!this.dual) return;
    }
    const ctx = this.ctx;
    const A = this.objA.getContext('2d');
    const B = this.objB.getContext('2d');
    const iw = this.iw;
    const ih = this.ih;
    const gy = this.groundY;
    const cx = Math.round(iw / 2);
    const wd = this.world;
    const info = wd.info();
    const night = info.night;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    // himmel
    wd.drawSky(ctx);

    const am = info.amb;
    const ambient = `rgb(${am[0] | 0},${am[1] | 0},${am[2] | 0})`;
    // Byggnadens insida lyses upp av lampor: ljusare ambient på natten.
    const k = clamp(night * 0.8, 0, 0.8);
    const warm = L.v2 ? [196, 176, 164] : [255, 230, 200]; // Studiohuset: mörkare insida så att rumsljusen syns
    const ambientB = `rgb(${(am[0] + (warm[0] - am[0]) * k) | 0},${(am[1] + (warm[1] - am[1]) * k) | 0},${(am[2] + (warm[2] - am[2]) * k) | 0})`;
    const sx = this.shake > 0 && !this.reduced ? Math.round((Math.random() - 0.5) * 2 * this.shake * 2) : 0;
    const sy = this.shake > 0 && !this.reduced ? Math.round((Math.random() - 0.5) * 2 * this.shake * 2) : 0;
    const tint = (src, tmp, amb) => {
      const T = tmp.getContext('2d');
      T.setTransform(1, 0, 0, 1, 0, 0);
      T.globalCompositeOperation = 'source-over';
      T.clearRect(0, 0, iw, ih);
      T.drawImage(src, 0, 0);
      T.globalCompositeOperation = 'multiply';
      T.fillStyle = amb;
      T.fillRect(0, 0, iw, ih);
      T.globalCompositeOperation = 'destination-in';
      T.drawImage(src, 0, 0);
      T.globalCompositeOperation = 'source-over';
      ctx.drawImage(tmp, sx, sy);
    };

    // bakgrund: stadens silhuett
    const BG = this.bgA.getContext('2d');
    BG.setTransform(1, 0, 0, 1, 0, 0);
    BG.clearRect(0, 0, iw, ih);
    wd.drawBackdrop(BG);
    tint(this.bgA, this.bgB, ambient);
    ctx.globalCompositeOperation = 'lighter';
    wd.drawLitWindows(ctx, night);
    ctx.globalCompositeOperation = 'source-over';

    // förgrund 1: mark och träd (bakom huset)
    const clearA = () => {
      A.setTransform(1, 0, 0, 1, 0, 0);
      A.globalCompositeOperation = 'source-over';
      A.clearRect(0, 0, iw, ih);
    };
    clearA();
    wd.drawGround(A);
    wd.drawTrees(A);
    tint(this.objA, this.objB, ambient);
    // förgrund 2: huset med människor
    clearA();
    const st = this.statics;
    A.drawImage(st.layer, cx - st.w / 2, gy - st.h);
    this.drawDynamic(A, cx, gy, night);
    tint(this.objA, this.objB, ambientB);
    // förgrund 3: gata (lyktstolpar, bilar, fotgängare)
    clearA();
    wd.drawStreetFront(A, night);
    tint(this.objA, this.objB, ambient);
    void B;

    // ljus (additivt)
    ctx.globalCompositeOperation = 'lighter';
    this.drawLights(ctx, cx, gy, night, info);
    ctx.globalCompositeOperation = 'source-over';

    wd.drawWeather(ctx);

    // flytande tal, bubblor och partiklar
    this.drawFloaters(ctx);
    this.drawEmotes(ctx);
    this.drawFx(ctx);

    if (this.fade > 0) {
      ctx.fillStyle = `rgba(8,10,24,${this.fade})`;
      ctx.fillRect(0, 0, iw, ih);
    }
    // hover-ring
    if (this.hover && this.hover.type === 'staff') {
      const a = this.actors.get(this.hover.id);
      if (a) this.drawOutline(ctx, cx + a.x - 9, gy + a.fy - 30, 19, 31);
    }
    if (this.hover && this.hover.type === 'slot') {
      const s = this.L.slots[this.hover.idx];
      this.drawOutline(ctx, cx + s.x - 1, gy + s.fy - (this.L.intH ?? INT_H), s.w + 2, this.L.intH ?? INT_H);
    }
  }

  drawOutline(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const c = 3;
    for (const [dx, dy, ww, hh] of [[0, 0, c, 1], [0, 0, 1, c], [w - c, 0, c, 1], [w - 1, 0, 1, c], [0, h - 1, c, 1], [0, h - c, 1, c], [w - c, h - 1, c, 1], [w - 1, h - c, 1, c]]) ctx.fillRect(Math.round(x + dx), Math.round(y + dy), ww, hh);
  }

  // Sitter någon vid skrivbordet och tittar på skärmen? (v2: alla vid skrivbordet utom de som sover, läser, vilar eller hälsar)
  screenLive(a) {
    return this.crowd ? a.state === 'work' && !DESK_IDLE.has(a.pose) : a.pose === 'sit' || a.pose === 'drink';
  }

  // Står någon vid en disk (receptionen på nivå 5) målas diskens front från det statiska lagret igen ovanpå personen,
  // bara inom personens bredd, så att den syns bakom disken
  drawFront(A, a, cx, gy) {
    const s = a.m.s;
    const st = this.statics;
    const room = s && st && this.L.rooms.find((r) => r.id === s.room);
    const fr = room && FRONT[room.def];
    if (!fr || Math.abs(a.x - s.x) > 0.5) return;
    const x0 = Math.round(a.x) - 9;
    const x1 = Math.round(a.x) + 9;
    for (const [x, y, w, h] of fr(room.x0, s.fy)) {
      const l = Math.max(x, x0);
      const r = Math.min(x + w, x1);
      if (r > l) A.drawImage(st.layer, l + st.w / 2, y + st.h, r - l, h, cx + l, gy + y, r - l, h);
    }
  }

  drawDynamic(A, cx, gy, night) {
    const G = this.G;
    const L = this.L;
    const era = eraOf(yearOf(G.t));
    const working = !!G.job && !this.paused;
    const occupied = new Map();
    const live = new Map();
    for (const a of this.actors.values()) {
      if (a.state === 'work' || (!this.crowd && a.pose === 'sit')) occupied.set(a.desk, a);
      if (this.screenLive(a)) live.set(a.desk, a);
    }
    // skärmar
    const tt = Math.floor(this.time * 7);
    for (const d of L.desks) {
      const a = occupied.get(d.idx);
      const bx = cx + d.x + 3;
      const by = gy + d.fy - 12;
      let cols;
      if (a && working && live.has(d.idx)) cols = ['#7cf2ff', '#3fd8a8', '#9ab8ff', '#e8f4ff'];
      else if (a) cols = ['#2a6a7a', '#245a6a'];
      else cols = ['#101820'];
      const strip = era === 2 ? [bx + 15, by - 13, 1, 10] : era === 1 ? [bx + 11, by - 11, 1, 7] : [bx + 11, by - 10, 1, 6];
      for (let r = 0; r < strip[3]; r++) {
        A.fillStyle = cols[(r + tt + d.idx) % cols.length];
        A.fillRect(strip[0], strip[1] + r, 1, 1);
      }
      // skrivbordskant som speglar skärmen
      if (a && working && live.has(d.idx)) {
        A.fillStyle = 'rgba(124,242,255,0.35)';
        A.fillRect(bx + 4, by - 2, 7, 1);
      }
    }
    // Studiohuset (v2): serverdioder, andra skärmar, neon och ljusslinga (rooms.js), glasdörrar och fönsterglans
    if (L.v2) {
      drawRoomsDynamic(A, cx, gy, L, this.time, night, { occupied: working ? live : new Map(), working, era, reduced: this.reduced });
      const st = this.statics;
      if (this.crowd && st) drawDoors(A, this.crowd, cx, gy, st.layer, st.w, st.h);
      if (this.glOn && night > 0.05 && st) this.windowGlow(A, cx, gy, clamp(night * 1.1, 0, 1)); // HD-ljuset: glansen blommar via bloom
    }
    // aktörer (längre fram = närmare betraktaren: gående ritas en pixel lägre och ovanpå dem som sitter)
    const acts = [...this.actors.values()].sort((p, q) => p.floor - q.floor || Math.round(p.ly || 0) - Math.round(q.ly || 0) || p.x - q.x);
    for (const a of acts) {
      const sm = this.G.staff.find((s) => s.id === a.id);
      const look = sm?.look || { skin: 1, hair: 1, hairColor: 1, shirt: 1, pants: 1, acc: 0 };
      const opts = this.crowd
        ? { blink: a.blink, t: a.t, seated: a.seated, mood: sm ? sm.mood : undefined }
        : { blink: a.blink, t: a.t, seated: a.state === 'work' && a.pose === 'drink' };
      const px = cx + a.x;
      const py = gy + a.fy + Math.round(a.ly || 0);
      // spritens rutor förskjuts per person så att alla i samma pose inte byter ruta samtidigt
      // den som bär laptopen till racket har posen 'laptop' även när den går (people.js ritar då gången med laptop)
      const sp = a.carry && a.pose === 'laptop' && a.state !== 'at' ? 'walkLaptop' : a.box && a.pose === 'walk' ? 'walkBox' : a.cup && a.pose === 'walk' ? 'walkCup' : a.pose;
      // i handslaget pumpar båda på samma ruta (aktivitetens klocka), annars skulle händerna glida isär
      const st = sp === 'shake' && a.act ? a.act.t : sp === 'stretch' ? a.t - (a.stretchT0 || 0) : a.t + ((a.id | 0) % 7) * 0.37;
      const spr = drawPoseSprite(A, px, py, look, sp, st, a.dir, opts.seated);
      if (!spr) drawPerson(A, px, py, look, a.pose, a.frame, a.dir, opts);
      if (a.state === 'at' && a.m) this.drawFront(A, a, cx, gy);
      if (a.pose === 'sleep') {
        // spritens huvud vilar mot bordet, lägre än den procedurella figurens
        const z = Math.floor(this.time * 2) % 3;
        drawText(A, 'Z', cx + a.x + 6 + z * 2, gy + a.fy - (spr ? 26 : 32) - z * 3, '#cfe0ff', 1, 'rgba(14,18,40,0.75)');
      }
    }
    // katten
    if (this.L.tier >= 0) drawCat(A, cx + this.cat.x, gy + (-4), this.cat.state, this.cat.frame, this.cat.dir, this.cat.kind);
    if (this.cat.state === 'sleep') drawText(A, 'Z', cx + this.cat.x + 6, gy - 16 - (Math.floor(this.time * 2) % 3) * 2, '#cfe0ff', 1, 'rgba(14,18,40,0.75)');
    // skorstensrök
    for (const s of this.smoke) {
      const k = s.life / s.max;
      A.fillStyle = `rgba(225,230,240,${0.5 * k})`;
      const sz = k > 0.6 ? 2 : k > 0.3 ? 3 : 4;
      A.fillRect(Math.round(cx + s.x), Math.round(gy + s.y), sz, sz);
    }
    // kaffeånga
    const cf = G.office.fac.coffee;
    if (cf && this.L.slots[cf.slot]) {
      const s = this.L.slots[cf.slot];
      for (let i = 0; i < 3; i++) {
        const ph = (this.time * 0.8 + i * 0.33) % 1;
        A.fillStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`;
        A.fillRect(cx + s.x + 9 + Math.sin(ph * 6 + i) * 1.5, gy + s.fy - 24 - ph * 8, 1, 2);
      }
    }
    // server-lysdioder animeras via statiskt lager (enkelt)
    void night;
  }


  drawLights(ctx, cx, gy, night, info) {
    const L = this.L;
    const G = this.G;
    if (L.v2) {
      // Studiohuset: färgade rumsljus, neon och fönsterglans (förberäknat lager)
      const gl = this.statics && this.statics.glow;
      if (gl && night > 0.02) {
        ctx.globalAlpha = clamp(night * 1.15, 0, 1);
        ctx.drawImage(gl, cx - this.statics.w / 2, gy - this.statics.h);
        ctx.globalAlpha = 1;
      }
    } else if (night > 0.02) {
      // lampkäglor
      for (let f = 0; f < L.floors; f++) {
        const fy = gy - 4 - f * (L.pitch ?? PITCH);
        const n = Math.floor(L.IW / 56);
        for (let l = 0; l < n; l++) {
          const lx = cx + Math.round(L.left + 28 + l * (L.IW / n)) + 2;
          ctx.fillStyle = `rgba(255,214,150,${0.1 * night})`;
          ctx.fillRect(lx - 3, fy - (L.intH ?? INT_H) + 6, 7, 3);
          ctx.fillRect(lx - 7, fy - (L.intH ?? INT_H) + 9, 15, 8);
          ctx.fillRect(lx - 12, fy - (L.intH ?? INT_H) + 17, 25, 12);
          ctx.fillRect(lx - 16, fy - (L.intH ?? INT_H) + 29, 33, 11);
        }
      }
    }
    // skärmsken
    const working = !!G.job && !this.paused;
    for (const a of this.actors.values()) {
      if (!(working && (this.crowd ? this.screenLive(a) : a.pose === 'sit'))) continue;
      const d = L.desks[a.desk];
      if (!d) continue;
      const bx = cx + d.x + 3 + 12;
      const by = gy + d.fy - 21;
      const k = 0.07 + 0.05 * Math.sin(this.time * 9 + a.id);
      ctx.fillStyle = `rgba(110,220,255,${k * (0.7 + night * 0.9)})`;
      ctx.fillRect(bx - 12, by - 4, 12, 14);
      ctx.fillStyle = `rgba(110,220,255,${k * 0.7 * (0.7 + night)})`;
      ctx.fillRect(bx - 16, by - 2, 4, 10);
    }
    // skylt-glöd (Studiohusets skylt lyser via L.lights)
    if (night > 0.1 && !L.v2) {
      const topY = gy + L.topY;
      glow(ctx, cx, topY - 22, 70, 22, '255,120,190', 0.16 * night, 4);
    }
    // gatlyktor
    if (night > 0.12) {
      for (const x of this.world.lamps) {
        glow(ctx, x - 3, gy - 34, 26, 20, '255,222,150', 0.32 * night, 5);
        glow(ctx, x - 3, gy - 6, 24, 8, '255,222,150', 0.16 * night, 3);
      }
    }
    // billyktor
    if (night > 0.12) {
      for (const c of this.world.cars) {
        const len = vehicleSize(c).w;
        const y = gy + this.world.laneY(c);
        const front = Math.round(c.x) + c.dir * (len - 1);
        const rear = Math.round(c.x);
        const lampY = y - (c.type === 'bus' ? 7 : c.type === 'truck' ? 9 : 8);
        glow(ctx, front + c.dir * 14, lampY + 1, 26, 7, '255,244,190', 0.34 * night, 4);
        glow(ctx, front + c.dir * 4, lampY, 6, 4, '255,250,215', 0.45 * night, 3);
        glow(ctx, rear - c.dir * 2, lampY, 5, 3, '255,60,60', 0.35 * night, 3);
        // ljus på asfalten framför bilen
        glow(ctx, front + c.dir * 22, y - 1, 24, 4, '255,240,180', 0.14 * night, 3);
      }
    }
    // solnedgångsglöd
    const sun = this.world.sun;
    if (sun && sun.low > 0.35) {
      const a = (sun.low - 0.35) * 0.5;
      glow(ctx, sun.x, sun.y, 130, 72, '255,150,80', 0.3 * a * 2, 12);
      glow(ctx, sun.x, sun.y, 52, 30, '255,200,120', 0.34 * a * 2, 8);
    }
    void info;
  }

  drawFloaters(ctx) {
    for (const f of this.floaters) {
      const a = clamp(f.life / 0.5, 0, 1);
      const x = Math.round(this.iw / 2 + f.x - textWidth(f.text) / 2);
      const y = Math.round(this.groundY + f.y);
      ctx.globalAlpha = a;
      drawTextOutlined(ctx, f.text, x, y, f.color);
      ctx.globalAlpha = 1;
    }
  }

  // Pratbubblor ovanför huvudet (emotes.js). Ritas efter ljuset så att de aldrig dämpas av natten.
  drawEmotes(ctx) {
    if (!this.emotes.length) return;
    const cx = Math.round(this.iw / 2);
    for (const e of this.emotes) {
      const a = this.actors.get(e.id);
      if (!a) continue;
      drawEmote(ctx, cx + a.x, this.groundY + a.fy + Math.round(a.ly || 0) - (a.seated ? 32 : 34), e.kind, e.t, e.life, this.time);
    }
  }

  drawFx(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.fx) {
      if (p.t === 'spark') {
        ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
        if (p.life > p.max * 0.7) ctx.fillRect(Math.round(p.x) - p.vx * 0.02, Math.round(p.y) - p.vy * 0.02, 1, 1);
      } else if (p.t === 'fwlaunch' && p.delay <= 0) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff4c0';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 4);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (const p of this.fx) {
      if (p.t !== 'conf') continue;
      ctx.fillStyle = p.c;
      const w = Math.abs(Math.sin(p.w)) > 0.5 ? p.s + 1 : p.s;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), w, p.s);
    }
  }

  // ── Interaktion ──
  toWorld(px, py) {
    const x = px / this.scale - this.iw / 2;
    const y = py / this.scale - this.groundY;
    return { x, y };
  }
  pick(px, py) {
    if (!this.L) return null;
    const { x, y } = this.toWorld(px, py);
    for (const a of this.actors.values()) {
      if (x >= a.x - 8 && x <= a.x + 9 && y >= a.fy - 30 && y <= a.fy + 1) return { type: 'staff', id: a.id };
    }
    for (const s of this.L.slots) {
      if (x >= s.x && x <= s.x + s.w && y >= s.fy - (this.L.intH ?? INT_H) && y <= s.fy) return { type: 'slot', idx: s.idx };
    }
    if (x >= -this.L.BW / 2 && x <= this.L.BW / 2 && y >= this.L.topY - 60 && y <= 0) return { type: 'building' };
    return null;
  }
}

Object.assign(Scene.prototype, glMethods);
