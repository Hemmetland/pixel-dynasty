// Ärkerivalen: branschpressen pekar ut studion närmast framför dig i rankningen som din motståndare. Varje årsskifte får
// den som sålde mest under året en poäng. Raka segrar avgör duellen, och då pekas en ny rival ut högre upp på stegen.
// Bara uppvisning: duellen påverkar varken pengar, fans, försäljning eller slumpföljden.
import { yearOf } from './const.js';
import { note } from './news.js';

export const RIVAL_RUN = 3; // raka segrar som avgör duellen (två räcker när rivalen halkat minst tre platser efter)
const FLIP_GAP = 24; // minst så många veckor mellan nyheter om att ni gått om varandra

// rivalens studio (null utan rival, eller när du har köpt den)
export function rivalOf(G) {
  const R = G.rival;
  const c = R ? (G.comps || []).find((x) => x.id === R.id) : null;
  return c && !c.owned ? c : null;
}

// rivalens senaste spel, att jämföra dina släpp med
export function rivalLast(G) {
  const c = rivalOf(G);
  return c ? G.market.releases.filter((r) => r.comp === c.id && r.t <= G.t).slice(-1)[0] || null : null;
}

// ny rival: studion närmast framför dig, eller den största av de andra när du själv är störst
function pick(rows, skip) {
  const me = rows.find((r) => r.you);
  if (!me || !(me.rev > 0)) return null;
  const others = rows.filter((r) => !r.you && r.id !== skip);
  return others.filter((r) => r.pos < me.pos).pop() || others[0] || null;
}

// avslutade dueller, äldst först: { id, name, from, to, w, l, end } där end är 'done' (du vann), 'away' (rivalen drog
// ifrån) eller 'bought' (du köpte rivalen)
export const rivalLog = (G) => G.rivalLog || [];
function close(G, R, y, end) {
  const log = G.rivalLog || (G.rivalLog = []);
  log.push({ id: R.id, name: R.name, from: R.since, to: y, w: R.w, l: R.l, end });
  if (log.length > 40) log.shift();
  G.rival = null;
}

// Årsskiftet: årets duell avgörs och en ny rival utses när det behövs. Svaret sparas med årets plats (till årsrapporten).
export function rivalYear(G, rows) {
  const y = yearOf(G.t) - 1;
  const me = rows.find((r) => r.you);
  const out = {};
  let skip = 0;
  const R = G.rival;
  const them = R ? rows.find((r) => r.id === R.id) : null;
  if (R && !them) close(G, R, y, 'bought'); // uppköpt: duellen är över
  else if (R && R.since <= y) {
    const win = me.rev > them.rev;
    if (win) R.w++;
    else R.l++;
    R.run = win ? Math.max(0, R.run) + 1 : Math.min(0, R.run) - 1;
    R.lead = me.pos < them.pos;
    const v = { studio: G.studio, rival: R.name, y, w: R.w, l: R.l };
    out.duel = { name: R.name, win, w: R.w, l: R.l };
    note(G, win ? 'news.rivalWin' : 'news.rivalLoss', v, win ? 'good' : 'info', true);
    const apart = Math.abs(me.pos - them.pos);
    if (win && (R.run >= RIVAL_RUN || (R.run >= 2 && apart >= 3))) {
      out.duel.end = 'done';
      note(G, 'news.rivalDone', v, 'good', true);
    } else if (!win && R.run <= -RIVAL_RUN && apart >= 4) {
      out.duel.end = 'away';
      note(G, 'news.rivalAway', v, 'info', true);
    }
    if (out.duel.end) {
      skip = R.id;
      close(G, R, y, out.duel.end);
    }
  }
  if (!G.rival) {
    const r = pick(rows, skip);
    if (r) {
      G.rival = { id: r.id, name: r.name, since: y + 1, w: 0, l: 0, run: 0, lead: me.pos < r.pos, flipT: G.t };
      out.rival = r.name;
      if (rivalLog(G).some((x) => x.id === r.id)) out.again = true; // en gammal rival är tillbaka
      note(G, 'news.rival', { studio: G.studio, rival: r.name }, 'info', true);
    }
  }
  return out;
}

// Varje månad: en nyhet när du går om rivalen i rankningen, eller rivalen går om dig. Svarar 'pass' när du gick om.
export function rivalMonth(G, rows) {
  const R = G.rival;
  if (!R) return '';
  const me = rows.find((r) => r.you);
  const them = rows.find((r) => r.id === R.id);
  if (!them || !(me.rev > 0)) return '';
  const lead = me.pos < them.pos;
  if (lead === R.lead) return '';
  R.lead = lead;
  if (G.t - (R.flipT ?? -1e9) < FLIP_GAP) return '';
  R.flipT = G.t;
  note(G, lead ? 'news.rivalPass' : 'news.rivalPassed', { studio: G.studio, rival: R.name }, lead ? 'good' : 'bad');
  return lead ? 'pass' : 'passed';
}
