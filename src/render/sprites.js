// Sprites (t.ex. från PixelLab) som kan ersätta den procedurella grafiken. Allt har en reserv: finns ingen sprite ritas den gamla koden.
// Paketet kommer från assets/manifest.json via build.mjs (inbäddat som data-URI:er) och registreras av startkoden med registerSprites().
// Nyckelkonvention: 'prop.<funktion>' för möbler och växter (ritas vid (x, golvlinje)), 'veh.<typ>[.<epok>]' för fordon.
// Flera varianter av samma nyckel skrivs 'nyckel#0', 'nyckel#1', ... och väljs med ett index.
const sprites = new Map();
const variants = new Map();
let version = 0;
const listeners = [];

export function registerSprites(pack) {
  if (!pack || typeof Image === 'undefined') return Promise.resolve(0);
  const jobs = Object.entries(pack.images || {}).map(
    ([name, uri]) =>
      new Promise((res) => {
        const img = new Image();
        img.onload = () => {
          const e = (pack.sprites && pack.sprites[name]) || {};
          // crop [x, y, w, h] beskär genomskinliga kanter utan att röra originalfilen
          const [cx, cy, cw, ch] = e.crop || [0, 0, img.width, img.height];
          const fw = e.fw || cw;
          const fh = e.fh || ch;
          const c = document.createElement('canvas');
          c.width = cw;
          c.height = ch;
          c.getContext('2d').drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
          sprites.set(name, { c, fw, fh, ax: e.ax ?? Math.round(fw / 2), ay: e.ay ?? fh, frames: e.frames || 1, scale: e.scale || 1 });
          const base = name.split('#')[0];
          if (name.includes('#')) variants.set(base, (variants.get(base) || 0) + 1);
          res(1);
        };
        img.onerror = () => res(0);
        img.src = uri;
      }),
  );
  return Promise.all(jobs).then((r) => {
    version++;
    for (const fn of listeners) fn();
    return r.reduce((a, b) => a + b, 0);
  });
}

// Anropas när sprites har laddats, så att cachade lager (t.ex. byggnaden) kan ritas om.
export const onSpritesLoaded = (fn) => listeners.push(fn);
export const spritesVersion = () => version;
export const hasSprite = (name) => sprites.has(name) || variants.has(name);
export const spriteCount = () => sprites.size;
// Rå sprite (canvas, rutstorlek, ankare, frames, scale) för moduler som gör egna varianter, t.ex. färgbytta personer.
export const getSprite = (name) => sprites.get(name) || null;

// Ritar sprite 'name' med ankaret i (x, y). o.dir=-1 speglar, o.frame väljer ruta, o.variant väljer variant. Returnerar false om den saknas.
export function drawSprite(ctx, name, x, y, o = {}) {
  let s = sprites.get(name);
  if (!s && variants.has(name)) s = sprites.get(`${name}#${(o.variant || 0) % variants.get(name)}`);
  if (!s) return false;
  const f = (o.frame || 0) % s.frames;
  const dir = o.dir || 1;
  if (dir < 0) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(s.c, f * s.fw, 0, s.fw, s.fh, -(s.fw - s.ax), -s.ay, s.fw, s.fh);
    ctx.restore();
  } else ctx.drawImage(s.c, f * s.fw, 0, s.fw, s.fh, Math.round(x) - s.ax, Math.round(y) - s.ay, s.fw, s.fh);
  return true;
}

// Genväg för möbler: sprite 'prop.<namn>' vid (x, golvlinje).
export const spr = (ctx, name, x, fy, o) => (sprites.size ? drawSprite(ctx, 'prop.' + name, x, fy, o) : false);

// Helbakgrund (t.ex. 'bg.skyline-dusk'): ritas 1:1 med nederkanten vid markens kant, speglas åt sidorna så att den räcker över bredden,
// (dx flyttar bilden i sidled, t.ex. så att luftskeppet hamnar bredvid titeln) och tonas ut uppåt i bildens toppfärg om scenen är högre än bilden. Det färdiga lagret sparas tills måtten ändras.
const covers = new Map();
export function drawBackdropCover(ctx, name, W, bottomY, dx = 0) {
  const s = sprites.get(name);
  if (!s || W <= 0 || bottomY <= 0) return false;
  const key = `${version}|${W}|${bottomY}|${dx}`;
  let e = covers.get(name);
  if (!e || e.key !== key) {
    const c = e ? e.c : document.createElement('canvas');
    c.width = W;
    c.height = bottomY;
    const g = c.getContext('2d');
    let off = bottomY - s.fh;
    if (off < 0) off = Math.min(0, off + 48); // låg scen: låt upp till 48 px av bildens fot gömmas bakom marken
    const x0 = Math.round((W - s.fw) / 2) + dx;
    // toppfärg: medelvärdet av de översta raderna
    const a = document.createElement('canvas');
    a.width = a.height = 1;
    const ag = a.getContext('2d');
    ag.drawImage(s.c, 0, 0, s.fw, 4, 0, 0, 1, 1);
    const [r, gr, b] = ag.getImageData(0, 0, 1, 1).data;
    const art = document.createElement('canvas');
    art.width = W;
    art.height = bottomY;
    const ig = art.getContext('2d');
    const n0 = -Math.ceil(Math.max(0, x0) / s.fw);
    for (let n = n0; x0 + n * s.fw < W; n++) {
      const x = x0 + n * s.fw;
      if (n % 2 !== 0) {
        ig.save();
        ig.translate(x + s.fw, off);
        ig.scale(-1, 1);
        ig.drawImage(s.c, 0, 0);
        ig.restore();
      } else ig.drawImage(s.c, x, off);
    }
    if (off > 0) {
      g.fillStyle = `rgb(${r},${gr},${b})`;
      g.fillRect(0, 0, W, off + 24);
      const f = ig.createLinearGradient(0, off, 0, off + 24);
      f.addColorStop(0, 'rgba(0,0,0,1)');
      f.addColorStop(1, 'rgba(0,0,0,0)');
      ig.globalCompositeOperation = 'destination-out';
      ig.fillStyle = f;
      ig.fillRect(0, off, W, 24);
      ig.fillStyle = '#000';
      ig.fillRect(0, 0, W, off);
      ig.globalCompositeOperation = 'source-over';
    }
    g.drawImage(art, 0, 0);
    e = { c, key };
    covers.set(name, e);
  }
  ctx.drawImage(e.c, 0, 0);
  return true;
}
