import { icon, t, L, UI, act, regWin, money, toast, bar } from './core.js';
import { buildingPreview, eraOf } from '../render/building.js';
import { FACILITIES, FAC_IDS, FAC_MAX, OFFICE_AVG_N, facLevel, facCost, facCount, tierOf, nextTier, officeReqs, canUpgradeOffice, upgradeOffice, buildFacility, rentOf, facUpkeep } from '../sim/studio.js';
import { RESEARCH } from '../data/research.js';
import { yearOf } from '../sim/const.js';
import { fmtNum, fmtScore } from '../core/util.js';

const FIC = { coffee: 'coffee', lab: 'flask', qa: 'bug', training: 'book', gameroom: 'gamepad', marketing: 'megaphone', server: 'cpu' };
const FCOL = { coffee: '#ffb070', lab: '#c49bff', qa: '#ff6b5c', training: '#6cc8ff', gameroom: '#ff86b4', marketing: '#ffd66a', server: '#4de1d0' };

// ── Krav för nästa kontor ────────────────────────────────────────
// id -> [ikon, rubrik, förklaring]
const REQ = {
  games: ['gamepad', 'studio.req.games', 'studio.why.games'],
  staff: ['team', 'studio.req.staff', 'studio.why.staff'],
  avg: ['star', 'studio.req.avg', 'studio.why.avg'],
  fans: ['heart', 'studio.req.fans', 'studio.why.fans'],
  year: ['calendar', 'studio.req.year', 'studio.why.year'],
  money: ['money', 'studio.req.money', 'studio.why.money'],
};
function reqValue(r) {
  switch (r.id) {
    case 'money': return `${money(Math.max(0, r.have))} / ${money(r.need)}`;
    case 'fans': return `${fmtNum(r.have)} / ${fmtNum(r.need)}`;
    case 'avg': return `${fmtScore(r.have)} / ${fmtScore(r.need)}`;
    default: return `${r.have} / ${r.need}`;
  }
}
// Stapelns fyllnad: hur nära kravet man är (året räknas som de senaste fem åren fram till kravet).
function reqPct(r) {
  if (r.ok) return 100;
  if (r.id === 'year') return ((r.have - (r.need - 5)) / 5) * 100;
  return r.need > 0 ? (Math.max(0, r.have) / r.need) * 100 : 100;
}
function reqRow(r) {
  const [ic, label, why] = REQ[r.id];
  return `<div class="rq ${r.ok ? 'ok' : ''}" data-tip="${t(why)}">
    <div class="rq-r"><span class="rq-i">${icon(r.ok ? 'check' : ic)}</span><span class="rq-n">${t(label, { n: OFFICE_AVG_N })}</span><span class="sp"></span><b class="rq-v num">${reqValue(r)}</b></div>
    ${bar(reqPct(r), r.ok ? 'var(--good)' : 'var(--warn)', 'thin')}
  </div>`;
}
function reqBlock(G, nx) {
  const reqs = officeReqs(G, nx);
  const left = reqs.filter((r) => !r.ok).length;
  return `<div class="reqs">
    <div class="row"><span class="lbl">${t('studio.reqTitle')}</span><span class="sp"></span><span class="tag" style="--c:${left ? 'var(--warn)' : 'var(--good)'}">${left ? t('studio.reqLeft', { n: left }) : t('studio.reqDone')}</span></div>
    ${reqs.map(reqRow).join('')}
  </div>`;
}

function facCard(G, id) {
  const f = FACILITIES[id];
  const lvl = facLevel(G, id);
  const unlocked = G.u.facs.includes(id);
  const cost = facCost(G, id);
  const slotFull = lvl === 0 && facCount(G) >= tierOf(G).slots;
  let btn;
  if (!unlocked) {
    const r = RESEARCH.find((x) => (x.unlock.facs || []).includes(id));
    btn = `<div class="hint">${icon('lock')} ${t('studio.needRes', { name: r ? `<b>${L(r.name)}</b>` : '?' })}</div>`;
  } else if (lvl >= FAC_MAX) btn = `<span class="tag" style="--c:var(--good)">${t('studio.max')}</span>`;
  else if (slotFull) btn = `<div class="hint">${icon('building')} ${t('studio.noSlot')}</div>`;
  else btn = `<button class="btn ${lvl === 0 ? 'primary' : ''}" data-act="st-fac" data-id="${id}" ${G.money < cost ? 'disabled' : ''}>${icon(lvl === 0 ? 'hammer' : 'arrow')}${lvl === 0 ? t('studio.build') : t('studio.upgrade')} · ${money(cost)}</button>`;
  return `<div class="card fac ${unlocked ? '' : 'lockd'}" style="--c:${FCOL[id]}">
    <div class="row" style="gap:12px;align-items:flex-start"><div class="fi">${icon(FIC[id])}</div>
      <div style="flex:1;min-width:0"><div class="row"><b class="h3">${L(f.name)}</b><span class="sp"></span><span class="pips" style="--c:${FCOL[id]}">${[1, 2, 3].map((i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="hint" style="margin-top:3px">${L(f.desc)}</div></div></div>
    <div class="fe">${icon('sparkle')}${L(f.eff)}</div>
    <div class="row" style="margin-top:10px">${btn}</div>
  </div>`;
}

regWin({
  id: 'studio',
  icon: 'building',
  color: 'var(--gold)',
  size: 'xl',
  title: () => t('studio.title'),
  sub: (G) => {
    const nx = nextTier(G);
    const left = nx ? officeReqs(G, nx).filter((r) => !r.ok).length : 0;
    const goal = nx ? ` · ${left ? t('studio.subLeft', { n: left }) : t('studio.subReady')}` : '';
    return `${L(tierOf(G).name)} · ${t('studio.slots')} ${facCount(G)}/${tierOf(G).slots} · ${t('studio.upkeep')} ${money(rentOf(G) + facUpkeep(G))}${t('ui.perMonth')}${goal}`;
  },
  render(G) {
    const tier = tierOf(G);
    const nx = nextTier(G);
    const era = eraOf(yearOf(G.t));
    const up = canUpgradeOffice(G);
    return `
      <div class="grid" style="grid-template-columns:minmax(280px,1fr) 1.4fr;gap:20px;align-items:start">
        <div class="col">
          <div class="card" style="padding:0;overflow:hidden">
            <div class="bprev"><img src="${buildingPreview(G.office.tier, G.studio, era, G.office.fac, 2)}" alt="" draggable="false"></div>
            <div style="padding:14px 16px"><div class="lbl">${t('studio.current')}</div><div class="h2" style="margin:4px 0">${L(tier.name)}</div><div class="hint">${L(tier.desc)}</div>
              <div class="row wrap" style="gap:6px;margin-top:10px"><span class="chip">${icon('team')}${tier.desks} ${t('staff.desks')}</span><span class="chip">${icon('building')}${tier.slots} ${t('studio.slotsW')}</span><span class="chip">${icon('money')}${money(rentOf(G))}${t('ui.perMonth')}</span></div></div>
          </div>
          ${nx ? `<div class="card" style="padding:0;overflow:hidden">
            <div class="bprev dim"><img src="${buildingPreview(nx.id, G.studio, era, {}, 2)}" alt="" draggable="false"></div>
            <div style="padding:14px 16px"><div class="lbl">${t('studio.next')}</div><div class="h3" style="margin:4px 0">${L(nx.name)}</div><div class="hint">${L(nx.desc)}</div>
              <div class="row wrap" style="gap:6px;margin:10px 0"><span class="chip">${icon('team')}${nx.desks}</span><span class="chip">${icon('building')}${nx.slots}</span><span class="chip">${icon('money')}${money(nx.rent)}${t('ui.perMonth')}</span></div>
              ${reqBlock(G, nx)}
              <button class="btn gold block lg" data-act="st-up" ${up === true ? '' : 'disabled'}>${icon('hammer')}${t('studio.expand')} · ${money(nx.cost)}</button>
              <div class="hint" style="margin-top:8px;text-align:center">${up === true ? t('studio.reqReady') : t('studio.reqBlocked')}</div></div>
          </div>` : `<div class="card"><div class="empty">${icon('crown')}<div>${t('studio.top')}</div></div></div>`}
        </div>
        <div><div class="lbl" style="margin-bottom:10px">${t('studio.facilities')}</div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(270px,1fr))">${FAC_IDS.map((id) => facCard(G, id)).join('')}</div></div>
      </div>`;
  },
});

act('st-up', () => {
  const G = UI.app.G;
  if (upgradeOffice(G)) {
    toast(t('toast.office', { name: `<b>${L(tierOf(G).name)}</b>` }), 'good', 7000);
    UI.close(true);
  }
});
act('st-fac', (el) => {
  const G = UI.app.G;
  const r = buildFacility(G, el.dataset.id);
  if (r !== true) toast(String(r), 'bad');
  else toast(t('toast.facility', { name: `<b>${L(FACILITIES[el.dataset.id].name)}</b>`, lvl: facLevel(G, el.dataset.id) }), 'good');
  UI.refresh();
});
