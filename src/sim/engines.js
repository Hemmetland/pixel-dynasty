import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { FEAT } from '../data/research.js';
import { yfOf, TICKS_PER_WEEK } from './const.js';
import { spend } from './studio.js';
import { engineEff } from './const.js';

export function engineCost(featIds) {
  return featIds.reduce((s, id) => s + FEAT[id].cost, 0);
}
export function engineTech(featIds) {
  return featIds.reduce((s, id) => s + FEAT[id].tech, 0);
}
export function engineWeeks(featIds) {
  return Math.max(3, 2 + Math.ceil(engineTech(featIds) / 9));
}
export function buildEngine(G, name, featIds) {
  if (!G.u.flags.engines) return 'locked';
  if (G.job) return t('err.busy');
  featIds = featIds.filter((id) => G.u.feats.includes(id));
  if (featIds.length < 2) return 'few';
  const cost = engineCost(featIds);
  if (G.money < cost) return t('err.money');
  spend(G, cost, 'engines');
  G.job = {
    kind: 'engine', id: G.uid++, name: name || t('misc.engine'), feats: featIds, ticks: 0,
    total: engineWeeks(featIds) * TICKS_PER_WEEK, state: 'dev', phase: 0, cost,
  };
  emit('jobStart', G.job);
  return true;
}
export function engineTick(G) {
  const J = G.job;
  if (!J || J.kind !== 'engine') return;
  J.ticks++;
  if (J.ticks >= J.total) {
    const e = { id: G.uid++, name: J.name, feats: J.feats, tech: engineTech(J.feats), built: yfOf(G.t) };
    G.engines.push(e);
    G.job = null;
    emit('engineDone', e);
  }
}
export const currentEff = (G, e) => engineEff(e, yfOf(G.t));
