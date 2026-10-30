import { $, $$, esc, icon, t, L, UI, act, regWin, money, toast, errToast, MONTHS } from './core.js';
import { dateOf } from '../sim/const.js';
import { lang } from '../core/i18n.js';
import { music } from '../audio/sfx.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { MKT } from '../data/research.js';
import { marketingOptions, launchMarketing } from '../sim/dev.js';
import { saveGame, exportCode, importCode } from '../core/store.js';

const AIC = { a_game: 'gamepad', a_star: 'star', a_coin: 'money', a_house: 'building', a_team: 'team', a_heart: 'heart', a_flask: 'flask', a_aaa: 'rocket', a_trophy: 'trophy', a_brief: 'hammer', a_engine: 'cpu', a_clock: 'clock', a_globe: 'globe', a_bulb: 'bulb', a_crown: 'crown' };
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
regWin({
  id: 'news',
  icon: 'mail',
  color: 'var(--design)',
  size: 'md',
  title: () => t('news.title'),
  render(G) {
    if (!G.news.length) return `<div class="empty">${icon('mail')}<div>${t('news.empty')}</div></div>`;
    const NIC = { info: 'info', good: 'check', bad: 'bug', platform: 'gamepad', award: 'trophy', research: 'flask', money: 'money', hire: 'team' };
    return `<div class="col" style="gap:7px">${G.news
      .map((n) => {
        const d = dateOf(n.t);
        const vars = {};
        // strängar och {sv,en}-titlar (konkurrenternas spel) i fetstil
        for (const [k, v] of Object.entries(n.vars || {})) vars[k] = typeof v === 'string' || (v && typeof v === 'object') ? `<b>${esc(L(v))}</b>` : v;
        return `<div class="in ${n.kind === 'good' ? 'good' : n.kind === 'bad' ? 'bad' : 'ok'}"><span class="ii">${icon(NIC[n.kind] || 'info')}</span><span style="flex:1">${t(n.key, vars)}</span><span class="faint" style="font-size:11px;white-space:nowrap">${d.year} · ${MONTHS[lang][d.month]}</span></div>`;
      })
      .join('')}</div>`;
  },
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
    return `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">${sec('gamepad', 'loop')}${sec('target', 'score')}${sec('sliders', 'focus')}${sec('flask', 'research')}${sec('team', 'team')}${sec('chart', 'market')}${sec('bank', 'money')}${sec('trophy', 'goal')}${sec('book', 'fr')}${sec('globe', 'live')}${sec('building', 'biz')}${sec('gpu', 'hw')}</div>
      <div class="lbl" style="margin:18px 0 8px">${t('help.keys')}</div>
      <div class="row wrap" style="gap:14px"><span><span class="kbd">Space</span> ${t('help.k1')}</span><span><span class="kbd">1</span><span class="kbd">2</span><span class="kbd">3</span> ${t('help.k2')}</span><span><span class="kbd">N</span> ${t('help.k3')}</span><span><span class="kbd">M</span> ${t('help.k4')}</span><span><span class="kbd">Esc</span> ${t('help.k5')}</span></div>`;
  },
});
