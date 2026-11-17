// Folket: personligheterna (se sim/folk.js). Varje medarbetare får en personlighet ur en hash av fröet och sitt id. fr = hur lätt hen
// får vänner (1 = vanligt): det är det enda som personligheten påverkar i spelet, resten är färg i texterna och i personalfönstret.
export const QUIRKS = {
  joker: { name: { sv: 'Skämtaren', en: 'The Joker' }, desc: { sv: 'Får hela rummet att skratta, och får lätt vänner.', en: 'Makes the whole room laugh and makes friends easily.' }, fr: 1.5, ic: 'sparkle' },
  chatty: { name: { sv: 'Pratkvarnen', en: 'The Chatterbox' }, desc: { sv: 'Har alltid något att berätta vid kaffemaskinen.', en: 'Always has something to tell by the coffee machine.' }, fr: 1.8, ic: 'mail' },
  quiet: { name: { sv: 'Den tystlåtne', en: 'The Quiet One' }, desc: { sv: 'Säger lite men hör allt. Det tar tid att lära känna hen.', en: 'Says little but hears everything. Takes time to get to know.' }, fr: 0.5, ic: 'moon' },
  bookworm: { name: { sv: 'Bokmalen', en: 'The Bookworm' }, desc: { sv: 'Läser allt, från manualer till romaner.', en: 'Reads everything, from manuals to novels.' }, fr: 0.8, ic: 'book' },
  gamer: { name: { sv: 'Spelnörden', en: 'The Game Nerd' }, desc: { sv: 'Spelar hela natten och vet allt om gamla klassiker.', en: 'Plays all night and knows every old classic.' }, fr: 1.2, ic: 'gamepad' },
  foodie: { name: { sv: 'Matglada', en: 'The Foodie' }, desc: { sv: 'Vet vilken lunchrestaurang som är bäst, och bjuder gärna med.', en: 'Knows the best lunch place and gladly takes others along.' }, fr: 1.2, ic: 'coffee' },
  runner: { name: { sv: 'Löparen', en: 'The Runner' }, desc: { sv: 'Springer till jobbet och kommer in med röda kinder.', en: 'Runs to work and arrives with red cheeks.' }, fr: 1, ic: 'rocket' },
  coffee: { name: { sv: 'Kaffekoppen', en: 'The Coffee Cup' }, desc: { sv: 'Går inte att prata med före den tredje koppen.', en: 'Cannot be talked to before the third cup.' }, fr: 1.1, ic: 'coffee' },
  early: { name: { sv: 'Morgonpigg', en: 'The Early Bird' }, desc: { sv: 'Är först på plats och sist att klaga.', en: 'First in the door and last to complain.' }, fr: 1, ic: 'sun' },
  nostalgic: { name: { sv: 'Nostalgikern', en: 'The Nostalgic' }, desc: { sv: 'Minns hur allt var bättre förr, med disketter och allt.', en: 'Remembers how everything was better before, floppies and all.' }, fr: 0.9, ic: 'disc' },
};
export const QUIRK_IDS = Object.keys(QUIRKS);
