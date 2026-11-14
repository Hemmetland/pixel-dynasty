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
// Högen ligger under uppgiftskortet och klockan sitter längst ner: växer kortet (ny uppgiftsrad, målraden) eller ändras fönstret
// efter att en notis lagts till måste passningen göras om, så vi följer #devpanel, #pnl och #clockp
let watched = [];
const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => placeToasts()) : null;
if (typeof addEventListener !== 'undefined') addEventListener('resize', () => placeToasts());
export function placeToasts() {
  const box = $('#toasts');
  const dp = $('#devpanel');
  if (!box) return;
  const now = [dp, $('#pnl'), $('#clockp')].filter(Boolean);
  if (ro && (now.length !== watched.length || now.some((e, i) => e !== watched[i]))) {
    ro.disconnect();
    for (const e of now) ro.observe(e);
    watched = now;
  }
  const on = narrow() && dp && dp.classList.contains('on') && dp.offsetHeight;
  // handledningen ligger på samma ställe på mobilen: notiserna hamnar under den
  const coach = narrow() ? $('#coach.on') : null;
  box.style.top = coach && coach.offsetHeight ? coach.offsetTop + coach.offsetHeight + 8 + 'px' : on ? dp.offsetTop + dp.offsetHeight + 8 + 'px' : '';
  // låg skärm (liggande mobil): handledningen ligger uppe till höger, där notiserna annars visas. De hamnar under den.
  box.style.marginTop = '';
  const lowCoach = !narrow() && typeof matchMedia !== 'undefined' && matchMedia('(max-height: 559px)').matches ? $('#coach.on') : null;
  if (lowCoach && lowCoach.offsetHeight) {
    const gap = lowCoach.getBoundingClientRect().bottom + 8 - box.getBoundingClientRect().top;
    if (gap > 0) box.style.marginTop = Math.round(gap) + 'px';
  }
  fitToasts(box);
}
// Högen får inte nå ner över klockan (eller dockan). Äldsta faller först, den sista krymps, och finns det nästan inget utrymme
// visas bara svar på spelarens egna handlingar (nyheterna finns kvar i krönikan). Körs om varje gång något ovanför eller klockan ändrar storlek.
function fitToasts(box) {
  const live = [...box.children].filter((c) => !c.classList.contains('out'));
  if (!live.length) return;
  for (const c of live) {
    c.classList.remove('compact');
    c.style.maxHeight = '';
  }
  const clock = $('#clockp');
  const limit = clock && clock.offsetHeight ? clock.getBoundingClientRect().top : innerHeight - 90;
  const room = limit - 8 - box.getBoundingClientRect().top;
  // en notis som tonar ut tar plats i högen i 0,4 s, så den räknas med; de som faller för att det är trångt försvinner direkt
  let used = [...box.children].reduce((n, c) => n + c.offsetHeight + 6, 0);
  const cut = (c) => {
    used -= c.offsetHeight + 6;
    c.remove();
  };
  let keep = live;
  if (room < 40) {
    for (const c of live) if (!c.dataset.force) cut(c);
    keep = live.filter((c) => c.dataset.force);
  }
  while (keep.length > 1 && used > room) cut(keep.shift());
  // den sista får inte heller täcka klockan: först utan effektbrickor och med högst två rader, sedan med högsta höjd
  if (keep.length === 1 && used > room) {
    const el = keep[0];
    el.classList.add('compact');
    const over = [...box.children].reduce((n, c) => n + c.offsetHeight + 6, 0) - room;
    if (over > 0) el.style.maxHeight = Math.max(34, el.offsetHeight - Math.ceil(over)) + 'px';
  }
}
// Händelsekort: viktiga händelser (milstolpar, priser, prestationer) ligger kvar högst upp tills spelaren stänger dem.
// opts: { kind: 'award' | 'milestone' | 'achievement', text, ic, go } där go är ett fönster som Visa-knappen öppnar.
const EV = { award: ['trophy', 'var(--gold)', 'ev.award'], milestone: ['flag', 'var(--accent)', 'ev.milestone'], achievement: ['award', 'var(--fans)', 'ev.achievement'] };
export function eventCard({ kind = 'milestone', text, ic, go = 'news' }) {
  let box = $('#events');
  if (!box) {
    box = document.createElement('div');
    box.id = 'events';
    document.body.appendChild(box);
  }
  const [def, col, key] = EV[kind] || EV.milestone;
  for (const o of box.children) if (o.dataset.txt === text) o.remove();
  const el = document.createElement('div');
  el.className = 'evcard glass';
  el.dataset.txt = text;
  el.style.setProperty('--c', col);
  el.innerHTML = `<div class="ev-i">${icon(ic || def)}</div><div class="ev-b"><div class="ev-k">${t(key)}</div><div class="ev-t">${text}</div></div>
    <div class="ev-a">${go ? `<button class="btn sm" data-ev="go">${t('ev.show')}</button>` : ''}<button class="iconbtn" data-ev="x" aria-label="${esc(t('ui.close'))}">${icon('x')}</button></div>`;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ev]');
    if (!b) return;
    if (b.dataset.ev === 'go' && go) UI.open(go, null, { force: true });
    dropEvent(el);
  });
  box.prepend(el);
  // högst tre kort åt gången: de äldsta ligger kvar i nyhetsfliken
  const live = [...box.children].filter((c) => !c.classList.contains('out'));
  for (const o of live.slice(3)) dropEvent(o);
}
const dropEvent = (el) => {
  if (el.classList.contains('out')) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 380);
};
export const clearEvents = () => {
  const box = $('#events');
  if (box) box.innerHTML = '';
};
const dropToast = (el) => {
  if (el.classList.contains('out')) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 380);
};
// force: felmeddelanden på något spelaren just gjorde visas alltid (standard för 'bad'); nyheter från spelet, även dåliga, hoppas över när det saknas plats
export function toast(text, kind = 'info', ms = 5200, force = kind === 'bad') {
  const box = $('#toasts');
  if (!box) return;
  // Är fönstret så lågt att det inte finns plats för en notis utan att den täcker klockan visas bara felmeddelanden
  // (nyheterna finns kvar i krönikan)
  {
    const clock = $('#clockp');
    const limit = clock && clock.offsetHeight ? clock.getBoundingClientRect().top : innerHeight - 90;
    if (!force && limit - 8 - box.getBoundingClientRect().top < 40) return;
  }
  // samma text igen: låt den gamla försvinna så att den nya hamnar sist
  for (const o of box.children) if (o.dataset.txt === text) o.remove();
  // lästid: längre texter får stå kvar längre (cirka 55 ms per tecken, högst nio sekunder)
  ms = Math.min(9000, Math.max(ms, 2400 + 55 * text.replace(/<[^>]*>/g, '').length));
  const el = document.createElement('div');
  el.className = 'toast glass';
  el.dataset.txt = text;
  if (force) el.dataset.force = '1';
  el.style.setProperty('--c', TOAST_COL[kind] || TOAST_COL.info);
  el.style.setProperty('--ms', ms + 'ms');
  el.innerHTML = `<div class="ti">${icon(TOAST_ICON[kind] || 'info')}</div><div class="tt">${text}</div>`;
  el.addEventListener('click', () => dropToast(el)); // tryck bort
  box.appendChild(el);
  // låg skärm (liggande mobil): en notis i taget, annars når högen ner över dockan
  const low = typeof matchMedia !== 'undefined' && matchMedia('(max-height: 559px)').matches;
  const max = narrow() ? 2 : low ? 1 : 3;
  const live = [...box.children].filter((c) => !c.classList.contains('out'));
  for (const o of live.slice(0, Math.max(0, live.length - max))) dropToast(o);
  placeToasts(); // lägger högen och passar in den under klockan
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
  const neg = Math.round(n) < 0; // under en halv dollar blir $0, inte −$0
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
// En marknadsandel i hela procent; en liten andel som avrundas till noll skrivs "<1" så att den inte ser ut att saknas
export const pctShare = (x) => (x > 0 && Math.round(x * 100) === 0 ? '&lt;1' : Math.round(x * 100));
