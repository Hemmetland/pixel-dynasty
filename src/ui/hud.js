import { $, $$, esc, icon, t, tn, L, UI, act, money, MONTHS, bar } from './core.js';
import { glyphImg } from '../render/glyphs.js';
import { TOPIC } from '../data/topics.js';
import { GENRE } from '../data/genres.js';
import { PLATFORM } from '../data/platforms.js';
import { dateOf, TICKS_PER_WEEK } from '../sim/const.js';
import { rpPerWeek } from '../sim/research.js';
import { canUpgradeOffice, capacity, tierOf, nextTier } from '../sim/studio.js';
import { canHire, workers, teamFatigue, FATIGUE_MAX, FATIGUE_GRACE } from '../sim/people.js';
import { canLicense } from '../sim/actions.js';
import { RESEARCH, RES } from '../data/research.js';
import { canResearch } from '../sim/research.js';
import { lang } from '../core/i18n.js';
import { fmtNum, clamp } from '../core/util.js';
import { music } from '../audio/sfx.js';
import { saveSettings } from '../core/store.js';
import { CLIENTS, BRIEFS } from '../data/events.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { crowdChip } from './crowd.js';

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
// Panelernas cache: raderna byggs om bara när uppsättningen ändras, annars uppdateras texten på plats.
let rowsKey = '';
let brandKey = '';
let logoKey = '';
let lastPanels = 0;
let sheetOpen = false;
let weekPct = 0;

export function buildHUD(root) {
  rowsKey = brandKey = logoKey = devKey = '';
  lastPanels = 0;
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
    <div id="rcol">
      <div id="pnl">
        <section class="pn glass" id="pn-studio">
          <div class="pn-head">
            <button class="pn-id" data-act="dock" data-id="studio" data-tip=""><span class="pn-logo"></span><span class="pn-nm"><b></b><i></i></span></button>
            <span class="pn-mini num"></span>
            <button class="pn-x" data-act="pn-toggle" aria-expanded="true">${icon('chevron')}</button>
          </div>
          <div class="pn-cells">
            <div class="pn-c" id="pc-team" style="--c:var(--design)" data-tip=""><span class="ci">${icon('team')}</span><span class="tx"><span class="k">${t('pn.team')}</span><b class="v num"></b></span><span class="sub"><span class="bar thin"><i></i></span></span></div>
            <div class="pn-c" id="pc-proj" style="--c:var(--accent)" data-tip=""><span class="ci">${icon('gamepad')}</span><span class="tx"><span class="k">${t('pn.project')}</span><b class="v num"></b></span><span class="sub"><span class="bar thin"><i></i></span></span></div>
            <div class="pn-c" id="pc-res" style="--c:var(--money)" data-tip=""><span class="ci">${icon('money')}</span><span class="tx"><span class="k">${t('pn.res')}</span><b class="v num"></b></span><span class="sub"><em></em></span></div>
            <button class="pn-c" id="pc-goal" style="--c:var(--gold)" data-act="dock" data-id="achievements" data-tip=""><span class="ci">${icon('target')}</span><span class="tx"><span class="k">${t('pn.goal')}</span><b class="v num"></b></span><span class="sub"><span class="bar thin"><i></i></span></span></button>
          </div>
        </section>
        <section class="pn glass" id="pn-tasks">
          <div class="pn-th"><span class="lbl">${t('pn.tasks')}</span><span class="cnt num"></span></div>
          <div class="pn-rows"></div>
        </section>
      </div>
      <div id="toasts"></div>
    </div>
    <button class="glass" id="pbar" data-act="pn-sheet" data-tip="${t('pn.sheet')}">
      <span class="b" id="pb-team"><span class="ic-s">${icon('team')}</span><b class="num"></b></span>
      <span class="b w" id="pb-proj"><span class="ic-s">${icon('gamepad')}</span><b class="num"></b><span class="bar thin"><i></i></span></span>
      <span class="b" id="pb-goal"><span class="ic-s">${icon('target')}</span><b class="num"></b></span>
      <span class="chev">${icon('chevron')}</span>
    </button>
    <div id="clockp" class="pn glass" data-tip="">
      <span class="wx"></span>
      <span class="tm"><b class="num"></b><i></i></span>
      <span class="bar thin"><i></i></span>
    </div>
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
    rcol: $('#rcol'),
    studio: $('#pn-studio'),
    tasks: $('#pn-tasks'),
    rows: $('#pn-tasks .pn-rows'),
    clock: $('#clockp'),
    pbar: $('#pbar'),
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
  act('pn-go', (el) => el.dataset.go && UI.open(el.dataset.go));
  // Paneler: stäng/öppna (kom ihåg valet i inställningarna) och mobilens uppfällbara kort
  act('pn-toggle', () => {
    UI.app.settings.hudPanels = !panelsOpen();
    saveSettings(UI.app.settings);
    fitHUD();
  });
  act('pn-sheet', () => {
    sheetOpen = !sheetOpen;
    fitHUD();
  });
}

export function setHUDVisible(on) {
  for (const id of ['hud', 'dock', 'devpanel', 'pnl', 'clockp', 'pbar']) {
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
  const ck = clockInfo();
  const lk = G.logo + '|' + lang;
  if (lk !== logoKey) {
    logoKey = lk;
    els.logo.innerHTML = glyphImg(LOGOS[G.logo % LOGOS.length], '#ffffff', 16, true).replace('class="gl"', 'class="gl" style="width:24px;height:24px"');
  }
  if (els.name.textContent !== G.studio) els.name.textContent = G.studio;
  const bk = `${d.year}|${d.month}|${d.week}|${ck.time}|${ck.icon}`;
  if (bk !== brandKey) {
    brandKey = bk;
    els.date.innerHTML = `<span class="season">${icon(seasonIcon(d.month))}</span><b>${d.year}</b> · ${MONTHS[lang][d.month]} · ${t('ui.weekShort')}${d.week + 1}<span class="tod" style="--c:${ck.color}">${icon(ck.icon)}${ck.time}</span>`;
  }
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
  set(els.fans, fmtNum(f), tn('hud.fansSub', Math.round(f)), `<b>${t('hud.fans')}</b><br>${t('hud.fansTip')}`);
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
  updatePanels(G);
}

export function flashStat(which, up) {
  const el = which === 'money' ? els.money : which === 'rp' ? els.rp : els.fans;
  el.classList.remove('flash-up', 'flash-dn');
  void el.offsetWidth;
  el.classList.add(up ? 'flash-up' : 'flash-dn');
}

// ── Paneler: studio, pågående uppgifter och klocka ──
const pct = (v) => clamp(Math.round(v), 0, 100);
const put = (el, text) => {
  if (el && el.textContent !== text) el.textContent = text;
};
const setBar = (el, v) => {
  const i = $('.bar i', el);
  if (i) i.style.width = clamp(v, 0, 100) + '%';
};

// Klockslag i scenen (ljus och väder följer det) och en ikon för dygnsfas eller väder.
function clockInfo() {
  const w = UI.app.scene?.world;
  const tod = w ? w.tod : 0.5;
  const mins = Math.floor((tod * 1440) / 5) * 5;
  const time = String(Math.floor(mins / 60) % 24).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
  const wz = w?.weather;
  const wet = wz && wz.type !== 'clear' && wz.amt > 0.25;
  if (wet && wz.type === 'rain') return { time, icon: 'rain', color: 'var(--design)', label: t('pn.wxRain') };
  if (wet) return { time, icon: 'snow', color: '#cfe8ff', label: t('pn.wxSnow') };
  if (tod < 0.2 || tod >= 0.82) return { time, icon: 'moon', color: 'var(--rp)', label: t('pn.wxNight') };
  if (tod < 0.33) return { time, icon: 'dusk', color: '#ffa36a', label: t('pn.wxDawn') };
  if (tod >= 0.67) return { time, icon: 'dusk', color: '#ff8a6a', label: t('pn.wxDusk') };
  return { time, icon: 'sun', color: 'var(--warn)', label: t('pn.wxDay') };
}

function gameProgress(J) {
  const phaseLen = J.devTicks / 3;
  const all = J.state === 'report' ? 100 : ((Math.min(J.ticks, J.devTicks) + J.polishDone) / (J.devTicks + J.polishTicks)) * 100;
  const pp = J.phase < 3 ? ((J.ticks - J.phase * phaseLen) / phaseLen) * 100 : (J.polishDone / J.polishTicks) * 100;
  return { all: clamp(all, 0, 100), pp: clamp(pp, 0, 100) };
}

// Pågående jobb (spel, uppdrag eller motor) som en panelrad. pct = radens stapel, proj = "Projekt %" i studiopanelen.
function jobRow(J) {
  if (J.kind === 'game') {
    const g = gameProgress(J);
    const names = [t('dev.p1'), t('dev.p2'), t('dev.p3'), t('dev.polish')];
    const ready = J.state === 'report';
    const phase = names[Math.min(3, J.phase)];
    return {
      id: 'g' + J.id, grp: 0, ic: 'gamepad', c: 'var(--accent)', name: J.title, sub: ready ? t('pn.ready') : phase, pct: ready ? 100 : g.pp, proj: g.all,
      tip: ready ? t('pn.rowReadyTip', { title: esc(J.title) }) : t('pn.rowGameTip', { title: esc(J.title), phase, pct: pct(g.pp), total: pct(g.all) }),
      projTip: t('pn.projectTipGame', { pct: pct(g.all), title: esc(J.title), phase, pp: pct(g.pp) }),
    };
  }
  const left = Math.ceil((J.total - J.ticks) / TICKS_PER_WEEK);
  if (J.kind === 'contract') {
    const p = Math.min(100, (J.D / J.c.reqD) * 100, (J.T / J.c.reqT) * 100);
    const tip = t('pn.projectTipContract', { pct: pct(p), title: esc(L(BRIEFS[J.c.brief]) + ' · ' + L(CLIENTS[J.c.client])), w: left });
    return { id: 'c' + J.id, grp: 0, ic: 'hammer', c: 'var(--gold)', name: L(BRIEFS[J.c.brief]), sub: t('pn.weeksLeft', { n: left }), pct: p, proj: p, tip, projTip: tip, go: 'contracts' };
  }
  const p = (J.ticks / J.total) * 100;
  const tip = t('pn.projectTipEngine', { pct: pct(p), title: esc(J.name) });
  return { id: 'e' + J.id, grp: 0, ic: 'cpu', c: 'var(--design)', name: J.name, sub: t('pn.weeksLeft', { n: left }), pct: p, proj: p, tip, projTip: tip, go: 'contracts' };
}

// Upp till tre rader, alltid från riktigt state: jobbet, forskningar, marknadsföring och senaste spelets försäljning.
function taskRows(G, job) {
  const J = G.job;
  const res = G.research.active
    .filter((a) => RES[a.id])
    .slice()
    .sort((a, b) => a.total - a.progress - (b.total - b.progress))
    .map((a) => {
      const p = (a.progress / a.total) * 100;
      const w = Math.ceil((a.total - a.progress) / TICKS_PER_WEEK);
      const name = L(RES[a.id].name);
      return { id: 'r' + a.id, grp: 1, ic: 'flask', c: 'var(--rp)', name, sub: t('pn.weeksLeft', { n: w }), pct: p, tip: t('pn.rowResTip', { name: esc(name), pct: pct(p), w }), go: 'research' };
    });
  let mkt = null;
  if (J && J.kind === 'game' && J.marketing?.length) {
    const n = J.marketing.length;
    mkt = { id: 'mkt', grp: 2, ic: 'megaphone', c: 'var(--hot)', name: t('pn.rowMkt'), sub: n === 1 ? t('pn.rowMktSub1') : t('pn.rowMktSub', { n }), pct: J.hype, tip: t('pn.rowMktTip', { n, title: esc(J.title) }), go: 'marketing' };
  }
  let sales = null;
  const lg = G.games.length ? G.games[G.games.length - 1] : null;
  if (lg && !lg.ended && lg.total > 0) {
    const p = (lg.revenue / lg.total) * 100;
    sales = { id: 's' + lg.id, grp: 3, ic: 'chart', c: 'var(--money)', name: lg.title, sub: t('pn.rowSales'), pct: p, tip: t('pn.rowSalesTip', { title: esc(lg.title), pct: pct(p), rev: money(lg.revenue), total: money(lg.total) }), go: 'library' };
  }
  return [job, res[0], mkt, res[1], sales, res[2]].filter(Boolean).slice(0, 3).sort((a, b) => a.grp - b.grp);
}

const rowHTML = (r) => {
  const tag = r.go ? 'button' : 'div';
  return `<${tag} class="tk${r.go ? ' go' : ''}" style="--c:${r.c}"${r.go ? ` data-act="pn-go" data-go="${r.go}"` : ''} data-tip=""><span class="ti">${icon(r.ic)}</span><span class="tn"><b class="nm"></b><span class="sb"></span></span><b class="pc num"></b><span class="bar thin"><i></i></span></${tag}>`;
};

function updatePanels(G) {
  const now = performance.now();
  if (now - lastPanels < 200) return;
  lastPanels = now;
  const d = dateOf(G.t);
  const ck = clockInfo();
  const job = G.job ? jobRow(G.job) : null;
  const off = tierOf(G);
  const cap = capacity(G);
  // studiopanelen
  const nm = $('.pn-nm', els.studio);
  put($('b', nm), G.studio);
  put($('i', nm), L(off.name));
  $('.pn-id', els.studio).dataset.tip = t('pn.studioTip', { name: esc(G.studio), office: L(off.name) });
  const pl = $('.pn-logo', els.studio);
  if (pl.dataset.k !== logoKey) {
    pl.dataset.k = logoKey;
    pl.innerHTML = els.logo.innerHTML;
  }
  const team = $('#pc-team');
  put($('.v', team), `${G.staff.length}/${cap}`);
  team.classList.toggle('full', G.staff.length >= cap);
  setBar(team, (G.staff.length / cap) * 100);
  team.dataset.tip = t('pn.teamTip', { n: G.staff.length, max: cap, office: L(off.name), work: workers(G).length });
  const proj = $('#pc-proj');
  put($('.v', proj), job ? pct(job.proj) + '%' : '–');
  setBar(proj, job ? job.proj : 0);
  proj.classList.toggle('idle', !job);
  put($('.pn-mini', els.studio), `${G.staff.length}/${cap} · ${job ? pct(job.proj) + '%' : '–'}`);
  proj.dataset.tip = job ? job.projTip : t('pn.projectNone');
  const net = G.lastMonth.income - G.lastMonth.expense;
  const res = $('#pc-res');
  put($('.v', res), money(G.money));
  $('.v', res).style.color = G.money < 0 ? 'var(--bug)' : '';
  const em = $('.sub em', res);
  put(em, (net >= 0 ? '▲ ' : '▼ ') + money(Math.abs(net)) + t('ui.perMonth'));
  em.className = net >= 0 ? 'up' : 'down';
  const runway = G.lastMonth.expense > 0 && G.money > 0 ? t('pn.runway', { m: Math.max(1, Math.round(G.money / G.lastMonth.expense)) }) : '';
  res.dataset.tip = t('pn.resTip', { cash: money(G.money), rp: fmtNum(G.rp), net: (net >= 0 ? '+' : '−') + money(Math.abs(net)), pm: t('ui.perMonth') }) + runway;
  const goal = $('#pc-goal');
  const ach = G.ach.length;
  put($('.v', goal), `${ach}/${ACHIEVEMENTS.length}`);
  setBar(goal, (ach / ACHIEVEMENTS.length) * 100);
  const nx = nextTier(G);
  const na = ACHIEVEMENTS.find((a) => !G.ach.includes(a.id));
  goal.dataset.tip = t('pn.goalTip', { x: ach, y: ACHIEVEMENTS.length }) +
    (nx ? t(nx.fans > 0 ? 'pn.goalOffice' : 'pn.goalOfficeCash', { name: L(nx.name), fans: fmtNum(nx.fans), haveFans: fmtNum(G.fans), cost: money(nx.cost) }) : '') +
    (na ? t('pn.goalNext', { name: L(na.name), desc: L(na.desc) }) : '');
  // pågående uppgifter
  const rows = taskRows(G, job);
  const key = rows.map((r) => r.id).join('|') || 'idle';
  if (key !== rowsKey) {
    rowsKey = key;
    els.rows.innerHTML = rows.length
      ? rows.map(rowHTML).join('')
      : `<button class="tk idle go" data-act="pn-go" data-go="wizard" data-tip="${esc(t('pn.idleHint'))}"><span class="ti">${icon('plus')}</span><span class="tn"><b class="nm">${t('pn.idle')}</b><span class="sb">${t('pn.idleHint')}</span></span></button>`;
  }
  put($('.cnt', els.tasks), rows.length ? String(rows.length) : '');
  rows.forEach((r, i) => {
    const el = els.rows.children[i];
    if (!el) return;
    put($('.nm', el), r.name);
    put($('.sb', el), r.sub);
    put($('.pc', el), pct(r.pct) + '%');
    setBar(el, r.pct);
    el.dataset.tip = r.tip;
  });
  // mobilens sammanfattningsrad
  put($('#pb-team b'), `${G.staff.length}/${cap}`);
  put($('#pb-proj b'), job ? pct(job.proj) + '%' : '–');
  setBar($('#pb-proj'), job ? job.proj : 0);
  put($('#pb-goal b'), `${ach}/${ACHIEVEMENTS.length}`);
  // klockan
  const wxEl = $('.wx', els.clock);
  if (wxEl.dataset.k !== ck.icon + ck.color) {
    wxEl.dataset.k = ck.icon + ck.color;
    wxEl.innerHTML = icon(ck.icon);
    wxEl.style.setProperty('--c', ck.color);
  }
  put($('.tm b', els.clock), ck.time);
  const dateTxt = `${MONTHS[lang][d.month]} ${d.year}`;
  put($('.tm i', els.clock), `${t('pn.week', { n: d.week + 1 })} · ${dateTxt}`);
  els.clock.dataset.tip = t('pn.clockTip', { time: ck.time, label: ck.label, date: `${t('pn.week', { n: d.week + 1 }).toLowerCase()}, ${dateTxt}` });
  const wp = (G.tick / TICKS_PER_WEEK) * 100;
  const wb = $('.bar i', els.clock);
  wb.style.transition = wp < weekPct ? 'none' : '';
  wb.style.width = wp + '%';
  weekPct = wp;
}

// Paneler öppna eller stängda: valet sparas i inställningarna, annars öppna om det finns plats runt huset.
export const panelsOpen = () => {
  const v = UI.app.settings.hudPanels;
  return v == null ? !els.rcol.classList.contains('squeezed') : !!v;
};

// Lägg panelerna och utvecklingspanelen i det lediga utrymmet bredvid byggnaden så att de inte täcker den.
export function fitHUD() {
  const app = UI.app;
  if (!app || !els.rcol) return;
  const vw = app.root.clientWidth;
  const mobile = vw <= 760;
  const sc = app.scene;
  const short = app.root.clientHeight < 560;
  let side = vw / 2;
  if (sc && sc.L && sc.scale && app.mode === 'play') side = vw / 2 - ((sc.L.BW ?? sc.L.W - 40) / 2) * sc.scale;
  const pw = clamp(side - 18, 0, vw >= 1600 ? 288 : 252);
  els.rcol.classList.toggle('squeezed', !mobile && (pw < 164 || short));
  els.rcol.style.setProperty('--pw', Math.max(pw, 164) + 'px');
  els.rcol.classList.toggle('compact', pw < 232);
  const dw = clamp(side - 18, 176, 316);
  els.dev.style.setProperty('--dw', dw + 'px');
  // Ingen plats vid sidan (t.ex. en bred byggnad på surfplatta): lägg utvecklingspanelen som ett band i himlen ovanför huset
  const ribbon = !mobile && vw >= 960 && side - 18 < 176;
  els.dev.classList.toggle('ribbon', ribbon);
  els.dev.classList.toggle('narrow', !mobile && !ribbon && dw < 272);
  const open = panelsOpen();
  els.rcol.classList.toggle('closed', !mobile && !open);
  els.rcol.classList.toggle('sheet', mobile && sheetOpen);
  const x = $('.pn-x', els.studio);
  x.setAttribute('aria-expanded', String(open));
  x.setAttribute('aria-label', t(open ? 'pn.hide' : 'pn.show'));
  x.dataset.tip = t(open ? 'pn.hide' : 'pn.show');
  els.pbar.classList.toggle('on', sheetOpen);
}

// ── Dock-notiser ──
export function updateDock(G) {
  const now = performance.now();
  if (now - lastDock < 450) return;
  lastDock = now;
  fitHUD();
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

// Crunchknappen visar teamets trötthet: en mätare (grön under de gratis veckorna, sedan gul och röd) med procent och
// ett verktygstips om hur mycket långsammare teamet jobbar.
function crunchBtn(J, f) {
  const pct = Math.round((f.avg / FATIGUE_MAX) * 100);
  const col = f.avg <= FATIGUE_GRACE ? 'var(--good)' : f.slow < 0.15 ? 'var(--warn)' : 'var(--bug)';
  const state = f.slow >= 0.005 ? t('dev.fatigueSlow', { n: Math.max(1, Math.round(f.slow * 100)) }) : f.avg > 0 ? t('dev.fatigueGrace') : t('dev.fatigueFresh');
  const meter = J.crunch || f.avg > 0 ? `<span style="display:inline-flex;align-items:center;gap:4px;margin-left:6px"><span style="width:26px;height:5px;border-radius:3px;background:rgba(255,255,255,.16);overflow:hidden"><i style="display:block;height:100%;width:${Math.max(pct, 4)}%;background:${col}"></i></span><b class="num" style="font-size:10.5px;color:${col}">${pct}%</b></span>` : '';
  return `<button class="btn sm ${J.crunch ? 'crunch-on' : ''}" data-act="crunch" data-tip="${t('tip.crunch')}<br>${t('dev.fatigue', { n: pct })}: ${state}">${icon('fire')}${t('dev.crunch')}${meter}</button>`;
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
        ${J.live ? `<span class="chip c" style="--c:var(--good)">${icon('globe')}${t('dev.liveChip')}</span>` : J.expansionOf ? `<span class="chip c" style="--c:var(--good)">${icon('globe')}${t('dev.expChip')}</span>` : ''}
        <span id="dv-crowd" style="display:contents"></span>
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
  // trängsel vid släpp (räknas om varje vecka och när släppet flyttas)
  const crEl = $('#dv-crowd', el);
  const ckey = [G.t, J.phase, J.extended, J.state, lang].join('|');
  if (crEl && crEl.dataset.k !== ckey) {
    crEl.dataset.k = ckey;
    crEl.innerHTML = crowdChip(G, J);
  }
  // åtgärder
  const actEl = $('#dv-act', el);
  const fat = teamFatigue(G);
  const akey = [cur, J.crunch, J.marketing.length, J.extended, G.u.mkt.length, J.state, J.ticks >= J.devTicks * 0.2, Math.round(fat.avg * 2)].join('|');
  if (actEl.dataset.k !== akey) {
    actEl.dataset.k = akey;
    let h = '';
    if (J.state === 'dev') {
      // crunch syns även under polish, annars går en påslagen crunch inte att stänga av
      const crunch = crunchBtn(J, fat);
      if (cur < 3) {
        if (G.u.mkt.length) h += `<button class="btn sm" data-act="open-marketing" ${J.ticks < J.devTicks * 0.2 ? 'disabled data-tip="' + t('err.tooEarly') + '"' : ''}>${icon('megaphone')}${t('dev.market')}</button>`;
        h += crunch;
      } else {
        h += `<button class="btn sm gold" data-act="ship">${icon('rocket')}${t('dev.ship')}</button>`;
        if (!J.extended) h += `<button class="btn sm" data-act="polish-more" data-tip="${t('tip.polishMore')}">${icon('wrench')}${t('dev.polishMore')}</button>`;
        h += crunch;
      }
      if (cur < 3) h += `<button class="btn sm ghost" data-act="job-cancel" data-tip="${t('tip.cancelProj')}">${icon('x')}</button>`;
    }
    actEl.innerHTML = h;
  }
}
