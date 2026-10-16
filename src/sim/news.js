import { emit } from '../core/bus.js';

// Nyhetslogg: lagras som nyckel + variabler så språket kan bytas efteråt.
export function note(G, key, vars = {}, kind = 'info') {
  G.news.unshift({ t: G.t, key, vars, kind });
  if (G.news.length > 80) G.news.pop();
  emit('toast', { key, vars, kind });
}
