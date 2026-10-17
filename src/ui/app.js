import { Scene } from '../render/scene.js';
import { on, emit } from '../core/bus.js';
import { setLang, detectLang, t } from '../core/i18n.js';
import { loadSettings, saveSettings, saveGame, loadGame } from '../core/store.js';
import { newGame } from '../sim/state.js';
import { stepTick, initWorld, checkAchievements } from '../sim/clock.js';
import { makeCompetitors } from '../sim/market.js';
import { releaseGame, cancelProject, toggleCrunch, shipNow, extendPolish } from '../sim/dev.js';
import { cancelContract } from '../sim/contracts.js';
import { refreshCandidates } from '../sim/people.js';
import { sfx, music } from '../audio/sfx.js';
import { UI, act, initUICore, toast, $, icon, L, money, esc } from './core.js';
import { buildHUD, buildDock, updateHUD, updateDock, updateDev, setHUDVisible, flashStat, fitHUD } from './hud.js';
import { showPrompt } from './prompts.js';
import { FACILITIES } from '../sim/studio.js';
import './windows.js';

const TICK = 0.6;
const SPEEDS = [0, 1, 2.2, 5];

export const app = {
  G: null,
  scene: null,
  speed: 2,
  acc: 0,
  settings: null,
  menuOpen: false,
  promptActive: false,
  mode: 'title',
  root: null,
  last: 0,
  lastMoney: 0,
  lastRp: 0,
  lastFans: 0,

  init(root) {
    this.root = root;
    this.settings = loadSettings();
    setLang(this.settings.lang || detectLang());
    this.speed = this.settings.speed ?? 2;
    root.innerHTML = `<canvas id="scene"></canvas><div class="vignette"></div>`;
    buildHUD(root);
    buildDock();
    UI.app = this;
    initUICore(root);
    this.canvas = $('#scene');
    this.scene = new Scene(this.canvas);
    this.applySettings();
    this.wire();
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.last = performance.now();
    requestAnimationFrame((n) => this.frame(n));
    setHUDVisible(false);
  },

  applySettings() {
    const s = this.settings;
    this.root.classList.toggle('crt', !!s.crt);
    if (this.scene) {
      this.scene.reduced = !!s.reduced;
      if (!!s.hd !== this.scene.glOn && !this.scene.setGL(!!s.hd) && s.hd) {
        s.hd = false;
        toast(t('set.hdFail'), 'info');
      }
    }
    sfx.setVolume?.(s.sfx ? s.sfxVol : 0);
    music.setVolume?.(s.music ? s.musicVol : 0);
    saveSettings(s);
  },
  setLanguage(l) {
    this.settings.lang = l;
    setLang(l);
    saveSettings(this.settings);
    $('#dock').innerHTML = '';
    // Bygg om HUD-texter
    this.root.querySelectorAll('#hud, #devpanel, #rcol, #pbar, #clockp, #dock, #overlay, #tip').forEach((e) => e.remove());
    buildHUD(this.root);
    buildDock();
    initUICore(this.root);
    UI.modalOn = false;
    this.promptActive = false;
    this.menuChanged();
    setHUDVisible(this.mode === 'play');
    fitHUD();
    UI.refresh();
    emit('lang', l);
  },

  resize() {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    const narrow = w < 720;
    if (this.mode === 'title') this.scene.resize(w, h, { top: Math.min(340, h * 0.5), bottom: 60 });
    else this.scene.resize(w, h, { top: narrow ? 64 : 70, bottom: narrow ? 138 : 118 });
    fitHUD();
  },

  wire() {
    const sc = this.scene;
    const cv = this.canvas;
    cv.addEventListener('pointermove', (e) => {
      if (this.mode !== 'play' || this.menuOpen) return;
      const r = cv.getBoundingClientRect();
      const hit = sc.pick(e.clientX - r.left, e.clientY - r.top);
      sc.hover = hit && hit.type !== 'building' ? hit : null;
      cv.classList.toggle('hot', !!hit);
      this.showStaffTip(hit, e);
    });
    cv.addEventListener('pointerleave', () => {
      sc.hover = null;
      $('#tip').classList.remove('on');
    });
    cv.addEventListener('click', (e) => {
      if (this.mode !== 'play' || this.menuOpen) return;
      const r = cv.getBoundingClientRect();
      const hit = sc.pick(e.clientX - r.left, e.clientY - r.top);
      if (!hit) return;
      if (hit.type === 'staff') UI.open('staff', { focus: hit.id }, { force: true });
      else UI.open('studio');
    });
    window.addEventListener('keydown', (e) => {
      if (this.mode !== 'play') return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (this.promptActive && /^(escape|m|n)$/i.test(e.key)) return; // prompten måste besvaras
      if (e.key === 'Escape') UI.close();
      else if (e.key === ' ') {
        e.preventDefault();
        this.setSpeed(this.speed === 0 ? this.prevSpeed || 2 : 0);
      } else if (e.key >= '1' && e.key <= '3') this.setSpeed(+e.key);
      else if (e.key.toLowerCase() === 'm') UI.open('menu');
      else if (e.key.toLowerCase() === 'n') UI.open('wizard');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play' && this.G && !this.G.over) saveGame(this.G);
    });
    // Sim -> UI
    on('float', (f) => sc.float(f.kind, f.staff, f.amount));
    on('toast', (n) => {
      if (this.mode !== 'play') return;
      const text = n.text || t(n.key, this.decorate(n.vars));
      toast(text, n.kind || 'info');
      if (n.kind === 'good') sfx.play('good');
      else if (n.kind === 'bad') sfx.play('bad');
      else sfx.play('notify');
    });
    on('office', () => {
      sc.tierChanged();
      sfx.play('build');
      sc.confetti(40);
      this.resize();
    });
    on('facility', () => sfx.play('build'));
    on('hired', (s) => {
      sfx.play('good');
      toast(t('toast.hired', { name: `<b>${s.name}</b>` }), 'hire');
    });
    on('researched', (r) => {
      sfx.play('research');
      toast(t('toast.researched', { name: `<b>${L(r.name)}</b>` }), 'research', 7000);
    });
    on('achievement', (a) => {
      sfx.play('achievement');
      toast(t('toast.achievement', { name: `<b>${L(a.name)}</b>` }), 'award', 8000);
    });
    on('released', (g) => {
      sc.celebrateNow(3.5);
      if (g.score >= 8) sc.confetti(110);
      if (g.score >= 9) sc.fireworks(5);
      sfx.play(g.score >= 8 ? 'fanfare' : 'release');
      checkAchievements(this.G);
    });
    on('awards', () => {
      sc.fireworks(7);
      sc.confetti(160);
    });
    on('phase', () => sfx.play('phase'));
    on('compRelease', (r) => {
      if (this.mode !== 'play' || r.score < 8.6) return;
      const title = L(r.title);
      toast(t('toast.rival', { studio: `<b>${r.studio}</b>`, title: `<b>${title}</b>`, v: r.score.toFixed(1) }), 'info');
    });
    on('contractDone', (r) => {
      toast(t(r.ok ? 'toast.contractOk' : 'toast.contractFail'), r.ok ? 'money' : 'bad');
      sfx.play(r.ok ? 'coin' : 'bad');
    });
    on('engineDone', (e) => {
      toast(t('toast.engineDone', { name: `<b>${e.name}</b>` }), 'good');
      sfx.play('good');
    });
    on('marketing', () => sfx.play('coin'));
    on('revenue', (r) => {
      if (this.mode !== 'play' || !this.G) return;
      const rel = r.amount / Math.max(1, Math.abs(this.G.money));
      if (r.amount > 150 && (rel > 0.004 || Math.random() < 0.5)) sc.moneyPop('+' + money(r.amount));
    });
    on('month', () => {
      if (this.G && !this.G.over) saveGame(this.G);
      if (this.G) music.setEra?.(1980 + Math.floor(this.G.t / 48));
    });
    on('gameover', () => music.setMood?.('sad'));
    act('crunch', () => {
      toggleCrunch(this.G);
      sfx.play('click');
    });
    act('ship', () => {
      shipNow(this.G);
    });
    act('polish-more', () => {
      extendPolish(this.G);
    });
    act('job-cancel', () => {
      const J = this.G.job;
      if (!J) return;
      UI.modal(`<div class="win-head"><div class="wi" style="--wc:var(--bug);color:var(--bug)">${icon('x')}</div><h2>${t('dev.cancelTitle')}</h2></div><div class="win-body"><p>${t(J.kind === 'game' ? 'dev.cancelText' : 'dev.cancelText2')}</p></div><div class="win-foot"><span class="sp"></span><button class="btn" data-act="modal-close">${t('ui.back')}</button><button class="btn danger" data-act="job-cancel-yes">${t('dev.cancelYes')}</button></div>`, null, 'sm');
    });
    act('job-cancel-yes', () => {
      if (this.G.job?.kind === 'game') cancelProject(this.G);
      else cancelContract(this.G);
      if (this.G.job && this.G.job.kind === 'engine') this.G.job = null;
      UI.closeModal();
    });
    act('modal-close', () => UI.closeModal());
    act('open-marketing', () => UI.open('marketing'));
  },

  decorate(vars) {
    if (!vars) return vars;
    const o = { ...vars };
    for (const k of Object.keys(o)) if (typeof o[k] === 'string' && k !== 'html') o[k] = `<b>${o[k]}</b>`;
    return o;
  },

  showStaffTip(hit, e) {
    const tip = $('#tip');
    if (!hit || hit.type !== 'staff') {
      if (hit && hit.type === 'slot') {
        const f = Object.entries(this.G.office.fac).find(([, v]) => v.slot === hit.idx);
        tip.dataset.scene = '1';
        if (f) {
          tip.innerHTML = `<b>${L(FACILITIES[f[0]].name)}</b> · ${t('ui.level')} ${f[1].lvl}`;
          this.moveTip(tip, e);
          tip.classList.add('on');
        } else tip.classList.remove('on');
      } else if (tip.dataset.scene) {
        tip.classList.remove('on');
        delete tip.dataset.scene;
      }
      return;
    }
    const s = this.G.staff.find((x) => x.id === hit.id);
    if (!s) return;
    tip.dataset.scene = '1';
    tip.innerHTML = `<b>${esc(s.name)}</b><br><span class="muted">${s.isFounder ? t('staff.founder') : ''}</span><br>${icon('bulb')} ${s.design} &nbsp; ${icon('cpu')} ${s.tech} &nbsp; ${icon('flask')} ${s.research}`;
    this.moveTip(tip, e);
    tip.classList.add('on');
  },
  moveTip(tip, e) {
    const r = this.root.getBoundingClientRect();
    tip.style.left = Math.max(6, Math.min(r.width - 220, e.clientX - r.left + 14)) + 'px';
    tip.style.top = Math.max(6, e.clientY - r.top + 16) + 'px';
  },

  setSpeed(v) {
    if (v !== 0) this.prevSpeed = v;
    this.speed = v;
    this.settings.speed = v || this.settings.speed;
    sfx.play('click');
  },
  menuChanged() {
    this.menuOpen = !!UI.cur || UI.modalOn || this.promptActive;
  },

  // ── Spelstart ──
  startGame(G, fresh) {
    this.G = G;
    this.mode = 'play';
    window.__G = G;
    this.scene.setGame(G);
    this.scene.todLock = null;
    this.scene.world.tod = fresh ? 0.3 : this.scene.world.tod;
    this.resize();
    setHUDVisible(true);
    this.acc = 0;
    this.lastMoney = G.money;
    this.lastRp = G.rp;
    this.lastFans = G.fans;
    this.promptActive = false;
    UI.closeModal();
    if (fresh) saveGame(G);
    music.setEra?.(1980 + Math.floor(G.t / 48));
    music.start?.();
    music.setMood?.('play');
    emit('gameStart', G);
  },
  startNew(opts) {
    const G = newGame(opts);
    makeCompetitors(G);
    initWorld(G);
    refreshCandidates(G);
    this.startGame(G, true);
    G.flags.tut = { step: 0 };
    emit('newGame', G);
  },
  continueGame() {
    const G = loadGame();
    if (!G) return false;
    this.startGame(G, false);
    return true;
  },
  toTitle() {
    if (this.G && !this.G.over) saveGame(this.G);
    UI.close(true);
    this.promptActive = false;
    UI.closeModal();
    this.mode = 'title';
    this.G = null;
    setHUDVisible(false);
    emit('title');
  },

  // ── Loop ──
  frame(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const G = this.G;
    if (this.mode === 'play' && G) {
      const blocked = G.pending.length > 0 || (this.settings.menuPause && this.menuOpen) || this.speed === 0 || !!G.over || this.promptActive;
      this.scene.paused = blocked;
      this.scene.speed = this.speed;
      if (!blocked) {
        this.acc += dt * SPEEDS[this.speed] * (this.turbo || 1);
        let guard = 0;
        while (this.acc >= TICK && guard++ < (this.turbo ? 600 : 8)) {
          this.acc -= TICK;
          if (!stepTick(G)) break;
          if (G.pending.length) break;
        }
      } else this.acc = Math.min(this.acc, TICK);
      // En prompt vars modal försvunnit (utan finish) får inte låsa spelet; den visas igen nedan
      if (this.promptActive && !UI.modalOn) {
        this.promptActive = false;
        this.menuChanged();
      }
      if (G.pending.length && !this.promptActive && !UI.modalOn) {
        showPrompt(this, G.pending[0]);
      }
      this.trackFlash(G);
      updateHUD(G, dt);
      updateDock(G);
      updateDev(G);
      emit('frame', dt);
    }
    if (this.scene.G) {
      this.scene.update(dt);
      this.scene.draw();
    }
    requestAnimationFrame((n) => this.frame(n));
  },

  trackFlash(G) {
    if (Math.abs(G.money - this.lastMoney) > Math.max(50, Math.abs(this.lastMoney) * 0.002)) {
      flashStat('money', G.money > this.lastMoney);
      this.lastMoney = G.money;
    }
    if (G.rp - this.lastRp > 5 || G.rp < this.lastRp - 1) {
      flashStat('rp', G.rp > this.lastRp);
      this.lastRp = G.rp;
    }
    if (Math.abs(G.fans - this.lastFans) > Math.max(30, this.lastFans * 0.01)) {
      flashStat('fans', G.fans > this.lastFans);
      this.lastFans = G.fans;
    }
  },
  release() {
    return releaseGame(this.G);
  },
};
