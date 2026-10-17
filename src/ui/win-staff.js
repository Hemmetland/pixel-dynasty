import { $, esc, icon, t, L, UI, act, regWin, bar, money, toast } from './core.js';
import { sfx } from '../audio/sfx.js';
import { avatarImg } from '../render/people.js';
import { SPECS, TRAITS, hire, fire, raise, train, canTrain, trainCost, trainWeeks, trainingSlots, trainingNow, skillCap, canHire, SKILLS, payroll } from '../sim/people.js';
import { capacity } from '../sim/studio.js';
import { dateOf } from '../sim/const.js';

const S = { tab: 'team', trainFor: null, fireFor: null };
const SK = { design: ['bulb', 'var(--design)'], tech: ['cpu', 'var(--tech)'], speed: ['rocket', 'var(--warn)'], research: ['flask', 'var(--rp)'] };

const skills = (G, s) => {
  const cap = skillCap(G);
  return `<div class="skills">${SKILLS.map((k) => `<div class="sk" style="--c:${SK[k][1]}" data-tip="${t('skill.' + k + '.tip')}"><span class="si">${icon(SK[k][0])}</span><div style="flex:1">${bar((s[k] / cap) * 100, SK[k][1], 'thin')}</div><b class="num">${s[k]}</b></div>`).join('')}</div>`;
};
const moodInfo = (m) => (m >= 62 ? ['var(--good)', 'staff.moodHigh'] : m >= 38 ? ['var(--warn)', 'staff.moodMid'] : ['var(--bug)', 'staff.moodLow']);

function teamCard(G, s) {
  const [mc, mt] = moodInfo(s.mood);
  const training = s.trainUntil > G.t;
  const spec = SPECS[s.spec];
  const tr = canTrain(G, s);
  const open = S.trainFor === s.id;
  const trait = s.trait ? `<span class="chip" data-tip="${esc(L(TRAITS[s.trait].desc))}">${L(TRAITS[s.trait].name)}</span>` : '';
  const trainBtns = open
    ? `<div class="trainrow">${SKILLS.map((k) => `<button class="btn sm" data-act="s-train" data-id="${s.id}" data-k="${k}" style="--c:${SK[k][1]}">${icon(SK[k][0])}${t('skill.' + k)} <span class="muted">+${3}–${6 + (G.u.flags.training2 ? 2 : 0)}</span></button>`).join('')}<span class="muted num" style="font-size:12px">${money(trainCost(G, s))} · ${trainWeeks(G)} ${t('ui.weeksShort')}</span></div>`
    : '';
  return `<div class="scard card ${S.focus === s.id ? 'sel' : ''}" id="sc-${s.id}">
    <div class="sc-top">
      <div class="sc-av">${avatarImg(s.look, 3, training ? 'stand' : 'stand')}</div>
      <div style="flex:1;min-width:0">
        <div class="row" style="gap:8px"><b class="h3" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</b>${s.isFounder ? `<span class="tag" style="--c:var(--gold)">${t('staff.founder')}</span>` : ''}</div>
        <div class="row wrap" style="gap:6px;margin-top:5px"><span class="chip">${s.isFounder ? t('staff.founderRole') : L(spec.name)}</span>${trait}${training ? `<span class="chip c" style="--c:var(--rp)">${icon('book')}${t('staff.training')} · ${Math.max(1, s.trainUntil - G.t)}${t('ui.weeksShort')}</span>` : ''}</div>
      </div>
      <div class="sc-mood" style="--c:${mc}" data-tip="${t(mt)}"><span class="md"></span>${Math.round(s.mood)}</div>
    </div>
    ${skills(G, s)}
    <div class="row" style="margin-top:10px;gap:6px">
      <span class="muted" style="font-size:12px">${s.isFounder ? t('staff.noSalary') : money(s.salary) + t('ui.perMonth')}</span><span class="sp"></span>
      ${G.u.flags.training ? `<button class="btn sm ${open ? 'on' : ''}" data-act="s-trainopen" data-id="${s.id}" ${tr === true ? '' : 'disabled'} data-tip="${tr === true ? t('staff.trainTip') : t('staff.train.' + tr)}">${icon('book')}${t('staff.train')}</button>` : ''}
      ${s.isFounder ? '' : `<button class="btn sm" data-act="s-raise" data-id="${s.id}" data-tip="${t('staff.raiseTip')}">${icon('money')}${t('staff.raise')}</button><button class="btn sm danger" data-act="s-fire" data-id="${s.id}">${S.fireFor === s.id ? t('staff.confirm') : icon('x')}</button>`}
    </div>
    ${trainBtns}
  </div>`;
}

function candCard(G, c) {
  const spec = SPECS[c.spec];
  const can = canHire(G);
  const afford = G.money >= c.fee;
  const trait = c.trait ? `<span class="chip" data-tip="${esc(L(TRAITS[c.trait].desc))}">${L(TRAITS[c.trait].name)}</span>` : '';
  return `<div class="scard card">
    <div class="sc-top"><div class="sc-av">${avatarImg(c.look, 3)}</div>
      <div style="flex:1;min-width:0"><b class="h3">${esc(c.name)}</b><div class="row wrap" style="gap:6px;margin-top:5px"><span class="chip">${L(spec.name)}</span>${trait}</div></div></div>
    ${skills(G, c)}
    <div class="row" style="margin-top:12px;gap:10px"><div><div class="num" style="font:700 20px var(--disp)">${money(c.salary)}<span class="muted" style="font:500 11px var(--font)">${t('ui.perMonth')}</span></div><div class="faint" style="font-size:11px">${t('staff.fee')} ${money(c.fee)}</div></div><span class="sp"></span>
      <button class="btn primary" data-act="s-hire" data-id="${c.id}" ${can && afford ? '' : 'disabled'} data-tip="${can ? (afford ? '' : t('err.money')) : t('err.capacity')}">${icon('plus')}${t('staff.hire')}</button></div>
  </div>`;
}

regWin({
  id: 'staff',
  icon: 'team',
  color: 'var(--fans)',
  size: 'xl',
  title: () => t('staff.title'),
  sub: (G) => `${G.staff.length}/${capacity(G)} ${t('staff.desks')} · ${t('staff.payroll')} ${money(payroll(G))}${t('ui.perMonth')}`,
  headExtra: () => `<div class="tabs"><button class="tab ${S.tab === 'team' ? 'on' : ''}" data-act="s-tab" data-id="team">${icon('team')}${t('staff.tabTeam')}</button><button class="tab ${S.tab === 'hire' ? 'on' : ''}" data-act="s-tab" data-id="hire">${icon('plus')}${t('staff.tabHire')}</button></div>`,
  render(G, arg) {
    if (arg && arg.focus) {
      S.tab = 'team';
      S.focus = arg.focus;
      setTimeout(() => $('#sc-' + arg.focus)?.scrollIntoView({ block: 'center' }), 30);
    }
    if (S.tab === 'hire') {
      const d = dateOf(G.t);
      return `<div class="row" style="margin-bottom:14px;gap:12px"><div class="hint" style="flex:1">${icon('info')} ${t('staff.hireHelp', { n: capacity(G) - G.staff.length })}</div><span class="chip">${icon('calendar')}${t('staff.refresh', { n: 4 - d.week })}</span></div>
        <div class="grid sgrid">${G.candidates.map((c) => candCard(G, c)).join('')}</div>
        ${G.staff.length >= capacity(G) ? `<div class="hint" style="margin-top:14px;color:var(--warn)">${icon('building')} ${t('staff.full')}</div>` : ''}`;
    }
    const tn = trainingNow(G);
    return `<div class="row wrap" style="gap:8px;margin-bottom:14px">
        <span class="chip">${icon('coffee')}${t('staff.avgMood')} ${Math.round(G.staff.reduce((s, x) => s + x.mood, 0) / G.staff.length)}</span>
        ${G.u.flags.training ? `<span class="chip">${icon('book')}${t('staff.trainSlots')} ${tn}/${trainingSlots(G)}</span>` : `<span class="chip faint">${icon('lock')}${t('staff.trainLocked')}</span>`}
      </div>
      <div class="grid sgrid">${G.staff.map((s) => teamCard(G, s)).join('')}</div>`;
  },
  onClose() {
    S.trainFor = null;
    S.fireFor = null;
    S.focus = null;
  },
});

act('s-tab', (el) => {
  S.tab = el.dataset.id;
  UI.refresh();
});
act('s-hire', (el) => {
  const G = UI.app.G;
  const r = hire(G, +el.dataset.id);
  if (r !== true) toast(String(r), 'bad');
  else sfx.play('coin');
  UI.refresh();
});
act('s-raise', (el) => {
  const G = UI.app.G;
  const s = G.staff.find((x) => x.id === +el.dataset.id);
  raise(G, +el.dataset.id);
  toast(t('toast.raise', { name: `<b>${esc(s.name)}</b>` }), 'good');
  UI.refresh();
});
act('s-fire', (el) => {
  const G = UI.app.G;
  const id = +el.dataset.id;
  if (S.fireFor !== id) {
    S.fireFor = id;
    UI.refresh();
    setTimeout(() => {
      if (S.fireFor === id) {
        S.fireFor = null;
        UI.refresh();
      }
    }, 3000);
    return;
  }
  fire(G, id);
  S.fireFor = null;
  UI.refresh();
});
act('s-trainopen', (el) => {
  const id = +el.dataset.id;
  S.trainFor = S.trainFor === id ? null : id;
  UI.refresh();
});
act('s-train', (el) => {
  const G = UI.app.G;
  const r = train(G, +el.dataset.id, el.dataset.k);
  if (r === true) {
    sfx.play('research');
    S.trainFor = null;
  } else toast(String(r), 'bad');
  UI.refresh();
});
