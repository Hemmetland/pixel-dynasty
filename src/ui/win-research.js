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
const R = { cat: 'all', only: false };
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

function nodeHTML(G, r, L_) {
  const st = researchStatus(G, r.id);
  const p = L_.pos[r.id];
  const cat = RESEARCH_CATS.find((c) => c.id === r.cat);
  const act_ = G.research.active.find((a) => a.id === r.id);
  const can = st === 'available' ? canResearch(G, r.id) : st;
  const dim = R.cat !== 'all' && R.cat !== r.cat;
  const hide = R.only && st !== 'available';
  const ic = hasGlyph(r.glyph) ? glyphImg(r.glyph, cat.color, 16, false) : icon(CAT_ICON[r.cat]);
  const missing = r.req.filter((q) => !G.research.done.includes(q)).map((q) => L(RES[q].name)).join(', ');
  const tip = `<b>${L(r.name)}</b><br>${L(r.desc)}${st === 'locked' ? `<br><span style='color:var(--warn)'>${t('res.needs')}: ${esc(missing)}</span>` : ''}${st === 'future' ? `<br><span style='color:var(--warn)'>${t('res.from', { y: r.year })}</span>` : ''}`;
  let foot = '';
  if (st === 'done') foot = `<span class="done-tag">${icon('check')}${t('res.done')}</span>`;
  else if (st === 'active') foot = `<div style="flex:1">${bar((act_.progress / act_.total) * 100, 'var(--rp)', 'thin')}</div><span class="faint num" style="font-size:11px">${Math.ceil((act_.total - act_.progress) / TICKS_PER_WEEK)}${t('ui.weeksShort')}</span>`;
  else if (st === 'future') foot = `<span class="faint" style="font-size:11.5px">${icon('calendar')} ${t('res.from', { y: r.year })}</span>`;
  else foot = `<span class="cost ${G.rp >= r.rp ? '' : 'short'}" style="--c:var(--rp)">${icon('flask')}${fmtNum(r.rp)}</span>${r.money ? `<span class="cost ${G.money >= r.money ? '' : 'short'}" style="--c:var(--money)">${icon('money')}${money(r.money)}</span>` : ''}<span class="faint num" style="font-size:11px;margin-left:auto">${r.weeks}${t('ui.weeksShort')}</span>`;
  return `<button class="rn st-${st} ${can === true ? 'go' : ''} ${dim ? 'dim' : ''} ${hide ? 'hide' : ''}" style="left:${p.x}px;top:${p.y}px;--c:${cat.color}" data-act="r-start" data-id="${r.id}" data-tip="${esc(tip)}">
    <div class="rn-h"><span class="rn-i">${ic}</span><b>${L(r.name)}</b>${st === 'locked' ? icon('lock') : ''}</div>
    <div class="rn-f">${foot}</div></button>`;
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
    return `
      <div class="row wrap" style="gap:10px;margin-bottom:14px">${active || `<div class="hint" style="flex:1">${icon('info')} ${t('res.idle')}</div>`}</div>
      <div class="row wrap" style="gap:8px;margin-bottom:12px">${chips}<span class="sp"></span>
        <button class="chip btnchip ${R.only ? 'on' : ''}" data-act="r-only">${icon('check')}${t('res.onlyAvail')}</button>
        <span class="chip">${icon('flask')}${done}/${RESEARCH.length}</span></div>
      <div class="rtree" data-keep="tree"><div class="rinner" style="width:${L_.W}px;height:${L_.H}px">
        ${L_.lanes.map((l) => `<div class="lane" style="top:${l.y}px;height:${l.h}px;--c:${l.cat.color}"><span class="ln">${L(l.cat.name)}</span></div>`).join('')}
        <svg class="rlines" width="${L_.W}" height="${L_.H}">${linesHTML(G, L_)}</svg>
        ${RESEARCH.map((r) => nodeHTML(G, r, L_)).join('')}
      </div></div>`;
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
act('r-start', (el) => {
  const G = UI.app.G;
  const id = el.dataset.id;
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
