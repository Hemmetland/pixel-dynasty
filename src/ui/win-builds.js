// Bygge: alla spel som byggs just nu, både ordinarie teamets projekt och självgående teams uppdrag (en uppföljare, en expansion
// eller ett nytt spel). Varje bygge har sin egen Förväntan med Snack, sina framsteg och sin logg över vad som hänt under bygget
// (kampanjer, demo, mässan, pressen, fasbyten). Bara läsning: allt kommer ur sim/builds.js, hype.js och expmeet.js.
import { esc, icon, t, L, UI, act, regWin, MONTHS, bar } from './core.js';
import { lang } from '../core/i18n.js';
import { dateOf } from '../sim/const.js';
import { MKT } from '../data/research.js';
import { buildsOf, buildInfo } from '../sim/builds.js';
import { DIR_IDS } from '../sim/expdirs.js';
import { liveGames } from '../sim/live.js';
import { expansionStatus } from '../sim/expmeet.js';
import { hypeArrow, hypeRateText, hypePartsHTML } from './hypeui.js';
import { setMkTarget } from './win-misc.js';

const PHASE = ['dev.p1', 'dev.p2', 'dev.p3', 'dev.polish'];
const TONE = [null, 'expo.p.kn1', 'expo.p.kn2', 'expo.p.kn3'];
const VERDICT = ['expo.v0', 'expo.v1', 'expo.v2', 'expo.v3', 'expo.v4'];
const KIND_IC = { new: 'gamepad', sequel: 'book', expansion: 'globe', live: 'globe' };
const KIND_KEY = { new: 'bd.kind.new', sequel: 'bd.kind.sequel', expansion: 'bd.kind.expansion', live: 'bd.kind.live' };
const LOG_IC = { start: 'flag', phase: 'hammer', camp: 'megaphone', demo: 'gamepad', stage: 'megaphone', press: 'book', hype1: 'fire', hype2: 'fire', event: 'bulb', crunch: 'clock', dir: 'team' };

const when = (tt) => {
  const d = dateOf(tt);
  return `${MONTHS[lang][d.month]} ${d.year}`;
};

// Raden i loggen som text och om den är bra (grön), dålig (röd) eller bara en upplysning
function logLine(e) {
  switch (e.k) {
    case 'start': return { s: t('bl.start'), c: '' };
    case 'phase': return { s: t('bl.phase', { name: t(PHASE[Math.min(3, e.a)]) }), c: '' };
    case 'camp': return { s: t('bl.camp', { name: MKT[e.a] ? L(MKT[e.a].name) : '', n: e.v }), c: 'good' };
    case 'demo': return { s: t('bl.demo.' + e.v), c: e.v === 1 || e.v === 3 ? 'bad' : 'good' };
    case 'stage': return { s: t('bl.stage', { tone: t(TONE[e.a] || TONE[1]), react: t('bl.react.' + e.v) }), c: e.v === 0 ? 'bad' : 'good' };
    case 'press': return { s: t(e.v > 0 ? 'bl.press.prizes' : 'bl.press', { verdict: t(VERDICT[e.a] || VERDICT[2]), n: e.v }), c: e.a >= 3 ? 'good' : e.a <= 1 ? 'bad' : '' };
    case 'hype1': return { s: t('bl.hype1'), c: 'good' };
    case 'hype2': return { s: t('bl.hype2'), c: 'good' };
    case 'event': return { s: t(e.a >= 0 ? 'bl.event.up' : 'bl.event.down', { n: Math.abs(e.a) }), c: e.a >= 0 ? 'good' : 'bad' };
    case 'crunch': return { s: t('bl.crunch.' + (e.v ? 1 : 0)), c: '' };
    case 'dir': return { s: t('bl.dir', { name: t('exd.' + (DIR_IDS[e.a] || 'more') + '.n') }), c: '' };
    default: return null;
  }
}

function logHTML(J) {
  const rows = (J.log || [])
    .slice()
    .reverse()
    .map((e) => {
      const l = logLine(e);
      return l ? `<div class="bd-ev ${l.c}"><span class="bd-ic">${icon(LOG_IC[e.k] || 'info')}</span><span class="bd-t">${when(e.t)}</span><span class="bd-s">${l.s}</span></div>` : '';
    })
    .join('');
  return rows || `<p class="hint" style="margin:0">${t('bd.logNone')}</p>`;
}

function card(G, b) {
  const I = buildInfo(G, b);
  const J = b.J;
  const ready = J.state === 'report';
  const phase = t(PHASE[Math.min(3, J.phase)]);
  const p = Math.round(I.pct * 100);
  const who = I.team ? esc(L(I.team.name)) : t('bd.you');
  const arrow = hypeArrow(G, J);
  const over = I.hype > 100 ? ' over' : '';
  const c = I.team ? 'var(--tech)' : 'var(--accent)';
  return `<div class="card bd-card" style="--c:${c}" data-key="${b.key}">
    <div class="row bd-head"><span class="exp-vi">${icon(KIND_IC[I.kind])}</span><b class="bd-title">${esc(J.title)}</b><span class="chip">${t(KIND_KEY[I.kind])}</span><span class="chip">${icon('team')}${who}</span><span class="sp"></span><span class="spill" style="--c:${c}">${phase}</span></div>
    <div class="bd-prog">${bar(p, c)}<span class="faint num">${t('bd.pct', { p, w: ready ? 0 : I.weeks })}</span></div>
    <div class="grid bd-cnt" style="grid-template-columns:repeat(auto-fit,minmax(96px,1fr));margin:10px 0">
      <div class="counter${over}" style="--c:var(--hot)"><div class="v num">${I.hype}${arrow ? `<i class="hd ${arrow}">${arrow === 'up' ? '▲' : '▼'}</i>` : ''}</div><div class="k">${t('stat.hype')}</div></div>
      <div class="counter" style="--c:var(--bug)"><div class="v num">${I.bugs}</div><div class="k">${t('stat.bugs')}</div></div>
      <div class="counter" style="--c:var(--accent)"><div class="v num">${I.crew}</div><div class="k">${t('bd.crewK')}</div></div>
    </div>
    <div class="bd-cols">
      <div><div class="lbl" style="margin:0 0 6px">${t('hy.title')}</div><div class="faint" style="font-size:12.5px;margin-bottom:4px">${hypeRateText(G, J)}</div>${hypePartsHTML(G, J)}
        <div style="margin-top:8px"><button class="btn" data-act="bd-promo" data-key="${b.key}" ${J.state === 'dev' ? '' : 'disabled'}>${icon('megaphone')}${t('bd.promote')}</button></div></div>
      <div><div class="lbl" style="margin:0 0 6px">${t('bd.log')}</div><div class="bd-log">${logHTML(J)}</div></div>
    </div>
  </div>`;
}

const LIVE_KEY = { meeting: 'bd.live.meeting', building: 'bd.live.building', later: 'bd.live.later', due: 'bd.live.due', dueNoTeam: 'bd.live.dueNoTeam', wait: 'bd.live.wait' };
function liveCard(G) {
  const gs = liveGames(G);
  if (!gs.length) return '';
  const rows = gs
    .map((g) => {
      const st = expansionStatus(G, g);
      const txt = t(LIVE_KEY[st.k], { n: st.n, fresh: st.fresh, who: st.team ? ' (' + esc(L(st.team)) + ')' : '' });
      return `<div class="card row" style="gap:10px;align-items:center"><span class="exp-vi">${icon('globe')}</span><div style="flex:1;min-width:0"><b>${esc(g.title)}</b><div class="faint" style="font-size:12.5px">${txt}</div></div></div>`;
    })
    .join('');
  return `<div class="row rvl-sec"><div class="lbl">${t('bd.live')}</div></div><div class="col" style="gap:8px">${rows}</div>`;
}

regWin({
  id: 'builds',
  icon: 'hammer',
  color: 'var(--hot)',
  size: 'lg',
  title: () => t('bd.title'),
  sub: (G) => {
    const n = buildsOf(G).length;
    return n ? t('bd.sub', { n }) : t('bd.sub0');
  },
  render(G) {
    const bs = buildsOf(G);
    const body = bs.length ? `<div class="col" style="gap:12px">${bs.map((b) => card(G, b)).join('')}</div>` : `<div class="empty">${icon('hammer')}<div>${t('bd.none')}</div></div>`;
    return body + liveCard(G);
  },
});

act('bd-promo', (el) => {
  setMkTarget(el.dataset.key);
  UI.open('marketing', null, { force: true });
});
