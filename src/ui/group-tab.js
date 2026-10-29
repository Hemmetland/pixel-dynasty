import { esc, icon, t, UI, act, bar, money, errToast } from './core.js';
import { sfx } from '../audio/sfx.js';
import { dateOf } from '../sim/const.js';
import { lang } from '../core/i18n.js';
import { ACQ_MAX, SELL, canAcquireAny, ownedComps, subIncome, sellPrice, divest } from '../sim/acquire.js';
import {
  BUDGETS, SHARE_PUB, INTEG_WEEKS, LOAD, OPS_MIN, STABLE_MIN, TECH, STORE, PROMO, PROMO_OWN, COST, COST_MAX,
  canGroup, subOf, stabilityParts, operations, synergies, groupCap, groupLoad, overloaded, shareOf, ceoRating, ceoCandidates,
  canIntegrate, integCost, investWeek, costSave, promoOwn, setMode, setSubBudget, setCeo, recallCeo,
} from '../sim/group.js';

// Marknadsfönstrets flik Koncern: beroendena (finansiell stabilitet, verksamheter, ledningens kapacitet), synergierna och
// varje dotterbolag med styrning (självständigt eller integrerat), budget, VD ur personalen och försäljning.
const GS = { pick: null, confirm: null }; // öppen VD-lista och väntande bekräftelse ("sell:id" eller "free:id")
const pct = (v) => Math.round(v * 100);
const dec = (v) => String(Math.round(v * 100) / 100).replace('.', lang === 'sv' ? ',' : '.');
const tone = (v) => (v >= 60 ? 'var(--good)' : v >= 35 ? 'var(--warn)' : 'var(--bug)');
const OP_KEY = { dev: 'grp.op.dev', engine: 'grp.op.engine', pub: 'grp.op.pub', store: 'grp.op.store', live: 'grp.op.live', ports: 'grp.op.ports', lic: 'grp.op.lic', mkt: 'grp.op.mkt' };
const SYN = {
  tech: ['grp.syn.tech', 'cpu', () => ({ v: dec(TECH) })],
  pub: ['grp.syn.pub', 'book', () => ({ pct: pct(SHARE_PUB) })],
  store: ['grp.syn.store', 'cart', () => ({ pct: pct(STORE) })],
  mkt: ['grp.syn.mkt', 'megaphone', () => ({ pct: pct(PROMO), own: dec(PROMO_OWN * 100) })],
  cost: ['grp.syn.cost', 'bank', () => ({ pct: pct(COST), max: pct(COST_MAX) })],
};
const B_KEY = { save: ['grp.b.save', 'grp.bTip.save'], normal: ['grp.b.normal', 'grp.bTip.normal'], invest: ['grp.b.invest', 'grp.bTip.invest'] };
const ERR = { ops: () => t('grp.err.ops', { n: OPS_MIN }), money: () => t('err.money'), locked: () => t('grp.needResearch') };

function deps(G) {
  const st = stabilityParts(G);
  const ops = operations(G);
  const on = ops.filter((o) => o.on).length;
  const cap = groupCap(G);
  const load = groupLoad(G);
  const over = overloaded(G);
  const parts = { run: Math.round(st.run), trend: Math.round(st.trend), loans: Math.round(st.loans), ok: Math.round(st.ok) };
  return `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
      <div class="counter" style="--c:${tone(st.total)}" data-tip="${esc(t('grp.stabTip', parts))}"><div class="v num">${st.total}</div><div class="k">${t('grp.stab')}</div><div style="margin-top:6px">${bar(st.total, tone(st.total), 'thin')}</div><div class="faint" style="font-size:11px;margin-top:4px">${t('grp.stabK', { n: STABLE_MIN })}</div></div>
      <div class="counter" style="--c:${on >= OPS_MIN ? 'var(--accent)' : 'var(--warn)'}" data-tip="${esc(t('grp.opsTip'))}"><div class="v num">${on} / ${ops.length}</div><div class="k">${t('grp.ops')}</div><div class="faint" style="font-size:11px;margin-top:4px">${t('grp.opsK', { n: OPS_MIN })}</div></div>
      <div class="counter" style="--c:${over ? 'var(--bug)' : 'var(--gold)'}" data-tip="${esc(t('grp.capTip'))}"><div class="v num">${dec(load)} / ${cap}</div><div class="k">${t('grp.cap')}</div><div style="margin-top:6px">${bar(Math.min(100, (load / cap) * 100), over ? 'var(--bug)' : 'var(--gold)', 'thin')}</div><div class="faint" style="font-size:11px;margin-top:4px">${over ? `<b style="color:var(--bug)">${t('grp.over')}</b>` : t('grp.capK', { a: dec(LOAD.free), b: dec(LOAD.int), c: dec(LOAD.ceo) })}</div></div>
    </div>
    <div class="row wrap grp-ops" style="gap:6px;margin-top:10px">${ops.map((o) => `<span class="chip ${o.on ? 'c' : 'off'}" style="--c:var(--good)">${icon(o.on ? 'check' : 'lock')}${t(OP_KEY[o.id])}</span>`).join('')}</div>`;
}

function synCard(G) {
  const rows = synergies(G)
    .map((s) => {
      const [k, ic, vars] = SYN[s.id];
      return `<div class="grp-syn ${s.on ? 'on' : ''}">${icon(ic)}<span>${t(k, vars(G))}</span><span class="tag" style="--c:${s.on ? 'var(--good)' : 'var(--muted)'}">${t(s.on ? 'grp.synOn' : 'grp.synOff')}</span></div>`;
    })
    .join('');
  const cs = costSave(G);
  const po = promoOwn(G);
  const now = [cs > 0 ? t('grp.synCost', { pct: pct(cs) }) : '', po > 0 ? t('grp.synPromo', { pct: dec(po * 100) }) : ''].filter(Boolean).join(' ');
  const nowP = now ? `<p class="hint" style="margin-top:8px">${now}</p>` : '';
  return `<div class="card" style="margin-top:14px"><div class="lbl" style="margin-bottom:8px">${t('grp.syn')}</div><div class="col" style="gap:6px">${rows}</div>${nowP}</div>`;
}

function seg(items, cur, actName, id, tip, dis) {
  return `<div class="seg wrap-seg">${items.map((label, i) => `<button class="${cur === i ? 'on' : ''}" data-act="${actName}" data-id="${id}" data-i="${i}" ${tip ? `data-tip="${esc(tip(i))}"` : ''} ${dis && dis(i) ? 'disabled' : ''}>${label}</button>`).join('')}</div>`;
}

function confirmRow(kind, id, label, warn) {
  return `<div class="row wrap" style="gap:6px;margin-top:6px"><span class="hint" style="flex:1 1 160px">${warn}</span><button class="btn sm" data-act="grp-yes" data-k="${kind}" data-id="${id}">${label}</button><button class="btn sm ghost" data-act="grp-no">${t('grp.cancel')}</button></div>`;
}

function ceoCtl(G, c, s) {
  if (s.ceo) {
    return `<div class="row wrap" style="gap:8px">${icon('user')}<span><b>${esc(s.ceo.name)}</b> <span class="faint">· ${t('grp.ceoRating', { n: ceoRating(G, s.ceo) })}</span></span><span class="sp"></span><button class="btn sm ghost" data-act="grp-recall" data-id="${c.id}">${t('grp.recall')}</button></div>`;
  }
  if (GS.pick !== c.id) return `<div class="row wrap" style="gap:8px"><span class="faint" style="font-size:12.5px">${t('grp.ceoNone')}</span><span class="sp"></span><button class="btn sm" data-act="grp-pick" data-id="${c.id}">${icon('crown')}${t('grp.ceoPick')}</button></div>`;
  const cands = ceoCandidates(G).slice(0, 4);
  const list = cands.length
    ? cands.map((st) => `<div class="row" style="gap:8px"><span style="flex:1;min-width:0" class="ell"><b>${esc(st.name)}</b> <span class="faint">· ${t('grp.ceoRating', { n: ceoRating(G, st) })}</span></span><button class="btn sm" data-act="grp-ceo" data-id="${c.id}" data-s="${st.id}">${t('grp.choose')}</button></div>`).join('')
    : `<p class="hint">${t('grp.noCand')}</p>`;
  return `<div class="col" style="gap:6px"><p class="hint">${t('grp.ceoHelp')}</p>${list}<div><button class="btn sm ghost" data-act="grp-no">${t('grp.cancel')}</button></div></div>`;
}

function subCard(G, c) {
  const s = subOf(G, c);
  const grp = canGroup(G);
  const int = s.mode === 'int';
  const tag = !int ? ['grp.free', 'var(--muted)', {}] : s.integ < 1 ? ['grp.integ', 'var(--warn)', { pct: pct(s.integ) }] : ['grp.int', 'var(--good)', {}];
  const stats = [
    [t('grp.staff'), Math.round(s.staff)],
    [t('grp.share'), t('dist.pct', { n: pct(shareOf(G, c)) })],
    [t('grp.since', { year: dateOf(c.ownedT).year }), t('mkt.games', { n: c.games })],
  ];
  let ctl = '';
  if (grp) {
    const ok = canIntegrate(G, c.id);
    const over = !int && groupLoad(G) - LOAD.free + LOAD.int > groupCap(G) + 1e-9;
    const modeTip = (i) => (i === 0 ? t('grp.freeTip') : t('grp.intTip', { v: money(integCost(G, c)), n: INTEG_WEEKS }) + (ok !== true && ERR[ok] ? ` ${ERR[ok]()}` : over ? ` ${t('grp.wouldOver')}` : ''));
    const mode = `<div><div class="lbl" style="margin-bottom:6px">${t('grp.mode')}</div>${seg([t('grp.free'), t('grp.int')], int ? 1 : 0, 'grp-mode', c.id, modeTip, (i) => i === 1 && !int && ok !== true)}
      ${GS.confirm === `free:${c.id}` ? confirmRow('free', c.id, t('grp.freeBack'), t('grp.freeWarn')) : int && s.integ < 1 ? `<div style="margin-top:8px">${bar(pct(s.integ), 'var(--warn)', 'thin')}</div>` : `<p class="hint" style="margin-top:6px">${int ? t('grp.intDone') : t('grp.freeHint')}</p>`}</div>`;
    const budget = int
      ? `<div><div class="lbl" style="margin-bottom:6px">${t('grp.budget')}</div>${seg(
          BUDGETS.map((b) => t(B_KEY[b.id][0])),
          s.budget,
          'grp-budget',
          c.id,
          (i) => t(B_KEY[BUDGETS[i].id][1], { pct: pct(BUDGETS[i].div), v: money(investWeek(G, c) * 4) }),
        )}${s.inv >= 1 ? `<p class="hint" style="margin-top:6px">${t('grp.inv', { v: money(s.inv) })}</p>` : ''}</div>`
      : '';
    ctl = `<div class="grp-ctl">${mode}${budget}${int ? `<div class="dist-wide"><div class="lbl" style="margin-bottom:6px">${t('grp.ceo')}</div>${ceoCtl(G, c, s)}</div>` : ''}</div>`;
  }
  const sell = GS.confirm === `sell:${c.id}`
    ? confirmRow('sell', c.id, t('grp.sell', { v: money(sellPrice(G, c)) }), t('grp.sellTip', { pct: pct(SELL) }))
    : `<div class="row" style="margin-top:10px"><span class="sp"></span><button class="btn sm ghost" data-act="grp-sell" data-id="${c.id}" data-tip="${esc(t('grp.sellTip', { pct: pct(SELL) }))}">${icon('money')}${t('grp.sell', { v: money(sellPrice(G, c)) })}</button></div>`;
  return `<div class="card grp-sub" style="--c:${c.color}">
    <div class="row wrap" style="gap:8px 10px"><div class="dotc" style="background:${c.color}"></div><b>${esc(c.name)}</b><span class="tag" style="--c:${tag[1]}">${t(tag[0], tag[2])}</span><span class="sp"></span><b class="num" style="color:var(--money)">${t('acq.rev', { v: money(c.subRev || 0) })}</b></div>
    <div class="grp-stats">${stats.map(([k, v]) => `<div><div class="faint" style="font-size:11px">${k}</div><b class="num">${v}</b></div>`).join('')}<div><div class="faint" style="font-size:11px">${t('mkt.strength')}</div><div style="margin-top:6px">${bar(((c.strength - 0.4) / 1.3) * 100, c.color, 'thin')}</div></div></div>
    ${ctl}${sell}</div>`;
}

export function groupTab(G) {
  if (!canAcquireAny(G) && !ownedComps(G).length) return `<div class="empty">${icon('crown')}<div class="hint" style="max-width:480px">${t('grp.locked')}</div></div>`;
  const subs = ownedComps(G);
  const grp = canGroup(G);
  return `<p class="hint" style="margin-bottom:12px">${icon('crown')} ${t('grp.help')}${grp ? '' : ` ${t('grp.needResearch')}`}</p>
    ${deps(G)}
    ${grp ? synCard(G) : ''}
    <div class="lbl" style="margin:18px 0 8px">${t('acq.head', { n: subs.length, max: ACQ_MAX, v: money(subIncome(G)) })}</div>
    ${subs.length ? `<div class="col" style="gap:10px">${subs.map((c) => subCard(G, c)).join('')}</div>` : `<p class="hint">${t('grp.none')}</p>`}`;
}

const G_ = () => UI.app.G;
act('grp-mode', (el) => {
  const id = +el.dataset.id;
  const c = ownedComps(G_()).find((x) => x.id === id);
  if (!c) return;
  if (+el.dataset.i === 0) {
    if (subOf(G_(), c).mode === 'int') GS.confirm = `free:${id}`;
  } else {
    const r = setMode(G_(), id, 'int');
    if (r === true) sfx.play('fanfare');
    else if (r && ERR[r]) errToast(ERR[r]());
  }
  UI.refresh();
});
act('grp-budget', (el) => {
  if (setSubBudget(G_(), +el.dataset.id, +el.dataset.i)) sfx.play('click');
  UI.refresh();
});
act('grp-pick', (el) => {
  GS.pick = +el.dataset.id;
  GS.confirm = null;
  UI.refresh();
});
act('grp-ceo', (el) => {
  if (setCeo(G_(), +el.dataset.id, +el.dataset.s)) sfx.play('fanfare');
  GS.pick = null;
  UI.refresh();
});
act('grp-recall', (el) => {
  const r = recallCeo(G_(), +el.dataset.id);
  if (r === true) sfx.play('click');
  else if (r === 'capacity') errToast(t('err.capacity'));
  UI.refresh();
});
act('grp-sell', (el) => {
  GS.confirm = `sell:${el.dataset.id}`;
  GS.pick = null;
  UI.refresh();
});
act('grp-no', () => {
  GS.confirm = null;
  GS.pick = null;
  UI.refresh();
});
act('grp-yes', (el) => {
  const id = +el.dataset.id;
  const G = G_();
  const r = el.dataset.k === 'sell' ? divest(G, id) : setMode(G, id, 'free');
  if (r === true) sfx.play(el.dataset.k === 'sell' ? 'coin' : 'click');
  else if (typeof r === 'string') errToast(r);
  GS.confirm = null;
  UI.refresh();
});
