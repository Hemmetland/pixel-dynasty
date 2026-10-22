import { emit } from '../core/bus.js';

// Nyhetslogg (studions krönika): lagras som nyckel + variabler så språket kan bytas efteråt. Titlar och namn kan vara
// {sv,en}-objekt. silent = bara i loggen, utan toast (för ögonblick som redan visas på annat sätt, t.ex. ett släpp).
export function note(G, key, vars = {}, kind = 'info', silent = false) {
  G.news.unshift({ t: G.t, key, vars, kind });
  if (G.news.length > 150) G.news.pop();
  if (!silent) emit('toast', { key, vars, kind });
}
