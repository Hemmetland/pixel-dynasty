import { hashStr } from './rng.js';

// Veckans utmaning: alla som startar en studio under samma vecka (ISO, måndag först) får samma frö och därmed samma värld
// (konkurrenter, trender, kandidater). id är '2026-W46'. d är ett datum i spelarens tid.
export function weeklyOf(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); // torsdagen i veckan avgör vilket år veckan hör till
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  const id = y + '-W' + String(w).padStart(2, '0');
  return { id, seed: hashStr('pixel-dynasty-weekly-' + id) };
}
