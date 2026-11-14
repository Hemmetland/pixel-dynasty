// Studiomål i gränssnittet: texter för framsteg och belöning, tooltippen i panelen och korten i målfönstret.
import { icon, t, L, money } from './core.js';
import { lang } from '../core/i18n.js';
import { fmtNum } from '../core/util.js';
import { GOALS } from '../data/goals.js';
import { activeGoals, goalProg, goalReward, goalDone } from '../sim/goals.js';

const dec = (v, d = 1) => v.toFixed(d).replace('.', lang === 'sv' ? ',' : '.');
const fmtVal = (x, v) => (x.fmt === 'money' ? money(v) : x.fmt === 'score' ? dec(Math.floor(v * 10) / 10) : fmtNum(Math.round(v)));

// "2 / 3", "5,4 / 6" eller "$40K / $100K"
export const progText = (x, p) => `${fmtVal(x, p.cur)} / ${fmtVal(x, p.max)}`;

// "$3 000, 80 fans, 4 forskningspoäng"
export function rewardText(G, x) {
  const r = goalReward(G, x);
  const parts = [];
  if (r.money) parts.push(t('goal.rw.money', { v: money(r.money) }));
  if (r.fans) parts.push(t('goal.rw.fans', { v: fmtNum(r.fans) }));
  if (r.rp) parts.push(t('goal.rw.rp', { v: r.rp }));
  return parts.join(', ');
}

export const goalsDone = (G) => GOALS.filter((x) => goalDone(G, x.id)).length;

// Tooltippen på målraden och målrutan: de aktiva målen med framsteg och belöning
export function goalsTip(G) {
  const ag = activeGoals(G);
  if (!ag.length) return t('goal.allDone');
  return `<b>${t('goal.title')}</b> ${goalsDone(G)}/${GOALS.length}<br>` + ag.map((x) => {
    const p = goalProg(G, x);
    return `<br><b>${L(x.name)}</b>${x.prog(G)[1] > 1 ? ` (${progText(x, p)})` : ''}<br>${L(x.desc)}<br>${t('goal.reward', { v: rewardText(G, x) })}`;
  }).join('<br>');
}

function card(G, x) {
  const p = goalProg(G, x);
  const go = x.go ? `<button class="btn sm" data-act="pn-go" data-go="${x.go}">${t('goal.open')}</button>` : '';
  return `<div class="card goal"><div class="row" style="gap:12px;align-items:flex-start"><div class="ai">${icon(x.ic)}</div><div style="flex:1;min-width:0"><b>${L(x.name)}</b><div class="hint">${L(x.desc)}</div></div></div>
    <div class="bar" style="--c:var(--gold);margin:10px 0 6px"><i style="width:${p.pct}%"></i></div>
    <div class="row" style="gap:8px"><span class="num">${p.max > 1 ? progText(x, p) : p.ok ? '1 / 1' : '0 / 1'}</span><span class="sp"></span>${go}</div>
    <div class="hint goal-rw">${t('goal.reward', { v: rewardText(G, x) })}</div></div>`;
}

// Målfönstrets övre del: de aktiva målen och de klara
export function goalsHTML(G) {
  const ag = activeGoals(G);
  const done = GOALS.filter((x) => goalDone(G, x.id));
  const total = GOALS.length;
  return `<div class="row" style="gap:8px;margin-bottom:6px"><div class="lbl">${t('goal.title')}</div><span class="sp"></span><span class="hint">${t('goal.done', { n: done.length, m: total })}</span></div>
    <div class="bar" style="--c:var(--gold);margin-bottom:10px"><i style="width:${(done.length / total) * 100}%"></i></div>
    <p class="hint" style="margin:0 0 12px">${t('goal.help')}</p>
    ${ag.length ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(270px,1fr));margin-bottom:12px">${ag.map((x) => card(G, x)).join('')}</div>` : `<div class="card" style="margin-bottom:12px">${t('goal.allDone')}</div>`}
    ${done.length ? `<details class="goal-done"><summary class="hint">${t('goal.doneList', { n: done.length })}</summary><div class="goal-chips">${done.map((x) => `<span class="chip">${icon('check')} ${L(x.name)}</span>`).join('')}</div></details>` : ''}
    <div class="lbl" style="margin:18px 0 6px">${t('ach.sec')}</div>`;
}
