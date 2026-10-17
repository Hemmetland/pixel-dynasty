import { icon } from './icons.js';
import { t, tn, L } from '../core/i18n.js';
import { esc } from '../core/util.js';
import { sfx } from '../audio/sfx.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export { esc, icon, t, tn, L };

// ── Åtgärdsregister (event delegation via data-act) ──
const acts = new Map();
export const act = (name, fn) => acts.set(name, fn);
export const wins = new Map();
export const regWin = (def) => wins.set(def.id, def);

export const UI = {
  app: null,
  cur: null,
  arg: null,
  hist: [],
  onClose: null,
  root: null,
  overlay: null,
  open(id, arg, opts = {}) {
    const def = wins.get(id);
    if (!def || this.app?.promptActive) return; // ett fönster skulle skriva över prompten
    const can = def.canOpen ? def.canOpen(this.app.G) : true;
    if (can !== true) {
      if (typeof can === 'string') toast(can, 'bad');
      return;
    }
    if (this.cur === id && !opts.force) {
      this.close();
      return;
    }
    this.cur = id;
    this.arg = arg;
    def.onOpen?.(this.app.G, arg);
    sfx.play('open');
    this.render(true);
    this.app?.menuChanged();
  },
  close(silent) {
    if (!this.cur && !this.modalOn) return;
    const def = wins.get(this.cur);
    this.cur = null;
    this.arg = null;
    this.modalOn = false;
    this.overlay.classList.remove('on');
    this.overlay.innerHTML = '';
    if (!silent) sfx.play('close');
    def?.onClose?.();
    this.app?.menuChanged();
  },
  refresh() {
    if (this.cur) this.render(false);
  },
  render(first) {
    const def = wins.get(this.cur);
    if (!def) return;
    const ov = this.overlay;
    const scroll = {};
    if (!first) {
      for (const el of $$('[data-keep]', ov)) scroll[el.dataset.keep] = [el.scrollTop, el.scrollLeft];
    }
    const G = this.app.G;
    const sub = def.sub ? def.sub(G, this.arg) : '';
    const html = `
      <div class="win glass ${def.size || ''}" style="--wc:${def.color || 'var(--accent)'}" role="dialog" aria-label="${esc(def.title(G))}">
        <div class="win-head">
          <div class="wi">${icon(def.icon || 'info')}</div>
          <h2>${esc(def.title(G))}${sub ? `<div class="sub">${sub}</div>` : ''}</h2>
          ${def.headExtra ? def.headExtra(G, this.arg) : ''}
          <button class="iconbtn" data-act="close" aria-label="${t('ui.close')}" data-tip="${t('ui.close')} (Esc)">${icon('x')}</button>
        </div>
        <div class="win-body" data-keep="body">${def.render(G, this.arg)}</div>
        ${def.foot ? `<div class="win-foot">${def.foot(G, this.arg)}</div>` : ''}
      </div>`;
    ov.innerHTML = html;
    ov.classList.add('on');
    if (!first) {
      for (const el of $$('[data-keep]', ov)) if (scroll[el.dataset.keep]) [el.scrollTop, el.scrollLeft] = scroll[el.dataset.keep];
      const w = $('.win', ov);
      if (w) w.style.animation = 'none';
    }
    def.bind?.($('.win', ov), G, this.arg);
  },
  // Enkel modal (för prompts). def: {html, bind, size, dismiss}
  modal(html, bind, size = '') {
    this.cur = null;
    this.modalOn = true;
    this.overlay.innerHTML = `<div class="win glass ${size}">${html}</div>`;
    this.overlay.classList.add('on');
    bind?.($('.win', this.overlay));
    this.app?.menuChanged();
  },
  closeModal() {
    this.modalOn = false;
    this.overlay.classList.remove('on');
    this.overlay.innerHTML = '';
    this.app?.menuChanged();
  },
};

// Dokumentlyssnarna kopplas bara en gång; ett nytt anrop (språkbyte bygger om HUD) hämtar bara om rot och overlay
let wired = false;
export function initUICore(root) {
  UI.root = root;
  UI.overlay = $('#overlay', root);
  if (wired) return;
  wired = true;
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (el && !el.disabled) {
      const name = el.dataset.act;
      if (name === 'close') {
        UI.close();
        return;
      }
      const fn = acts.get(name);
      if (fn) {
        sfx.play(el.dataset.sfx || 'click');
        fn(el, e);
      }
      return;
    }
    if (e.target === UI.overlay && UI.cur) UI.close();
  });
  // Verktygstips (#tip byggs om vid språkbyte, så det slås upp varje gång)
  const tipOf = () => $('#tip', UI.root);
  let tipEl = null;
  document.addEventListener('pointermove', (e) => {
    const tip = tipOf();
    if (!tip) return;
    const el = e.target.closest?.('[data-tip]');
    if (el !== tipEl) {
      tipEl = el;
      if (el) {
        tip.innerHTML = el.dataset.tip;
        tip.classList.add('on');
      } else tip.classList.remove('on');
    }
    if (el) {
      const r = UI.root.getBoundingClientRect();
      let x = e.clientX - r.left + 14;
      let y = e.clientY - r.top + 16;
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      if (x + w > r.width - 8) x = e.clientX - r.left - w - 12;
      if (y + h > r.height - 8) y = e.clientY - r.top - h - 12;
      tip.style.left = Math.max(6, x) + 'px';
      tip.style.top = Math.max(6, y) + 'px';
    }
  });
  document.addEventListener('pointerleave', () => tipOf()?.classList.remove('on'));
  document.addEventListener('pointerdown', () => tipOf()?.classList.remove('on'));
  // Pekskärm: långt tryck (450 ms) på något med data-tip visar tipset vid elementet, och klicket som följer sväljs
  let press = null;
  let swallow = false;
  const endPress = () => {
    if (press) clearTimeout(press.timer);
    press = null;
  };
  document.addEventListener('pointerdown', (e) => {
    endPress();
    swallow = false;
    if (e.pointerType !== 'touch') return;
    const el = e.target.closest?.('[data-tip]');
    if (!el) return;
    press = {
      x: e.clientX,
      y: e.clientY,
      timer: setTimeout(() => {
        press = null;
        const tip = tipOf();
        if (!tip || !el.isConnected) return;
        swallow = true;
        tip.innerHTML = el.dataset.tip;
        tip.classList.add('on');
        const r = UI.root.getBoundingClientRect();
        const b = el.getBoundingClientRect();
        const w = tip.offsetWidth;
        const h = tip.offsetHeight;
        const x = Math.min(Math.max(6, b.left + b.width / 2 - w / 2 - r.left), r.width - w - 6);
        let y = b.top - r.top - h - 10;
        if (y < 6) y = b.bottom - r.top + 10;
        tip.style.left = Math.max(6, x) + 'px';
        tip.style.top = Math.max(6, Math.min(y, r.height - h - 6)) + 'px';
      }, 450),
    };
  });
  document.addEventListener('pointermove', (e) => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) endPress();
  });
  document.addEventListener('pointerup', endPress);
  document.addEventListener('pointercancel', endPress);
  window.addEventListener(
    'click',
    (e) => {
      if (!swallow) return;
      swallow = false;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );
  document.addEventListener('contextmenu', (e) => {
    if (swallow) e.preventDefault();
  });
}

// ── Toast ──
const TOAST_ICON = { info: 'info', good: 'check', bad: 'bug', platform: 'gamepad', award: 'trophy', research: 'flask', money: 'money', hire: 'team' };
const TOAST_COL = { info: 'var(--accent)', good: 'var(--good)', bad: 'var(--bug)', platform: 'var(--design)', award: 'var(--gold)', research: 'var(--rp)', money: 'var(--money)', hire: 'var(--fans)' };
const narrow = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 760px)').matches;
// Mobil: notiserna läggs under utvecklingspanelen i stället för över den (följer panelens höjd)
let dpSeen = null;
const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => placeToasts()) : null;
function placeToasts() {
  const box = $('#toasts');
  const dp = $('#devpanel');
  if (!box) return;
  if (ro && dp && dp !== dpSeen) {
    if (dpSeen) ro.unobserve(dpSeen);
    ro.observe(dp);
    dpSeen = dp;
  }
  const on = narrow() && dp && dp.classList.contains('on') && dp.offsetHeight;
  box.style.top = on ? dp.offsetTop + dp.offsetHeight + 8 + 'px' : '';
}
const dropToast = (el) => {
  if (el.classList.contains('out')) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 380);
};
export function toast(text, kind = 'info', ms = 5200) {
  const box = $('#toasts');
  if (!box) return;
  // samma text igen: låt den gamla försvinna så att den nya hamnar sist
  for (const o of box.children) if (o.dataset.txt === text) o.remove();
  const el = document.createElement('div');
  el.className = 'toast glass';
  el.dataset.txt = text;
  el.style.setProperty('--c', TOAST_COL[kind] || TOAST_COL.info);
  el.innerHTML = `<div class="ti">${icon(TOAST_ICON[kind] || 'info')}</div><div>${text}</div>`;
  el.addEventListener('click', () => dropToast(el)); // tryck bort
  box.appendChild(el);
  const max = narrow() ? 2 : 3;
  const live = [...box.children].filter((c) => !c.classList.contains('out'));
  for (const o of live.slice(0, Math.max(0, live.length - max))) dropToast(o);
  placeToasts();
  setTimeout(() => dropToast(el), ms);
}

// Felsvar från simulatorn: översatt text, en strängnyckel, en kort kod ('money', 'invalid' …) eller false
const ERR_KEY = { money: 'err.money', few: 'work.few', tier: 'wiz.tooOld' };
export function errToast(r) {
  let s = typeof r === 'string' ? r : '';
  if (ERR_KEY[s]) s = t(ERR_KEY[s]);
  else if (/^[\w.]+$/.test(s)) s = t(s) !== s ? t(s) : ''; // nyckel eller okänd kod
  toast(s || t('err.generic'), 'bad');
}

export const bar = (pct, color, cls = '') => `<div class="bar ${cls}" style="--c:${color}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
export const money = (n) => {
  const neg = n < 0;
  const a = Math.abs(Math.round(n));
  let s;
  if (a >= 1e9) s = (a / 1e9).toFixed(a >= 1e10 ? 1 : 2) + 'B';
  else if (a >= 1e6) s = (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
  else if (a >= 1e5) s = Math.round(a / 1e3) + 'K';
  else s = a.toLocaleString('en-US').replace(/,/g, ' ');
  return (neg ? '−' : '') + '$' + s;
};
export const moneyFull = (n) => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US').replace(/,/g, ' ');
export const MONTHS = {
  sv: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
