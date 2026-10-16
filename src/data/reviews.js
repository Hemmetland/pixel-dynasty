// Recensenter och recensionstexter. Bokstäver {genre} {topic} {cat} fylls i.
export const REVIEWERS = [
  { id: 'bitbyte', color: '#4aa8ff', glyph: 'rv_tech', strict: -0.1, tech: 0.55, design: -0.15, bug: 1.0,
    name: { sv: 'Bit & Byte', en: 'Bit & Byte' }, outlet: { sv: 'Teknikmagasinet', en: 'The Tech Monthly' } },
  { id: 'gazette', color: '#f6b84a', glyph: 'rv_gazette', strict: 0, tech: 0.1, design: 0.1, bug: 1.0,
    name: { sv: 'Spelbladet', en: 'The Gamers Gazette' }, outlet: { sv: 'Sveriges största spelmagasin', en: 'Biggest gaming mag around' } },
  { id: 'pulse', color: '#ff8fd2', glyph: 'rv_pulse', strict: 0.3, tech: -0.2, design: 0.55, bug: 0.6,
    name: { sv: 'Pixelpulsen', en: 'Pixel Pulse' }, outlet: { sv: 'Berättelserna först', en: 'Stories first' } },
  { id: 'critic', color: '#ff6b5c', glyph: 'rv_critic', strict: -0.6, tech: 0.1, design: 0.1, bug: 1.9,
    name: { sv: 'Kritikerhörnan', en: 'Critic Corner' }, outlet: { sv: 'Aldrig nöjd', en: 'Never satisfied' } },
];
export const REVIEWER = Object.fromEntries(REVIEWERS.map((r) => [r.id, r]));

// Rubriker per poängnivå (valfri slump bland varianter).
export const HEADLINES = [
  { min: 9.5, sv: ['Ett mästerverk.', 'Spelhistoria skrivs här.', 'Sluta läsa, spela det här.', 'Perfektion på kassett.'],
    en: ['A masterpiece.', 'Gaming history is made here.', 'Stop reading and go play it.', 'Perfection, pressed to cartridge.'] },
  { min: 8.5, sv: ['Briljant och svårt att lägga ifrån sig.', 'Ett toppspel.', 'En ny referenspunkt.', 'Man vill bara ha mer.'],
    en: ['Brilliant and impossible to put down.', 'A top-tier game.', 'A new benchmark.', 'You will want more.'] },
  { min: 7.5, sv: ['Riktigt bra, med små skavanker.', 'Gedigen underhållning.', 'Starkt jobbat av studion.', 'Ett spel att räkna med.'],
    en: ['Really good, with small blemishes.', 'Solid entertainment.', 'Strong work from the studio.', 'A game to reckon with.'] },
  { min: 6.5, sv: ['Helt okej, men glömmer man snabbt.', 'Fungerar, men utan gnista.', 'Bra idéer i halvdant skick.', 'Tillräckligt för en lördagskväll.'],
    en: ['Perfectly okay, but quickly forgotten.', 'It works, but there is no spark.', 'Good ideas in a half-done state.', 'Enough for a Saturday night.'] },
  { min: 5.0, sv: ['Medelmåttigt. Det finns bättre sätt att spendera pengarna.', 'Potential som aldrig riktigt slår rot.', 'Varken fågel eller fisk.', 'Inget att skriva hem om.'],
    en: ['Mediocre. There are better ways to spend your money.', 'Potential that never quite takes root.', 'Neither fish nor fowl.', 'Nothing to write home about.'] },
  { min: 3.5, sv: ['Frustrerande och ofärdigt.', 'Svårt att rekommendera.', 'Det här borde ha fått mer tid.', 'Ett steg i fel riktning.'],
    en: ['Frustrating and unfinished.', 'Hard to recommend.', 'This needed more time in the oven.', 'A step in the wrong direction.'] },
  { min: 0, sv: ['Katastrof. Rör inte.', 'Vi hittar inte ord. Jo: nej.', 'Ett misstag på kassett.', 'Kräv pengarna tillbaka.'],
    en: ['A disaster. Do not touch.', 'We are lost for words. Except: no.', 'A mistake on cartridge.', 'Demand a refund.'] },
];

// Detaljrader per flagga. {+} = positiv, {-} = negativ.
export const DETAILS = {
  bugs: {
    '-': { sv: ['Buggarna förstör upplevelsen, den kraschade tre gånger under testet.', 'Det kryllar av fel. Vem testade det här?', 'Ett spel som kräver tålamod, och en patch.'],
      en: ['The bugs ruin it, it crashed three times in our test.', 'Riddled with errors. Who tested this?', 'A game that demands patience, and a patch.'] },
    '+': { sv: ['Imponerande stabilt, nästan helt buggfritt.', 'Polerat och pålitligt.'], en: ['Impressively stable, almost bug-free.', 'Polished and dependable.'] },
  },
  tech: {
    '-': { sv: ['Tekniken känns ålderdomlig och hackig.', 'Det ser ut och rör sig som förra generationen.', 'Motorn gnisslar.'],
      en: ['The tech feels dated and choppy.', 'It looks and moves like last generation.', 'The engine creaks.'] },
    '+': { sv: ['Tekniken är i framkant, snygg och snabb.', 'Ett tekniskt kraftprov.', 'Oväntat smidigt och vackert.'],
      en: ['Cutting-edge tech, smooth and quick.', 'A technical tour de force.', 'Unexpectedly slick and beautiful.'] },
  },
  design: {
    '-': { sv: ['Designen är tunn. Det saknas idéer.', 'Spelmekaniken är enformig.', 'Man förstår aldrig riktigt vad man ska göra.'],
      en: ['The design is thin. Ideas are missing.', 'The mechanics are repetitive.', 'You never quite know what you are meant to do.'] },
    '+': { sv: ['Genomtänkt design som belönar nyfikenhet.', 'Smarta idéer överallt.', 'Spelmekaniken sitter som en smäck.'],
      en: ['Thoughtful design that rewards curiosity.', 'Smart ideas everywhere.', 'The mechanics are spot-on.'] },
  },
  compat: {
    '-': { sv: ['{topic} och {genre} är en udda kombination som aldrig riktigt funkar.', 'Temat {topic} passar dåligt i {genre}.', 'Vi förstår inte varför {topic} blev {genre}.'],
      en: ['{topic} and {genre} is an odd mix that never quite clicks.', 'The {topic} theme sits awkwardly in a {genre} game.', 'We do not get why {topic} became {genre}.'] },
    '+': { sv: ['{topic} som {genre} är en fullträff.', 'Temat {topic} lyfter hela {genre}-upplevelsen.', 'Perfekt match mellan {topic} och {genre}.'],
      en: ['{topic} as {genre} is a perfect fit.', 'The {topic} theme lifts the whole {genre} experience.', 'A perfect match of {topic} and {genre}.'] },
  },
  focus: {
    '-': { sv: ['Fokus hamnade snett: för mycket {over}, för lite {under}.', 'Prioriteringarna känns märkliga. Mer {under} hade hjälpt.', 'Ett {genre}-spel behöver mer {under}.'],
      en: ['The focus is off: too much {over}, too little {under}.', 'The priorities feel strange. More {under} would have helped.', 'A {genre} game needs more {under}.'] },
    '+': { sv: ['Alla delar drar åt samma håll, en tydlig vision.', 'Prioriteringarna sitter helt rätt för ett {genre}-spel.'],
      en: ['Every part pulls the same way, a clear vision.', 'The priorities are exactly right for a {genre} game.'] },
  },
  audience: {
    '-': { sv: ['Det är oklart vem spelet är gjort för.', 'Målgruppen känns fel för {topic}.'], en: ['It is unclear who this game is for.', 'The audience feels wrong for {topic}.'] },
    '+': { sv: ['Träffar sin målgrupp mitt i prick.'], en: ['Hits its audience dead center.'] },
  },
  platform: {
    '-': { sv: ['{genre} på den här plattformen känns trångt.', 'Den här plattformen är inte {genre}-spelarnas favorit.'], en: ['{genre} on this platform feels cramped.', 'This platform is not where {genre} fans live.'] },
    '+': { sv: ['Plattformen och {genre} passar varandra perfekt.'], en: ['The platform and {genre} are made for each other.'] },
  },
  scope: {
    '-': { sv: ['Ambitionen är större än genomförandet.', 'Spelet känns uppstyckat och ofärdigt för sin storlek.'], en: ['The ambition outstrips the execution.', 'It feels patchy and unfinished for its size.'] },
    '+': { sv: ['Imponerande omfång och djup.', 'Det här är ett stort spel som faktiskt är färdigt.'], en: ['Impressive scope and depth.', 'A big game that is actually finished.'] },
  },
  fresh: {
    '-': { sv: ['Det här har vi sett förut. Och förut. Och förut.', 'Studion upprepar sig.'], en: ['We have seen this before. And before. And before.', 'The studio is repeating itself.'] },
    '+': { sv: ['Fräscht och oväntat.'], en: ['Fresh and unexpected.'] },
  },
};

// Insiktsrader i rapporten (förklarar poängen för spelaren).
export const FLAVOR_NEWS_HIT = {
  sv: ['{studio} har fått en succé med {title}!', 'Kassaregistren ringer: {title} flyger ut ur butikerna.', '{title} är samtalsämnet i hela branschen.'],
  en: ['{studio} has a hit with {title}!', 'Cash registers are ringing: {title} is flying off the shelves.', '{title} is the talk of the industry.'],
};
