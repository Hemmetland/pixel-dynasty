// Minimal händelsebuss mellan sim, renderare och UI.
const subs = new Map();
export function on(type, fn) {
  if (!subs.has(type)) subs.set(type, new Set());
  subs.get(type).add(fn);
  return () => subs.get(type).delete(fn);
}
export function emit(type, payload) {
  const s = subs.get(type);
  if (s) for (const fn of [...s]) fn(payload);
}
