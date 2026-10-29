import { esc, icon, t, tn, L, UI, act, bar, money, errToast } from './core.js';
import { coverImg } from '../render/covers.js';
import { PLATFORM } from '../data/platforms.js';
import { sfx } from '../audio/sfx.js';
import { fmtNum } from '../core/util.js';
import { yearOf } from '../sim/const.js';
import {
  OTHER_CUT, PAY_FEE, FEES, SUPPORT, ADS, SALES, canStore, storeUsers, discOf, reachTarget, storeScale, featOf, switchLeft,
  saleSeason, saleIn, saleOf, storeChart, setPolicy, setFee, setSupport, setAds, setExclusive, setPaused, setSale,
} from '../sim/store.js';

// Marknadsfönstrets flik Egen butik: användare, förtroende och upptäckbarhet, strategin (sluten eller öppen), avgiften,
// support, marknadsföring, exklusiva spel, säsongsrean och butikens ekonomi.
const pct = (v) => Math.round(v * 100);
const POL_KEY = { closed: ['dist.closed', 'dist.closedD'], open: ['dist.open', 'dist.openD'] };
const SUP_KEY = ['dist.sup.0', 'dist.sup.1', 'dist.sup.2'];
const ADS_KEY = ['dist.ads.0', 'dist.ads.1', 'dist.ads.2', 'dist.ads.3'];
const tone = (v) => (v >= 60 ? 'var(--good)' : v >= 35 ? 'var(--warn)' : 'var(--bug)');

function policyCard(G, S, id) {
  const on = S.policy === id;
  const wait = switchLeft(G, S);
  const info = t('dist.featNow', { pct: Math.round(featOf(S) * 100) }) + (id === 'open' ? ` · ${t('dist.extNow', { v: money(S.lm.ext) })}` : '');
  return `<div class="card dist-opt ${on ? 'on' : ''}" style="--c:${id === 'closed' ? 'var(--gold)' : 'var(--accent)'}">
    <div class="row" style="gap:8px;margin-bottom:6px">${icon(id === 'closed' ? 'lock' : 'globe')}<b>${t(POL_KEY[id][0])}</b><span class="sp"></span>${on ? `<span class="tag" style="--c:var(--good)">${t('dist.chosen')}</span>` : `<button class="btn sm" data-act="dist-pol" data-id="${id}" ${wait > 0 ? 'disabled' : ''}>${t('dist.choose')}</button>`}</div>
    <div class="hint">${t(POL_KEY[id][1])}</div>
    ${on ? `<div class="faint" style="font-size:12px;margin-top:8px">${info}</div>` : ''}</div>`;
}

function seg(items, cur, actName, tip) {
  return `<div class="seg wrap-seg">${items.map((label, i) => `<button class="${cur === i ? 'on' : ''}" data-act="${actName}" data-i="${i}" ${tip ? `data-tip="${esc(tip(i))}"` : ''}>${label}</button>`).join('')}</div>`;
}

// Topplistan: det som säljer mest i butiken den här veckan, med vems spel det är
const KIND_TAG = { own: ['dist.k.own', 'var(--accent)'], group: ['dist.k.group', 'var(--gold)'], ext: ['dist.k.ext', 'var(--design)'] };
function chart(G) {
  const rows = storeChart(G, 5);
  const body = rows.length
    ? rows
        .map((r, i) => {
          const title = L(r.title);
          const [k, c] = KIND_TAG[r.kind];
          return `<div class="chart-row ${r.kind === 'own' ? 'yours' : ''}"><div class="rk disp">${i + 1}</div>${coverImg({ id: r.id, title, topic: r.topic, genre: r.genre, platform: r.platform }, 32)}
        <div style="flex:1;min-width:0"><b class="ell">${esc(title)}</b><div class="faint ell" style="font-size:12px">${esc(r.studio)} · ${esc(PLATFORM[r.platform].name)}</div></div>
        <div style="text-align:right"><span class="tag" style="--c:${c}">${t(k)}</span><div class="num" style="font-size:12px;margin-top:4px">${t('dist.perWeek', { v: money(r.v) })}</div></div></div>`;
        })
        .join('')
    : `<p class="hint">${t('dist.chartNone')}</p>`;
  return `<div class="card" style="margin-top:14px"><div class="lbl" style="margin-bottom:8px">${t('dist.chart')}</div><div class="col dist-chart" style="gap:6px">${body}</div></div>`;
}

// Säsongsrean: rabattnivå, när nästa rea börjar och hur många som väntar på den
function saleCtl(G, S) {
  const on = saleSeason(G.t) !== undefined;
  const lvl = saleOf(S);
  const wait = Math.round((S.wait || 0) * 100);
  const when = on ? `<span class="tag" style="--c:var(--good)">${t('dist.saleNow')}</span>` : `<span class="faint" style="font-size:12px">${tn('dist.saleIn', saleIn(G.t))}</span>`;
  const labels = SALES.map((L, i) => (i ? t('dist.salePct', { n: Math.round(L.cut * 100) }) : t('dist.sale.0')));
  return `<div class="dist-wide"><div class="row wrap" style="gap:8px;margin-bottom:6px"><div class="lbl">${t('dist.sale')}</div><span class="sp"></span>${when}</div>
    ${seg(labels, lvl, 'dist-sale')}
    <p class="hint" style="margin-top:6px">${t('dist.saleHelp')}${wait >= 1 ? ` ${t('dist.wait', { pct: wait })}` : ''}</p></div>`;
}

function econ(G, S) {
  // senaste fyra veckorna (hittills, innan den första månaden är slut: vecka 3 har månaden redan rullats) och allt sedan butiken öppnade
  const early = G.t - S.t0 < 3;
  const rows = (o) => [
    ['dist.r.own', o.own],
    ['dist.r.group', o.group],
    ['dist.r.ext', o.ext],
    ['dist.r.sale', o.sale || 0],
    ['dist.c.ops', -o.ops],
    ['dist.c.pay', -o.pay],
    ['dist.c.sup', -o.sup],
    ['dist.c.ads', -o.ads],
  ];
  const net = (o) => o.own + o.group + o.ext + (o.sale || 0) - o.ops - o.pay - o.sup - o.ads;
  const cell = (v) => `<b class="num ${v >= 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${money(v)}</b>`;
  const cur = early ? S.m : S.lm;
  const lm = rows(cur);
  const tot = rows(S.tot);
  const body = lm
    .map(([k], i) => (Math.abs(tot[i][1]) < 1 ? '' : `<div class="dist-erow"><span>${t(k, { pct: Math.round(PAY_FEE * 100) })}</span>${cell(lm[i][1])}${cell(tot[i][1])}</div>`))
    .join('');
  return `<div class="dist-econ"><div class="dist-erow faint"><span></span><span>${t(early ? 'dist.monthSoFar' : 'dist.month')}</span><span>${t('dist.since', { year: yearOf(S.t0) })}</span></div>${body}
    <div class="divider"></div><div class="dist-erow"><span><b>${t('dist.net')}</b></span>${cell(net(cur))}${cell(net(S.tot))}</div></div>
    ${S.tot.feat >= 1 ? `<p class="hint" style="margin-top:8px">${t('dist.feat', { v: money(S.tot.feat) })}</p>` : ''}`;
}

export function storeTab(G) {
  const S = G.store;
  if (!canStore(G) || !S) return `<div class="empty">${icon('cart')}<div class="hint" style="max-width:480px">${t('dist.locked')}</div></div>`;
  const users = storeUsers(G, S);
  const disc = discOf(S) * 100;
  const tgt = reachTarget(G, S);
  const y = storeScale(G);
  const wait = switchLeft(G, S);
  const open = S.policy === 'open';
  const supCost = (i) => t('dist.costTip', { v: money((SUPPORT[i].base + SUPPORT[i].per * S.reach) * y) });
  if (S.paused) {
    return `<div class="card dist-opt on" style="--c:var(--warn)"><div class="row wrap" style="gap:10px">${icon('pause')}<div class="hint" style="flex:1 1 220px">${t('dist.paused')}</div><button class="btn primary sm" data-act="dist-pause" data-v="0">${icon('play')}${t('dist.resume')}</button></div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:14px">
        <div class="counter" style="--c:var(--accent)"><div class="v num">${fmtNum(Math.round(storeUsers(G, S)))}</div><div class="k">${t('dist.users')}</div></div>
        <div class="counter" style="--c:${tone(S.trust)}"><div class="v num">${Math.round(S.trust)}</div><div class="k">${t('dist.trust')}</div></div>
      </div>
      <div class="card" style="margin-top:18px"><div class="lbl" style="margin-bottom:8px">${t('dist.econ')}</div>${econ(G, S)}</div>`;
  }
  return `<p class="hint" style="margin-bottom:12px">${icon('cart')} ${t('dist.help', { pct: Math.round(OTHER_CUT * 100) })}</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <div class="counter" style="--c:var(--accent)" data-tip="${esc(t('dist.usersTip', { pct: pct(tgt) }))}"><div class="v num">${fmtNum(Math.round(users))}</div><div class="k">${t('dist.users')}</div><div class="faint" style="font-size:11px;margin-top:4px">${t('dist.usersK', { pct: pct(S.reach) })}, ${t('dist.toward', { pct: pct(tgt) })}</div></div>
      <div class="counter" style="--c:${tone(S.trust)}" data-tip="${esc(t('dist.trustTip'))}"><div class="v num">${Math.round(S.trust)}</div><div class="k">${t('dist.trust')}</div><div style="margin-top:6px">${bar(S.trust, tone(S.trust), 'thin')}</div></div>
      <div class="counter" style="--c:${tone(disc)}" data-tip="${esc(t('dist.discTip'))}"><div class="v num">${Math.round(disc)}</div><div class="k">${t('dist.disc')}</div><div style="margin-top:6px">${bar(disc, tone(disc), 'thin')}</div></div>
      ${open ? `<div class="counter" style="--c:var(--design)" data-tip="${esc(t('dist.devsTip'))}"><div class="v num">${t('dist.pct', { n: pct(S.dev) })}</div><div class="k">${t('dist.devs')}</div><div class="faint" style="font-size:11px;margin-top:4px">${t('dist.devsK')}</div></div>` : ''}
    </div>
    ${chart(G)}
    <div class="lbl" style="margin:18px 0 8px">${t('dist.policy')}</div>
    <div class="dist-pol">${policyCard(G, S, 'closed')}${policyCard(G, S, 'open')}</div>
    ${wait > 0 ? `<p class="hint" style="margin-top:8px">${icon('clock')} ${tn('dist.switchWait', wait)}</p>` : open ? `<p class="hint" style="margin-top:8px">${t('dist.closeWarn')}</p>` : ''}
    <div class="dist-ctl">
      <div><div class="lbl" style="margin-bottom:6px">${t('dist.fee')}</div>
        <div class="seg wrap-seg">${FEES.map((f) => `<button class="${S.fee === f ? 'on' : ''}" data-act="dist-fee" data-v="${f}" ${open ? '' : 'disabled'}>${t('dist.pct', { n: Math.round(f * 100) })}</button>`).join('')}</div>
        <p class="hint" style="margin-top:6px">${open ? t('dist.feeHelp') : t('dist.feeClosed')}</p></div>
      <div><div class="lbl" style="margin-bottom:6px">${t('dist.support')}</div>${seg(SUP_KEY.map((k) => t(k)), S.support, 'dist-sup', supCost)}
        <p class="hint" style="margin-top:6px">${t('dist.supHelp')}</p></div>
      <div><div class="lbl" style="margin-bottom:6px">${t('dist.ads')}</div>${seg(ADS_KEY.map((k) => t(k)), S.ads, 'dist-ads', (i) => t('dist.costTip', { v: money(ADS[i] * y) }))}
        <p class="hint" style="margin-top:6px">${t('dist.adsHelp')}</p></div>
      <div><div class="lbl" style="margin-bottom:6px">${t('dist.ex')}</div>
        <div class="seg"><button class="${S.ex ? '' : 'on'}" data-act="dist-ex" data-v="0">${t('dist.exOff')}</button><button class="${S.ex ? 'on' : ''}" data-act="dist-ex" data-v="1">${t('dist.exOn')}</button></div>
        <p class="hint" style="margin-top:6px">${t('dist.exHelp')}</p></div>
      ${saleCtl(G, S)}
    </div>
    <div class="card" style="margin-top:18px"><div class="row wrap" style="margin-bottom:8px;gap:8px"><div class="lbl">${t('dist.econ')}</div><span class="sp"></span><button class="btn sm ghost" data-act="dist-pause" data-v="1" data-tip="${esc(t('dist.pauseTip'))}">${icon('pause')}${t('dist.pause')}</button></div>${econ(G, S)}</div>`;
}

act('dist-pol', (el) => {
  const r = setPolicy(UI.app.G, el.dataset.id);
  if (r === true) sfx.play('fanfare');
  else if (r) errToast(r);
  UI.refresh();
});
act('dist-fee', (el) => {
  if (setFee(UI.app.G, +el.dataset.v)) sfx.play('click');
  UI.refresh();
});
act('dist-sup', (el) => {
  setSupport(UI.app.G, +el.dataset.i);
  UI.refresh();
});
act('dist-ads', (el) => {
  setAds(UI.app.G, +el.dataset.i);
  UI.refresh();
});
act('dist-pause', (el) => {
  if (setPaused(UI.app.G, el.dataset.v === '1')) sfx.play('click');
  UI.refresh();
});
act('dist-sale', (el) => {
  if (setSale(UI.app.G, +el.dataset.i)) sfx.play('click');
  UI.refresh();
});
act('dist-ex', (el) => {
  setExclusive(UI.app.G, el.dataset.v === '1');
  UI.refresh();
});
