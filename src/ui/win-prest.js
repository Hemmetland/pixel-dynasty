// Prestationer och statistik: studions trofésamling, epoker, rekord och siffror i ett fönster med fyra flikar. Läser bara spelet
// (sim/book.js, data/achmeta.js): inga pengar, inga val och ingen slump. Flikens val sparas inte i spelet utan bara tills sidan stängs.
import { $, esc, icon, t, tn, L, UI, act, regWin, money, bar, MONTHS } from './core.js';
import { fmtNum } from '../core/util.js';
import { lang } from '../core/i18n.js';
import { dateOf, yearOf, SCOPES } from '../sim/const.js';
import { coverImg } from '../render/covers.js';
import { sceneHTML } from './livescene.js';
import { AIC, storyList } from './win-misc.js';
import { goalsHTML, goalsDone } from './goals.js';
import { GOALS } from '../data/goals.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { ACH_CATS, ACH_DECADE, achProgress } from '../data/achmeta.js';
import { GENRE } from '../data/genres.js';
import { TOPIC } from '../data/topics.js';
import { PLATFORM } from '../data/platforms.js';
import { CERTS, certCounts, totalUnits } from '../sim/charts.js';
import { AWARD_CATS } from '../sim/awards.js';
import { storyOf } from '../sim/news.js';
import { decadeOf, decadesOf, decadeBook, decadeTrophies, lifeStats, yearRows, studioRecords, breakdown } from '../sim/book.js';

// Valen i fönstret (tills sidan laddas om)
const PT = { tab: 'ach', view: 'cat', dec: null, stat: 'genre' };
const TABS = [
  ['ach', 'ach.tab.ach'],
  ['eras', 'ach.tab.eras'],
  ['rec', 'ach.tab.rec'],
  ['stat', 'ach.tab.stat'],
];
const LEVEL_KEY = ['ach.level.0', 'ach.level.1', 'ach.level.2', 'ach.level.3'];
const CAT_KEY = { games: 'ach.cat.games', quality: 'ach.cat.quality', money: 'ach.cat.money', studio: 'ach.cat.studio', online: 'ach.cat.online', industry: 'ach.cat.industry', awards: 'ach.cat.awards', eras: 'ach.cat.eras' };
const ERA_KEY = { 1980: 'book.era.1980', 1990: 'book.era.1990', 2000: 'book.era.2000', 2010: 'book.era.2010', 2020: 'book.era.2020' };
const REC_KEY = { score: 'rec.score', units: 'rec.units', revenue: 'rec.revenue', week: 'rec.week', top: 'rec.top', year: 'rec.year', live: 'rec.live', series: 'rec.series', fans: 'rec.fans', cash: 'rec.cash' };
const REC_IC = { score: 'star', units: 'disc', revenue: 'money', week: 'trend', top: 'crown', year: 'calendar', live: 'globe', series: 'book', fans: 'heart', cash: 'bank' };
const REC_COL = { score: 'var(--gold)', units: 'var(--accent)', revenue: 'var(--money)', week: 'var(--good)', top: 'var(--gold)', year: 'var(--money)', live: 'var(--good)', series: 'var(--design)', fans: 'var(--fans)', cash: 'var(--money)' };
const STAT_ROWS = 12; // de tolv som gett mest
const STAT_KEY = { genre: 'stat.by.genre', platform: 'stat.by.platform', topic: 'stat.by.topic', scope: 'stat.by.scope' };

const dec1 = (v) => (Math.round(v * 10) / 10).toFixed(1).replace('.', lang === 'sv' ? ',' : '.');
const scoreColor = (s) => (s >= 9 ? 'var(--gold)' : s >= 8 ? 'var(--good)' : s >= 6.5 ? 'var(--accent)' : s >= 5 ? 'var(--warn)' : 'var(--bug)');
const fmtP = (fmt, v) => (fmt === 'money' ? money(v) : fmt === 'score' ? dec1(Math.floor(v * 10) / 10) : fmt === 'yr' ? String(Math.floor(v)) : fmtNum(Math.round(v)));
const dateText = (tt) => {
  const d = dateOf(tt);
  return `${MONTHS[lang][d.month]} ${d.year}`;
};
const cover = (g, px) => coverImg({ id: g.id, title: g.title, topic: g.topic, genre: g.genre, platform: g.platform }, px);
const sec = (text, right = '') => `<div class="row pr-sec"><div class="lbl">${text}</div><span class="sp"></span>${right}</div>`;
const seg = (name, cur, items) => `<div class="seg">${items.map(([v, label]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-act="${name}" data-v="${v}">${label}</button>`).join('')}</div>`;
// Statistik för spelet som visas som en klickbar rad: öppnar spelet i Biblioteket
const gameBtn = (g, inner, cls = '') => `<button class="pr-game ${cls}" data-act="pr-game" data-id="${g.id}">${inner}</button>`;

// ── Flik 1: prestationer ──
const achOn = (G, a) => G.ach.includes(a.id);
// Epokpriset för ett årtionde som redan är slut och inte klarades
const missed = (G, a) => !achOn(G, a) && ACH_DECADE[a.id] != null && yearOf(G.t) > ACH_DECADE[a.id] + 9;

function trophy(G, a) {
  const on = achOn(G, a);
  const tt = G.achT && G.achT[a.id];
  const p = !on ? achProgress(G, a.id) : null;
  const miss = missed(G, a);
  const foot = on
    ? `<div class="faint pr-d">${tt != null ? t('ach.earned', { d: dateText(tt) }) : t('ach.earlier')}</div>`
    : miss
      ? `<div class="pr-d"><span class="tag" style="--c:var(--bug)">${t('ach.missed')}</span></div>`
      : p
        ? `<div class="pr-p">${bar(p.pct, 'var(--gold)', 'thin')}<span class="faint num">${fmtP(p.fmt, p.cur)} / ${fmtP(p.fmt, p.max)}</span></div>`
        : '';
  return `<div class="card row ach pr-ach ${on ? 'on' : ''} ${miss ? 'miss' : ''}" style="gap:12px"><div class="ai">${icon(AIC[a.glyph] || 'star')}</div><div style="flex:1;min-width:0"><b>${L(a.name)}</b><div class="hint">${L(a.desc)}</div>${foot}</div>${on ? icon('check') : icon('lock')}</div>`;
}
const grid = (html) => `<div class="grid pr-grid">${html}</div>`;

function nextTrophies(G) {
  const rows = ACHIEVEMENTS.filter((a) => !achOn(G, a) && !missed(G, a))
    .map((a, i) => ({ a, i, p: achProgress(G, a.id) }))
    .filter((x) => x.p && x.p.pct < 100)
    .sort((x, y) => y.p.pct - x.p.pct || x.i - y.i)
    .slice(0, 3);
  if (!rows.length) return '';
  return `${sec(t('ach.next'))}<p class="hint" style="margin:-2px 0 8px">${t('ach.nextHelp')}</p>${grid(rows.map((x) => trophy(G, x.a)).join(''))}`;
}

function byCategory(G) {
  return ACH_CATS.map((c) => {
    const list = c.ids.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean);
    const n = list.filter((a) => achOn(G, a)).length;
    return `<div class="pr-cat">${sec(`<span class="pr-ci">${icon(c.ic)}</span>${t(CAT_KEY[c.id])}`, `<span class="faint num">${n} / ${list.length}</span>`)}${bar((n / list.length) * 100, 'var(--gold)', 'thin')}${grid(list.map((a) => trophy(G, a)).join(''))}</div>`;
  }).join('');
}

function byEra(G) {
  const T = G.achT || {};
  const mine = ACHIEVEMENTS.filter((a) => achOn(G, a));
  const dated = mine.filter((a) => T[a.id] != null).sort((x, y) => T[x.id] - T[y.id]);
  const decs = decadesOf(G).slice().reverse();
  const blocks = decs.map((d) => {
    const list = dated.filter((a) => decadeOf(yearOf(T[a.id])) === d);
    return `<div class="pr-cat">${sec(t('book.decade', { d }), `<span class="faint num">${list.length}</span>`)}${list.length ? grid(list.map((a) => trophy(G, a)).join('')) : `<p class="hint">${t('ach.eraNone')}</p>`}</div>`;
  });
  const undated = mine.filter((a) => T[a.id] == null);
  if (undated.length) blocks.push(`<div class="pr-cat">${sec(t('ach.eraEarlier'), `<span class="faint num">${undated.length}</span>`)}${grid(undated.map((a) => trophy(G, a)).join(''))}</div>`);
  return blocks.join('');
}

function achTab(G) {
  const total = ACHIEVEMENTS.length;
  const have = G.ach.length;
  const pct = have / total;
  const lvl = pct >= 0.75 ? 3 : pct >= 0.5 ? 2 : pct >= 0.25 ? 1 : 0;
  const top = `<div class="card pr-top"><div class="pr-cup">${icon('trophy')}</div><div style="flex:1;min-width:0">
    <div class="row wrap" style="gap:4px 10px"><b class="disp pr-big">${have}<small>/${total}</small></b><span class="spill" style="--c:var(--gold)" data-tip="${esc(t('ach.levelTip'))}">${icon('crown')}${t(LEVEL_KEY[lvl])}</span></div>
    <div class="hint" style="margin:2px 0 8px">${t('ach.have', { x: have, y: total })}</div>${bar(pct * 100, 'var(--gold)', 'tall')}</div></div>`;
  const view = `<div class="row pr-view">${seg('pr-view', PT.view, [['cat', t('ach.view.cat')], ['era', t('ach.view.era')]])}</div>`;
  return `${top}${nextTrophies(G)}<div style="margin-top:16px">${goalsHTML(G)}</div>${view}${PT.view === 'era' ? byEra(G) : byCategory(G)}`;
}

// ── Flik 2: epoker ──
const yearBars = (rows, dec, now) => {
  const by = new Map(rows.map((r) => [r.y, r]));
  const max = Math.max(1, ...rows.map((r) => r.sales));
  const cols = Array.from({ length: 10 }, (_, i) => {
    const y = dec + i;
    const r = by.get(y);
    if (!r || y > now) return `<div class="pr-yc off"><div class="pr-yb"></div><span>${String(y).slice(2)}</span></div>`;
    const tip = tn('book.yearTip', r.games, { y, n: r.games, v: money(r.sales) });
    return `<div class="pr-yc" data-tip="${esc(tip)}"><div class="pr-yb"><i style="height:${Math.max(r.sales > 0 ? 4 : 0, Math.round((r.sales / max) * 100))}%"></i></div><span>${String(y).slice(2)}</span></div>`;
  }).join('');
  return `<div class="pr-years">${cols}</div>`;
};

function bigGame(g, label, line) {
  return gameBtn(g, `${cover(g, 54)}<span class="pr-gt"><span class="lbl">${label}</span><b>${esc(g.title)}</b><span class="faint">${line}</span></span><b class="disp pr-sc" style="color:${scoreColor(g.score)}">${dec1(g.score)}</b>`, 'card hov');
}

function erasTab(G) {
  const decs = decadesOf(G);
  if (PT.dec == null || !decs.includes(PT.dec)) PT.dec = decs[decs.length - 1];
  const b = decadeBook(G, PT.dec);
  const pick = decs.length > 1 ? `<div class="row" style="margin-bottom:12px">${seg('pr-dec', PT.dec, decs.map((d) => [d, t('book.decade.s', { d: String(d).slice(2) })]))}</div>` : '';
  const head = `<div class="card pr-era"><div class="row wrap" style="gap:6px 10px"><b class="disp pr-big">${t('book.decade', { d: b.dec })}</b><span class="tag" style="--c:${b.over ? 'var(--muted)' : 'var(--good)'}">${t(b.over ? 'book.over' : 'book.now')}</span></div><p class="hint" style="margin-top:6px">${t(ERA_KEY[b.dec])}</p></div>`;
  const tiles = [
    ['gamepad', 'var(--design)', fmtNum(b.n), t('book.f.games')],
    ['disc', 'var(--accent)', fmtNum(b.units), t('book.f.sold')],
    ['money', 'var(--money)', money(b.sales), t('book.f.sales')],
    ['trophy', 'var(--gold)', fmtNum(b.awards), t('book.f.awards')],
  ];
  const counters = `<div class="counters pr-tiles">${tiles.map(([ic, c, v, k]) => `<div class="counter xc" style="--c:${c}"><span class="xc-i">${icon(ic)}</span><div class="v num">${v}</div><div class="k">${k}</div></div>`).join('')}</div>`;
  const facts = [
    b.bestRank ? ['chart', 'var(--accent)', t('book.f.rank'), t('book.rank', { n: b.bestRank })] : null,
    b.topYears ? ['crown', 'var(--gold)', t('book.f.top'), fmtNum(b.topYears)] : null,
    b.discs ? ['disc', 'var(--gold)', t('rec.discs'), fmtNum(b.discs)] : null,
  ].filter(Boolean);
  const factRow = facts.length ? `<div class="pr-facts">${facts.map(([ic, c, k, v]) => `<span class="spill" style="--c:${c}">${icon(ic)}${k}: ${v}</span>`).join('')}</div>` : '';
  let games = `<p class="hint" style="margin-top:12px">${t('book.noGames')}</p>`;
  if (b.best) {
    const same = b.seller && b.seller.id === b.best.id;
    const cards = [bigGame(b.best, same ? `${t('book.best')} · ${t('book.seller')}` : t('book.best'), `${fmtNum(totalUnits(b.best))} ${t('stat.units').toLowerCase()}`)];
    if (b.seller && !same) cards.push(bigGame(b.seller, t('book.seller'), `${fmtNum(totalUnits(b.seller))} ${t('stat.units').toLowerCase()}`));
    games = `<div class="grid pr-grid" style="margin-top:12px">${cards.join('')}</div>`;
  }
  const years = `${sec(t('book.years'))}${yearBars(b.years, b.dec, yearOf(G.t))}`;
  const plats = b.platforms.length ? `${sec(t('book.plat'))}<div class="row wrap" style="gap:6px">${b.platforms.map((id) => `<span class="chip c" style="--c:var(--tech)">${icon('console')}${esc(PLATFORM[id].name)}</span>`).join('')}</div>` : '';
  const trophies = b.trophies.length ? `${sec(t('book.trophies'), `<span class="faint num">${b.trophies.length}</span>`)}<div class="row wrap" style="gap:6px">${b.trophies.map((id) => { const a = ACHIEVEMENTS.find((x) => x.id === id); return a ? `<span class="chip c" style="--c:var(--gold)" data-tip="${esc(L(a.desc))}">${icon(AIC[a.glyph] || 'star')}${L(a.name)}</span>` : ''; }).join('')}</div>` : '';
  const rows = decade(G, PT.dec);
  const miles = `${sec(t('book.miles'), `<span class="faint num">${rows.length}</span>`)}${rows.length ? `<div class="story${rows.length < 2 ? ' one' : ''}">${storyList(rows)}</div>` : `<p class="hint">${t('book.milesNone')}</p>`}<p class="hint" style="margin-top:8px">${t('book.milesAll')}</p>`;
  return `${pick}${head}${counters}${factRow}${games}${years}${plats}${trophies}${miles}`;
}
// Milstolpar från ett årtionde (grundandet hör till 80-talet)
function decade(G, dec) {
  const rows = [{ t: 0, key: 'hist.founded', vars: { studio: G.studio } }, ...storyOf(G)];
  return rows.filter((m) => decadeOf(yearOf(m.t)) === dec);
}

// ── Flik 3: rekord ──
function recValue(id, v) {
  if (id === 'score') return dec1(v);
  if (id === 'top') return tn('rec.weeks', v, { n: fmtNum(v) });
  if (id === 'series') return tn('rec.games', v, { n: v });
  return id === 'units' || id === 'live' || id === 'fans' ? fmtNum(v) : money(v);
}
function recCard(r) {
  const col = REC_COL[r.id];
  const body = `<span class="pr-ri" style="--c:${col}">${icon(REC_IC[r.id])}</span><span class="pr-rt"><span class="lbl">${t(REC_KEY[r.id])}</span><b class="num pr-rv" style="color:${col}">${recValue(r.id, r.v)}</b><span class="faint pr-rg">${r.g ? esc(r.g.title) : r.y || ''}</span></span>${r.g ? cover(r.g, 40) : ''}`;
  return r.g ? gameBtn(r.g, body, 'card hov pr-rec') : `<div class="card pr-rec">${body}</div>`;
}
function shelf(G) {
  const n = certCounts(G);
  const any = n.some((x) => x > 0);
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const row = CERTS.map((c, i) => `<div class="sh-disc ${n[i] ? 'on' : ''}" style="--c:${c.color}" data-tip="${esc(t('lib.certAt', { cert: cap(L(c.name)), n: fmtNum(c.units) }))}">${icon('disc')}<b class="num">${n[i]}</b><span>${L(c.short)}</span></div>`).join('');
  return `${sec(t('rec.discs'))}<div class="sh-discs">${row}</div>${any ? '' : `<p class="hint" style="margin-top:8px">${t('rec.discsNone')}</p>`}`;
}
function awardsShelf(G) {
  if (!G.awards.length) return `${sec(t('rec.awards'))}<p class="hint">${t('rec.awardsNone')}</p>`;
  const list = G.awards.slice().reverse().map((a) => {
    const c = AWARD_CATS.find((x) => x.id === a.cat);
    return `<div class="pr-aw"><span class="pr-ai">${icon('trophy')}</span><div style="min-width:0"><b>${c ? L(c.name) : ''}</b><div class="faint pr-t">${esc(L(a.title))}</div></div><span class="faint num">${a.year}</span></div>`;
  });
  return `${sec(t('rec.awards'), `<span class="faint num">${G.awards.length}</span>`)}<div class="grid pr-grid pr-awg">${list.join('')}</div>`;
}
function decadeShelf(G) {
  const list = decadeTrophies(G);
  if (!list.length) return '';
  const line = (g, key, val) => (g ? gameBtn(g, `<span class="lbl">${t(key)}</span><b class="pr-gt2">${esc(g.title)}</b><span class="faint num">${val}</span>`, 'pr-dl') : '');
  const cards = list
    .slice()
    .reverse()
    .map((d) => `<div class="card pr-dc"><div class="row" style="gap:8px;margin-bottom:6px"><b class="disp" style="font-size:18px;color:var(--gold)">${t('book.decade', { d: d.dec })}</b>${d.over ? '' : `<span class="tag" style="--c:var(--good)">${t('rec.provisional')}</span>`}</div>${line(d.best, 'rec.decadeBest', dec1(d.best.score))}${line(d.seller, 'rec.decadeSeller', fmtNum(totalUnits(d.seller)))}</div>`);
  return `${sec(t('rec.decades'))}<div class="grid pr-grid">${cards.join('')}</div>`;
}
function recTab(G) {
  const recs = studioRecords(G);
  const hall = G.games.length ? `<div class="pr-hall">${sceneHTML('hall', G)}</div>` : '';
  return `${hall}${sec(t('rec.title'))}<p class="hint" style="margin:-2px 0 8px">${t('rec.help')}</p>${recs.length ? `<div class="grid pr-grid">${recs.map(recCard).join('')}</div>` : `<p class="hint">${t('rec.none')}</p>`}${shelf(G)}${awardsShelf(G)}${decadeShelf(G)}`;
}

// ── Flik 4: statistik ──
function nameOf(key, id) {
  if (key === 'genre') return { n: L(GENRE[id].name), c: GENRE[id].color };
  if (key === 'topic') return { n: L(TOPIC[id].name), c: 'var(--design)' };
  if (key === 'scope') return { n: L(SCOPES[id].name), c: 'var(--accent)' };
  return { n: PLATFORM[id] ? PLATFORM[id].name : String(id), c: 'var(--tech)' };
}
function statTab(G) {
  const S = lifeStats(G);
  if (!S.games) return `<div class="empty">${icon('chart')}<div>${t('stat.noGames')}</div></div>`;
  const tiles = [
    ['gamepad', 'var(--design)', fmtNum(S.games), t('stat.games')],
    ['disc', 'var(--accent)', fmtNum(S.units), t('stat.units')],
    ['money', 'var(--money)', money(S.revenue), t('stat.revenue')],
    ['star', 'var(--gold)', dec1(S.avg), t('stat.avg')],
    ['trophy', 'var(--gold)', fmtNum(S.awards), t('book.f.awards')],
    ['disc', 'var(--gold)', fmtNum(S.discs), t('rec.discs')],
    ['heart', 'var(--fans)', fmtNum(S.fans), t('stat.fans')],
    ['calendar', 'var(--muted)', fmtNum(S.years), t('stat.years')],
  ];
  const counters = `<div class="counters pr-tiles pr-t8">${tiles.map(([ic, c, v, k]) => `<div class="counter xc" style="--c:${c}"><span class="xc-i">${icon(ic)}</span><div class="v num">${v}</div><div class="k">${k}</div></div>`).join('')}</div>`;
  const rows = yearRows(G);
  const max = Math.max(1, ...rows.map((r) => r.sales));
  const few = rows.length <= 14;
  const bars = rows
    .map((r) => `<div class="pr-yc" data-tip="${esc(tn('book.yearTip', r.games, { y: r.y, n: r.games, v: money(r.sales) }))}"><div class="pr-yb"><i style="height:${Math.max(r.sales > 0 ? 4 : 0, Math.round((r.sales / max) * 100))}%"></i></div><span>${few || r.y % 10 === 0 ? String(r.y).slice(few ? 2 : 0) : ''}</span></div>`)
    .join('');
  const sales = `${sec(t('stat.sales'))}<p class="hint" style="margin:-2px 0 8px">${t('stat.salesHelp')}</p><div class="pr-years pr-yall">${bars}</div>`;
  const all = breakdown(G, PT.stat);
  const by = all.slice(0, STAT_ROWS);
  const top = Math.max(1, ...by.map((r) => r.rev));
  const list = by
    .map((r) => {
      const nm = nameOf(PT.stat, r.id);
      return `<div class="pr-bd" style="--c:${nm.c}"><div class="row" style="gap:8px"><b class="pr-bn">${esc(nm.n)}</b><span class="sp"></span><b class="num" style="color:var(--money)">${money(r.rev)}</b></div>${bar((r.rev / top) * 100, nm.c, 'thin')}
        <div class="row wrap faint pr-bs" style="gap:2px 12px"><span>${tn('stat.row', r.n, { n: r.n, a: dec1(r.avg) })}</span><span>${fmtNum(r.units)} ${t('stat.units').toLowerCase()}</span>${r.best ? `<span class="pr-bb">${t('stat.best', { title: esc(r.best.title) })}</span>` : ''}</div></div>`;
    })
    .join('');
  const split = `${sec(t('stat.by'), seg('pr-stat', PT.stat, Object.keys(STAT_KEY).map((k) => [k, t(STAT_KEY[k])])))}<div class="col" style="gap:10px">${list}</div>${all.length > by.length ? `<p class="hint" style="margin-top:8px">${t('stat.more', { n: all.length - by.length })}</p>` : ''}`;
  return `${counters}${sales}${split}`;
}

regWin({
  id: 'achievements',
  icon: 'award',
  color: 'var(--gold)',
  size: 'lg',
  title: () => t('ach.title'),
  sub: (G) => `${t('ach.sec')} ${G.ach.length}/${ACHIEVEMENTS.length} · ${t('goal.title')} ${goalsDone(G)}/${GOALS.length}`,
  headExtra: () => `<div class="tabs">${TABS.map(([k, key]) => `<button class="tab ${PT.tab === k ? 'on' : ''}" data-act="pr-tab" data-id="${k}">${t(key)}</button>`).join('')}</div>`,
  render(G) {
    G.flags.goalsSeen = 1; // handledningen har visat var målen finns
    return PT.tab === 'eras' ? erasTab(G) : PT.tab === 'rec' ? recTab(G) : PT.tab === 'stat' ? statTab(G) : achTab(G);
  },
});

const top = () => {
  UI.refresh();
  const b = $('[data-keep="body"]');
  if (b) b.scrollTop = 0;
};
act('pr-tab', (el) => {
  PT.tab = el.dataset.id;
  top();
});
act('pr-view', (el) => {
  PT.view = el.dataset.v;
  UI.refresh();
});
act('pr-dec', (el) => {
  PT.dec = +el.dataset.v;
  UI.refresh();
});
act('pr-stat', (el) => {
  PT.stat = el.dataset.v;
  UI.refresh();
});
act('pr-game', (el) => UI.open('library', { id: +el.dataset.id }, { force: true }));

