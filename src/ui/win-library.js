import { $, esc, icon, t, L, UI, act, regWin, money, errToast } from './core.js';
import { glyphImg } from '../render/glyphs.js';
import { coverImg } from '../render/covers.js';
import { TOPIC } from '../data/topics.js';
import { GENRE } from '../data/genres.js';
import { PLATFORM } from '../data/platforms.js';
import { REVIEWERS } from '../data/reviews.js';
import { reviewTexts } from '../sim/score.js';
import { patchGame } from '../sim/actions.js';
import { patchCost } from '../sim/sales.js';
import { SCOPES, dateOf } from '../sim/const.js';
import { MONTHS } from './core.js';
import { fmtNum } from '../core/util.js';
import { lang } from '../core/i18n.js';
import { openSequel } from './wizard.js';
import { studioNotes } from './prompts.js';

const scoreColor = (s) => (s >= 9 ? 'var(--gold)' : s >= 8 ? 'var(--good)' : s >= 6.5 ? 'var(--accent)' : s >= 5 ? 'var(--warn)' : 'var(--bug)');
const spec = (g) => ({ id: g.id, title: g.title, topic: g.topic, genre: g.genre, platform: g.platform });

function salesChart(g, w = 520, h = 150) {
  const arr = g.weekly;
  if (arr.length < 2) return `<div class="empty" style="padding:24px">${t('lib.noSales')}</div>`;
  const hi = Math.max(...arr, 1);
  const bw = (w - 10) / Math.max(arr.length, 24);
  const bars = arr.map((v, i) => `<rect x="${5 + i * bw}" y="${h - 18 - (v / hi) * (h - 30)}" width="${Math.max(1, bw - 1.5)}" height="${(v / hi) * (h - 30)}" rx="1.5" fill="url(#sg)"/>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="lchart" style="height:${h}px" preserveAspectRatio="none"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4de1d0"/><stop offset="1" stop-color="#4de1d0" stop-opacity=".25"/></linearGradient></defs>
    ${[0.33, 0.66].map((f) => `<line x1="5" x2="${w - 5}" y1="${(h - 18) * f + 5}" y2="${(h - 18) * f + 5}" stroke="rgba(150,172,255,.1)"/>`).join('')}${bars}
    <text x="5" y="${h - 4}" class="axt">${t('lib.week')} 1</text><text x="${w - 5}" y="${h - 4}" text-anchor="end" class="axt">${t('lib.week')} ${arr.length}</text></svg>`;
}

function listView(G) {
  if (!G.games.length) return `<div class="empty">${icon('gamepad')}<div class="h3" style="margin-bottom:6px">${t('lib.empty')}</div><div>${t('lib.emptyHelp')}</div></div>`;
  const cards = G.games
    .slice()
    .reverse()
    .map((g) => {
      const tp = TOPIC[g.topic];
      const ge = GENRE[g.genre];
      return `<button class="card hov game" data-act="lib-open" data-id="${g.id}">
        ${coverImg(spec(g), 72)}
        <div style="flex:1;min-width:0;text-align:left"><b class="h3" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.title)}</b>
          <div class="row wrap" style="gap:5px;margin:6px 0"><span class="chip c" style="--c:${ge.color}">${L(ge.name)}</span><span class="chip">${L(tp.name)}</span></div>
          <div class="faint" style="font-size:12px">${esc(PLATFORM[g.platform].name)} · ${dateOf(g.t).year}</div>
          <div class="row" style="gap:12px;margin-top:6px;font-size:12.5px"><span style="color:var(--money)">${money(g.revenue)}</span><span class="faint">${g.ended ? t('lib.ended') : t('lib.onSale')}</span></div></div>
        <div class="disp" style="font-size:39px;color:${scoreColor(g.score)};align-self:flex-start">${g.score.toFixed(1)}</div></button>`;
    })
    .join('');
  return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(310px,1fr))">${cards}</div>`;
}

function detailView(G, id) {
  const g = G.games.find((x) => x.id === id);
  if (!g) return listView(G);
  const tp = TOPIC[g.topic];
  const ge = GENRE[g.genre];
  const texts = reviewTexts(g, g, lang);
  const patchOk = G.research.done.includes('q_patch');
  const d = dateOf(g.t);
  return `
    <button class="btn sm ghost" data-act="lib-back" style="margin-bottom:12px">${icon('back')}${t('ui.back')}</button>
    <div class="grid" style="grid-template-columns:auto 1fr;gap:20px;align-items:start">
      <div>${coverImg(spec(g), 132, 'big')}</div>
      <div>
        <div class="h2" style="overflow-wrap:anywhere">${esc(g.title)}</div>
        <div class="row wrap" style="gap:6px;margin:8px 0 14px"><span class="chip c" style="--c:${ge.color}">${glyphImg(ge.glyph, ge.color, 16, false)}${L(ge.name)}${g.genre2 ? ' + ' + L(GENRE[g.genre2].name) : ''}</span><span class="chip">${glyphImg(tp.glyph, '#fff', 16, false)}${L(tp.name)}</span><span class="chip">${esc(PLATFORM[g.platform].name)}</span><span class="chip">${L(SCOPES[g.scope].name)}</span><span class="chip">${MONTHS[lang][d.month]} ${d.year}</span></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">
          <div class="counter" style="--c:${scoreColor(g.score)}"><div class="v num">${g.score.toFixed(1)}</div><div class="k">${t('lib.score')}</div></div>
          <div class="counter" style="--c:var(--money)"><div class="v num">${money(g.revenue)}</div><div class="k">${t('lib.revenue')}</div></div>
          <div class="counter" style="--c:var(--accent)"><div class="v num">${fmtNum(g.units)}</div><div class="k">${t('lib.units')}</div></div>
          <div class="counter" style="--c:var(--fans)"><div class="v num">${g.fansGained >= 0 ? '+' : ''}${fmtNum(g.fansGained)}</div><div class="k">${t('hud.fans')}</div></div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px"><div class="row" style="margin-bottom:6px"><div class="lbl">${t('lib.sales')}</div><span class="sp"></span><span class="faint" style="font-size:12px">${g.ended ? t('lib.ended') : t('lib.forecast', { v: money(g.total) })}</span></div>${salesChart(g)}</div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-top:16px">${texts.map((r, i) => `<div class="rev show" style="--c:${REVIEWERS[i].color}"><div class="rv-h"><div class="rv-av">${icon(['cpu', 'book', 'heart', 'skull'][i])}</div><div style="flex:1"><b>${L(REVIEWERS[i].name)}</b></div><div class="rv-s num" style="color:${scoreColor(r.score)}">${r.score.toFixed(1)}</div></div><div class="rv-t"><b>${esc(r.headline)}</b>${r.detail ? `<p>${esc(r.detail)}</p>` : ''}</div></div>`).join('')}</div>
    ${g.insights?.length ? `<div class="card" style="margin-top:16px"><div class="lbl" style="margin-bottom:8px">${t('rep.notes')}</div><div class="ins">${studioNotes(g, g)}</div></div>` : ''}
    <div class="row wrap" style="gap:10px;margin-top:16px">
      ${G.u.flags.sequels ? `<button class="btn primary" data-act="lib-seq" data-id="${g.id}" ${G.job ? 'disabled' : ''}>${icon('film')}${t('lib.sequel')}</button>` : `<span class="hint">${icon('lock')} ${t('lib.seqLocked')}</span>`}
      ${patchOk && !g.ended ? `<button class="btn" data-act="lib-patch" data-id="${g.id}" ${g.patched || g.bugs < 3 ? 'disabled' : ''} data-tip="${t('lib.patchTip')}">${icon('wrench')}${g.patched ? t('lib.patched') : t('lib.patch') + ' · ' + money(patchCost(G, g))}</button>` : ''}
      ${g.bugs > 0 ? `<span class="chip c" style="--c:var(--bug)">${icon('bug')}${g.bugs} ${t('stat.bugs')}</span>` : ''}
    </div>`;
}

regWin({
  id: 'library',
  icon: 'gamepad',
  color: 'var(--accent)',
  size: 'xl',
  title: () => t('lib.title'),
  sub: (G) => t('lib.sub', { n: G.games.length, v: money(G.stats.revenue) }),
  render(G, arg) {
    return arg && arg.id ? detailView(G, arg.id) : listView(G);
  },
});
act('lib-open', (el) => {
  UI.arg = { id: +el.dataset.id };
  UI.refresh();
  const b = $('[data-keep="body"]');
  if (b) b.scrollTop = 0;
});
act('lib-back', () => {
  UI.arg = null;
  UI.refresh();
});
act('lib-seq', (el) => {
  const G = UI.app.G;
  const g = G.games.find((x) => x.id === +el.dataset.id);
  UI.close(true);
  openSequel(G, g);
});
act('lib-patch', (el) => {
  const G = UI.app.G;
  const r = patchGame(G, +el.dataset.id);
  if (r !== true) errToast(r);
  UI.refresh();
});
