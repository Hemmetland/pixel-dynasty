// Studiolivet: ett gemensamt fönster för det som gör studion levande. Krönikan samlar allt som hänt (personalen, fansen, tidningen,
// världen och dramat) i en tidslinje, och Folket visar vem som är vän med vem, personligheter, födelsedagar och drömmar. Bara läsning:
// allt kommer ur sim/life.js (krönikan) och sim/folk.js.
import { sceneHTML } from './livescene.js';
import { esc, icon, t, L, UI, act, regWin, MONTHS } from './core.js';
import { fmtNum } from '../core/util.js';
import { lang } from '../core/i18n.js';
import { avatarImg } from '../render/people.js';
import { dateOf } from '../sim/const.js';
import { lifeText, chronLog, CHRON_AREAS } from '../sim/life.js';
import { QUIRKS } from '../data/folk.js';
import { persona, ageOf, bdayIn, bondsOf, friendsOf, partnerOf, folkOf, dreamName } from '../sim/folk.js';
import { fanTalk } from '../sim/community.js';
import { magOf, coverText, gossipText, rumorText, quoteText, outletName } from '../sim/mag.js';
import { histState, memoryVars } from '../sim/history.js';
import { reactState } from '../sim/reaction.js';
import { coverImg } from '../render/covers.js';
import { CERTS } from '../data/certs.js';
import { storyList } from './win-misc.js';
import { GENRE } from '../data/genres.js';
import { TOPIC } from '../data/topics.js';

const LS = { tab: 'chron', area: 'all', issue: -1 };
const AREA_IC = { folk: 'heart', fans: 'user', press: 'book', world: 'globe', drama: 'fire', studio: 'star' };
const AREA_COL = { folk: 'var(--fans)', fans: 'var(--accent)', press: 'var(--design)', world: 'var(--good)', drama: 'var(--hot)', studio: 'var(--gold)' };
const AREA_KEY = { folk: 'lf.area.folk', fans: 'lf.area.fans', press: 'lf.area.press', world: 'lf.area.world', drama: 'lf.area.drama', studio: 'lf.area.studio' };
const when = (tt) => {
  const d = dateOf(tt);
  return `${MONTHS[lang][d.month]} ${d.year}`;
};

// Personlighetsbrickan (används också i personalfönstret)
export function quirkChip(G, s) {
  const q = QUIRKS[persona(G, s).quirk];
  return `<span class="chip" data-tip="${esc(L(q.desc))}">${icon(q.ic)}${L(q.name)}</span>`;
}
// En rad om vem personen är vän med eller ihop med (tom om ingen)
export function bondsLine(G, s) {
  const par = partnerOf(G, s.id);
  const fr = friendsOf(G, s.id).filter((x) => !par || x.id !== par.id);
  const parts = [];
  if (par) {
    const b = bondsOf(G, s.id).find((x) => x.k === 'couple');
    parts.push(`<span class="chip c" style="--c:var(--fans)">${icon('heart')}${t(b && b.wed > 0 ? 'lf.p.married' : 'lf.p.couple', { name: esc(par.name.split(' ')[0]) })}</span>`);
  }
  if (fr.length) parts.push(`<span class="chip c" style="--c:var(--good)">${icon('user')}${t('lf.p.friend', { names: esc(fr.map((x) => x.name.split(' ')[0]).join(', ')) })}</span>`);
  return parts.join('');
}

function chronRow(it) {
  const col = AREA_COL[it.ch] || 'var(--accent)';
  return `<div class="lf-row"><span class="lf-ic" style="--c:${col}">${icon(AREA_IC[it.ch] || 'star')}</span><span class="lf-tx">${esc(lifeText(it))}</span><span class="lf-when faint">${when(it.t)}</span></div>`;
}
function chronTab(G) {
  const have = CHRON_AREAS.filter((a) => chronLog(G, a, 1).length);
  if (LS.area !== 'all' && !have.includes(LS.area)) LS.area = 'all';
  const chips = ['all', ...have].map((a) => `<button class="chip lf-chip ${LS.area === a ? 'on' : ''}" data-act="lf-area" data-id="${a}">${a === 'all' ? t('lf.area.all') : `${icon(AREA_IC[a])}${t(AREA_KEY[a])}`}</button>`).join('');
  const rows = chronLog(G, LS.area === 'all' ? '' : LS.area, 60);
  return `<p class="hint" style="margin:0 0 10px">${icon('info')} ${t('lf.chron.help')}</p>
    <div class="row wrap" style="gap:6px;margin-bottom:10px">${chips}</div>
    ${rows.length ? `<div class="lf-list">${rows.map(chronRow).join('')}</div>` : `<div class="empty">${icon('book')}<div>${t('lf.chron.empty')}</div></div>`}`;
}

const moodCol = (m) => (m >= 62 ? 'var(--good)' : m >= 38 ? 'var(--warn)' : 'var(--bug)');
function personCard(G, s) {
  const F = folkOf(G);
  const P = persona(G, s);
  const dr = F.dreams[s.id];
  const bd = bdayIn(G, s);
  const sad = F.cool[s.id] && F.cool[s.id].until > G.t;
  const dreamLine =
    dr && (dr.state === 'go' || dr.state === 'free')
      ? `<div class="lf-dream" style="--c:var(--design)">${icon('bulb')}<span>${t('lf.p.dreamGo', { game: esc(dreamName(dr.dream)), n: Math.max(1, dr.until - G.t) })}</span></div>`
      : dr && dr.state === 'no'
        ? `<div class="lf-dream" style="--c:var(--bug)">${icon('bulb')}<span>${t('lf.p.dreamNo', { game: esc(dreamName(dr.dream)) })}</span></div>`
        : dr && dr.state === 'done'
          ? `<div class="lf-dream" style="--c:var(--good)">${icon('trophy')}<span>${t('lf.p.dreamDone', { game: esc(dreamName(dr.dream)) })}</span></div>`
          : `<div class="lf-dream faint">${icon('bulb')}<span>${t('lf.p.dream', { game: esc(dreamName(P.dream)) })}</span></div>`;
  const bonds = bondsLine(G, s);
  return `<div class="card lf-p"><div class="row" style="gap:10px;align-items:flex-start">
      <div class="sc-av">${avatarImg(s.look, 2, 'stand')}</div>
      <div style="flex:1;min-width:0"><div class="row" style="gap:6px"><b class="h3 ell">${esc(s.name)}</b><span class="faint" style="font-size:12px">${t('lf.p.age', { n: ageOf(G, s) })}</span></div>
        <div class="row wrap" style="gap:6px;margin-top:5px">${quirkChip(G, s)}${bonds}${sad ? `<span class="chip c" style="--c:var(--bug)" data-tip="${esc(t('lf.p.sadTip'))}">${icon('rain')}${t('lf.p.sad')}</span>` : ''}</div></div>
      <div class="lf-mood" style="--c:${moodCol(s.mood)}" data-tip="${esc(t('lf.p.moodTip'))}">${Math.round(s.mood)}</div></div>
    ${dreamLine}
    <div class="faint" style="font-size:11.5px;margin-top:6px">${icon('calendar')} ${bd === 0 ? t('lf.p.bdayNow') : t('lf.p.bday', { n: bd })}</div></div>`;
}
function folkTab(G) {
  const F = folkOf(G);
  const couples = F.bonds.filter((b) => b.k === 'couple').length;
  const friends = F.bonds.filter((b) => b.k === 'friend').length;
  const people = G.staff.slice().sort((a, b) => (b.isFounder ? 1 : 0) - (a.isFounder ? 1 : 0) || a.id - b.id);
  const next = people.map((s) => ({ s, in: bdayIn(G, s) })).sort((a, b) => a.in - b.in || a.s.id - b.s.id).slice(0, 3);
  return `${sceneHTML('studio', G)}<p class="hint" style="margin:0 0 10px">${icon('info')} ${t('lf.folk.help')}</p>
    <div class="row wrap" style="gap:8px;margin-bottom:12px"><span class="chip c" style="--c:var(--good)">${icon('user')}${t('lf.folk.friends', { n: friends })}</span><span class="chip c" style="--c:var(--fans)">${icon('heart')}${t('lf.folk.couples', { n: couples })}</span>
      ${next.map((x) => `<span class="chip">${icon('calendar')}${t(x.in === 0 ? 'lf.folk.bdayNow' : 'lf.folk.bday', { name: esc(x.s.name.split(' ')[0]), n: x.in })}</span>`).join('')}</div>
    <div class="grid lf-grid">${people.map((s) => personCard(G, s)).join('')}</div>`;
}

// ── Fansen: spelen som pratas om just nu ──
const FK_IC = { thread: 'book', meme: 'sparkle', fanart: 'pen', streamer: 'film', viralUp: 'fire', viralDown: 'bug' };
const V_COL = { up: 'var(--good)', streamer: 'var(--good)', cover: 'var(--gold)', down: 'var(--bug)' };
const V_IC = { up: 'fire', streamer: 'film', cover: 'star', down: 'rain' };
function talkCard(G, x) {
  const v = x.viral;
  const badge = v ? `<span class="chip c" style="--c:${V_COL[v.k]}" data-tip="${esc(t('lf.fans.viralTip'))}">${icon(V_IC[v.k])}${t('lf.fans.v.' + v.k, { n: Math.abs(v.pct), w: v.left })}</span>` : '';
  const happened = x.happened.map((h) => `<span class="chip">${icon(FK_IC[h.k] || 'info')}${t('lf.fans.k.' + h.k)} · ${t('lf.fans.ago', { n: Math.max(0, G.t - h.t) })}</span>`).join('');
  const voice = x.voice ? `<div class="lf-voice ${x.voice.mood > 0 ? 'lf-v-up' : x.voice.mood < 0 ? 'lf-v-down' : ''}"><q>${esc(L(x.voice.text))}</q><span class="faint">${esc(L(x.voice.name))}</span></div>` : '';
  const age = x.live ? t('lf.fans.live') : x.age < 2 ? t('lf.fans.new') : t('lf.fans.age', { n: x.age });
  return `<div class="card lf-p"><div class="row" style="gap:8px;align-items:flex-start"><div style="flex:1;min-width:0"><b class="h3 ell">${esc(x.title)}</b><div class="faint" style="font-size:12px;margin-top:2px">${age}</div></div>
      <div class="lf-mood" style="--c:${moodCol(x.score * 10)}" data-tip="${esc(t('lf.p.scoreTip'))}">${x.score.toFixed(1)}</div></div>
    ${badge || happened ? `<div class="row wrap" style="gap:6px;margin-top:8px">${badge}${happened}</div>` : ''}${voice}</div>`;
}
function fansTab(G) {
  const list = fanTalk(G, 12);
  return `${sceneHTML('fans', G)}<p class="hint" style="margin:0 0 10px">${icon('info')} ${t('lf.fans.help')}</p>
    ${list.length ? `<div class="grid lf-grid">${list.map((x) => talkCard(G, x)).join('')}</div>` : `<div class="empty">${icon('user')}<div>${t('lf.fans.empty')}</div></div>`}`;
}

// ── Tidningen: månadens nummer ──
const tx = (x) => (x && typeof x === 'object' ? L(x) : x == null ? '' : String(x));
const COVER_IC = { youTop: 'trophy', youGood: 'star', youOk: 'book', youFlop: 'bug', rivalHit: 'crown', rankUp: 'trend', rankDown: 'trend', trend: 'fire', folk: 'heart', quiet: 'coffee', leader: 'crown', rumor: 'eye' };
const COVER_COL = { youTop: 'var(--gold)', youGood: 'var(--good)', youOk: 'var(--accent)', youFlop: 'var(--bug)', rivalHit: 'var(--hot)', rankUp: 'var(--good)', rankDown: 'var(--warn)', trend: 'var(--hot)', folk: 'var(--fans)', quiet: 'var(--faint)', leader: 'var(--gold)', rumor: 'var(--design)' };
const scoreCol = (v) => (v >= 7.5 ? 'var(--good)' : v >= 5.5 ? 'var(--warn)' : 'var(--bug)');
function reviewRow(r) {
  const outlets = (r.outlets || []).map((o) => `<span class="chip lf-out" data-tip="${esc(t('lf.mag.outletTip', { name: outletName(o.id), v: o.s }))}">${esc(outletName(o.id).split(' ')[0])} <b>${o.s}</b></span>`).join('');
  return `<div class="mg-rev${r.you ? ' you' : ''}"><div class="lf-mood" style="--c:${scoreCol(r.score)}" data-tip="${esc(t('lf.mag.score', { v: r.score.toFixed(1) }))}">${r.score.toFixed(1)}</div>
    <div style="min-width:0"><div class="row" style="gap:6px"><b class="ell">${esc(tx(r.title))}</b>${r.you ? `<span class="chip c" style="--c:var(--accent)">${t('lf.mag.you')}</span>` : ''}</div>
      <div class="faint" style="font-size:12px">${esc(r.studio)}</div>
      <q class="mg-q">${esc(quoteText(r.q, lang))}</q>${outlets ? `<div class="row wrap" style="gap:5px;margin-top:6px">${outlets}</div>` : ''}</div></div>`;
}
function chartRows(ch) {
  const top = Math.max(1, ...ch.map((x) => x.s));
  return ch.map((x) => `<div class="mg-ch${x.y ? ' you' : ''}"><span class="mg-pos">${x.p}</span><span class="ell">${esc(x.n)}</span><div class="bar" style="--c:${x.y ? 'var(--accent)' : 'var(--faint)'}"><i style="width:${Math.max(3, (x.s / top) * 100)}%"></i></div><span class="faint num">${t('lf.mag.share', { n: x.s })}</span></div>`).join('');
}
function magTab(G) {
  const M = magOf(G);
  if (!M.issues.length) return `${sceneHTML('press', G)}<div class="empty">${icon('book')}<div>${t('lf.mag.empty')}</div></div>`;
  let i = LS.issue;
  if (i < 0 || i >= M.issues.length) i = M.issues.length - 1;
  LS.issue = i;
  const is = M.issues[i];
  const d = dateOf(is.t);
  const c = is.cover;
  const hot = is.trend && GENRE[is.trend.genre] ? (is.trend.topic && TOPIC[is.trend.topic] ? t('lf.mag.trendText', { genre: L(GENRE[is.trend.genre].name), topic: L(TOPIC[is.trend.topic].name).toLowerCase() }) : t('lf.mag.trendOnly', { genre: L(GENRE[is.trend.genre].name) })) : '';
  const nav = `<div class="row mg-nav" style="gap:6px"><button class="btn sm prev" data-act="lf-issue" data-id="${i - 1}"${i <= 0 ? 'disabled' : ''} data-tip="${esc(t('lf.mag.prev'))}">${icon('chevron')}</button><button class="btn sm next" data-act="lf-issue" data-id="${i + 1}" ${i >= M.issues.length - 1 ? 'disabled' : ''} data-tip="${esc(t('lf.mag.next'))}">${icon('chevron')}</button></div>`;
  const gossip = is.gossip.length ? is.gossip.map((x) => `<div class="mg-gs">${icon('mail')}<span>${esc(gossipText(x))}</span></div>`).join('') : `<div class="faint" style="font-size:12.5px">${t('lf.mag.noGossip')}</div>`;
  const older = M.issues.map((x, n) => ({ x, n })).reverse().slice(0, 12).map(({ x, n }) => `<button class="chip lf-chip ${n === i ? 'on' : ''}" data-act="lf-issue" data-id="${n}">${MONTHS[lang][dateOf(x.t).month]} ${dateOf(x.t).year}</button>`).join('');
  return `${sceneHTML('press', G)}<p class="hint" style="margin:0 0 10px">${icon('info')} ${t('lf.mag.help')}</p>
    <div class="mg">
      <div class="mg-head"><div><b class="mg-name">${t('mag.name')}</b><span class="faint"> · ${t('lf.mag.no', { n: is.n })} · ${MONTHS[lang][d.month]} ${d.year}</span></div>${nav}</div>
      <div class="mg-cover" style="--c:${COVER_COL[c.k]}"><span class="lf-ic" style="--c:${COVER_COL[c.k]}">${icon(COVER_IC[c.k])}</span><b class="mg-hl">${esc(coverText(c))}</b></div>
      ${c.k === 'youTop' ? `<div class="faint" style="font-size:12px;margin:-4px 0 12px">${icon('star')} ${t('lf.mag.boost')}</div>` : ''}
      <div class="mg-cols">
        <section><h4 class="mg-h">${icon('trophy')}${t('lf.mag.tests')}</h4>${is.reviews.length ? is.reviews.map(reviewRow).join('') : `<div class="faint" style="font-size:12.5px">${t('lf.mag.noTests')}</div>`}</section>
        <section><h4 class="mg-h">${icon('chart')}${t('lf.mag.chart')}</h4><div data-tip="${esc(t('lf.mag.chartTip'))}">${chartRows(is.chart)}</div>
          ${hot ? `<h4 class="mg-h" style="margin-top:14px">${icon('fire')}${t('lf.mag.trend')}</h4><div style="font-size:13px">${esc(hot)}</div>` : ''}</section>
        <section><h4 class="mg-h">${icon('mail')}${t('lf.mag.gossip')}</h4>${gossip}
          ${is.rumor ? `<h4 class="mg-h" style="margin-top:14px">${icon('eye')}${t('lf.mag.rumor')}</h4><div style="font-size:13px">${esc(rumorText(is.rumor))}</div>` : ''}</section>
      </div>
    </div>
    <div class="faint" style="font-size:12px;margin:14px 0 6px">${t('lf.mag.older')}</div><div class="row wrap" style="gap:6px">${older}</div>`;
}

// ── Historia: väggen med inramade släpp, veteranernas minnen och milstolparna ──
const MEM_IC = ['star', 'rain', 'trophy', 'bulb'];
const MEM_COL = ['var(--good)', 'var(--warn)', 'var(--gold)', 'var(--design)'];
function frameCard(w) {
  const cert = CERTS.find((c) => c.id === w.cert);
  const marks = [
    cert ? `<span class="hs-mk" style="--c:${cert.color}" data-tip="${esc(L(cert.name))}">${icon('disc')}</span>` : '',
    w.top ? `<span class="hs-mk" style="--c:var(--gold)" data-tip="${esc(t('lf.hist.top'))}">${icon('crown')}</span>` : '',
    w.live ? `<span class="hs-mk" style="--c:var(--good)" data-tip="${esc(t('lf.hist.live'))}">${icon('globe')}</span>` : '',
  ].join('');
  const title = tx(w.title);
  return `<div class="hs-fr ${w.frame}" data-tip="${esc(`${title} · ${w.score.toFixed(1)} · ${t('lf.hist.sold', { n: fmtNum(w.units) })}`)}"><div class="hs-pic">${coverImg({ id: w.id, title, topic: w.topic, genre: w.genre, platform: w.platform }, 72)}</div>
    <b class="ell">${esc(title)}</b><span class="faint" style="font-size:11.5px">${w.year} · <b style="color:${scoreCol(w.score)}">${w.score.toFixed(1)}</b></span>${marks ? `<div class="hs-mks">${marks}</div>` : ''}</div>`;
}
function histTab(G) {
  const h = histState(G);
  const wall = h.wall.length ? `<div class="hs-wall">${h.wall.map(frameCard).join('')}</div><p class="hint" style="margin-top:8px">${icon('info')} ${t('lf.hist.frameTip')}</p>` : `<div class="empty">${icon('trophy')}<div>${t('lf.hist.wallEmpty')}</div></div>`;
  const mem = h.memories.length
    ? `<div class="lf-list">${h.memories.slice(0, 8).map((m) => `<div class="lf-row"><span class="lf-ic" style="--c:${MEM_COL[m.v]}">${icon(MEM_IC[m.v])}</span><span class="lf-tx">${esc(t('life.memory.' + m.v, memoryVars(m)))}</span><span class="lf-when faint">${when(m.t)}</span></div>`).join('')}</div>`
    : `<p class="hint">${t('lf.hist.memEmpty')}</p>`;
  const vets = h.veterans.length ? `<div class="faint" style="font-size:12px;margin-top:8px">${icon('user')} ${t('lf.hist.vets', { names: esc(h.veterans.map((v) => t('lf.hist.vet', { name: v.name.split(' ')[0], n: v.years })).join(', ')) })}</div>` : '';
  const miles = h.milestones.length ? `<div class="story">${storyList([{ t: 0, key: 'hist.founded', vars: { studio: G.studio } }, ...h.milestones])}</div><p class="hint" style="margin-top:8px">${t('lf.hist.milesAll')}</p>` : '';
  return `<p class="hint" style="margin:0 0 10px">${icon('info')} ${t('lf.hist.help')}</p>
    <h4 class="mg-h">${icon('trophy')}${t('lf.hist.wall')}</h4>${wall}
    <h4 class="mg-h" style="margin-top:18px">${icon('bulb')}${t('lf.hist.mem')}</h4>${mem}${vets}
    <h4 class="mg-h" style="margin-top:18px">${icon('book')}${t('lf.hist.miles')}</h4>${miles}`;
}

// ── Världen: trenden, kopiorna och svängningarna ──
const sgn = (n) => (n > 0 ? `+${n}%` : n < 0 ? `−${Math.abs(n)}%` : '0%');
function trendRow(x) {
  const col = x.pct > 0 ? 'var(--good)' : x.pct < 0 ? 'var(--bug)' : 'var(--faint)';
  const src = x.src === 'rival' ? 'lf.react.src.rival' : x.src === 'you' ? (x.pct < 0 ? 'lf.react.src.cold' : 'lf.react.src.you') : 'lf.react.src.plain';
  return `<div class="rx-row${x.hottest && x.src ? ' hot' : ''}"><div style="min-width:0"><b class="ell" style="display:block">${esc(x.name)}</b><span class="faint" style="font-size:11.5px">${t(src)} · ${t('lf.react.left', { n: x.left })}</span></div><span class="lf-mood" style="--c:${col}" data-tip="${esc(t('lf.react.help'))}">${sgn(x.pct)}</span></div>`;
}
const swingName = (s) => {
  const ref = s.kind === 'genre' ? GENRE[s.id] : TOPIC[s.id];
  return ref ? L(ref.name) : '';
};
function reactTab(G) {
  const r = reactState(G);
  const clones = [
    ...r.coming.map((c) => `<div class="lf-row"><span class="lf-ic" style="--c:var(--warn)">${icon('clock')}</span><span class="lf-tx">${t('lf.react.coming', { studio: `<b>${esc(c.studio)}</b>`, mine: `<b>${esc(c.mine)}</b>`, n: c.in })}</span><span class="lf-when faint"></span></div>`),
    ...r.clones.slice(0, 6).map((c) => `<div class="lf-row"><span class="lf-ic" style="--c:var(--hot)">${icon('crown')}</span><span class="lf-tx">${t('lf.react.cloneRow', { studio: `<b>${esc(c.studio)}</b>`, title: `<b>${esc(tx(c.title))}</b>`, mine: `<b>${esc(c.mine)}</b>` })}</span><span class="lf-when faint">${t('lf.fans.ago', { n: Math.max(0, G.t - c.t) })}</span></div>`),
  ];
  const swings = r.swings.slice(0, 6).map((s) => {
    const key = s.k === 'cold' ? 'lf.react.sw.cold' : s.src === 'rival' ? 'lf.react.sw.hotRival' : 'lf.react.sw.hotYou';
    return `<div class="lf-row"><span class="lf-ic" style="--c:${s.k === 'cold' ? 'var(--bug)' : 'var(--hot)'}">${icon(s.k === 'cold' ? 'rain' : 'fire')}</span><span class="lf-tx">${t(key, { name: `<b>${esc(swingName(s))}</b>` })}</span><span class="lf-when faint">${t('lf.fans.ago', { n: Math.max(0, G.t - s.t) })}</span></div>`;
  });
  return `<p class="hint" style="margin:0 0 10px">${icon('info')} ${t('lf.react.help')}</p>
    <div class="rx-cols"><section><h4 class="mg-h">${icon('gamepad')}${t('lf.react.genre')}</h4>${r.genre.map(trendRow).join('')}</section>
      <section><h4 class="mg-h">${icon('bulb')}${t('lf.react.topic')}</h4>${r.topic.map(trendRow).join('')}</section></div>
    <h4 class="mg-h" style="margin-top:18px" data-tip="${esc(t('lf.react.cloneTip'))}">${icon('crown')}${t('lf.react.clones')}</h4>${clones.length ? `<div class="lf-list">${clones.join('')}</div>` : `<p class="hint">${t('lf.react.cloneEmpty')}</p>`}
    <h4 class="mg-h" style="margin-top:18px">${icon('trend')}${t('lf.react.swings')}</h4>${swings.length ? `<div class="lf-list">${swings.join('')}</div>` : `<p class="hint">${t('lf.react.swEmpty')}</p>`}`;
}

const TABS = [
  ['chron', 'lf.tab.chron', 'book'],
  ['folk', 'lf.tab.folk', 'heart'],
  ['fans', 'lf.tab.fans', 'user'],
  ['mag', 'lf.tab.mag', 'book'],
  ['hist', 'lf.tab.hist', 'trophy'],
  ['react', 'lf.tab.react', 'globe'],
];
regWin({
  id: 'life',
  icon: 'heart',
  color: 'var(--fans)',
  size: 'xl',
  title: () => t('lf.title'),
  sub: (G) => t('lf.sub', { n: G.staff.length, m: G.staff.length ? Math.round(G.staff.reduce((a, s) => a + s.mood, 0) / G.staff.length) : 0 }),
  headExtra: () => `<div class="tabs">${TABS.map(([id, key, ic]) => `<button class="tab ${LS.tab === id ? 'on' : ''}" data-act="lf-tab" data-id="${id}">${icon(ic)}${t(key)}</button>`).join('')}</div>`,
  onOpen(G, arg) {
    if (arg && arg.tab && TABS.some((x) => x[0] === arg.tab)) LS.tab = arg.tab;
  },
  render(G) {
    return LS.tab === 'folk' ? folkTab(G) : LS.tab === 'fans' ? fansTab(G) : LS.tab === 'mag' ? magTab(G) : LS.tab === 'hist' ? histTab(G) : LS.tab === 'react' ? reactTab(G) : chronTab(G);
  },
});
act('lf-tab', (el) => {
  LS.tab = el.dataset.id;
  UI.refresh();
});
act('lf-issue', (el) => {
  LS.issue = +el.dataset.id;
  UI.refresh();
});
act('lf-area', (el) => {
  LS.area = el.dataset.id;
  UI.refresh();
});
