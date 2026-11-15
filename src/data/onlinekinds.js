// Sorters av onlinespel och deras e-sportevent. Ett onlinespel är inte bara ett MMO: det kan lika gärna vara ett
// överlevnadsspel, ett odlingsspel, ett sportspel, ett skjutspel, ett arenaspel eller ett partyspel. Sorten följer tema och
// genre (kindOf), men spelaren kan välja en annan i guiden. Den ändrar hur många som kommer (pot), hur fort innehållet blir
// gammalt (decay), vad driften kostar (ops), vilka storlekar som går att göra (scopes) och hur väl spelet passar för e-sport.
// En sort som inte är MMO kan göras redan i Medel, men alla kräver serverrummet.
//   watch = andel av spelarna som tittar på ett event, out = hur många utomstående sorten drar, conv = andel av dem som
//   börjar spela. Ett MMO är baslinjen (pot, decay och ops 1): spel utan sort (äldre sparningar) räknas som ett MMO.
// Events (ETYPES): weeks = så många veckor pågår det, view = hur många av spelarna som följer det, out = hur mycket det drar
// utomstående, drama = hur mycket slumpen (spänningen) kan lyfta eller sänka tittarsiffran.
const K = (id, ic, scopes, pot, decay, ops, watch, out, conv, name, desc) => ({ id, ic, scopes, pot, decay, ops, watch, out, conv, name, desc });
export const KINDS = [
  K('mmo', 'crown', ['large', 'aaa'], 1, 1, 1, 0.1, 1, 0.04,
    { sv: 'Onlinerollspel (MMO)', en: 'Online role-playing game (MMO)' },
    { sv: 'En stor värld där spelarna bor i åratal. Kräver stort projekt, men spelarna är lojala.', en: 'A huge world where players live for years. Needs a big project, but players are loyal.' }),
  K('survival', 'fire', ['medium', 'large', 'aaa'], 0.85, 0.9, 0.9, 0.07, 0.9, 0.048,
    { sv: 'Överlevnadsspel', en: 'Survival game' },
    { sv: 'Spelarna bygger, slåss och överlever tillsammans på en server. Roligt att titta på när det går fel.', en: 'Players build, fight and survive together on a server. Fun to watch when things go wrong.' }),
  K('farm', 'leaf', ['medium', 'large', 'aaa'], 0.75, 0.7, 0.75, 0.04, 0.5, 0.04,
    { sv: 'Odlingsspel', en: 'Farming game' },
    { sv: 'Lugnt gårdsliv online. Billigt att driva och innehållet håller länge, men få tittar på tävlingar.', en: 'Calm farm life online. Cheap to run and the content lasts, but few watch contests.' }),
  K('sports', 'flag', ['medium', 'large', 'aaa'], 1.1, 1.2, 1, 0.14, 1.2, 0.04,
    { sv: 'Sportspel online', en: 'Online sports game' },
    { sv: 'Fotboll och andra sporter mot riktiga människor. Nya säsonger behövs ofta, och ligor drar många tittare.', en: 'Football and other sports against real people. Needs new seasons often, and leagues draw many viewers.' }),
  K('shooter', 'target', ['medium', 'large', 'aaa'], 1.15, 1.3, 1.1, 0.16, 1.3, 0.032,
    { sv: 'Skjutspel online', en: 'Online shooter' },
    { sv: 'Snabba matcher, nya kartor hela tiden. Många spelare, men de tröttnar fort utan nytt innehåll.', en: 'Fast matches and new maps all the time. Lots of players, but they tire quickly without new content.' }),
  K('arena', 'shield', ['medium', 'large', 'aaa'], 0.95, 1.1, 1, 0.18, 1.4, 0.04,
    { sv: 'Arenaspel (lag mot lag)', en: 'Arena game (team vs team)' },
    { sv: 'Två lag, en bana och mycket taktik. Som gjort för turneringar med publik.', en: 'Two teams, one map and lots of tactics. Made for tournaments with an audience.' }),
  K('party', 'dice', ['medium', 'large', 'aaa'], 0.9, 0.8, 0.8, 0.08, 0.8, 0.056,
    { sv: 'Partyspel online', en: 'Online party game' },
    { sv: 'Enkla spel för vänner och familj. Många provar, få vill tävla, men innehållet åldras långsamt.', en: 'Simple games for friends and family. Many try it, few want to compete, but the content ages slowly.' }),
];
export const KIND = Object.fromEntries(KINDS.map((k) => [k.id, k]));
export const KIND_IDS = KINDS.map((k) => k.id);

// Vilken sort ett spel blir av tema och genre (om spelaren inte väljer själv): temat först, sedan genren
const TOPIC_KIND = { survival: 'survival', zombies: 'survival', farming: 'farm', cooking: 'farm', city: 'farm', fashion: 'farm', school: 'party', music: 'party', sports: 'sports', cars: 'sports' };
const GENRE_KIND = { shooter: 'shooter', strategy: 'arena', racing: 'sports', simulation: 'farm', casual: 'party', rpg: 'mmo', adventure: 'mmo', action: 'mmo' };
export const kindOf = (topic, genre, genre2) => TOPIC_KIND[topic] || GENRE_KIND[genre] || GENRE_KIND[genre2] || 'mmo';

// E-sportevent, två per sort. Vilka som finns styrs av sorten (kind).
const E = (id, kind, ic, weeks, view, out, drama, name, desc) => ({ id, kind, ic, weeks, view, out, drama, name, desc });
export const ETYPES = [
  E('race', 'mmo', 'rocket', 3, 1.1, 1.2, 0.3,
    { sv: 'Först i världen', en: 'Race to world first' },
    { sv: 'Gillen tävlar om att klara den nya utmaningen först. Alla tittar och håller på sitt favoritlag.', en: 'Guilds race to clear the new challenge first. Everyone watches and cheers for a favourite.' }),
  E('dungeon', 'mmo', 'skull', 2, 0.9, 0.9, 0.2,
    { sv: 'Grottjakten', en: 'Dungeon run' },
    { sv: 'Lag tävlar om snabbaste vägen genom grottorna. Kortare och billigare än ett race.', en: 'Teams race through the dungeons. Shorter and cheaper than a race.' }),
  E('lastteam', 'survival', 'fire', 2, 1.15, 1.2, 0.35,
    { sv: 'Sista laget kvar', en: 'Last team standing' },
    { sv: 'Lagen släpps ut på en karta som krymper. Bara ett lag överlever.', en: 'Teams drop onto a shrinking map. Only one team survives.' }),
  E('build', 'survival', 'hammer', 2, 0.8, 0.8, 0.2,
    { sv: 'Byggkampen', en: 'Build-off' },
    { sv: 'Lagen bygger de mest kreativa baserna mot klockan. Publiken röstar.', en: 'Teams build the most creative bases against the clock. The audience votes.' }),
  E('harvest', 'farm', 'leaf', 2, 1, 1, 0.15,
    { sv: 'Skördetävlingen', en: 'Harvest cup' },
    { sv: 'Vem odlar mest och finast på en vecka? Mysigt, och förvånansvärt spännande.', en: 'Who grows the most and the finest in a week? Cosy, and surprisingly exciting.' }),
  E('fair', 'farm', 'flower', 3, 0.9, 1.1, 0.1,
    { sv: 'Stora marknaden', en: 'The grand fair' },
    { sv: 'Spelarna visar upp sina gårdar på en stor marknad med tävlingar och priser.', en: 'Players show off their farms at a big fair with contests and prizes.' }),
  E('league', 'sports', 'trophy', 6, 1.2, 1, 0.25,
    { sv: 'Ligan', en: 'The league' },
    { sv: 'En hel serie matcher över en säsong. Lång och dyr, men fansen följer den hela vägen.', en: 'A full run of matches over a season. Long and costly, but fans follow it all the way.' }),
  E('cup', 'sports', 'award', 3, 1, 1.1, 0.35,
    { sv: 'Cupen', en: 'The cup' },
    { sv: 'Utslagsmatcher, och en final som alla ser. Kort och spännande.', en: 'Knockout matches and a final everyone watches. Short and thrilling.' }),
  E('cup5', 'shooter', 'target', 3, 1.15, 1.2, 0.3,
    { sv: 'Femmannacupen', en: 'Five-a-side cup' },
    { sv: 'Femmannalag möts i skarpa matcher. Lätt att förstå även för den som aldrig spelat.', en: 'Five-person teams meet in sharp matches. Easy to follow even for someone who never played.' }),
  E('duel', 'shooter', 'sparkle', 2, 0.85, 1, 0.4,
    { sv: 'Duellmästaren', en: 'Duel master' },
    { sv: 'En mot en. Ingen att skylla på, och många stora ögonblick.', en: 'One against one. Nobody to blame, and many big moments.' }),
  E('bracket', 'arena', 'shield', 4, 1.2, 1.3, 0.3,
    { sv: 'Mästerskapet', en: 'The championship' },
    { sv: 'Lag kämpar sig fram genom ett helt tävlingsschema. Det klassiska e-sportsevenemanget.', en: 'Teams fight through a full bracket. The classic e-sport event.' }),
  E('blitz', 'arena', 'fire', 1, 0.9, 0.9, 0.3,
    { sv: 'Blixtturneringen', en: 'Blitz tournament' },
    { sv: 'En helg, alla matcher på en gång. Billigt och snabbt.', en: 'One weekend, all the matches at once. Cheap and quick.' }),
  E('open', 'party', 'dice', 2, 1, 0.9, 0.2,
    { sv: 'Öppna festen', en: 'Open party' },
    { sv: 'Vem som helst får vara med. Lekfullt, med roliga tittare och korta matcher.', en: 'Anyone can join. Playful, with fun viewers and short matches.' }),
];
export const ETYPE = Object.fromEntries(ETYPES.map((e) => [e.id, e]));
export const etypesOf = (kind) => ETYPES.filter((e) => e.kind === (KIND[kind] ? kind : 'mmo'));

// Lagnamn till vinnarna: förled + efterled, valda med en hash (aldrig slumpen i spelet)
export const TEAM_A = ['Nord', 'Iron', 'Neon', 'Shadow', 'Storm', 'Pixel', 'Crimson', 'Frost', 'Thunder', 'Silver', 'Rogue', 'Lunar', 'Atomic', 'Wild', 'Cyber', 'Golden'];
export const TEAM_B = ['Wolves', 'Foxes', 'Titans', 'Raiders', 'Legion', 'Phoenix', 'Vipers', 'Knights', 'Falcons', 'Giants', 'Hawks', 'Rebels', 'Bears', 'Ravens', 'Sharks', 'Comets'];
