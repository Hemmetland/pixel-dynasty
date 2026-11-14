// Utvecklarkonsol för speltest: skriv kommandon för att hoppa framåt i tiden, ge pengar, låsa upp forskning, utlösa händelser osv.
// Dolt för vanliga spelare: slås på genom att skriva fuskkod på tangentbordet (utanför textfält), med ?dev i adressen eller genom
// att klistra in fuskkod i inställningarnas kodruta. När det är på visas en röd DEV-flagga nere till vänster. § eller ` öppnar konsolen.
// Ett spel där ett kommando ändrat spelet märks som fuskat (G.flags.cheat) och räknas inte i studiohallen.
// Hela filen utelämnas i bygget för utdelning: node build.mjs --release (se CLAUDE.md). Texterna här går inte via t(): konsolen är
// ett verktyg för utvecklaren och finns inte i utdelningsbygget.
import * as S from '../sim/index.js';
import { emit } from '../core/bus.js';
import { lang } from '../core/i18n.js';
import { RESEARCH } from '../data/research.js';
import { PLATFORMS } from '../data/platforms.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { EVENTS } from '../data/events.js';
import { sfx } from '../audio/sfx.js';
import { UI, toast, clearEvents, $ } from './core.js';

const KEY_ON = 'pixel-dynasty-dev';
const KEY_HIST = 'pixel-dynasty-dev-hist';
const CODE = 'fuskkod';
const sv = () => lang === 'sv';
const L = (a, b) => (sv() ? a : b);

let app = null;
let box = null;
let input = null;
let logEl = null;
let pill = null;
let open = false;
let pausedFrom = 0;
let god = false;
let hist = [];
let hpos = 0;

const store = {
  get: (k) => {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set: (k, v) => {
    try { localStorage.setItem(k, v); } catch { /* utan lagring går det ändå */ }
  },
};
export const devOn = () => store.get(KEY_ON) === '1';

// ── Tal: 5m, -2.5k, 1b, 1e6. Ett inledande = betyder "sätt till" i stället för "lägg till".
export function parseNum(s) {
  const m = /^([+-]?)(\d*\.?\d+(?:e[+-]?\d+)?)([kmb])?$/i.exec(String(s).trim());
  if (!m) return NaN;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[3] || '').toLowerCase()] || 1;
  return (m[1] === '-' ? -1 : 1) * parseFloat(m[2]) * mult;
}
const fmt = (n) => (Math.abs(n) >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : Math.abs(n) >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.round(n * 10) / 10));
const dateStr = (G) => {
  const d = S.dateOf(G.t);
  return `${d.year}-${String(d.month + 1).padStart(2, '0')} v${d.week + 1}`;
};

function log(text, cls = '') {
  if (!logEl) return;
  for (const line of String(text).split('\n')) {
    const el = document.createElement('div');
    el.className = 'dc-l ' + cls;
    el.textContent = line;
    logEl.appendChild(el);
  }
  while (logEl.children.length > 400) logEl.firstChild.remove();
  logEl.scrollTop = logEl.scrollHeight;
}

// Märker spelet som fuskat första gången något ändras
function cheat(G) {
  if (!G.flags.cheat) {
    G.flags.cheat = 1;
    log(L('Spelet är nu märkt som fuskat och hamnar inte i studiohallen.', 'This game is now marked as cheated and will not enter the studio hall.'), 'info');
  }
  refreshPill();
}

// Adderar eller sätter ett värde: 5m lägger till, =5m sätter, -2m drar ifrån
function numArg(a, cur) {
  if (a == null) throw new Error(L('Ange ett tal, t.ex. 5m eller =1k', 'Give a number, e.g. 5m or =1k'));
  const set = a.startsWith('=');
  const n = parseNum(set ? a.slice(1) : a);
  if (Number.isNaN(n)) throw new Error(L('Förstår inte talet: ', 'Not a number: ') + a);
  return set ? n : cur + n;
}

// Svarar på rutor som dyker upp under ett hopp i tiden, på samma sätt som testboten
function autoPending(G) {
  while (G.pending.length) {
    const p = G.pending[0];
    if (p.type === 'report') {
      S.releaseGame(G);
      G.pending.shift();
    } else if (p.type === 'event') S.resolveEvent(G, p.id, 0);
    else if (p.type === 'bailout') {
      S.takeBailout(G);
      G.pending.shift();
    } else if (p.type === 'expo') S.resolveExpo(G, p.id, 0);
    else G.pending.shift();
  }
}

// Hoppar fram till tiden target. Utan auto stannar hoppet vid första rutan som kräver svar.
function skipTo(G, target, auto) {
  const t0 = G.t;
  const vol = app.settings.sfx ? app.settings.sfxVol : 0;
  sfx.setVolume?.(0);
  let ticks = 0;
  let stop = '';
  const limit = (target - G.t) * S.TICKS_PER_WEEK + 50;
  try {
    while (G.t < target && !G.over && ticks++ < limit) {
      if (G.pending.length) {
        if (!auto) {
          stop = G.pending[0].type + (G.pending[0].ev ? ':' + G.pending[0].ev : '');
          break;
        }
        autoPending(G);
      }
      if (!S.stepTick(G)) break;
    }
    if (auto) autoPending(G);
  } finally {
    sfx.setVolume?.(vol);
  }
  clearEvents();
  const tb = $('#toasts');
  if (tb) tb.innerHTML = '';
  UI.refresh?.();
  return { weeks: G.t - t0, stop };
}

const AFTER = () => UI.refresh?.();

// ── Kommandon ──
// m: ändrar spelet (märker det som fuskat), args: kort användning, d: beskrivning
const CMDS = {};
const def = (name, o) => (CMDS[name] = { name, ...o });

def('help', {
  args: '[kommando]',
  d: L('Visar kommandon, eller hjälp för ett kommando', 'Lists commands, or help for one command'),
  run: (G, a) => {
    if (a[0] && CMDS[a[0]]) {
      const c = CMDS[a[0]];
      log(`${c.name} ${c.args || ''}\n  ${c.d}`, 'info');
      return;
    }
    log(L('Kommandon (§ eller ` öppnar och stänger, Esc stänger, ↑↓ historik, Tab fyller i):', 'Commands (§ or ` opens and closes, Esc closes, ↑↓ history, Tab completes):'), 'info');
    for (const c of Object.values(CMDS)) log(`  ${(c.name + ' ' + (c.args || '')).padEnd(26)} ${c.d}`);
    log(L('Tal: 5m = 5 miljoner, 2k = 2000, 1b = en miljard. =5m sätter i stället för att lägga till.', 'Numbers: 5m = 5 million, 2k = 2000, 1b = a billion. =5m sets instead of adds.'), 'info');
  },
});
def('state', {
  d: L('Sammanfattning av spelet just nu', 'Summary of the game right now'),
  run: (G) => {
    const J = G.job;
    log(
      [
        `${dateStr(G)}  ${G.studio}  seed ${G.seed}  ${G.difficulty}${G.flags.cheat ? '  FUSK' : ''}${god ? '  GOD' : ''}`,
        `money ${fmt(G.money)}  fans ${fmt(G.fans)}  rp ${fmt(G.rp)}  staff ${G.staff.length}  office tier ${G.office.tier}`,
        `games ${G.games.length}  licenses ${G.licenses.length}  research ${G.research.done.length}/${RESEARCH.filter((r) => !r.refine).length}  achievements ${G.ach.length}/${ACHIEVEMENTS.length}`,
        J ? `job ${J.kind} ${J.state} phase ${J.phase} ticks ${J.ticks}` : 'job none',
        `pending ${G.pending.map((p) => p.type).join(',') || 'none'}  news ${G.news.length}  flags ${Object.keys(G.u.flags).join(',') || 'none'}`,
      ].join('\n'),
    );
  },
});
def('money', { m: 1, args: '<±n|=n>', d: L('Lägg till, dra ifrån eller sätt pengar', 'Add, subtract or set money'), run: (G, a) => { G.money = numArg(a[0], G.money); log('money ' + fmt(G.money), 'ok'); } });
def('fans', { m: 1, args: '<±n|=n>', d: L('Fans', 'Fans'), run: (G, a) => { G.fans = Math.max(0, numArg(a[0], G.fans)); log('fans ' + fmt(G.fans), 'ok'); } });
def('rp', { m: 1, args: '<±n|=n>', d: L('Forskningspoäng', 'Research points'), run: (G, a) => { G.rp = Math.max(0, numArg(a[0], G.rp)); log('rp ' + fmt(G.rp), 'ok'); } });
def('skip', {
  m: 1,
  args: '<n>[w|m|y] [auto]',
  d: L('Hoppa framåt (veckor, månader, år). Stannar vid första ruta som kräver svar; auto svarar själv', 'Jump ahead (weeks, months, years). Stops at the first prompt; auto answers prompts itself'),
  run: (G, a) => {
    const m = /^(\d+(?:\.\d+)?)([wmy]?)$/i.exec(a[0] || '');
    if (!m) throw new Error(L('Ange t.ex. 12w, 6m eller 2y', 'Give e.g. 12w, 6m or 2y'));
    const weeks = Math.round(parseFloat(m[1]) * { w: 1, m: S.WEEKS_PER_MONTH, y: S.WEEKS_PER_YEAR }[(m[2] || 'w').toLowerCase()]);
    const r = skipTo(G, G.t + weeks, a[1] === 'auto');
    log(`${L('Hoppade', 'Skipped')} ${r.weeks} ${L('veckor till', 'weeks to')} ${dateStr(G)}${r.stop ? L(' (stannade vid ', ' (stopped at ') + r.stop + ')' : ''}${G.over ? L(' (spelet är slut)', ' (game over)') : ''}`, 'ok');
  },
});
def('date', {
  m: 1,
  args: '<år[-månad]> [auto]',
  d: L('Hoppa till januari (eller månaden) ett visst år', 'Jump to January (or a month) of a year'),
  run: (G, a) => {
    const m = /^(\d{4})(?:-(\d{1,2}))?$/.exec(a[0] || '');
    if (!m) throw new Error(L('Ange t.ex. 1995 eller 1995-6', 'Give e.g. 1995 or 1995-6'));
    const target = S.tOf(+m[1], m[2] ? +m[2] - 1 : 0, 0);
    if (target <= G.t) throw new Error(L('Datumet har redan passerat', 'That date has already passed'));
    const r = skipTo(G, target, a[1] === 'auto');
    log(`${L('Hoppade', 'Skipped')} ${r.weeks} ${L('veckor till', 'weeks to')} ${dateStr(G)}${r.stop ? L(' (stannade vid ', ' (stopped at ') + r.stop + ')' : ''}`, 'ok');
  },
});
def('research', {
  m: 1,
  args: 'all|<id>|list',
  d: L('Slutför all forskning, eller en post med dess förkunskaper', 'Complete all research, or one item with its prerequisites'),
  run: (G, a) => {
    const byId = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));
    const real = RESEARCH.filter((r) => !r.refine);
    if (!a[0] || a[0] === 'list') {
      log(RESEARCH.map((r) => `${r.id}${r.refine ? '+' + S.refineLevel(G, r.id) : G.research.done.includes(r.id) ? '*' : ''}`).join('  '));
      return;
    }
    let want;
    if (a[0] === 'all') want = new Set(real.map((r) => r.id));
    else {
      if (!byId[a[0]]) throw new Error(L('Okänd forskning: ', 'Unknown research: ') + a[0]);
      if (byId[a[0]].refine) {
        const r = byId[a[0]];
        if (S.refineLevel(G, r.id) >= r.max) throw new Error(L('Redan på högsta nivån', 'Already at the top level'));
        const total = r.weeks * S.TICKS_PER_WEEK;
        G.research.active.push({ id: r.id, progress: total - 1, total });
        S.researchTick(G);
        log(`${r.id} +${S.refineLevel(G, r.id)}`, 'ok');
        return;
      }
      want = new Set();
      const add = (id) => {
        if (want.has(id) || G.research.done.includes(id)) return;
        want.add(id);
        for (const q of byId[id].req) add(q);
      };
      add(a[0]);
    }
    let n = 0;
    for (let pass = 0; pass < 60; pass++) {
      let changed = false;
      for (const r of RESEARCH) {
        if (!want.has(r.id) || G.research.done.includes(r.id) || G.research.active.some((x) => x.id === r.id)) continue;
        if (!r.req.every((q) => G.research.done.includes(q))) continue;
        const total = r.weeks * S.TICKS_PER_WEEK;
        G.research.active.push({ id: r.id, progress: total - 1, total });
        changed = true;
        n++;
      }
      if (!changed) break;
      S.researchTick(G);
    }
    log(`${n} ${L('forskningsposter klara', 'research items done')} (${G.research.done.length}/${real.length})`, 'ok');
  },
});
def('license', { m: 1, args: 'all|<plattform>', d: L('Gratis licens för alla eller en plattform', 'Free license for all platforms or one'), run: (G, a) => {
  const list = PLATFORMS.filter((p) => !p.own);
  const pick = a[0] === 'all' ? list : list.filter((p) => p.id === a[0]);
  if (!pick.length) {
    log(list.map((p) => p.id).join('  '));
    return;
  }
  for (const p of pick) if (!G.licenses.includes(p.id)) G.licenses.push(p.id);
  log(`${G.licenses.length} ${L('licenser', 'licenses')}`, 'ok');
} });
def('office', { m: 1, args: '<nivå>', d: L('Sätt kontorsnivå (0 är garaget)', 'Set the office tier (0 is the garage)'), run: (G, a) => {
  const n = Math.max(0, Math.min(S.TIERS.length - 1, Math.round(parseNum(a[0]))));
  if (Number.isNaN(n)) throw new Error(L('Ange en nivå, 0 till ', 'Give a tier, 0 to ') + (S.TIERS.length - 1));
  G.office.tier = n;
  log(`office tier ${n} (${S.TIERS[n].desks} ${L('platser', 'desks')})`, 'ok');
} });
def('hire', { m: 1, args: '[n]', d: L('Anställ de första kandidaterna gratis (så långt kontoret har plats)', 'Hire the first candidates for free (as far as the office has room)'), run: (G, a) => {
  const n = a[0] ? Math.round(parseNum(a[0])) : 1;
  let hired = 0;
  for (let i = 0; i < n; i++) {
    if (!S.canHire(G)) break;
    if (!G.candidates.length) S.refreshCandidates(G);
    const c = G.candidates[0];
    if (!c) break;
    const m0 = G.money;
    G.money = Math.max(m0, c.fee);
    const r = S.hire(G, c.id);
    G.money = m0;
    if (r === true) hired++;
    else break;
  }
  log(`${hired} ${L('anställda', 'hired')}, staff ${G.staff.length}`, 'ok');
} });
def('unlock', { m: 1, args: '<flagga>|list', d: L('Sätt en upplåsningsflagga (G.u.flags), t.ex. store, hardware, acquire', 'Set an unlock flag (G.u.flags), e.g. store, hardware, acquire'), run: (G, a) => {
  const known = new Set(Object.keys(G.u.flags));
  for (const r of RESEARCH) for (const k of Object.keys((r.unlock && r.unlock.flags) || {})) known.add(k);
  if (!a[0] || a[0] === 'list') {
    log([...known].map((k) => k + (G.u.flags[k] ? '*' : '')).join('  '));
    return;
  }
  G.u.flags[a[0]] = true;
  log(`flag ${a[0]} ${L('på', 'on')}${known.has(a[0]) ? '' : L(' (okänd flagga)', ' (unknown flag)')}`, 'ok');
} });
def('event', { m: 1, args: '[id|list]', d: L('Utlös en studiohändelse (slumpad utan id)', 'Trigger a studio event (random without an id)'), run: (G, a) => {
  if (a[0] === 'list') {
    log(EVENTS.map((e) => `${e.id}${e.kind === 'studio' ? '' : '(' + e.kind + ')'}`).join('  '));
    return;
  }
  if (G.pending.length) throw new Error(L('En ruta väntar redan på svar', 'A prompt is already waiting for an answer'));
  if (!a[0]) {
    if (!S.rollStudioEvent(G, true)) throw new Error(L('Ingen händelse passar just nu', 'No event fits right now'));
    log(L('Händelse utlöst', 'Event triggered'), 'ok');
    return;
  }
  const ev = EVENTS.find((e) => e.id === a[0]);
  if (!ev) throw new Error(L('Okänd händelse: ', 'Unknown event: ') + a[0]);
  G.pending.push({ type: 'event', id: G.uid++, ev: ev.id, ...S.eventContext(G, ev) });
  log(L('Händelse utlöst: ', 'Event triggered: ') + ev.id, 'ok');
} });
def('ach', { m: 1, args: 'all|<id>|list', d: L('Lås upp prestationer', 'Unlock achievements'), run: (G, a) => {
  if (!a[0] || a[0] === 'list') {
    log(ACHIEVEMENTS.map((x) => x.id + (G.ach.includes(x.id) ? '*' : '')).join('  '));
    return;
  }
  const pick = a[0] === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter((x) => x.id === a[0]);
  if (!pick.length) throw new Error(L('Okänd prestation: ', 'Unknown achievement: ') + a[0]);
  let n = 0;
  for (const x of pick) {
    if (G.ach.includes(x.id)) continue;
    G.ach.push(x.id);
    n++;
    if (a[0] !== 'all') {
      const item = S.note(G, 'news.ach', { name: x.name }, 'award', true);
      emit('achievement', { ...x, item });
    }
  }
  log(`${n} ${L('prestationer upplåsta', 'achievements unlocked')} (${G.ach.length}/${ACHIEVEMENTS.length})`, 'ok');
} });
def('news', { args: 'warn|milestone|award|platform|plain', d: L('Skicka en provnyhet för att prova korten och notiserna', 'Send a test news item to try the cards and toasts'), run: (G, a) => {
  const T = {
    warn: ['news.lowCash', {}, 'bad'],
    milestone: ['news.office', { studio: G.studio, name: 'Testkontoret', n: 1 }, 'good'],
    award: ['news.awardWin', { title: 'Testspelet', cat: 'Bästa spel', year: S.yearOf(G.t) }, 'award'],
    platform: ['news.platform', { name: 'Testkonsolen', maker: 'Testbolaget' }, 'platform'],
    plain: ['news.chartIn', { title: 'Testspelet', n: 40 }, 'info'],
  }[a[0]];
  if (!T) throw new Error('warn | milestone | award | platform | plain');
  S.note(G, ...T);
} });
def('god', { m: 1, args: '[on|off]', d: L('Kassan hålls över 1 M (ingen konkurs)', 'Keep cash above 1M (no bankruptcy)'), run: (G, a) => {
  god = a[0] ? a[0] === 'on' : !god;
  log('god ' + (god ? 'on' : 'off'), 'ok');
} });
def('speed', { args: '<0-3>', d: L('Spelfart', 'Game speed'), run: (G, a) => {
  const n = Math.round(parseNum(a[0]));
  if (!(n >= 0 && n <= 3)) throw new Error('0 - 3');
  app.setSpeed(n);
  pausedFrom = 0;
  log('speed ' + n, 'ok');
} });
def('turbo', { args: '<n>', d: L('Tidsmultiplikator ovanpå farten, 1 är normalt', 'Time multiplier on top of speed, 1 is normal'), run: (G, a) => {
  const n = parseNum(a[0]);
  if (!(n >= 1 && n <= 400)) throw new Error('1 - 400');
  app.turbo = n === 1 ? 0 : n;
  log('turbo ' + n, 'ok');
} });
const dig = (G, path) => {
  const parts = String(path || '').split('.').filter(Boolean);
  let o = G;
  for (const p of parts.slice(0, -1)) {
    o = o == null ? undefined : o[p];
    if (o == null) throw new Error(L('Hittar inte ', 'Cannot find ') + path);
  }
  return [o, parts[parts.length - 1]];
};
def('get', { args: '<sökväg>', d: L('Visa ett värde i spelets tillstånd, t.ex. get office.tier', 'Show a value in the game state, e.g. get office.tier'), run: (G, a) => {
  const [o, k] = a[0] ? dig(G, a[0]) : [{ G }, 'G'];
  const v = k === undefined ? G : o[k];
  const s = typeof v === 'object' ? JSON.stringify(v, null, 1) : String(v);
  log(s.length > 1500 ? s.slice(0, 1500) + ' …' : s);
} });
def('set', { m: 1, args: '<sökväg> <värde>', d: L('Sätt ett värde i spelets tillstånd, t.ex. set u.flags.store true', 'Set a value in the game state, e.g. set u.flags.store true'), run: (G, a) => {
  if (a.length < 2) throw new Error(L('set <sökväg> <värde>', 'set <path> <value>'));
  const [o, k] = dig(G, a[0]);
  const raw = a.slice(1).join(' ');
  let v;
  try { v = JSON.parse(raw); } catch { v = Number.isNaN(parseNum(raw)) ? raw : parseNum(raw); }
  o[k] = v;
  log(`${a[0]} = ${JSON.stringify(v)}`, 'ok');
} });
def('js', { m: 1, args: '<kod>', d: L('Kör JavaScript med G (spelet), S (sim) och app i räckhåll', 'Run JavaScript with G (the game), S (sim) and app in scope'), raw: true, run: (G, a, line) => {
  const code = line.replace(/^js\s+/, '');
  let fn;
  try { fn = new Function('G', 'S', 'app', `return (${code})`); } catch { fn = new Function('G', 'S', 'app', code); }
  const r = fn(G, S, app);
  log(r === undefined ? 'undefined' : typeof r === 'object' ? JSON.stringify(r, null, 1).slice(0, 1500) : String(r), 'ok');
} });
def('clear', { d: L('Rensa konsolen', 'Clear the console'), run: () => { logEl.innerHTML = ''; } });
def('exit', { d: L('Stäng konsolen', 'Close the console'), run: () => close() });
def('off', { d: L('Stäng av utvecklarläget (fuskkod slår på igen)', 'Turn dev mode off (fuskkod turns it on again)'), run: () => setDev(false) });

// ── Körning ──
export function exec(line) {
  const text = line.trim();
  if (!text) return;
  log('> ' + text, 'in');
  hist = hist.filter((h) => h !== text);
  hist.push(text);
  hist = hist.slice(-60);
  hpos = hist.length;
  store.set(KEY_HIST, JSON.stringify(hist));
  const [name, ...args] = text.split(/\s+/);
  const c = CMDS[name.toLowerCase()];
  if (!c) {
    log(L('Okänt kommando. help visar alla.', 'Unknown command. help lists them all.'), 'err');
    return;
  }
  const G = app.G;
  if (!G && name !== 'help' && name !== 'clear' && name !== 'exit' && name !== 'off') {
    log(L('Starta eller ladda ett spel först.', 'Start or load a game first.'), 'err');
    return;
  }
  try {
    c.run(G, args, text);
    if (c.m && G) cheat(G);
    AFTER();
  } catch (e) {
    log(String(e && e.message ? e.message : e), 'err');
  }
}

// ── Gränssnitt ──
function build() {
  if (box) return;
  box = document.createElement('div');
  box.id = 'devcon';
  box.innerHTML = `<div class="dc-log"></div><div class="dc-row"><span>&gt;</span><input type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="dev console"><button type="button" class="dc-x" aria-label="close">×</button></div>`;
  document.body.appendChild(box);
  logEl = $('.dc-log', box);
  input = $('input', box);
  $('.dc-x', box).addEventListener('click', () => close());
  try { hist = JSON.parse(store.get(KEY_HIST) || '[]'); } catch { hist = []; }
  hpos = hist.length;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      exec(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      hpos = Math.max(0, hpos - 1);
      input.value = hist[hpos] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hpos = Math.min(hist.length, hpos + 1);
      input.value = hist[hpos] || '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const v = input.value.trim().toLowerCase();
      if (!v || v.includes(' ')) return;
      const m = Object.keys(CMDS).filter((k) => k.startsWith(v));
      if (m.length === 1) input.value = m[0] + ' ';
      else if (m.length) log(m.join('  '), 'info');
    } else if (e.key === 'Escape' || e.code === 'Backquote') {
      e.preventDefault();
      close();
    }
  });
  log(L('Utvecklarkonsol. help visar kommandon. Ändringar märker spelet som fuskat.', 'Dev console. help lists commands. Changes mark the game as cheated.'), 'info');
}
function openCon() {
  if (!devOn()) return;
  if (!app.G || app.mode !== 'play') {
    toast(L('Starta eller ladda ett spel först.', 'Start or load a game first.'), 'info');
    return;
  }
  build();
  box.classList.add('on');
  open = true;
  // spelet står still medan konsolen är öppen
  if (app.speed > 0) {
    pausedFrom = app.speed;
    app.setSpeed(0);
  } else pausedFrom = 0;
  setTimeout(() => input.focus(), 0);
}
function close() {
  if (!box) return;
  box.classList.remove('on');
  open = false;
  input.blur();
  if (pausedFrom && app.speed === 0) app.setSpeed(pausedFrom);
  pausedFrom = 0;
}
function refreshPill() {
  if (!pill) return;
  const G = app && app.G;
  pill.textContent = G && G.flags.cheat ? 'DEV · FUSK' : 'DEV';
  pill.classList.toggle('cheat', !!(G && G.flags.cheat));
  pill.style.display = devOn() ? '' : 'none';
}
function setDev(on) {
  store.set(KEY_ON, on ? '1' : '0');
  if (!on) close();
  refreshPill();
  toast(on ? L('Utvecklarläge på. § eller ` öppnar konsolen, eller klicka DEV nere till vänster.', 'Dev mode on. § or ` opens the console, or click DEV at the bottom left.') : L('Utvecklarläge av.', 'Dev mode off.'), 'info');
}
// Går att anropas från inställningarnas kodruta: returnerar true om koden var fuskkoden
export function devCode(text) {
  if (String(text || '').trim().toLowerCase() !== CODE) return false;
  setDev(!devOn());
  return true;
}

export function initDevConsole(theApp) {
  app = theApp;
  pill = document.createElement('button');
  pill.id = 'devpill';
  pill.type = 'button';
  pill.addEventListener('click', () => (open ? close() : openCon()));
  document.body.appendChild(pill);
  if (/[?&]dev\b/.test(location.search)) store.set(KEY_ON, '1');
  refreshPill();
  let typed = '';
  window.addEventListener(
    'keydown',
    (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (e.code === 'Backquote' && devOn() && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (tag === 'input' && e.target !== input) return;
        e.preventDefault();
        if (open) close();
        else openCon();
        return;
      }
      if (tag === 'input' || tag === 'textarea' || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-CODE.length);
      if (typed === CODE) {
        typed = '';
        setDev(!devOn());
      }
    },
    true,
  );
  // göd-läget: kassan hålls över en miljon
  setInterval(() => {
    const G = app.G;
    if (god && G && app.mode === 'play' && !G.over && G.money < 1e6) G.money = 1e6;
    if (G) refreshPill();
  }, 400);
}
