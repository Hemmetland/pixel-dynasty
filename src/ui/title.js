import { $, esc, icon, t, UI, act, regWin } from './core.js';
import { sfx, music } from '../audio/sfx.js';
import { on } from '../core/bus.js';
import { avatarImg } from '../render/people.js';
import { glyphImg } from '../render/glyphs.js';
import { SKINS, HAIRS, SHIRTS } from '../render/pal.js';
import { newGame } from '../sim/state.js';
import { makeCompetitors } from '../sim/market.js';
import { initWorld } from '../sim/clock.js';
import { refreshCandidates } from '../sim/people.js';
import { hasSave, saveMeta } from '../core/store.js';
import { STUDIO_NAMES, FIRST, LAST } from '../data/names.js';
import { dateOf } from '../sim/const.js';
import { LOGOS } from './hud.js';
import { lang } from '../core/i18n.js';
import { money } from './core.js';

const N = { studio: '', founder: '', look: null, arch: 'designer', diff: 'normal', logo: 0 };
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

function randomize() {
  N.studio = rnd(STUDIO_NAMES);
  N.founder = rnd(FIRST) + ' ' + rnd(LAST);
  N.look = { skin: Math.floor(Math.random() * 5), hair: Math.floor(Math.random() * 7), hairColor: Math.floor(Math.random() * 9), shirt: Math.floor(Math.random() * 12), pants: Math.floor(Math.random() * 4), acc: Math.random() < 0.4 ? 1 + Math.floor(Math.random() * 4) : 0, body: 0 };
  N.logo = Math.floor(Math.random() * LOGOS.length);
}

const ARCH = [
  { id: 'designer', ic: 'bulb', c: 'var(--design)' },
  { id: 'coder', ic: 'cpu', c: 'var(--tech)' },
  { id: 'visionary', ic: 'flask', c: 'var(--rp)' },
  { id: 'hustler', ic: 'money', c: 'var(--money)' },
];
const DIFF = ['relaxed', 'normal', 'hardcore'];

function swatches(list, key, cur) {
  return `<div class="swatches">${list.map((c, i) => `<button class="sw ${cur === i ? 'on' : ''}" data-act="ng-look" data-k="${key}" data-i="${i}" style="background:${c}" aria-label="${key} ${i + 1}"></button>`).join('')}</div>`;
}

regWin({
  id: 'newgame',
  icon: 'sparkle',
  color: 'var(--accent)',
  size: 'lg',
  title: () => t('ng.title'),
  render() {
    return `<div class="ng">
      <div class="ng-av card">
        <div class="ng-pic">${avatarImg(N.look, 7, 'stand')}</div>
        <div class="row wrap" style="gap:6px;justify-content:center"><button class="btn sm" data-act="ng-dice">${icon('dice')}${t('ng.random')}</button><button class="btn sm" data-act="ng-hair">${t('ng.hair')}</button><button class="btn sm" data-act="ng-acc">${t('ng.acc')}</button></div>
        <div class="lbl" style="margin:12px 0 5px">${t('ng.skin')}</div>${swatches(SKINS, 'skin', N.look.skin)}
        <div class="lbl" style="margin:10px 0 5px">${t('ng.hairColor')}</div>${swatches(HAIRS, 'hairColor', N.look.hairColor)}
        <div class="lbl" style="margin:10px 0 5px">${t('ng.shirt')}</div>${swatches(SHIRTS, 'shirt', N.look.shirt)}
      </div>
      <div class="col" style="gap:16px">
        <div><div class="lbl" style="margin-bottom:6px">${t('ng.studio')}</div><input class="input" id="ng-studio" maxlength="22" value="${esc(N.studio)}" autocomplete="off"></div>
        <div><div class="lbl" style="margin-bottom:6px">${t('ng.founder')}</div><input class="input" id="ng-founder" maxlength="24" value="${esc(N.founder)}" autocomplete="off"></div>
        <div><div class="lbl" style="margin-bottom:6px">${t('ng.logo')}</div><div class="row wrap" style="gap:6px">${LOGOS.map((g, i) => `<button class="logo-opt ${N.logo === i ? 'on' : ''}" data-act="ng-logo" data-i="${i}">${glyphImg(g, '#fff', 16, true)}</button>`).join('')}</div></div>
        <div><div class="lbl" style="margin-bottom:6px">${t('ng.arch')}</div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">${ARCH.map((x) => `<button class="card hov arch ${N.arch === x.id ? 'sel' : ''}" data-act="ng-arch" data-id="${x.id}" style="--c:${x.c};text-align:left"><div class="row" style="gap:8px"><span style="color:${x.c}">${icon(x.ic)}</span><b>${t('arch.' + x.id)}</b></div><div class="hint" style="margin-top:4px">${t('arch.' + x.id + '.d')}</div></button>`).join('')}</div></div>
        <div><div class="lbl" style="margin-bottom:6px">${t('ng.diff')}</div><div class="seg">${DIFF.map((d) => `<button class="${N.diff === d ? 'on' : ''}" data-act="ng-diff" data-id="${d}">${t('diff.' + d)}</button>`).join('')}</div><div class="hint" style="margin-top:6px">${t('diff.' + N.diff + '.d')}</div></div>
      </div></div>`;
  },
  foot() {
    return `<button class="btn" data-act="ng-cancel">${icon('back')}${t('ui.back')}</button><span class="sp"></span><button class="btn gold lg" data-act="ng-go">${icon('rocket')}${t('ng.begin')}</button>`;
  },
  bind(el) {
    const s = $('#ng-studio', el);
    const f = $('#ng-founder', el);
    s.addEventListener('input', () => (N.studio = s.value));
    f.addEventListener('input', () => (N.founder = f.value));
  },
});

act('ng-look', (el) => {
  N.look = { ...N.look, [el.dataset.k]: +el.dataset.i };
  UI.refresh();
});
act('ng-dice', () => {
  const keep = { studio: N.studio, founder: N.founder, logo: N.logo };
  randomize();
  N.studio = keep.studio;
  N.founder = keep.founder;
  N.logo = keep.logo;
  UI.refresh();
});
act('ng-hair', () => {
  N.look = { ...N.look, hair: (N.look.hair + 1) % 7 };
  UI.refresh();
});
act('ng-acc', () => {
  N.look = { ...N.look, acc: (N.look.acc + 1) % 5 };
  UI.refresh();
});
act('ng-logo', (el) => {
  N.logo = +el.dataset.i;
  UI.refresh();
});
act('ng-arch', (el) => {
  N.arch = el.dataset.id;
  UI.refresh();
});
act('ng-diff', (el) => {
  N.diff = el.dataset.id;
  UI.refresh();
});
act('ng-cancel', () => {
  UI.close(true);
});
act('ng-go', () => {
  const app = UI.app;
  UI.close(true);
  hideTitle();
  intro(() => {
    app.startNew({ studio: N.studio.trim() || 'Nordlys Games', founderName: N.founder.trim() || 'Founder', look: N.look, archetype: N.arch, difficulty: N.diff, logo: N.logo });
  });
});

// ── Titelskärm ──
let titleEl = null;
export function buildTitle(root) {
  titleEl = document.createElement('div');
  titleEl.id = 'title';
  root.appendChild(titleEl);
  const intro_ = document.createElement('div');
  intro_.id = 'intro';
  root.appendChild(intro_);
  on('title', () => showTitle(UI.app));
  on('lang', () => titleEl && titleEl.classList.contains('on') && renderTitle());
}
function renderTitle() {
  const meta = hasSave() ? saveMeta() : null;
  const d = meta ? dateOf(meta.t) : null;
  titleEl.innerHTML = `
    <div class="tt-logo">
      <div class="tt-pre">${t('title.pre')}</div>
      <h1><span class="a">PIXEL</span><span class="b">DYNASTY</span></h1>
      <div class="tt-tag">${t('title.tag')}</div>
    </div>
    <div class="tt-menu">
      ${meta ? `<button class="btn primary lg" data-act="tt-continue"><span>${icon('play')}${t('title.continue')}</span><small>${esc(meta.studio)} · ${d.year} · ${money(meta.money)}</small></button>` : ''}
      <button class="btn ${meta ? '' : 'primary'} lg" data-act="tt-new">${icon('plus')}${t('title.new')}</button>
      <button class="btn lg" data-act="tt-lang">${icon('globe')}${lang === 'sv' ? 'English' : 'Svenska'}</button>
      <button class="btn lg" data-act="tt-sound" style="min-width:150px">${icon(UI.app.settings.music ? 'volume' : 'mute')}${t(UI.app.settings.music ? 'title.soundOn' : 'title.soundOff')}</button>
      <button class="btn lg" data-act="tt-help" style="min-width:56px">${icon('info')}</button>
    </div>
    <div class="tt-foot">${t('title.foot')}</div>`;
}
export function showTitle(app) {
  app.mode = 'title';
  // demo-scen: garage i skymning
  const G = newGame({ studio: 'Nordlys Games', seed: 99 });
  makeCompetitors(G);
  initWorld(G);
  refreshCandidates(G);
  G.office.tier = 0;
  G.staff.push({ ...G.candidates[0], isFounder: false });
  G.staff[0].look = { skin: 1, hair: 3, hairColor: 2, shirt: 5, pants: 0, acc: 1, body: 0 };
  G.office.fac = { coffee: { lvl: 1, slot: 0 } };
  G.t = 12;
  G.job = { kind: 'demo' };
  app.scene.setGame(G);
  app.scene.world.tod = 0.745;
  app.scene.todLock = null;
  app.scene.paused = true;
  app.G = null;
  const w = app.root.clientWidth;
  const h = app.root.clientHeight;
  app.scene.resize(w, h, { top: Math.min(340, h * 0.5), bottom: 60 });
  titleEl.classList.add('on');
  renderTitle();
  music.setMood?.('title');
}
export function hideTitle() {
  titleEl.classList.remove('on');
  const app = UI.app;
  const w = app.root.clientWidth;
  const h = app.root.clientHeight;
  app.scene.resize(w, h, { top: w < 720 ? 64 : 70, bottom: w < 720 ? 100 : 118 });
}
export function titleResize() {
  const app = UI.app;
  if (app.mode === 'title') {
    const w = app.root.clientWidth;
    const h = app.root.clientHeight;
    app.scene.resize(w, h, { top: Math.min(340, h * 0.5), bottom: 60 });
  }
}
act('tt-new', () => {
  randomize();
  UI.open('newgame', null, { force: true });
  sfx.play('open');
});
act('tt-continue', () => {
  const app = UI.app;
  hideTitle();
  if (!app.continueGame()) showTitle(app);
});
act('tt-lang', () => UI.app.setLanguage(lang === 'sv' ? 'en' : 'sv'));
act('tt-sound', () => {
  const s = UI.app.settings;
  s.music = !s.music;
  UI.app.applySettings();
  if (s.music) music.start?.();
  else music.stop?.();
  renderTitle();
});
act('tt-help', () => UI.open('help', null, { force: true }));

function intro(done) {
  const el = $('#intro');
  const lines = [t('intro.1'), t('intro.2'), t('intro.3')];
  el.innerHTML = `<div class="in-box"><div class="in-year">1980</div><div class="in-lines">${lines.map((l, i) => `<p style="animation-delay:${0.5 + i * 1.3}s">${l}</p>`).join('')}</div><div class="in-skip">${t('intro.skip')}</div></div>`;
  el.classList.add('on');
  let fin = false;
  const end = () => {
    if (fin) return;
    fin = true;
    el.classList.add('out');
    done();
    setTimeout(() => {
      el.classList.remove('on', 'out');
      el.innerHTML = '';
    }, 900);
  };
  el.onclick = end;
  setTimeout(end, 5200);
  music.start?.();
}
