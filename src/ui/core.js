import { icon } from './icons.js';
import { t, L } from '../core/i18n.js';
import { esc } from '../core/util.js';
import { sfx } from '../audio/sfx.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export { esc, icon, t, L };

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
    if (!def) return;
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

export function initUICore(root) {
  UI.root = root;
  UI.overlay = $('#overlay', root);
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
  // Verktygstips
  const tip = $('#tip', root);
  let tipEl = null;
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (el !== tipEl) {
      tipEl = el;
      if (el) {
        tip.innerHTML = el.dataset.tip;
        tip.classList.add('on');
      } else tip.classList.remove('on');
    }
    if (el) {
      const r = root.getBoundingClientRect();
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
  document.addEventListener('pointerleave', () => tip.classList.remove('on'));
  document.addEventListener('pointerdown', () => tip.classList.remove('on'));
  return tip;
}

// ── Toast ──
const TOAST_ICON = { info: 'info', good: 'check', bad: 'bug', platform: 'gamepad', award: 'trophy', research: 'flask', money: 'money', hire: 'team' };
const TOAST_COL = { info: 'var(--accent)', good: 'var(--good)', bad: 'var(--bug)', platform: 'var(--design)', award: 'var(--gold)', research: 'var(--rp)', money: 'var(--money)', hire: 'var(--fans)' };
export function toast(text, kind = 'info', ms = 5200) {
  const box = $('#toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast glass';
  el.style.setProperty('--c', TOAST_COL[kind] || TOAST_COL.info);
  el.innerHTML = `<div class="ti">${icon(TOAST_ICON[kind] || 'info')}</div><div>${text}</div>`;
  box.appendChild(el);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 380);
  }, ms);
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
