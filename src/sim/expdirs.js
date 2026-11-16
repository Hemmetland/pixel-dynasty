// Expansionens riktning: det som teamet föreslår på mötet (se expmeet.js) och spelaren väljer mellan. Varje riktning är en
// liten tabell med siffror, så att både bygget (autoteam.js, dev.js) och släppet (releaseExpansion i live.js) läser samma värden.
// Ingen slump här: vilka förslag ett team lägger fram avgörs av en hash och av vad teamet är bra på.
//   step    ett steg större (+1) eller mindre (−1) expansion än teamet annars hade valt
//   cost    budgeten gånger detta (utöver att en större expansion kostar mer)
//   bug     buggfaktor under bygget (under 1 = färre buggar)
//   buy     andel av spelarna som köper expansionen, plus eller minus (0,08 = åtta procentenheter)
//   pot     så mycket mer spelare spelet kan locka, som tillägg till det vanliga (0,06 = sex procent)
//   reno    så många veckors ålder spelet slipper (nya system gör att det åldras långsammare)
//   shield  så många veckor konkurrentens onlinespel drar hälften så många spelare
//   talk    Snack (procent i veckan) som beskedet om expansionen ger under bygget
//   skill   vad teamet behöver vara bra på för att föreslå den
//   tags    raderna som visas i mötesrutan (strängar exd.tag.*)
export const EXP_DIRS = {
  more: { step: 0, cost: 1, bug: 1, buy: 0, pot: 0, reno: 0, shield: 0, talk: 0.05, skill: null, tags: ['safe'] },
  world: { step: 1, cost: 1.1, bug: 1.12, buy: 0.08, pot: 0.06, reno: 0, shield: 0, talk: 0.3, skill: 'design', tags: ['big', 'buyUp', 'talk', 'bugUp'] },
  systems: { step: 0, cost: 1.05, bug: 0.78, buy: 0, pot: 0.02, reno: 10, shield: 0, talk: 0.1, skill: 'tech', tags: ['bugDown', 'age'] },
  rival: { step: 0, cost: 1, bug: 1, buy: 0.03, pot: 0.03, reno: 0, shield: 26, talk: 0.2, skill: 'research', tags: ['shield', 'talk'], needs: 'rival' },
  fast: { step: -1, cost: 0.9, bug: 1, buy: -0.06, pot: 0, reno: 0, shield: 0, talk: 0, skill: 'speed', tags: ['small', 'cheap', 'buyDown'] },
};
export const DIR_IDS = Object.keys(EXP_DIRS);
export const dirOf = (id) => (id && EXP_DIRS[id]) || null;
