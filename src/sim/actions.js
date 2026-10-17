import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { PLATFORM } from '../data/platforms.js';
import { yfOf } from './const.js';
import { spend, earn } from './studio.js';
import { platformOpen, promoPrice, hypeGain } from './dev.js';
import { patchCost } from './sales.js';
import { note } from './news.js';

export function licenseCost(G, id) {
  return Math.round(PLATFORM[id].license * (G.difficulty === 'hardcore' ? 1.1 : 1));
}
export function canLicense(G, id) {
  const p = PLATFORM[id];
  if (G.licenses.includes(id)) return 'owned';
  if (yfOf(G.t) < p.y0 + p.m0 / 12) return 'future';
  if (!platformOpen(G, id)) return 'ended';
  if (G.money < licenseCost(G, id)) return 'money';
  return true;
}
export function buyLicense(G, id) {
  const ok = canLicense(G, id);
  if (ok !== true) return ok === 'money' ? t('err.money') : false;
  spend(G, licenseCost(G, id), 'licenses');
  G.licenses.push(id);
  emit('license', PLATFORM[id]);
  return true;
}
export function patchGame(G, id) {
  const g = G.games.find((x) => x.id === id);
  if (!g || g.patched || g.ended || !G.research.done.includes('q_patch')) return false;
  const c = patchCost(G, g);
  if (G.money < c) return t('err.money');
  spend(G, c, 'patches');
  g.patched = true;
  // Försäljningslyftet följer hur buggigt spelet var vid släppet (ett felfritt spel vinner inget).
  g.patchBoost = Math.min(0.12, (g.parts?.bugRatio ?? 0) * 0.15);
  g.bugs = Math.round(g.bugs * 0.2);
  g.fansGained += 0;
  G.fans += Math.round(g.bugs * 3 + 20);
  note(G, 'news.patch', { title: g.title }, 'good');
  return true;
}
// Mässan
export function expoCost(G, level) {
  return level ? Math.round(promoPrice(G, [0, 1500, 6000][level], [0, 0.0075, 0.02][level]) / 50) * 50 : 0;
}
export function resolveExpo(G, promptId, level) {
  const i = G.pending.findIndex((p) => p.id === promptId && p.type === 'expo');
  if (i < 0) return false;
  const J = G.job;
  const go = level > 0 && J && J.kind === 'game';
  const c = go ? expoCost(G, level) : 0;
  if (go && G.money < c) return t('err.money'); // prompten ligger kvar så att ett annat val går att göra
  G.pending.splice(i, 1);
  if (go) {
    spend(G, c, 'marketing');
    J.cost += c;
    const add = hypeGain(J.hype, level === 1 ? 9 : 20);
    J.hype = Math.min(100, J.hype + add);
    G.fans += level === 1 ? 20 : 90;
    emit('expoDone', { level, add });
  }
  return true;
}
export function ackPending(G, promptId) {
  const i = G.pending.findIndex((p) => p.id === promptId);
  if (i >= 0) G.pending.splice(i, 1);
}
export function giveMoney(G, n) {
  earn(G, n, 'other');
}
