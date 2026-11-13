// Röster från spelarna: korta repliker som visas i spelets detaljvy och i krönikan efter ett släpp.
// Varje lista finns på svenska och engelska med raderna i samma ordning (rad 2 på svenska = rad 2 på engelska).
// Fälten: {title} spelet, {studio} din studio, {plat} plattformen, {topic} temat (liten bokstav), {aGenre} "ett rollspel",
// {genres} "rollspel", {prev} föregångaren, {base} grundspelet, {rival} konkurrentens spel.
// Raderna är tidlösa (inga ord som bara passar ett årtionde), så att de fungerar från 1980 till 2020.

// Allmänt omdöme efter betyget. mood: 1 = nöjd, 0 = ljum, −1 = missnöjd.
export const FAN_BANDS = [
  { min: 9, mood: 1,
    sv: ['Jag har inte sovit på tre dagar. {title} är värt det.', 'Årets spel. Diskussionen är över.', 'Tio av tio. Jag börjar om från början direkt.', '{studio} har gjort ett mästerverk. Ta mina pengar.', 'Min kompis lånade {title} och har inte hörts av sedan dess.', 'Det här kommer vi att prata om i tjugo år.'],
    en: ['I have not slept in three days. {title} is worth it.', 'Game of the year. Discussion over.', 'Ten out of ten. I am starting over right away.', '{studio} made a masterpiece. Take my money.', 'My friend borrowed {title} and has not been heard from since.', 'We will be talking about this one for twenty years.'] },
  { min: 8, mood: 1,
    sv: ['Riktigt bra. {title} höll mig vaken hela helgen.', 'Det bästa jag har spelat i år.', 'Alla jag känner pratar om {title}.', 'Värt varenda krona.', 'Jag tvivlade, men {title} levererar.', '{studio} vet vad de håller på med.'],
    en: ['Really good. {title} kept me up all weekend.', 'The best thing I have played this year.', 'Everyone I know is talking about {title}.', 'Worth every penny.', 'I had my doubts, but {title} delivers.', '{studio} know what they are doing.'] },
  { min: 6.5, mood: 0,
    sv: ['Helt okej. Inget mästerverk, men jag hade kul.', 'Stabilt hantverk. Jag spelade i alla fall klart det.', 'Bra, men om ett år har jag glömt det.', 'Värt pengarna om man gillar {genres}.', 'Kul så länge det varade.', 'En trevlig helg med {title}. Varken mer eller mindre.'],
    en: ['Decent. No masterpiece, but I had fun.', 'Solid work. I did finish it, at least.', 'Good, but in a year I will have forgotten it.', 'Worth the money if you like {genres}.', 'Fun while it lasted.', 'A pleasant weekend with {title}. Nothing more, nothing less.'] },
  { min: 5, mood: -1,
    sv: ['Jag ville verkligen tycka om {title}.', 'Inte dåligt, bara lite tråkigt.', 'Lånade det av en kompis. Det räckte.', 'Jag hade väntat mig mer av {studio}.', 'Vänta tills det blir billigare.', 'Det finns bättre {genres} att lägga pengarna på.'],
    en: ['I really wanted to like {title}.', 'Not bad, just a little dull.', 'Borrowed it from a friend. That was enough.', 'I expected more from {studio}.', 'Wait until it gets cheaper.', 'There are better {genres} to spend your money on.'] },
  { min: 0, mood: -1,
    sv: ['Jag vill ha pengarna tillbaka.', 'Hur kunde {studio} släppa det här?', 'Jag bytte bort {title} efter en kväll.', 'Min lillebror gillar allt. Han gillade inte det här.', 'Spara pengarna. Köp något annat.', 'Jag orkade tjugo minuter.'],
    en: ['I want my money back.', 'How could {studio} release this?', 'I traded {title} away after one evening.', 'My little brother likes everything. He did not like this.', 'Save your money. Buy something else.', 'I lasted twenty minutes.'] },
];

// En replik om det som stack ut i spelet (samma flaggor som recensenterna använder). '+' = styrka, '-' = svaghet.
export const FAN_FLAGS = {
  compat: {
    '+': { sv: ['{topic} som {aGenre}? Det passar ju perfekt.', 'Temat {topic} är som gjort för {aGenre}.', 'Tema och genre sitter som hand i handske.'],
      en: ['{topic} as {aGenre}? It just works.', 'The {topic} theme is made for {aGenre}.', 'Theme and genre fit like a glove.'] },
    '-': { sv: ['{topic} som {aGenre}? Vem bad om det?', 'Tema och genre drar åt olika håll.', 'Jag förstår inte vem som ville ha {topic} som {aGenre}.'],
      en: ['{topic} as {aGenre}? Who asked for that?', 'Theme and genre pull in different directions.', 'I do not see who wanted {topic} as {aGenre}.'] },
  },
  focus: {
    '+': { sv: ['Man märker att de har lagt tiden på rätt saker.', 'Allt som är viktigt i {aGenre} sitter.', 'De har förstått vad {genres} handlar om.'],
      en: ['You can tell they spent the time on the right things.', 'Everything that matters in {aGenre} is spot on.', 'They understand what {genres} are about.'] },
    '-': { sv: ['Varför lade de så mycket tid på fel saker?', 'Det viktigaste i {aGenre} känns bortglömt.', 'Snyggt paketerat, men kärnan saknas.'],
      en: ['Why did they spend so much time on the wrong things?', 'The most important part of {aGenre} feels forgotten.', 'Nicely wrapped, but the core is missing.'] },
  },
  design: {
    '+': { sv: ['Spelkänslan är fantastisk. En runda till blir alltid tre.', 'Så genomtänkt att jag blir avundsjuk.', 'Varje detalj känns genomarbetad.'],
      en: ['It plays wonderfully. One more go always turns into three.', 'So well thought out it makes me jealous.', 'Every detail feels cared for.'] },
    '-': { sv: ['Idén är bra, men det blir enformigt fort.', 'Själva spelandet känns ofärdigt.', 'Jag tröttnade efter en timme.'],
      en: ['The idea is good, but it gets repetitive fast.', 'The game itself feels unfinished.', 'I was bored within the hour.'] },
  },
  tech: {
    '+': { sv: ['Det snyggaste jag har sett på {plat}.', 'Hur fick de {plat} att klara det här?', 'Flyter som smör. Imponerande teknik.'],
      en: ['The best-looking thing I have seen on {plat}.', 'How did they get {plat} to do this?', 'Smooth as butter. Impressive tech.'] },
    '-': { sv: ['Det ser ut som något från förr.', 'Tekniken hänger inte med.', 'Hackigt och segt. {plat} kan bättre.'],
      en: ['It looks like something from years ago.', 'The tech cannot keep up.', 'Choppy and slow. {plat} can do better.'] },
  },
  bugs: {
    '+': { sv: ['Inte en enda bugg på hela genomspelningen.', 'Skönt med ett spel som bara fungerar.', 'Putsat in i minsta detalj.'],
      en: ['Not a single bug in my whole playthrough.', 'Nice to have a game that simply works.', 'Polished down to the last detail.'] },
    '-': { sv: ['Jag föll genom golvet två gånger första kvällen.', 'Buggarna förstör ett annars lovande spel.', 'Sparfilen försvann. Tack för den.'],
      en: ['I fell through the floor twice on the first evening.', 'The bugs ruin an otherwise promising game.', 'My save vanished. Thanks for that.'] },
  },
  platform: {
    '+': { sv: ['Som gjort för {plat}.', '{aGenre} hör hemma på {plat}.', 'Äntligen något riktigt bra till {plat}.'],
      en: ['Made for {plat}.', '{aGenre} belongs on {plat}.', 'Finally something really good for {plat}.'] },
    '-': { sv: ['Varför släpptes det här till {plat}?', '{aGenre} på {plat}? Fel maskin.', 'Jag hade köpt det till en annan maskin.'],
      en: ['Why was this released for {plat}?', '{aGenre} on {plat}? Wrong machine.', 'I would have bought it on another machine.'] },
  },
  audience: {
    '+': { sv: ['Precis rätt för oss som spelar sånt här.', 'De vet vilka de gör spel för.', 'Träffar sin publik mitt i prick.'],
      en: ['Just right for those of us who play this kind of thing.', 'They know who they are making games for.', 'Hits its audience dead on.'] },
    '-': { sv: ['Vem är det här gjort för egentligen?', 'Fel ton för temat {topic}.', 'Jag tror inte att de vet vilka som spelar {genres}.'],
      en: ['Who is this actually made for?', 'The wrong tone for the {topic} theme.', 'I do not think they know who plays {genres}.'] },
  },
  fresh: {
    '+': { sv: ['Något helt nytt från {studio}. Mer sånt!', 'Jag har aldrig spelat något liknande.', 'Modigt att prova något nytt.'],
      en: ['Something completely new from {studio}. More of this!', 'I have never played anything like it.', 'Brave to try something new.'] },
    '-': { sv: ['{studio} gör samma spel om och om igen.', 'Har jag inte spelat det här redan?', 'Dags för något nytt, {studio}.'],
      en: ['{studio} keep making the same game over and over.', 'Have I not played this already?', 'Time for something new, {studio}.'] },
  },
  sequel: {
    '+': { sv: ['Bättre än {prev} på alla sätt.', 'Så här gör man en uppföljare.', 'Jag älskade {prev}, och det här är ännu bättre.'],
      en: ['Better than {prev} in every way.', 'This is how you make a sequel.', 'I loved {prev}, and this is even better.'] },
    '-': { sv: ['{prev} var bättre.', 'Serien börjar kännas trött.', 'Jag spelar hellre om {prev}.'],
      en: ['{prev} was better.', 'The series is starting to feel tired.', 'I would rather replay {prev}.'] },
  },
  scope: {
    '+': { sv: ['Så mycket spel för pengarna.', 'Man märker hur mycket arbete som ligger bakom.', 'Jag hittar fortfarande nya saker.'],
      en: ['So much game for the money.', 'You can tell how much work went into it.', 'I am still finding new things.'] },
    '-': { sv: ['Tunt. Det tog slut innan det började.', 'Känns som en demo.', 'Var det här allt?'],
      en: ['Thin. It was over before it began.', 'Feels like a demo.', 'Was that all?'] },
  },
  vr: {
    '+': { sv: ['Med headsetet på glömmer man var man är.', 'Det här är vad VR är till för.'],
      en: ['With the headset on you forget where you are.', 'This is what VR is for.'] },
    '-': { sv: ['Ett VR-spel utan riktig VR-känsla.', 'Jag blev mest åksjuk.'],
      en: ['A VR game without any real VR feeling.', 'Mostly it made me queasy.'] },
  },
};

// Särskilda lägen: reklamen, studions form, krockar på marknaden, storleken, expansioner, onlinespelets skick och eftermälet
export const FAN_SPECIAL = {
  hyped: { mood: -1, sv: ['All den reklamen för det här?', 'Hypen var större än spelet.', 'Reklamen var bättre än spelet.'],
    en: ['All that advertising for this?', 'The hype was bigger than the game.', 'The ads were better than the game.'] },
  gem: { mood: 1, sv: ['Varför pratar ingen om {title}?', 'Årets bäst bevarade hemlighet.', 'Jag hittade det av en slump. Vilket fynd.'],
    en: ['Why is nobody talking about {title}?', 'The best-kept secret of the year.', 'I found it by accident. What a find.'] },
  streak: { mood: 1, sv: ['{studio} kan inte göra fel just nu.', 'Fullträff efter fullträff. Hur gör {studio}?'],
    en: ['{studio} can do no wrong right now.', 'Hit after hit. How do {studio} do it?'] },
  comeback: { mood: 1, sv: ['Efter förra spelet hade jag gett upp hoppet. Förlåt, {studio}.', '{studio} är tillbaka.'],
    en: ['After the last game I had given up hope. Sorry, {studio}.', '{studio} are back.'] },
  slump: { mood: -1, sv: ['Vad hände, {studio}? Förra spelet var ju så bra.', 'Från topp till botten på ett enda spel.'],
    en: ['What happened, {studio}? The last game was so good.', 'From the top to the bottom in a single game.'] },
  crowd: { mood: 0, sv: ['Synd att det kom samtidigt som {rival}.', 'Jag hade redan lagt pengarna på {rival}.'],
    en: ['A shame it came out at the same time as {rival}.', 'I had already spent my money on {rival}.'] },
  crowdWait: { mood: 0, sv: ['Jag sparar till {rival} i stället.', 'Alla väntar ju på {rival}.'],
    en: ['I am saving up for {rival} instead.', 'Everyone is waiting for {rival}, after all.'] },
  aaa: { mood: 1, sv: ['Man ser vart pengarna tog vägen.', 'Det är för sådana här spel jag sparar.'],
    en: ['You can see where the money went.', 'Games like this are what I save up for.'] },
  small: { mood: 1, sv: ['Litet spel, stort hjärta.', 'Ett spel behöver inte vara stort för att vara bra.'],
    en: ['Small game, big heart.', 'A game does not have to be big to be good.'] },
  expGood: { mood: 1, sv: ['Expansionen ger {base} nytt liv.', 'Mer av det jag redan älskar.'],
    en: ['The expansion gives {base} new life.', 'More of what I already love.'] },
  expBad: { mood: -1, sv: ['Expansionen känns som en dyr uppdatering.', 'För lite nytt för pengarna.'],
    en: ['The expansion feels like an expensive update.', 'Too little that is new for the money.'] },
  liveFull: { mood: -1, sv: ['Jag kommer inte in. Servrarna är fulla igen.', 'En timmes kö bara för att logga in.'],
    en: ['I cannot get in. The servers are full again.', 'An hour in the queue just to log in.'] },
  liveStale: { mood: -1, sv: ['När kommer nästa uppdatering? Vi har sett allt.', 'Folk slutar. Inget nytt på månader.'],
    en: ['When is the next update? We have seen everything.', 'People are leaving. Nothing new in months.'] },
  livePricey: { mood: -1, sv: ['Månadsavgiften börjar svida.', 'Bra spel, men priset är för högt.'],
    en: ['The monthly fee is starting to sting.', 'Good game, but the price is too high.'] },
  liveFresh: { mood: 1, sv: ['Senaste uppdateringen var precis vad spelet behövde.', 'Det har aldrig varit bättre än nu.', 'Hela gänget är inloggat varje kväll.'],
    en: ['The latest update was exactly what the game needed.', 'It has never been better than it is now.', 'My whole crew is online every night.'] },
  liveMid: { mood: 0, sv: ['Fortfarande kul, men jag väntar på något nytt.', 'Vi loggar in av gammal vana.'],
    en: ['Still fun, but I am waiting for something new.', 'We log in out of habit.'] },
  liveClosed: { mood: 0, sv: ['Jag saknar kvällarna i {title}.', 'Servrarna är släckta, men minnena finns kvar.'],
    en: ['I miss the evenings in {title}.', 'The servers are dark, but the memories remain.'] },
  classic: { mood: 1, sv: ['En klassiker. Jag har kvar mitt exemplar.', 'Jag spelar om {title} varje år.', 'De gör inte spel som {title} längre.'],
    en: ['A classic. I still have my copy.', 'I replay {title} every year.', 'They do not make games like {title} any more.'] },
  cult: { mood: 0, sv: ['Vi pratar inte om {title}.', 'Så dåligt att det har blivit kult.'],
    en: ['We do not talk about {title}.', 'So bad it has become a cult favourite.'] },
};

// Vilka som säger det. Före 1994 är det insändare med förnamn och ålder, sedan användarnamn på forum och till sist i flödet.
export const FAN_FIRST = ['Anna', 'Jonas', 'Maria', 'Erik', 'Sara', 'David', 'Lisa', 'Tom', 'Nina', 'Alex', 'Kim', 'Robin', 'Sam', 'Mika', 'Elin', 'Oscar', 'Emma', 'Leo', 'Ida', 'Max', 'Hanna', 'Viktor', 'Julia', 'Adam'];
export const FAN_HANDLES = ['pixelfox', 'retro_kid', 'joystick_jo', 'dpad_dan', 'turbo88', 'savescummer', 'nightowl', 'glitchqueen', 'bossfight_bo', 'modem56k', 'speedrun_siv', 'lag_lars', 'highscore_h', 'cartridge_c', 'combo_king', 'quest_log', 'bit_by_bit', 'respawn_r', 'loot_goblin', 'sprite_fan', 'final_boss', 'crit_roll', 'warp_zone', 'one_more_turn'];
export const FAN_SOURCE = {
  letter: { sv: 'Insändare', en: 'Letters page' },
  forum: { sv: 'Forumet', en: 'The forums' },
  feed: { sv: 'Flödet', en: 'The feed' },
};
