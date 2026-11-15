import { t, UI, act, esc, icon, money, L, bar } from './core.js';
import { sfx } from '../audio/sfx.js';
import { seg } from './group-tab.js';
import { teamName } from '../sim/teams.js';
import { engOpen, engTeamOf, engInfo, engPolicy, setEng, ENG_BUDGET, ENG_RESERVE, ENG_ON, ENG_BONUS } from '../sim/engteam.js';

// Motorteamets kort överst i fliken Motorer: vad teamet bygger just nu och hur det ska byta motor själv
const onOff = () => [t('board.off'), t('board.on')];
export function engCard(G) {
  if (!engOpen(G)) return `<p class="hint" style="margin-bottom:14px">${icon('info')} ${t('eng.needResearch')}</p>`;
  const team = engTeamOf(G);
  if (!team) {
    return `<div class="card" style="margin-bottom:16px"><div class="lbl" style="margin-bottom:6px">${esc(t('eng.title'))}</div>
      <p class="hint" style="margin-bottom:10px">${t('eng.needTeam')}</p>
      <button class="btn sm" data-act="eng-staff">${icon('team')}${t('eng.manage')}</button></div>`;
  }
  const P = engPolicy(G);
  const inf = engInfo(G, team);
  const pct = Math.round(inf.eff * 100);
  const blk = (label, ctl) => `<div><div class="lbl" style="margin-bottom:6px">${label}</div>${ctl}</div>`;
  const three = (key, keys, tip) => seg(keys.map((k) => t(k)), P[key], 'eng-set', key, tip);
  const ctl = `<div class="grp-ctl">
    ${blk(t('eng.on'), seg(onOff(), P.on, 'eng-set', 'on'))}
    ${blk(t('eng.when'), three('when', ['eng.w.0', 'eng.w.1', 'eng.w.2'], (i) => t('eng.whenTip.' + i)))}
    ${blk(t('eng.size'), three('size', ['eng.s.0', 'eng.s.1', 'eng.s.2'], (i) => t('eng.sizeTip.' + i)))}
    ${blk(t('eng.budget'), three('budget', ['eng.b.0', 'eng.b.1', 'eng.b.2'], (i) => t('eng.budgetTip', { pct: Math.round(ENG_BUDGET[i] * 100), v: money(Math.round(ENG_BUDGET[i] * Math.max(0, G.money))) })))}
  </div>`;
  const p = team.ep;
  const busy = p
    ? `<div style="margin:0 0 12px"><div class="row" style="gap:8px"><b class="ell" style="flex:1;min-width:0">${t('eng.building', { name: esc(p.name) })}</b><span class="num faint">${Math.round(Math.min(1, p.w / p.need) * 100)}%</span></div>${bar(Math.min(1, p.w / p.need) * 100, 'var(--accent)')}</div>`
    : '';
  const tot = P.n ? `<p class="hint" style="margin-top:8px">${t('eng.totals', { a: P.n, v: money(Math.round(P.fee)) })}</p>` : '';
  const tip = t('eng.statusTip', { a: Math.round(ENG_BONUS * 100) });
  return `<div class="card" style="margin-bottom:16px"><div class="row wrap" style="gap:8px;margin-bottom:6px"><div class="lbl">${esc(t('eng.title'))}</div><span class="sp"></span>
      <span class="tag" style="--c:${inf.eff >= ENG_ON ? 'var(--good)' : 'var(--warn)'}" data-tip="${esc(tip)}">${t('eng.status', { team: esc(L(teamName(team))), n: pct })}</span>
      <button class="btn sm ghost" data-act="eng-staff">${icon('team')}${t('eng.manage')}</button></div>
    <p class="hint" style="margin-bottom:10px">${t('eng.help', { n: ENG_RESERVE })}</p>${busy}${ctl}${tot}</div>`;
}

act('eng-set', (el) => {
  if (setEng(UI.app.G, el.dataset.id, +el.dataset.i)) sfx.play('click');
  UI.refresh();
});
act('eng-staff', () => UI.open('staff'));
