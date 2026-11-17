// Prestationer. check(G) körs varje månad och efter lansering.
import { certIndex, totalUnits } from './certs.js';
import { PLATFORM, launchTime } from './platforms.js';
import { START_YEAR, WEEKS_PER_YEAR } from '../sim/const.js';
const A = (id, glyph, sv, en, dsv, den, check) => ({ id, glyph, name: { sv, en }, desc: { sv: dsv, en: den }, check });
const best = (G) => G.stats.bestScore;
const topHype = (G) => Math.max(0, ...G.games.map((g) => g.hype || 0));
// Hur många spel serien som g avslutar har (g, föregångaren, dess föregångare …)
function seriesLen(G, g) {
  let n = 1;
  for (let x = g; x.sequelOf && n < 50; n++) {
    x = G.games.find((y) => y.id === x.sequelOf);
    if (!x) break;
  }
  return n;
}
// spel med minst skiva nummer min (0 silver, 1 guld, 2 platina, 3 diamant); räknat ur sålda exemplar så att gamla sparningar får sina
const discs = (G, min) => G.games.filter((g) => certIndex(totalUnits(g)) >= min).length;
// priser vunna på samma gala (ett år), och hur många olika år studion vunnit något
const galaWins = (G) => {
  const by = {};
  for (const a of G.awards) (by[a.year] || (by[a.year] = new Set())).add(a.cat);
  return by;
};
// spel som studion gett ut själv i den ordning de kom (expansioner räknas inte)
export const fullGames = (G) => G.games.filter((g) => !g.expansionOf);
export const decadeOf = (year) => Math.floor(year / 10) * 10;
const yearOfT = (t) => START_YEAR + Math.floor(t / WEEKS_PER_YEAR);
// längsta följd av spel i rad med minst betyget min
export function streak(G, min) {
  let best = 0;
  let run = 0;
  for (const g of fullGames(G)) {
    run = g.score >= min ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
// flest spel som kom ut samma kalenderår
export function mostInYear(G) {
  const by = {};
  for (const g of fullGames(G)) by[yearOfT(g.t)] = (by[yearOfT(g.t)] || 0) + 1;
  return Math.max(0, ...Object.values(by));
}
// olika plattformar, genrer, teman och årtionden som studion gett ut spel i
export const distinct = (G, f) => new Set(fullGames(G).map(f)).size;
// ett spel för en plattform inom ett år efter att plattformen kom ut (egna plattformar och datorn räknas inte)
export const pioneered = (G) =>
  fullGames(G).some((g) => {
    const p = PLATFORM[g.platform];
    if (!p || p.own || p.id === 'pc') return false;
    const at = (launchTime(p) - START_YEAR) * WEEKS_PER_YEAR;
    return g.t >= at && g.t - at <= WEEKS_PER_YEAR;
  });
// längsta serien
export function longestSeries(G) {
  let best = 0;
  for (const g of G.games) best = Math.max(best, seriesLen(G, g));
  return best;
}
// toppplats i branschen (1 = störst) ett år inom ett visst årtionde
export const rankedIn = (G, dec, pos) => (G.ranks || []).some((r) => r.pos <= pos && r.y >= dec && r.y <= dec + 9);
export const unitsTotal = (G) => G.games.reduce((a, g) => a + totalUnits(g), 0);
const liveEvents = (G) => G.games.reduce((a, g) => a + ((g.live && g.live.events) || 0), 0);
export const ACHIEVEMENTS = [
  A('first_game', 'a_game', 'Första spelet', 'First Release', 'Släpp ditt första spel.', 'Release your first game.', (G) => G.games.length >= 1),
  A('five_games', 'a_game', 'Produktiv', 'Productive', 'Släpp fem spel.', 'Release five games.', (G) => G.games.length >= 5),
  A('twenty_games', 'a_game', 'Spelfabrik', 'Game Factory', 'Släpp tjugo spel.', 'Release twenty games.', (G) => G.games.length >= 20),
  A('score8', 'a_star', 'Kritikerfavorit', 'Critics\' Darling', 'Få snittbetyg 8 eller mer.', 'Reach an average review of 8 or more.', (G) => best(G) >= 8),
  A('score9', 'a_star', 'Mästerverk', 'Masterpiece', 'Få snittbetyg 9 eller mer.', 'Reach an average review of 9 or more.', (G) => best(G) >= 9),
  A('score10', 'a_star', 'Perfektion', 'Perfection', 'Få snittbetyg 9,6 eller mer.', 'Reach an average review of 9.6 or more.', (G) => best(G) >= 9.6),
  A('rich1', 'a_coin', 'Sexsiffrigt', 'Six Figures', 'Ha 100 000 dollar i kassan.', 'Hold $100,000 in cash.', (G) => G.money >= 100000),
  A('rich2', 'a_coin', 'Miljonär', 'Millionaire', 'Ha 1 miljon dollar i kassan.', 'Hold $1,000,000 in cash.', (G) => G.money >= 1e6),
  A('rich3', 'a_coin', 'Mogul', 'Mogul', 'Ha 250 miljoner dollar i kassan.', 'Hold $250,000,000 in cash.', (G) => G.money >= 2.5e8),
  A('office1', 'a_house', 'Ut ur garaget', 'Out of the Garage', 'Flytta till ett riktigt kontor.', 'Move into a real office.', (G) => G.office.tier >= 1),
  A('office3', 'a_house', 'Studiohuset', 'Studio House', 'Bygg studiohuset.', 'Build the studio house.', (G) => G.office.tier >= 3),
  A('office5', 'a_house', 'Dynastitornet', 'Dynasty Tower', 'Bygg tornet.', 'Build the tower.', (G) => G.office.tier >= 5),
  A('team10', 'a_team', 'Ett riktigt team', 'A Real Team', 'Ha tio anställda.', 'Employ ten people.', (G) => G.staff.length >= 10),
  A('team30', 'a_team', 'Stort bolag', 'Big Company', 'Ha trettio anställda.', 'Employ thirty people.', (G) => G.staff.length >= 30),
  A('fans1k', 'a_heart', 'Fansen samlas', 'Fans Gather', 'Nå 1 000 fans.', 'Reach 1,000 fans.', (G) => G.fans >= 1000),
  A('fans1m', 'a_heart', 'Kultstatus', 'Cult Status', 'Nå en miljon fans.', 'Reach one million fans.', (G) => G.fans >= 1e6),
  A('research20', 'a_flask', 'Nyfiken', 'Curious', 'Slutför 20 forskningar.', 'Complete 20 research projects.', (G) => G.research.done.length >= 20),
  A('research_all', 'a_flask', 'Allvetande', 'Omniscient', 'Slutför 50 forskningar.', 'Complete 50 research projects.', (G) => G.research.done.length >= 50),
  A('aaa', 'a_aaa', 'Blockbuster', 'Blockbuster', 'Släpp ett AAA-spel.', 'Release an AAA game.', (G) => G.games.some((g) => g.scope === 'aaa')),
  A('hit_aaa', 'a_aaa', 'Storsäljare', 'Mega Seller', 'Sälj för 10 miljoner med ett enda spel.', 'Earn $10M from a single game.', (G) => G.games.some((g) => g.revenue >= 1e7)),
  A('award1', 'a_trophy', 'Prisvinnare', 'Award Winner', 'Vinn ett pris på Golden Pixel Awards.', 'Win a Golden Pixel Award.', (G) => G.awards.length >= 1),
  A('award5', 'a_trophy', 'Hyllad', 'Acclaimed', 'Vinn fem priser.', 'Win five awards.', (G) => G.awards.length >= 5),
  A('contracts5', 'a_brief', 'Frilansare', 'Freelancer', 'Slutför fem uppdrag.', 'Complete five contracts.', (G) => G.stats.contracts >= 5),
  A('engine', 'a_engine', 'Egen motor', 'Home-Grown Engine', 'Bygg din första spelmotor.', 'Build your first engine.', (G) => G.engines.length >= 1),
  A('survive', 'a_clock', 'Veteran', 'Veteran', 'Överlev i tio år.', 'Survive ten years.', (G) => G.t >= 48 * 10),
  A('live1', 'a_game', 'Världen är online', 'World Online', 'Släpp ditt första onlinespel.', 'Launch your first online game.', (G) => (G.stats.liveLaunched || 0) >= 1),
  A('subs1m', 'a_heart', 'En miljon äventyrare', 'A Million Adventurers', 'Ha en miljon prenumeranter samtidigt.', 'Have a million subscribers at once.', (G) => G.games.some((g) => g.live && g.live.peak >= 1e6)),
  A('goty', 'a_trophy', 'Årets spel', 'Game of the Year', 'Vinn priset Årets spel på Golden Pixel Awards.', 'Win Game of the Year at the Golden Pixel Awards.', (G) => G.awards.some((a) => a.cat === 'goty')),
  A('slam', 'a_trophy', 'Storslam', 'Grand Slam', 'Vinn alla fyra priserna på samma gala.', 'Win all four awards at the same gala.', (G) => Object.values(galaWins(G)).some((c) => c.size >= 4)),
  A('regular', 'a_star', 'Galans stammis', 'Gala Regular', 'Vinn ett pris fem olika år.', 'Win an award in five different years.', (G) => Object.keys(galaWins(G)).length >= 5),
  A('trilogy', 'a_game', 'Trilogi', 'Trilogy', 'Släpp det tredje spelet i en serie.', 'Release the third game in a series.', (G) => G.games.some((g) => g.sequelOf && seriesLen(G, g) >= 3)),
  A('novel', 'a_bulb', 'Nytänkare', 'Trailblazer', 'Efter tio spel: släpp ett med ett tema och en genre du aldrig kombinerat.', 'After ten games, release one with a topic and genre you have never combined.', (G) => G.games.some((g) => g.novel)),
  A('blend8', 'a_star', 'Genreblandare', 'Genre Blender', 'Få betyg 8 eller mer med ett spel som blandar två genrer.', 'Score 8 or more with a game that blends two genres.', (G) => G.games.some((g) => g.genre2 && g.score >= 8)),
  A('comeback', 'a_star', 'Comeback', 'Comeback', 'Släpp ett spel med betyg 8 eller mer direkt efter ett med under 5.', 'Release a game scoring 8 or more right after one scoring under 5.', (G) => G.games.some((g, i) => i > 0 && g.score >= 8 && G.games[i - 1].score < 5)),
  A('exp3', 'a_globe', 'Levande värld', 'Living World', 'Släpp tre expansioner till samma onlinespel.', 'Release three expansions for the same online game.', (G) => G.games.some((g) => g.live && g.live.exps.length >= 3)),
  A('live_world', 'a_globe', 'Världen runt', 'Around the World', 'Öppna ett onlinespel i alla regioner.', 'Open an online game in every region.', (G) => (G.stats.liveWorld || 0) >= 1),
  A('events10', 'a_globe', 'Festfixare', 'Party Planner', 'Ordna tio evenemang i dina onlinespel.', 'Run ten events in your online games.', (G) => liveEvents(G) >= 10),
  A('three_live', 'a_globe', 'Flera världar', 'Many Worlds', 'Ha tre onlinespel igång samtidigt.', 'Run three online games at once.', (G) => G.games.filter((g) => g.live && !g.live.closed).length >= 3),
  A('f2p1m', 'a_heart', 'Gratis för alla', 'Free for All', 'Få en miljon spelare i ett gratisspel.', 'Reach a million players in a free-to-play game.', (G) => G.games.some((g) => g.live && g.live.model === 'f2p' && g.live.peak >= 1e6)),
  A('decade', 'a_crown', 'Tio år i branschen', 'Ten Years in the Business', 'Håll studion igång i tio år.', 'Keep the studio going for ten years.', (G) => G.t >= 480),
  A('known', 'a_bulb', 'Ett namn i branschen', 'A Name in the Industry', 'Få ett rykte: branschen börjar kalla studion något.', 'Earn a reputation: the industry starts calling the studio something.', (G) => !!G.flags.ident),
  A('hitfactory', 'a_star', 'Hitfabriken', 'The Hit Factory', 'Bli känd som Hitfabriken.', 'Become known as the hit factory.', (G) => G.flags.ident === 'hits'),
  A('outlast', 'a_globe', 'Sist kvar', 'Last One Standing', 'Ha ett onlinespel igång när en konkurrents MMO stänger.', 'Have an online game running when a rival MMO shuts down.', (G) => (G.stats.outlasted || 0) >= 1),
  A('live_comeback', 'a_heart', 'Comeback', 'Comeback', 'Låt ett onlinespel växa tillbaka efter en lång nedgång.', 'Let an online game grow back after a long decline.', (G) => (G.stats.liveComeback || 0) >= 1),
  A('seasons5', 'a_globe', 'Säsongskungen', 'Season King', 'Genomför fem säsonger i dina onlinespel.', 'Complete five seasons in your online games.', (G) => (G.stats.liveSeasons || 0) >= 5),
  A('ports3', 'a_globe', 'Överallt', 'Everywhere', 'Porta ett spel till tre andra plattformar.', 'Port one game to three other platforms.', (G) => G.games.some((g) => (g.ports || []).filter((p) => p.kind !== 'remaster').length >= 3)),
  A('timeless', 'a_star', 'Tidlös', 'Timeless', 'Släpp en remaster med betyg 8 eller mer.', 'Release a remaster scoring 8 or more.', (G) => G.games.some((g) => (g.ports || []).some((p) => p.kind === 'remaster' && p.score >= 8))),
  A('boxoffice', 'a_star', 'Kassasuccé', 'Box Office Hit', 'Få en film om en av dina spelserier som får betyg 8 eller mer.', 'Get a film of one of your game series that scores 8 or more.', (G) => (G.stats.bestFilm || 0) >= 8),
  A('empire', 'a_crown', 'Imperiet', 'Empire', 'Köp upp tre konkurrerande studior.', 'Buy three rival studios.', (G) => (G.stats.acquired || 0) >= 3),
  A('conglomerate', 'a_crown', 'Koncernchefen', 'The Conglomerate', 'Ha tre helt sammanslagna dotterbolag samtidigt.', 'Own three fully merged subsidiaries at once.', (G) => (G.comps || []).filter((c) => c.owned && c.sub && c.sub.mode === 'int' && c.sub.integ >= 1).length >= 3),
  A('launcher', 'a_crown', 'Plattformen', 'The Platform', 'Få tio miljoner användare i din egen butik.', 'Reach ten million users in your own store.', (G) => (G.stats.storeUsers || 0) >= 1e7),
  A('label5', 'a_star', 'Förläggare', 'Publisher', 'Ge ut fem spel från andra studior.', 'Publish five games from other studios.', (G) => (G.stats.published || 0) >= 5),
  A('chart1', 'a_star', 'Listetta', 'Chart Topper', 'Få ett spel till förstaplatsen på topplistan.', 'Take a game to number one on the charts.', (G) => (G.stats.no1 || 0) >= 1),
  A('disc_gold', 'a_disc', 'Guldskiva', 'Gold Disc', 'Sälj 100 000 exemplar av ett spel.', 'Sell 100,000 copies of one game.', (G) => discs(G, 1) >= 1),
  A('disc_platinum', 'a_disc', 'Platinaskiva', 'Platinum Disc', 'Sälj 500 000 exemplar av ett spel.', 'Sell 500,000 copies of one game.', (G) => discs(G, 2) >= 1),
  A('disc_diamond', 'a_disc', 'Diamantskiva', 'Diamond Disc', 'Sälj två miljoner exemplar av ett spel.', 'Sell two million copies of one game.', (G) => discs(G, 3) >= 1),
  A('disc_wall', 'a_disc', 'Skivväggen', 'Wall of Discs', 'Ha tio spel med guldskiva eller finare.', 'Have ten games with a gold disc or better.', (G) => discs(G, 1) >= 10),
  A('top_studio', 'a_crown', 'Störst i branschen', 'Top of the Industry', 'Avsluta ett år som den studio som säljer mest spel.', 'End a year as the studio that sells the most games.', (G) => !!G.stats.topStudio),
  A('top_decade', 'a_crown', 'Tio år på tronen', 'A Decade on the Throne', 'Var störst i branschen tio år (de behöver inte följa på varandra).', 'Be the biggest studio in the industry for ten years (they need not be in a row).', (G) => (G.ranks || []).filter((r) => r.pos === 1).length >= 10),
  A('hw_platform', 'a_chip', 'Egen plattform', 'Platform Holder', 'Lansera en egen spelplattform.', 'Launch a game platform of your own.', (G) => (G.hw?.plats?.length || 0) >= 1),
  A('hw_factory', 'a_chip', 'Fabrikör', 'Factory Owner', 'Bygg en egen fabrik för din hårdvara.', 'Build a factory for your own hardware.', (G) => (G.hw?.fab?.lvl || 0) >= 1),
  A('hw_vr', 'a_chip', 'En annan verklighet', 'Another Reality', 'Lansera ett eget VR-headset.', 'Launch a VR headset of your own.', (G) => (G.hw?.products || []).some((P) => P.type === 'vr')),
  A('esport1', 'a_star', 'Arrangören', 'The Organiser', 'Håll en e-sporttävling i ett av dina onlinespel.', 'Host an e-sport tournament in one of your online games.', (G) => (G.stats.esports || 0) >= 1),
  A('esport_million', 'a_crown', 'Miljonpublik', 'Million Viewers', 'Få en miljon tittare till dina e-sportevent sammanlagt.', 'Get a million viewers to your e-sport events in total.', (G) => (G.stats.esportViewers || 0) >= 1e6),
  // genom spelen, pengarna och epokerna
  A('platforms5', 'a_game', 'Plattformsbytare', 'Platform Hopper', 'Släpp spel för fem olika plattformar.', 'Release games for five different platforms.', (G) => distinct(G, (g) => g.platform) >= 5),
  A('genres6', 'a_bulb', 'Allsidig', 'All-Rounder', 'Släpp spel i sex olika genrer.', 'Release games in six different genres.', (G) => distinct(G, (g) => g.genre) >= 6),
  A('topics12', 'a_bulb', 'Världsbyggare', 'World Builder', 'Släpp spel med tolv olika teman.', 'Release games with twelve different topics.', (G) => distinct(G, (g) => g.topic) >= 12),
  A('quick3', 'a_clock', 'Tre på ett år', 'Three in a Year', 'Släpp tre spel under samma kalenderår.', 'Release three games in the same calendar year.', (G) => mostInYear(G) >= 3),
  A('streak5', 'a_star', 'Jämn kvalitet', 'Steady Quality', 'Släpp fem spel i rad med betyg 7 eller mer.', 'Release five games in a row scoring 7 or more.', (G) => streak(G, 7) >= 5),
  A('streak3_8', 'a_star', 'Hattrick', 'Hat Trick', 'Släpp tre spel i rad med betyg 8 eller mer.', 'Release three games in a row scoring 8 or more.', (G) => streak(G, 8) >= 3),
  A('pioneer', 'a_chip', 'Pionjären', 'The Pioneer', 'Släpp ett spel för en ny plattform inom ett år efter att den kommit ut.', 'Release a game for a new platform within a year of its launch.', pioneered),
  A('series5', 'a_game', 'Långlivad serie', 'Long-Running Series', 'Släpp det femte spelet i en serie.', 'Release the fifth game in a series.', (G) => longestSeries(G) >= 5),
  A('hits10', 'a_star', 'Tio succéer', 'Ten Hits', 'Släpp tio spel med betyg 8 eller mer.', 'Release ten games scoring 8 or more.', (G) => G.stats.hits >= 10),
  A('rev100m', 'a_coin', 'Hundra miljoner', 'A Hundred Million', 'Sälj spel för 100 miljoner dollar sammanlagt.', 'Earn $100 million from games in total.', (G) => G.stats.revenue >= 1e8),
  A('rev1b', 'a_coin', 'Miljardbolaget', 'The Billion-Dollar Studio', 'Sälj spel för en miljard dollar sammanlagt.', 'Earn $1 billion from games in total.', (G) => G.stats.revenue >= 1e9),
  A('units10m', 'a_disc', 'Tio miljoner exemplar', 'Ten Million Copies', 'Sälj tio miljoner exemplar sammanlagt.', 'Sell ten million copies in total.', (G) => unitsTotal(G) >= 1e7),
  A('award10', 'a_trophy', 'Pokalskåpet', 'The Trophy Cabinet', 'Vinn tio priser.', 'Win ten awards.', (G) => G.awards.length >= 10),
  A('hype150', 'a_star', 'Hela stan pratar', 'Talk of the Town', 'Släpp ett spel med förväntan 150 eller mer.', 'Release a game with hype of 150 or more.', (G) => topHype(G) >= 150),
  A('hype250', 'a_crown', 'Snöbollen', 'The Snowball', 'Släpp ett spel med förväntan 250 eller mer.', 'Release a game with hype of 250 or more.', (G) => topHype(G) >= 250),
  A('expo1', 'a_game', 'Första mässan', 'First Expo', 'Ställ ut på Spelmässan.', 'Exhibit at the Games Expo.', (G) => (G.expoHist || []).length >= 1),
  A('expo_prize', 'a_trophy', 'Mässvinnare', 'Expo Winner', 'Vinn ett pris på Spelmässan.', 'Win a prize at the Games Expo.', (G) => (G.expoHist || []).some((h) => h.pz && h.pz.length >= 1)),
  A('expo_sweep', 'a_trophy', 'Rent bord', 'Clean Sweep', 'Vinn tre priser på samma mässa.', 'Win three prizes at the same expo.', (G) => (G.expoHist || []).some((h) => h.pz && h.pz.length >= 3)),
  A('expo_talk', 'a_star', 'Mässans snackis', 'Talk of the Expo', 'Få pressens dom Mässans snackis.', 'Earn the press verdict Talk of the expo.', (G) => (G.expoHist || []).some((h) => h.vd === 4)),
  A('expo_word', 'a_crown', 'Ord och inga visor', 'As Good as Your Word', 'Håll ett löfte på betyg 8,5 från scenen.', 'Keep a promise of a score of 8.5 made from the stage.', (G) => G.games.some((g) => g.promise && g.promise.kept && g.promise.bar >= 8.5)),
  A('team100', 'a_team', 'Hundra på golvet', 'A Hundred on the Floor', 'Ha hundra anställda.', 'Employ a hundred people.', (G) => G.staff.length >= 100),
  A('team300', 'a_team', 'En stad i staden', 'A Town Within a Town', 'Ha trehundra anställda.', 'Employ three hundred people.', (G) => G.staff.length >= 300),
  A('teams5', 'a_team', 'Chef över chefer', 'Boss of Bosses', 'Ha fem team igång samtidigt.', 'Run five teams at once.', (G) => (G.teams || []).length >= 5),
  A('top3_80', 'a_crown', 'Toppstudio på 80-talet', 'Top Studio of the 80s', 'Bli en av de tre största studiorna ett år på 80-talet.', 'Be one of the three biggest studios in a year in the 1980s.', (G) => rankedIn(G, 1980, 3)),
  A('top3_90', 'a_crown', 'Toppstudio på 90-talet', 'Top Studio of the 90s', 'Bli en av de tre största studiorna ett år på 90-talet.', 'Be one of the three biggest studios in a year in the 1990s.', (G) => rankedIn(G, 1990, 3)),
  A('top3_00', 'a_crown', 'Toppstudio på 00-talet', 'Top Studio of the 00s', 'Bli en av de tre största studiorna ett år på 00-talet.', 'Be one of the three biggest studios in a year in the 2000s.', (G) => rankedIn(G, 2000, 3)),
  A('top3_10', 'a_crown', 'Toppstudio på 10-talet', 'Top Studio of the 10s', 'Bli en av de tre största studiorna ett år på 10-talet.', 'Be one of the three biggest studios in a year in the 2010s.', (G) => rankedIn(G, 2010, 3)),
  A('era_all', 'a_clock', 'Genom epokerna', 'Through the Eras', 'Släpp spel på 80-, 90-, 00- och 10-talet.', 'Release games in the 80s, 90s, 00s and 10s.', (G) => [1980, 1990, 2000, 2010].every((d) => fullGames(G).some((g) => decadeOf(yearOfT(g.t)) === d))),
  A('fr_friends', 'a_heart', 'Ett lag av vänner', 'A Team of Friends', 'Låt fem vänskaper uppstå i studion.', 'Let five friendships form in the studio.', (G) => (G.stats.fr || 0) >= 5),
  A('fr_couple', 'a_heart', 'Kärlek på kontoret', 'Office Romance', 'Låt två kollegor bli ett par.', 'Let two colleagues become a couple.', (G) => (G.stats.cp || 0) >= 1),
  A('fr_wedding', 'a_heart', 'Bröllopsklockor', 'Wedding Bells', 'Ha ett bröllop i studion.', 'Hold a wedding at the studio.', (G) => (G.stats.wed || 0) >= 1),
  A('fr_dream', 'a_bulb', 'Drömmen blev verklig', 'Dream Come True', 'Låt en medarbetare göra klart sitt drömspel.', 'Let a team member finish their dream game.', (G) => (G.stats.dreams || 0) >= 1),
  A('fr_viral', 'a_star', 'Gick viralt', 'Gone Viral', 'Få en tråd om ett av dina spel att gå viralt.', 'Have a thread about one of your games go viral.', (G) => (G.stats.viral || 0) >= 1),
  A('fr_cover', 'a_trophy', 'På omslaget', 'On the Cover', 'Hamna på omslaget av Pixelposten med ett toppbetyg.', 'Make the cover of The Pixel Post with a top score.', (G) => (G.stats.covers || 0) >= 1),
  A('fr_trend', 'a_globe', 'Trendsättare', 'Trendsetter', 'Få hela branschen att svänga mot genren i ett av dina spel.', 'Make the whole industry swing towards the genre of one of your games.', (G) => (G.stats.hot || 0) >= 1),
  A('fr_copied', 'a_crown', 'Efterapad', 'Copied', 'Låt en konkurrent släppa en kopia av ett av dina spel.', 'Have a rival release a copy of one of your games.', (G) => (G.stats.copied || 0) >= 1),
  A('fr_jubilee', 'a_clock', 'Tidens tand', 'Test of Time', 'Fira jubileum för ett toppspel som fortfarande pratas om.', 'Celebrate the anniversary of a top game people still talk about.', (G) => (G.stats.jubilee || 0) >= 1),
  A('legend', 'a_clock', 'Legend', 'Legend', 'Spela till år 2020.', 'Play until the year 2020.', (G) => G.t >= 48 * 40),
];
export const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
