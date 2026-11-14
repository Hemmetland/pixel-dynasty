import { $, esc, icon, t, UI, act, regWin } from './core.js';
import { identityName } from '../data/identity.js';
import { sfx, music } from '../audio/sfx.js';
import { on } from '../core/bus.js';
import { avatarImg } from '../render/people.js';
import { portraitFrames, HAIR_KIND } from '../render/charsprite.js';
import { glyphImg } from '../render/glyphs.js';
import { SKINS, HAIRS, SHIRTS, PANTS, HATS } from '../render/pal.js';
import { newGame } from '../sim/state.js';
import { weeklyOf } from '../core/weekly.js';
import { FOUNDER_UNLOCK, founderUnlocked } from '../sim/legacy.js';
import { makeCompetitors } from '../sim/market.js';
import { initWorld } from '../sim/clock.js';
import { refreshCandidates, randomLook } from '../sim/people.js';
import { hasSave, saveMeta, loadHall, slotList, latestSlot, freeSlot } from '../core/store.js';
import { STUDIO_NAMES, FIRST, LAST } from '../data/names.js';
import { dateOf } from '../sim/const.js';
import { LOGOS } from './hud.js';
import { paceOf, paceSeg } from './pace.js';
import { lang } from '../core/i18n.js';
import { money } from './core.js';
import { L } from '../core/i18n.js';

const N = { studio: '', founder: '', look: null, arch: 'designer', diff: 'normal', logo: 0, weekly: null, slot: 0 };
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

function randomize() {
  N.studio = rnd(STUDIO_NAMES);
  N.founder = rnd(FIRST) + ' ' + rnd(LAST);
  N.look = spriteLook(randomLook(Math.random));
  N.logo = Math.floor(Math.random() * LOGOS.length);
}

// Spelets figur är en enda sprite som färgbyts: den visar hud, hår (tre frisyrer), tröja, byxor och en keps. Byggaren erbjuder
// därför bara det som syns, så att förhandsgranskningen blir exakt den figur som sedan går runt i huset.
const HAIR_PICK = [{ i: 0, k: 'short' }, { i: 2, k: 'tail' }, { i: 4, k: 'curly' }];
function spriteLook(l) {
  const hat = Math.random() < 0.25 ? 1 : 0;
  return { ...l, acc: 0, hat, glasses: 0, beard: 0, headphones: 0, backpack: 0, hoodie: 0, pattern: 0, hatColor: Math.floor(Math.random() * HATS.length) };
}
const hairKind = (l) => HAIR_KIND[l.hair % HAIR_KIND.length] - 1;
let figTimer = 0;

const ARCH = [
  { id: 'designer', ic: 'bulb', c: 'var(--design)' },
  { id: 'coder', ic: 'cpu', c: 'var(--tech)' },
  { id: 'visionary', ic: 'flask', c: 'var(--rp)' },
  { id: 'hustler', ic: 'money', c: 'var(--money)' },
  { id: 'influencer', ic: 'heart', c: 'var(--fans)' },
  { id: 'veteran', ic: 'gear', c: 'var(--accent)' },
  { id: 'tycoon', ic: 'crown', c: 'var(--gold)' },
];
const LOCK_KEY = { awards: 'ng.lock.awards', points: 'ng.lock.points' };
// En bakgrund som studiohallen låser upp: kortet är låst tills en tidigare studio nått kravet
function archCard(x, hall) {
  if (founderUnlocked(hall, x.id)) {
    return `<button class="card hov arch ${N.arch === x.id ? 'sel' : ''}" data-act="ng-arch" data-id="${x.id}" style="--c:${x.c};text-align:left"><div class="row" style="gap:8px"><span style="color:${x.c}">${icon(x.ic)}</span><b>${t('arch.' + x.id)}</b></div><div class="hint" style="margin-top:4px">${t('arch.' + x.id + '.d')}</div></button>`;
  }
  const u = FOUNDER_UNLOCK[x.id];
  return `<div class="card arch locked" style="--c:${x.c};text-align:left"><div class="row" style="gap:8px"><span>${icon('lock')}</span><b>${t('arch.' + x.id)}</b></div><div class="hint" style="margin-top:4px">${t(LOCK_KEY[u.k], { n: u.n })}</div></div>`;
}
const DIFF = ['relaxed', 'normal', 'hardcore'];

function swatches(list, key, cur) {
  return `<div class="swatches">${list.map((c, i) => `<button class="sw ${cur === i ? 'on' : ''}" data-act="ng-look" data-k="${key}" data-i="${i}" style="background:${c}" aria-label="${key} ${i + 1}"></button>`).join('')}</div>`;
}

const archSection = (hall) => `<div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">${ARCH.map((x) => archCard(x, hall)).join('')}</div></div>`;
const diffSection = () => `<div><div class="seg">${DIFF.map((d) => `<button class="${N.diff === d ? 'on' : ''}" data-act="ng-diff" data-id="${d}">${t('diff.' + d)}</button>`).join('')}</div><div class="hint" style="margin-top:6px">${t('diff.' + N.diff + '.d')}</div></div>`;
const paceSection = () => `<div>${paceSeg(UI.app.settings)}<div class="hint" style="margin-top:6px">${t('set.pace.' + paceOf(UI.app.settings) + '.d')}</div></div>`;
// Veckans utmaning: samma värld för alla den här veckan, med bakgrund och svårighet låsta så att poängen går att jämföra
function weeklyBanner() {
  return `<div class="card weekly"><div class="row" style="gap:8px"><span style="color:var(--gold)">${icon('calendar')}</span><b>${t('ng.weekly', { id: N.weekly.id })}</b></div><div class="hint" style="margin-top:6px">${t('ng.weekly.d')}</div>
    <div class="row wrap" style="gap:6px;margin-top:8px"><span class="chip">${t('arch.designer')}</span><span class="chip">${t('diff.normal')}</span><span class="sp"></span><button class="btn sm" data-act="ng-weekly-off">${t('ng.weekly.off')}</button></div></div>`;
}

// Förhandsvisningens figur: bildrutor ur samma sprite som i huset (rörlig), annars den gamla ritade figuren
function figure() {
  const f = portraitFrames(N.look, 'stand', 1.5);
  if (!f) return `<div class="ng-fig-old">${avatarImg(N.look, 7, 'stand')}</div>`;
  return `<img class="ng-fig" id="ng-fig" src="${f.urls[0]}" style="--fw:${f.W};--fh:${f.H}" alt="" draggable="false">`;
}
// Stående, vinkar ibland och jublar när man slumpar: samma poser som figuren har i spelet
function animateFigure(el) {
  clearInterval(figTimer);
  const img = $('#ng-fig', el);
  if (!img) return;
  const seq = [['stand', 26], ['wave', 12], ['stand', 30], ['present', 8]];
  let si = 0;
  let n = 0;
  figTimer = setInterval(() => {
    if (!img.isConnected) return clearInterval(figTimer);
    const [pose, len] = seq[si];
    const f = portraitFrames(N.look, pose, 1.5);
    if (f) img.src = f.urls[Math.floor(n / 3) % f.urls.length];
    if (++n >= len) {
      n = 0;
      si = (si + 1) % seq.length;
    }
  }, 120);
}
const hatOn = () => (N.look.hat | 0) === 1;
const chip = (on, a, d, label) => `<button class="ng-chip ${on ? 'on' : ''}" data-act="${a}" ${d}>${label}</button>`;
const sec = (n, title, body) => `<section class="ng-sec"><div class="ng-sh"><i>${n}</i><b>${title}</b></div>${body}</section>`;
const logoPick = () => `<div class="row wrap" style="gap:6px">${LOGOS.map((g, i) => `<button class="logo-opt ${N.logo === i ? 'on' : ''}" data-act="ng-logo" data-i="${i}">${glyphImg(g, '#fff', 16, true)}</button>`).join('')}</div>`;
// Skylten över dörren, som på titelskärmen: visar studions namn och logotyp medan man skriver
const sign = () => `<div class="ng-sign"><span class="ng-sign-l" id="ng-sign-l">${glyphImg(LOGOS[N.logo], '#fff', 16, true)}</span><span id="ng-sign-s">${esc(N.studio || 'Nordlys Games')}</span></div>`;

regWin({
  id: 'newgame',
  icon: 'sparkle',
  color: 'var(--accent)',
  size: 'lg',
  title: () => t('ng.title'),
  render() {
    const hall = loadHall();
    if (!founderUnlocked(hall, N.arch)) N.arch = 'designer';
    const hk = hairKind(N.look);
    return `<div class="ng">
      <div class="ng-av card">
        <div class="ng-stage">${figure()}<div class="ng-floor"></div></div>
        <div class="ng-badge"><span class="ng-badge-i">${icon('user')}</span><span class="ng-badge-t"><b id="ng-badge-f">${esc(N.founder || t('ng.founder'))}</b><small>${t('ng.badge')}</small></span><button class="btn sm" data-act="ng-dice">${icon('dice')}${t('ng.random')}</button></div>
        <div class="lbl" style="margin:12px 0 5px">${t('ng.hair')}</div>
        <div class="row wrap" style="gap:6px;justify-content:center">${HAIR_PICK.map((h, i) => chip(!hatOn() && hk === i, 'ng-hairpick', `data-i="${h.i}"`, t('ng.hair.' + h.k))).join('')}${chip(hatOn(), 'ng-hat', '', t('ng.hat'))}</div>
        ${hatOn() ? `<div class="lbl" style="margin:10px 0 5px">${t('ng.hatColor')}</div>${swatches(HATS, 'hatColor', N.look.hatColor)}` : ''}
        <div class="lbl" style="margin:12px 0 5px">${t('ng.skin')}</div>${swatches(SKINS, 'skin', N.look.skin)}
        <div class="lbl" style="margin:10px 0 5px">${t('ng.hairColor')}</div>${swatches(HAIRS, 'hairColor', N.look.hairColor)}
        <div class="lbl" style="margin:10px 0 5px">${t('ng.shirt')}</div>${swatches(SHIRTS, 'shirt', N.look.shirt)}
        <div class="lbl" style="margin:10px 0 5px">${t('ng.pants')}</div>${swatches(PANTS, 'pants', N.look.pants)}
      </div>
      <div class="col" style="gap:14px">
        ${sec(1, t('ng.studio'), `${sign()}<input class="input" id="ng-studio" maxlength="22" value="${esc(N.studio)}" autocomplete="off"><div class="lbl" style="margin:12px 0 6px">${t('ng.logo')}</div>${logoPick()}`)}
        ${sec(2, t('ng.founder'), `<input class="input" id="ng-founder" maxlength="24" value="${esc(N.founder)}" autocomplete="off">`)}
        ${N.weekly ? weeklyBanner() : sec(3, t('ng.arch'), archSection(hall, true)) + sec(4, t('ng.diff'), diffSection(true))}${sec(N.weekly ? 3 : 5, t('set.pace'), paceSection(true))}
      </div></div>`;
  },
  foot() {
    return `<button class="btn" data-act="ng-cancel">${icon('back')}${t('ui.back')}</button><span class="sp"></span><button class="btn gold lg" data-act="ng-go">${icon('rocket')}${t('ng.begin')}</button>`;
  },
  bind(el) {
    const s = $('#ng-studio', el);
    const f = $('#ng-founder', el);
    s.addEventListener('input', () => {
      N.studio = s.value;
      $('#ng-sign-s', el).textContent = s.value || 'Nordlys Games';
    });
    f.addEventListener('input', () => {
      N.founder = f.value;
      $('#ng-badge-f', el).textContent = f.value || t('ng.founder');
    });
    animateFigure(el);
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
act('ng-hairpick', (el) => {
  N.look = { ...N.look, hair: +el.dataset.i, hat: 0 };
  UI.refresh();
});
act('ng-hat', () => {
  N.look = { ...N.look, hat: hatOn() ? 0 : 1 };
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
act('ng-weekly-off', () => {
  N.weekly = null;
  UI.refresh();
});
act('ng-cancel', () => {
  UI.close(true);
});
function begin() {
  const app = UI.app;
  UI.close(true);
  hideTitle();
  intro(() => {
    const w = N.weekly;
    const slot = N.slot;
    N.slot = 0;
    app.startNew({ slot, studio: N.studio.trim() || 'Nordlys Games', founderName: N.founder.trim() || 'Founder', look: N.look, archetype: w ? 'designer' : N.arch, difficulty: w ? 'normal' : N.diff, logo: N.logo, seed: w ? w.seed : undefined, weekly: w ? w.id : null });
  });
}
// Ett nytt spel hamnar i den valda eller första lediga sparplatsen; är alla upptagna får spelaren välja en att skriva över
act('ng-go', () => {
  const slot = N.slot || freeSlot();
  if (slot) {
    N.slot = slot;
    return begin();
  }
  UI.open('slots', { pick: true }, { force: true });
});
// Används av sparplatsfönstret
export function beginIn(n) {
  N.slot = n;
  UI.close(true);
  begin();
}
export function newGameIn(n) {
  randomize();
  N.weekly = null;
  N.slot = n;
  UI.open('newgame', null, { force: true });
  sfx.play('open');
}
export function refreshTitle() {
  if (titleEl && titleEl.classList.contains('on')) renderTitle();
}

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
  const pl = latestSlot(true);
  const meta = pl ? saveMeta(pl) : null;
  const dead = !pl && hasSave() ? saveMeta() : null; // bara studior i konkurs finns kvar
  const d = meta ? dateOf(meta.t) : dead ? dateOf(dead.t) : null;
  const saved = slotList().filter((x) => x.meta).length;
  titleEl.innerHTML = `
    <div class="tt-logo">
      <div class="tt-pre">${t('title.pre')}</div>
      <h1><span class="a">PIXEL</span><span class="b">DYNASTY</span></h1>
      <div class="tt-tag">${t('title.tag')}</div>
    </div>
    <div class="tt-menu">
      ${dead ? `<button class="btn lg" disabled><span>${icon('skull')}${t('over.title')}</span><small>${esc(dead.studio)} · ${d.year}</small></button>` : ''}
      ${meta ? `<button class="btn primary lg" data-act="tt-continue"><span>${icon('play')}${t('title.continue')}</span><small>${esc(meta.studio)} · ${d.year} · ${money(meta.money)}</small></button>` : ''}
      <button class="btn ${meta ? '' : 'primary'} lg" data-act="tt-new">${icon('plus')}${t('title.new')}</button>
      ${saved ? `<button class="btn lg" data-act="tt-slots"><span>${icon('save')}${t('title.slots')}</span><small>${saved}/5</small></button>` : ''}
      <button class="btn lg" data-act="tt-weekly"><span>${icon('calendar')}${t('title.weekly')}</span><small>${weeklyOf().id}</small></button>
      ${loadHall().length ? `<button class="btn lg" data-act="tt-hall">${icon('crown')}${t('title.hall')}</button>` : ''}
      <button class="btn lg tt-util" data-act="tt-lang">${icon('globe')}${lang === 'sv' ? 'English' : 'Svenska'}</button>
      <button class="btn lg tt-util" data-act="tt-sound" style="min-width:150px">${icon(UI.app.settings.music ? 'volume' : 'mute')}${t(UI.app.settings.music ? 'title.soundOn' : 'title.soundOff')}</button>
      <button class="btn lg tt-util" data-act="tt-help" style="min-width:56px">${icon('info')}</button>
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
  // PixelLab-bakgrunder: skymning på dagen, neonstad på kvällen/natten (?title=dusk|night väljer själv)
  const hr = new Date().getHours();
  const night = /[?&]title=night/.test(location.search) || (!/[?&]title=dusk/.test(location.search) && (hr >= 20 || hr < 5));
  app.scene.world.backdrop = night ? 'bg.skyline-night' : 'bg.skyline-dusk';
  app.scene.world.backdropDx = night ? 0 : -48; // luftskeppet bredvid titeln, inte bakom den
  app.scene.world.tod = night ? 0.93 : 0.745;
  app.scene.todLock = night ? 0.93 : null;
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
  N.weekly = null;
  N.slot = 0;
  UI.open('newgame', null, { force: true });
  sfx.play('open');
});
act('tt-weekly', () => {
  randomize();
  N.slot = 0;
  N.weekly = weeklyOf();
  UI.open('newgame', null, { force: true });
  sfx.play('open');
});
act('tt-continue', () => {
  const app = UI.app;
  hideTitle();
  if (!app.continueGame()) showTitle(app);
});
act('tt-slots', () => {
  UI.open('slots', null, { force: true });
  sfx.play('open');
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
act('tt-hall', () => {
  UI.open('hall', null, { force: true });
  sfx.play('open');
});

// ── Studiohallen: tidigare studior, bäst först ──
const HALL_RANK = ['end.rank0', 'end.rank1', 'end.rank2', 'end.rank3'];
regWin({
  id: 'hall',
  icon: 'crown',
  color: 'var(--gold)',
  size: 'md',
  title: () => t('hall.title'),
  render() {
    const rows = loadHall()
      .map((e, i) => {
        const c = e.over ? 'var(--bug)' : i === 0 ? 'var(--gold)' : 'var(--accent)';
        const bits = [t('hist.sum.games', { n: e.games }), money(e.revenue), e.awards ? t('hist.sum.awards', { n: e.awards }) : '', t('diff.' + (e.diff || 'normal')), e.weekly ? t('hall.weekly', { id: e.weekly }) : '', e.ident ? esc(L(identityName(e.ident))) : ''].filter(Boolean).join(' · ');
        return `<div class="card row hall-row" style="gap:14px;--c:${c}"><div class="hall-n disp">${i + 1}</div><div style="flex:1;min-width:0"><div class="row" style="gap:4px 8px;flex-wrap:wrap"><b>${esc(e.studio)}</b><span class="tag" style="--c:${c}">${e.over ? t('hall.over', { y: e.year }) : t(HALL_RANK[e.rank] || HALL_RANK[0])}</span></div>
          <div class="faint" style="font-size:12px;margin-top:2px">${bits}</div>${e.best ? `<div class="faint" style="font-size:12px">${t('hall.best', { title: `<b>${esc(L(e.best.title))}</b>`, v: e.best.score.toFixed(1) })}</div>` : ''}</div>
          <div style="text-align:right"><div class="disp hall-p">${e.points}</div><div class="faint" style="font-size:11px">${t('hall.points')}</div></div></div>`;
      })
      .join('');
    return `<p class="hint" style="margin-bottom:10px">${t('hall.help')}</p><div class="col" style="gap:8px">${rows}</div>`;
  },
});

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
