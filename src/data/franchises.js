// Spelserier som konkurrenternas förlag ger ut. Förebilderna finns i verkligheten (Football Universe är vår FIFA, Duty Calls
// vår Call of Duty), men namnen är påhittade, precis som konsolerna och förlagen. Ett förlag har sina egna serier (by = förlagets
// namn i names.js). Släpper förlaget en serie igen blir titeln en uppföljare: kind 'n' räknar upp (Speed Fever, Speed Fever 2),
// 'r' med romerska siffror (Grand Larceny Auto III) och 'y' ger årets namn (Football Universe 2004). Serien väljs när släppet
// planeras (se rollNext i sim/market.js), så ryktet i Marknad visar redan titeln. Tema och genre måste finnas den tiden.
const F = (by, id, name, genre, topic, from, kind = 'n', to = 2200) => ({ by, id, name, genre, topic, from, to, kind });

export const FRANCHISES = [
  // Electric Arts: sport, bilar och stora varumärken
  F('Electric Arts', 'footballuniverse', 'Football Universe', 'simulation', 'sports', 1992, 'y'),
  F('Electric Arts', 'gridiron', 'Gridiron Legends', 'simulation', 'sports', 1989, 'y'),
  F('Electric Arts', 'hoops', 'Hoops Live', 'simulation', 'sports', 1995, 'y'),
  F('Electric Arts', 'speedfever', 'Speed Fever', 'racing', 'cars', 1994),
  F('Electric Arts', 'simmers', 'The Simmers', 'simulation', 'city', 1999),
  F('Electric Arts', 'metrosim', 'MetroSim', 'strategy', 'city', 1989, 'r'),
  F('Electric Arts', 'battleground', 'Battleground Front', 'shooter', 'military', 2002),
  F('Electric Arts', 'massimpact', 'Mass Impact', 'rpg', 'space', 2007),
  F('Electric Arts', 'deadorbit', 'Dead Orbit', 'shooter', 'horror', 2008),
  // Blazzard Entertainment: strategi, rollspel och spel som aldrig blir klara
  F('Blazzard Entertainment', 'warcrest', 'Warcrest', 'strategy', 'fantasy', 1994, 'r'),
  F('Blazzard Entertainment', 'starcrash', 'StarCrash', 'strategy', 'space', 1998),
  F('Blazzard Entertainment', 'diabolo', 'Diabolo', 'rpg', 'horror', 1996, 'r'),
  F('Blazzard Entertainment', 'wowish', 'World of Warcrest', 'rpg', 'fantasy', 2004, 'x'),
  F('Blazzard Entertainment', 'overlook', 'Overlook', 'shooter', 'heroes', 2016),
  F('Blazzard Entertainment', 'hearthside', 'Hearthside', 'casual', 'fantasy', 2014),
  // Square Root Enix: japanska rollspel med siffror som aldrig tar slut
  F('Square Root Enix', 'ultimate', 'Ultimate Fantasy', 'rpg', 'fantasy', 1987, 'r'),
  F('Square Root Enix', 'dragonquester', 'Dragon Quester', 'rpg', 'knights', 1986, 'r'),
  F('Square Root Enix', 'kingdomharts', 'Kingdom Harts', 'rpg', 'magic', 2002),
  F('Square Root Enix', 'tombrobber', 'Tomb Robber', 'adventure', 'mythology', 1996),
  F('Square Root Enix', 'excom', 'EX-COM', 'strategy', 'aliens', 1994),
  // Blockhead Studios: klossar, gårdar och överlevnad
  F('Blockhead Studios', 'blockcraft', 'Blockcraft', 'simulation', 'survival', 2009),
  F('Blockhead Studios', 'sunnyvalley', 'Sunny Valley', 'simulation', 'farming', 2012),
  F('Blockhead Studios', 'farmer', 'Farmer Simulator', 'simulation', 'farming', 2008, 'y'),
  F('Blockhead Studios', 'cubesurvive', 'Cube Survivors', 'adventure', 'survival', 2014),
  // Konomi: skräck, smyg och gamla klassiker
  F('Konomi', 'contrary', 'Contrary', 'shooter', 'aliens', 1987),
  F('Konomi', 'castlevalley', 'Castlevalley', 'action', 'horror', 1986),
  F('Konomi', 'metalgearbox', 'Metal Gearbox', 'action', 'military', 1998, 'r'),
  F('Konomi', 'silenthollow', 'Silent Hollow', 'adventure', 'horror', 1999),
  F('Konomi', 'profootball', 'Pro Football Evolution', 'simulation', 'sports', 1996, 'y'),
  // Activate Interactive: skjutspel varje höst
  F('Activate Interactive', 'dutycalls', 'Duty Calls', 'shooter', 'military', 2003),
  F('Activate Interactive', 'skatemaster', 'Skate Master', 'casual', 'sports', 1999),
  F('Activate Interactive', 'crashwombat', 'Crash Wombat', 'action', 'abstract', 1996),
  F('Activate Interactive', 'guitarzero', 'Guitar Zero', 'casual', 'music', 2005),
  F('Activate Interactive', 'warzonish', 'Warzone Arena', 'shooter', 'survival', 2019),
  // Epoch Games: motorer, byggen och slagfält
  F('Epoch Games', 'fortknight', 'Fortknight', 'shooter', 'survival', 2017),
  F('Epoch Games', 'gearsofpeace', 'Gears of Peace', 'shooter', 'aliens', 2006),
  F('Epoch Games', 'unrealcontest', 'Unreal Contest', 'shooter', 'robots', 1999),
  F('Epoch Games', 'rocketcars', 'Rocket Cars', 'racing', 'cars', 2015),
  F('Epoch Games', 'flightmaster', 'Flight Master', 'simulation', 'airport', 1989),
  // Namko Arcade: spelhallsklassiker och bilspel
  F('Namko Arcade', 'chompman', 'Chomp-Man', 'action', 'abstract', 1980),
  F('Namko Arcade', 'galagan', 'Galagan', 'shooter', 'space', 1981),
  F('Namko Arcade', 'spaceintruders', 'Space Intruders', 'shooter', 'space', 1980),
  F('Namko Arcade', 'tetrix', 'Tetrix', 'casual', 'abstract', 1985),
  F('Namko Arcade', 'ridgerunner', 'Ridge Runner', 'racing', 'cars', 1993),
  F('Namko Arcade', 'grandtourismo', 'Grand Tourismo', 'racing', 'cars', 1997),
  F('Namko Arcade', 'fistken', 'Fistken', 'action', 'ninjas', 1994),
  F('Namko Arcade', 'darkspirits', 'Dark Spirits', 'rpg', 'fantasy', 2011),
  // Ubiquity Soft: öppna världar med många ikoner på kartan
  F('Ubiquity Soft', 'assassinscredo', "Assassin's Credo", 'action', 'knights', 2007),
  F('Ubiquity Soft', 'farscream', 'Far Scream', 'shooter', 'survival', 2004),
  F('Ubiquity Soft', 'justprance', 'Just Prance', 'casual', 'music', 2009, 'y'),
  F('Ubiquity Soft', 'rayboy', 'Rayboy', 'action', 'fantasy', 1995),
  F('Ubiquity Soft', 'clandestine', 'Clandestine Cell', 'action', 'military', 2002),
  // Bethany Softworks: enorma världar och buggar
  F('Bethany Softworks', 'eldertomes', 'The Elder Tomes', 'rpg', 'fantasy', 1994, 'r'),
  F('Bethany Softworks', 'falloff', 'Falloff', 'rpg', 'survival', 1997),
  F('Bethany Softworks', 'doomsday', 'Doomsday', 'shooter', 'horror', 1993),
  F('Bethany Softworks', 'starfall', 'Starfall', 'rpg', 'space', 2018),
  // Vault Software: spel som blir etta på listan, och uppföljare som aldrig kommer
  F('Vault Software', 'halflight', 'Half-Light', 'shooter', 'aliens', 1998),
  F('Vault Software', 'counterstrife', 'Counter-Strife', 'shooter', 'military', 2000),
  F('Vault Software', 'doorway', 'Doorway', 'casual', 'robots', 2007),
  F('Vault Software', 'defenseancients', 'Defense of the Ancestors', 'strategy', 'fantasy', 2013),
  F('Vault Software', 'right4alive', 'Right 4 Alive', 'shooter', 'zombies', 2008),
  // Capcon: slagsmål, zombier och monsterjakt
  F('Capcon', 'streetbrawler', 'Street Brawler', 'action', 'ninjas', 1987),
  F('Capcon', 'residentdread', 'Resident Dread', 'adventure', 'zombies', 1996),
  F('Capcon', 'megamech', 'Mega Mech', 'action', 'robots', 1987),
  F('Capcon', 'monsterstalker', 'Monster Stalker', 'rpg', 'dinosaurs', 2004),
  F('Capcon', 'devilmayscream', 'Devil May Scream', 'action', 'horror', 2001),
  // Rockstorm Games: stor stad, stora skandaler
  F('Rockstorm Games', 'grandlarceny', 'Grand Larceny Auto', 'action', 'mafia', 1997, 'r'),
  F('Rockstorm Games', 'deadredemption', 'Dead Redemption', 'action', 'western', 2004),
  F('Rockstorm Games', 'maxpain', 'Max Pain', 'shooter', 'detective', 2001),
  F('Rockstorm Games', 'midnightcrew', 'Midnight Crew', 'racing', 'cars', 2000),
  F('Rockstorm Games', 'schoolyard', 'Schoolyard Bully', 'action', 'school', 2006),
  // Hikari Games: maskoter, äventyr och samlarmonster
  F('Hikari Games', 'mustache', 'Super Mustache Bros', 'action', 'fantasy', 1985, 'x'),
  F('Hikari Games', 'elda', 'The Legend of Elda', 'adventure', 'fantasy', 1987),
  F('Hikari Games', 'pocketbeasts', 'Pocket Beasts', 'rpg', 'fantasy', 1996),
  F('Hikari Games', 'mustachekart', 'Mustache Kart', 'racing', 'cars', 1992),
  F('Hikari Games', 'smashbrawlers', 'Smash Brawlers', 'action', 'heroes', 1999),
  F('Hikari Games', 'animalvillage', 'Animal Village', 'simulation', 'farming', 2001),
  F('Hikari Games', 'cookingmommy', 'Cooking Mommy', 'casual', 'cooking', 2006),
];
export const FRANCHISE = Object.fromEntries(FRANCHISES.map((f) => [f.id, f]));

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
// Titeln på installation n (0 = första) ett visst år. 'x' är som 'n' men med en undertitel som byter varje gång efter första.
const SUBS = ['Reborn', 'Origins', 'Legacy', 'Odyssey', 'Unleashed', 'Forever', 'Rising', 'Revolution', 'Chronicles', 'Horizons'];
export function frTitle(f, n, year) {
  let s = f.name;
  if (f.kind === 'y') s = `${f.name} ${year}`;
  else if (n > 0 && f.kind === 'r') s = `${f.name} ${ROMAN[n + 1] || n + 1}`;
  else if (n > 0 && f.kind === 'x') s = `${f.name}: ${SUBS[(n - 1) % SUBS.length]}`;
  else if (n > 0) s = `${f.name} ${n + 1}`;
  return { sv: s, en: s };
}
