import { rnd, rint, rrange, pick } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { CLIENTS, BRIEFS } from '../data/events.js';
import { PLATFORM, techMult } from '../data/platforms.js';
import { SCOPES, yearOf, moneyScale, TICKS_PER_WEEK } from './const.js';
import { earn } from './studio.js';
import { teamOutput } from './dev.js';
import { t } from '../core/i18n.js';

export function makeContract(G) {
  const year = yearOf(G.t);
  const k = pick(G, [1, 1, 2, 2, 3]);
  const weeks = [0, 3, 5, 8][k];
  const par = SCOPES.small.par * techMult(PLATFORM.pc, year) * [0, 0.55, 0.9, 1.4][k];
  const ticks = weeks * TICKS_PER_WEEK;
  const reqD = Math.round(par * ticks * rrange(G, 0.55, 0.85));
  const reqT = Math.round(par * ticks * rrange(G, 0.55, 0.85));
  const ppp = 11 * moneyScale(year);
  return {
    id: G.uid++,
    client: rint(G, 0, CLIENTS.length - 1),
    brief: rint(G, 0, BRIEFS.length - 1),
    weeks, reqD, reqT,
    reward: Math.round(((reqD + reqT) * ppp * rrange(G, 0.9, 1.35)) / 50) * 50,
    expires: G.t + rint(G, 6, 14),
  };
}
export function refreshContracts(G) {
  G.contracts = G.contracts.filter((c) => c.expires > G.t);
  while (G.contracts.length < 3 && rnd(G) < 0.8) G.contracts.push(makeContract(G));
  if (G.contracts.length < 2) G.contracts.push(makeContract(G));
}
export function acceptContract(G, id) {
  if (G.job) return t('err.busy');
  const c = G.contracts.find((x) => x.id === id);
  if (!c) return false;
  G.contracts = G.contracts.filter((x) => x.id !== id);
  G.job = { kind: 'contract', id: c.id, c, ticks: 0, total: c.weeks * TICKS_PER_WEEK, D: 0, T: 0, state: 'dev', phase: 0 };
  emit('jobStart', G.job);
  return true;
}
export function contractTick(G) {
  const J = G.job;
  if (!J || J.kind !== 'contract' || J.state !== 'dev') return;
  const out = teamOutput(G, { scope: 'small', crunch: false }, 0.5);
  J.D += out.d;
  J.T += out.t;
  J.ticks++;
  if (J.ticks % 3 === 0 && out.ws.length) emit('float', { staff: out.ws[rint(G, 0, out.ws.length - 1)].id, kind: rnd(G) < 0.5 ? 'design' : 'tech', amount: Math.round((out.d + out.t) / 2 / out.n) });
  const ok = J.D >= J.c.reqD && J.T >= J.c.reqT;
  if (ok || J.ticks >= J.total) {
    J.state = 'done';
    if (ok) {
      earn(G, J.c.reward, 'contracts');
      G.stats.contracts++;
      G.fans += 5;
      emit('contractDone', { ok: true, c: J.c });
    } else emit('contractDone', { ok: false, c: J.c });
    G.job = null;
  }
}
export function cancelContract(G) {
  if (G.job && G.job.kind === 'contract') G.job = null;
}
