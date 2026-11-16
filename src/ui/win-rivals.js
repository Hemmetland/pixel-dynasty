// Rivaler och kriser: rivalens jakt (temperaturen), krisberedskapen och det som hänt. Läser bara spelet (sim/crisis.js):
// själva dragen och kriserna kommer som vanliga händelserutor med val (data/crisis-events.js), inga val görs här.
import { sceneHTML } from './livescene.js';
import { esc, icon, t, L, UI, act, regWin, bar, MONTHS } from './core.js';
import { Lf, lang } from '../core/i18n.js';
import { dateOf } from '../sim/const.js';
import { crisisState, crisisShield, HEAT_STEPS } from '../sim/crisis.js';
import { warState, warShield } from '../sim/hwwar.js';
import { rivalOf, rivalLog } from '../sim/rival.js';
import { EV } from '../data/events.js';

const HEAT_KEY = ['rv.heat.0', 'rv.heat.1', 'rv.heat.2', 'rv.heat.3'];
const HEAT_D = ['rv.heat.d.0', 'rv.heat.d.1', 'rv.heat.d.2', 'rv.heat.d.3'];
const HEAT_COL = ['var(--good)', 'var(--accent)', 'var(--warn)', 'var(--bug)'];
const SHIELD_KEY = { cash: 'rv.shield.cash', mood: 'rv.shield.mood', hr: 'rv.shield.hr', qa: 'rv.shield.qa', fans: 'rv.shield.fans' };
const SHIELD_IC = { cash: 'bank', mood: 'coffee', hr: 'team', qa: 'bug', fans: 'heart' };
const END_KEY = { done: 'mkt.rival.end.done', away: 'mkt.rival.end.away', bought: 'mkt.rival.end.bought' };
const KIND_IC = { hunt: ['target', 'var(--hot)'], crisis: ['fire', 'var(--bug)'], hwwar: ['factory', 'var(--tech)'] };
// hårdvarukriget: nycklar och ikoner för beredskapen och ikon per händelse
const WHEAT_D = ['rw.heat.d.0', 'rw.heat.d.1', 'rw.heat.d.2', 'rw.heat.d.3'];
const WSHIELD_KEY = { fab: 'rw.shield.fab', rep: 'rw.shield.rep', rel: 'rw.shield.rel', arch: 'rw.shield.arch', cash: 'rw.shield.cash' };
const WSHIELD_IC = { fab: 'factory', rep: 'star', rel: 'team', arch: 'cpu', cash: 'bank' };
const WAR_IC = { war_pricecut: 'trend', war_exclusive: 'gamepad', war_fanwar: 'heart', war_patent_sue: 'shield', war_patent_license: 'shield', war_short: 'truck', war_fire: 'fire' };
// vilken flik som visas (tills sidan laddas om); Hårdvara finns när hårdvaruavdelningen är öppen
const RV = { tab: 'hunt' };

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

function shieldCard(sh, keys = SHIELD_KEY, ics = SHIELD_IC, help = 'rv.shield.help') {
  const pct = Math.round(sh.total * 100);
  const rows = sh.parts
    .map((p) => `<div class="rvl-sh ${p.on ? 'on' : ''}"><span class="rvl-shi">${icon(ics[p.id])}</span><span class="rvl-shl">${t(keys[p.id])}</span><span class="spill" style="--c:${p.on ? 'var(--good)' : 'var(--faint)'}">${icon(p.on ? 'check' : 'lock')}${p.on ? '−' + Math.round(p.v * 100) + ' %' : t('rv.shield.off')}</span></div>`)
    .join('');
  return `<div class="card rvl-shield"><div class="row" style="gap:12px;align-items:center;margin-bottom:8px"><span class="rvl-cup">${icon('shield')}</span><div style="flex:1;min-width:0"><div class="disp rvl-big num">${pct} %<small> ${t('rv.shield.cut')}</small></div>${bar((pct / 50) * 100, 'var(--good)', 'thin')}</div></div>
    <p class="hint" style="margin:0 0 8px">${t(help)}</p><div class="col" style="gap:6px">${rows}</div></div>`;
}

// Vad som hänt: de senaste händelserna, nyast först, med valet du gjorde
function logList(S, empty = 'rv.log.empty') {
  const rows = S.recent
    .map((e) => {
      const ev = EV[e.ev];
      const ch = ev && ev.choices[e.c];
      if (!ev || !ch) return '';
      const [kic, col] = KIND_IC[ev.kind] || KIND_IC.hunt;
      const ic = WAR_IC[ev.id] || kic;
      const nm = (x) => (typeof x === 'string' ? x : L(x));
      const vars = {
        rival: esc(e.rival || t('ev.rival')),
        title: e.title ? `<i>${esc(nm(e.title))}</i>` : t('ev.lastGame'),
        rtitle: e.rtitle ? `<i>${esc(nm(e.rtitle))}</i>` : t('ev.theirGame'),
        name: esc(e.name || t('ev.someone')),
        rplat: e.rplat ? `<i>${esc(e.rplat)}</i>` : t('ev.theirGame'),
        prod: e.prod ? `<i>${esc(e.prod)}</i>` : t('ev.lastGame'),
        partner: esc(e.partner || t('ev.someone')),
      };
      return `<div class="card row rvl-ev" style="--c:${col};gap:12px"><span class="rvl-ei">${icon(ic)}</span><div style="flex:1;min-width:0"><b>${Lf(ev.title, vars)}</b><div class="faint" style="font-size:12px">${dateText(e.t)} · ${t('rv.log.chose', { v: esc(L(ch.label)) })}</div></div></div>`;
    })
    .filter(Boolean)
    .join('');
  return rows ? `<div class="col" style="gap:8px">${rows}</div>` : `<p class="hint">${icon('info')} ${t(empty)}</p>`;
}

// Flik Hårdvara: konkurrentens tillverkare, kriget, de tre fronterna och beredskapen
function warTab(G) {
  const S = warState(G);
  const head = !S.open
    ? `<div class="card rvl-top"><p class="hint" style="margin:0">${icon('info')} ${t('rw.none')}</p></div>`
    : (() => {
        const o = S.opp;
        const hi = Math.max(1, (S.own && S.own.w) || 0, o ? o.w : 0);
        const line = (name, w, c) => `<div><div class="kv" style="margin-bottom:3px"><span>${esc(name)}</span><b class="num">${w}</b></div>${bar((w / hi) * 100, c, 'thin')}</div>`;
        const vs = S.own && o ? `<div class="lbl" style="margin:12px 0 6px">${t('rw.strength')}</div><div class="col" style="gap:7px">${line(S.own.name, S.own.w, 'var(--accent)')}${line(o.plat, o.w, o.color)}</div>` : '';
        if (!o) return `<div class="card rvl-top"><p class="hint" style="margin:0">${icon('info')} ${t('rw.none')}</p></div>`;
        return `<div class="card rvl-top" style="--c:${HEAT_COL[S.level]}">
    <div class="row" style="gap:10px;flex-wrap:wrap;align-items:center"><span class="dotc" style="background:${o.color}"></span><b class="rvl-name">${esc(o.maker)}</b><span class="tag" style="--c:${HEAT_COL[S.level]}">${t(HEAT_KEY[S.level])}</span><span class="sp"></span><span class="faint" style="font-size:12px">${esc(o.plat)}</span></div>
    ${gauge(S.heat)}
    <p class="rvl-d">${t(WHEAT_D[S.level], { rival: `<b>${esc(o.maker)}</b>` })}</p>
    <p class="hint" style="margin:6px 0 0">${t('rw.heat.help')}</p>${vs}${S.own ? '' : `<p class="hint" style="margin:10px 0 0">${icon('info')} ${t('rw.noPlat')}</p>`}</div>`;
      })();
  const fr = (ic, key, text, on) => `<div class="card row rvl-fr ${on ? 'on' : ''}" style="gap:12px"><span class="rvl-ei" style="--c:${on ? 'var(--tech)' : 'var(--faint)'}">${icon(ic)}</span><div style="flex:1;min-width:0"><b>${t(key)}</b><div class="faint" style="font-size:12.5px">${text}</div></div></div>`;
  const platTxt = S.own && S.opp ? t('rw.f.plat.on', { name: esc(S.own.name), rplat: esc(S.opp.plat) }) : t('rw.f.plat.off');
  const patTxt = S.patent.lic ? t('rw.f.patent.lic', { n: S.patent.lic }) : S.patent.on ? t('rw.f.patent.on') : t('rw.f.patent.off');
  const supTxt = S.supply.short ? t('rw.f.supply.short', { partner: esc(S.supply.short.partner), n: S.supply.short.left }) : S.supply.on ? t('rw.f.supply.on') : t('rw.f.supply.off');
  const fronts = `${sec(t('rw.fronts'))}<div class="col" style="gap:8px">${fr('console', 'rw.f.plat', platTxt, !!(S.own && S.opp))}${fr('shield', 'rw.f.patent', patTxt, !!(S.patent.lic || S.patent.on))}${fr('truck', 'rw.f.supply', supTxt, !!S.supply.on)}</div>`;
  return `${S.open ? sceneHTML('war', G) : ''}${sec(t('rw.war'))}${head}${S.open ? fronts : ''}${sec(t('rw.shield'))}${shieldCard(warShield(G), WSHIELD_KEY, WSHIELD_IC, 'rw.shield.help')}${sec(t('rw.log'))}${logList(S, 'rw.log.empty')}`;
}

regWin({
  id: 'rivals',
  icon: 'target',
  color: 'var(--hot)',
  size: 'md',
  title: () => t('rv.title'),
  sub: (G) => {
    if (RV.tab === 'war' && G.hw) {
      const W = warState(G);
      return W.opp ? t('rv.sub', { lvl: t(HEAT_KEY[W.level]), n: W.handled }) : t('rv.sub.none', { n: W.handled });
    }
    const S = crisisState(G);
    return S.rival ? t('rv.sub', { lvl: t(HEAT_KEY[S.level]), n: S.handled }) : t('rv.sub.none', { n: S.handled });
  },
  headExtra: (G) => (G && G.hw ? `<div class="tabs">${['hunt', 'war'].map((k) => `<button class="tab ${RV.tab === k ? 'on' : ''}" data-act="rv-tab" data-id="${k}">${t(k === 'war' ? 'rv.tab.war' : 'rv.tab.hunt')}</button>`).join('')}</div>` : ''),
  render(G) {
    if (RV.tab === 'war' && G.hw) return warTab(G);
    const S = crisisState(G);
    return `${sceneHTML('crisis', G)}${sec(t('rv.hunt'))}${huntCard(G, S)}${sec(t('rv.shield'))}${shieldCard(crisisShield(G))}${sec(t('rv.log'))}${logList(S)}`;
  },
});

act('rv-open', () => UI.open('rivals', null, { force: true }));
act('rv-tab', (el) => {
  RV.tab = el.dataset.id;
  UI.refresh();
  const b = document.querySelector('[data-keep="body"]');
  if (b) b.scrollTop = 0;
});
