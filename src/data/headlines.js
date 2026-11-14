// Branschnyheter: korta rubriker som dyker upp ibland för att världen ska kännas levande. Bara uppvisning, inget i spelet
// läser dem. Texterna ligger i strings.js under hl.<id>. from/to = åren rubriken passar, need = vad som måste finnas:
// rival (en konkurrent), trend (en het genre), game (ett eget spel släppt senaste halvåret med betyg 7,5 eller mer) eller
// fans (minst 500 fans). Variabler i texterna: {rival}, {genre}, {title}, {studio}.
const H = (id, from, to, need = '') => ({ id, from, to, need });
export const HEADLINES = [
  H('arcade', 1980, 1985),
  H('crash83', 1983, 1985),
  H('homecomp', 1984, 1992),
  H('colour', 1986, 1994),
  H('cdrom', 1993, 1999),
  H('internet', 1996, 2003),
  H('card3d', 1996, 2004),
  H('dotcom', 2000, 2002),
  H('lan', 1999, 2007),
  H('mobile', 2008, 2016),
  H('stream', 2010, 2030),
  H('micro', 2011, 2030),
  H('indie', 2012, 2030),
  H('cloud', 2018, 2030),
  H('ai', 2022, 2030),
  H('rumor', 1980, 2030, 'rival'),
  H('hiring', 1985, 2030, 'rival'),
  H('hotgenre', 1980, 2030, 'trend'),
  H('trendforum', 1996, 2030, 'trend'),
  H('surprise', 1980, 2030, 'game'),
  H('forum', 1996, 2030, 'game'),
  H('fanthread', 1996, 2030, 'fans'),
  H('press', 1980, 2030, 'fans'),
];
