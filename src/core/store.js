import { SAVE_VERSION, DIFFICULTY, newGame } from '../sim/state.js';
import { migrateLooks } from '../sim/people.js';
import { setOwnPlatforms } from '../data/platforms.js';
import { hallEntry, hallSort, founderNew } from '../sim/legacy.js';

const KEY = 'pixel-dynasty-save-v1';
const SKEY = 'pixel-dynasty-settings-v1';
const HKEY = 'pixel-dynasty-hall-v1';
const HALL_MAX = 20;

export const DEFAULT_SETTINGS = { lang: null, music: true, sfx: true, musicVol: 0.5, musicStyle: 'auto', sfxVol: 0.7, crt: false, hd: false, reduced: false, menuPause: true, tutorial: true, speed: 2, pace: 'normal' };

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

// Studiohallen: tidigare studior, bäst först. En studio skrivs in när de fyrtio åren är slut eller vid konkurs, och
// raden uppdateras om studion spelar vidare.
export function loadHall() {
  try {
    const a = JSON.parse(localStorage.getItem(HKEY) || '[]');
    return Array.isArray(a) ? hallSort(a.filter((x) => x && x.id && x.studio)) : [];
  } catch {
    return [];
  }
}
export function recordRun(G) {
  try {
    const e = hallEntry(G);
    const others = loadHall().filter((x) => x.id !== e.id);
    const list = hallSort([...others, e]).slice(0, HALL_MAX);
    localStorage.setItem(HKEY, JSON.stringify(list));
    // jämförs med hallen utan den här studions rad, så att svaret blir detsamma även när autosparningen redan skrivit in raden
    return { place: list.findIndex((x) => x.id === e.id) + 1, of: list.length, unlocked: founderNew(others, list) };
  } catch {
    return null;
  }
}

// Sparplatser: fem platser. Plats 1 ligger kvar under den gamla nyckeln, så äldre sparningar laddar som förut; plats 2 till 5
// får egna nycklar. Autosparningen skriver i den aktiva platsen (den som valdes när spelet startades eller laddades).
export const SLOTS = 5;
const slotKey = (n) => (n === 1 ? KEY : `${KEY}-s${n}`);
const validSlot = (n) => Number.isInteger(n) && n >= 1 && n <= SLOTS;
let active = 1;
export const activeSlot = () => active;
export function useSlot(n) {
  if (validSlot(n)) active = n;
  return active;
}
function readSlot(n) {
  try {
    const d = JSON.parse(localStorage.getItem(slotKey(n)) || 'null');
    return d && d.G ? d : null;
  } catch {
    return null;
  }
}
// Alla platser med det som visas i listan: [{ slot, meta | null }]
export function slotList() {
  const out = [];
  for (let n = 1; n <= SLOTS; n++) {
    const d = readSlot(n);
    out.push({ slot: n, meta: d && d.meta ? { ...d.meta, over: d.meta.over ?? !!d.G?.over } : d ? { studio: d.G.studio, t: d.G.t, money: d.G.money, games: (d.G.games || []).length, staff: (d.G.staff || []).length, over: !!d.G.over, at: 0 } : null });
  }
  return out;
}
// Platsen som senast sparades (och är spelbar om playable), annars 0
export function latestSlot(playable = false) {
  let best = 0;
  let at = -1;
  for (const x of slotList()) {
    if (!x.meta || (playable && x.meta.over)) continue;
    if ((x.meta.at || 0) > at) {
      at = x.meta.at || 0;
      best = x.slot;
    }
  }
  return best;
}
// Första lediga platsen (en tom, annars 0). Platser där studion gått i konkurs räknas inte som lediga: de skrivs över bara med flit.
export const freeSlot = () => (slotList().find((x) => !x.meta) || { slot: 0 }).slot;
export function hasSave(n) {
  if (n) return !!readSlot(n);
  return slotList().some((x) => x.meta);
}
// Det som visas för en plats (utan platsnummer: den senast sparade)
export function saveMeta(n) {
  const list = slotList();
  const x = n ? list.find((y) => y.slot === n) : list.find((y) => y.slot === latestSlot());
  return x ? x.meta : null;
}
export function saveGame(G, n = active) {
  try {
    const meta = { studio: G.studio, t: G.t, money: G.money, games: G.games.length, staff: G.staff.length, over: !!G.over, at: Date.now() };
    localStorage.setItem(slotKey(n), JSON.stringify({ v: SAVE_VERSION, meta, G }));
    if (G.over || (G.flags && G.flags.ending)) recordRun(G);
    return true;
  } catch {
    return false;
  }
}
// Laddar en plats (utan platsnummer: den senast sparade spelbara) och gör den aktiv
export function loadGame(n) {
  try {
    const slot = n || latestSlot(true) || latestSlot();
    const d = slot ? readSlot(slot) : null;
    if (!d) return null;
    const G = migrate(d.G);
    useSlot(slot);
    return G;
  } catch {
    return null;
  }
}
export function deleteSave(n = active) {
  try {
    localStorage.removeItem(slotKey(n));
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
  G.staff = G.staff || [];
  G.nextId = G.nextId || 1 + Math.max(1, ...G.staff.map((s) => s.id), ...(G.candidates || []).map((c) => c.id));
  // Fyll i fält som saknas i äldre sparningar ur en ny mall (en nivå ner); befintliga värden och personal rörs inte
  const T = newGame({ seed: G.seed ?? 1, difficulty: DIFFICULTY[G.difficulty] ? G.difficulty : undefined, archetype: G.archetype });
  for (const [k, v] of Object.entries(T)) {
    if (k === 'staff') continue;
    if (G[k] === undefined) G[k] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v) && G[k] && typeof G[k] === 'object' && !Array.isArray(G[k])) {
      for (const [k2, v2] of Object.entries(v)) if (G[k][k2] === undefined) G[k][k2] = v2;
    }
  }
  G.v = SAVE_VERSION;
  migrateLooks(G);
  if (G.hw) G.hw.plats ||= [];
  setOwnPlatforms(G.hw ? G.hw.plats : []);
  return G;
}
