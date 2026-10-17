// Prestationer. check(G) körs varje månad och efter lansering.
const A = (id, glyph, sv, en, dsv, den, check) => ({ id, glyph, name: { sv, en }, desc: { sv: dsv, en: den }, check });
const best = (G) => G.stats.bestScore;
export const ACHIEVEMENTS = [
  A('first_game', 'a_game', 'Första spelet', 'First Release', 'Släpp ditt första spel.', 'Release your first game.', (G) => G.games.length >= 1),
  A('five_games', 'a_game', 'Produktiv', 'Productive', 'Släpp fem spel.', 'Release five games.', (G) => G.games.length >= 5),
  A('twenty_games', 'a_game', 'Spelfabrik', 'Game Factory', 'Släpp tjugo spel.', 'Release twenty games.', (G) => G.games.length >= 20),
  A('score8', 'a_star', 'Kritikerfavorit', 'Critics\' Darling', 'Få snittbetyg 8 eller mer.', 'Reach an average review of 8 or more.', (G) => best(G) >= 8),
  A('score9', 'a_star', 'Mästerverk', 'Masterpiece', 'Få snittbetyg 9 eller mer.', 'Reach an average review of 9 or more.', (G) => best(G) >= 9),
  A('score10', 'a_star', 'Perfektion', 'Perfection', 'Få snittbetyg 9,8 eller mer.', 'Reach an average review of 9.8 or more.', (G) => best(G) >= 9.8),
  A('rich1', 'a_coin', 'Sexsiffrigt', 'Six Figures', 'Ha 100 000 dollar i kassan.', 'Hold $100,000 in cash.', (G) => G.money >= 100000),
  A('rich2', 'a_coin', 'Miljonär', 'Millionaire', 'Ha 1 miljon dollar i kassan.', 'Hold $1,000,000 in cash.', (G) => G.money >= 1e6),
  A('rich3', 'a_coin', 'Miljardär', 'Billionaire', 'Ha 1 miljard dollar i kassan.', 'Hold $1,000,000,000 in cash.', (G) => G.money >= 1e9),
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
  A('legend', 'a_clock', 'Legend', 'Legend', 'Spela till år 2020.', 'Play until the year 2020.', (G) => G.t >= 48 * 40),
];
export const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
