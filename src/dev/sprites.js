// Karaktärsark. dist/dev/sprites.html?view=poses|catalog|crowd|avatars|scene  &s=skala  &poses=walk,talk  &looks=0,1,2  &seated=1 (alla poser sittande)
// poses: alla poser x flera utseenden (alla rutor); catalog: frisyrer och tillbehör; crowd: slumpade utseenden;
// avatars: som gränssnittets avatarImg; scene: 1x och 2x mot ett rum.
import { drawPerson, POSES, POSE_FRAMES, HAIR_STYLES, avatarImg } from '../render/people.js';
import { randomLook } from '../sim/people.js';
import { seeded } from '../core/rng.js';

const q = new URLSearchParams(location.search);
const view = q.get('view') || 'poses';
const S = +(q.get('s') || 4);
const BG = q.get('bg') || '#8aa0c0';
document.body.style.cssText = 'margin:0;background:#1b1d28;color:#cfd6e8;font:12px/1.3 monospace';

const el = (tag, css, parent = document.body) => {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  parent.appendChild(e);
  return e;
};
const label = (txt, parent) => {
  const e = el('div', 'padding:2px 6px;color:#9fb0d0', parent);
  e.textContent = txt;
  return e;
};
// En ruta: liten canvas som skalas upp med pixelated.
function cell(look, pose, frame, scale, opts = {}, bg = BG) {
  const c = document.createElement('canvas');
  c.width = 30;
  c.height = 38;
  c.style.cssText = `width:${30 * scale}px;height:${38 * scale}px;image-rendering:pixelated;background:${bg};display:block`;
  const g = c.getContext('2d');
  drawPerson(g, 13, 35, look, pose, frame, opts.dir || 1, opts);
  return c;
}

// Handgjorda utseenden som visar upp fälten
const SHOW = [
  { skin: 1, hair: 3, hairColor: 1, shirt: 5, pants: 0, acc: 0, hat: 0, glasses: 1, beard: 0, headphones: 0, backpack: 0, hoodie: 1, pattern: 0 },
  { skin: 3, hair: 2, hairColor: 0, shirt: 8, pants: 5, acc: 0, hat: 0, glasses: 0, beard: 0, headphones: 1, backpack: 0, hoodie: 0, pattern: 1 },
  { skin: 0, hair: 0, hairColor: 2, shirt: 14, pants: 6, acc: 0, hat: 2, glasses: 0, beard: 2, headphones: 0, backpack: 1, hoodie: 0, pattern: 3 },
  { skin: 4, hair: 9, hairColor: 11, shirt: 3, pants: 4, acc: 0, hat: 0, glasses: 2, beard: 0, headphones: 0, backpack: 1, hoodie: 0, pattern: 2 },
  { skin: 2, hair: 7, hairColor: 5, shirt: 12, pants: 1, acc: 0, hat: 1, glasses: 3, beard: 1, headphones: 0, backpack: 0, hoodie: 0, pattern: 0 },
  { skin: 5, hair: 8, hairColor: 4, shirt: 16, pants: 3, acc: 0, hat: 3, glasses: 0, beard: 0, headphones: 0, backpack: 0, hoodie: 1, pattern: 0 },
];
const pick = (list, ids) => (ids ? ids.split(',').map((i) => list[+i]).filter(Boolean) : list);

if (view === 'poses') {
  const looks = pick(SHOW, q.get('looks') || '0,1,2').slice(0, 6);
  const names = q.get('poses') ? q.get('poses').split(',') : POSES;
  const wrap = el('div', 'display:flex;flex-direction:column;gap:6px;padding:8px');
  for (const p of names) {
    const row = el('div', 'display:flex;align-items:flex-end;gap:10px', wrap);
    const lb = el('div', `width:70px;color:#ffd77a;font-weight:bold`, row);
    lb.textContent = `${p} (${POSE_FRAMES[p]})`;
    for (const look of looks) {
      const col = el('div', 'display:flex;flex-direction:column;gap:2px', row);
      const grp = el('div', 'display:flex;gap:1px', col);
      for (let f = 0; f < POSE_FRAMES[p]; f++) grp.appendChild(cell(look, p, f, S, { t: f * 0.3, seated: !!q.get('seated') }));
      // samma rutor i 1x och 2x (så som de syns i spelet)
      const small = el('div', 'display:flex;gap:1px;align-items:flex-end', col);
      for (const sc of [1, 2]) {
        const g2 = el('div', 'display:flex;gap:1px;margin-right:6px', small);
        for (let f = 0; f < POSE_FRAMES[p]; f++) g2.appendChild(cell(look, p, f, sc, { t: f * 0.3, seated: !!q.get('seated') }));
      }
    }
  }
} else if (view === 'catalog') {
  const wrap = el('div', 'padding:8px');
  label('frisyrer 0-' + (HAIR_STYLES - 1) + ' (stand, tre hårfärger)', wrap);
  const r1 = el('div', 'display:flex;flex-wrap:wrap;gap:2px', wrap);
  for (let h = 0; h < HAIR_STYLES; h++) {
    r1.appendChild(cell({ skin: h % 5, hair: h, hairColor: [0, 2, 3, 5, 9, 11, 7, 1][h % 8], shirt: h + 2, pants: 0, acc: 0, hat: 0, glasses: 0, beard: 0, headphones: 0, backpack: 0, hoodie: 0, pattern: 0 }, 'stand', 0, S));
  }
  label('hår med mössa/keps/pannband (hat 1-3), samma frisyrer', wrap);
  const r2 = el('div', 'display:flex;flex-wrap:wrap;gap:2px', wrap);
  for (let h = 0; h < HAIR_STYLES; h++) {
    r2.appendChild(cell({ skin: h % 5, hair: h, hairColor: [2, 0, 3, 5][h % 4], shirt: h + 4, pants: 1, acc: 0, hat: 1 + (h % 3), glasses: 0, beard: 0, headphones: 0, backpack: 0, hoodie: 0, pattern: 0 }, 'stand', 0, S));
  }
  const feats = [
    ['glasses 1-3', (i) => ({ glasses: 1 + (i % 3) }), 6],
    ['hat 1-3', (i) => ({ hat: 1 + (i % 3) }), 6],
    ['beard 1-2 (+ glasögon)', (i) => ({ beard: 1 + (i % 2), glasses: i > 2 ? 1 : 0 }), 6],
    ['headphones / hoodie / backpack', (i) => [{ headphones: 1 }, { hoodie: 1 }, { backpack: 1 }, { headphones: 1, hat: 1 }, { hoodie: 1, backpack: 1 }, { hoodie: 1, hat: 2, glasses: 1 }][i], 6],
    ['pattern 1-3 och enfärgad', (i) => ({ pattern: i % 4, shirt: [0, 5, 3, 7, 9, 2][i] }), 6],
  ];
  for (const [name, fn, n] of feats) {
    label(name, wrap);
    const r = el('div', 'display:flex;flex-wrap:wrap;gap:2px', wrap);
    for (let i = 0; i < n; i++) {
      const look = { skin: (i * 2) % 7, hair: (i * 3 + 1) % HAIR_STYLES, hairColor: [0, 2, 1, 3, 4, 5][i], shirt: (i * 5 + 1) % 12, pants: i % 4, acc: 0, hat: 0, glasses: 0, beard: 0, headphones: 0, backpack: 0, hoodie: 0, pattern: 0, ...fn(i) };
      r.appendChild(cell(look, 'stand', 0, S));
    }
  }
} else if (view === 'hair') {
  // bara frisyrerna, stort: ?view=hair&s=8&hat=0
  const wrap = el('div', 'padding:8px;display:flex;flex-wrap:wrap;gap:2px');
  for (let h = 0; h < HAIR_STYLES; h++) {
    wrap.appendChild(cell({ skin: [0, 1, 2, 3, 4, 5, 6][h % 7], hair: h, hairColor: [0, 2, 3, 5, 9, 11, 7, 1][h % 8], shirt: h + 2, pants: 0, acc: 0, hat: +(q.get('hat') || 0), glasses: 0, beard: 0, headphones: 0, backpack: 0, hoodie: 0, pattern: 0 }, q.get('pose') || 'stand', 0, S));
  }
} else if (view === 'crowd') {
  const r = seeded(+(q.get('seed') || 7));
  const wrap = el('div', 'display:flex;flex-wrap:wrap;gap:2px;padding:8px');
  const poses = ['stand', 'talk', 'wave', 'walk', 'present', 'laptop', 'tired', 'cheer'];
  for (let i = 0; i < 48; i++) wrap.appendChild(cell(randomLook(r), poses[i % poses.length], i % 4, S, { t: i }));
} else if (view === 'avatars') {
  const r = seeded(+(q.get('seed') || 3));
  const wrap = el('div', 'padding:10px;display:flex;flex-wrap:wrap;gap:10px;background:#242838');
  for (let i = 0; i < 14; i++) {
    const card = el('div', 'background:#2e3348;border-radius:8px;padding:8px;text-align:center', wrap);
    card.innerHTML = avatarImg(randomLook(r), 3, i % 3 === 1 ? 'cheer' : 'stand') + '<br>' + avatarImg(randomLook(r), 7, 'stand');
  }
} else if (view === 'scene') {
  // 1x i ett rum (kontor): skrivbordsrad och en gång med stående personer
  const W = 260;
  const H = 70;
  const c = el('canvas', `width:${W * S}px;height:${H * S}px;image-rendering:pixelated;display:block;margin:8px`);
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#cdbfa6';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#9a8a70';
  g.fillRect(0, 44, W, 10);
  g.fillStyle = '#7c5232';
  g.fillRect(0, 56, W, 14);
  g.fillStyle = '#a8774a';
  g.fillRect(0, 56, W, 2);
  const r = seeded(+(q.get('seed') || 11));
  const poses = ['type', 'type', 'sitIdle', 'think', 'drink', 'read', 'sleep', 'sit'];
  for (let i = 0; i < 8; i++) {
    const x = 18 + i * 31;
    g.fillStyle = '#6a4a2a';
    g.fillRect(x + 2, 46, 24, 2); // skrivbord
    g.fillRect(x + 4, 48, 2, 8);
    g.fillStyle = '#2a3042';
    g.fillRect(x + 17, 36, 8, 8);
    g.fillStyle = '#7cf2ff';
    g.fillRect(x + 18, 37, 6, 5);
    drawPerson(g, x + 6, 56, randomLook(r), poses[i], i, 1, { t: i });
  }
  const stand = ['stand', 'talk', 'wave', 'walk', 'present', 'laptop', 'tired', 'cheer'];
  for (let i = 0; i < 8; i++) drawPerson(g, 16 + i * 31, 69, randomLook(r), stand[i], i, i % 2 ? -1 : 1, { t: i });
} else if (view === 'bench') {
  // ritkostnad: 40 personer x 400 bildrutor på en 600x300-canvas, resultatet skrivs på sidan
  const c = el('canvas', 'display:block');
  c.width = 600;
  c.height = 300;
  const g = c.getContext('2d');
  const r = seeded(1);
  const looks = Array.from({ length: 40 }, () => randomLook(r));
  const poses = ['type', 'talk', 'walk', 'sitIdle', 'present', 'laptop', 'drink', 'tired'];
  const t0 = performance.now();
  for (let n = 0; n < 400; n++) {
    g.clearRect(0, 0, 600, 300);
    for (let i = 0; i < 40; i++) drawPerson(g, 12 + (i % 20) * 28, 60 + Math.floor(i / 20) * 70, looks[i], poses[i % poses.length], n >> 3, 1, { t: n / 60 + i });
  }
  const ms = (performance.now() - t0) / 400;
  label(`${ms.toFixed(2)} ms per bildruta för 40 personer (${(ms / 40 * 1000).toFixed(0)} µs/person)`);
  document.title = 'bench ' + ms.toFixed(2);
} else {
  label('okänd view: ' + view);
}
