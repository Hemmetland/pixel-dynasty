// Spelmässan: planeringen (monter och utställda saker) och mässhallen med besökare, nyhetsrad och resultat.
import { esc, icon, t, tn, L, UI, act, money, errToast, bar } from './core.js';
import { sfx } from '../audio/sfx.js';
import { coverURL } from '../render/covers.js';
import { glyphImg } from '../render/glyphs.js';
import { SKINS, HAIRS, SHIRTS, PANTS } from '../render/pal.js';
import { fmtNum } from '../core/util.js';
import { hashStr, seeded } from '../core/rng.js';
import { BOOTHS, EXPO_LIFT_WEEKS, expoAttendance, expoCost, expoItems, defaultPicks, expoForecast, resolveExpo, itemKey } from '../sim/expo.js';
import { yearOf } from '../sim/const.js';
import { HW_TYPES } from '../data/hardware.js';
import { LOGOS } from './hud.js';

const ICON = { dev: 'hammer', game: 'gamepad', hw: 'cpu', live: 'globe' };
const COL = { dev: 'var(--hot)', game: 'var(--accent)', hw: 'var(--tech)', live: 'var(--good)' };

// ── Planering ───────────────────────────────────────────────────
export function expoPrompt(app, G, p) {
  const year = yearOf(G.t);
  const items = expoItems(G);
  const byKey = (k) => items.find((x) => itemKey(x) === k);
  const afford = (lv) => G.money >= expoCost(G, lv);
  const st = { level: afford(2) ? 2 : afford(1) ? 1 : 0, picks: [] };
  const fill = () => {
    const B = BOOTHS[st.level];
    if (!B) return;
    st.picks = st.picks.filter(byKey).slice(0, B.slots);
    for (const x of defaultPicks(items, B.slots)) if (st.picks.length < B.slots && !st.picks.includes(itemKey(x))) st.picks.push(itemKey(x));
  };
  fill();
  const chosen = () => st.picks.map(byKey).filter(Boolean);

  const boothCard = (lv) => {
    const B = BOOTHS[lv];
    const cost = expoCost(G, lv);
    const sel = st.level === lv;
    const fc = B ? expoForecast(G, lv, chosen().slice(0, B.slots)) : null;
    return `<button class="choice${sel ? ' sel' : ''}" data-act="ex-booth" data-lv="${lv}" ${lv && !afford(lv) ? 'disabled' : ''}>
      <b>${icon(['x', 'flag', 'star', 'crown'][lv])} ${t('expo.o' + lv)}</b><span class="muted">${t('expo.d' + lv)}</span>
      ${B ? `<span class="row wrap" style="gap:6px"><span class="tag" style="--c:var(--money)">${money(cost)}</span><span class="chip">${tn('expo.slots', B.slots)}</span><span class="chip">${t('expo.about', { n: fmtNum(fc.visitors) })}</span></span>` : ''}
    </button>`;
  };
  const itemCard = (x) => {
    const on = st.picks.includes(itemKey(x));
    const B = BOOTHS[st.level];
    const full = !on && (!B || st.picks.length >= B.slots);
    const desc = x.k === 'game' ? t('expo.i.game.d', { score: (G.games.find((g) => g.id === x.id)?.score ?? 0).toFixed(1), n: EXPO_LIFT_WEEKS }) : t('expo.i.' + x.k + '.d');
    const thumb = x.k === 'hw' ? `<span class="exi-ic" style="--c:${HW_TYPES[x.type]?.color || '#4aa8ff'}">${icon(HW_TYPES[x.type]?.ic || 'cpu')}</span>` : `<img class="cover" src="${coverURL(coverSpec(G, x), 1)}" width="36" height="48" alt="" draggable="false">`;
    return `<button class="choice exi${on ? ' sel' : ''}" data-act="ex-item" data-key="${itemKey(x)}" ${full ? 'disabled' : ''}>
      <span class="row" style="gap:10px;width:100%">${thumb}<span style="flex:1;min-width:0"><b>${icon(ICON[x.k])} ${t('expo.i.' + x.k, { name: esc(L(x.name)) })}</b><span class="muted" style="display:block;font-size:12.5px;font-weight:500">${desc}</span>
        <span class="row" style="gap:8px;margin-top:5px"><span class="faint" style="font-size:11px">${t('expo.strength')}</span><span style="flex:1;max-width:120px">${bar(Math.round(x.q * 100), COL[x.k], 'thin')}</span></span></span>
        <span class="exi-ck">${on ? icon('check') : ''}</span></span>
    </button>`;
  };

  const draw = () => {
    const B = BOOTHS[st.level];
    const fc = B ? expoForecast(G, st.level, chosen()) : null;
    const slots = B ? B.slots : 0;
    UI.modal(
      `<div class="win-head"><div class="wi" style="--wc:var(--hot)">${icon('megaphone')}</div><h2>${t('expo.title')} ${year}<div class="sub">${t('expo.sub', { n: fmtNum(expoAttendance(year)) })}</div></h2></div>
      <div class="win-body" data-keep="body"><p class="evtext">${t('expo.text')}</p>
        <div class="lbl" style="margin:14px 0 8px">${t('expo.booth')}</div>
        <div class="choices">${[1, 2, 3, 0].map(boothCard).join('')}</div>
        ${B ? `<div class="lbl" style="margin:16px 0 4px">${t('expo.show')}</div><div class="hint" style="margin-bottom:8px">${t('expo.showHint', { n: slots })}</div>
        <div class="choices">${items.length ? items.map(itemCard).join('') : `<div class="hint">${t('expo.noItems')}</div>`}</div>` : ''}
      </div>
      <div class="win-foot">${B ? `<button class="btn" data-act="ex-skip">${t('expo.o0')}</button>` : ''}<span class="sp"></span>
        ${B ? `<button class="btn primary lg" data-act="ex-go">${icon('megaphone')}${t('expo.go')} · ${money(fc.cost)} · ${t('expo.about', { n: fmtNum(fc.visitors) })}</button>` : `<button class="btn primary lg" data-act="ex-skip">${t('expo.o0')}</button>`}</div>`,
      bind,
      'md',
    );
  };
  const close = () => {
    app.promptActive = false;
    UI.closeModal();
    app.menuChanged();
  };
  const bind = () => {
    act('ex-booth', (b) => {
      st.level = +b.dataset.lv;
      fill();
      draw();
    });
    act('ex-item', (b) => {
      const k = b.dataset.key;
      st.picks = st.picks.includes(k) ? st.picks.filter((x) => x !== k) : [...st.picks, k];
      draw();
    });
    act('ex-skip', () => {
      resolveExpo(G, p.id, 0);
      close();
    });
    act('ex-go', () => {
      const r = resolveExpo(G, p.id, st.level, st.picks);
      if (r === true) showHall(app, G, G.expoLast, close);
      else errToast(r);
    });
  };
  draw();
}

const coverSpec = (G, x) => {
  const g = x.k === 'dev' ? G.job : G.games.find((y) => y.id === x.id);
  return g ? { id: g.id, title: g.title, topic: g.topic, genre: g.genre, platform: g.platform } : { id: x.id, title: x.name, topic: 'space', genre: 'action', platform: 'pc' };
};

// ── Mässhallen ──────────────────────────────────────────────────
const W = 320;
const H = 176;
const ease = (x) => 1 - Math.pow(1 - Math.min(1, x), 3);
const DURATION = 7;

function itemLine(r, x) {
  const name = `<b>${esc(L(x.name))}</b>`;
  const bits = [];
  if (x.hype != null) bits.push(t('expo.r.hype', { n: x.hype }));
  if (x.crash) bits.push(`<span style="color:var(--bug)">${t('expo.r.crash')}</span>`);
  if (x.k === 'game' && x.lift != null) bits.push(t('expo.r.lift', { v: Math.round(x.lift * 100), n: EXPO_LIFT_WEEKS }));
  if (x.k === 'hw' && x.lift != null) bits.push(t('expo.r.liftHw', { v: Math.round(x.lift * 100) }));
  if (x.k === 'live' && x.fresh) bits.push(t('expo.r.fresh', { n: x.fresh }));
  if (x.viral) bits.push(`<span style="color:var(--gold)">${t('expo.r.viral')}</span>`);
  return `<div class="exr-row" style="--c:${COL[x.k]}"><span class="exr-ic">${icon(ICON[x.k])}</span><div style="flex:1;min-width:0">${name}<div class="faint" style="font-size:12px">${bits.join(' · ') || '&nbsp;'}</div></div></div>`;
}

export function showHall(app, G, r, close) {
  const logo = glyphImg(LOGOS[G.logo | 0] || LOGOS[0], '#ffffff', 16, false);
  UI.modal(
    `<div class="win-head"><div class="wi" style="--wc:var(--hot)">${icon('megaphone')}</div><h2>${t('expo.title')} ${r.year}<div class="sub">${t('expo.sub', { n: fmtNum(r.attendance) })}</div></h2></div>
    <div class="win-body" data-keep="body">
      <div class="expo-hall"><canvas id="expo-cv" width="${W}" height="${H}"></canvas>
        <div class="expo-banner disp">${t('expo.banner', { year: r.year })}</div>
        <div class="expo-sign disp" id="expo-sign">${logo}<span>${esc(G.studio)}</span></div>
        <div class="expo-count"><div class="k">${t('expo.visitors')}</div><div class="v disp num" id="expo-n">0</div></div>
      </div>
      <div class="expo-news" id="expo-news"></div>
      <div class="expo-res" id="expo-res" hidden>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));margin-top:12px">
          <div class="counter" style="--c:var(--accent)"><div class="v num">${fmtNum(r.visitors)}</div><div class="k">${t('expo.visitors')}</div></div>
          <div class="counter" style="--c:var(--fans)"><div class="v num">+${fmtNum(r.fans)}</div><div class="k">${t('expo.r.fans')}</div></div>
          <div class="counter" style="--c:var(--money)"><div class="v num">+${money(r.revenue)}</div><div class="k">${t('expo.r.rev')}</div></div>
          <div class="counter" style="--c:var(--bug)"><div class="v num">−${money(r.cost)}</div><div class="k">${t('expo.r.cost')}</div></div>
        </div>
        ${r.items.length ? `<div class="lbl" style="margin:14px 0 6px">${t('expo.r.items')}</div><div class="col" style="gap:7px">${r.items.map((x) => itemLine(r, x)).join('')}</div>` : ''}
        ${r.rivals.length ? `<p class="hint" style="margin-top:12px">${t('expo.rivals', { list: r.rivals.map((c) => esc(c.name)).join(', ') })}</p>` : ''}
      </div>
    </div>
    <div class="win-foot"><button class="btn" data-act="ex-skipanim" id="expo-skip">${t('expo.skipAnim')}</button><span class="sp"></span><button class="btn primary lg" data-act="ex-done" id="expo-done" hidden>${t('expo.cont')}</button></div>`,
    () => {
      act('ex-done', close);
      scene(app, G, r);
    },
    'lg',
  );
  sfx.play('fanfare');
}

// Hallen ritas procedurellt: rivalernas montrar bakom, vår monter med utställda saker i mitten och besökare som strömmar in
function scene(app, G, r) {
  const cv = document.getElementById('expo-cv');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rng = seeded(hashStr(`${G.seed || 0}:expoview:${r.year}`));
  const bw = [0, 64, 96, 136][r.level];
  const cx = W / 2;
  const by = 84;
  // utställda saker: omslag som bilder, hårdvara som enhet
  const imgs = r.items.map((x) => {
    if (x.k === 'hw') return null;
    const im = new Image();
    im.src = coverURL(coverSpec(G, x), 1);
    return im;
  });
  const hwCol = (x) => HW_TYPES[G.hw?.products?.find((p) => p.id === x.id)?.type]?.color || '#4aa8ff';
  // besökare
  const maxN = Math.max(12, Math.min(120, Math.round(10 + 22 * Math.log2(1 + r.visitors / 60))));
  const crowd = [];
  const spawn = () => {
    const near = rng() < 0.45;
    crowd.push({
      x: rng() * W, y: H + 4, tx: near ? cx - bw / 2 - 18 + rng() * (bw + 36) : 10 + rng() * (W - 20), ty: near ? by + 52 + rng() * 22 : 96 + rng() * (H - 106),
      sp: 7 + rng() * 9, ts: 0, skin: SKINS[Math.floor(rng() * SKINS.length)], hair: HAIRS[Math.floor(rng() * HAIRS.length)], shirt: SHIRTS[Math.floor(rng() * SHIRTS.length)], pants: PANTS[Math.floor(rng() * PANTS.length)], ph: rng() * 6, near,
    });
  };
  const wall = (c) => {
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, '#0d1230');
    g.addColorStop(1, c);
    return g;
  };
  const px = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const rivals = r.rivals.map((c, i) => ({ c: c.color || '#8a56dc', x: 14 + i * 52 }));
  const draw = (time) => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = wall('#1d2552');
    ctx.fillRect(0, 0, W, 64);
    // golv med rutor
    for (let y = 64; y < H; y += 16) for (let x = 0; x < W; x += 16) px(x, y, 16, 16, ((x + y) / 16) % 2 ? '#1a2040' : '#151a36');
    px(0, 64, W, 2, '#2c3566');
    // takspotlights
    for (let i = 0; i < 9; i++) px(18 + i * 36, 3, 6, 2, i % 2 ? '#ffe9a8' : '#a8d8ff');
    // rivalernas montrar
    for (const v of rivals) {
      px(v.x, 36, 44, 30, '#0a0e22');
      px(v.x + 2, 38, 40, 22, v.c);
      px(v.x + 6, 42, 14, 10, '#0a0e22');
      px(v.x + 24, 42, 14, 10, '#0a0e22');
      px(v.x + 8, 44, 10, 6, 'rgba(255,255,255,.35)');
      px(v.x, 62, 44, 4, '#2a3050');
    }
    // vår monter
    const bx = cx - bw / 2;
    const flash = 0.5 + 0.5 * Math.sin(time * 4);
    px(bx - 3, by - 6, bw + 6, 50, '#06091a');
    px(bx, by - 3, bw, 38, '#243468');
    px(bx, by - 3, bw, 3, '#4de1d0');
    px(bx - 2, by + 35, bw + 4, 12, '#4de1d0');
    px(bx - 2, by + 45, bw + 4, 3, '#2a9a8e');
    const n = r.items.length;
    r.items.forEach((x, i) => {
      const sx = bx + (bw * (i + 0.5)) / Math.max(1, n) - 12;
      px(sx - 1, by + 1, 26, 31, '#0a0e22');
      if (x.k === 'hw') {
        px(sx + 3, by + 9, 18, 13, hwCol(x));
        px(sx + 5, by + 11, 14, 4, 'rgba(0,0,0,.35)');
        px(sx + 4, by + 22, 16, 2, '#cfd6ff');
      } else if (imgs[i] && imgs[i].complete) {
        ctx.drawImage(imgs[i], sx + 2, by + 3, 20, 27);
      } else px(sx + 2, by + 3, 20, 27, '#3a4680');
      px(sx + 1, by + 31, 22, 1, `rgba(77,225,208,${0.4 + 0.4 * flash})`);
    });
    // besökare, bakifrån och fram
    crowd.sort((a, b) => a.y - b.y);
    for (const c of crowd) {
      const bob = Math.sin(time * 6 + c.ph) > 0 ? 1 : 0;
      px(c.x - 2, c.y - 1 + bob, 2, 3, c.pants);
      px(c.x, c.y - 1 - bob, 2, 3, c.pants);
      px(c.x - 2, c.y - 6, 5, 5, c.shirt);
      px(c.x - 1, c.y - 9, 3, 3, c.skin);
      px(c.x - 1, c.y - 10, 3, 1, c.hair);
    }
    // golvlampor över montern
    ctx.fillStyle = `rgba(77,225,208,${0.05 + 0.03 * flash})`;
    ctx.fillRect(bx - 12, by + 36, bw + 24, 56);
  };
  const countEl = document.getElementById('expo-n');
  const newsEl = document.getElementById('expo-news');
  const resEl = document.getElementById('expo-res');
  const doneBtn = document.getElementById('expo-done');
  const skipBtn = document.getElementById('expo-skip');
  const reduced = !!app.settings?.reduced;
  let shown = 0;
  let t0 = null;
  let ended = false;
  const addLine = (l) => {
    const el = document.createElement('div');
    el.className = 'expo-line';
    el.innerHTML = `<span class="expo-dot"></span><span>${t('expo.n.' + l.k, { n: l.n, title: `<b>${esc(L(l.title || ''))}</b>`, name: `<b>${esc(L(l.name || ''))}</b>`, studio: `<b>${esc(l.studio || '')}</b>` })}</span>`;
    newsEl.appendChild(el);
    newsEl.scrollTop = newsEl.scrollHeight;
  };
  const finish = () => {
    if (ended) return;
    ended = true;
    while (shown < r.lines.length) addLine(r.lines[shown++]);
    countEl.textContent = fmtNum(r.visitors);
    while (crowd.length < maxN) spawn();
    for (const c of crowd) {
      c.x = c.tx;
      c.y = c.ty;
    }
    draw(0);
    resEl.hidden = false;
    doneBtn.hidden = false;
    skipBtn.hidden = true;
    sfx.play('fanfare');
    const body = document.querySelector('[data-keep="body"]');
    if (body) body.scrollTop = body.scrollHeight;
  };
  act('ex-skipanim', finish);
  if (reduced) {
    finish();
    return;
  }
  let last = 0;
  const frame = (ts) => {
    if (!cv.isConnected || ended) return;
    if (t0 == null) {
      t0 = ts;
      last = ts;
    }
    const el = (ts - t0) / 1000;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    const p = ease(el / DURATION);
    countEl.textContent = fmtNum(Math.round(r.visitors * p));
    while (crowd.length < Math.round(maxN * p)) spawn();
    const due = Math.floor((el / DURATION) * (r.lines.length + 0.5));
    while (shown < Math.min(r.lines.length, due)) addLine(r.lines[shown++]);
    for (const c of crowd) {
      const dx = c.tx - c.x;
      const dy = c.ty - c.y;
      const d = Math.hypot(dx, dy);
      if (d < 2 || (c.ts -= dt) < 0) {
        c.near = rng() < 0.4;
        c.tx = c.near ? cx - bw / 2 - 18 + rng() * (bw + 36) : 10 + rng() * (W - 20);
        c.ty = c.near ? by + 52 + rng() * 22 : 96 + rng() * (H - 106);
        c.ts = 1.5 + rng() * 2.5;
      } else {
        c.x += (dx / d) * c.sp * dt;
        c.y += (dy / d) * c.sp * dt;
      }
    }
    draw(el);
    if (el >= DURATION) finish();
    else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
