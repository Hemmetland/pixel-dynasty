// Studiolivet: ett gemensamt fönster för det som gör studion levande. Krönikan samlar allt som hänt (personalen, fansen, tidningen,
// världen och dramat) i en tidslinje, och Folket visar vem som är vän med vem, personligheter, födelsedagar och drömmar. Bara läsning:
// allt kommer ur sim/life.js (krönikan) och sim/folk.js.
import { esc, icon, t, L, UI, act, regWin, MONTHS } from './core.js';
import { lang } from '../core/i18n.js';
import { avatarImg } from '../render/people.js';
import { dateOf } from '../sim/const.js';
import { lifeText, chronLog, CHRON_AREAS } from '../sim/life.js';
import { QUIRKS } from '../data/folk.js';
import { persona, ageOf, bdayIn, bondsOf, friendsOf, partnerOf, folkOf, dreamName } from '../sim/folk.js';

const LS = { tab: 'chron', area: 'all' };
const AREA_IC = { folk: 'heart', fans: 'user', press: 'book', world: 'globe', drama: 'fire', studio: 'star' };
const AREA_COL = { folk: 'var(--fans)', fans: 'var(--accent)', press: 'var(--design)', world: 'var(--good)', drama: 'var(--hot)', studio: 'var(--gold)' };
const AREA_KEY = { folk: 'lf.area.folk', fans: 'lf.area.fans', press: 'lf.area.press', world: 'lf.area.world', drama: 'lf.area.drama', studio: 'lf.area.studio' };
const when = (tt) => {
  const d = dateOf(tt);
  return `${MONTHS[lang][d.month]} ${d.year}`;
};

// Personlighetsbrickan (används också i personalfönstret)
export function quirkChip(G, s) {
  const q = QUIRKS[persona(G, s).quirk];
  return `<span class="chip" data-tip="${esc(L(q.desc))}">${icon(q.ic)}${L(q.name)}</span>`;
}
// En rad om vem personen är vän med eller ihop med (tom om ingen)
export function bondsLine(G, s) {
  const par = partnerOf(G, s.id);
  const fr = friendsOf(G, s.id).filter((x) => !par || x.id !== par.id);
  const parts = [];
  if (par) {
    const b = bondsOf(G, s.id).find((x) => x.k === 'couple');
    parts.push(`<span class="chip c" style="--c:var(--fans)">${icon('heart')}${t(b && b.wed > 0 ? 'lf.p.married' : 'lf.p.couple', { name: esc(par.name.split(' ')[0]) })}</span>`);
  }
  if (fr.length) parts.push(`<span class="chip c" style="--c:var(--good)">${icon('user')}${t('lf.p.friend', { names: esc(fr.map((x) => x.name.split(' ')[0]).join(', ')) })}</span>`);
  return parts.join('');
}

function chronRow(it) {
  const col = AREA_COL[it.ch] || 'var(--accent)';
  return `<div class="lf-row"><span class="lf-ic" style="--c:${col}">${icon(AREA_IC[it.ch] || 'star')}</span><span class="lf-tx">${esc(lifeText(it))}</span><span class="lf-when faint">${when(it.t)}</span></div>`;
}
function chronTab(G) {
  const have = CHRON_AREAS.filter((a) => chronLog(G, a, 1).length);
  if (LS.area !== 'all' && !have.includes(LS.area)) LS.area = 'all';
  const chips = ['all', ...have].map((a) => `<button class="chip lf-chip ${LS.area === a ? 'on' : ''}" data-act="lf-area" data-id="${a}">${a === 'all' ? t('lf.area.all') : `${icon(AREA_IC[a])}${t(AREA_KEY[a])}`}</button>`).join('');
  const rows = chronLog(G, LS.area === 'all' ? '' : LS.area, 60);
  return `<p class="hint" style="margin:0 0 10px">${icon('info')} ${t('lf.chron.help')}</p>
    <div class="row wrap" style="gap:6px;margin-bottom:10px">${chips}</div>
    ${rows.length ? `<div class="lf-list">${rows.map(chronRow).join('')}</div>` : `<div class="empty">${icon('book')}<div>${t('lf.chron.empty')}</div></div>`}`;
}

const moodCol = (m) => (m >= 62 ? 'var(--good)' : m >= 38 ? 'var(--warn)' : 'var(--bug)');
function personCard(G, s) {
  const F = folkOf(G);
  const P = persona(G, s);
  const dr = F.dreams[s.id];
  const bd = bdayIn(G, s);
  const sad = F.cool[s.id] && F.cool[s.id].until > G.t;
  const dreamLine =
    dr && (dr.state === 'go' || dr.state === 'free')
      ? `<div class="lf-dream" style="--c:var(--design)">${icon('bulb')}<span>${t('lf.p.dreamGo', { game: esc(dreamName(dr.dream)), n: Math.max(1, dr.until - G.t) })}</span></div>`
      : dr && dr.state === 'no'
        ? `<div class="lf-dream" style="--c:var(--bug)">${icon('bulb')}<span>${t('lf.p.dreamNo', { game: esc(dreamName(dr.dream)) })}</span></div>`
        : dr && dr.state === 'done'
          ? `<div class="lf-dream" style="--c:var(--good)">${icon('trophy')}<span>${t('lf.p.dreamDone', { game: esc(dreamName(dr.dream)) })}</span></div>`
          : `<div class="lf-dream faint">${icon('bulb')}<span>${t('lf.p.dream', { game: esc(dreamName(P.dream)) })}</span></div>`;
  const bonds = bondsLine(G, s);
  return `<div class="card lf-p"><div class="row" style="gap:10px;align-items:flex-start">
      <div class="sc-av">${avatarImg(s.look, 2, 'stand')}</div>
      <div style="flex:1;min-width:0"><div class="row" style="gap:6px"><b class="h3 ell">${esc(s.name)}</b><span class="faint" style="font-size:12px">${t('lf.p.age', { n: ageOf(G, s) })}</span></div>
        <div class="row wrap" style="gap:6px;margin-top:5px">${quirkChip(G, s)}${bonds}${sad ? `<span class="chip c" style="--c:var(--bug)" data-tip="${esc(t('lf.p.sadTip'))}">${icon('rain')}${t('lf.p.sad')}</span>` : ''}</div></div>
      <div class="lf-mood" style="--c:${moodCol(s.mood)}" data-tip="${esc(t('lf.p.moodTip'))}">${Math.round(s.mood)}</div></div>
    ${dreamLine}
    <div class="faint" style="font-size:11.5px;margin-top:6px">${icon('calendar')} ${bd === 0 ? t('lf.p.bdayNow') : t('lf.p.bday', { n: bd })}</div></div>`;
}
function folkTab(G) {
  const F = folkOf(G);
  const couples = F.bonds.filter((b) => b.k === 'couple').length;
  const friends = F.bonds.filter((b) => b.k === 'friend').length;
  const people = G.staff.slice().sort((a, b) => (b.isFounder ? 1 : 0) - (a.isFounder ? 1 : 0) || a.id - b.id);
  const next = people.map((s) => ({ s, in: bdayIn(G, s) })).sort((a, b) => a.in - b.in || a.s.id - b.s.id).slice(0, 3);
  return `<p class="hint" style="margin:0 0 10px">${icon('info')} ${t('lf.folk.help')}</p>
    <div class="row wrap" style="gap:8px;margin-bottom:12px"><span class="chip c" style="--c:var(--good)">${icon('user')}${t('lf.folk.friends', { n: friends })}</span><span class="chip c" style="--c:var(--fans)">${icon('heart')}${t('lf.folk.couples', { n: couples })}</span>
      ${next.map((x) => `<span class="chip">${icon('calendar')}${t(x.in === 0 ? 'lf.folk.bdayNow' : 'lf.folk.bday', { name: esc(x.s.name.split(' ')[0]), n: x.in })}</span>`).join('')}</div>
    <div class="grid lf-grid">${people.map((s) => personCard(G, s)).join('')}</div>`;
}

const TABS = [
  ['chron', 'lf.tab.chron', 'book'],
  ['folk', 'lf.tab.folk', 'heart'],
];
regWin({
  id: 'life',
  icon: 'heart',
  color: 'var(--fans)',
  size: 'xl',
  title: () => t('lf.title'),
  sub: (G) => t('lf.sub', { n: G.staff.length, m: G.staff.length ? Math.round(G.staff.reduce((a, s) => a + s.mood, 0) / G.staff.length) : 0 }),
  headExtra: () => `<div class="tabs">${TABS.map(([id, key, ic]) => `<button class="tab ${LS.tab === id ? 'on' : ''}" data-act="lf-tab" data-id="${id}">${icon(ic)}${t(key)}</button>`).join('')}</div>`,
  render(G, arg) {
    if (arg && arg.tab && TABS.some((x) => x[0] === arg.tab)) LS.tab = arg.tab;
    return LS.tab === 'folk' ? folkTab(G) : chronTab(G);
  },
});
act('lf-tab', (el) => {
  LS.tab = el.dataset.id;
  UI.refresh();
});
act('lf-area', (el) => {
  LS.area = el.dataset.id;
  UI.refresh();
});
