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
  const viral = r.items.some((x) => x.viral);
  const SIGNS = [[1, 1, 1, 0, 1, 1, 0, 1], [1, 0, 1, 1, 1, 0, 1, 1], [0, 1, 1, 1, 0, 1, 1, 0], [1, 1, 0, 1, 1, 0, 1, 1], [1, 0, 0, 1, 1, 1, 1, 0], [0, 1, 0, 1, 1, 0, 1, 1]];
  const mix = (c, a) => {
    const n = parseInt(c.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const cone = (x, y0, y1, half, col, a) => {
    ctx.fillStyle = mix(col, a);
    ctx.beginPath();
    ctx.moveTo(x - 1, y0);
    ctx.lineTo(x + 1, y0);
    ctx.lineTo(x + half, y1);
    ctx.lineTo(x - half, y1);
    ctx.closePath();
    ctx.fill();
  };
  const person = (x, y, c, time, ph, wave) => {
    px(x - 3, y - 1, 7, 1, 'rgba(0,0,0,.28)');
    px(x - 2, y - 6, 2, 6, c.pants);
    px(x + 1, y - 6, 2, 6, c.pants);
    px(x - 3, y - 14, 7, 8, c.shirt);
    px(x - 3, y - 14, 7, 1, 'rgba(255,255,255,.2)');
    px(x - 2, y - 19, 5, 5, c.skin);
    px(x - 2, y - 20, 5, 2, c.hair);
    px(x - 5, y - 13 - (wave ? 3 + (Math.sin(time * 9 + ph) > 0 ? 1 : 0) : 0), 2, wave ? 5 : 6, c.shirt);
    px(x + 4, y - 13, 2, 6, c.shirt);
  };
  const staff = [
    { skin: SKINS[1], hair: HAIRS[2], shirt: '#4de1d0', pants: '#233058' },
    { skin: SKINS[3], hair: HAIRS[0], shirt: '#ff7a9a', pants: '#233058' },
    { skin: SKINS[0], hair: HAIRS[4], shirt: '#ffe08a', pants: '#233058' },
  ];
  const draw = (time) => {
    ctx.clearRect(0, 0, W, H);
    // bakvägg med panelfogar och mjuk ljusning mot golvet
    ctx.fillStyle = wall('#232c63');
    ctx.fillRect(0, 0, W, 66);
    for (let x = 20; x < W; x += 40) px(x, 8, 1, 58, 'rgba(120,150,255,.07)');
    px(0, 62, W, 4, '#141a3c');
    // golv: djup teppsmönster med gångstråk och reflexer
    const fg = ctx.createLinearGradient(0, 66, 0, H);
    fg.addColorStop(0, '#1b2250');
    fg.addColorStop(1, '#0d1130');
    ctx.fillStyle = fg;
    ctx.fillRect(0, 66, W, H - 66);
    for (let y = 70; y < H; y += 14) px(0, y, W, 1, 'rgba(120,150,255,.06)');
    for (let x = 0; x < W; x += 24) for (let y = 66; y < H; y += 28) px(x + ((y / 28) % 2 ? 12 : 0), y + 8, 2, 2, 'rgba(120,150,255,.07)');
    for (let x = 4; x < W; x += 18) px(x, 150, 9, 1, 'rgba(255,214,102,.28)');
    px(0, 64, W, 2, '#3a4586');
    // tak med truss och spotlights
    px(0, 0, W, 9, '#070a1a');
    px(0, 8, W, 1, '#2c3566');
    for (let x = 6; x < W; x += 12) px(x, 3, 6, 1, '#1a2248');
    for (let i = 0; i < 9; i++) {
      const lx = 18 + i * 36;
      const warm = i % 2;
      px(lx - 1, 9, 8, 3, '#0c1128');
      px(lx + 1, 9, 4, 2, warm ? '#ffe9a8' : '#a8d8ff');
      cone(lx + 3, 11, 64, 15, warm ? '#ffe9a8' : '#a8d8ff', 0.045);
    }
    // rivalernas montrar
    rivals.forEach((v, i) => {
      const bob = Math.sin(time * 5 + i * 1.7) * 0.5 + 0.5;
      px(v.x - 1, 34, 46, 32, '#070a1a');
      px(v.x, 36, 44, 28, '#141a3c');
      px(v.x + 1, 37, 42, 6, v.c);
      px(v.x + 1, 43, 42, 1, 'rgba(255,255,255,.35)');
      SIGNS[i % SIGNS.length].forEach((on, k) => on && px(v.x + 5 + k * 4, 39, 3, 2, 'rgba(255,255,255,.85)'));
      px(v.x + 4, 47, 16, 10, '#04061a');
      px(v.x + 24, 47, 16, 10, '#04061a');
      px(v.x + 5, 48, 14, 8, mix(v.c, 0.45 + 0.35 * bob));
      px(v.x + 25, 48, 14, 8, mix(v.c, 0.8 - 0.35 * bob));
      px(v.x + 7, 50, 6, 1, 'rgba(255,255,255,.5)');
      px(v.x + 27, 51, 8, 1, 'rgba(255,255,255,.5)');
      px(v.x - 2, 59, 48, 5, '#2a3258');
      px(v.x - 2, 59, 48, 1, v.c);
      px(v.x - 4, 64, 52, 3, mix(v.c, 0.2));
    });
    // vår monter: golvplatta, bakvägg med skärmar, truss och disk
    const bx = cx - bw / 2;
    const flash = 0.5 + 0.5 * Math.sin(time * 4);
    px(bx - 10, by + 34, bw + 20, 30, '#10173a');
    px(bx - 10, by + 34, bw + 20, 1, '#4de1d0');
    px(bx - 8, by + 36, bw + 16, 26, '#17214e');
    for (let x = bx - 8; x < bx + bw + 8; x += 8) px(x, by + 36, 1, 26, 'rgba(77,225,208,.10)');
    px(bx - 4, by - 8, bw + 8, 46, '#05081a');
    px(bx - 2, by - 5, bw + 4, 40, '#1b2760');
    const bg = ctx.createLinearGradient(0, by - 5, 0, by + 35);
    bg.addColorStop(0, 'rgba(77,225,208,.22)');
    bg.addColorStop(1, 'rgba(77,225,208,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(bx - 2, by - 5, bw + 4, 40);
    for (let x = bx; x < bx + bw; x += 8) px(x, by - 5, 1, 40, 'rgba(120,150,255,.09)');
    // truss: pelare med ledlist och översta balk
    px(bx - 5, by - 9, bw + 10, 5, '#0a0f26');
    px(bx - 5, by - 5, bw + 10, 1, `rgba(77,225,208,${0.55 + 0.35 * flash})`);
    for (let x = bx - 4; x < bx + bw + 4; x += 4) px(x, by - 8, 2, 1, '#2c3566');
    px(bx - 6, by - 9, 4, 50, '#0a0f26');
    px(bx + bw + 2, by - 9, 4, 50, '#0a0f26');
    px(bx - 5, by - 6, 2, 44, `rgba(77,225,208,${0.5 + 0.4 * flash})`);
    px(bx + bw + 3, by - 6, 2, 44, `rgba(77,225,208,${0.5 + 0.4 * flash})`);
    const n = r.items.length;
    r.items.forEach((x, i) => {
      const sx = bx + (bw * (i + 0.5)) / Math.max(1, n) - 12;
      const pulse = 0.35 + 0.35 * Math.sin(time * 3 + i * 1.3);
      const col = x.k === 'hw' ? hwCol(x) : '#4de1d0';
      px(sx - 3, by - 1, 30, 36, mix(col, 0.08 + 0.08 * pulse));
      px(sx - 1, by + 1, 26, 31, '#05081a');
      px(sx, by + 2, 24, 29, '#0d1330');
      if (x.k === 'hw') {
        px(sx + 3, by + 8, 18, 13, hwCol(x));
        px(sx + 3, by + 8, 18, 2, 'rgba(255,255,255,.35)');
        px(sx + 5, by + 12, 14, 4, 'rgba(0,0,0,.35)');
        px(sx + 8, by + 21, 8, 2, '#cfd6ff');
        px(sx + 4, by + 25, 16, 4, '#2c3566');
        px(sx + 4, by + 25, 16, 1, '#8a96d8');
      } else if (imgs[i] && imgs[i].complete) {
        ctx.drawImage(imgs[i], sx + 2, by + 3, 20, 27);
        for (let y = by + 3; y < by + 30; y += 2) px(sx + 2, y, 20, 1, 'rgba(0,0,0,.14)');
        px(sx + 2, by + 3 + ((time * 14 + i * 9) % 27 | 0), 20, 1, 'rgba(255,255,255,.18)');
      } else px(sx + 2, by + 3, 20, 27, '#3a4680');
      px(sx + 1, by + 31, 22, 2, `rgba(77,225,208,${0.4 + 0.4 * flash})`);
      cone(sx + 12, by + 33, by + 62, 14, col, 0.05 + 0.04 * pulse);
    });
    // disk med glödande framkant och personal bakom
    staff.slice(0, r.level).forEach((s, k) => person(bx + bw * ((k + 1) / (r.level + 1)), by + 38, s, time, k * 2, (time + k * 1.7) % 6 < 1.4));
    px(bx - 3, by + 31, bw + 6, 9, '#0c1330');
    px(bx - 3, by + 31, bw + 6, 2, '#6a76c0');
    px(bx - 3, by + 35, bw + 6, 5, '#4de1d0');
    px(bx - 3, by + 35, bw + 6, 1, '#b8fff4');
    px(bx - 3, by + 40, bw + 6, 2, '#1f7a70');
    // vimplar över montern
    for (let x = bx - 6, i = 0; x < bx + bw + 6; x += 8, i++) {
      const sag = [0, 1, 2, 2, 1, 0][i % 6];
      px(x, by - 12 + sag, 5, 3, ['#ff6b8a', '#ffe08a', '#4de1d0', '#9b7bff'][i % 4]);
      px(x + 1, by - 9 + sag, 3, 1, ['#ff6b8a', '#ffe08a', '#4de1d0', '#9b7bff'][i % 4]);
    }
    px(bx - 6, by - 13, bw + 12, 1, '#2c3566');
    // besökare, bakifrån och fram, några filmar
    crowd.sort((a, b) => a.y - b.y);
    for (const c of crowd) {
      const bob = Math.sin(time * 6 + c.ph) > 0 ? 1 : 0;
      px(c.x - 3, c.y + 1, 7, 1, 'rgba(0,0,0,.3)');
      px(c.x - 2, c.y - 1 + bob, 2, 3, c.pants);
      px(c.x, c.y - 1 - bob, 2, 3, c.pants);
      px(c.x - 2, c.y - 6, 5, 5, c.shirt);
      px(c.x - 1, c.y - 9, 3, 3, c.skin);
      px(c.x - 1, c.y - 10, 3, 1, c.hair);
      if (c.near && c.ph > 4.2 && (time * 2 + c.ph) % 5 < 0.12) {
        px(c.x + 2, c.y - 12, 2, 2, '#ffffff');
        px(c.x + 1, c.y - 13, 4, 1, 'rgba(255,255,255,.55)');
      }
    }
    // golvlampor över montern och konfetti när något blivit mässans snackis
    ctx.fillStyle = `rgba(77,225,208,${0.05 + 0.03 * flash})`;
    ctx.fillRect(bx - 12, by + 42, bw + 24, 50);
    if (viral) {
      for (let i = 0; i < 26; i++) {
        const k = i * 37.7;
        const x = bx - 6 + ((k * 13) % (bw + 12));
        const y = by - 12 + (((time * 22 + k * 5) % 70) | 0);
        px(x + Math.sin(time * 3 + k) * 3, y, 2, 2, ['#ff6b8a', '#ffe08a', '#4de1d0', '#9b7bff', '#ffffff'][i % 5]);
      }
    }
    // vinjett
    const vg = ctx.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 190);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,10,.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
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
    // resultatet visas under hallen: scrolla bara så långt att dess topp syns, så att hallen ligger kvar i bild
    const body = document.querySelector('[data-keep="body"]');
    if (body) {
      const over = resEl.getBoundingClientRect().top + 90 - body.getBoundingClientRect().bottom;
      if (over > 0) body.scrollTo({ top: body.scrollTop + over, behavior: reduced ? 'auto' : 'smooth' });
    }
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
