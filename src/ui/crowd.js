// Trängsel vid släpp i UI: brickan i utvecklingspanelen, anteckningen i recensionsrapporten och biblioteket,
// och ryktena om konkurrenternas kommande spel i marknadsfönstret.
import { esc, icon, t, L } from './core.js';
import { GENRE } from '../data/genres.js';
import { TOPIC } from '../data/topics.js';
import { crowding } from '../sim/market.js';
import { TICKS_PER_WEEK } from '../sim/const.js';

export const crowdPct = (m) => (m >= 1 ? '+' : '−') + Math.round(Math.abs(m - 1) * 100) + '%';

// En konkurrent runt släppveckan T: studio, titel (eller "nytt spel" för ett rykte), genre och tema, och när.
function rivalLine(r, T) {
  const what = r.title ? `<i>${esc(L(r.title))}</i>` : t('crowd.unnamed');
  const d = r.t - T;
  const when = d < 0 ? t('crowd.before', { n: -d }) : d > 0 ? t('crowd.after', { n: d }) : t('crowd.same');
  return t('crowd.row', { studio: `<b>${esc(r.studio)}</b>`, what, kind: `${L(GENRE[r.genre]?.name)} · ${L(TOPIC[r.topic]?.name)}`, when });
}

// Veckor kvar till släpp för ett pågående spel (utveckling + polering som återstår).
export const weeksToRelease = (J) => Math.max(0, Math.ceil((Math.max(0, J.devTicks - J.ticks) + Math.max(0, J.polishTicks - J.polishDone)) / TICKS_PER_WEEK));

// Bricka för utvecklingspanelen när släppet närmar sig (16 veckor), annars ''.
export function crowdChip(G, J) {
  if (!J || J.kind !== 'game' || J.state !== 'dev') return '';
  const n = weeksToRelease(J);
  if (n > 16) return '';
  const T = G.t + n;
  const cr = crowding(G, J, T);
  const quiet = cr.mult > 1;
  const tip = (quiet ? t('crowd.tipQuiet', { v: crowdPct(cr.mult) }) : t('crowd.tipBusy', { v: crowdPct(cr.mult) }) + '<br>' + cr.rivals.slice(0, 4).map((r) => '· ' + rivalLine(r, T)).join('<br>')) + '<br><span class="faint">' + t('crowd.tipWhen', { n }) + (J.phase === 3 ? ' ' + t('crowd.tipMove') : '') + '</span>';
  return `<span class="chip c" style="--c:${quiet ? 'var(--good)' : cr.mult < 0.95 ? 'var(--bug)' : 'var(--warn)'}" data-tip="${esc(tip)}">${icon(quiet ? 'leaf' : 'team')}${t(quiet ? 'crowd.quiet' : 'crowd.busy')} ${crowdPct(cr.mult)}</span>`;
}

// Anteckning i rapporten (live, släpp nu) eller för ett släppt spel (sparat crowd/crowdBy). '' om okänt.
export function crowdNote(G, x, released) {
  let mult;
  let list;
  if (released) {
    if (x.crowd == null) return '';
    mult = x.crowd;
    list = (x.crowdBy || []).map((r) => `<b>${esc(r.studio)}</b>${r.title ? ` (<i>${esc(L(r.title))}</i>)` : ''}`).join(', ');
  } else {
    const cr = crowding(G, x, G.t);
    mult = cr.mult;
    list = cr.rivals.slice(0, 2).map((r) => rivalLine(r, G.t)).join('; ');
  }
  if (mult === 1 && !list) return '';
  const lvl = mult > 1 ? 'good' : mult < 0.95 ? 'bad' : 'ok';
  const txt = mult > 1 ? t('ins.crowd.quiet', { v: `<b>${crowdPct(mult)}</b>` }) : t('ins.crowd.busy', { list, v: `<b>${crowdPct(mult)}</b>` });
  return `<div class="in ${lvl}"><span class="ii">${icon(mult > 1 ? 'leaf' : 'team')}</span><span>${txt}</span></div>`;
}
