// Butikens temaveckor: två veckor på året då en sorts spel säljer extra i din butik (förutom de två reaveckorna i
// sim/store.js). weeks = [första, sista] veckan på året (0 till 47), lift = hur mycket mer ett passande pc-spel säljer
// den veckan, fit(spelet) = vilka spel som passar. Ett pc-spel som saknar passande spel märker ingenting, så det lönar
// sig att släppa rätt sorts spel i tid.
const has = (g, ...ids) => ids.some((x) => g.genre === x || g.genre2 === x);
const topic = (g, ...ids) => ids.includes(g.topic);

export const STORE_EVENTS = [
  { id: 'indie', weeks: [10, 11], lift: 0.9, ic: 'bulb', fit: (g) => g.scope === 'small',
    name: { sv: 'Indievecka', en: 'Indie Week' },
    desc: { sv: 'Små spel i rampljuset: spel i storleken Liten säljer extra.', en: 'Small games in the spotlight: Small games sell extra.' } },
  { id: 'action', weeks: [16, 17], lift: 0.6, ic: 'fire', fit: (g) => has(g, 'action', 'shooter', 'racing'),
    name: { sv: 'Actionfestivalen', en: 'Action Fest' },
    desc: { sv: 'Action-, skjut- och racingspel säljer extra.', en: 'Action, shooter and racing games sell extra.' } },
  { id: 'quest', weeks: [32, 33], lift: 0.6, ic: 'flag', fit: (g) => has(g, 'rpg', 'adventure', 'strategy'),
    name: { sv: 'Äventyrsveckan', en: 'Quest Week' },
    desc: { sv: 'Rollspel, äventyr och strategi säljer extra.', en: 'RPGs, adventures and strategy games sell extra.' } },
  { id: 'fright', weeks: [40, 41], lift: 1, ic: 'skull', fit: (g) => topic(g, 'horror', 'zombies', 'survival', 'vikings'),
    name: { sv: 'Skräckveckan', en: 'Fright Week' },
    desc: { sv: 'Spel om skräck, zombier och överlevnad säljer extra.', en: 'Games about horror, zombies and survival sell extra.' } },
];
export const EVENT_BY_ID = Object.fromEntries(STORE_EVENTS.map((e) => [e.id, e]));
