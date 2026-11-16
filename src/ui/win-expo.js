// Spelmässan: när nästa mässa är, löftet som följer med spelet i utveckling, den senaste mässan (kan visas igen) och tidigare år.
// Själva mässan planeras i rutan som kommer när den börjar (ui/expo.js); här görs inga val, bara uppföljning.
import { esc, icon, t, UI, act, regWin, MONTHS } from './core.js';
import { lang } from '../core/i18n.js';
import { fmtFull, fmtNum } from '../core/util.js';
import { dateOf } from '../sim/const.js';
import { expoState, nextExpoT, KEYNOTES } from '../sim/exposhow.js';
import { showHall, verdictHTML } from './expo.js';

const BOOTH_KEY = [null, 'expo.o1', 'expo.o2', 'expo.o3'];
const TONE_KEY = ['expo.p.kn0', 'expo.p.kn1', 'expo.p.kn2', 'expo.p.kn3'];
const VERDICT_KEY = ['expo.v0', 'expo.v1', 'expo.v2', 'expo.v3', 'expo.v4'];
const VERDICT_COL = ['var(--bug)', 'var(--faint)', 'var(--accent)', 'var(--good)', 'var(--gold)'];
const TIPS = ['ex.tip.0', 'ex.tip.1', 'ex.tip.2', 'ex.tip.3'];
const TIP_IC = ['megaphone', 'gamepad', 'coffee', 'trophy'];

const sec = (text) => `<div class="row rvl-sec"><div class="lbl">${text}</div></div>`;
const when = (tt) => {
  const d = dateOf(tt);
  return `${MONTHS[lang][d.month]} ${d.year}`;
};

function nextCard(G, S) {
  if (!S.open) return `<div class="card"><p class="hint" style="margin:0">${icon('lock')} ${t('ex.locked')}</p></div>`;
  const nx = nextExpoT(G);
  return `<div class="card row" style="gap:12px;align-items:center"><span class="exp-vi">${icon('calendar')}</span><div style="flex:1;min-width:0"><b>${t('ex.next', { when: when(nx) })}</b><div class="faint" style="font-size:12.5px">${t('ex.nextIn', { n: S.next })}</div></div></div>`;
}

function promiseCard(G, S) {
  const P = S.promise;
  if (!P) return `<div class="card"><p class="hint" style="margin:0">${icon('info')} ${t('ex.promiseNone')}</p></div>`;
  const gs = G.games.slice(-3);
  const avg = gs.length ? (gs.reduce((a, g) => a + g.score, 0) / gs.length).toFixed(1) : '–';
  const K = KEYNOTES[P.tone];
  return `<div class="card" style="--c:var(--gold)"><div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><span class="exp-vi">${icon('megaphone')}</span><b>${esc(P.title)}</b><span class="tag" style="--c:var(--gold)">${t('ex.promiseBar', { bar: P.bar.toFixed(1) })}</span><span class="chip">${t(TONE_KEY[P.tone])}</span></div>
    <p class="hint" style="margin:8px 0 0">${t('ex.promiseText', { bar: P.bar.toFixed(1), avg, pen: Math.round(K.pen * 100), keep: Math.round(K.keep * 100) })}</p></div>`;
}

function lastCard(G, S) {
  const r = G.expoLast;
  if (!r) return `<div class="card"><p class="hint" style="margin:0">${icon('info')} ${t('ex.noShow')}</p></div>`;
  const cnt = (ic, c, v, k) => `<div class="counter xc" style="--c:${c}"><span class="xc-i">${icon(ic)}</span><div class="v num">${v}</div><div class="k">${t(k)}</div></div>`;
  return `<div class="card"><div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><b>${t('expo.title')} ${r.year}</b><span class="chip">${t(BOOTH_KEY[r.level])}</span><span class="sp"></span><button class="btn" data-act="ex-replay">${icon('eye')}${t('ex.replay')}</button></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr));margin-top:10px">${cnt('user', 'var(--accent)', fmtFull(r.visitors), 'expo.visitors')}${cnt('heart', 'var(--fans)', '+' + fmtNum(r.fans), 'expo.r.fans')}${cnt('money', 'var(--money)', '+' + fmtNum(r.revenue), 'expo.r.rev')}</div>
    ${verdictHTML(r)}</div>`;
}

function histList(G, S) {
  const h = (G.expoHist || []).slice().reverse();
  if (!h.length) return '';
  return `${sec(t('ex.hist'))}<div class="col" style="gap:6px">${h
    .map((x) => `<div class="card row exp-hist" style="gap:10px;align-items:center;flex-wrap:wrap"><b class="num">${x.y}</b><span class="chip">${t(BOOTH_KEY[x.lv])}</span><span class="faint" style="font-size:12.5px">${t('ex.histVis', { n: fmtFull(x.vis) })}</span><span class="sp"></span>${x.kn ? `<span class="chip">${icon('megaphone')}${t(TONE_KEY[x.kn])}</span>` : ''}${x.pz && x.pz.length ? `<span class="spill" style="--c:var(--gold)">${icon('trophy')}${x.pz.length}</span>` : ''}<span class="spill" style="--c:${VERDICT_COL[x.vd]}">${t(VERDICT_KEY[x.vd])}</span></div>`)
    .join('')}</div>`;
}

regWin({
  id: 'expo',
  icon: 'megaphone',
  color: 'var(--hot)',
  size: 'md',
  title: () => t('expo.title'),
  sub: (G) => {
    const S = expoState(G);
    return S.open ? t('ex.sub', { n: S.shows, p: S.prizes }) : t('ex.sub.locked');
  },
  render(G) {
    const S = expoState(G);
    const tips = TIPS.map((k, i) => `<div class="card row rvl-fr" style="gap:12px"><span class="rvl-ei">${icon(TIP_IC[i])}</span><div style="flex:1;min-width:0;font-size:13px">${t(k)}</div></div>`).join('');
    return `${sec(t('ex.secNext'))}${nextCard(G, S)}${S.open ? `${sec(t('ex.secPromise'))}${promiseCard(G, S)}` : ''}${S.open || G.expoLast ? `${sec(t('ex.secLast'))}${lastCard(G, S)}` : ''}${histList(G, S)}${sec(t('ex.secTips'))}<div class="col" style="gap:8px">${tips}</div>`;
  },
});

act('ex-open', () => UI.open('expo', null, { force: true }));
act('ex-replay', () => {
  const G = UI.app.G;
  if (G.expoLast) showHall(UI.app, G, G.expoLast, () => UI.closeModal());
});
