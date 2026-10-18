// Recensenter och recensionstexter. Mallarna fylls med {aGenre} {genreComp} {genres} {topic} {over} {under} {scopeAdj} (se reviewTexts).
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

// Rubriker per poängnivå. Varje recensent får en egen rad (stabil per spel, men varierar mellan spel).
export const HEADLINES = [
  { min: 9.5, sv: ['Ett mästerverk.', 'Spelhistoria skrivs här.', 'Sluta läsa, spela det här.', 'Perfektion, helt enkelt.', 'Årets spel, utan tvekan.', 'Det här kommer man prata om i åratal.'],
    en: ['A masterpiece.', 'Gaming history is made here.', 'Stop reading and go play it.', 'Simply perfection.', 'Game of the year, no question.', 'People will talk about this for years.'] },
  { min: 8.5, sv: ['Briljant och svårt att lägga ifrån sig.', 'Ett toppspel.', 'En ny referenspunkt.', 'Man vill bara ha mer.', 'Ett av årets bästa.', 'Studion har överträffat sig själv.', 'Vi spelade tills solen gick upp.', 'Ett självklart köp.'],
    en: ['Brilliant and impossible to put down.', 'A top-tier game.', 'A new benchmark.', 'You will want more.', 'One of the best this year.', 'The studio has outdone itself.', 'We played until the sun came up.', 'An easy buy.'] },
  { min: 7.5, sv: ['Riktigt bra, med små skavanker.', 'Gedigen underhållning.', 'Starkt jobbat av studion.', 'Ett spel att räkna med.', 'Väl värt pengarna.', 'Mer bra än dåligt, mycket mer.', 'Studion är på rätt väg.', 'Lätt att rekommendera.'],
    en: ['Really good, with small blemishes.', 'Solid entertainment.', 'Strong work from the studio.', 'A game to reckon with.', 'Well worth the money.', 'More good than bad, a lot more.', 'The studio is on the right track.', 'Easy to recommend.'] },
  { min: 6.5, sv: ['Helt okej, men lätt att glömma.', 'Fungerar, men utan gnista.', 'Bra idéer i halvdant skick.', 'Tillräckligt för en lördagskväll.', 'Trevligt, men inte mer.', 'Godkänt med marginal.', 'Ett stabilt mellanmål.', 'Gott hantverk utan överraskningar.'],
    en: ['Perfectly okay, but quickly forgotten.', 'It works, but there is no spark.', 'Good ideas in a half-done state.', 'Enough for a Saturday night.', 'Pleasant, but no more.', 'A comfortable pass.', 'A solid snack, not a meal.', 'Good craft without surprises.'] },
  { min: 5.0, sv: ['Medelmåttigt. Det finns bättre sätt att spendera pengarna.', 'Potential som aldrig riktigt slår rot.', 'Varken fågel eller fisk.', 'Inget att skriva hem om.', 'Halvvägs till något bra.', 'Det fanns en bra idé här någonstans.'],
    en: ['Mediocre. There are better ways to spend your money.', 'Potential that never quite takes root.', 'Neither fish nor fowl.', 'Nothing to write home about.', 'Halfway to something good.', 'There was a good idea in here somewhere.'] },
  { min: 3.5, sv: ['Frustrerande och ofärdigt.', 'Svårt att rekommendera.', 'Det här borde ha fått mer tid.', 'Ett steg i fel riktning.', 'Mer frustration än nöje.', 'Vänta på reapriset.'],
    en: ['Frustrating and unfinished.', 'Hard to recommend.', 'This needed more time in the oven.', 'A step in the wrong direction.', 'More frustration than fun.', 'Wait for the bargain bin.'] },
  { min: 0, sv: ['Katastrof. Rör inte.', 'Vi hittar inte ord. Jo: nej.', 'Ett misstag från början till slut.', 'Kräv pengarna tillbaka.', 'Ett lågvattenmärke.', 'Vi vill ha de timmarna tillbaka.'],
    en: ['A disaster. Do not touch.', 'We are lost for words. Except: no.', 'A mistake from start to finish.', 'Demand a refund.', 'A new low.', 'We want those hours back.'] },
];

// Böjda former för recensionsmallarna, så att det blir "ett rollspel" och "an RPG" i stället för "ett Rollspel-spel" och "a RPG game".
// {aGenre} = med obestämd artikel, {genreComp} = förled/adjektiv ("rollspels" + "upplevelsen", "RPG experience"),
// {genres} = genren i allmänhet ("fans av rollspel", "fans of RPGs"). {topic} skrivs med liten bokstav utom egennamn.
export const GENRE_FORMS = {
  action: { sv: { a: 'ett actionspel', comp: 'action', pl: 'action' }, en: { a: 'an action game', comp: 'action', pl: 'action games' } },
  adventure: { sv: { a: 'ett äventyrsspel', comp: 'äventyrs', pl: 'äventyrsspel' }, en: { a: 'an adventure game', comp: 'adventure', pl: 'adventure games' } },
  rpg: { sv: { a: 'ett rollspel', comp: 'rollspels', pl: 'rollspel' }, en: { a: 'an RPG', comp: 'RPG', pl: 'RPGs' } },
  strategy: { sv: { a: 'ett strategispel', comp: 'strategi', pl: 'strategispel' }, en: { a: 'a strategy game', comp: 'strategy', pl: 'strategy games' } },
  simulation: { sv: { a: 'ett simuleringsspel', comp: 'simulerings', pl: 'simuleringsspel' }, en: { a: 'a simulation', comp: 'simulation', pl: 'simulations' } },
  casual: { sv: { a: 'ett casualspel', comp: 'casual', pl: 'casualspel' }, en: { a: 'a casual game', comp: 'casual', pl: 'casual games' } },
  shooter: { sv: { a: 'ett skjutspel', comp: 'skjutspels', pl: 'skjutspel' }, en: { a: 'a shooter', comp: 'shooter', pl: 'shooters' } },
  racing: { sv: { a: 'ett racingspel', comp: 'racing', pl: 'racingspel' }, en: { a: 'a racing game', comp: 'racing', pl: 'racing games' } },
};
// Teman som behåller stor bokstav mitt i en mening
export const TOPIC_PROPER = { sv: ['Vilda västern'], en: ['Wild West'] };
// Storleken som adjektiv till "spel" ({scopeAdj})
export const SCOPE_ADJ = { small: { sv: 'litet', en: 'small' }, medium: { sv: 'mellanstort', en: 'mid-sized' }, large: { sv: 'stort', en: 'big' }, aaa: { sv: 'jättestort', en: 'huge' } };

// Detaljrader per flagga. {+} = positiv, {-} = negativ. Fem rader per pool så att recensenterna sällan upprepar sig.
export const DETAILS = {
  bugs: {
    '-': { sv: ['Buggarna förstör upplevelsen. Spelet kraschade tre gånger under testet.', 'Det kryllar av fel. Vem testade det här?', 'Ett spel som kräver tålamod, och en patch.', 'Vi tappade sparfilen två gånger. Det förlåter vi inte.', 'Figurer fastnar i väggar och menyer hänger sig.'],
      en: ['The bugs ruin it: it crashed three times in our test.', 'Riddled with errors. Who tested this?', 'A game that demands patience, and a patch.', 'We lost our save twice. We will not forgive that.', 'Characters get stuck in walls and menus freeze.'] },
    '+': { sv: ['Imponerande stabilt, nästan helt buggfritt.', 'Polerat och pålitligt.', 'Inte en enda krasch på hela testet.', 'Här har någon testat ordentligt.', 'Allt fungerar precis som det ska.'],
      en: ['Impressively stable, almost bug-free.', 'Polished and dependable.', 'Not a single crash in our whole test.', 'Someone clearly tested this properly.', 'Everything works exactly as it should.'] },
  },
  tech: {
    '-': { sv: ['Tekniken känns ålderdomlig och hackig.', 'Det ser ut och rör sig som förra generationen.', 'Motorn gnisslar.', 'Bilden hackar så fort det händer något.', 'Tekniskt ligger det flera år efter konkurrenterna.'],
      en: ['The tech feels dated and choppy.', 'It looks and moves like last generation.', 'The engine creaks.', 'The frame rate stutters the moment anything happens.', 'Technically it trails the competition by years.'] },
    '+': { sv: ['Tekniken är i framkant, snygg och snabb.', 'Ett tekniskt kraftprov.', 'Oväntat smidigt och vackert.', 'Vi visste inte att hårdvaran klarade det här.', 'Snabba laddtider och stadig bild hela vägen.'],
      en: ['Cutting-edge tech, smooth and quick.', 'A technical tour de force.', 'Unexpectedly slick and beautiful.', 'We did not know the hardware could do this.', 'Fast loading and a steady frame rate all the way.'] },
  },
  design: {
    '-': { sv: ['Designen är tunn. Det saknas idéer.', 'Spelmekaniken är enformig.', 'Man förstår aldrig riktigt vad man ska göra.', 'Efter en timme har man sett allt.', 'Idéerna är lånade och halvfärdiga.'],
      en: ['The design is thin. Ideas are missing.', 'The mechanics are repetitive.', 'You never quite know what you are meant to do.', 'After an hour you have seen it all.', 'The ideas are borrowed and half-finished.'] },
    '+': { sv: ['Genomtänkt design som belönar nyfikenhet.', 'Smarta idéer överallt.', 'Spelmekaniken sitter som en smäck.', 'Varje ny nivå bjuder på något nytt.', 'Svårt att sluta, lätt att börja om.'],
      en: ['Thoughtful design that rewards curiosity.', 'Smart ideas everywhere.', 'The mechanics are spot-on.', 'Every new level brings something fresh.', 'Hard to stop, easy to start over.'] },
  },
  compat: {
    '-': { sv: ['{topic} och {genres} är en udda kombination som aldrig riktigt funkar.', 'Temat {topic} passar dåligt i {aGenre}.', 'Vi förstår inte varför någon gjorde {topic} till {aGenre}.', 'Kombinationen {topic} och {genres} skaver hela vägen.', '{topic} som {genres}? Det borde ha stannat på ritbordet.'],
      en: ['{topic} and {genreComp} is an odd mix that never quite clicks.', 'The {topic} theme sits awkwardly in {aGenre}.', 'Who decided {topic} needed to be {aGenre}?', 'The mix of {topic} and {genreComp} grinds all the way.', '{topic} as {aGenre}? That should have stayed on the drawing board.'] },
    '+': { sv: ['{topic} som {genres} är en fullträff.', 'Temat {topic} lyfter hela {genreComp}upplevelsen.', 'Perfekt match mellan {topic} och {genres}.', 'Det känns självklart att göra {topic} till {aGenre}.', '{topic} och {genres} hör ihop, och det märks.'],
      en: ['{topic} as {aGenre} is a perfect fit.', 'The {topic} theme lifts the whole {genreComp} experience.', 'A perfect match of {topic} and {genreComp}.', 'Turning {topic} into {aGenre} feels obvious in hindsight.', '{topic} and {genreComp} belong together, and it shows.'] },
  },
  focus: {
    '-': { sv: ['Fokus hamnade snett: för mycket {over}, för lite {under}.', 'Prioriteringarna känns märkliga. Mer {under} hade hjälpt.', '{aGenre} behöver mer {under} än så här.', 'Tiden lades på {over} i stället för {under}.', 'Man märker att {under} fick stå tillbaka.'],
      en: ['The focus is off: too much {over}, too little {under}.', 'The priorities feel strange. More {under} would have helped.', '{aGenre} needs more {under} than this.', 'The time went into {over} instead of {under}.', 'You can tell {under} took a back seat.'] },
    '+': { sv: ['Alla delar drar åt samma håll, en tydlig vision.', 'Prioriteringarna sitter helt rätt för {aGenre}.', 'Studion vet precis vad {aGenre} behöver.', 'Tiden har lagts där den gör mest nytta.', 'Varje del får precis så mycket plats som den behöver.'],
      en: ['Every part pulls the same way, a clear vision.', 'The priorities are exactly right for {aGenre}.', 'The studio knows exactly what {aGenre} needs.', 'The time went exactly where it matters most.', 'Every part gets just the room it needs.'] },
  },
  audience: {
    '-': { sv: ['Det är oklart vem spelet är gjort för.', 'Målgruppen känns fel för {topic}.', 'Spelet pratar över huvudet på sin publik.', 'Fel spel till fel spelare.', 'Marknadsföringen och innehållet drar åt olika håll.'],
      en: ['It is unclear who this game is for.', 'The audience feels wrong for {topic}.', 'The game talks past its own audience.', 'The wrong game for the wrong players.', 'The marketing and the content pull in different directions.'] },
    '+': { sv: ['Träffar sin målgrupp mitt i prick.', 'Vet exakt vem det är gjort för.', 'Precis vad publiken har väntat på.', 'Rätt spel till rätt spelare.', 'Målgruppen kommer att älska det här.'],
      en: ['Hits its audience dead center.', 'Knows exactly who it is for.', 'Exactly what the audience has been waiting for.', 'The right game for the right players.', 'Its audience is going to love this.'] },
  },
  platform: {
    '-': { sv: ['{genres} på den här plattformen känns trångt.', 'Fans av {genres} trivs inte på den här plattformen.', 'Kontrollerna kämpar emot {aGenre} hela vägen.', 'Plattformen står i vägen för spelet.', 'Fel maskin för {aGenre}.'],
      en: ['{genres} on this platform feel cramped.', 'Fans of {genres} will not feel at home on this platform.', 'The controls fight {aGenre} every step of the way.', 'The platform gets in the way of the game.', 'The wrong machine for {aGenre}.'] },
    '+': { sv: ['Plattformen och spelet passar varandra perfekt.', 'Rätt maskin för {aGenre}.', 'Plattformen lyfter spelet till nya höjder.', 'Kontrollerna känns gjorda för just det här.', 'Här får plattformen visa vad den klarar.'],
      en: ['The platform and the game are made for each other.', 'The right machine for {aGenre}.', 'The platform lifts the game to new heights.', 'The controls feel made for exactly this.', 'Here the platform gets to show what it can do.'] },
  },
  // Teamet var stort för storleken (+) eller för litet (−)
  scope: {
    '-': { sv: ['Ambitionen är större än genomförandet.', 'Spelet känns uppstyckat och ofärdigt för sin storlek.', 'Stora löften, halvfärdigt resultat.', 'Teamet har tagit sig vatten över huvudet.', 'Det märks att tiden inte räckte till allt.'],
      en: ['The ambition outstrips the execution.', 'It feels patchy and unfinished for its size.', 'Big promises, half-finished result.', 'The team bit off more than it could chew.', 'You can tell there was not enough time for everything.'] },
    '+': { sv: ['Allt känns genomarbetat in i minsta detalj.', 'Varje hörn är fyllt med detaljer.', 'Det märks att teamet hade gott om tid.', 'Genomarbetat från början till slut.', 'Inget känns hastigt gjort.'],
      en: ['Everything feels worked through down to the last detail.', 'Every corner is packed with detail.', 'You can tell the team had plenty of time.', 'Crafted from start to finish.', 'Nothing feels rushed.'] },
  },
  // Storleken satte betygstaket (räknas fram i reviewTexts, ingen flagga i simuleringen)
  cap: {
    '+': { sv: ['Välgjort, men det är ett {scopeAdj} spel och det märks.', 'Mer än så här går inte att få ut av ett {scopeAdj} spel.', 'Studion har mer att ge än formatet tillåter.', 'Nu vill vi se studion satsa större.', 'Snyggt, men i minsta laget.'],
      en: ['Well made, but it is a {scopeAdj} game and it shows.', 'You cannot get much more out of a {scopeAdj} game than this.', 'The studio has more to give than the format allows.', 'Now we want to see the studio aim bigger.', 'Nice, but on the small side.'] },
  },
  fresh: {
    '-': { sv: ['Det här har vi sett förut. Och förut. Och förut.', 'Studion upprepar sig.', 'Samma recept som förra gången, bara tunnare.', 'Känns som en uppföljare ingen bad om.', 'Vi har spelat det här förut, under ett annat namn.'],
      en: ['We have seen this before. And before. And before.', 'The studio is repeating itself.', 'Same recipe as last time, only thinner.', 'Feels like a sequel nobody asked for.', 'We have played this before, under another name.'] },
    '+': { sv: ['Fräscht och oväntat.', 'Något helt nytt från studion.', 'Vågat och annorlunda.', 'Det här har vi inte sett förut.', 'En frisk fläkt i genren.'],
      en: ['Fresh and unexpected.', 'Something entirely new from the studio.', 'Bold and different.', 'We have not seen this before.', 'A breath of fresh air for the genre.'] },
  },
};

// Reservrader per recensent när ingen flagga passar betyget (+ för bra betyg, − för svaga)
export const NEUTRAL = {
  bitbyte: {
    '+': { sv: ['Tekniskt gör det precis vad det ska.', 'Stabilt och okomplicerat under huven.', 'Inget tekniskt att anmärka på.', 'Rent och prydligt programmerat.', 'Laddar snabbt och flyter på.'], en: ['Technically it does exactly what it should.', 'Stable and uncomplicated under the hood.', 'Nothing technical to complain about.', 'Clean, tidy code by the look of it.', 'Loads fast and runs smoothly.'] },
    '-': { sv: ['Tekniken räcker inte för att rädda helheten.', 'Under huven finns inget som sticker ut.', 'Det fungerar, men vi är inte imponerade.', 'Tekniskt godkänt, men inte mer.', 'Vi hade väntat oss mer av hårdvaran.'], en: ['The tech is not enough to save the whole.', 'Nothing under the hood stands out.', 'It works, but we are not impressed.', 'Technically a pass, but no more.', 'We expected more from the hardware.'] },
  },
  gazette: {
    '+': { sv: ['Ett tryggt val för den som gillar {genres}.', 'Precis vad man väntar sig av {aGenre} om {topic}.', 'Gediget hantverk rakt igenom.', 'Våra läsare kommer att gilla det här.', 'Ett bra köp för pengarna.'], en: ['A safe pick for anyone who likes {genres}.', 'Exactly what you expect from {aGenre} about {topic}.', 'Solid craft all the way through.', 'Our readers are going to like this.', 'Good value for the money.'] },
    '-': { sv: ['Det finns bättre alternativ för den som gillar {genres}.', 'Varken bra eller dåligt, bara blekt.', 'Svårt att se vem som ska köpa det här.', 'Våra läsare förtjänar bättre.', 'Vänta hellre på nästa spel från studion.'], en: ['Fans of {genres} have better options.', 'Neither good nor bad, just bland.', 'Hard to see who should buy this.', 'Our readers deserve better.', 'Better to wait for the studio\'s next game.'] },
  },
  pulse: {
    '+': { sv: ['Charmigt, och med hjärtat på rätt ställe.', 'Det finns en värme här som är svår att inte gilla.', 'Världen känns levande.', 'Figurerna stannar kvar i minnet.', 'Ett spel med egen personlighet.'], en: ['Charming, with its heart in the right place.', 'There is a warmth here that is hard not to like.', 'The world feels alive.', 'The characters stay with you.', 'A game with a personality of its own.'] },
    '-': { sv: ['Vi väntade på en gnista som aldrig kom.', 'Världen känns tom och livlös.', 'Inget här får hjärtat att slå fortare.', 'Figurerna är papp, rakt igenom.', 'Ingen själ, bara mekanik.'], en: ['We waited for a spark that never came.', 'The world feels empty and lifeless.', 'Nothing here makes the heart beat faster.', 'The characters are cardboard, through and through.', 'No soul, just mechanics.'] },
  },
  critic: {
    '+': { sv: ['Vi letade efter fel. Vi hittade inte många.', 'Motvilligt: det här är bra.', 'Ett av få spel i år som vi faktiskt spelade klart.', 'Vi hatar att säga det, men vi hade roligt.', 'Irriterande nog finns det lite att klaga på.'], en: ['We looked for flaws. We did not find many.', 'Grudgingly: this is good.', 'One of the few games this year we actually finished.', 'We hate to say it, but we had fun.', 'Annoyingly, there is little to complain about.'] },
    '-': { sv: ['Inget vi kommer att minnas om ett år.', 'Kompetent och ungefär lika spännande som en blankett.', 'Vi somnade två gånger. Vid skärmen.', 'Vi har sett bättre demoversioner.', 'Förpackningen fungerar utmärkt som underlägg.', 'Det här är spelets motsvarighet till en väntsal.', 'Studion kan bättre. Hoppas vi.'], en: ['Nothing we will remember in a year.', 'Competent, and about as exciting as a tax form.', 'We fell asleep twice. At the screen.', 'We have seen better demos.', 'The box makes an excellent coaster.', 'The gaming equivalent of a waiting room.', 'The studio can do better. We hope.'] },
  },
};

// Insiktsrader i rapporten (förklarar poängen för spelaren).
export const FLAVOR_NEWS_HIT = {
  sv: ['{studio} har fått en succé med {title}!', 'Kassaregistren ringer: {title} flyger ut ur butikerna.', '{title} är samtalsämnet i hela branschen.'],
  en: ['{studio} has a hit with {title}!', 'Cash registers are ringing: {title} is flying off the shelves.', '{title} is the talk of the industry.'],
};
