import { $, $$, icon, t, UI, act } from './core.js';
import { on } from '../core/bus.js';

const STEPS = [
  { id: 'create', icon: 'plus', target: 'wizard', when: (G) => !G.job && G.games.length === 0, done: (G) => !!G.job || G.games.length > 0 },
  { id: 'dev', icon: 'gamepad', target: null, when: (G) => G.job && G.job.kind === 'game' && G.games.length === 0, done: (G) => G.games.length > 0 || (G.job && G.job.phase >= 1) },
  { id: 'research', icon: 'flask', target: 'research', when: (G) => G.games.length >= 1 && G.research.done.length === 0 && !G.research.active.length, done: (G) => G.research.done.length > 0 || G.research.active.length > 0 },
  { id: 'again', icon: 'rocket', target: 'wizard', when: (G) => G.games.length >= 1 && !G.job && G.research.active.length > 0, done: (G) => !!G.job },
  { id: 'team', icon: 'team', target: 'staff', when: (G) => G.games.length >= 2 && G.staff.length < 3 && G.money > 9000, done: (G) => G.staff.length >= 3 },
  { id: 'studio', icon: 'building', target: 'studio', when: (G) => G.office.tier === 0 && G.money > 22000 && G.games.length >= 2, done: (G) => G.office.tier >= 1 },
  { id: 'contracts', icon: 'hammer', target: 'contracts', when: (G) => !G.job && G.money < 5000 && G.contracts.length > 0, done: (G) => !!G.job || G.money > 12000 },
];

let el = null;
let curStep = null;
let acc = 0;

export function initTutorial(root) {
  el = document.createElement('div');
  el.id = 'coach';
  el.className = 'glass';
  root.appendChild(el);
  on('frame', (dt) => {
    acc += dt;
    if (acc < 0.5) return;
    acc = 0;
    update();
  });
  act('coach-ok', () => finishStep(true));
  act('coach-skip', () => {
    const G = UI.app.G;
    if (G) G.flags.tutOff = true;
    UI.app.settings.tutorial = false;
    UI.app.applySettings();
    hide();
  });
  on('title', hide);
}

function hide() {
  if (!el) return;
  el.classList.remove('on');
  for (const b of $$('.coach-target')) b.classList.remove('coach-target');
  curStep = null;
}
function finishStep() {
  const G = UI.app.G;
  if (G && curStep) {
    G.flags.tutDone = G.flags.tutDone || [];
    if (!G.flags.tutDone.includes(curStep.id)) G.flags.tutDone.push(curStep.id);
  }
  hide();
}

function update() {
  const app = UI.app;
  const G = app.G;
  if (!G || app.mode !== 'play' || !app.settings.tutorial || G.flags.tutOff || app.promptActive) {
    if (curStep) hide();
    return;
  }
  G.flags.tutDone = G.flags.tutDone || [];
  if (curStep) {
    if (curStep.done(G) || UI.cur === curStep.target) {
      if (UI.cur !== curStep.target || curStep.done(G)) finishStep();
      else if (UI.cur === curStep.target) hide();
    }
    return;
  }
  if (UI.cur || UI.modalOn) return;
  for (const s of STEPS) {
    if (G.flags.tutDone.includes(s.id)) continue;
    if (s.done(G)) {
      G.flags.tutDone.push(s.id);
      continue;
    }
    if (s.when(G)) {
      show(s);
      break;
    }
  }
}

function show(s) {
  curStep = s;
  el.innerHTML = `<div class="ci">${icon(s.icon)}</div><div class="tx"><div class="h">${t('tut.' + s.id + '.h')}</div>${t('tut.' + s.id + '.b')}<div class="row"><button class="btn sm primary" data-act="coach-ok">${t('tut.ok')}</button><button class="btn sm ghost" data-act="coach-skip">${t('tut.skip')}</button></div></div>`;
  el.classList.add('on');
  if (s.target) {
    const b = $(`.dk[data-key="${s.target}"]`);
    if (b) b.classList.add('coach-target');
  }
}
