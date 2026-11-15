import { t, UI, act, esc, icon, money, L } from './core.js';
import { sfx } from '../audio/sfx.js';
import { seg } from './group-tab.js';
import { teamName } from '../sim/teams.js';
import { levelOf } from '../sim/store.js';
import { shopOpen, shopTeamOf, shopOf, shopInfo, setShop, SHOP_BUDGET, SHOP_RESERVE, SHOP_ON } from '../sim/shopteam.js';

// Butiksteamets kort: överst bland butikens kampanjer. Vad teamet får köra, budgeten och hur djärvt det ska vara.
const onOff = () => [t('board.off'), t('board.on')];
export function shopCard(G, S) {
  if (!shopOpen(G)) return levelOf(G) >= 2 ? `<p class="hint" style="margin-top:10px">${icon('info')} ${t('shop.needResearch')}</p>` : '';
  const team = shopTeamOf(G);
  if (!team) {
    return `<div class="card" style="margin-top:14px"><div class="lbl" style="margin-bottom:6px">${esc(t('shop.title'))}</div>
      <p class="hint" style="margin-bottom:10px">${t('shop.needTeam')}</p>
      <button class="btn sm" data-act="shop-staff">${icon('team')}${t('shop.manage')}</button></div>`;
  }
  const P = shopOf(G);
  const inf = shopInfo(G, team);
  const pct = Math.round(inf.eff * 100);
  const blk = (label, ctl) => `<div><div class="lbl" style="margin-bottom:6px">${label}</div>${ctl}</div>`;
  const kind = (key) => blk(t('shop.' + key), seg(onOff(), P[key], 'shop-set', key, () => t('shop.' + key + 'Tip')));
  const ctl = `<div class="grp-ctl">
    ${blk(t('shop.on'), seg(onOff(), P.on, 'shop-set', 'on'))}
    ${kind('deal')}${kind('spot')}${kind('bundle')}${kind('theme')}
    ${blk(t('shop.budget'), seg([0, 1, 2].map((i) => t('shop.b.' + i)), P.budget, 'shop-set', 'budget', (i) => t('shop.budgetTip', { pct: Math.round(SHOP_BUDGET[i] * 100), v: money(Math.round(SHOP_BUDGET[i] * Math.max(0, G.money))) })))}
    ${blk(t('shop.aggro'), seg([0, 1, 2].map((i) => t('shop.a.' + i)), P.aggro, 'shop-set', 'aggro', (i) => t('shop.aggroTip.' + i)))}
  </div>`;
  const n = P.n;
  const tot = n.deal + n.spot + n.bundle + n.theme ? `<p class="hint" style="margin-top:8px">${t('shop.totals', { a: n.deal, b: n.spot, c: n.bundle, d: n.theme, v: money(Math.round(P.fee)) })}</p>` : '';
  const tip = t('shop.statusTip', { a: Math.round(inf.lift * 100), b: Math.round(inf.fee * 100) });
  return `<div class="card" style="margin-top:14px"><div class="row wrap" style="gap:8px;margin-bottom:6px"><div class="lbl">${esc(t('shop.title'))}</div><span class="sp"></span>
      <span class="tag" style="--c:${inf.eff >= SHOP_ON ? 'var(--good)' : 'var(--warn)'}" data-tip="${esc(tip)}">${t('shop.status', { team: esc(L(teamName(team))), n: pct })}</span>
      <button class="btn sm ghost" data-act="shop-staff">${icon('team')}${t('shop.manage')}</button></div>
    <p class="hint" style="margin-bottom:10px">${t('shop.help', { n: SHOP_RESERVE })}</p>${ctl}${tot}</div>`;
}

act('shop-set', (el) => {
  if (setShop(UI.app.G, el.dataset.id, +el.dataset.i)) sfx.play('click');
  UI.refresh();
});
act('shop-staff', () => UI.open('staff'));
