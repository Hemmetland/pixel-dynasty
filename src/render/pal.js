import { shade } from '../core/util.js';

// Karaktärspaletter: nya färger läggs sist så att gamla index (och sparfiler) betyder samma sak.
export const SKINS = ['#f6d6b8', '#eab68c', '#cb8e64', '#9c6342', '#6b4229', '#fbe4d4', '#b97a57'];
export const HAIRS = ['#22160f', '#4a2e1c', '#7a4a26', '#b07c3a', '#e6c46a', '#b8452a', '#8c8c9a', '#3a6fd0', '#d4509a', '#eceae2', '#e07a2e', '#33c2b0', '#8a56dc', '#25304e'];
export const SHIRTS = ['#e8504a', '#f2a63a', '#f0d24a', '#6cc86a', '#3fb8a8', '#4a90e0', '#7a6ae0', '#c860c8', '#e8e8f0', '#2a3042', '#d8704a', '#5a8a5a', '#9ac8f0', '#2a6a8a', '#9a3a52', '#6a4a8a', '#e89aa8', '#8aa23c'];
export const PANTS = ['#2b3350', '#3b3b46', '#5a4a3a', '#5f7298', '#1d2230', '#9a8662', '#6f8bb5', '#4f5f3a'];
// Tillbehör (härleds ur utseendet, inga egna fält): mössor/kepsar, hörlurar och ryggsäckar, skor, glasögonbågar.
export const HATS = ['#e8504a', '#3a6fd0', '#2a3042', '#f2a63a', '#3fb8a8', '#8a56dc', '#e8e8f0', '#6cc86a', '#9a3a52'];
export const GEAR = ['#e8504a', '#3fb8a8', '#f2c84a', '#e86aa8', '#4a90e0', '#9a6ae0', '#f2883a'];
export const SHOES = ['#1c1c28', '#f0f0f8', '#e8504a', '#6b4229', '#3a5a98', '#2a2a30', '#f2c84a'];
export const FRAMES = ['#20242c', '#e8504a', '#2a6a8a', '#c8a050', '#f0f0f8', '#8a56dc'];

export const PAL = {
  ink: '#10121c',
  outline: '#1b1e2e',
  wood: '#a8774a', woodHi: '#c99562', woodLo: '#7c5232', woodDk: '#5a3a22',
  metal: '#9aa4b8', metalHi: '#c8d0e0', metalLo: '#6a7488', metalDk: '#3a4256',
  beige: '#d8c8a8', beigeLo: '#b0a080', beigeHi: '#ece0c4',
  screen: '#10202a', screenGlow: '#7cf2ff',
  paper: '#f4f0e4',
  green: '#4fa65a', greenLo: '#2f7a40', greenHi: '#7bd283',
  pot: '#c8643a', potLo: '#9a4424',
  red: '#e8504a', blue: '#4a90e0', yellow: '#f2c84a', orange: '#f2883a', purple: '#8a6ae0', pink: '#e86aa8', teal: '#3fb8a8',
  white: '#f4f6ff',
  glass: '#9fd6ff',
};

export const hexShade = shade;

// Väggfärger per våning (tapet) – ljus bas, mörk list.
export const WALLS = [
  { a: '#cdbfa6', b: '#c1b298', trim: '#8a7a5e', dado: '#9a8a70' },
  { a: '#b9c9d6', b: '#adbfce', trim: '#6f8296', dado: '#8196aa' },
  { a: '#d6c0c0', b: '#caB0b0'.toLowerCase(), trim: '#8a6a6a', dado: '#a08080' },
  { a: '#c2d4c0', b: '#b4c8b2', trim: '#6c866a', dado: '#869e84' },
  { a: '#d4cdb8', b: '#c8c0aa', trim: '#85795e', dado: '#9c9078' },
];

// ── Studiohuset (v2): neon, grafit och rumsstilar ──
export const NEON = {
  cyan: '#4de1ff', cyanHi: '#c8faff', cyanLo: '#1a8aa8',
  magenta: '#ff4fb8', magentaHi: '#ffc0e6', magentaLo: '#a82a78',
  purple: '#a46bff', purpleLo: '#5a3aa8',
  green: '#5cf2a0', orange: '#ffa04a', yellow: '#ffe27a',
};
export const GRAPH = { ink: '#0e1018', dk: '#161a26', mid: '#232838', lt: '#323a50', hi: '#4a5470', rim: '#6a769a' };

// Rumsstilar. wall/wall2: bakvägg och rand, dado: nedre panel, trim: list, floor/floorHi: golvband,
// light: rumsljus som flyttal 0..1 (samma skala som ljuskällor i scene-gl).
export const ROOM_STYLE = {
  lobby: { wall: '#d6cab6', wall2: '#cabda8', dado: '#33474f', trim: '#7a8e96', floor: '#6a5648', floorHi: '#8a7260', light: [1, 0.86, 0.62] },
  lounge: { wall: '#6c5aa2', wall2: '#604f94', dado: '#3a3068', trim: '#9a88cc', floor: '#4c3f72', floorHi: '#675792', light: [0.78, 0.58, 1] },
  dev: { wall: '#e4d4b0', wall2: '#d8c7a0', dado: '#6e5a48', trim: '#a48a6a', floor: '#7a6a5a', floorHi: '#9a8670', light: [1, 0.82, 0.52] },
  meeting: { wall: '#6288ac', wall2: '#587ea2', dado: '#3a5a80', trim: '#a8c4de', floor: '#465872', floorHi: '#62748e', light: [1, 0.93, 0.8] },
  kitchen: { wall: '#eed48a', wall2: '#e4c87a', dado: '#c8683a', trim: '#a8582e', floor: '#b8a888', floorHi: '#d6c8a8', light: [1, 0.88, 0.56] },
  server: { wall: '#1e2c4c', wall2: '#18253f', dado: '#101a32', trim: '#3a5a92', floor: '#0e162a', floorHi: '#22345a', light: [0.4, 0.66, 1] },
  whiteboard: { wall: '#d8dcea', wall2: '#cacee0', dado: '#7e86aa', trim: '#9aa2c4', floor: '#8a7a6a', floorHi: '#a8987e', light: [0.84, 0.92, 1] },
  facility: { wall: '#cfc6b8', wall2: '#c2b8a8', dado: '#5a5a6a', trim: '#8a8a9c', floor: '#6a6458', floorHi: '#8a826e', light: [1, 0.88, 0.66] },
};
// Variationer: öppna kontor per våning och anläggningsrum per plats (v = våning resp. platsnummer).
const DEV_WALLS = [
  { wall: '#e6c690', wall2: '#dcb97e', dado: '#6e5240', trim: '#a07c52', light: [1, 0.8, 0.46] },
  { wall: '#efd6a0', wall2: '#e4c98e', dado: '#58607a', trim: '#8a8aa0', light: [1, 0.84, 0.54] },
  { wall: '#e8bc9a', wall2: '#dcae8a', dado: '#5a4a5e', trim: '#9a7a78', light: [1, 0.76, 0.52] },
];
const FAC_WALLS = [
  { wall: '#6f9a98', wall2: '#648e8c', dado: '#26474e', trim: '#4a8888', light: [0.8, 1, 0.92] },
  { wall: '#8c7ec0', wall2: '#8070b4', dado: '#3a3068', trim: '#7466aa', light: [0.88, 0.78, 1] },
  { wall: '#b87e6c', wall2: '#aa7060', dado: '#603a3a', trim: '#98665a', light: [1, 0.82, 0.7] },
  { wall: '#4a6a8c', wall2: '#40608a', dado: '#1c2c48', trim: '#4a76a8', light: [0.8, 0.92, 1] },
  { wall: '#3a3458', wall2: '#322c4e', dado: '#1a1830', trim: '#6a58a8', light: [0.9, 0.7, 1] },
  { wall: '#4f7a58', wall2: '#46704e', dado: '#223a2c', trim: '#6a9a6c', light: [0.92, 1, 0.8] },
];
export const roomStyle = (type, v = 0) => {
  const base = ROOM_STYLE[type] || ROOM_STYLE.facility;
  if (type === 'dev') return { ...base, ...DEV_WALLS[v % DEV_WALLS.length] };
  if (type === 'facility') return { ...base, ...FAC_WALLS[v % FAC_WALLS.length] };
  return base;
};
