// Hårdvarukriget: händelser (kind 'hwwar') där en konkurrerande tillverkare går efter studions egna produkter (konsolkrig och patentstrider)
// och komponentbrist hos tillverkaren. De dras av sim/hwwar.js med hashStr (aldrig G.rng) när något säljs. Samma form som övriga händelser
// (se data/events.js). Texterna kan ha {rival} (konkurrentens tillverkare, till exempel Nova Interactive), {rplat} (dess plattform),
// {prod} (din produkt) och {partner} (tillverkaren som levererar åt dig). needs säger vad rutan behöver fylla i: 'opp' (rival och
// plattform), 'plat' (din största plattform), 'arch' (produkten en patentstrid gäller) och 'partner' (tillverkaren med brist).
// Extra fx-nycklar (sim/events.js, sim/hardware.js): hwRep (rykte som tillverkare, ±), hwBase (andel av spelarna som har din plattform,
// ±), hwCut (priskrig i så många veckor), hwShort ([veckor, kvarvarande kapacitet 0–1] hos tillverkaren), hwRev (andel av årets
// hårdvaruintäkt, ±, med ett golv), hwLic (korslicens: skydd mot patentstämningar i så många veckor) och war (hårdvarukrigets temperatur, ±).
import { PLATFORMS, potential, launchTime } from './platforms.js';

const E = (id, weight, when, title, body, choices, needs) => ({ id, kind: 'hwwar', weight, when, title, body, choices, needs });
const C = (sv, en, fx, dsv, den) => ({ label: { sv, en }, fx, hint: dsv ? { sv: dsv, en: den } : null });
const R = (sv, en) => ({ sv, en });

const PLAT = new Set(['handheld', 'console', 'vr']);
const mk = (G) => (G.hw ? G.hw.products.filter((p) => p.state === 'market') : []);
const platOf = (G) => mk(G).filter((p) => p.plat && PLAT.has(p.type)).sort((a, b) => (b.base || 0) - (a.base || 0))[0] || null;
const archOf = (G) => mk(G).find((p) => p.arch === 'own') || mk(G).find((p) => PLAT.has(p.type)) || null;
const supOf = (G) => mk(G).filter((p) => p.partner && p.partner !== 'fab').sort((a, b) => (b.dem || 0) - (a.dem || 0))[0] || null;
const licensed = (G) => !!G.hwwar && G.hwwar.lic > G.t;

// Konkurrenten på ett slag av plattform: tillverkaren av den största plattformen av slaget som säljs just nu (konsol om det inte finns
// någon av slaget), annars null. Egna plattformar räknas inte.
export function warOpponent(G, kind) {
  const yf = 1980 + G.t / 48; // som yfOf i sim/const.js
  const best = (k) =>
    PLATFORMS.filter((p) => !p.own && p.kind === k && p.maker && launchTime(p) <= yf && yf < p.y1)
      .map((p) => ({ p, w: potential(p, yf) }))
      .sort((a, b) => b.w - a.w)[0] || null;
  const b = best(kind) || (kind !== 'console' ? best('console') : null);
  return b ? { maker: b.p.maker, name: b.p.name, id: b.p.id, kind: b.p.kind, color: b.p.color, w: b.w } : null;
}
const oppFor = (G, P) => warOpponent(G, P ? P.type : 'console');

export const HWWAR_EVENTS = [
  // ── Konsolkriget ──
  E('war_pricecut', 1.5, (G) => !!platOf(G) && !!oppFor(G, platOf(G)),
    { sv: '{rival} sänker priset på {rplat}', en: '{rival} cuts the price of {rplat}' },
    { sv: 'Över en natt kostar {rplat} mindre än {prod}. Butikerna ringer redan och undrar vad ni tänker göra.', en: 'Overnight {rplat} costs less than {prod}. The shops are already calling to ask what you will do.' },
    [C('Möt priset', 'Match the price', { rev: -0.08, hwRep: 3, war: -6, res: R('Ni sänker priset i ett par veckor. Det syns i kassan, men kunderna stannar.', 'You lower the price for a couple of weeks. The cash feels it, but the customers stay.') }, 'Kostar pengar, men kunderna stannar', 'Costs money, but the customers stay'),
      C('Behåll priset', 'Hold the price', { hwBase: -0.05, hwCut: 20, war: 4, res: R('Kunderna väljer det billigare alternativet. Ni tappar mark i veckor.', 'Customers pick the cheaper option. You lose ground for weeks.') }, 'Billigt nu, men ni tappar köpare', 'Cheap now, but you lose buyers'),
      C('Släpp ett paket med ett spel', 'Bundle a game', { rev: -0.05, hwBase: 0.02, fansRel: 0.01, war: -3, res: R('Paketet med ett gratis spel blir säsongens samtalsämne.', 'The bundle with a free game becomes the talk of the season.') })],
    ['opp', 'plat']),
  E('war_exclusive', 1.3, (G) => !!platOf(G) && !!oppFor(G, platOf(G)),
    { sv: '{rival} köper ett storspel som exklusivt', en: '{rival} buys a big game as an exclusive' },
    { sv: 'Förlaget bakom en stor serie har skrivit på för {rplat} och ingen annan plattform. Era kunder suckar, deras jublar.', en: 'The publisher behind a big series has signed for {rplat} and no other platform. Your customers sigh, theirs cheer.' },
    [C('Bjud över', 'Outbid them', { rev: -0.2, hwBase: 0.03, hwRep: 2, war: -5, res: R('Ni lägger ett bud som förlaget inte kan tacka nej till. Spelet kommer till er plattform också.', 'You make an offer the publisher cannot refuse. The game comes to your platform too.') }, 'Dyrt, men ni får spelet', 'Costly, but you get the game'),
      C('Svara med ett eget storspel', 'Answer with your own big game', { rev: -0.1, hypeNext: 12, war: -2, res: R('Ni lovar ett eget exklusivt spel. Förväntan stiger.', 'You promise your own exclusive game. Buzz rises.') }, 'Mer förväntan på nästa spel', 'More buzz for the next game'),
      C('Låt dem', 'Let them have it', { hwBase: -0.04, war: 4, res: R('Ni låter dem ha det. Några spelare byter plattform för spelets skull.', 'You let them have it. Some players switch platform for the game.') })],
    ['opp', 'plat']),
  E('war_fanwar', 0.9, (G) => !!platOf(G) && !!oppFor(G, platOf(G)) && G.fans >= 500,
    { sv: 'Konsolkriget når fansen', en: 'The console war reaches the fans' },
    { sv: 'Forumen har delat sig i två läger: de som älskar {prod} och de som svär vid {rplat}. {rival} häller bensin på elden med sina annonser.', en: 'The forums have split into two camps: those who love {prod} and those who swear by {rplat}. {rival} pours petrol on the fire with its ads.' },
    [C('Ta striden på nätet', 'Fight it out online', { rand: [[0.55, { fansRel: 0.03, hwRep: 3, war: 4, res: R('Ni vinner debatten och fansen jublar.', 'You win the debate and the fans cheer.') }], [0.45, { fansRel: -0.03, war: 6, res: R('Ett skämt flyger åt fel håll och blir en egen nyhet.', 'A joke flies the wrong way and becomes a story of its own.') }]] }, 'Kan ge fans, kan slå fel', 'Can win fans, can backfire'),
      C('Håll er över det', 'Stay above it', { fansRel: 0.005, war: -4, res: R('Ni svarar inte. Det blåser över och många tycker att det var klokt.', 'You do not answer. It blows over and many think it was wise.') }),
      C('Gör en rolig reklam', 'Make a funny ad', { rev: -0.05, fansRel: 0.02, war: -2, res: R('Reklamen om rivalens fans delas överallt.', 'The ad about the rival\'s fans is shared everywhere.') })],
    ['opp', 'plat']),
  // ── Patentstriderna ──
  E('war_patent_sue', 1, (G) => !!archOf(G) && !!oppFor(G, archOf(G)) && !licensed(G),
    { sv: '{rival} stämmer er för patentintrång', en: '{rival} sues you for patent infringement' },
    { sv: '{rival} hävdar att {prod} bryter mot ett av deras patent. Advokaterna vill ha ett svar i dag.', en: '{rival} claims that {prod} breaks one of their patents. The lawyers want an answer today.' },
    [C('Förlik', 'Settle', { hwRev: -0.01, war: -4, res: R('Ni betalar och skakar hand. Ärendet är stängt.', 'You pay and shake hands. The case is closed.') }, 'Billigt och tryggt', 'Cheap and safe'),
      C('Gå till rättegång', 'Go to trial', { rand: [[0.5, { hwRep: 5, war: -8, res: R('Domstolen går på er linje. Branschen noterar det.', 'The court sides with you. The industry takes note.') }], [0.5, { hwRev: -0.04, hwRep: -4, war: 4, res: R('Ni förlorar och måste betala dyrt.', 'You lose and have to pay dearly.') }]] }, 'Kan ge mycket, kan kosta mycket', 'Can gain a lot, can cost a lot'),
      C('Stäm tillbaka', 'Sue back', { hwRev: -0.005, rand: [[0.4, { hwRev: 0.02, hwRep: 6, war: -10, res: R('Er motstämning träffar. {rival} drar tillbaka allt och betalar er.', 'Your counter-suit hits home. {rival} withdraws everything and pays you.') }], [0.6, { hwRev: -0.03, war: 6, res: R('Motstämningen faller platt och kostar er dyrt.', 'The counter-suit falls flat and costs you dearly.') }]] }, 'Dyrt, men kan vända det', 'Costly, but can turn it around')],
    ['opp', 'arch']),
  E('war_patent_license', 0.7, (G) => !!archOf(G) && !!oppFor(G, archOf(G)) && !licensed(G) && !!G.hwwar && G.hwwar.heat >= 25,
    { sv: '{rival} erbjuder en korslicens', en: '{rival} offers a cross-license' },
    { sv: 'I stället för att mötas i rätten vill {rival} byta licenser: ni får använda varandras patent och slipper stämningar i tre år.', en: 'Instead of meeting in court {rival} wants to swap licenses: you may use each other\'s patents and avoid lawsuits for three years.' },
    [C('Skriv på', 'Sign it', { hwRev: -0.015, hwLic: 144, war: -10, res: R('Ni skriver på. Patentkrigen tystnar för en tid.', 'You sign. The patent war goes quiet for a while.') }, 'Skyddar mot stämningar i tre år', 'Protects against lawsuits for three years'),
      C('Tacka nej', 'Decline', { war: 3, res: R('Ni tackar nej. {rival} muttrar och går vidare.', 'You decline. {rival} grumbles and moves on.') })],
    ['opp', 'arch']),
  // ── Komponentbristen ──
  E('war_short', 0.8, (G) => !!supOf(G),
    { sv: 'Komponentbrist hos {partner}', en: 'Component shortage at {partner}' },
    { sv: 'Det är kris på marknaden för komponenter och {partner} kan bara leverera en del av det ni beställt. Köerna växer.', en: 'There is a crisis in the component market and {partner} can only deliver part of what you ordered. The queues are growing.' },
    [C('Betala för förtur', 'Pay for priority', { rev: -0.08, hwShort: [10, 0.8], hwRep: 1, res: R('Ni betalar extra och står först i kön. Leveranserna skär bara lite.', 'You pay extra and stand first in line. Deliveries drop only a little.') }, 'Dyrt, men leveranserna fortsätter', 'Costly, but deliveries continue'),
      C('Vänta ut det', 'Ride it out', { hwShort: [14, 0.5], hwRep: -2, res: R('Ni väntar. Hyllorna blir glesa under några veckor.', 'You wait. The shelves get thin for a few weeks.') }, 'Gratis, men ni säljer mindre', 'Free, but you sell less'),
      C('Köp lager på spotmarknaden', 'Buy stock on the spot market', { rev: -0.15, hwShort: [4, 0.9], res: R('Ni köper till skyhöga priser, men hyllorna håller sig fulla.', 'You buy at sky-high prices, but the shelves stay full.') }, 'Mycket dyrt, kortare brist', 'Very costly, shorter shortage')],
    ['partner']),
  E('war_fire', 0.35, (G) => !!supOf(G),
    { sv: 'Brand hos {partner}', en: 'Fire at {partner}' },
    { sv: 'Det brinner i {partner}s fabrik. Ingen har kommit till skada, men produktionen står nästan stilla.', en: 'There is a fire at {partner}\'s factory. Nobody was hurt, but production is almost at a standstill.' },
    [C('Skicka egen personal', 'Send your own people', { payroll: -0.2, hwShort: [4, 0.4], res: R('Teamet åker dit och hjälper till med bygget. Produktionen är igång snabbare.', 'The team goes there to help rebuild. Production is back sooner.') }, 'Kostar en lön, kortare stopp', 'Costs a salary, shorter stop'),
      C('Vänta', 'Wait', { hwShort: [10, 0.15], hwRep: -3, res: R('Ni väntar på besked. Leveranserna uteblir i veckor.', 'You wait for news. Deliveries fail to come for weeks.') }),
      C('Flytta beställningarna', 'Move the orders', { rev: -0.1, hwShort: [3, 0.7], hwRep: -2, res: R('Ni flyttar beställningarna till andra fabriker. Det blir dyrt och rörigt, men det går.', 'You move the orders to other factories. It is costly and messy, but it works.') }, 'Dyrt, men kort avbrott', 'Costly, but a short break')],
    ['partner']),
];
