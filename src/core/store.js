import { SAVE_VERSION } from '../sim/state.js';

const KEY = 'pixel-dynasty-save-v1';
const SKEY = 'pixel-dynasty-settings-v1';

export const DEFAULT_SETTINGS = { lang: null, music: true, sfx: true, musicVol: 0.5, sfxVol: 0.7, crt: false, hd: false, reduced: false, menuPause: true, tutorial: true, speed: 2 };

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SKEY) || 'null');
    return { ...DEFAULT_SETTINGS, ...(s || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
export function saveSettings(s) {
  try {
    localStorage.setItem(SKEY, JSON.stringify(s));
  } catch { /* privat läge */ }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}
export function saveMeta() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d.meta || null;
  } catch {
    return null;
  }
}
export function saveGame(G) {
  try {
    const meta = { studio: G.studio, t: G.t, money: G.money, games: G.games.length, staff: G.staff.length, at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, meta, G }));
    return true;
  } catch {
    return false;
  }
}
export function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d || !d.G) return null;
    return migrate(d.G);
  } catch {
    return null;
  }
}
export function deleteSave() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* */ }
}
// Exportkod: base64 av JSON
export function exportCode(G) {
  const json = JSON.stringify({ v: SAVE_VERSION, G });
  return btoa(unescape(encodeURIComponent(json)));
}
export function importCode(code) {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    const d = JSON.parse(json);
    if (!d || !d.G) return null;
    return migrate(d.G);
  } catch {
    return null;
  }
}
function migrate(G) {
  G.pending = G.pending || [];
  G.news = G.news || [];
  G.flags = G.flags || {};
  G.know = G.know || { combos: {}, focus: {} };
  G.logo = G.logo ?? 0;
  G.hist = G.hist || { cash: [], revenue: [], fans: [] };
  G.market = G.market || { releases: [], trend: { genre: [], topic: [] } };
  G.uid = G.uid || 1000;
  return G;
}
