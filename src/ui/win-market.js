import { $, esc, icon, t, L, UI, act, regWin, bar, money, toast, errToast } from './core.js';
import { sfx } from '../audio/sfx.js';
import { glyphImg } from '../render/glyphs.js';
import { coverImg } from '../render/covers.js';
import { PLATFORMS, PLATFORM, potential, platTier, pcGeneration } from '../data/platforms.js';
import { GENRE } from '../data/genres.js';
import { TOPIC } from '../data/topics.js';
import { yearOf, yfOf, dateOf } from '../sim/const.js';
import { canLicense, buyLicense, licenseCost } from '../sim/actions.js';
import { topSellers, trendWeeksLeft, upcomingReleases, releaseWeek } from '../sim/market.js';
import { fmtNum } from '../core/util.js';
import { TOPICS } from '../data/topics.js';
import { GENRES } from '../data/genres.js';
import { CATEGORIES } from '../data/categories.js';
import { idealFocus } from '../sim/score.js';
import { canStore } from '../sim/store.js';
import { storeTab } from './store-tab.js';
import { ACQ_MAX, SUB_SHARE, canAcquireAny, ownedComps, compYearly, acqPrice, canAcquire, acquire, subIncome } from '../sim/acquire.js';

const M = { tab: 'plat' };

function platformsTab(G) {
  const yf = yfOf(G.t);
  const year = yearOf(G.t);
  let tot = 0;
  for (const p of PLATFORMS) tot += potential(p, yf);
  const live = PLATFORMS.filter((p) => potential(p, yf) > 0.5 || (yf >= p.y0 + p.m0 / 12 && yf < (p.y1 >= 2100 ? 9999 : p.y1 + 1.5))).sort((a, b) => potential(b, yf) - potential(a, yf));
  const soon = PLATFORMS.filter((p) => p.y0 + p.m0 / 12 > yf && p.y0 + p.m0 / 12 < yf + 2.2).sort((a, b) => a.y0 - b.y0);
  const row = (p) => {
    const share = (potential(p, yf) / tot) * 100;
    const owned = G.licenses.includes(p.id);
    const can = canLicense(G, p.id);
    return `<div class="mrow card">
      <div class="plat-g" style="--c:${p.color}">${glyphImg('gp_' + p.kind, p.color, 32, true)}</div>
      <div style="flex:1;min-width:0"><div class="row" style="gap:8px"><b class="h3">${esc(p.id === 'pc' ? pcGeneration(year) : p.name)}</b><span class="faint" style="font-size:11.5px">${esc(p.maker)}</span></div>
        <div class="hint" style="margin:3px 0 7px">${L(p.desc)}</div>
        <div class="row" style="gap:16px"><div style="flex:1">${bar(Math.min(100, share * 3), p.color, 'thin')}</div><span class="num faint" style="font-size:12px;min-width:44px">${share.toFixed(0)}%</span><span class="pips">${[1, 2, 3, 4, 5, 6, 7].map((i) => `<i class="${i <= platTier(p, year) ? 'on' : ''}"></i>`).join('')}</span></div>
      </div>
      <div style="text-align:right;min-width:120px">${owned ? `<span class="tag" style="--c:var(--good)">${t('wiz.owned')}</span>` : can === true || can === 'money' ? `<button class="btn gold" data-act="m-buy" data-id="${p.id}" ${can === 'money' ? 'disabled' : ''}>${icon('cart')}${money(licenseCost(G, p.id))}</button>` : `<span class="faint">${t('mkt.ended')}</span>`}
        <div class="faint" style="font-size:11px;margin-top:5px">${p.y0}–${p.y1 >= 2100 ? '…' : p.y1}</div></div>
    </div>`;
  };
  return `<div class="col" style="gap:10px">${live.map(row).join('')}</div>
    ${soon.length ? `<div class="lbl" style="margin:18px 0 8px">${t('mkt.soon')}</div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${soon.map((p) => `<div class="card row" style="gap:12px;opacity:.75"><div class="plat-g" style="--c:${p.color};width:44px;height:38px">${glyphImg('gp_' + p.kind, p.color, 16, true)}</div><div><b>${esc(p.name)}</b><div class="faint" style="font-size:11.5px">${esc(p.maker)} · ${t('mkt.launch')} ${p.y0}</div></div></div>`).join('')}</div>` : ''}`;
}

function chartsTab(G) {
  const rows = topSellers(G, 12, 10);
  if (!rows.length) return `<div class="empty">${icon('chart')}<div>${t('mkt.noCharts')}</div></div>`;
  return `<div class="col" style="gap:8px">${rows
    .map((r, i) => {
      const title = L(r.title);
      const tp = TOPIC[r.topic];
      const ge = GENRE[r.genre];
      return `<div class="chart-row ${r.yours ? 'yours' : ''}"><div class="rk disp">${i + 1}</div>${coverImg({ id: r.id, title, topic: r.topic, genre: r.genre, platform: r.platform }, 40)}
        <div style="flex:1;min-width:0"><b>${esc(title)}</b>${r.yours ? `<span class="tag" style="--c:var(--accent);margin-left:8px">${t('mkt.you')}</span>` : ''}<div class="faint" style="font-size:12px">${esc(r.studio)}</div>
        <div class="row wrap" style="gap:5px;margin-top:4px"><span class="chip c" style="--c:${ge.color}">${L(ge.name)}</span><span class="chip">${L(tp.name)}</span><span class="chip" style="--c:${PLATFORM[r.platform].color}">${esc(PLATFORM[r.platform].name)}</span>${r.mmo ? `<span class="chip c" style="--c:var(--good)">${t('dev.liveChip')}</span>` : ''}</div></div>
        <div style="text-align:right"><div class="disp" style="font-size:26px;color:var(--gold)">${r.score.toFixed(1)}</div><div class="faint num" style="font-size:12px">${fmtNum(r.units)} ${t('mkt.units')}</div></div></div>`;
    })
    .join('')}</div>`;
}

function trendsTab(G) {
  const tr = G.market.trend;
  const chip = (kind, x) => {
    const src = kind === 'genre' ? GENRE[x.id] : TOPIC[x.id];
    const hot = x.mult > 1;
    return `<div class="card row trendc ${hot ? 'hot' : 'cold'}" style="gap:12px">${glyphImg(src.glyph, hot ? '#ffb070' : '#8ad0ff', 32, true)}<div style="flex:1"><b>${L(src.name)}</b><div class="hint">${t(kind === 'genre' ? 'mkt.genre' : 'mkt.topic')} · ${t('mkt.trendLeft', { n: trendWeeksLeft(G, x) })}</div></div><div class="disp" style="font-size:29px;color:${hot ? 'var(--good)' : 'var(--bug)'}">${hot ? '+' : ''}${Math.round((x.mult - 1) * 100)}%</div></div>`;
  };
  return `<p class="hint" style="margin-bottom:14px">${t('mkt.trendHelp')}</p>
    <div class="lbl" style="margin-bottom:8px">${t('mkt.genres')}</div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-bottom:18px">${tr.genre.filter((x) => x.mult !== 1).map((x) => chip('genre', x)).join('')}</div>
    <div class="lbl" style="margin-bottom:8px">${t('mkt.topics')}</div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${tr.topic.filter((x) => x.mult !== 1).map((x) => chip('topic', x)).join('')}</div>`;
}

function insightsTab(G) {
  const topics = TOPICS.filter((tp) => G.u.topics.includes(tp.id));
  const genres = GENRES.filter((g) => G.u.genres.includes(g.id));
  const COL = { 4: 'var(--good)', 3: 'var(--accent)', 2: 'var(--warn)', 1: 'var(--bug)' };
  const head = `<div class="mx-h"></div>${genres.map((g) => `<div class="mx-h" data-tip="${esc(L(g.name))}">${glyphImg(g.glyph, g.color, 16, false)}</div>`).join('')}`;
  const rows = topics
    .map((tp) => `<div class="mx-r">${glyphImg(tp.glyph, '#fff', 16, false)}<span>${L(tp.name)}</span></div>${genres
      .map((g) => {
        const k = G.know.combos[tp.id + '|' + g.id];
        return k ? `<div class="mx-c k" style="--c:${COL[Math.round(k)]}" data-tip="${esc(t('compat.' + Math.round(k)))}"></div>` : `<div class="mx-c u">?</div>`;
      })
      .join('')}`)
    .join('');
  const known = genres.filter((g) => G.know.focus[g.id]);
  const focus = known.length
    ? known
        .map((g) => {
          const parts = [0, 1, 2].map((p) => idealFocus(G, g.id, p));
          const cats = CATEGORIES.filter((c) => G.u.cats.includes(c.id));
          return `<div class="card"><div class="row" style="margin-bottom:8px;gap:8px">${glyphImg(g.glyph, g.color, 16, false)}<b>${L(g.name)}</b></div>${cats
            .map((c) => `<div class="row" style="gap:8px;margin:3px 0"><span style="width:92px;font-size:11.5px;color:var(--muted)">${L(c.name)}</span><div style="flex:1">${bar(parts[c.phase][c.id] || 0, c.color, 'thin')}</div><span class="num faint" style="font-size:11px;width:30px;text-align:right">${parts[c.phase][c.id] || 0}%</span></div>`)
            .join('')}</div>`;
        })
        .join('')
    : `<div class="hint">${icon('info')} ${t('mkt.noFocus')}</div>`;
  return `<p class="hint" style="margin-bottom:14px">${t('mkt.insightHelp')}</p>
    <div class="mx" style="grid-template-columns:140px repeat(${genres.length}, 44px)">${head}${rows}</div>
    <div class="lbl" style="margin:20px 0 8px">${t('mkt.idealFocus')}</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">${focus}</div>`;
}

// Rykten om konkurrenternas nästa spel inom 24 veckor; de som delar genre eller tema med ditt projekt märks ut.
function rumorsHTML(G) {
  const J = G.job && G.job.kind === 'game' ? G.job : null;
  const up = upcomingReleases(G, 24).slice(0, 8);
  const row = (c) => {
    const ge = GENRE[c.next.genre];
    const tp = TOPIC[c.next.topic];
    const clash = J && !c.owned && (c.next.genre === J.genre || c.next.genre === J.genre2 || c.next.topic === J.topic);
    return `<div class="card row wrap" style="gap:10px 14px"><div class="dotc" style="background:${c.color}"></div><div style="flex:1 1 160px;min-width:0"><b>${esc(c.name)}</b>${clash ? ` <span class="tag" style="--c:var(--warn)">${t('mkt.clash', { title: esc(J.title) })}</span>` : ''}${c.owned ? ` <span class="tag" style="--c:var(--good)">${t('acq.owned')}</span>` : ''}<div class="row wrap" style="gap:5px;margin-top:4px"><span class="chip c" style="--c:${ge.color}">${glyphImg(ge.glyph, ge.color, 16, false)}${L(ge.name)}</span><span class="chip">${glyphImg(tp.glyph, '#fff', 16, false)}${L(tp.name)}</span></div></div><div class="faint num" style="font-size:12.5px;text-align:right">${t('mkt.rumorIn', { n: releaseWeek(c) - G.t })}</div></div>`;
  };
  return `<div class="lbl" style="margin-bottom:6px">${t('mkt.rumors')}</div><p class="hint" style="margin-bottom:10px">${t('mkt.rumorHelp')}</p>
    ${up.length ? `<div class="col" style="gap:8px;margin-bottom:20px">${up.map(row).join('')}</div>` : `<div class="hint" style="margin-bottom:20px">${t('mkt.noRumors')}</div>`}`;
}

// Uppköp: köpknapp per konkurrent (eller etiketten Dotterbolag och vad studion har gett), efter forskningen
function acqCell(G, c) {
  if (!canAcquireAny(G)) return '';
  if (c.owned) return `<div class="acq-cell" data-tip="${esc(t('acq.ownedTip', { year: dateOf(c.ownedT).year, paid: money(c.paid || 0), rev: money(c.subRev || 0) }))}"><span class="tag" style="--c:var(--good)">${t('acq.owned')}</span><div class="num" style="font-size:12px;color:var(--money);margin-top:4px">${t('acq.rev', { v: money(c.subRev || 0) })}</div></div>`;
  const price = acqPrice(G, c);
  const ok = canAcquire(G, c.id) === true;
  const tip = t('acq.tip', { v: money(compYearly(G, c)), pct: Math.round(SUB_SHARE * 100) });
  return `<div class="acq-cell"><button class="btn sm" data-act="m-acq" data-id="${c.id}" ${ok ? '' : 'disabled'} data-tip="${esc(tip)}">${icon('crown')}${t('acq.buy', { v: money(price) })}</button></div>`;
}

function rivalsTab(G) {
  const rows = G.comps.slice().sort((a, b) => b.best - a.best);
  const own = ownedComps(G).length;
  const head = canAcquireAny(G)
    ? `<p class="hint" style="margin-bottom:10px">${icon('crown')} ${t('acq.head', { n: own, max: ACQ_MAX, v: money(subIncome(G)) })} ${t('acq.help', { pct: Math.round(SUB_SHARE * 100) })}</p>`
    : yearOf(G.t) >= 1998 ? `<p class="hint" style="margin-bottom:10px">${icon('lock')} ${t('acq.locked')}</p>` : '';
  return `${rumorsHTML(G)}<div class="lbl" style="margin-bottom:8px">${t('mkt.tab.rivals')}</div>${head}<div class="col" style="gap:8px">${rows
    .map((c, i) => {
      const last = G.market.releases.filter((r) => r.comp === c.id).slice(-1)[0];
      return `<div class="card row rv-row ${c.owned ? 'owned' : ''}" style="gap:14px"><div class="rk disp">${i + 1}</div><div class="dotc" style="background:${c.color}"></div><div style="flex:1;min-width:0"><b>${esc(c.name)}</b><div class="faint" style="font-size:12px">${last ? t('mkt.lastRel', { title: esc(L(last.title)), v: last.score.toFixed(1) }) : t('mkt.noRel')}</div></div>
      <div class="rv-str" style="width:120px">${bar(((c.strength - 0.4) / 1.3) * 100, c.color, 'thin')}<div class="faint" style="font-size:11px;margin-top:3px">${t('mkt.strength')}</div></div>
      <div style="text-align:right;min-width:60px"><div class="disp" style="font-size:23px;color:var(--gold)">${c.best ? c.best.toFixed(1) : '–'}</div><div class="faint" style="font-size:11px">${t('mkt.games', { n: c.games })}</div></div>${acqCell(G, c)}</div>`;
    })
    .join('')}</div>`;
}

// Fliken Egen butik visas från 2001 (låst tills forskningen är klar)
const tabsOf = (G) => ['plat', 'charts', 'trends', 'insights', 'rivals', ...(canStore(G) || yearOf(G.t) >= 2001 ? ['store'] : [])];

regWin({
  id: 'market',
  icon: 'chart',
  color: 'var(--design)',
  size: 'xl',
  title: () => t('mkt.title'),
  headExtra: (G) => `<div class="tabs">${tabsOf(G).map((k) => `<button class="tab ${M.tab === k ? 'on' : ''}" data-act="m-tab" data-id="${k}">${t('mkt.tab.' + k)}</button>`).join('')}</div>`,
  render(G) {
    if (!tabsOf(G).includes(M.tab)) M.tab = 'plat';
    return M.tab === 'plat' ? platformsTab(G) : M.tab === 'charts' ? chartsTab(G) : M.tab === 'trends' ? trendsTab(G) : M.tab === 'insights' ? insightsTab(G) : M.tab === 'store' ? storeTab(G) : rivalsTab(G);
  },
  onOpen(G) {
    G.flags.seenPlat = G.t;
  },
});
act('m-tab', (el) => {
  M.tab = el.dataset.id;
  UI.refresh();
});
act('m-acq', (el) => {
  const G = UI.app.G;
  const r = acquire(G, +el.dataset.id);
  if (r === true) sfx.play('fanfare');
  else if (r) errToast(r);
  UI.refresh();
});
act('m-buy', (el) => {
  const G = UI.app.G;
  const r = buyLicense(G, el.dataset.id);
  if (r === true) {
    sfx.play('coin');
    toast(t('toast.license', { name: `<b>${PLATFORM[el.dataset.id].name}</b>` }), 'money');
  } else errToast(r);
  UI.refresh();
});
void $;
