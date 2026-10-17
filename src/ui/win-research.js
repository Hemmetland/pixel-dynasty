import { esc, icon, t, L, UI, act, regWin, bar, money, toast } from './core.js';
import { sfx } from '../audio/sfx.js';
import { glyphImg, hasGlyph } from '../render/glyphs.js';
import { RESEARCH, RES, RESEARCH_CATS } from '../data/research.js';
import { researchStatus, canResearch, startResearch, rpPerWeek } from '../sim/research.js';
import { researchSlots } from '../sim/studio.js';
import { TICKS_PER_WEEK } from '../sim/const.js';
import { fmtNum } from '../core/util.js';

const NW = 206;
const NH = 78;
const GX = 56;
const GY = 14;
const CAT_ICON = { prod: 'cog', genre: 'gamepad', topic: 'book', tech: 'cpu', biz: 'chart', staff: 'team' };
const R = { cat: 'all', only: false, sel: null };
// Pekskärm: första trycket väljer och visar vad forskningen gör, start kräver knappen (eller ett tryck till)
const touch = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;
// Smal skärm: listvy i stället för det breda trädet
const narrow = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 760px)').matches;
const ORDER = { active: 0, available: 1, locked: 2, future: 3, done: 4 };
let layout = null;

function buildLayout() {
  if (layout) return layout;
  const depth = {};
  const d = (id) => {
    if (depth[id] != null) return depth[id];
    const r = RES[id];
    depth[id] = r.req.length ? 1 + Math.max(...r.req.map(d)) : 0;
    return depth[id];
  };
  RESEARCH.forEach((r) => d(r.id));
  const pos = {};
  let y0 = 0;
  const lanes = [];
  for (const cat of RESEARCH_CATS) {
    const nodes = RESEARCH.filter((r) => r.cat === cat.id);
    const colCount = {};
    const sorted = nodes.slice().sort((a, b) => depth[a.id] - depth[b.id] || a.year - b.year);
    let maxRows = 0;
    for (const n of sorted) {
      const c = depth[n.id];
      const row = colCount[c] || 0;
      colCount[c] = row + 1;
      maxRows = Math.max(maxRows, row + 1);
      pos[n.id] = { x: c * (NW + GX), row, cat: cat.id, y: 0 };
    }
    for (const n of sorted) pos[n.id].y = y0 + 34 + pos[n.id].row * (NH + GY);
    lanes.push({ cat, y: y0, h: 34 + maxRows * (NH + GY) + 10 });
    y0 += 34 + maxRows * (NH + GY) + 22;
  }
  const maxD = Math.max(...Object.values(depth));
  layout = { pos, lanes, W: (maxD + 1) * (NW + GX), H: y0 };
  return layout;
}

function nodeHTML(G, r, L_, list = false) {
  const st = researchStatus(G, r.id);
  const p = L_.pos[r.id];
  const cat = RESEARCH_CATS.find((c) => c.id === r.cat);
  const act_ = G.research.active.find((a) => a.id === r.id);
  const can = st === 'available' ? canResearch(G, r.id) : st;
  const dim = !list && R.cat !== 'all' && R.cat !== r.cat;
  const hide = !list && R.only && st !== 'available';
  const ic = hasGlyph(r.glyph) ? glyphImg(r.glyph, cat.color, 16, false) : icon(CAT_ICON[r.cat]);
  const missing = r.req.filter((q) => !G.research.done.includes(q)).map((q) => L(RES[q].name)).join(', ');
  const tip = `<b>${L(r.name)}</b><br>${L(r.desc)}${st === 'locked' ? `<br><span style='color:var(--warn)'>${t('res.needs')}: ${esc(missing)}</span>` : ''}${st === 'future' ? `<br><span style='color:var(--warn)'>${t('res.from', { y: r.year })}</span>` : ''}`;
  let foot = '';
  if (st === 'done') foot = `<span class="done-tag">${icon('check')}${t('res.done')}</span>`;
  else if (st === 'active') foot = `<div style="flex:1">${bar((act_.progress / act_.total) * 100, 'var(--rp)', 'thin')}</div><span class="faint num" style="font-size:11px">${Math.ceil((act_.total - act_.progress) / TICKS_PER_WEEK)}${t('ui.weeksShort')}</span>`;
  else if (st === 'future') foot = `<span class="faint" style="font-size:11.5px">${icon('calendar')} ${t('res.from', { y: r.year })}</span>`;
  else foot = `<span class="cost ${G.rp >= r.rp ? '' : 'short'}" style="--c:var(--rp)">${icon('flask')}${fmtNum(r.rp)}</span>${r.money ? `<span class="cost ${G.money >= r.money ? '' : 'short'}" style="--c:var(--money)">${icon('money')}${money(r.money)}</span>` : ''}<span class="faint num" style="font-size:11px;margin-left:auto">${r.weeks}${t('ui.weeksShort')}</span>`;
  const pos = list ? '' : `left:${p.x}px;top:${p.y}px;`;
  return `<button class="rn st-${st} ${can === true ? 'go' : ''} ${dim ? 'dim' : ''} ${hide ? 'hide' : ''} ${R.sel === r.id ? 'sel' : ''}" style="${pos}--c:${cat.color}" data-act="r-start" data-id="${r.id}" data-tip="${esc(tip)}">
    <div class="rn-h"><span class="rn-i">${ic}</span><b>${L(r.name)}</b>${st === 'locked' ? icon('lock') : ''}</div>
    <div class="rn-f">${foot}</div></button>`;
}

// Vald forskning: namn, beskrivning, krav, kostnad och startknapp
function detailHTML(G) {
  const r = RES[R.sel];
  if (!r) return '';
  const st = researchStatus(G, r.id);
  const cat = RESEARCH_CATS.find((c) => c.id === r.cat);
  const can = st === 'available' ? canResearch(G, r.id) : st;
  const missing = r.req.filter((q) => !G.research.done.includes(q)).map((q) => L(RES[q].name)).join(', ');
  let note = '';
  if (st === 'locked') note = `<div style="color:var(--warn);font-size:12.5px;margin-top:4px">${icon('lock')} ${t('res.needs')}: ${esc(missing)}</div>`;
  else if (st === 'future') note = `<div style="color:var(--warn);font-size:12.5px;margin-top:4px">${icon('calendar')} ${t('res.from', { y: r.year })}</div>`;
  const cost = `<span class="cost ${G.rp >= r.rp ? '' : 'short'}" style="--c:var(--rp)">${icon('flask')}${fmtNum(r.rp)}</span>${r.money ? `<span class="cost ${G.money >= r.money ? '' : 'short'}" style="--c:var(--money)">${icon('money')}${money(r.money)}</span>` : ''}<span class="faint num" style="font-size:12px">${r.weeks}${t('ui.weeksShort')}</span>`;
  const go =
    st === 'done' ? `<span class="done-tag">${icon('check')}${t('res.done')}</span>`
    : st === 'active' ? `<span class="faint">${t('res.running')}</span>`
    : `<button class="btn sm primary" data-act="r-start" data-id="${r.id}" data-go="1" ${can === true ? '' : 'disabled'}>${icon('flask')}${t('res.start')}</button>`;
  return `<div class="card rdet" style="--c:${cat.color}"><div class="row" style="gap:10px;align-items:flex-start"><div style="flex:1;min-width:0"><b>${L(r.name)}</b><div class="muted" style="font-size:12.5px;line-height:1.4;margin-top:3px">${L(r.desc)}</div>${note}</div><button class="iconbtn" data-act="r-sel" aria-label="${t('ui.close')}">${icon('x')}</button></div>
    <div class="row wrap" style="gap:10px;margin-top:8px;align-items:center">${st === 'done' || st === 'active' ? '' : cost}<span class="sp"></span>${go}</div></div>`;
}

function linesHTML(G, L_) {
  let s = '';
  for (const r of RESEARCH) {
    const to = L_.pos[r.id];
    for (const q of r.req) {
      const fr = L_.pos[q];
      const x1 = fr.x + NW;
      const y1 = fr.y + NH / 2;
      const x2 = to.x;
      const y2 = to.y + NH / 2;
      const mx = (x1 + x2) / 2;
      const done = G.research.done.includes(q);
      const cat = RESEARCH_CATS.find((c) => c.id === r.cat);
      s += `<path d="M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" class="rl ${done ? 'on' : ''}" style="--c:${cat.color}"/>`;
    }
  }
  return s;
}

regWin({
  id: 'research',
  icon: 'flask',
  color: 'var(--rp)',
  size: 'xl',
  title: () => t('res.title'),
  onOpen: () => {
    R.sel = null;
  },
  sub: (G) => `${t('res.rp')}: <b style="color:var(--rp)">${fmtNum(G.rp)}</b> · +${rpPerWeek(G).toFixed(1)}${t('ui.perWeek')} · ${t('res.slots')}: ${G.research.active.length}/${researchSlots(G)}`,
  render(G) {
    const L_ = buildLayout();
    const active = G.research.active
      .map((a) => {
        const r = RES[a.id];
        return `<div class="card row" style="gap:12px;padding:10px 14px;min-width:260px;flex:1"><span class="rn-i" style="--c:var(--rp)">${icon(CAT_ICON[r.cat])}</span><div style="flex:1"><b>${L(r.name)}</b>${bar((a.progress / a.total) * 100, 'var(--rp)', 'thin')}</div><span class="num muted">${Math.ceil((a.total - a.progress) / TICKS_PER_WEEK)}${t('ui.weeksShort')}</span></div>`;
      })
      .join('');
    const chips = [{ id: 'all', name: { sv: 'Alla', en: 'All' }, color: 'var(--text)' }, ...RESEARCH_CATS]
      .map((c) => `<button class="chip btnchip ${R.cat === c.id ? 'on' : ''}" data-act="r-cat" data-id="${c.id}" style="${c.id !== 'all' ? '--c:' + c.color : ''}">${L(c.name)}</button>`)
      .join('');
    const done = G.research.done.length;
    const list = narrow();
    const nodes = list
      ? `<div class="rlist" data-keep="tree">${RESEARCH.filter((r) => R.cat === 'all' || R.cat === r.cat)
          .filter((r) => !R.only || researchStatus(G, r.id) === 'available' || R.sel === r.id)
          .map((r) => [ORDER[researchStatus(G, r.id)] ?? 5, r])
          .sort((a, b) => a[0] - b[0] || a[1].year - b[1].year)
          .map(([, r]) => nodeHTML(G, r, L_, true))
          .join('')}</div>`
      : `<div class="rtree" data-keep="tree"><div class="rinner" style="width:${L_.W}px;height:${L_.H}px">
        ${L_.lanes.map((l) => `<div class="lane" style="top:${l.y}px;height:${l.h}px;--c:${l.cat.color}"><span class="ln">${L(l.cat.name)}</span></div>`).join('')}
        <svg class="rlines" width="${L_.W}" height="${L_.H}">${linesHTML(G, L_)}</svg>
        ${RESEARCH.map((r) => nodeHTML(G, r, L_)).join('')}
      </div></div>`;
    return `
      <div class="row wrap" style="gap:10px;margin-bottom:14px">${active || `<div class="hint" style="flex:1">${icon('info')} ${t('res.idle')}</div>`}</div>
      <div class="row wrap" style="gap:8px;margin-bottom:12px">${chips}<span class="sp"></span>
        <button class="chip btnchip ${R.only ? 'on' : ''}" data-act="r-only">${icon('check')}${t('res.onlyAvail')}</button>
        <span class="chip">${icon('flask')}${done}/${RESEARCH.length}</span></div>
      ${detailHTML(G)}
      ${nodes}`;
  },
});

act('r-cat', (el) => {
  R.cat = el.dataset.id;
  UI.refresh();
});
act('r-only', () => {
  R.only = !R.only;
  UI.refresh();
});
act('r-sel', () => {
  R.sel = null;
  UI.refresh();
});
act('r-start', (el) => {
  const G = UI.app.G;
  const id = el.dataset.id;
  if (!el.dataset.go && touch() && R.sel !== id) {
    R.sel = id;
    UI.refresh();
    return;
  }
  if (touch()) R.sel = id;
  const r = startResearch(G, id);
  if (r === true) {
    sfx.play('research');
    toast(t('toast.resStart', { name: `<b>${L(RES[id].name)}</b>` }), 'research');
  } else if (r === 'rp') toast(t('err.rp'), 'bad');
  else if (r === 'money') toast(t('err.money'), 'bad');
  else if (r === 'slots') toast(t('err.resSlots'), 'bad');
  else if (r === 'future') toast(t('res.from', { y: RES[id].year }), 'bad');
  else if (r === 'locked') toast(t('err.resLocked'), 'bad');
  UI.refresh();
});
