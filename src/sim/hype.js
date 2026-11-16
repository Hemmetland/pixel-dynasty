// Förväntan (hype) har inget tak. Kampanjerna ger ett lyft, men det som får den att växa vecka efter vecka är Snacket:
// studions rykte, hur demon gick, trailern, presentationen och pressens dom om mässan. Förväntan växer med en procentsats
// i veckan (Snacket) och minskar långsamt av sig själv. Ju högre den är, desto mer säljer spelet.
// Ingen slump här: Snacket sätts av utfall som redan är avgjorda (mässans program, rykte), så fröet påverkas inte.
import { clamp } from '../core/util.js';
import { TICKS_PER_WEEK } from './const.js';
import { SCOPE_TEMPO } from './tempo.js';

// Skalan är öppen uppåt. Upp till 100 är den som förut (linjär); därefter växer den som en logaritm, så varje fördubbling
// ger lika mycket extra och kurvan fortsätter uppåt utan att skenar. hypeLevel(100) = 1, hypeLevel(200) ≈ 1,69.
export const hypeLevel = (h) => (!(h > 0) ? 0 : h <= 100 ? h / 100 : 1 + Math.log(h / 100));
// Försäljningen: +125 % vid 100 (som förut), därefter +1,25 gånger logaritmen av hur många gånger över hundra.
export const hypeMult = (h) => 1 + 1.25 * hypeLevel(h);

// Kampanjer (köpt reklam) lyfter Förväntan till som mest 100, en väl utannonserad lansering. Allt över det måste komma ur Snacket.
export const PR_CEILING = 100;
export const prGain = (h, add) => Math.max(0, Math.min(add, PR_CEILING - h));

export const HYPE_DECAY = 0.9988; // per tick (före skalning med projektets längd)
export const TALK_HALF = 10; // veckor tills en del av Snacket halverats
export const TALK_MAX = 12; // procent i veckan, högst (och −3 som lägst)
const tempoOf = (J) => SCOPE_TEMPO[J.scope] || 1;

// Lägg till Snack (procent i veckan) från en källa; negativa tal är dåligt rykte. Samma källa ackumuleras.
export function addTalk(J, src, pts) {
  if (!J || !pts) return;
  if (!J.talk) J.talk = {};
  J.talk[src] = (J.talk[src] || 0) + pts;
}

// Studions rykte, 0 till 1: fans, betyget på de tre senaste spelen och priser. Ett gott rykte gör att allt positivt Snack
// (demon, presentationen, pressens dom) sprider sig längre: ett rykte på 1 fördubblar det. Det växer inte Förväntan av sig självt.
export function repScore(G) {
  const gs = G.games.filter((g) => !g.expansionOf).slice(-3);
  const avg = gs.length ? gs.reduce((a, g) => a + g.score, 0) / gs.length : 0;
  const f = 0.5 * clamp(Math.log10(1 + (G.fans || 0) / 1000) / 4, 0, 1); // 10 miljoner fans = 0,5
  const s = gs.length >= 2 ? 0.35 * clamp((avg - 6.5) / 2, 0, 1) : 0; // snitt 8,5 = 0,35
  const a = 0.15 * clamp((G.awards || []).length / 20, 0, 1);
  return f + s + a;
}

// Delarna av Snacket för ett projekt: [{ k, v }] i procent i veckan, störst först. k = en källa i J.talk, och 'rep' för det
// studions rykte lägger på de positiva delarna.
export function talkParts(G, J) {
  const parts = Object.keys(J.talk || {})
    .filter((k) => Math.abs(J.talk[k]) >= 0.05)
    .map((k) => ({ k, v: J.talk[k] }));
  const pos = parts.reduce((a, p) => a + Math.max(0, p.v), 0);
  if (pos > 0.05) parts.push({ k: 'rep', v: pos * repScore(G) });
  return parts.sort((a, b) => b.v - a.v);
}
export const talkRate = (G, J) => clamp(talkParts(G, J).reduce((a, p) => a + p.v, 0), -3, TALK_MAX);

// En tick av utvecklingen: Snacket lägger på förväntan och förväntan tappar lite av sig själv. Små tal växer också
// (en liten fast del), annars kunde ett spel utan förväntan aldrig få någon.
export function hypeTick(G, J) {
  const tempo = tempoOf(J);
  const g = talkRate(G, J) / 100 / TICKS_PER_WEEK / tempo;
  const h = Math.max(0, J.hype || 0);
  J.hype = Math.max(0, h * Math.pow(HYPE_DECAY, 1 / tempo) + g * (g > 0 ? h + 8 : h));
  if (J.talk) {
    const f = Math.pow(0.5, 1 / (TICKS_PER_WEEK * TALK_HALF * tempo));
    for (const k of Object.keys(J.talk)) {
      J.talk[k] *= f;
      if (Math.abs(J.talk[k]) < 0.02) delete J.talk[k];
    }
  }
}

// Hur Förväntan rör sig just nu, i procent per vecka (växande eller sjunkande), till visning i gränssnittet.
export function hypeDrift(G, J) {
  const tempo = tempoOf(J);
  const g = talkRate(G, J) / 100 / TICKS_PER_WEEK / tempo;
  return (Math.pow(Math.pow(HYPE_DECAY, 1 / tempo) * (1 + g), TICKS_PER_WEEK) - 1) * 100;
}

// Det som visas: varje del av Snacket som verklig procent per vecka (delat med projektets längd, som i hypeTick), hur mycket
// tiden drar ner och vad Förväntan rör sig sammanlagt. Ett stort spel tar längre tid, så samma Snack ger mindre per vecka.
export function hypeBreakdown(G, J) {
  const tempo = tempoOf(J);
  return { parts: talkParts(G, J).map((p) => ({ k: p.k, v: p.v / tempo })), fade: (Math.pow(HYPE_DECAY, TICKS_PER_WEEK / tempo) - 1) * 100, net: hypeDrift(G, J) };
}
export const talkWeekly = (J, raw) => raw / tempoOf(J);

// Milstolpar: första gången ett projekt passerar 100 och 200 (en nyhet var).
export const HYPE_MARKS = [100, 200];
export function hypeMark(J) {
  let m = 0;
  for (let i = 0; i < HYPE_MARKS.length; i++) if (J.hype >= HYPE_MARKS[i]) m = i + 1;
  if (m > (J.hmark || 0)) {
    J.hmark = m;
    return m;
  }
  return 0;
}
