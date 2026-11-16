// Rivaler och kriser: rivalens jakt (temperaturen), krisberedskapen och det som hänt. Läser bara spelet (sim/crisis.js):
// själva dragen och kriserna kommer som vanliga händelserutor med val (data/crisis-events.js), inga val görs här.
import { esc, icon, t, L, UI, act, regWin, bar, MONTHS } from './core.js';
import { Lf, lang } from '../core/i18n.js';
import { dateOf } from '../sim/const.js';
import { crisisState, crisisShield, HEAT_STEPS } from '../sim/crisis.js';
import { rivalOf, rivalLog } from '../sim/rival.js';
import { EV } from '../data/events.js';

const HEAT_KEY = ['rv.heat.0', 'rv.heat.1', 'rv.heat.2', 'rv.heat.3'];
const HEAT_D = ['rv.heat.d.0', 'rv.heat.d.1', 'rv.heat.d.2', 'rv.heat.d.3'];
const HEAT_COL = ['var(--good)', 'var(--accent)', 'var(--warn)', 'var(--bug)'];
const SHIELD_KEY = { cash: 'rv.shield.cash', mood: 'rv.shield.mood', hr: 'rv.shield.hr', qa: 'rv.shield.qa', fans: 'rv.shield.fans' };
const SHIELD_IC = { cash: 'bank', mood: 'coffee', hr: 'team', qa: 'bug', fans: 'heart' };
const END_KEY = { done: 'mkt.rival.end.done', away: 'mkt.rival.end.away', bought: 'mkt.rival.end.bought' };
const KIND_IC = { hunt: ['target', 'var(--hot)'], crisis: ['fire', 'var(--bug)'] };

const sec = (text) => `<div class="row rvl-sec"><div class="lbl">${text}</div></div>`;
const dateText = (tt) => {
  const d = dateOf(tt);
  return `${MONTHS[lang][d.month]} ${d.year}`;
};

// Mätaren: fyra delar (Lugnt, Spänt, Het, Krig) som fylls efter hur het jakten är
function gauge(heat) {
  const lo = [0, ...HEAT_STEPS];
  const hi = [...HEAT_STEPS, 100];
  const level = HEAT_STEPS.filter((x) => heat >= x).length;
  const cells = lo
    .map((a, i) => {
      const f = Math.max(0, Math.min(1, (heat - a) / (hi[i] - a)));
      return `<div class="rvl-cell ${i === level ? 'cur' : ''}" style="--c:${HEAT_COL[i]};--w:${hi[i] - a}"><div class="rvl-fill"><i style="width:${Math.round(f * 100)}%"></i></div><span>${t(HEAT_KEY[i])}</span></div>`;
    })
    .join('');
  return `<div class="rvl-gauge">${cells}</div>`;
}

function huntCard(G, S) {
  const foe = rivalOf(G);
  if (!foe) return `<div class="card rvl-top"><p class="hint" style="margin:0">${icon('info')} ${t('rv.none')}</p></div>`;
  const R = G.rival;
  const rival = `<b>${esc(foe.name)}</b>`;
  const lead = !!R.lead;
  const past = rivalLog(G)
    .slice(-4)
    .reverse()
    .map((x) => `<span class="chip">${esc(x.name)} <b class="num">${x.w}–${x.l}</b> <span class="faint">${t(END_KEY[x.end] || END_KEY.done)}</span></span>`)
    .join('');
  return `<div class="card rvl-top" style="--c:${HEAT_COL[S.level]}">
    <div class="row" style="gap:10px;flex-wrap:wrap;align-items:center"><span class="dotc" style="background:${foe.color}"></span><b class="rvl-name">${esc(foe.name)}</b><span class="tag" style="--c:${HEAT_COL[S.level]}">${t(HEAT_KEY[S.level])}</span><span class="sp"></span><span class="faint" style="font-size:12px">${t('rv.duel', { w: R.w, l: R.l, y: R.since })}</span></div>
    ${gauge(S.heat)}
    <p class="rvl-d">${t(HEAT_D[S.level], { rival: rival })}</p>
    <p class="hint" style="margin:6px 0 0"><span style="color:${lead ? 'var(--good)' : 'var(--bug)'}">${t(lead ? 'rv.lead' : 'rv.trail', { rival: esc(foe.name) })}</span> ${t('rv.heat.help')}</p>
    ${past ? `<div class="lbl" style="margin:12px 0 6px">${t('rv.past')}</div><div class="row" style="gap:6px;flex-wrap:wrap">${past}</div>` : ''}</div>`;
}

function shieldCard(G) {
  const sh = crisisShield(G);
  const pct = Math.round(sh.total * 100);
  const rows = sh.parts
    .map((p) => `<div class="rvl-sh ${p.on ? 'on' : ''}"><span class="rvl-shi">${icon(SHIELD_IC[p.id])}</span><span class="rvl-shl">${t(SHIELD_KEY[p.id])}</span><span class="spill" style="--c:${p.on ? 'var(--good)' : 'var(--faint)'}">${icon(p.on ? 'check' : 'lock')}${p.on ? '−' + Math.round(p.v * 100) + ' %' : t('rv.shield.off')}</span></div>`)
    .join('');
  return `<div class="card rvl-shield"><div class="row" style="gap:12px;align-items:center;margin-bottom:8px"><span class="rvl-cup">${icon('shield')}</span><div style="flex:1;min-width:0"><div class="disp rvl-big num">${pct} %<small> ${t('rv.shield.cut')}</small></div>${bar((pct / 50) * 100, 'var(--good)', 'thin')}</div></div>
    <p class="hint" style="margin:0 0 8px">${t('rv.shield.help')}</p><div class="col" style="gap:6px">${rows}</div></div>`;
}

// Vad som hänt: de senaste händelserna, nyast först, med valet du gjorde
function logList(G, S) {
  const rows = S.recent
    .map((e) => {
      const ev = EV[e.ev];
      const ch = ev && ev.choices[e.c];
      if (!ev || !ch) return '';
      const [ic, col] = KIND_IC[ev.kind] || KIND_IC.hunt;
      const nm = (x) => (typeof x === 'string' ? x : L(x));
      const vars = { rival: esc(e.rival || t('ev.rival')), title: e.title ? `<i>${esc(nm(e.title))}</i>` : t('ev.lastGame'), rtitle: e.rtitle ? `<i>${esc(nm(e.rtitle))}</i>` : t('ev.theirGame'), name: esc(e.name || t('ev.someone')) };
      return `<div class="card row rvl-ev" style="--c:${col};gap:12px"><span class="rvl-ei">${icon(ic)}</span><div style="flex:1;min-width:0"><b>${Lf(ev.title, vars)}</b><div class="faint" style="font-size:12px">${dateText(e.t)} · ${t('rv.log.chose', { v: esc(L(ch.label)) })}</div></div></div>`;
    })
    .filter(Boolean)
    .join('');
  return rows ? `<div class="col" style="gap:8px">${rows}</div>` : `<p class="hint">${icon('info')} ${t('rv.log.empty')}</p>`;
}

regWin({
  id: 'rivals',
  icon: 'target',
  color: 'var(--hot)',
  size: 'md',
  title: () => t('rv.title'),
  sub: (G) => {
    const S = crisisState(G);
    return S.rival ? t('rv.sub', { lvl: t(HEAT_KEY[S.level]), n: S.handled }) : t('rv.sub.none', { n: S.handled });
  },
  render(G) {
    const S = crisisState(G);
    return `${sec(t('rv.hunt'))}${huntCard(G, S)}${sec(t('rv.shield'))}${shieldCard(G)}${sec(t('rv.log'))}${logList(G, S)}`;
  },
});

act('rv-open', () => UI.open('rivals', null, { force: true }));
