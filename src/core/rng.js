// Seedad slumpgenerator (mulberry32). Tillståndet lever i G.rng så att
// sparade spel är deterministiska.
export function rnd(G) {
  let a = (G.rng = (G.rng + 0x6d2b79f5) | 0);
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rint = (G, a, b) => a + Math.floor(rnd(G) * (b - a + 1));
export const rrange = (G, a, b) => a + rnd(G) * (b - a);
export const chance = (G, p) => rnd(G) < p;
export const pick = (G, arr) => arr[Math.floor(rnd(G) * arr.length)];
export function gauss(G, mean = 0, sd = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd(G);
  while (v === 0) v = rnd(G);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function weighted(G, items, wf) {
  let total = 0;
  const ws = items.map((it) => {
    const w = Math.max(0, wf(it));
    total += w;
    return w;
  });
  if (total <= 0) return items[Math.floor(rnd(G) * items.length)];
  let r = rnd(G) * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
export function shuffle(G, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(G) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// Fristående PRNG från ett frö (för procedurell konst som inte ska röra G.rng).
export function seeded(seed) {
  const G = { rng: seed | 0 };
  return () => rnd(G);
}
