import { esc, icon, t, tn, L, UI, act, money, bar } from './core.js';
import { fmtNum } from '../core/util.js';
import { espRating } from '../sim/esports.js';
import { liveGames } from '../sim/live.js';
import { WORLD_TIERS, WORLD_SEASON, WORLD_MIN, WORLD_NOUN, WORLD_AUTO_ROI, WORLD_AUTO_BUFFER, worldNounOf, worldLadder, worldPlan, worldAutoPick, worldProdCap, setWorldProd, setWorldAuto } from '../sim/world.js';

// Onlinevärlden i Biblioteket (ett kort per onlinespel, under säsongerna): världens steg, säsongen, rankingen, finalen som pågår, vald sändning
// med väntad avkastning, och tidigare finaler. Allt som visas kommer från L.world (world.js).
const RATE_KEY = { great: 'es.rate.great', good: 'es.rate.good', even: 'es.rate.even', poor: 'es.rate.poor', bad: 'es.rate.bad' };
const RATE_COL = { great: 'var(--good)', good: 'var(--good)', even: 'var(--warn)', poor: 'var(--warn)', bad: 'var(--bug)' };
const PROD_KEY = ['es.prod.own', 'es.prod.studio', 'es.prod.world'];
const PROD_TIP = ['es.prod.own.tip', 'es.prod.studio.tip', 'es.prod.world.tip'];
const PROD_IC = ['user', 'film', 'globe'];
const HEAT_KEY = ['world.heat.0', 'world.heat.1', 'world.heat.2'];
const HEAT_COL = ['var(--accent)', 'var(--warn)', 'var(--bug)'];
const approx = (x) => {
  const v = Math.max(0, Math.round(x));
  if (v < 100) return v;
  const p = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / p) * p;
};
// Det första steget som tillåter en sändning (för texten på en låst knapp)
const tierFor = (p) => WORLD_TIERS.find((x) => x.prod >= p) || WORLD_TIERS[WORLD_TIERS.length - 1];

// Rankingen: de fem främsta med poäng i förhållande till ledaren och antal titlar
function ladderHTML(W) {
  const rank = worldLadder(W);
  const top = Math.max(1, rank[0].pts);
  const rows = rank
    .slice(0, 5)
    .map(
      (x, i) => `<div class="wd-rank"><span class="n">${i + 1}</span><b>${esc(x.name)}${x.ti ? ` <span class="wd-crown ${x.name === W.champ ? 'now' : ''}" data-tip="${esc(x.name === W.champ ? t('world.champ', { name: x.name }) : tn('world.titles', x.ti))}">${icon('crown')}${x.ti > 1 ? x.ti : ''}</span>` : ''}</b>
        <span class="wd-pb"><i style="width:${Math.round((x.pts / top) * 100)}%"></i></span><span class="faint">${t('world.pts', { n: fmtNum(Math.round(x.pts)) })}</span></div>`,
    )
    .join('');
  return `<div class="lbl" style="margin:12px 0 4px">${t('world.ladder')}</div>${rows}${rank.length > 5 ? `<div class="faint" style="font-size:11.5px;margin-top:3px">${t('world.more', { n: rank.length - 5 })}</div>` : ''}`;
}

// Finalen som pågår: omgången, vilka som möts och hur många som tittat hittills
function finalHTML(W) {
  const F = W.fin;
  const round = F.w >= 2 ? 2 : 1;
  const pairs = round === 1 ? F.semis.map((s) => [s[0], s[1]]) : [[F.final[0], F.final[1]]];
  const vs = pairs.map((p) => `<div class="wd-vs">${t('world.vs', { a: `<b>${esc(p[0])}</b>`, b: `<b>${esc(p[1])}</b>` })}</div>`).join('');
  return `<div class="ltier season-on es-on wd-final" style="margin-top:10px"><span class="rn-i sbig" style="--c:var(--gold)">${icon('trophy')}</span><div style="flex:1;min-width:0">
    <div class="row" style="font-size:14px"><b>${t('world.live')}</b><span class="sp"></span><span class="faint">${t(round === 1 ? 'world.round1' : 'world.round2')}</span></div>
    <div class="wd-vss">${vs}</div>
    <div class="row wrap" style="gap:6px;margin-top:8px">${F.prod >= 0 ? `<span class="spill" style="--c:var(--accent)">${icon('eye')}${t('world.liveViewers', { v: fmtNum(approx(F.viewers)) })}</span><span class="spill" style="--c:var(--gold)">${icon(PROD_IC[F.prod])}${t(PROD_KEY[F.prod])}</span>` : `<span class="faint" style="font-size:12.5px">${t('world.liveQuiet')}</span>`}</div></div></div>`;
}

function broadcastHTML(G, g, W) {
  const cap = worldProdCap(W);
  const sel = W.auto ? 'auto' : W.prod;
  const btn = (v, label, ic, tip, locked) => `<button class="${sel === v ? 'on' : ''}" data-act="${v === 'auto' ? 'wd-auto' : 'wd-prod'}" data-id="${g.id}" data-v="${v}" data-tip="${esc(tip)}" ${locked ? 'disabled' : ''}>${icon(ic)}${label}</button>`;
  const buttons = [
    btn(-1, t('world.bc.off'), 'minus', t('world.bc.off.tip'), false),
    ...[0, 1, 2].map((p) => btn(p, t(PROD_KEY[p]), PROD_IC[p], p > cap ? t('world.bc.locked', { name: L(tierFor(p).name) }) : t(PROD_TIP[p]), p > cap)),
    btn('auto', t('world.bc.auto'), 'refresh', t('world.bc.auto.tip', { r: Math.round(WORLD_AUTO_ROI * 100), m: WORLD_AUTO_BUFFER }), false),
  ].join('');
  const p = W.auto ? worldAutoPick(G, g, W) : Math.min(W.prod, cap);
  let pv = '';
  if (p >= 0 && !W.fin) {
    const pl = worldPlan(G, g, p);
    const rate = espRating(pl.roi);
    pv = `<div class="es-pv" style="margin-top:8px"><div class="row wrap" style="gap:6px"><span class="spill" style="--c:var(--accent)">${icon('eye')}${t('es.pv.viewers', { n: fmtNum(approx(pl.viewers)) })}</span><span class="spill" style="--c:var(--good)">${icon('user')}${tn('es.pv.new', approx(pl.newPlayers), { n: fmtNum(approx(pl.newPlayers)) })}</span><span class="spill" style="--c:var(--money)">${icon('money')}${t('es.pv.spons', { v: money(pl.sponsors) })}</span><span class="spill" style="--c:var(--bug)">${icon('trophy')}${t('es.pv.cost', { v: money(pl.cost) })}</span></div>
      <div class="row wrap" style="gap:8px;margin-top:8px" data-tip="${esc(t('es.rate.tip'))}"><span class="tag" style="--c:${RATE_COL[rate]}">${t(RATE_KEY[rate])}</span><span class="faint" style="font-size:12.5px">${t('es.back', { n: Math.round(pl.roi * 100) })}</span></div></div>`;
  }
  const autoLine = W.auto && !W.fin ? `<div class="faint" style="font-size:12px;margin-top:6px">${p >= 0 ? t('world.bc.autoNow', { name: t(PROD_KEY[p]) }) : t('world.bc.autoNone')}</div>` : '';
  return `<div class="lbl" style="margin:14px 0 4px">${t('world.bc')}</div><p class="hint" style="margin-bottom:8px">${t('world.bc.help')}</p>
    <div class="seg es-seg">${buttons}</div>${autoLine}${pv}`;
}

function logHTML(W) {
  if (!W.log.length) return `<p class="hint" style="margin-top:12px">${t('world.logNone')}</p>`;
  const rows = W.log
    .slice(0, 4)
    .map((r) => {
      const rate = r.prod >= 0 ? espRating(r.roi) : null;
      const text = r.prod >= 0 ? t('world.logRow', { team: esc(r.champ), other: esc(r.runner), v: fmtNum(approx(r.viewers)), n: fmtNum(approx(r.newPlayers)) }) : t('world.logQuiet', { team: esc(r.champ), other: esc(r.runner) });
      return `<div class="ltier es-log"><span class="rn-i" style="--c:${rate ? RATE_COL[rate] : 'var(--muted)'}">${icon('trophy')}</span><div style="flex:1;min-width:0"><b>${t('world.season', { n: r.n })}</b><div class="faint" style="font-size:11.5px">${text}</div></div>${rate ? `<b class="num" style="color:${RATE_COL[rate]}">${Math.round(r.roi * 100)}&nbsp;%</b>` : ''}</div>`;
    })
    .join('');
  return `<div class="lbl" style="margin:12px 0 4px">${t('world.log')}</div><div class="col" style="gap:5px">${rows}</div>`;
}

// Kortet för ett levande onlinespel (g.live finns och är inte nedlagt)
export function worldCard(G, g) {
  const W = g.live.world;
  const noun = WORLD_NOUN[worldNounOf(g.live.kind)];
  const head = (right = '') => `<div class="row" style="margin:16px 0 4px;gap:8px">${icon('globe')}<div class="lbl">${t('world.title')}</div><span class="sp"></span>${right}</div>`;
  if (!W || !W.tier) return `${head()}<p class="hint">${icon('lock')} ${t('world.small', { n: fmtNum(WORLD_MIN) })}</p>`;
  const tier = WORLD_TIERS[W.tier - 1];
  const next = WORLD_TIERS[W.tier];
  const subs = g.live.subs;
  const stage = `<span class="spill" style="--c:var(--gold)" data-tip="${esc(t('world.stageTip', { gs: L(noun.p) }))}">${icon('globe')}${t('world.stage', { name: L(tier.name) })}</span>`;
  const week = Math.min(WORLD_SEASON, G.t - W.t0);
  const left = Math.max(0, WORLD_SEASON - week);
  const heatI = W.heat < 25 ? 0 : W.heat < 55 ? 1 : 2;
  const pips = Array.from({ length: WORLD_SEASON }, (_, i) => `<i class="${i < week ? 'on' : ''}"></i>`).join('');
  const season = W.fin
    ? ''
    : `<div class="row wrap" style="gap:8px;font-size:12.5px"><b>${t('world.season', { n: W.n })}</b><span class="faint">${t('world.weekOf', { w: week, m: WORLD_SEASON })} · ${tn('world.finalIn', left)}</span><span class="sp"></span>
      <span class="spill" style="--c:${HEAT_COL[heatI]}" data-tip="${esc(t('world.heatTip'))}">${icon('fire')}${t('world.heat')}: ${t(HEAT_KEY[heatI])}</span></div><div class="wd-weeks">${pips}</div>`;
  const grow = next
    ? `<div class="faint" style="font-size:12px;margin-top:8px">${t('world.next', { name: L(next.name), n: fmtNum(next.min) })}</div>${bar(Math.max(0, Math.min(100, ((subs - tier.min) / (next.min - tier.min)) * 100)), 'var(--gold)', 'thin')}`
    : `<div class="faint" style="font-size:12px;margin-top:8px">${t('world.max')}</div>`;
  const feud = W.feud && W.feud.n >= 2 ? `<div class="row" style="gap:6px;margin-top:8px;font-size:12.5px;color:var(--bug)">${icon('fire')}<span>${t('world.feud', { a: esc(W.feud.a), b: esc(W.feud.b), n: W.feud.n })}</span></div>` : '';
  return `${head(stage)}<p class="hint" style="margin-bottom:8px">${t('world.help', { gs: L(noun.p) })}</p>
    ${season}${W.fin ? finalHTML(W) : ''}${feud}${ladderHTML(W)}${grow}${broadcastHTML(G, g, W)}${logHTML(W)}`;
}

act('wd-prod', (el) => {
  setWorldProd(UI.app.G, +el.dataset.id, +el.dataset.v);
  UI.refresh();
});
act('wd-auto', (el) => {
  const G = UI.app.G;
  const g = liveGames(G).find((x) => x.id === +el.dataset.id);
  if (g && g.live.world) setWorldAuto(G, g.id, !g.live.world.auto);
  UI.refresh();
});
