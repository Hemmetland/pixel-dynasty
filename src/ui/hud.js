import { $, $$, esc, icon, t, L, UI, act, money, MONTHS, bar } from './core.js';
import { glyphImg } from '../render/glyphs.js';
import { TOPIC } from '../data/topics.js';
import { GENRE } from '../data/genres.js';
import { PLATFORM } from '../data/platforms.js';
import { dateOf, TICKS_PER_WEEK } from '../sim/const.js';
import { rpPerWeek } from '../sim/research.js';
import { canUpgradeOffice } from '../sim/studio.js';
import { canHire } from '../sim/people.js';
import { canLicense } from '../sim/actions.js';
import { RESEARCH } from '../data/research.js';
import { canResearch } from '../sim/research.js';
import { lang } from '../core/i18n.js';
import { fmtNum } from '../core/util.js';
import { music } from '../audio/sfx.js';
import { CLIENTS, BRIEFS } from '../data/events.js';

export const LOGOS = ['c_gameplay', 'g_action', 't_space', 't_fantasy', 't_robots', 't_pirates', 'g_casual', 't_magic'];

const DOCK = [
  { id: 'wizard', ic: 'plus', k: 'dock.create', create: true },
  { id: 'research', ic: 'flask', k: 'dock.research' },
  { id: 'staff', ic: 'team', k: 'dock.team' },
  { id: 'studio', ic: 'building', k: 'dock.studio' },
  { id: 'market', ic: 'chart', k: 'dock.market' },
  { id: 'finance', ic: 'bank', k: 'dock.finance' },
  { id: 'library', ic: 'gamepad', k: 'dock.games' },
  { id: 'contracts', ic: 'hammer', k: 'dock.work' },
];

let els = {};
const disp = { money: 0, rp: 0, fans: 0 };
let lastDock = 0;

export function buildHUD(root) {
  root.insertAdjacentHTML('beforeend', `
    <div id="hud">
      <div class="brand glass"><div class="logo"></div><div><div class="nm"></div><div class="dt"></div></div></div>
      <div class="speed glass" id="speed">
        <button data-act="speed" data-v="0" data-tip="${t('ui.pause')} <span class='kbd'>Space</span>">${icon('pause')}</button>
        <button data-act="speed" data-v="1" data-tip="${t('ui.speed1')} <span class='kbd'>1</span>">${icon('play')}</button>
        <button data-act="speed" data-v="2" data-tip="${t('ui.speed2')} <span class='kbd'>2</span>">${icon('fast')}</button>
        <button data-act="speed" data-v="3" data-tip="${t('ui.speed3')} <span class='kbd'>3</span>">${icon('faster')}</button>
      </div>
      <div class="stats">
        <div class="stat glass" id="st-money" style="--c:var(--money)" data-tip=""><div class="ico">${icon('money')}</div><div><div class="v num">$0</div><div class="s"></div></div></div>
        <div class="stat glass" id="st-rp" style="--c:var(--rp)" data-tip=""><div class="ico">${icon('flask')}</div><div><div class="v num">0</div><div class="s"></div></div></div>
        <div class="stat glass" id="st-fans" style="--c:var(--fans)" data-tip=""><div class="ico">${icon('heart')}</div><div><div class="v num">0</div><div class="s"></div></div></div>
        <button class="glass menu-btn" id="mute-btn" data-act="hud-mute" data-tip="${t('ui.sound')}">${icon('volume')}</button>
        <button class="glass menu-btn" data-act="menu" data-tip="${t('ui.menu')} <span class='kbd'>M</span>">${icon('menu')}</button>
      </div>
    </div>
    <div id="devpanel" class="glass"></div>
    <div id="toasts"></div>
    <div id="dock" class="glass"></div>
    <div id="overlay"></div>
    <div id="tip"></div>`);
  els = {
    hud: $('#hud'),
    logo: $('.brand .logo'),
    name: $('.brand .nm'),
    date: $('.brand .dt'),
    speed: $('#speed'),
    money: $('#st-money'),
    rp: $('#st-rp'),
    fans: $('#st-fans'),
    dev: $('#devpanel'),
    dock: $('#dock'),
  };
  act('speed', (el) => UI.app.setSpeed(+el.dataset.v));
  act('menu', () => UI.open('menu'));
  act('hud-mute', () => {
    const app = UI.app;
    const on = !(app.settings.music || app.settings.sfx);
    app.settings.music = on;
    app.settings.sfx = on;
    app.applySettings();
    if (on) music.start?.();
    else music.stop?.();
    const b = $('#mute-btn');
    if (b) b.innerHTML = icon(on ? 'volume' : 'mute');
  });
  act('dock', (el) => UI.open(el.dataset.id));
}

export function setHUDVisible(on) {
  for (const id of ['hud', 'dock', 'devpanel']) {
    const el = $('#' + id);
    if (el) el.style.display = on ? '' : 'none';
  }
  if (!on) $('#toasts').innerHTML = '';
}

export function buildDock() {
  els.dock.innerHTML = DOCK.map((d) => `<button class="dk ${d.create ? 'create' : ''}" data-act="dock" data-id="${d.id}" data-key="${d.id}" data-tip="${t(d.k + '.tip')}">${icon(d.ic)}<span class="l">${t(d.k)}</span></button>`).join('');
}

const seasonIcon = (m) => (m === 11 || m <= 1 ? 'snow' : m <= 4 ? 'flower' : m <= 7 ? 'sun' : 'leaf');

export function updateHUD(G, dt) {
  if (!G) return;
  const d = dateOf(G.t);
  els.logo.innerHTML = glyphImg(LOGOS[G.logo % LOGOS.length], '#ffffff', 16, true).replace('class="gl"', 'class="gl" style="width:24px;height:24px"');
  els.name.textContent = G.studio;
  els.date.innerHTML = `<span class="season">${icon(seasonIcon(d.month))}</span><b>${d.year}</b> · ${MONTHS[lang][d.month]} · ${t('ui.weekShort')}${d.week + 1}`;
  // talanimering
  const tween = (key, target) => {
    const k = 1 - Math.pow(0.0005, dt || 0.016);
    disp[key] += (target - disp[key]) * k;
    if (Math.abs(target - disp[key]) < 0.6) disp[key] = target;
    return disp[key];
  };
  const m = tween('money', G.money);
  const r = tween('rp', G.rp);
  const f = tween('fans', G.fans);
  const set = (el, text, sub, tip) => {
    const v = $('.v', el);
    if (v.textContent !== text) v.textContent = text;
    if (sub !== undefined) $('.s', el).textContent = sub;
    if (tip !== undefined) el.dataset.tip = tip;
  };
  const net = G.lastMonth.income - G.lastMonth.expense;
  set(els.money, money(m), (net >= 0 ? '▲ ' : '▼ ') + money(Math.abs(net)) + t('ui.perMonth'), `<b>${t('hud.money')}</b><br>${t('hud.moneyTip')}`);
  els.money.classList.toggle('neg', G.money < 0);
  $('.v', els.money).style.color = G.money < 0 ? 'var(--bug)' : '';
  set(els.rp, fmtNum(r), '+' + rpPerWeek(G).toFixed(1) + t('ui.perWeek'), `<b>${t('hud.rp')}</b><br>${t('hud.rpTip')}`);
  set(els.fans, fmtNum(f), t('hud.fansSub'), `<b>${t('hud.fans')}</b><br>${t('hud.fansTip')}`);
  // speed
  for (const b of $$('button', els.speed)) b.classList.toggle('on', +b.dataset.v === UI.app.speed);
  const mb = $('#mute-btn');
  if (mb) {
    const on = UI.app.settings.music || UI.app.settings.sfx;
    if (mb.dataset.on !== String(on)) {
      mb.dataset.on = String(on);
      mb.innerHTML = icon(on ? 'volume' : 'mute');
    }
  }
}

export function flashStat(which, up) {
  const el = which === 'money' ? els.money : which === 'rp' ? els.rp : els.fans;
  el.classList.remove('flash-up', 'flash-dn');
  void el.offsetWidth;
  el.classList.add(up ? 'flash-up' : 'flash-dn');
}

// ── Dock-notiser ──
export function updateDock(G) {
  const now = performance.now();
  if (now - lastDock < 450) return;
  lastDock = now;
  const set = (id, kind, val) => {
    const b = $(`.dk[data-key="${id}"]`, els.dock);
    if (!b) return;
    let el = $('.dot, .badge', b);
    if (!val) {
      el?.remove();
      return;
    }
    const want = kind === 'badge' ? 'badge' : 'dot';
    if (!el || !el.classList.contains(want)) {
      el?.remove();
      el = document.createElement('i');
      el.className = want;
      b.appendChild(el);
    }
    if (kind === 'badge') el.textContent = val;
  };
  const cw = $('.dk.create', els.dock);
  cw.classList.toggle('glow', !G.job && G.pending.length === 0);
  cw.classList.toggle('busy', !!G.job);
  const resAvail = RESEARCH.some((r) => canResearch(G, r.id) === true);
  set('research', 'dot', resAvail);
  const afford = G.candidates.some((c) => G.money >= c.fee);
  set('staff', 'dot', canHire(G) && afford && G.staff.length < 4 + G.office.tier * 3);
  set('studio', 'dot', canUpgradeOffice(G) === true);
  const lic = Object.keys(PLATFORM).some((id) => canLicense(G, id) === true && PLATFORM[id].license > 0 && G.money > PLATFORM[id].license * 3 && PLATFORM[id].weight > 18);
  set('market', 'dot', lic && G.flags.seenPlat !== G.t);
  set('contracts', 'badge', !G.job && G.contracts.length ? G.contracts.length : 0);
  for (const b of $$('.dk', els.dock)) b.classList.toggle('on', UI.cur === b.dataset.key);
}

// ── Utvecklingspanel ──
let devKey = '';
export function updateDev(G) {
  const J = G.job;
  const el = els.dev;
  if (!J) {
    el.classList.remove('on');
    devKey = '';
    return;
  }
  el.classList.add('on');
  if (J.kind === 'game') return updateDevGame(G, J, el);
  const key = J.kind + J.id + (J.state || '');
  if (key !== devKey) {
    devKey = key;
    el.innerHTML = `
      <div class="dev-top"><div class="wi" style="width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:rgba(77,225,208,.16);color:var(--accent)">${icon(J.kind === 'contract' ? 'hammer' : 'cpu')}</div>
      <div style="flex:1;min-width:0"><div class="lbl">${t(J.kind === 'contract' ? 'dev.contract' : 'dev.engine')}</div><div class="t" id="dv-title"></div></div></div>
      <div id="dv-bar" style="margin:14px 0 6px"></div>
      <div class="row" id="dv-sub" style="justify-content:space-between;font-size:12px;color:var(--muted)"></div>
      <div class="dev-actions"><button class="btn sm danger" data-act="job-cancel">${t('dev.cancel')}</button></div>`;
  }
  const total = J.total;
  $('#dv-bar', el).innerHTML = bar((J.ticks / total) * 100, 'var(--accent)', 'tall');
  if (J.kind === 'contract') {
    $('#dv-title', el).textContent = L(BRIEFS[J.c.brief]) + ' · ' + L(CLIENTS[J.c.client]);
    const okD = Math.min(100, (J.D / J.c.reqD) * 100);
    const okT = Math.min(100, (J.T / J.c.reqT) * 100);
    $('#dv-sub', el).innerHTML = `<span style="color:var(--design)">${t('stat.design')} ${Math.round(okD)}%</span><span style="color:var(--tech)">${t('stat.tech')} ${Math.round(okT)}%</span><span>${Math.ceil((total - J.ticks) / TICKS_PER_WEEK)} ${t('ui.weeksShort')}</span>`;
  } else {
    $('#dv-title', el).textContent = J.name;
    $('#dv-sub', el).innerHTML = `<span>${Math.ceil((total - J.ticks) / TICKS_PER_WEEK)} ${t('ui.weeksShort')}</span>`;
  }
}

function updateDevGame(G, J, el) {
  const key = 'game' + J.id + J.state;
  if (key !== devKey) {
    devKey = key;
    const tp = TOPIC[J.topic];
    const ge = GENRE[J.genre];
    el.innerHTML = `
      <div class="dev-top">
        <div class="wi" style="width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,${tp.c1},${tp.c2});box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)">${glyphImg(tp.glyph, '#fff', 32, true)}</div>
        <div style="flex:1;min-width:0"><div class="lbl" id="dv-phase"></div><div class="t" id="dv-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div></div>
      </div>
      <div class="dev-chips">
        <span class="chip c" style="--c:${ge.color}">${glyphImg(ge.glyph, ge.color, 16, false)}${L(ge.name)}</span>
        <span class="chip">${L(tp.name)}</span>
        <span class="chip" style="--c:${PLATFORM[J.platform].color}">${esc(PLATFORM[J.platform].name)}</span>
      </div>
      <div class="phases" id="dv-phases"></div>
      <div class="phase-names" id="dv-pn"></div>
      <div class="counters">
        <div class="counter" style="--c:var(--design)" data-tip="${t('tip.design')}"><div class="v num" id="dv-d">0</div><div class="k">${t('stat.design')}</div></div>
        <div class="counter" style="--c:var(--tech)" data-tip="${t('tip.tech')}"><div class="v num" id="dv-t">0</div><div class="k">${t('stat.tech')}</div></div>
        <div class="counter" style="--c:var(--bug)" data-tip="${t('tip.bugs')}"><div class="v num" id="dv-b">0</div><div class="k">${t('stat.bugs')}</div></div>
        <div class="counter" style="--c:var(--hot)" data-tip="${t('tip.hype')}"><div class="v num" id="dv-h">0</div><div class="k">${t('stat.hype')}</div></div>
      </div>
      <div class="dev-actions" id="dv-act"></div>`;
    $('#dv-title', el).textContent = J.title;
  }
  const phaseLen = J.devTicks / 3;
  const pnames = [t('dev.p1'), t('dev.p2'), t('dev.p3'), t('dev.polish')];
  const cur = J.phase;
  let ph = '';
  for (let i = 0; i < 4; i++) {
    let pct = 0;
    if (i < 3) pct = i < cur ? 100 : i === cur ? ((J.ticks - i * phaseLen) / phaseLen) * 100 : 0;
    else pct = cur === 3 ? (J.polishDone / J.polishTicks) * 100 : 0;
    ph += `<div class="phase ${i === cur ? 'cur' : ''} ${i === 3 ? 'pol' : ''}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
  }
  $('#dv-phases', el).innerHTML = ph;
  $('#dv-pn', el).innerHTML = pnames.map((n, i) => `<span class="${i === cur ? 'cur' : ''}">${n}</span>`).join('');
  $('#dv-phase', el).textContent = J.state === 'report' ? t('dev.done') : cur < 3 ? pnames[cur] : t('dev.polishing');
  $('#dv-d', el).textContent = Math.round(J.D);
  $('#dv-t', el).textContent = Math.round(J.T);
  $('#dv-b', el).textContent = Math.round(J.bugs);
  $('#dv-h', el).textContent = Math.round(J.hype);
  // åtgärder
  const actEl = $('#dv-act', el);
  const akey = [cur, J.crunch, J.marketing.length, J.extended, G.u.mkt.length, J.state, J.ticks >= J.devTicks * 0.2].join('|');
  if (actEl.dataset.k !== akey) {
    actEl.dataset.k = akey;
    let h = '';
    if (J.state === 'dev') {
      if (cur < 3) {
        if (G.u.mkt.length) h += `<button class="btn sm" data-act="open-marketing" ${J.ticks < J.devTicks * 0.2 ? 'disabled data-tip="' + t('err.tooEarly') + '"' : ''}>${icon('megaphone')}${t('dev.market')}</button>`;
        h += `<button class="btn sm ${J.crunch ? 'crunch-on' : ''}" data-act="crunch" data-tip="${t('tip.crunch')}">${icon('fire')}${t('dev.crunch')}</button>`;
      } else {
        h += `<button class="btn sm gold" data-act="ship">${icon('rocket')}${t('dev.ship')}</button>`;
        if (!J.extended) h += `<button class="btn sm" data-act="polish-more" data-tip="${t('tip.polishMore')}">${icon('wrench')}${t('dev.polishMore')}</button>`;
      }
      if (cur < 3) h += `<button class="btn sm ghost" data-act="job-cancel" data-tip="${t('tip.cancelProj')}">${icon('x')}</button>`;
    }
    actEl.innerHTML = h;
  }
}
