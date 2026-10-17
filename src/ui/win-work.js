import { $, esc, icon, t, L, UI, act, regWin, bar, money, errToast } from './core.js';
import { sfx } from '../audio/sfx.js';
import { CLIENTS, BRIEFS } from '../data/events.js';
import { FEATURES, FEAT } from '../data/research.js';
import { PLATFORM } from '../data/platforms.js';
import { acceptContract } from '../sim/contracts.js';
import { teamOutput } from '../sim/dev.js';
import { buildEngine, engineCost, engineTech, engineWeeks } from '../sim/engines.js';
import { engineMult, engineNeed, yfOf, yearOf, TICKS_PER_WEEK, engineEff } from '../sim/const.js';
import { workers } from '../sim/people.js';
import { fmtNum, clamp } from '../core/util.js';

const K = { tab: 'contracts', name: '', sel: new Set(['sprites']) };

function contractsTab(G) {
  if (!G.contracts.length) return `<div class="empty">${icon('hammer')}<div>${t('work.none')}</div></div>`;
  const out = teamOutput(G, { scope: 'small', crunch: false }, 0.5);
  return `<p class="hint" style="margin-bottom:14px">${icon('info')} ${t('work.help')}</p><div class="col" style="gap:10px">${G.contracts
    .map((c) => {
      const ticks = c.weeks * TICKS_PER_WEEK;
      const estD = out.d * ticks;
      const estT = out.t * ticks;
      const r = Math.min(estD / c.reqD, estT / c.reqT);
      const [lbl, col] = r >= 1.3 ? ['work.easy', 'var(--good)'] : r >= 1 ? ['work.tight', 'var(--warn)'] : ['work.hard', 'var(--bug)'];
      return `<div class="card row" style="gap:16px;flex-wrap:wrap"><div class="fi" style="width:46px;height:46px;border-radius:13px;display:grid;place-items:center;background:rgba(124,242,154,.12);color:var(--money)">${icon('hammer')}</div>
        <div style="flex:1;min-width:200px"><b class="h3">${L(BRIEFS[c.brief])}</b><div class="faint" style="font-size:12.5px">${L(CLIENTS[c.client])} · ${c.weeks} ${t('ui.weeksShort')}</div>
        <div class="row wrap" style="gap:6px;margin-top:7px"><span class="chip c" style="--c:var(--design)">${icon('bulb')}${fmtNum(c.reqD)}</span><span class="chip c" style="--c:var(--tech)">${icon('cpu')}${fmtNum(c.reqT)}</span><span class="tag" style="--c:${col}">${t(lbl)}</span></div></div>
        <div style="text-align:right"><div class="disp" style="font-size:29px;color:var(--money)">${money(c.reward)}</div><button class="btn primary" style="margin-top:6px" data-act="w-accept" data-id="${c.id}" ${G.job ? 'disabled' : ''}>${t('work.accept')}</button></div></div>`;
    })
    .join('')}</div>`;
}

function enginesTab(G) {
  if (!G.u.flags.engines) return `<div class="empty">${icon('lock')}<div>${t('work.engLocked')}</div></div>`;
  const feats = FEATURES.filter((f) => G.u.feats.includes(f.id));
  const sel = [...K.sel].filter((id) => G.u.feats.includes(id));
  const cost = engineCost(sel);
  const tech = engineTech(sel);
  const need = engineNeed(yearOf(G.t));
  const ratio = clamp(tech / need, 0, 1.4);
  const existing = G.engines
    .map((e) => `<div class="card row" style="gap:12px"><div class="fi" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:rgba(77,225,208,.14);color:var(--accent)">${icon('cpu')}</div><div style="flex:1"><b>${esc(e.name)}</b><div class="faint" style="font-size:12px">${e.feats.length} ${t('work.parts')}</div></div><div class="disp" style="font-size:23px;color:var(--tech)">+${Math.round((engineMult(e, yfOf(G.t)) - 1) * 100)}%</div></div>`)
    .join('');
  return `<div class="grid" style="grid-template-columns:1.3fr 1fr;gap:20px;align-items:start">
    <div><div class="lbl" style="margin-bottom:8px">${t('work.parts')}</div><div class="feats">${feats
      .map((f) => `<button class="feat ${K.sel.has(f.id) ? 'on' : ''}" data-act="w-feat" data-id="${f.id}"><span>${L(f.name)}</span><small>+${f.tech} · ${money(f.cost)}</small></button>`)
      .join('')}</div></div>
    <div class="col"><div class="card"><div class="lbl">${t('work.newEngine')}</div><input class="input" id="eng-name" maxlength="22" value="${esc(K.name)}" placeholder="${t('work.engName')}" style="margin:8px 0 12px">
      <div class="kv"><span>${t('work.techPts')}</span><b>${tech}</b></div><div class="kv"><span>${t('work.cost')}</span><b>${money(cost)}</b></div><div class="kv"><span>${t('work.time')}</span><b>${sel.length ? engineWeeks(sel) + ' ' + t('ui.weeksShort') : '–'}</b></div>
      <div style="margin:12px 0 4px"><div class="row"><span class="lbl">${t('work.vsEra')}</span><span class="sp"></span><b class="num">${Math.round(ratio * 100)}%</b></div>${bar(ratio * 70, ratio >= 1 ? 'var(--good)' : 'var(--accent)', 'tall')}</div>
      <p class="hint" style="margin:8px 0 12px">${t('work.engHelp')}</p>
      <button class="btn primary block" data-act="w-build" ${sel.length >= 2 && !G.job && G.money >= cost ? '' : 'disabled'}>${icon('hammer')}${t('work.build')}</button></div>
      ${existing ? `<div class="lbl">${t('work.engines')}</div>${existing}` : ''}</div></div>`;
}

regWin({
  id: 'contracts',
  icon: 'hammer',
  color: 'var(--warn)',
  size: 'xl',
  title: () => t('work.title'),
  headExtra: () => `<div class="tabs"><button class="tab ${K.tab === 'contracts' ? 'on' : ''}" data-act="w-tab" data-id="contracts">${t('work.contracts')}</button><button class="tab ${K.tab === 'engines' ? 'on' : ''}" data-act="w-tab" data-id="engines">${t('work.engines')}</button></div>`,
  render(G) {
    return K.tab === 'contracts' ? contractsTab(G) : enginesTab(G);
  },
  bind(el) {
    const inp = $('#eng-name', el);
    if (inp) inp.addEventListener('input', () => (K.name = inp.value));
  },
});
act('w-tab', (el) => {
  K.tab = el.dataset.id;
  UI.refresh();
});
act('w-accept', (el) => {
  const G = UI.app.G;
  const r = acceptContract(G, +el.dataset.id);
  if (r === true) {
    sfx.play('start');
    UI.close(true);
  } else errToast(r);
});
act('w-feat', (el) => {
  const id = el.dataset.id;
  if (K.sel.has(id)) K.sel.delete(id);
  else K.sel.add(id);
  UI.refresh();
});
act('w-build', () => {
  const G = UI.app.G;
  const r = buildEngine(G, K.name.trim(), [...K.sel]);
  if (r === true) {
    sfx.play('start');
    K.name = '';
    UI.close(true);
  } else errToast(r);
});
void FEAT; void PLATFORM; void workers; void engineEff;
