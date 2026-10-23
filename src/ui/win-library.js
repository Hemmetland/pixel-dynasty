import { $, esc, icon, t, tn, L, UI, act, regWin, money, errToast, bar } from './core.js';
import { sfx } from '../audio/sfx.js';
import { glyphImg } from '../render/glyphs.js';
import { coverImg } from '../render/covers.js';
import { TOPIC } from '../data/topics.js';
import { GENRE } from '../data/genres.js';
import { PLATFORM, potential } from '../data/platforms.js';
import { REVIEWERS } from '../data/reviews.js';
import { reviewTexts } from '../sim/score.js';
import { patchGame } from '../sim/actions.js';
import { patchCost } from '../sim/sales.js';
import { SCOPES, dateOf, yfOf, START_YEAR, WEEKS_PER_YEAR } from '../sim/const.js';
import { REMASTER_AGE, REMASTER_MIN, portsOf, portable, remasterable, portCost, portWeeks, portScore, portForecast, portTargets, remasterTargets, startPort, portRevenue } from '../sim/ports.js';
import { plot, gridLines } from './chart.js';
import { MONTHS } from './core.js';
import { fmtNum } from '../core/util.js';
import { lang } from '../core/i18n.js';
import { openSequel } from './wizard.js';
import { studioNotes } from './prompts.js';
import { crowdNote } from './crowd.js';
import { openExpansion } from './wizard.js';
import { SUB_TIERS, OPS, PRICE_MIN, PRICE_MAX, PATCH_WEEKS, EVENT_WEEKS, SURGE_WEEKS, tierMix, liveMonth, serverCap, livePatchCost, startLivePatch, setLivePrice, setLiveOps, closeLive, rivalMmos, rivalPull, rivalFactor, eventOn, eventReadyIn, liveEventCost, startLiveEvent, SHOP, isF2P, canGoF2P, goF2P, setLiveShop, liveLoad, liveArpu } from '../sim/live.js';

// Stäng servrarna och gör till gratisspel kräver två tryck: första trycket "armerar" knappen för det spelet
let closeArmed = null;
let f2pArmed = null;
// Fasta nycklar (inga dynamiska prefix): innehållets skick, driftnivåer och abonnemangsnivåer
const FRESH_KEY = { hi: 'live.fresh.hi', mid: 'live.fresh.mid', lo: 'live.fresh.lo' };
const OPS_KEY = ['live.ops.0', 'live.ops.1', 'live.ops.2'];
const TIER_KEY = { std: 'live.tier.std', pro: 'live.tier.pro', max: 'live.tier.max' };
const SHOP_KEY = ['live.shop.0', 'live.shop.1', 'live.shop.2'];

const scoreColor = (s) => (s >= 9 ? 'var(--gold)' : s >= 8 ? 'var(--good)' : s >= 6.5 ? 'var(--accent)' : s >= 5 ? 'var(--warn)' : 'var(--bug)');
const spec = (g) => ({ id: g.id, title: g.title, topic: g.topic, genre: g.genre, platform: g.platform });

function salesChart(g, w = 520, h = 150) {
  const arr = g.weekly;
  if (arr.length < 2) return `<div class="empty" style="padding:24px">${t('lib.noSales')}</div>`;
  const hi = Math.max(...arr, 1);
  const bw = (w - 10) / Math.max(arr.length, 24);
  const bars = arr.map((v, i) => `<rect x="${5 + i * bw}" y="${h - 18 - (v / hi) * (h - 30)}" width="${Math.max(1, bw - 1.5)}" height="${(v / hi) * (h - 30)}" rx="1.5" fill="url(#sg)"/>`).join('');
  const svg = `<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4de1d0"/><stop offset="1" stop-color="#4de1d0" stop-opacity=".25"/></linearGradient></defs>
    ${gridLines(5, w - 5, [0.33, 0.66].map((f) => (h - 18) * f + 5))}${bars}`;
  const labels = [
    { x: 5, y: h - 7, text: `${t('lib.week')} 1`, at: 'start' },
    { x: w - 5, y: h - 7, text: `${t('lib.week')} ${arr.length}`, at: 'end' },
  ];
  return plot({ w, h, svg, labels });
}

// Ett rimligt tak för y-axeln (en jämn siffra gånger en tiopotens), tätt nog att kurvan får använda det mesta av höjden
const niceMax = (v) => {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(1, v))));
  return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((k) => k * p).find((x) => x >= v);
};
// Markörerna i spelardiagrammet: ikon, färg och tips
const MARK = {
  exp: ['plus', 'var(--gold)', 'live.mk.exp'],
  ev: ['star', 'var(--fans)', 'live.mk.ev'],
  patch: ['wrench', 'var(--accent)', 'live.mk.patch'],
  down: ['x', 'var(--bug)', 'live.mk.down'],
  f2p: ['refresh', 'var(--warn)', 'live.mk.f2p'],
  rival: ['flag', '', 'live.mk.rival'],
};
const LEGEND = { exp: 'live.lg.exp', ev: 'live.lg.ev', patch: 'live.lg.patch', down: 'live.lg.down', f2p: 'live.lg.f2p', rival: 'live.lg.rival' };
const when = (tt) => {
  const d = dateOf(tt);
  return `${MONTHS[lang][d.month]} ${d.year}`;
};

// Spelare per månad som en yta, med expansioner, evenemang, uppdateringar, avbrott och konkurrenternas MMO utmärkta
function subsChart(G, g, w = 560, h = 172) {
  const lv = g.live;
  const pts = lv.hist.slice();
  if (!pts.length || G.t > pts[pts.length - 1].t) pts.push({ t: G.t, v: Math.round(lv.subs) });
  if (pts.length < 2) return `<div class="hint" style="padding:10px 0">${t('live.chartEmpty')}</div>`;
  const pad = { l: 6, r: 10, t: 46, b: 20 };
  const t0 = pts[0].t;
  const t1 = Math.max(t0 + 1, pts[pts.length - 1].t);
  const hi = niceMax(Math.max(...pts.map((p) => p.v), 1) * 1.08);
  const X = (tt) => pad.l + ((tt - t0) / (t1 - t0)) * (w - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - v / hi) * (h - pad.t - pad.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const base = Y(0).toFixed(1);
  const area = `${line} L${X(t1).toFixed(1)} ${base} L${X(t0).toFixed(1)} ${base} Z`;
  // årtal längs x-axeln, glesare för långlivade spel
  const y0 = Math.ceil(t0 / WEEKS_PER_YEAR);
  const y1 = Math.floor(t1 / WEEKS_PER_YEAR);
  const step = Math.max(1, Math.ceil((y1 - y0 + 1) / 6));
  const labels = [];
  for (let y = y0; y <= y1; y += step) {
    const x = X(y * WEEKS_PER_YEAR);
    if (x > pad.l + 14 && x < w - pad.r - 14) labels.push({ x, y: h - 8, text: String(START_YEAR + y) });
  }
  if (!labels.length) labels.push({ x: pad.l, y: h - 8, text: when(t0), at: 'start' });
  for (const f of [1, 0.5]) labels.push({ x: pad.l + 2, y: Y(hi * f) - 7, text: fmtNum(hi * f), at: 'start', cls: f === 1 ? 'hi' : '' });
  // markörer: expansioner (från lv.exps), händelserna i lv.marks och konkurrenternas MMO som startade under tiden
  const raw = [];
  for (const id of lv.exps) {
    const e = G.games.find((x) => x.id === id);
    if (e) raw.push({ t: e.t, k: 'exp', tip: t('live.mk.exp', { title: e.title }) });
  }
  for (const m of lv.marks || []) if (MARK[m.k]) raw.push({ t: m.t, k: m.k, tip: t(MARK[m.k][2]) });
  for (const m of (G.market && G.market.mmos) || []) if (m.t0 >= t0 && m.t0 <= t1) raw.push({ t: m.t0, k: 'rival', c: m.color, tip: t('live.mk.rival', { studio: m.studio, title: L(m.title) }) });
  raw.sort((a, b) => a.t - b.t);
  // två rader överst så att markörer nära varandra inte täcker varandra; en tredje får vänta till nästa lucka
  const rows = [-1e9, -1e9];
  const gap = w * 0.055;
  const marks = [];
  const vlines = [];
  for (const r of raw) {
    const x = Math.max(pad.l + 8, Math.min(w - pad.r - 4, X(r.t)));
    const row = rows.findIndex((last) => x - last >= gap);
    if (row < 0) continue;
    rows[row] = x;
    const [ic, col] = MARK[r.k];
    marks.push({ x, y: 9 + row * 17, c: r.c || col, ic, tip: `${r.tip} · ${when(r.t)}` });
    vlines.push(`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${(17 + row * 17).toFixed(1)}" y2="${base}" stroke="${r.c || col}" stroke-opacity=".35" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/>`);
  }
  const last = pts[pts.length - 1];
  const svg = `<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cf29a" stop-opacity=".38"/><stop offset="1" stop-color="#7cf29a" stop-opacity="0"/></linearGradient></defs>
    ${gridLines(pad.l, w - pad.r, [Y(hi), Y(hi / 2), Y(0)])}${vlines.join('')}
    <path d="${area}" fill="url(#lg)"/><path d="${line}" fill="none" stroke="#7cf29a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  const used = Object.keys(MARK).filter((k) => raw.some((r) => r.k === k));
  const legend = used.length
    ? `<div class="row wrap pl-legend">${used.map((k) => `<span style="--c:${k === 'rival' ? 'var(--muted)' : MARK[k][1]}">${icon(MARK[k][0])}${t(LEGEND[k])}</span>`).join('')}</div>`
    : '';
  return plot({ w, h, svg, labels, marks, dot: { x: X(last.t), y: Y(last.v), c: '#7cf29a' } }) + legend;
}

// Konkurrenternas MMO som drar spelare från g, mest först. Andelarna skalas så att de tillsammans blir den verkliga
// förlusten (rivalFactor har ett tak), inte summan av varje konkurrents egen dragning.
function rivalList(G, g) {
  const all = rivalMmos(G).map((m) => ({ m, p: rivalPull(G, m, g) }));
  const sum = all.reduce((a, x) => a + x.p, 0);
  const k = sum > 0 ? (1 - rivalFactor(G, g)) / sum : 0;
  const rows = all
    .map((x) => ({ m: x.m, p: x.p * k }))
    .sort((a, b) => b.p - a.p)
    .map(({ m, p }) => `<div class="ltier"><i class="ldot" style="background:${m.color}"></i><div style="flex:1;min-width:0"><b>${esc(L(m.title))}</b>${G.t - m.t0 < SURGE_WEEKS ? `<span class="tag" style="--c:var(--bug);margin-left:8px">${t('live.rivalNew')}</span>` : ''}
      <div class="faint" style="font-size:11.5px">${esc(m.studio)} · ${L(GENRE[m.genre].name)} · ${m.score.toFixed(1)}</div></div><b class="num" style="color:var(--bug)">${t('live.rivalPull', { n: Math.max(1, Math.round(p * 100)) })}</b></div>`);
  return `<div class="lbl" style="margin:16px 0 4px">${t('live.rivals')}</div><p class="hint" style="margin-bottom:8px">${t(rows.length ? 'live.rivalsHelp' : 'live.rivalsNone')}</p>${rows.length ? `<div class="col" style="gap:6px">${rows.join('')}</div>` : ''}`;
}

// Evenemangsknappen: pågår, väntar på nästa eller kan starta
function eventBtn(G, g) {
  const L = g.live;
  const wait = eventReadyIn(G, L);
  const label = eventOn(G, L) ? tn('live.eventOn', L.ev.until - G.t) : wait > 0 ? tn('live.eventWait', wait) : t('live.event') + ' · ' + money(liveEventCost(G, g));
  return `<button class="btn" data-act="lv-event" data-id="${g.id}" ${wait > 0 ? 'disabled' : ''} data-tip="${esc(t('live.eventTip', { n: EVENT_WEEKS }))}">${icon('star')}${label}</button>`;
}

// Driftpanelen för ett onlinespel: spelare, intäkter, innehåll, serverlast, konkurrenter, priser per nivå, drift och åtgärder
function livePanel(G, g) {
  const L = g.live;
  if (!L) return '';
  if (L.closed) return `<div class="card live-card" style="margin-top:16px"><div class="lbl">${t('live.title')}</div><div class="muted" style="margin-top:6px">${t('live.closed', { y: dateOf(L.closed).year })} · ${t('live.total')} ${money(L.rev)} · ${t('live.peak', { n: fmtNum(L.peak) })}</div></div>`;
  const mix = tierMix(G, L);
  const m = liveMonth(G, g);
  const cap = serverCap(G);
  const used = liveLoad(G);
  const f2p = isF2P(L);
  const load = cap ? used / cap : 1;
  const fk = L.fresh >= 60 ? 'hi' : L.fresh >= 30 ? 'mid' : 'lo';
  const fcol = fk === 'hi' ? 'var(--good)' : fk === 'mid' ? 'var(--warn)' : 'var(--bug)';
  const tiers = SUB_TIERS.map((id, i) => `<div class="ltier"><div style="flex:1;min-width:0"><b>${t(TIER_KEY[id])}</b><div class="faint" style="font-size:11.5px">${t('live.share', { n: Math.round(mix.share[i] * 100) })} · ${t('live.default', { v: money(mix.def[i]) })}</div></div>
      <button class="iconbtn" data-act="lv-price" data-id="${g.id}" data-i="${i}" data-d="-1" aria-label="${t('live.cheaper')}" data-tip="${t('live.cheaper')}" ${L.price[i] <= PRICE_MIN ? 'disabled' : ''}>${icon('minus')}</button>
      <b class="num lprice">${money(mix.prices[i])}<span class="faint">${t('ui.perMonth')}</span></b>
      <button class="iconbtn" data-act="lv-price" data-id="${g.id}" data-i="${i}" data-d="1" aria-label="${t('live.dearer')}" data-tip="${t('live.dearer')}" ${L.price[i] >= PRICE_MAX ? 'disabled' : ''}>${icon('plus')}</button></div>`).join('');
  const patchLeft = L.patch ? Math.max(0, L.patch.until - G.t) : 0;
  const armed = closeArmed === g.id;
  const f2pArm = f2pArmed === g.id;
  // abonnemangsnivåerna, eller butiken om spelet är gratis
  const pay = f2p
    ? `<div class="lbl" style="margin:14px 0 4px">${t('live.shop')}</div><p class="hint" style="margin-bottom:8px">${t('live.shopHelp')}</p>
    <div class="row wrap" style="gap:10px"><div class="seg">${SHOP.map((_, i) => `<button class="${(L.shop | 0) === i ? 'on' : ''}" data-act="lv-shop" data-id="${g.id}" data-i="${i}">${t(SHOP_KEY[i])}</button>`).join('')}</div>
    <span class="faint" style="font-size:12.5px">${t('live.arpu', { v: money(liveArpu(G, L)) })}</span></div>`
    : `<div class="lbl" style="margin:14px 0 4px">${t('live.tiers')}</div><p class="hint" style="margin-bottom:8px">${t('live.tierHelp')}</p>
    <div class="col" style="gap:6px">${tiers}</div>
    ${canGoF2P(G, L) ? `<div class="ltier f2p-row" style="margin-top:8px"><div style="flex:1;min-width:0"><b>${t('live.f2pHead')}</b><div class="faint" style="font-size:11.5px">${t('live.f2pHelp')}</div></div>
      <button class="btn sm ${f2pArm ? 'danger' : ''}" data-act="lv-f2p" data-id="${g.id}">${icon('refresh')}${t(f2pArm ? 'live.f2pSure' : 'live.f2p')}</button></div>` : ''}`;
  return `<div class="card live-card" style="margin-top:16px">
    <div class="row" style="margin-bottom:10px;gap:8px"><span class="tag" style="--c:var(--good)">${icon('globe')}${t('live.tag')}</span>${f2p ? `<span class="tag" style="--c:var(--warn)">${t('live.f2pTag')}</span>` : ''}<div class="lbl">${t('live.title')}</div><span class="sp"></span>${L.exps.length ? `<span class="faint" style="font-size:12px">${t('live.exps')}: ${L.exps.length}</span>` : ''}</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
      <div class="counter" style="--c:var(--good)"><div class="v num">${fmtNum(L.subs)}</div><div class="k">${t(f2p ? 'live.players' : 'live.subs')} · ${t('live.peak', { n: fmtNum(L.peak) })}</div></div>
      <div class="counter" style="--c:var(--money)"><div class="v num">${money(m.rev)}</div><div class="k">${t('live.revM')}</div></div>
      <div class="counter" style="--c:var(--bug)"><div class="v num">−${money(m.cost)}</div><div class="k">${t('live.costM')}</div></div>
      <div class="counter" style="--c:var(--money)"><div class="v num">${money(L.rev)}</div><div class="k">${t('live.total')}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:12px;gap:14px">
      <div data-tip="${esc(t('live.freshTip'))}"><div class="row" style="font-size:12.5px;margin-bottom:4px"><span>${t('live.fresh')}</span><span class="sp"></span><b style="color:${fcol}">${t(FRESH_KEY[fk])}</b></div>${bar(L.fresh, fcol, 'thin')}</div>
      <div data-tip="${esc(t('live.loadTip', { n: fmtNum(used), m: fmtNum(cap) }))}"><div class="row" style="font-size:12.5px;margin-bottom:4px"><span>${t('live.load')}</span><span class="sp"></span><b class="num" style="color:${load > 1 ? 'var(--bug)' : load > 0.85 ? 'var(--warn)' : 'var(--text)'}">${Math.round(load * 100)}%</b></div>${bar(load * 100, load > 1 ? 'var(--bug)' : load > 0.85 ? 'var(--warn)' : 'var(--accent)', 'thin')}</div>
    </div>
    <div class="lbl" style="margin:16px 0 4px">${t(f2p ? 'live.chartPlayers' : 'live.chart')}</div>${subsChart(G, g)}
    ${rivalList(G, g)}
    ${pay}
    <div class="lbl" style="margin:16px 0 6px">${t('live.ops')}</div>
    <div class="seg">${OPS.map((_, i) => `<button class="${L.ops === i ? 'on' : ''}" data-act="lv-ops" data-id="${g.id}" data-i="${i}">${t(OPS_KEY[i])}</button>`).join('')}</div>
    <p class="hint" style="margin-top:6px">${t('live.opsHelp')}</p>
    <div class="row wrap" style="gap:8px;margin-top:14px">
      <button class="btn primary" data-act="lv-patch" data-id="${g.id}" ${L.patch ? 'disabled' : ''} data-tip="${esc(t('live.patchTip', { n: PATCH_WEEKS }))}">${icon('wrench')}${L.patch ? tn('live.patching', patchLeft) : t('live.patch') + ' · ' + money(livePatchCost(G, g))}</button>
      ${eventBtn(G, g)}
      <button class="btn" data-act="lv-exp" data-id="${g.id}" ${G.job ? 'disabled' : ''}>${icon('plus')}${t('live.expand')}</button>
      <span class="sp"></span>
      <button class="btn ${armed ? 'danger' : 'ghost'}" data-act="lv-close" data-id="${g.id}">${icon('x')}${t(armed ? 'live.closeSure' : 'live.close')}</button>
    </div></div>`;
}

function listView(G) {
  if (!G.games.length) return `<div class="empty">${icon('gamepad')}<div class="h3" style="margin-bottom:6px">${t('lib.empty')}</div><div>${t('lib.emptyHelp')}</div></div>`;
  const cards = G.games
    .slice()
    .reverse()
    .map((g) => {
      const tp = TOPIC[g.topic];
      const ge = GENRE[g.genre];
      return `<button class="card hov game" data-act="lib-open" data-id="${g.id}">
        ${coverImg(spec(g), 72)}
        <div style="flex:1;min-width:0;text-align:left"><b class="h3" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.title)}</b>
          <div class="row wrap" style="gap:5px;margin:6px 0"><span class="chip c" style="--c:${ge.color}">${L(ge.name)}</span><span class="chip">${L(tp.name)}</span>${g.expansionOf ? `<span class="chip c" style="--c:var(--good)">${t('dev.expChip')}</span>` : ''}</div>
          <div class="faint" style="font-size:12px">${esc(PLATFORM[g.platform].name)} · ${dateOf(g.t).year}${portsOf(g).length ? ' · ' + tn('lib.ports', portsOf(g).length) : ''}</div>
          <div class="row" style="gap:12px;margin-top:6px;font-size:12.5px"><span style="color:var(--money)">${money(g.revenue + (g.live ? g.live.rev : 0) + portRevenue(g))}</span>${g.live && !g.live.closed ? `<span class="tag" style="--c:var(--good)">${t('live.tag')} · ${fmtNum(g.live.subs)}</span>` : `<span class="faint">${g.ended ? t('lib.ended') : t('lib.onSale')}</span>`}</div></div>
        <div class="disp" style="font-size:39px;color:${scoreColor(g.score)};align-self:flex-start">${g.score.toFixed(1)}</div></button>`;
    })
    .join('');
  return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(310px,1fr))">${cards}</div>`;
}

// Porteringar: färdiga porter med betyg och intäkter, pågående portering och knappar för de plattformar som går att porta till
const SIZE_KEY = ['port.size.0', 'port.size.1', 'port.size.2'];
// En knapp per plattform: väntat betyg och väntad försäljning (grön om den väntas betala kostnaden)
function portBtn(G, g, p, kind, cost) {
  const pl = PLATFORM[p.id];
  const rem = kind === 'remaster';
  const v = portScore(G, g, p.id, undefined, kind);
  const rev = p.licensed ? portForecast(G, g, p.id, undefined, kind) : 0;
  const pot = potential(pl, yfOf(G.t));
  const tip = p.licensed
    ? t(rem ? 'port.remTip' : 'port.tip', { plat: esc(pl.name), v: v.toFixed(1), o: g.score.toFixed(1), rev: money(rev), size: t(SIZE_KEY[pot < 15 ? 0 : pot < 35 ? 1 : 2]), cost: money(cost), n: portWeeks(g, kind) })
    : t('port.needLicense');
  const off = !p.licensed || !!G.port || G.money < cost;
  return `<button class="btn sm" data-act="lib-port" data-id="${g.id}" data-p="${p.id}"${rem ? ' data-kind="remaster"' : ''} ${off ? 'disabled' : ''} data-tip="${esc(tip)}">${p.licensed ? '' : icon('lock')}${esc(pl.name)}${p.licensed ? ` <b class="num" style="color:${scoreColor(v)}">${v.toFixed(1)}</b><span class="num" style="color:${rev >= cost ? 'var(--money)' : 'var(--bug)'}">≈${money(rev)}</span>` : ''}</button>`;
}

function portsPanel(G, g) {
  const done = portsOf(g);
  if (!done.length && (g.live || g.expansionOf)) return '';
  const tag = `<span class="chip c" style="--c:var(--hot)">${t('port.remTag')}</span>`;
  const rows = done
    .map((p) => `<div class="pt-row"><span class="chip">${esc(PLATFORM[p.platform].name)}</span>${p.kind === 'remaster' ? tag : ''}<span class="faint">${dateOf(p.t).year}</span><b class="num" style="color:${scoreColor(p.score)}">${p.score.toFixed(1)}</b><span class="sp"></span><b class="num" style="color:var(--money)">${money(p.revenue)}</b><span class="faint pt-st">${p.ended ? t('lib.ended') : t('lib.onSale')}</span></div>`)
    .join('');
  let body = '';
  if (!portable(G, g)) body = g.live || g.expansionOf ? '' : `<span class="hint">${icon('lock')} ${t('port.locked')}</span>`;
  else {
    const P = G.port;
    const mine = P && P.game === g.id;
    const prem = P?.kind === 'remaster';
    const work = mine
      ? `<div class="pt-row" data-tip="${esc(t(prem ? 'port.remWorking' : 'port.working', { plat: esc(PLATFORM[P.platform].name) }))}"><span class="chip c" style="--c:var(--design)">${icon('gamepad')}${esc(PLATFORM[P.platform].name)}</span>${prem ? tag : ''}<div style="flex:1">${bar(((G.t - P.t0) / Math.max(1, P.until - P.t0)) * 100, 'var(--design)', 'thin')}</div><span class="faint pt-st">${t('pn.weeksLeft', { n: Math.max(0, P.until - G.t) })}</span></div>`
      : '';
    const other = P && !mine ? G.games.find((x) => x.id === P.game) : null;
    const cost = portCost(G, g);
    const btns = portTargets(G, g).map((p) => portBtn(G, g, p, 'port', cost)).join('');
    // remaster: knappar när spelet är gammalt nog, annars en rad om när det går (eller att forskningen saknas)
    let rem = '';
    const classic = !g.remastered && g.score >= REMASTER_MIN && !(mine && prem);
    if (remasterable(G, g)) {
      const rc = portCost(G, g, 'remaster');
      const rb = remasterTargets(G, g).map((p) => portBtn(G, g, p, 'remaster', rc)).join('');
      if (rb) rem = `<div class="row wrap" style="gap:6px;margin-top:8px"><span class="lbl">${t('port.remTo')} · ${money(rc)}</span>${rb}</div>`;
    } else if (classic && G.u.flags.remaster) rem = `<div class="hint" style="margin-top:8px">${t('port.remSoon', { year: dateOf(g.t + REMASTER_AGE * WEEKS_PER_YEAR).year })}</div>`;
    else if (classic && G.t - g.t >= REMASTER_AGE * WEEKS_PER_YEAR) rem = `<div class="hint" style="margin-top:8px">${icon('lock')} ${t('port.remLocked')}</div>`;
    const busy = other ? `<div class="hint">${t(prem ? 'port.remBusyWith' : 'port.busyWith', { title: esc(other.title), plat: esc(PLATFORM[P.platform].name) })}</div>` : '';
    body = `${work}${busy}
      ${btns ? `<div class="row wrap" style="gap:6px;margin-top:8px"><span class="lbl">${t('port.to')} · ${money(cost)}</span>${btns}</div>` : mine ? '' : `<div class="hint">${t('port.none')}</div>`}${rem}
      <div class="hint" style="margin-top:8px">${t('port.help')}</div>`;
  }
  if (!rows && !body) return '';
  return `<div class="card" style="margin-top:16px"><div class="row" style="margin-bottom:6px"><div class="lbl">${t('port.head')}</div><span class="sp"></span>${done.length ? `<span class="faint" style="font-size:12px">${t('port.total', { v: money(portRevenue(g)) })}</span>` : ''}</div>${rows}${body}</div>`;
}

function detailView(G, id) {
  const g = G.games.find((x) => x.id === id);
  if (!g) return listView(G);
  const tp = TOPIC[g.topic];
  const ge = GENRE[g.genre];
  const texts = reviewTexts(g, g, lang);
  const patchOk = G.research.done.includes('q_patch');
  const d = dateOf(g.t);
  return `
    <button class="btn sm ghost" data-act="lib-back" style="margin-bottom:12px">${icon('back')}${t('ui.back')}</button>
    <div class="grid" style="grid-template-columns:auto 1fr;gap:20px;align-items:start">
      <div>${coverImg(spec(g), 132, 'big')}</div>
      <div>
        <div class="h2" style="overflow-wrap:anywhere">${esc(g.title)}</div>
        <div class="row wrap" style="gap:6px;margin:8px 0 14px"><span class="chip c" style="--c:${ge.color}">${glyphImg(ge.glyph, ge.color, 16, false)}${L(ge.name)}${g.genre2 ? ' + ' + L(GENRE[g.genre2].name) : ''}</span><span class="chip">${glyphImg(tp.glyph, '#fff', 16, false)}${L(tp.name)}</span><span class="chip">${esc(PLATFORM[g.platform].name)}</span><span class="chip">${L(SCOPES[g.scope].name)}</span><span class="chip">${MONTHS[lang][d.month]} ${d.year}</span></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">
          <div class="counter" style="--c:${scoreColor(g.score)}"><div class="v num">${g.score.toFixed(1)}</div><div class="k">${t('lib.score')}</div></div>
          <div class="counter" style="--c:var(--money)"><div class="v num">${money(g.revenue)}</div><div class="k">${t('lib.revenue')}</div></div>
          <div class="counter" style="--c:var(--accent)"><div class="v num">${fmtNum(g.units)}</div><div class="k">${t('lib.units')}</div></div>
          <div class="counter" style="--c:var(--fans)"><div class="v num">${g.fansGained >= 0 ? '+' : ''}${fmtNum(g.fansGained)}</div><div class="k">${t('hud.fans')}</div></div>
        </div>
      </div>
    </div>
    ${livePanel(G, g)}
    <div class="card" style="margin-top:16px"><div class="row" style="margin-bottom:6px"><div class="lbl">${t('lib.sales')}</div><span class="sp"></span><span class="faint" style="font-size:12px">${g.ended ? t('lib.ended') : t('lib.forecast', { v: money(g.total) })}</span></div>${salesChart(g)}</div>
    ${portsPanel(G, g)}
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-top:16px">${texts.map((r, i) => `<div class="rev show" style="--c:${REVIEWERS[i].color}"><div class="rv-h"><div class="rv-av">${icon(['cpu', 'book', 'heart', 'skull'][i])}</div><div style="flex:1"><b>${L(REVIEWERS[i].name)}</b></div><div class="rv-s num" style="color:${scoreColor(r.score)}">${r.score.toFixed(1)}</div></div><div class="rv-t"><b>${esc(r.headline)}</b>${r.detail ? `<p>${esc(r.detail)}</p>` : ''}</div></div>`).join('')}</div>
    ${g.insights?.length ? `<div class="card" style="margin-top:16px"><div class="lbl" style="margin-bottom:8px">${t('rep.notes')}</div><div class="ins">${studioNotes(g, g)}${crowdNote(G, g, true)}</div></div>` : ''}
    <div class="row wrap" style="gap:10px;margin-top:16px">
      ${G.u.flags.sequels ? `<button class="btn primary" data-act="lib-seq" data-id="${g.id}" ${G.job ? 'disabled' : ''}>${icon('film')}${t('lib.sequel')}</button>` : `<span class="hint">${icon('lock')} ${t('lib.seqLocked')}</span>`}
      ${patchOk && !g.ended ? `<button class="btn" data-act="lib-patch" data-id="${g.id}" ${g.patched || g.bugs < 3 ? 'disabled' : ''} data-tip="${t('lib.patchTip')}">${icon('wrench')}${g.patched ? t('lib.patched') : t('lib.patch') + ' · ' + money(patchCost(G, g))}</button>` : ''}
      ${g.bugs > 0 ? `<span class="chip c" style="--c:var(--bug)">${icon('bug')}${g.bugs} ${t('stat.bugs')}</span>` : ''}
    </div>`;
}

regWin({
  id: 'library',
  icon: 'gamepad',
  color: 'var(--accent)',
  size: 'xl',
  title: () => t('lib.title'),
  sub: (G) => tn('lib.sub', G.games.length, { v: money(G.stats.revenue) }),
  render(G, arg) {
    return arg && arg.id ? detailView(G, arg.id) : listView(G);
  },
});
act('lib-open', (el) => {
  closeArmed = null;
  f2pArmed = null;
  UI.arg = { id: +el.dataset.id };
  UI.refresh();
  const b = $('[data-keep="body"]');
  if (b) b.scrollTop = 0;
});
act('lib-back', () => {
  UI.arg = null;
  UI.refresh();
});
act('lib-seq', (el) => {
  const G = UI.app.G;
  const g = G.games.find((x) => x.id === +el.dataset.id);
  UI.close(true);
  openSequel(G, g);
});
act('lib-port', (el) => {
  const r = startPort(UI.app.G, +el.dataset.id, el.dataset.p, el.dataset.kind || 'port');
  if (r === true) sfx.play('coin');
  else if (r) errToast(r);
  UI.refresh();
});
act('lib-patch', (el) => {
  const G = UI.app.G;
  const r = patchGame(G, +el.dataset.id);
  if (r !== true) errToast(r);
  UI.refresh();
});
act('lv-price', (el) => {
  const G = UI.app.G;
  const g = G.games.find((x) => x.id === +el.dataset.id);
  if (!g || !g.live) return;
  const i = +el.dataset.i;
  setLivePrice(G, g.id, i, g.live.price[i] + 0.05 * +el.dataset.d);
  UI.refresh();
});
act('lv-ops', (el) => {
  setLiveOps(UI.app.G, +el.dataset.id, +el.dataset.i);
  UI.refresh();
});
act('lv-patch', (el) => {
  const r = startLivePatch(UI.app.G, +el.dataset.id);
  if (r === true) sfx.play('click');
  else errToast(r);
  UI.refresh();
});
act('lv-event', (el) => {
  const r = startLiveEvent(UI.app.G, +el.dataset.id);
  if (r === true) sfx.play('coin');
  else errToast(r);
  UI.refresh();
});
act('lv-exp', (el) => {
  const G = UI.app.G;
  const g = G.games.find((x) => x.id === +el.dataset.id);
  if (!g) return;
  UI.close(true);
  openExpansion(G, g);
});
act('lv-shop', (el) => {
  setLiveShop(UI.app.G, +el.dataset.id, +el.dataset.i);
  UI.refresh();
});
act('lv-f2p', (el) => {
  const id = +el.dataset.id;
  if (f2pArmed !== id) f2pArmed = id;
  else {
    f2pArmed = null;
    if (goF2P(UI.app.G, id)) sfx.play('coin');
  }
  UI.refresh();
});
act('lv-close', (el) => {
  const id = +el.dataset.id;
  if (closeArmed !== id) closeArmed = id;
  else {
    closeArmed = null;
    closeLive(UI.app.G, id);
  }
  UI.refresh();
});
