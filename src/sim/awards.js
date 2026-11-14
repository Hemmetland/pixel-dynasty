import { emit } from '../core/bus.js';
import { yearOf, tOf } from './const.js';
import { earn } from './studio.js';
import { relUnitsTotal, CHART_REACH } from './market.js';
import { note } from './news.js';

export const AWARD_CATS = [
  { id: 'goty', glyph: 'a_trophy', name: { sv: 'Årets spel', en: 'Game of the Year' }, reward: 1 },
  { id: 'design', glyph: 'c_gameplay', name: { sv: 'Bästa design', en: 'Best Design' }, reward: 0.5 },
  { id: 'tech', glyph: 'c_engine', name: { sv: 'Bästa teknik', en: 'Best Technology' }, reward: 0.5 },
  { id: 'fan', glyph: 'a_heart', name: { sv: 'Publikens favorit', en: 'Fan Favourite' }, reward: 1 },
];
// Galan hålls första gången 1981: året innan är branschen för liten (tre–åtta spel), och ett medelmåttigt första spel
// kunde bli Årets spel.
export const FIRST_GALA = 1981;
// En nominering utan vinst ger en tredjedel av prisets belöning: uppmärksamheten räcker en bit. Priserna är svårare att
// vinna än förr (publikpriset mäts mot konkurrenternas spel med förlagens räckvidd, som på topplistan), och
// nomineringarna håller studions tidiga tillväxt i samma takt.
export const NOM_SHARE = 1 / 3;

// Samlar årets spel (konkurrenter + dina) med mätvärden. now = tidpunkten som konkurrenternas försäljning räknas till
// (galan räknar hela året, ställningen under året räknar fram till i dag).
function yearEntries(G, year, now) {
  const lo = tOf(year);
  const hi = tOf(year + 1);
  if (now == null) now = hi;
  const out = [];
  for (const r of G.market.releases) {
    if (r.t >= lo && r.t < hi) {
      out.push({ title: r.title, studio: r.studio, yours: false, score: r.score, design: r.score + (r.id % 7) * 0.08 - 0.2, tech: r.score + (r.id % 5) * 0.1 - 0.2, units: relUnitsTotal(r, now) * CHART_REACH, topic: r.topic, color: r.color });
    }
  }
  // Galan hålls när årets sista vecka börjar (t = hi - 1), så ett spel som släpps den veckan tävlar nästa år
  for (const g of G.games) {
    if (g.t >= lo - 1 && g.t < hi - 1) {
      out.push({ title: g.title, studio: G.studio, yours: true, score: g.score, design: g.score + Math.log2(Math.max(0.2, g.parts.rd)) * 0.45, tech: g.score + Math.log2(Math.max(0.2, g.parts.rt)) * 0.45, units: g.units || g.total / g.priceAt, topic: g.topic, gid: g.id });
    }
  }
  return out;
}

const keyOf = (c) => (c.id === 'goty' ? 'score' : c.id === 'fan' ? 'units' : c.id);

// Ställningen inför galan, så som den ser ut i dag: för varje pris de fyra som leder, din bästa plats och spelet som har
// den. Bara uppvisning (marknadsfönstret och en nyhet tolv veckor före galan): galan räknar själv när den hålls.
// weeks = veckor kvar till galan, field = antal spel i fältet (galan hålls bara med minst fyra), v = värdet priset rangordnar
// efter (betyg, juryns design- eller teknikvärde, sålda exemplar), cut = fjärde platsens värde (gränsen för en nominering,
// null när färre än fyra spel finns). null före första galan.
export const GALA_FIELD = 4;
export function awardStandings(G) {
  const year = yearOf(G.t);
  if (year < FIRST_GALA) return null;
  const gala = tOf(year + 1) - 1; // galan hålls årets sista vecka
  const entries = yearEntries(G, year, G.t);
  const cats = AWARD_CATS.map((c) => {
    const key = keyOf(c);
    const sorted = entries.slice().sort((a, b) => b[key] - a[key]);
    const i = sorted.findIndex((e) => e.yours);
    const pick = (e) => ({ title: e.title, studio: e.studio, yours: e.yours, score: e.score, units: e.units, v: e[key], gid: e.gid });
    return { id: c.id, top: sorted.slice(0, 4).map(pick), place: i + 1, mine: i >= 0 ? pick(sorted[i]) : null, cut: sorted[3] ? sorted[3][key] : null };
  });
  return { year, weeks: gala - G.t, field: entries.length, cats };
}
// Tolv veckor före galan: en nyhet om läget i Årets spel, så att det finns något att sikta på under hösten.
export const GALA_WATCH = 12;
export function galaWatch(G) {
  const s = awardStandings(G);
  if (!s || s.weeks !== GALA_WATCH || s.field < GALA_FIELD) return;
  const c = s.cats[0];
  const cat = AWARD_CATS[0].name;
  const lead = c.top[0];
  if (c.place === 1) note(G, 'news.galaLead', { title: lead.title, cat }, 'award');
  else if (c.place >= 2 && c.place <= 4) note(G, 'news.galaNom', { title: c.mine.title, n: c.place, cat, lead: lead.title, v: lead.score.toFixed(1) }, 'info');
  else note(G, 'news.galaOut', { lead: lead.title, studio: lead.studio, cat, v: lead.score.toFixed(1) }, 'info', true);
}

export function runAwards(G) {
  const year = yearOf(G.t);
  if (year < FIRST_GALA) return;
  const entries = yearEntries(G, year);
  if (entries.length < GALA_FIELD) return;
  const cats = [];
  let yoursNominated = false;
  for (const c of AWARD_CATS) {
    const key = keyOf(c);
    const sorted = entries.slice().sort((a, b) => b[key] - a[key]).slice(0, 4);
    const nominees = sorted.map((e) => ({ title: e.title, studio: e.studio, yours: e.yours, score: e.score, topic: e.topic, gid: e.gid }));
    const winner = 0;
    if (nominees.some((n) => n.yours)) yoursNominated = true;
    cats.push({ id: c.id, nominees, winner });
  }
  const wins = cats.filter((c) => c.nominees[c.winner].yours);
  if (yoursNominated) {
    // galans belöning: fans och prispengar för varje vinst, och en mindre del för varje nominering utan vinst
    const gain = { fans: 0, money: 0, noms: 0 };
    for (const c of cats) {
      const won = c.nominees[c.winner].yours;
      if (!won && !c.nominees.some((n) => n.yours)) continue;
      const def = AWARD_CATS.find((a) => a.id === c.id);
      const k = def.reward * (won ? 1 : NOM_SHARE);
      const fans = Math.round((300 + G.fans * 0.06) * k);
      const money = Math.round((8000 + Math.max(0, G.money) * 0.01) * k); // ingen negativ prissumma vid skuld
      G.fans += fans;
      earn(G, money, 'awards');
      gain.fans += fans;
      gain.money += money;
      if (won) G.awards.push({ year, cat: c.id, title: c.nominees[0].title });
      else gain.noms++;
    }
    G.pending.push({ type: 'award', id: G.uid++, year, cats, gain });
    // krönikan (galan visas redan som prompt): en rad per år, med den främsta vinsten eller antalet nomineringar
    if (wins.length) {
      const top = wins[0];
      const v = { title: top.nominees[0].title, cat: AWARD_CATS.find((a) => a.id === top.id).name, year, n: wins.length };
      if (wins.length === 1) note(G, 'news.awardWin', v, 'award', true);
      else note(G, 'news.awardWins', v, 'award', true);
    } else note(G, 'news.awardNom', { year, n: gain.noms }, 'info', true);
    emit('awards', { wins: wins.length });
  } else {
    const w = cats[0].nominees[0];
    note(G, 'news.awards', { year, title: w.title, studio: w.studio }, 'info');
  }
}
