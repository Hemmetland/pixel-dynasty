import { esc, icon, t, L, UI, act, money, errToast } from './core.js';
import { lang } from '../core/i18n.js';
import { fmtNum } from '../core/util.js';
import { sfx } from '../audio/sfx.js';
import { coverImg } from '../render/covers.js';
import { LEVEL_NAMES, LEVEL_PERKS, STORE_EVENTS } from '../data/storeevents.js';
import {
  LEVELS, levelOf, levelNext, spotSlots, spotWeeks, spotCost, spotsOf, spotGames, canSpot, startSpot, eventNow, eventNext, eventIn, eventFits,
  wishNow, eventBoost, DEALS, DEAL_WEEKS, dealsOf, dealSlots, dealGames, dealValue, canDeal, startDeal, autoDealOpen, setAutoDeal, BUNDLE, bundlesOf,
  bundleOpen, bundleGames, bundleValue, canBundle, startBundle, recOf,
} from '../sim/store.js';
import { dateOf } from '../sim/const.js';

// Butikens roligare delar i Butik-fönstret: storleken (nivån), temaveckorna, skyltfönstret (ett spel du lyfter fram mot en avgift) och
// önskelistan. Reglerna ligger i sim/store.js; här ligger bara korten och knappen som startar skyltfönstret.
const dec = (v) => v.toFixed(1).replace('.', lang === 'sv' ? ',' : '.');
const cover = (g, px) => coverImg({ id: g.id, title: L(g.title), topic: g.topic, genre: g.genre, platform: g.platform }, px);

// Butikens storlek: namn, framsteg mot nästa nivå och vad nästa nivå ger
export function levelCard(G) {
  const l = levelOf(G);
  const users = G.stats.storeUsers || 0;
  const nx = levelNext(G);
  const from = LEVELS[l - 1];
  const p = nx ? Math.round(Math.max(0, Math.min(1, (users - from) / (nx - from))) * 100) : 100;
  return `<div class="card sf-card sf-lvl" data-tip="${esc(t('dist.lvl.tip'))}">
    <div class="row" style="gap:8px;margin-bottom:6px">${icon('building')}<b>${t('dist.lvl.head', { name: L(LEVEL_NAMES[l - 1]), n: l, m: LEVELS.length })}</b></div>
    <div class="bar" style="--c:var(--accent);margin:8px 0 6px"><i style="width:${p}%"></i></div>
    <div class="sf-ladder">${LEVEL_NAMES.map((n, i) => `<span class="sf-step ${i + 1 < l ? 'done' : i + 1 === l ? 'cur' : ''}" data-tip="${esc(L(LEVEL_PERKS[i]))}"><i>${i + 1}</i>${L(n)}</span>`).join('')}</div>
    <div class="hint" style="margin-top:8px">${nx ? t('dist.lvl.next', { v: fmtNum(nx), perk: L(LEVEL_PERKS[l]) }) : t('dist.lvl.max')}</div></div>`;
}

// Temaveckor: den som pågår (eller nästa), vilka av dina pc-spel som passar och de fyra veckorna under året
export function eventBanner(G) {
  const now = eventNow(G);
  const nx = eventNext(G);
  const ev = now || (nx && nx.ev);
  if (!ev) return '';
  const fits = eventFits(G, ev);
  const when = now ? `<span class="tag" style="--c:var(--hot)">${t('dist.ev.now')}</span>` : `<span class="tag" style="--c:var(--gold)">${t('dist.ev.in', { n: nx.in })}</span>`;
  const names = fits.slice(0, 3).map((g) => `<span class="chip">${esc(L(g.title))}</span>`).join('');
  const cal = STORE_EVENTS.map((e) => {
    const n = eventIn(G, e);
    return `<span class="chip ${e.id === ev.id ? 'c' : ''}" style="--c:var(--gold)" data-tip="${esc(L(e.desc))}">${icon(e.ic)}${L(e.name)} <span class="faint">${n ? t('dist.ev.in', { n }) : t('dist.ev.now')}</span></span>`;
  }).join('');
  return `<div class="card sf-card sf-ev ${now ? 'on' : ''}">
    <div class="row wrap" style="gap:8px;margin-bottom:6px">${icon(ev.ic)}<b>${L(ev.name)}</b>${when}<span class="sp"></span><span class="tag" style="--c:var(--good)" data-tip="${esc(t('dist.ev.liftTip'))}">${t('dist.ev.lift', { n: Math.round(ev.lift * eventBoost(G) * 100) })}</span></div>
    <div class="hint">${L(ev.desc)}</div>
    <div class="hint" style="margin-top:6px">${fits.length ? t('dist.ev.fit', { n: fits.length }) : t('dist.ev.fit0')}</div>
    ${names ? `<div class="sf-chips">${names}</div>` : ''}
    <div class="sf-chips sf-cal">${cal}</div></div>`;
}

// Skyltfönstret: platserna, spelen som står där nu och de spel du kan lyfta fram
export function spotCard(G, S) {
  const slots = spotSlots(G);
  const used = spotsOf(S);
  const head = `<div class="row wrap" style="gap:8px;margin-bottom:6px">${icon('sparkle')}<div class="lbl">${t('dist.spot.title')}</div><span class="sp"></span>${slots ? `<span class="faint" style="font-size:12px">${t('dist.spot.slots', { n: used.length, m: slots })}</span>` : ''}</div>`;
  if (!slots) return `<div class="card sf-card sf-spot">${head}<p class="hint">${t('dist.spot.locked', { v: fmtNum(LEVELS[1]) })}</p></div>`;
  const on = used
    .map((sp) => {
      const g = G.games.find((x) => x.id === sp.id);
      if (!g) return '';
      const left = Math.max(0, spotWeeks(G) - (G.t - sp.t0));
      const p = Math.round(((spotWeeks(G) - left) / spotWeeks(G)) * 100);
      return `<div class="sf-spot-row on">${cover(g, 32)}<div style="flex:1;min-width:0"><b class="ell">${esc(L(g.title))}</b>
        <div class="bar" style="--c:var(--gold);margin:5px 0 3px"><i style="width:${p}%"></i></div>
        <div class="faint" style="font-size:12px">${t('dist.spot.left', { n: left, v: money(sp.inc) })}</div></div></div>`;
    })
    .join('');
  const free = slots - used.length;
  const cand = free > 0 ? spotGames(G).slice(0, 4) : [];
  const rows = cand
    .map((g) => {
      const ok = canSpot(G, g.id);
      return `<div class="sf-spot-row">${cover(g, 32)}<div style="flex:1;min-width:0"><b class="ell">${esc(L(g.title))}</b><div class="faint" style="font-size:12px">${t('dist.spot.sc', { s: dec(g.score) })}</div></div>
        <button class="btn sm" data-act="sf-spot" data-id="${g.id}" ${ok === true ? '' : `disabled data-tip="${esc(ok)}"`}>${t('dist.spot.go', { v: money(spotCost(G, g)) })}</button></div>`;
    })
    .join('');
  const none = free > 0 && !cand.length ? `<p class="hint">${t('dist.spot.none')}</p>` : '';
  const help = `<p class="hint" style="margin:0 0 8px">${t('dist.spot.help', { n: spotWeeks(G) })}</p>`;
  return `<div class="card sf-card sf-spot">${head}${help}${on}${free > 0 ? `<div class="lbl" style="margin:8px 0 4px">${t('dist.spot.pick')}</div>` : ''}${rows}${none}</div>`;
}

// Önskelistan: ett pc-spel som är på väg syns i butiken som "kommer snart"
export function wishCard(G) {
  const w = wishNow(G);
  if (!w) return '';
  return `<div class="card sf-card sf-wish" data-tip="${esc(t('dist.wish.tip'))}"><div class="row" style="gap:8px;margin-bottom:4px">${icon('heart')}<div class="lbl">${t('dist.wish.title')}</div></div>
    <div class="hint">${w.n >= 100 ? t('dist.wish.now', { title: `<b>${esc(L(w.title))}</b>`, n: `<b class="num">${fmtNum(Math.round(w.n / 10) * 10)}</b>` }) : t('dist.wish.few', { title: `<b>${esc(L(w.title))}</b>` })}</div></div>`;
}

// Erbjudanden: spelen som har rabatt nu och de bästa kandidaterna med tre rabattnivåer (vad de väntas ge visas på knappen)
export function dealCard(G, S) {
  const slots = dealSlots(G);
  const used = dealsOf(S);
  const head = `<div class="row wrap" style="gap:8px;margin-bottom:6px">${icon('cart')}<div class="lbl">${t('dist.deal.title')}</div><span class="sp"></span><span class="faint" style="font-size:12px">${t('dist.deal.slots', { n: used.length, m: slots })}</span></div>`;
  const on = used
    .map((d) => {
      const g = G.games.find((x) => x.id === d.id);
      if (!g) return '';
      const left = Math.max(0, DEAL_WEEKS - (G.t - d.t0));
      return `<div class="sf-spot-row on">${cover(g, 32)}<div style="flex:1;min-width:0"><b class="ell">${esc(L(g.title))}</b> <span class="tag" style="--c:var(--hot)">${t('dist.deal.off', { n: Math.round(DEALS[d.i].cut * 100) })}</span>${d.auto ? ` <span class="tag" style="--c:var(--accent)" data-tip="${esc(t('dist.deal.auto1'))}">${icon('refresh')}</span>` : ''}
        <div class="faint" style="font-size:12px;margin-top:3px">${t('dist.deal.left', { n: left, v: money(d.inc) })}</div></div></div>`;
    })
    .join('');
  const free = slots - used.length;
  const cand = free > 0 ? dealGames(G).slice(0, 3) : [];
  const rows = cand
    .map((g) => {
      const btns = DEALS.map((D, i) => {
        const ok = canDeal(G, g.id, i);
        const v = dealValue(G, g, i);
        return `<button class="btn sm sf-dbtn" data-act="sf-deal" data-id="${g.id}" data-i="${i}" ${ok === true ? '' : 'disabled'} data-tip="${esc(ok === true ? t('dist.deal.' + D.id) : ok)}"><b>${Math.round(D.cut * 100)} %</b><span class="faint">${v >= 1 ? t('dist.deal.gain', { v: money(v) }) : t('dist.deal.gain0')}</span></button>`;
      }).join('');
      return `<div class="sf-spot-row">${cover(g, 32)}<div style="flex:1;min-width:0"><b class="ell">${esc(L(g.title))}</b><div class="sf-dbtns">${btns}</div></div></div>`;
    })
    .join('');
  const none = free > 0 && !cand.length ? `<p class="hint">${t('dist.deal.none')}</p>` : '';
  const open = autoDealOpen(G);
  const auto = `<div class="ltier autoseason ${S.autoDeal ? 'on' : ''}" style="margin-top:10px"><span class="rn-i" style="--c:${S.autoDeal ? 'var(--good)' : 'var(--muted)'}">${icon(open ? 'refresh' : 'lock')}</span><div style="flex:1;min-width:0"><b>${t('dist.deal.auto')}</b><div class="faint" style="font-size:11.5px">${open ? t('dist.deal.autoHelp') : t('dist.deal.autoLocked')}</div></div>
    ${open ? `<button class="switch ${S.autoDeal ? 'on' : ''}" data-act="sf-deal-auto" role="switch" aria-checked="${S.autoDeal ? 'true' : 'false'}" aria-label="${esc(t('dist.deal.auto'))}"><i></i></button>` : ''}</div>`;
  return `<div class="card sf-card sf-deal">${head}<p class="hint" style="margin:0 0 8px">${t('dist.deal.help')}</p>${on}${free > 0 && cand.length ? `<div class="lbl" style="margin:8px 0 4px">${t('dist.deal.pick')}</div>` : ''}${rows}${none}${auto}</div>`;
}

// Spelpaket: välj tre spel (valet finns bara i fönstret) och sälj dem ihop
const BUN = new Set();
export function bundleCard(G, S) {
  const head = `<div class="row wrap" style="gap:8px;margin-bottom:6px">${icon('box')}<div class="lbl">${t('dist.bun.title')}</div></div>`;
  if (!bundleOpen(G)) return `<div class="card sf-card sf-bun">${head}<p class="hint">${t('dist.bun.locked')}</p></div>`;
  const cur = bundlesOf(S)[0];
  if (cur) {
    const gs = cur.ids.map((id) => G.games.find((x) => x.id === id)).filter(Boolean);
    const left = Math.max(0, BUNDLE.weeks - (G.t - cur.t0));
    return `<div class="card sf-card sf-bun on">${head}<div class="sf-covers">${gs.map((g) => cover(g, 44)).join('')}</div><div class="faint" style="font-size:12.5px;margin-top:6px">${gs.map((g) => esc(L(g.title))).join(' · ')}</div>
      <div class="faint" style="font-size:12px;margin-top:4px">${t('dist.bun.on', { n: left, v: money(cur.inc) })}</div></div>`;
  }
  const cand = bundleGames(G).slice(0, 8);
  for (const id of [...BUN]) if (!cand.some((g) => g.id === id)) BUN.delete(id);
  if (cand.length < BUNDLE.games) return `<div class="card sf-card sf-bun">${head}<p class="hint">${t('dist.bun.help')}</p><p class="hint">${t('dist.bun.none')}</p></div>`;
  const sel = [...BUN];
  const ready = sel.length === BUNDLE.games;
  const ok = ready ? canBundle(G, sel) : false;
  const rows = cand
    .map((g) => `<button class="sf-pick ${BUN.has(g.id) ? 'on' : ''}" data-act="sf-bun-pick" data-id="${g.id}">${cover(g, 28)}<span class="ell">${esc(L(g.title))}</span>${BUN.has(g.id) ? icon('check') : ''}</button>`)
    .join('');
  return `<div class="card sf-card sf-bun">${head}<p class="hint" style="margin:0 0 8px">${t('dist.bun.help')}</p>
    <div class="lbl" style="margin:6px 0 4px">${t('dist.bun.pick', { n: sel.length, m: BUNDLE.games })}</div><div class="sf-picks">${rows}</div>
    <div class="row wrap" style="gap:8px;margin-top:10px"><button class="btn primary sm" data-act="sf-bun-go" ${ready && ok === true ? '' : `disabled ${ready && ok !== true ? `data-tip="${esc(ok)}"` : ''}`}>${icon('box')}${t('dist.bun.go')}</button>${ready ? `<span class="faint" style="font-size:12px">${t('dist.bun.gain', { v: money(bundleValue(G, sel)) })}</span>` : ''}</div></div>`;
}

// Rekord: det bästa butiken har klarat. Nya rekord blir nyheter (sim/store.js, recordWatch).
export function recCard(G, S) {
  const R = recOf(S);
  const gm = R.game.id ? G.games.find((x) => x.id === R.game.id) : null;
  const row = (ic, k, v, sub) => `<div class="sf-rec-row"><span class="rn-i" style="--c:var(--gold)">${icon(ic)}</span><div style="flex:1;min-width:0"><div class="faint" style="font-size:11.5px">${t(k)}</div><b class="num">${v}</b>${sub ? ` <span class="faint" style="font-size:11.5px">${sub}</span>` : ''}</div></div>`;
  const users = G.stats.storeUsers || 0;
  const rows = [
    row('user', 'dist.rec.users', fmtNum(Math.round(users))),
    R.week.v > 0 ? row('money', 'dist.rec.week', money(R.week.v), dateOf(R.week.t).year) : '',
    gm ? row('trophy', 'dist.rec.game', money(R.game.v), `${esc(L(gm.title))} · ${dateOf(R.game.t).year}`) : '',
    G.stats.storeTops ? row('crown', 'dist.rec.tops', fmtNum(G.stats.storeTops)) : '',
  ].join('');
  return `<div class="card sf-card sf-rec" data-tip="${esc(t('dist.rec.tip'))}"><div class="row wrap" style="gap:8px;margin-bottom:6px">${icon('award')}<div class="lbl">${t('dist.rec.title')}</div></div>${rows}${R.week.v > 0 ? '' : `<p class="hint">${t('dist.rec.none')}</p>`}</div>`;
}

// Platsens förändring sedan förra veckan på topplistan: ▲ upp, ▼ ner, Ny
export function rankTrend(r) {
  if (r.d === null || r.d === undefined) return `<span class="sh-tr new" data-tip="${esc(t('dist.rk.new'))}">${t('dist.rk.newShort')}</span>`;
  if (!r.d) return '';
  return `<span class="sh-tr ${r.d > 0 ? 'up' : 'down'}" data-tip="${esc(t('dist.rk.last', { n: r.rank + r.d }))}">${r.d > 0 ? '▲' : '▼'}${Math.abs(r.d)}</span>`;
}

act('sf-spot', (el) => {
  const r = startSpot(UI.app.G, +el.dataset.id);
  if (r === true) sfx.play('fanfare');
  else errToast(r);
  UI.refresh();
});
act('sf-deal', (el) => {
  const r = startDeal(UI.app.G, +el.dataset.id, +el.dataset.i);
  if (r === true) sfx.play('coin');
  else errToast(r);
  UI.refresh();
});
act('sf-deal-auto', () => {
  const G = UI.app.G;
  setAutoDeal(G, !G.store.autoDeal);
  UI.refresh();
});
act('sf-bun-pick', (el) => {
  const id = +el.dataset.id;
  if (BUN.has(id)) BUN.delete(id);
  else if (BUN.size < BUNDLE.games) BUN.add(id);
  UI.refresh();
});
act('sf-bun-go', () => {
  const r = startBundle(UI.app.G, [...BUN]);
  if (r === true) {
    BUN.clear();
    sfx.play('fanfare');
  } else errToast(r);
  UI.refresh();
});
