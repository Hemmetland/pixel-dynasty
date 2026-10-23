export const FIRST = [
  'Alma', 'Axel', 'Ines', 'Noah', 'Maja', 'Elias', 'Freja', 'Oskar', 'Ebba', 'Leo', 'Saga', 'Viktor', 'Ida', 'Hugo',
  'Mira', 'Theo', 'Nora', 'Liam', 'Aino', 'Kasper', 'Yuki', 'Kenji', 'Hana', 'Ravi', 'Priya', 'Omar', 'Layla', 'Mateo',
  'Lucia', 'Diego', 'Sofia', 'Marco', 'Chiara', 'Jonas', 'Greta', 'Felix', 'Mila', 'Jakob', 'Anya', 'Dmitri', 'Zara',
  'Tariq', 'Amara', 'Kofi', 'Naomi', 'Eli', 'Ruth', 'Jules', 'Camille', 'Pierre', 'Elin', 'Rasmus', 'Sigrid', 'Bo',
  'Tilda', 'Arvid', 'Wilma', 'Folke', 'Siri', 'Gustav', 'Lykke', 'Soren', 'Mei', 'Jin', 'Aiko', 'Tomas', 'Petra', 'Ivo',
  'Astrid', 'Linnea', 'Vera', 'Edvin', 'Malte', 'Stina', 'Agnes', 'Loke', 'Tove', 'Albin', 'Hedda', 'Melker', 'Juni', 'Ture',
  'Signe', 'Valter', 'Ronja', 'Ville', 'Emil', 'Klara', 'Henrik', 'Lisa', 'Anton', 'Hanna', 'Sami', 'Leila', 'Farah', 'Yusuf',
  'Selin', 'Emre', 'Ana', 'Pablo', 'Rosa', 'Joao', 'Lena', 'Pavel', 'Olga', 'Marek', 'Zofia', 'Ingrid', 'Magnus', 'Kalle',
  'Wei', 'Lin', 'Hiro', 'Sana', 'Min', 'Arjun', 'Neha', 'Kwame', 'Ama', 'Chidi', 'Zainab', 'Malik', 'Grace', 'Owen',
];
export const LAST = [
  'Lindqvist', 'Berg', 'Ekström', 'Nyström', 'Holm', 'Sandberg', 'Strand', 'Falk', 'Vik', 'Dahl', 'Moberg', 'Lund',
  'Hedlund', 'Sjöberg', 'Nakamura', 'Tanaka', 'Sato', 'Okafor', 'Mensah', 'Khan', 'Patel', 'Rossi', 'Moretti', 'García',
  'Silva', 'Novak', 'Kowalski', 'Petrov', 'Weber', 'Fischer', 'Dubois', 'Laurent', 'Hansen', 'Jensen', 'Virtanen', 'Korhonen',
  'Murphy', 'Walsh', 'Cooper', 'Reed', 'Hayes', 'Brooks', 'Chen', 'Park', 'Kim', 'Nguyen', 'Costa', 'Haddad', 'Aydin',
  'Åkesson', 'Bergman', 'Engström', 'Forsberg', 'Granqvist', 'Hellström', 'Isaksson', 'Jonsson', 'Karlsson', 'Lindgren',
  'Mattsson', 'Nordin', 'Öberg', 'Pettersson', 'Rydén', 'Söderberg', 'Wallin', 'Ahonen', 'Lehtonen', 'Solberg', 'Bakke',
  'Yilmaz', 'Demir', 'Rahman', 'Hossain', 'Singh', 'Gupta', 'Wang', 'Liu', 'Zhang', 'Yamamoto', 'Kobayashi', 'Choi',
  'Santos', 'Ferreira', 'López', 'Romero', 'Ricci', 'Bianchi', 'Schmidt', 'Wagner', 'Martin', 'Bernard', 'Adeyemi', 'Boateng',
];
export const STUDIO_NAMES = [
  'Nordlys Games', 'Garage Gold', 'Kitchen Table Studios', 'Brightside Bytes', 'Pixel Pioneers', 'Lantern Works',
  'Mossy Rock Games', 'Tiny Titan Studio', 'Late Night Labs', 'Blue Tape Games', 'Copper Cat', 'Wild Cursor',
];
// Små oberoende studior som söker förlag (förlagsverksamheten), med färg för kortet.
export const INDIES = [
  ['Fjällbit', '#7ad0ff'], ['Night Owl Works', '#b8a0ff'], ['Paper Lantern', '#ffb08a'], ['Rusty Spoon', '#e88a5a'],
  ['Hollow Oak', '#8ac87a'], ['Pocket Comet', '#ffd66a'], ['Glasbruket', '#8ae8e0'], ['Little Lighthouse', '#ff8a9a'],
  ['Basement Bard', '#c8a0ff'], ['Snowdrift Studio', '#d8e8ff'], ['Two Ferns', '#6cc86a'], ['Moth & Moon', '#a0a8ff'],
  ['Kvarnen Spel', '#f2c84a'], ['Odd Socks', '#ff7aa8'], ['Tin Robot', '#9ab0c8'], ['Starling Games', '#5ab0ff'],
  ['Brass Beetle', '#e0b040'], ['Quiet Harbor', '#4ad0c0'], ['Sockerbit', '#ff9ad0'], ['Ember & Ash', '#ff7050'],
];
export const COMPETITORS = [
  ['Brightside Games', '#ffcf4a'], ['Kraken Studios', '#4ae0c8'], ['Hexa Interactive', '#9b7bff'],
  ['Polar Pixel', '#7ad0ff'], ['Nimbus Entertainment', '#e8e8ff'], ['Ironclad Soft', '#ff7a5c'],
  ['Moonwolf Games', '#b8c0ff'], ['Atlas Arcade', '#f6b84a'], ['Vantage Digital', '#4aa8ff'],
  ['Sundial Studio', '#ffb08a'], ['Frostbyte', '#8ae8ff'], ['Orca Interactive', '#5a8aff'],
  ['Redshift Games', '#ff5c7a'], ['Cobalt Crew', '#3a6aff'],
];
// Titelbyggstenar för slumpad speltitel. Svenska adjektiv i svag form och substantiv i bestämd form ("Mörka Legenden").
// Substantiven får inte sluta på s (genitiv i "Legendens mörka hemlighet").
export const TITLE_PARTS = {
  adj: {
    sv: ['Sista', 'Mörka', 'Glömda', 'Eviga', 'Röda', 'Tysta', 'Vilda', 'Förlorade', 'Gyllene', 'Blå', 'Heta', 'Hemliga', 'Lilla', 'Stora', 'Rasande', 'Magiska',
      'Iskalla', 'Brinnande', 'Fallna', 'Dolda', 'Sjunde', 'Uråldriga', 'Stulna', 'Trasiga', 'Ensamma', 'Elektriska', 'Vita', 'Svarta'],
    en: ['Last', 'Dark', 'Forgotten', 'Eternal', 'Crimson', 'Silent', 'Wild', 'Lost', 'Golden', 'Blue', 'Burning', 'Secret', 'Tiny', 'Mighty', 'Raging', 'Arcane',
      'Frozen', 'Blazing', 'Fallen', 'Hidden', 'Seventh', 'Ancient', 'Stolen', 'Broken', 'Lonely', 'Electric', 'White', 'Black'],
  },
  noun: {
    sv: ['Horisonten', 'Imperiet', 'Legenden', 'Gränsen', 'Uppdraget', 'Väktaren', 'Resan', 'Kronan', 'Striden', 'Fästet', 'Kometen', 'Labyrinten', 'Nyckeln', 'Stjärnan', 'Skuggan', 'Odysséen',
      'Tornet', 'Ön', 'Riket', 'Portalen', 'Ekot', 'Stormen', 'Spegeln', 'Arvet', 'Valvet', 'Profetian', 'Draken', 'Staden'],
    en: ['Horizon', 'Empire', 'Legend', 'Frontier', 'Quest', 'Guardian', 'Journey', 'Crown', 'Siege', 'Fortress', 'Comet', 'Labyrinth', 'Key', 'Star', 'Shadow', 'Odyssey',
      'Tower', 'Island', 'Kingdom', 'Portal', 'Echo', 'Storm', 'Mirror', 'Legacy', 'Vault', 'Prophecy', 'Dragon', 'City'],
  },
  suffix: {
    sv: ['Turbo', 'Deluxe', 'Evolution', 'Remix', 'Rising', 'Chronicles', 'Redux', 'Zero', 'Prime', 'Infinity'],
    en: ['Turbo', 'Deluxe', 'Evolution', 'Remix', 'Rising', 'Chronicles', 'Redux', 'Zero', 'Prime', 'Infinity'],
  },
};
// Temats egna substantiv (fyra per tema, samma ordning på båda språken). Ungefär var tredje titel använder dem.
export const TOPIC_NOUNS = {
  fantasy: { sv: ['Drakar', 'Riket', 'Trollet', 'Pärlan'], en: ['Dragons', 'Realm', 'Troll', 'Pearl'] },
  space: { sv: ['Galaxen', 'Rymdskeppet', 'Nebulosan', 'Månbasen'], en: ['Galaxy', 'Starship', 'Nebula', 'Moonbase'] },
  knights: { sv: ['Riddaren', 'Borgen', 'Svärdet', 'Turneringen'], en: ['Knight', 'Castle', 'Sword', 'Tourney'] },
  pirates: { sv: ['Piraten', 'Skattkartan', 'Kaparen', 'Skeppet'], en: ['Pirate', 'Treasure Map', 'Corsair', 'Galleon'] },
  detective: { sv: ['Fallet', 'Spåret', 'Alibit', 'Kommissarien'], en: ['Case', 'Clue', 'Alibi', 'Inspector'] },
  sports: { sv: ['Mästerskapet', 'Matchen', 'Arenan', 'Finalen'], en: ['Championship', 'Match', 'Arena', 'Finals'] },
  abstract: { sv: ['Kuben', 'Mönstret', 'Prismat', 'Pulsen'], en: ['Cube', 'Pattern', 'Prism', 'Pulse'] },
  western: { sv: ['Saloonen', 'Sheriffen', 'Prärien', 'Revolvern'], en: ['Saloon', 'Sheriff', 'Prairie', 'Revolver'] },
  ninjas: { sv: ['Skuggkrigaren', 'Shogunen', 'Klanen', 'Katanan'], en: ['Shadow Warrior', 'Shogun', 'Clan', 'Katana'] },
  vikings: { sv: ['Vikingen', 'Långskeppet', 'Valhall', 'Sagan'], en: ['Viking', 'Longship', 'Valhalla', 'Saga'] },
  horror: { sv: ['Herrgården', 'Förbannelsen', 'Mardrömmen', 'Kryptan'], en: ['Manor', 'Curse', 'Nightmare', 'Crypt'] },
  zombies: { sv: ['Smittan', 'Utbrottet', 'Horden', 'Karantänen'], en: ['Plague', 'Outbreak', 'Horde', 'Quarantine'] },
  aliens: { sv: ['Invasionen', 'Moderskeppet', 'Signalen', 'Kontakten'], en: ['Invasion', 'Mothership', 'Signal', 'Contact'] },
  robots: { sv: ['Androiden', 'Maskinen', 'Kretsen', 'Fabriken'], en: ['Android', 'Machine', 'Circuit', 'Factory'] },
  farming: { sv: ['Gården', 'Skörden', 'Traktorn', 'Ängen'], en: ['Farm', 'Harvest', 'Tractor', 'Meadow'] },
  cooking: { sv: ['Köket', 'Receptet', 'Kocken', 'Bistron'], en: ['Kitchen', 'Recipe', 'Chef', 'Bistro'] },
  music: { sv: ['Bandet', 'Turnén', 'Scenen', 'Hitlåten'], en: ['Band', 'Tour', 'Stage', 'Hit Single'] },
  fashion: { sv: ['Catwalken', 'Kollektionen', 'Ateljén', 'Galan'], en: ['Catwalk', 'Collection', 'Atelier', 'Gala'] },
  school: { sv: ['Klassen', 'Skolbalen', 'Rasten', 'Examen'], en: ['Class', 'Prom', 'Recess', 'Graduation'] },
  hospital: { sv: ['Akuten', 'Kirurgen', 'Nattskiftet', 'Kliniken'], en: ['ER', 'Surgeon', 'Night Shift', 'Clinic'] },
  cars: { sv: ['Gatloppet', 'Turbon', 'Garaget', 'Motorvägen'], en: ['Street Race', 'Turbo', 'Garage', 'Highway'] },
  mafia: { sv: ['Familjen', 'Gudfadern', 'Kuppen', 'Syndikatet'], en: ['Family', 'Godfather', 'Heist', 'Syndicate'] },
  mythology: { sv: ['Olympen', 'Titanen', 'Oraklet', 'Gudarna'], en: ['Olympus', 'Titan', 'Oracle', 'Gods'] },
  dinosaurs: { sv: ['Dinosaurien', 'Urtiden', 'Fossilet', 'Vulkanen'], en: ['Dinosaur', 'Prehistory', 'Fossil', 'Volcano'] },
  magic: { sv: ['Trollkarlen', 'Besvärjelsen', 'Grimoiren', 'Akademin'], en: ['Wizard', 'Spell', 'Grimoire', 'Academy'] },
  military: { sv: ['Fronten', 'Bataljonen', 'Operationen', 'Basen'], en: ['Front', 'Battalion', 'Operation', 'Base'] },
  survival: { sv: ['Ödemarken', 'Lägret', 'Vildmarken', 'Bunkern'], en: ['Wasteland', 'Camp', 'Wilderness', 'Bunker'] },
  heroes: { sv: ['Hjälten', 'Masken', 'Skurken', 'Manteln'], en: ['Hero', 'Mask', 'Villain', 'Cape'] },
  cyberpunk: { sv: ['Nätet', 'Neonstaden', 'Implantatet', 'Hackern'], en: ['Net', 'Neon City', 'Implant', 'Hacker'] },
  timetravel: { sv: ['Tidsmaskinen', 'Paradoxen', 'Tidslinjen', 'Portalen'], en: ['Time Machine', 'Paradox', 'Timeline', 'Portal'] },
  city: { sv: ['Metropolen', 'Stadsdelen', 'Skylinen', 'Hamnen'], en: ['Metropolis', 'District', 'Skyline', 'Harbor'] },
  airport: { sv: ['Flygplatsen', 'Piloten', 'Landningsbanan', 'Hangaren'], en: ['Airport', 'Pilot', 'Runway', 'Hangar'] },
};
