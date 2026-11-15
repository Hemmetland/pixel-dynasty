import { esc, icon, t, L, UI, act, regWin, bar, money } from './core.js';
import { overviewRows, overviewSummary, overviewTodo, nextSteps, AREA } from '../sim/overview.js';
import { outCount, seatCap } from '../sim/studio.js';
import { acqPrice } from '../sim/acquire.js';
import { OPS_MIN, STABLE_MIN } from '../sim/group.js';
import { showTeams } from './win-staff.js';
import { showEngines, showPublish } from './win-work.js';

const TAG = { auto: 'var(--good)', idle: 'var(--warn)', locked: 'var(--faint)' };
const IC = 'width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex:none';

// Öppnar rätt fönster (och flik) för ett område
function openArea(id) {
  if (id === 'eng') return showEngines();
  if (id === 'biz') return showPublish();
  if (AREA[id].win === 'staff') return showTeams();
  return UI.open(AREA[id].win);
}

// Styrelsens nästa steg, med samma texter som i Koncern
function boardLine(G, nx) {
  if (!nx) return '';
  const st = nx.act === 'buy'
    ? t('board.st.buy', { studio: esc(nx.c.name), v: money(acqPrice(G, nx.c)) })
    : nx.act === 'integ'
      ? t('board.st.integ', { studio: esc(nx.c.name) })
      : t(`board.st.${nx.why}`, { n: nx.why === 'ops' ? OPS_MIN : STABLE_MIN, v: money(nx.need) });
  return `<div class="faint" style="font-size:12px;margin-top:4px">${st}</div>`;
}

function rowHTML(G, r) {
  const name = t('ov.a.' + r.id);
  if (r.state === 'locked') {
    const need = r.need ? t('ov.need', { name: esc(L(r.need.name)), y: r.need.year }) : t('ov.needNone');
    return `<div class="card row" style="gap:12px;opacity:.7"><div style="${IC};background:rgba(150,172,255,.08);color:var(--faint)">${icon('lock')}</div>
      <div style="flex:1;min-width:0"><div class="row wrap" style="gap:8px"><b>${name}</b><span class="tag" style="--c:${TAG.locked}">${t('ov.s.locked')}</span></div>
      <div class="faint" style="font-size:12px;margin-top:2px">${t('ov.d.' + r.id)}</div><div class="faint" style="font-size:12.5px;margin-top:4px">${need}</div></div></div>`;
  }
  const pct = r.eff === null ? null : Math.round(r.eff * 100);
  const col = r.state === 'auto' ? 'var(--accent)' : 'var(--warn)';
  const effTag = pct === null ? '' : `<span class="tag" style="--c:${pct >= 60 ? 'var(--good)' : pct >= 30 ? 'var(--warn)' : 'var(--bug)'}" data-tip="${esc(t('tm.ops.effTip'))}">${t('tm.ops.eff', { n: pct })}</span>`;
  return `<div class="card row" style="gap:12px"><div style="${IC};background:rgba(77,225,208,.14);color:${col}">${icon(r.ic)}</div>
    <div style="flex:1;min-width:0"><div class="row wrap" style="gap:8px"><b>${name}</b><span class="tag" style="--c:${TAG[r.state]}">${t(r.state === 'auto' ? 'ov.s.auto' : 'ov.s.idle')}</span>${effTag}</div>
      <div class="faint" style="font-size:12px;margin-top:2px">${t('ov.d.' + r.id)}</div>
      <div style="margin-top:4px">${t(r.line[0], r.line[1] && r.line[1].name ? { ...r.line[1], name: esc(r.line[1].name) } : r.line[1])}</div>
      ${r.id === 'board' && r.state === 'auto' ? boardLine(G, r.next) : ''}
      ${pct === null ? '' : `<div style="margin-top:6px">${bar(pct, pct >= 60 ? 'var(--good)' : pct >= 30 ? 'var(--warn)' : 'var(--bug)')}</div>`}</div>
    <button class="btn sm" data-act="ov-open" data-id="${r.id}">${t('ov.open')}</button></div>`;
}

regWin({
  id: 'overview',
  icon: 'sliders',
  color: 'var(--accent)',
  size: 'lg',
  title: () => t('ov.title'),
  onOpen: (G) => {
    if (G) G.flags.overviewSeen = 1; // handledningen har visat var översikten finns
  },
  render(G) {
    const rows = overviewRows(G);
    const sum = overviewSummary(G);
    const open = rows.filter((r) => r.state !== 'locked');
    const later = rows.filter((r) => r.state === 'locked');
    const todo = overviewTodo(G);
    const head = `<div class="card" style="margin-bottom:14px"><div class="row wrap" style="gap:10px">
        <div class="disp" style="font-size:26px;color:var(--accent)">${sum.open ? t('ov.summary', { a: sum.auto, b: sum.open }) : t('ov.summary.none')}</div><span class="sp"></span>
        <button class="btn sm ghost" data-act="guide-open">${icon('book')}${t('ov.guide')}</button></div>
      ${sum.open ? `<div style="margin:8px 0 4px">${bar((sum.auto / sum.open) * 100, 'var(--accent)')}</div>` : ''}
      <div class="faint" style="font-size:12.5px;margin-top:6px">${t('ov.staffLine', { n: sum.staff, t: sum.teams, o: outCount(G), s: seatCap(G) })}</div>
      <p class="hint" style="margin-top:8px">${t('ov.help')}</p></div>`;
    const todoHTML = `<div class="lbl" style="margin:0 0 8px">${t('ov.todo.h')}</div>${
      todo.length
        ? `<div class="col" style="gap:8px;margin-bottom:16px">${todo
            .map((x) => `<div class="card row" style="gap:10px;padding:10px 12px">${icon('bell')}<span style="flex:1;min-width:0">${t(x.k, x.p)}</span><button class="btn sm ghost" data-act="ov-go" data-win="${x.win}">${t('ov.open')}</button></div>`)
            .join('')}</div>`
        : `<p class="hint" style="margin-bottom:16px">${icon('check')} ${t('ov.todo.none')}</p>`
    }`;
    return `${head}${todoHTML}<div class="col" style="gap:10px">${open.map((r) => rowHTML(G, r)).join('')}</div>
      ${later.length ? `<div class="lbl" style="margin:18px 0 8px">${t('ov.later')}</div><div class="col" style="gap:8px">${later.map((r) => rowHTML(G, r)).join('')}</div>` : ''}`;
  },
});
act('ov-open', (el) => openArea(el.dataset.id));
act('ov-go', (el) => UI.open(el.dataset.win));
act('guide-open', () => UI.open('guide'));

// ── Handledning: nästa steg för just din studio, hur man spelar, vanliga ord ──
const STEPS6 = [
  ['guide.s1.h', 'guide.s1.b', 'plus'],
  ['guide.s2.h', 'guide.s2.b', 'gamepad'],
  ['guide.s3.h', 'guide.s3.b', 'star'],
  ['guide.s4.h', 'guide.s4.b', 'flask'],
  ['guide.s5.h', 'guide.s5.b', 'building'],
  ['guide.s6.h', 'guide.s6.b', 'sliders'],
];
const WORDS = ['hype', 'score', 'focus', 'tech', 'rutin', 'eff', 'reserve', 'seats'];
const TIPS = ['guide.tip.1', 'guide.tip.2', 'guide.tip.3', 'guide.tip.4'];

regWin({
  id: 'guide',
  icon: 'book',
  color: 'var(--design)',
  size: 'lg',
  title: () => t('guide.title'),
  render(G) {
    const next = G ? nextSteps(G) : [];
    const nextHTML = next.length
      ? next
          .map(
            (s) => `<div class="card row" style="gap:12px"><div style="${IC};background:rgba(108,200,255,.14);color:var(--design)">${icon(s.ic)}</div>
          <div style="flex:1;min-width:0"><b>${t('guide.next.' + s.id + '.h')}</b><div class="faint" style="font-size:12.5px;margin-top:2px">${t('guide.next.' + s.id + '.b')}</div></div>
          ${s.win ? `<button class="btn sm" data-act="ov-go" data-win="${s.win}">${t('guide.go')}</button>` : ''}</div>`,
          )
          .join('')
      : `<p class="hint">${icon('check')} ${t('guide.next.none')}</p>`;
    const how = STEPS6.map(
      ([hk, bk, ic], i) => `<div class="card" style="padding:12px 14px"><div class="row" style="gap:10px"><span class="disp" style="font-size:22px;color:var(--design);min-width:20px">${i + 1}</span>${icon(ic)}<b>${t(hk)}</b></div>
        <div class="faint" style="font-size:12.5px;margin-top:6px">${t(bk)}</div></div>`,
    ).join('');
    const words = WORDS.map((w) => `<div class="card" style="padding:10px 12px"><b>${t('guide.w.' + w + '.h')}</b><div class="faint" style="font-size:12.5px;margin-top:4px">${t('guide.w.' + w + '.b')}</div></div>`).join('');
    const grid = (inner) => `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px">${inner}</div>`;
    return `<p class="hint" style="margin-bottom:14px">${t('guide.intro')}</p>
      <div class="lbl" style="margin:0 0 8px">${t('guide.next.h')}</div><div class="col" style="gap:8px;margin-bottom:18px">${nextHTML}</div>
      <div class="lbl" style="margin:0 0 8px">${t('guide.how.h')}</div>${grid(how)}
      <div class="lbl" style="margin:18px 0 8px">${t('guide.words.h')}</div>${grid(words)}
      <div class="lbl" style="margin:18px 0 8px">${t('guide.tips.h')}</div><div class="col" style="gap:6px">${TIPS.map((k) => `<div class="row" style="gap:8px;align-items:flex-start">${icon('info')}<span>${t(k)}</span></div>`).join('')}</div>`;
  },
});
