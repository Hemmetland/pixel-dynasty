import { $, $$, esc, icon, t, L, UI, act, regWin, money, toast, errToast, MONTHS } from './core.js';
import { dateOf } from '../sim/const.js';
import { fmtNum } from '../core/util.js';
import { storyOf } from '../sim/news.js';
import { identity } from '../sim/legacy.js';
import { identityName } from '../data/identity.js';
import { CERTS } from '../data/certs.js';
import { lang } from '../core/i18n.js';
import { music } from '../audio/sfx.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { MKT } from '../data/research.js';
import { marketingOptions, launchMarketing } from '../sim/dev.js';
import { saveGame, exportCode, importCode } from '../core/store.js';

const AIC = { a_game: 'gamepad', a_star: 'star', a_coin: 'money', a_house: 'building', a_team: 'team', a_heart: 'heart', a_flask: 'flask', a_aaa: 'rocket', a_trophy: 'trophy', a_brief: 'hammer', a_engine: 'cpu', a_clock: 'clock', a_globe: 'globe', a_bulb: 'bulb', a_crown: 'crown', a_disc: 'disc', a_chip: 'gpu' };
const MIC = { press: 'mail', ads: 'book', tv: 'film', online: 'globe', influencer: 'heart' };

// ── Marknadsföring under utveckling ──
regWin({
  id: 'marketing',
  icon: 'megaphone',
  color: 'var(--hot)',
  size: 'md',
  title: () => t('mk.title'),
  sub: (G) => (G.job && G.job.kind === 'game' ? `${esc(G.job.title)} · ${t('stat.hype')} <b>${Math.round(G.job.hype)}</b>` : ''),
  render(G) {
    const J = G.job;
    if (!J || J.kind !== 'game') return `<div class="empty">${icon('megaphone')}<div>${t('mk.none')}</div></div>`;
    const opts = marketingOptions(G);
    return `<p class="hint" style="margin-bottom:14px">${t('mk.help')} ${t('mk.cap')}</p>
      <div class="bar tall" style="--c:var(--hot);margin-bottom:18px"><i style="width:${Math.min(100, J.hype)}%"></i></div>
      <div class="col" style="gap:10px">${opts
        .map(
          (o) => `<div class="card row" style="gap:14px;${o.used ? 'opacity:.55' : ''}"><div class="fi" style="width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:rgba(255,92,157,.14);color:var(--hot)">${icon(MIC[o.id])}</div>
          <div style="flex:1"><b class="h3">${L(o.name)}</b><div class="hint">+${Math.round(o.gain)} ${t('stat.hype')}</div></div>
          ${o.used ? `<span class="tag" style="--c:var(--good)">${t('mk.used')}</span>` : `<button class="btn hot" data-act="mk-go" data-id="${o.id}" ${G.money < o.cost ? 'disabled' : ''}>${money(o.cost)}</button>`}</div>`,
        )
        .join('')}</div>`;
  },
});
act('mk-go', (el) => {
  const G = UI.app.G;
  const r = launchMarketing(G, el.dataset.id);
  if (r !== true) errToast(r);
  else toast(t('mk.done', { name: `<b>${L(MKT[el.dataset.id].name)}</b>` }), 'good');
  UI.refresh();
});

// ── Prestationer ──
regWin({
  id: 'achievements',
  icon: 'award',
  color: 'var(--gold)',
  size: 'lg',
  title: () => t('ach.title'),
  sub: (G) => `${G.ach.length}/${ACHIEVEMENTS.length}`,
  render(G) {
    return `<div class="bar" style="--c:var(--gold);margin-bottom:16px"><i style="width:${(G.ach.length / ACHIEVEMENTS.length) * 100}%"></i></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${ACHIEVEMENTS.map((a) => {
        const on = G.ach.includes(a.id);
        return `<div class="card row ach ${on ? 'on' : ''}" style="gap:12px"><div class="ai">${icon(AIC[a.glyph] || 'star')}</div><div style="flex:1"><b>${L(a.name)}</b><div class="hint">${L(a.desc)}</div></div>${on ? icon('check') : icon('lock')}</div>`;
      }).join('')}</div>`;
  },
});

// ── Nyheter ──
// Fliken Historia: studions milstolpar, äldst först, med ett årtal per år. Grundandet läggs till först.
const NW = { tab: 'news' };
const STORY_IC = {
  'hist.founded': ['flag', 'var(--accent)'], 'hist.firstGame': ['gamepad', 'var(--accent)'], 'hist.firstHit': ['star', 'var(--gold)'], 'hist.firstNo1': ['trend', 'var(--good)'],
  'hist.cert': ['disc', 'var(--gold)'], 'hist.firstAward': ['trophy', 'var(--gold)'], 'news.awardWins': ['trophy', 'var(--gold)'], 'news.office': ['building', 'var(--accent)'],
  'news.rankUp': ['chart', 'var(--accent)'], 'news.rankTop': ['crown', 'var(--gold)'], 'news.filmGood': ['film', 'var(--fans)'], 'news.acquired': ['bank', 'var(--money)'],
  'hist.firstPub': ['book', 'var(--design)'], 'hist.store': ['cart', 'var(--money)'], 'news.storeUsers': ['cart', 'var(--money)'], 'hist.hwLab': ['cpu', 'var(--tech)'],
  'hist.hwFab': ['factory', 'var(--tech)'], 'hist.firstHw': ['gpu', 'var(--tech)'], 'hist.hwPlat': ['console', 'var(--tech)'],
  'hist.comeback': ['trend', 'var(--good)'], 'hist.identity': ['crown', 'var(--gold)'], 'hist.games': ['gamepad', 'var(--accent)'], 'hist.fans': ['heart', 'var(--fans)'], 'hist.cash': ['money', 'var(--money)'],
};
const LIVE_HIST = new Set(['hist.f2p', 'hist.firstExp', 'hist.firstRegion', 'hist.comeback']);
const boldVars = (o) => {
  const vars = {};
  // strängar och {sv,en}-titlar (konkurrenternas spel) i fetstil, citat i kursiv
  for (const [k, v] of Object.entries(o || {})) vars[k] = k === 'quote' ? `<i>${esc(L(v))}</i>` : typeof v === 'string' || (v && typeof v === 'object') ? `<b>${esc(L(v))}</b>` : v;
  return vars;
};
function storyTab(G) {
  const rows = [{ t: 0, key: 'hist.founded', vars: { studio: G.studio } }, ...storyOf(G)];
  let year = 0;
  const list = rows
    .map((m) => {
      const d = dateOf(m.t);
      const [ic, col] = STORY_IC[m.key] || (m.key.startsWith('live.') || LIVE_HIST.has(m.key) ? ['globe', 'var(--good)'] : ['star', 'var(--accent)']);
      const cert = m.key === 'hist.cert' ? CERTS[m.vars.i] : null;
      const vars = boldVars(cert ? { title: m.vars.title, cert: L(cert.name) } : m.vars);
      // en sparning från version 50–52 har talet som siffra: skriv det kort (100K fans, $10M) som de nya raderna
      if ((m.key === 'hist.fans' || m.key === 'hist.cash') && typeof m.vars.n === 'number') vars.n = `<b>${(m.key === 'hist.cash' ? money(m.vars.n) : fmtNum(m.vars.n)).replace(/\.0+(?=[KMB])/, '')}</b>`;
      const head = d.year !== year ? `<div class="st-y disp">${d.year}</div>` : '';
      year = d.year;
      return `${head}<div class="st-row" style="--c:${cert ? cert.color : col}"><span class="st-dot">${icon(ic)}</span><div style="flex:1;min-width:0"><div>${t(m.key, vars)}</div><div class="faint" style="font-size:11px">${MONTHS[lang][d.month]} ${d.year}</div></div></div>`;
    })
    .join('');
  // överst: studion i siffror
  const games = G.games.filter((g) => !g.expansionOf).length;
  const sum = [
    ['flag', 'var(--accent)', t('hist.sum.since', { y: dateOf(0).year })],
    games && ['gamepad', 'var(--design)', t('hist.sum.games', { n: games })],
    G.stats.hits && ['star', 'var(--gold)', t('hist.sum.hits', { n: G.stats.hits })],
    G.awards.length && ['trophy', 'var(--gold)', t('hist.sum.awards', { n: G.awards.length })],
    identity(G) && ['crown', 'var(--gold)', esc(L(identityName(identity(G))))],
  ].filter(Boolean);
  const chips = sum.map(([ic, c, text]) => `<span class="chip c" style="--c:${c}">${icon(ic)}${text}</span>`).join('');
  return `<div class="st-sum">${chips}</div><p class="hint" style="margin-bottom:6px">${t('hist.help')}</p><div class="story${rows.length < 2 ? ' one' : ''}">${list}</div>`;
}
regWin({
  id: 'news',
  icon: 'mail',
  color: 'var(--design)',
  size: 'md',
  title: () => t('news.title'),
  headExtra: () => `<div class="tabs">${['news', 'story'].map((k) => `<button class="tab ${NW.tab === k ? 'on' : ''}" data-act="nw-tab" data-id="${k}">${t('news.tab.' + k)}</button>`).join('')}</div>`,
  render(G) {
    if (NW.tab === 'story') return storyTab(G);
    if (!G.news.length) return `<div class="empty">${icon('mail')}<div>${t('news.empty')}</div></div>`;
    const NIC = { info: 'info', good: 'check', bad: 'bug', platform: 'gamepad', award: 'trophy', research: 'flask', money: 'money', hire: 'team' };
    return `<div class="col" style="gap:7px">${G.news
      .map((n) => {
        const d = dateOf(n.t);
        const vars = boldVars(n.vars);
        return `<div class="in ${n.kind === 'good' ? 'good' : n.kind === 'bad' ? 'bad' : 'ok'}"><span class="ii">${icon(NIC[n.kind] || 'info')}</span><span style="flex:1">${t(n.key, vars)}</span><span class="faint" style="font-size:11px;white-space:nowrap">${d.year} · ${MONTHS[lang][d.month]}</span></div>`;
      })
      .join('')}</div>`;
  },
});

act('nw-tab', (el) => {
  NW.tab = el.dataset.id;
  UI.refresh();
});

// ── Meny ──
regWin({
  id: 'menu',
  icon: 'menu',
  color: 'var(--accent)',
  size: 'sm',
  title: () => t('menu.title2'),
  render(G) {
    const b = (id, ic, key, cls = '') => `<button class="btn block lg ${cls}" data-act="${id}" style="justify-content:flex-start">${icon(ic)}${t(key)}</button>`;
    return `<div class="col" style="gap:8px">
      ${b('mn-resume', 'play', 'menu.resume', 'primary')}${b('mn-save', 'save', 'menu.save')}${b('mn-news', 'mail', 'menu.news')}${b('mn-ach', 'award', 'menu.ach')}${b('mn-set', 'settings', 'menu.settings')}${b('mn-help', 'info', 'menu.help')}${b('mn-title', 'back', 'menu.title')}</div>`;
  },
});
act('mn-resume', () => UI.close());
act('mn-save', () => {
  const G = UI.app.G;
  if (saveGame(G)) toast(t('menu.saved'), 'good');
  else toast(t('menu.saveFail'), 'bad');
});
act('mn-news', () => UI.open('news', null, { force: true }));
act('mn-ach', () => UI.open('achievements', null, { force: true }));
act('mn-set', () => UI.open('settings', null, { force: true }));
act('mn-help', () => UI.open('help', null, { force: true }));
act('mn-title', () => {
  UI.close(true);
  UI.app.toTitle();
});

// ── Inställningar ──
const SET = { code: '', msg: '' };
regWin({
  id: 'settings',
  icon: 'settings',
  color: 'var(--accent)',
  size: 'md',
  title: () => t('set.title'),
  render(G) {
    const s = UI.app.settings;
    const tog = (k, key) => `<div class="row" style="justify-content:space-between;padding:9px 0;border-bottom:1px dashed var(--line)"><span>${t(key)}</span><button class="switch ${s[k] ? 'on' : ''}" data-act="set-tog" data-k="${k}" aria-pressed="${!!s[k]}"><i></i></button></div>`;
    const slider = (k, key, on) => `<div class="row" style="gap:12px;padding:9px 0;border-bottom:1px dashed var(--line)"><span style="min-width:110px">${t(key)}</span><input type="range" min="0" max="100" value="${Math.round(s[k] * 100)}" data-set="${k}" ${on ? '' : 'disabled'}></div>`;
    return `
      <div class="row" style="justify-content:space-between;padding:9px 0;border-bottom:1px dashed var(--line)"><span>${icon('globe')} ${t('set.lang')}</span><div class="seg"><button class="${s.lang === 'sv' || (!s.lang && document.documentElement.lang === 'sv') ? 'on' : ''}" data-act="set-lang" data-l="sv">Svenska</button><button class="${s.lang === 'en' || (!s.lang && document.documentElement.lang === 'en') ? 'on' : ''}" data-act="set-lang" data-l="en">English</button></div></div>
      ${tog('music', 'set.music')}${slider('musicVol', 'set.musicVol', s.music)}${tog('sfx', 'set.sfx')}${slider('sfxVol', 'set.sfxVol', s.sfx)}
      ${tog('hd', 'set.hd')}${tog('crt', 'set.crt')}${tog('reduced', 'set.reduced')}${tog('menuPause', 'set.menuPause')}${tog('tutorial', 'set.tutorial')}
      ${G ? `<div class="lbl" style="margin:16px 0 8px">${t('set.saveData')}</div>
      <div class="row wrap" style="gap:8px"><button class="btn" data-act="set-export">${icon('copy')}${t('set.export')}</button><button class="btn" data-act="set-import">${icon('upload')}${t('set.import')}</button></div>
      <textarea class="input" id="set-code" rows="3" placeholder="${t('set.codePh')}" style="height:auto;padding:10px;margin-top:10px;font-size:11px;font-family:ui-monospace,monospace">${esc(SET.code)}</textarea>
      <div class="hint" style="margin-top:6px">${SET.msg}</div>` : ''}`;
  },
  bind(el) {
    for (const r of $$('input[data-set]', el)) {
      r.addEventListener('input', () => {
        UI.app.settings[r.dataset.set] = +r.value / 100;
        UI.app.applySettings();
      });
    }
    const ta = $('#set-code', el);
    if (ta) ta.addEventListener('input', () => (SET.code = ta.value));
  },
});
act('set-tog', (el) => {
  const k = el.dataset.k;
  const s = UI.app.settings;
  s[k] = !s[k];
  UI.app.applySettings();
  if (k === 'music') s[k] ? music.start?.() : music.stop?.();
  UI.refresh();
});
act('set-lang', (el) => {
  UI.app.setLanguage(el.dataset.l);
});
act('set-export', () => {
  const G = UI.app.G;
  SET.code = exportCode(G);
  SET.msg = t('set.exported');
  try {
    navigator.clipboard?.writeText(SET.code).then(() => {
      SET.msg = t('set.copied');
      UI.refresh();
    }).catch(() => {});
  } catch { /* */ }
  UI.refresh();
});
act('set-import', () => {
  const G = importCode(SET.code);
  if (!G) {
    SET.msg = t('set.badCode');
    UI.refresh();
    return;
  }
  UI.close(true);
  UI.app.startGame(G, false);
  saveGame(G);
  SET.code = '';
  SET.msg = '';
  toast(t('set.imported'), 'good');
});

// ── Hjälp ──
regWin({
  id: 'help',
  icon: 'info',
  color: 'var(--design)',
  size: 'lg',
  title: () => t('help.title'),
  render() {
    const sec = (ic, k) => `<div class="card"><div class="row" style="gap:10px;margin-bottom:6px"><span class="wi" style="width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:rgba(77,225,208,.14);color:var(--accent)">${icon(ic)}</span><b class="h3">${t('help.' + k + '.t')}</b></div><div class="hint" style="font-size:13px">${t('help.' + k + '.b')}</div></div>`;
    return `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">${sec('gamepad', 'loop')}${sec('target', 'score')}${sec('sliders', 'focus')}${sec('flask', 'research')}${sec('team', 'team')}${sec('chart', 'market')}${sec('bank', 'money')}${sec('trophy', 'goal')}${sec('book', 'fr')}${sec('globe', 'live')}${sec('building', 'biz')}${sec('gpu', 'hw')}${sec('crown', 'hall')}</div>
      <div class="lbl" style="margin:18px 0 8px">${t('help.keys')}</div>
      <div class="row wrap" style="gap:14px"><span><span class="kbd">Space</span> ${t('help.k1')}</span><span><span class="kbd">1</span><span class="kbd">2</span><span class="kbd">3</span> ${t('help.k2')}</span><span><span class="kbd">N</span> ${t('help.k3')}</span><span><span class="kbd">M</span> ${t('help.k4')}</span><span><span class="kbd">Esc</span> ${t('help.k5')}</span></div>`;
  },
});
