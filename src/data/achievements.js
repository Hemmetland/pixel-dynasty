// Prestationer. check(G) körs varje månad och efter lansering.
import { certIndex, totalUnits } from './certs.js';
const A = (id, glyph, sv, en, dsv, den, check) => ({ id, glyph, name: { sv, en }, desc: { sv: dsv, en: den }, check });
const best = (G) => G.stats.bestScore;
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
  A('outlast', 'a_globe', 'Sist kvar', 'Last One Standing', 'Ha ett onlinespel igång när en konkurrents MMO stänger.', 'Have an online game running when a rival MMO shuts down.', (G) => (G.stats.outlasted || 0) >= 1),
  A('ports3', 'a_globe', 'Överallt', 'Everywhere', 'Porta ett spel till tre andra plattformar.', 'Port one game to three other platforms.', (G) => G.games.some((g) => (g.ports || []).filter((p) => p.kind !== 'remaster').length >= 3)),
  A('timeless', 'a_star', 'Tidlös', 'Timeless', 'Släpp en remaster med betyg 8 eller mer.', 'Release a remaster scoring 8 or more.', (G) => G.games.some((g) => (g.ports || []).some((p) => p.kind === 'remaster' && p.score >= 8))),
  A('boxoffice', 'a_star', 'Kassasuccé', 'Box Office Hit', 'Få en film om en av dina spelserier som får betyg 8 eller mer.', 'Get a film of one of your game series that scores 8 or more.', (G) => (G.stats.bestFilm || 0) >= 8),
  A('empire', 'a_crown', 'Imperiet', 'Empire', 'Köp upp tre konkurrerande studior.', 'Buy three rival studios.', (G) => (G.stats.acquired || 0) >= 3),
  A('conglomerate', 'a_crown', 'Koncernchefen', 'The Conglomerate', 'Ha tre helt integrerade dotterbolag samtidigt.', 'Own three fully integrated subsidiaries at once.', (G) => (G.comps || []).filter((c) => c.owned && c.sub && c.sub.mode === 'int' && c.sub.integ >= 1).length >= 3),
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
  A('legend', 'a_clock', 'Legend', 'Legend', 'Spela till år 2020.', 'Play until the year 2020.', (G) => G.t >= 48 * 40),
];
export const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
