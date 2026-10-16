import { shade } from '../core/util.js';

export const SKINS = ['#f6d6b8', '#eab68c', '#cb8e64', '#9c6342', '#6b4229'];
export const HAIRS = ['#22160f', '#4a2e1c', '#7a4a26', '#b07c3a', '#e6c46a', '#b8452a', '#8c8c9a', '#3a6fd0', '#d4509a'];
export const SHIRTS = ['#e8504a', '#f2a63a', '#f0d24a', '#6cc86a', '#3fb8a8', '#4a90e0', '#7a6ae0', '#c860c8', '#e8e8f0', '#2a3042', '#d8704a', '#5a8a5a'];
export const PANTS = ['#2b3350', '#3b3b46', '#5a4a3a', '#5f7298'];

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
