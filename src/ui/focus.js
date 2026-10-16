// Fokusväljare: triangel (3 kategorier), skjutreglage (2) eller fast (1).
import { $, $$, esc, icon, t, L } from './core.js';
import { CAT } from '../data/categories.js';
import { glyphImg } from '../render/glyphs.js';
import { normFocus } from '../sim/score.js';
import { sfx } from '../audio/sfx.js';

const A = [50, 9];
const B = [8, 90];
const C = [92, 90];

function toBary(px, py) {
  const v0 = [B[0] - A[0], B[1] - A[1]];
  const v1 = [C[0] - A[0], C[1] - A[1]];
  const v2 = [px - A[0], py - A[1]];
  const d00 = v0[0] * v0[0] + v0[1] * v0[1];
  const d01 = v0[0] * v1[0] + v0[1] * v1[1];
  const d11 = v1[0] * v1[0] + v1[1] * v1[1];
  const d20 = v2[0] * v0[0] + v2[1] * v0[1];
  const d21 = v2[0] * v1[0] + v2[1] * v1[1];
  const den = d00 * d11 - d01 * d01;
  let v = (d11 * d20 - d01 * d21) / den;
  let w = (d00 * d21 - d01 * d20) / den;
  let u = 1 - v - w;
  u = Math.max(0, u);
  v = Math.max(0, v);
  w = Math.max(0, w);
  const s = u + v + w || 1;
  return [u / s, v / s, w / s];
}
const fromBary = ([u, v, w]) => [A[0] * u + B[0] * v + C[0] * w, A[1] * u + B[1] * v + C[1] * w];

// html för väljaren. cats = kategori-id:n, val = {cat:pct}, ideal = {cat:pct}|null
export function focusHTML(cats, val, ideal, uid = 'fp') {
  const cols = cats.map((c) => CAT[c].color);
  const bars = cats
    .map(
      (c, i) => `
    <div class="fbar" style="--c:${cols[i]}">
      <div class="fh">${glyphImg(CAT[c].glyph, cols[i], 16, false)}<b>${L(CAT[c].name)}</b><span class="num" data-v="${c}">${val[c] || 0}%</span></div>
      <div class="bar tall"><i data-b="${c}" style="width:${val[c] || 0}%"></i>${ideal ? `<u class="ideal" style="left:${ideal[c]}%"></u>` : ''}</div>
      <div class="fd">${L(CAT[c].desc)}</div>
      ${cats.length > 1 ? `<div class="row" style="gap:6px;margin-top:6px"><button class="btn sm" data-act="fstep" data-c="${c}" data-d="-5">${icon('minus')}</button><button class="btn sm" data-act="fstep" data-c="${c}" data-d="5">${icon('plus')}</button></div>` : ''}
    </div>`,
    )
    .join('');
  let pad = '';
  if (cats.length === 3) {
    const labels = cats
      .map((c, i) => {
        const p = [A, B, C][i];
        const anchor = i === 0 ? 'middle' : i === 1 ? 'start' : 'end';
        const x = i === 0 ? 50 : i === 1 ? 2 : 98;
        const y = i === 0 ? 4 : 99;
        void p;
        return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="tl" fill="${cols[i]}">${esc(L(CAT[c].name))}</text>`;
      })
      .join('');
    pad = `<svg class="tri" id="${uid}-svg" viewBox="0 0 100 106" data-pad="${uid}">
      <defs>
        <radialGradient id="${uid}-g0" cx="50%" cy="10%" r="90%"><stop offset="0" stop-color="${cols[0]}" stop-opacity=".55"/><stop offset="1" stop-color="${cols[0]}" stop-opacity="0"/></radialGradient>
        <radialGradient id="${uid}-g1" cx="8%" cy="90%" r="90%"><stop offset="0" stop-color="${cols[1]}" stop-opacity=".55"/><stop offset="1" stop-color="${cols[1]}" stop-opacity="0"/></radialGradient>
        <radialGradient id="${uid}-g2" cx="92%" cy="90%" r="90%"><stop offset="0" stop-color="${cols[2]}" stop-opacity=".55"/><stop offset="1" stop-color="${cols[2]}" stop-opacity="0"/></radialGradient>
        <clipPath id="${uid}-clip"><polygon points="${A.join(',')} ${B.join(',')} ${C.join(',')}"/></clipPath>
      </defs>
      <g clip-path="url(#${uid}-clip)"><rect width="100" height="100" fill="#0a0f26"/><rect width="100" height="100" fill="url(#${uid}-g0)"/><rect width="100" height="100" fill="url(#${uid}-g1)"/><rect width="100" height="100" fill="url(#${uid}-g2)"/>
        ${[20, 40, 60, 80].map((k) => `<line x1="${A[0] + (B[0] - A[0]) * (k / 100)}" y1="${A[1] + (B[1] - A[1]) * (k / 100)}" x2="${A[0] + (C[0] - A[0]) * (k / 100)}" y2="${A[1] + (C[1] - A[1]) * (k / 100)}" class="gr"/><line x1="${A[0] + (B[0] - A[0]) * (k / 100)}" y1="${A[1] + (B[1] - A[1]) * (k / 100)}" x2="${B[0] + (C[0] - B[0]) * (1 - k / 100)}" y2="${B[1] + (C[1] - B[1]) * (1 - k / 100)}" class="gr"/><line x1="${A[0] + (C[0] - A[0]) * (k / 100)}" y1="${A[1] + (C[1] - A[1]) * (k / 100)}" x2="${C[0] + (B[0] - C[0]) * (1 - k / 100)}" y2="${C[1] + (B[1] - C[1]) * (1 - k / 100)}" class="gr"/>`).join('')}
      </g>
      <polygon points="${A.join(',')} ${B.join(',')} ${C.join(',')}" class="tb"/>
      ${ideal ? `<circle id="${uid}-ideal" r="3.2" class="idl"/>` : ''}
      <circle id="${uid}-h" r="5" class="hd"/>
      ${labels}
    </svg>`;
  } else if (cats.length === 2) {
    pad = `<div class="duo" data-pad="${uid}"><input type="range" min="0" max="100" step="5" id="${uid}-r" value="${val[cats[0]] || 0}"><div class="row" style="justify-content:space-between;font-size:12px;font-weight:700"><span style="color:${cols[0]}">${esc(L(CAT[cats[0]].name))}</span><span style="color:${cols[1]}">${esc(L(CAT[cats[1]].name))}</span></div></div>`;
  } else {
    pad = `<div class="empty" style="padding:20px"><div class="muted">${t('focus.single')}</div></div>`;
  }
  return `<div class="focus" data-focus="${uid}"><div class="fpad">${pad}</div><div class="fbars">${bars}</div></div>`;
}

// Binder dragkontroller. onChange(val)
export function bindFocus(root, cats, val, ideal, uid, onChange) {
  const el = $(`[data-focus="${uid}"]`, root);
  if (!el) return;
  const upd = () => {
    for (const c of cats) {
      const n = $(`[data-v="${c}"]`, el);
      if (n) n.textContent = (val[c] || 0) + '%';
      const b = $(`[data-b="${c}"]`, el);
      if (b) b.style.width = (val[c] || 0) + '%';
    }
    if (cats.length === 3) {
      const h = $(`#${uid}-h`, el);
      const [x, y] = fromBary(cats.map((c) => (val[c] || 0) / 100));
      h.setAttribute('cx', x);
      h.setAttribute('cy', y);
      if (ideal) {
        const i = $(`#${uid}-ideal`, el);
        const [ix, iy] = fromBary(cats.map((c) => (ideal[c] || 0) / 100));
        i.setAttribute('cx', ix);
        i.setAttribute('cy', iy);
      }
    }
    if (cats.length === 2) $(`#${uid}-r`, el).value = val[cats[0]] || 0;
  };
  const set = (raw) => {
    const n = normFocus(cats, raw);
    let changed = false;
    for (const c of cats) {
      if (val[c] !== n[c]) changed = true;
      val[c] = n[c];
    }
    upd();
    if (changed) {
      sfx.play('tick');
      onChange?.(val);
    }
  };
  upd();
  const svg = $(`#${uid}-svg`, el);
  if (svg) {
    let drag = false;
    const move = (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * 100;
      const py = ((e.clientY - r.top) / r.height) * 106;
      const b = toBary(px, py);
      const raw = {};
      cats.forEach((c, i) => (raw[c] = b[i] * 100));
      set(raw);
    };
    svg.addEventListener('pointerdown', (e) => {
      drag = true;
      svg.setPointerCapture(e.pointerId);
      move(e);
    });
    svg.addEventListener('pointermove', (e) => drag && move(e));
    svg.addEventListener('pointerup', () => (drag = false));
    svg.addEventListener('pointercancel', () => (drag = false));
  }
  const rng = $(`#${uid}-r`, el);
  if (rng) rng.addEventListener('input', () => set({ [cats[0]]: +rng.value, [cats[1]]: 100 - +rng.value }));
  for (const b of $$('[data-act="fstep"]', el)) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const c = b.dataset.c;
      const d = +b.dataset.d;
      const raw = { ...val };
      raw[c] = Math.max(0, (raw[c] || 0) + d);
      // ta/ge från de övriga proportionellt
      const others = cats.filter((x) => x !== c);
      const rest = 100 - raw[c];
      const so = others.reduce((s, x) => s + (val[x] || 0), 0) || 1;
      for (const o of others) raw[o] = (val[o] || 0) * (rest / so) + (so === 1 && !val[o] ? rest / others.length : 0);
      set(raw);
    });
  }
}
