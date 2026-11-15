import { $, esc, icon, t, tn, L, UI, act, regWin, bar, money, toast, errToast } from './core.js';
import { sfx } from '../audio/sfx.js';
import { sceneHTML } from './livescene.js';
import { avatarImg } from '../render/people.js';
import { SPECS, TRAITS, hire, fire, raise, train, canTrain, trainCost, trainWeeks, trainingSlots, trainingNow, skillCap, canHire, SKILLS, payroll, workers, growWeeksLeft, GROW_XP, bestGenres, genreKnow, GX_MAX, GX_STEP } from '../sim/people.js';
import { GENRE, GENRES } from '../data/genres.js';
import { TEAM_SIZE, teamMax, holds, endRole, teamsOf, teamName, membersOf, teamOfStaff, teamsOpen, createTeam, disbandTeam, addMember, removeMember, courseInfo, canTrainTeam, trainTeam, teamAvg, leadOf, setLead } from '../sim/teams.js';
import { capacity, seated, outCount, seatCap, RES_TECH } from '../sim/studio.js';
import { clamp } from '../core/util.js';
import { autoOpen, canMission, eligibleBases, missionQuote, startMission, cancelMission, missionProgress, missionWeeksLeft, samspel, SAMSPEL_MAX, MISSION_KINDS, MISSION_MIN } from '../sim/autoteam.js';
import { opsOpen, opsInfo, opsNeed, canOps, assignOps, RUTIN_MAX } from '../sim/opsteam.js';
import { hwTeamOpen, hwInfo, hwLines, canHwTeam, assignHw, HW_NEED } from '../sim/hwteam.js';
import { resOpen, resInfo, canRes, assignRes, RES_FOCUS, RES_NEED, RES_RP } from '../sim/resteam.js';
import { shopOpen, shopInfo, assignShop, canShop } from '../sim/shopteam.js';
import { engOpen, engInfo, assignEng, canEng, ENG_BONUS } from '../sim/engteam.js';
import { showEngines } from './win-work.js';
import { SHOP_LIFT, SHOP_FEE, SHOP_THEME } from '../sim/store.js';
import { hrOpen, hrPlan, setHrPlan, setWant, hrOpenSeats, hrReserve, HR_MIN } from '../sim/hrdept.js';
import { RCP_MAX, recipeKnow } from '../sim/score.js';
import { HW_TEAM_MT, HW_TEAM_COST, HW_TEAM_TIME } from '../sim/hardware.js';
import { liveGames, TM_DECAY, TM_OUTAGE, TM_COST, TM_RENO } from '../sim/live.js';
import { SCOPES } from '../sim/const.js';
import { dateOf } from '../sim/const.js';

const S = { tab: 'team', trainFor: null, fireFor: null, addFor: null, disbandFor: null, mk: {}, cancelFor: null, pick: null, page: 0, filter: 'all', sort: 'hired', openTeam: null };
// Stora studios: personallistan visas i sidor med filter och sortering, teamlistan som kompakta rader (ett team i taget öppet)
export const PAGE = 24;
export const COMPACT_TEAMS = 6;
const FILTERS = ['all', 'free', 'team', 'out', 'sad'];
const SORTS = ['hired', 'skill', 'mood', 'salary'];
const skillSum = (s) => s.design + s.tech + s.speed + s.research;
const FILTER_FN = {
  all: () => true,
  free: (G, s) => !s.isFounder && !teamOfStaff(G, s.id),
  team: (G, s) => !!teamOfStaff(G, s.id),
  out: (G, s) => !!s.out,
  sad: (G, s) => s.mood < 50,
};
const SORT_FN = {
  hired: null,
  skill: (a, b) => skillSum(b) - skillSum(a),
  mood: (a, b) => a.mood - b.mood,
  salary: (a, b) => b.salary - a.salary,
};
const SK = { design: ['bulb', 'var(--design)'], tech: ['cpu', 'var(--tech)'], speed: ['rocket', 'var(--warn)'], research: ['flask', 'var(--rp)'] };

const skills = (G, s) => {
  const cap = skillCap(G);
  return `<div class="skills">${SKILLS.map((k) => `<div class="sk" style="--c:${SK[k][1]}" data-tip="${t('skill.' + k + '.tip')}"><span class="si">${icon(SK[k][0])}</span><div style="flex:1;min-width:0"><span class="sk-n">${t('skill.' + k)}</span>${bar((s[k] / cap) * 100, SK[k][1], 'thin')}</div><b class="num">${s[k]}</b></div>`).join('')}</div>`;
};
const moodInfo = (m) => (m >= 62 ? ['var(--good)', 'staff.moodHigh'] : m >= 38 ? ['var(--warn)', 'staff.moodMid'] : ['var(--bug)', 'staff.moodLow']);

// Genrekunskap: de genrer en medarbetare (eller ett teams snitt) kan bäst, med stjärnor (1–2 spel en, 3–4 två, 5 tre)
const gxStars = (k) => '★'.repeat(Math.max(1, Math.ceil(k / 2)));
const gxChip = (g, k, tip) => `<span class="chip c" style="--c:${GENRE[g].color}" data-tip="${esc(tip)}">${esc(L(GENRE[g].name))} ${gxStars(k)}</span>`;
const gxRow = (s) => {
  const best = bestGenres(s, 3);
  return best.length ? `<div class="row wrap" style="gap:6px;margin-top:8px"><span class="faint" style="font-size:11.5px">${t('staff.gx')}</span>${best.map(([g, k]) => gxChip(g, k, t('staff.gxTip', { genre: L(GENRE[g].name), n: k, p: Math.round(GX_STEP * GX_MAX * 100) }))).join('')}</div>` : '';
};
const teamGx = (mem) => {
  const best = GENRES.map((ge) => [ge.id, mem.reduce((a, s) => a + genreKnow(s, ge.id), 0) / mem.length]).filter(([, v]) => v >= 0.8).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return best.length ? `<div class="row wrap" style="gap:6px;margin-top:10px"><span class="faint" style="font-size:11.5px">${t('tm.gx')}</span>${best.map(([g, v]) => gxChip(g, v, t('tm.gxTip', { genre: L(GENRE[g].name), n: v.toFixed(1) }))).join('')}</div>` : '';
};

function teamCard(G, s, mentor) {
  const [mc, mt] = moodInfo(s.mood);
  const grp = teamOfStaff(G, s.id);
  const grew = s.growSkill && s.lastGrow != null && G.t - s.lastGrow <= 12 ? `<span class="chip c" style="--c:var(--good)" data-tip="${esc(t('staff.grewTip', { skill: t('skill.' + s.growSkill) }))}">${icon('trend')}${t('staff.grew', { skill: t('skill.' + s.growSkill) })}</span>` : '';
  const expTip = t('staff.expTip', { n: growWeeksLeft(G, s, mentor) }) + (G.job ? '' : ' ' + t('staff.expIdle'));
  const training = s.trainUntil > G.t;
  const spec = SPECS[s.spec];
  const tr = canTrain(G, s);
  const open = S.trainFor === s.id;
  const trait = s.trait ? `<span class="chip" data-tip="${esc(L(TRAITS[s.trait].desc))}">${L(TRAITS[s.trait].name)}</span>` : '';
  const trainBtns = open
    ? `<div class="trainrow">${SKILLS.map((k) => `<button class="btn sm" data-act="s-train" data-id="${s.id}" data-k="${k}" style="--c:${SK[k][1]}">${icon(SK[k][0])}${t('skill.' + k)} <span class="muted">+${3}–${6 + (G.u.flags.training2 ? 2 : 0)}</span></button>`).join('')}<span class="muted num" style="font-size:12px">${money(trainCost(G, s))} · ${trainWeeks(G)} ${t('ui.weeksShort')}</span></div>`
    : '';
  return `<div class="scard card ${S.focus === s.id ? 'sel' : ''}" id="sc-${s.id}">
    <div class="sc-top">
      <div class="sc-av">${avatarImg(s.look, 3, training ? 'stand' : 'stand')}</div>
      <div style="flex:1;min-width:0">
        <div class="row" style="gap:8px"><b class="h3" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</b>${s.isFounder ? `<span class="tag" style="--c:var(--gold)">${t('staff.founder')}</span>` : ''}</div>
        <div class="row wrap" style="gap:6px;margin-top:5px"><span class="chip">${s.isFounder ? t('staff.founderRole') : L(spec.name)}</span>${trait}${grp ? `<span class="chip" data-tip="${esc(t('staff.inTeam', { team: L(teamName(grp)) }))}">${icon('team')}${esc(L(teamName(grp)))}</span>` : ''}${s.out ? `<span class="chip" data-tip="${esc(t('staff.outTip'))}">${icon('building')}${t('staff.out')}</span>` : ''}${grew}${training ? `<span class="chip c" style="--c:var(--rp)">${icon('book')}${t('staff.training')} · ${Math.max(1, s.trainUntil - G.t)}${t('ui.weeksShort')}</span>` : ''}</div>
      </div>
      <div class="sc-mood" style="--c:${mc}" data-tip="${t(mt)}"><span class="md"></span>${Math.round(s.mood)}</div>
    </div>
    ${skills(G, s)}
    <div class="sk-exp" data-tip="${esc(expTip)}"><span class="faint">${t('staff.exp')}</span>${bar(((s.xp || 0) / GROW_XP) * 100, 'var(--good)', 'thin')}</div>
    ${gxRow(s)}
    <div class="faint" style="font-size:11.5px;margin-top:8px">${tn('staff.tenure', s.games, { y: dateOf(s.hired).year })}</div>
    <div class="row" style="margin-top:6px;gap:6px">
      <span class="muted" style="font-size:12px">${s.isFounder ? t('staff.noSalary') : money(s.salary) + t('ui.perMonth')}</span><span class="sp"></span>
      ${G.u.flags.training ? `<button class="btn sm ${open ? 'on' : ''}" data-act="s-trainopen" data-id="${s.id}" ${tr === true ? '' : 'disabled'} data-tip="${tr === true ? t('staff.trainTip') : t('staff.train.' + tr)}">${icon('book')}${t('staff.train')}</button>` : ''}
      ${s.isFounder ? '' : `<button class="btn sm" data-act="s-raise" data-id="${s.id}" data-tip="${t('staff.raiseTip')}">${icon('money')}${t('staff.raise')}</button><button class="btn sm danger" data-act="s-fire" data-id="${s.id}">${S.fireFor === s.id ? t('staff.confirm') : icon('x')}</button>`}
    </div>
    ${trainBtns}
  </div>`;
}

function candCard(G, c) {
  const spec = SPECS[c.spec];
  const can = canHire(G);
  const afford = G.money >= c.fee;
  const trait = c.trait ? `<span class="chip" data-tip="${esc(L(TRAITS[c.trait].desc))}">${L(TRAITS[c.trait].name)}</span>` : '';
  return `<div class="scard card">
    <div class="sc-top"><div class="sc-av">${avatarImg(c.look, 3)}</div>
      <div style="flex:1;min-width:0"><b class="h3">${esc(c.name)}</b><div class="row wrap" style="gap:6px;margin-top:5px"><span class="chip">${L(spec.name)}</span>${trait}</div></div></div>
    ${skills(G, c)}
    <div class="row" style="margin-top:12px;gap:10px"><div><div class="num" style="font:700 20px var(--disp)">${money(c.salary)}<span class="muted" style="font:500 11px var(--font)">${t('ui.perMonth')}</span></div><div class="faint" style="font-size:11px">${t('staff.fee')} ${money(c.fee)}</div></div><span class="sp"></span>
      <button class="btn primary" data-act="s-hire" data-id="${c.id}" ${can && afford ? '' : 'disabled'} data-tip="${can ? (afford ? '' : t('err.money')) : t('err.capacity')}">${icon('plus')}${t('staff.hire')}</button></div>
  </div>`;
}

// ── Team ─────────────────────────────────────────────────────────
function crew(G, team) {
  const mem = membersOf(G, team);
  const info = courseInfo(G, team);
  const ok = canTrainTeam(G, team);
  const onCourse = mem.filter((s) => s.trainGroup === 'T' + team.id && s.trainUntil > G.t);
  const free = G.staff.filter((s) => !teamOfStaff(G, s.id));
  const lead = leadOf(G, team);
  const chips = mem
    .map((s) => `<span class="tm-chip ${s.trainUntil > G.t ? 'away' : ''} ${lead && lead.id === s.id ? 'lead' : ''}"><span class="tm-av">${avatarImg(s.look, 2)}</span><span class="ell">${esc(s.name)}</span><button class="tm-x tm-crown ${lead && lead.id === s.id ? 'on' : ''}" data-act="tm-lead" data-tid="${team.id}" data-id="${s.id}" aria-label="${esc(t('tm.lead'))}" data-tip="${esc(t('tm.lead'))}">${icon('crown')}</button><button class="tm-x" data-act="tm-rm" data-tid="${team.id}" data-id="${s.id}" aria-label="${esc(t('tm.remove'))}" data-tip="${esc(t('tm.remove'))}">${icon('x')}</button></span>`)
    .join('');
  const picker =
    S.addFor === team.id
      ? `<div class="tm-pick">${free.length ? free.slice(0, 12).map((s) => `<button class="tm-chip add" data-act="tm-add" data-tid="${team.id}" data-id="${s.id}"><span class="tm-av">${avatarImg(s.look, 2)}</span><span class="ell">${esc(s.name)}</span>${icon('plus')}</button>`).join('') : `<span class="faint" style="font-size:12px">${t('tm.noFree')}</span>`}</div>`
      : '';
  let course;
  if (onCourse.length) {
    const left = Math.max(1, Math.max(...onCourse.map((s) => s.trainUntil - G.t)));
    course = `<div class="row wrap" style="gap:8px"><span class="chip c" style="--c:var(--rp)">${icon('book')}${t('tm.onCourse', { skill: t('skill.' + onCourse[0].trainSkill), n: left })}</span></div>`;
  } else if (ok === true) {
    course = `<div class="trainrow">${SKILLS.map((k) => `<button class="btn sm" data-act="tm-train" data-tid="${team.id}" data-k="${k}" style="--c:${SK[k][1]}">${icon(SK[k][0])}${t('skill.' + k)} <span class="muted">+${3}–${6 + (G.u.flags.training2 ? 2 : 0)}</span></button>`).join('')}</div>
      <div class="muted num" style="font-size:12px;margin-top:6px">${t('tm.courseInfo', { n: info.ready.length, cost: money(info.cost), save: money(info.alone - info.cost), w: info.weeks })}</div>
      ${info.ready.length < info.mem.length ? `<div class="faint" style="font-size:11.5px;margin-top:3px">${t('tm.someOut', { n: info.mem.length - info.ready.length })}</div>` : ''}`;
  } else course = `<div class="hint" style="margin:0">${icon(ok === 'locked' ? 'lock' : 'info')} ${t('tm.err.' + ok)}</div>`;
  return `<div class="scard card tmcard">
    <div class="row" style="gap:10px;margin-bottom:8px"><span class="rn-i" style="--c:var(--fans)">${icon('team')}</span><div style="flex:1;min-width:0"><b class="h3 ell">${esc(L(teamName(team)))}${team.hr ? ` <span class="tag" style="--c:var(--good)">${t('hr.tag')}</span>` : ''}</b><div class="faint" style="font-size:12px">${t('tm.members', { n: mem.length, m: TEAM_SIZE })}</div></div>
      <button class="btn sm danger" data-act="tm-disband" data-tid="${team.id}" data-tip="${esc(t('tm.disband'))}">${S.disbandFor === team.id ? t('tm.confirm') : icon('x')}</button></div>
    <div class="tm-mem">${chips || `<span class="faint" style="font-size:12px">${t('tm.empty')}</span>`}</div>
    ${mem.length ? `<div class="faint" style="font-size:11.5px;margin-top:6px">${lead ? t('tm.leadIs', { name: esc(lead.name) }) : t('tm.leadNone')}</div>` : ''}
    ${mem.length < TEAM_SIZE ? `<div class="row wrap" style="margin-top:8px;gap:12px"><button class="btn sm ${S.addFor === team.id ? 'on' : ''}" data-act="tm-addopen" data-tid="${team.id}">${icon('plus')}${t('tm.add')}</button>${hrOpen(G) ? `<div class="row" style="gap:6px" data-tip="${esc(t('tm.wantTip'))}"><span class="faint" style="font-size:12px">${t('tm.want')}</span><button class="btn sm" data-act="tm-want" data-tid="${team.id}" data-d="-1">−</button><b class="num" style="min-width:26px;text-align:center">${team.want ? team.want : t('tm.wantOff')}</b><button class="btn sm" data-act="tm-want" data-tid="${team.id}" data-d="1">+</button></div>` : ''}</div>` : ''}${picker}
    ${mem.length ? `<div class="lbl" style="margin:12px 0 0">${t('tm.avg')}</div>${skills(G, teamAvg(G, team))}${teamGx(mem)}` : ''}
    ${roleBlock(G, team)}
    ${team.role === 'ops' ? opsBlock(G, team) : team.role === 'hw' ? hwBlock(G, team) : team.role === 'res' ? resBlock(G, team) : team.role === 'shop' ? shopBlock(G, team) : team.role === 'eng' ? engBlock(G, team) : `<div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--line)"><div class="lbl" style="margin:0 0 6px">${t('tm.course')}</div>${course}</div>${missionBlock(G, team)}`}
  </div>`;
}

// Uppgift: spelutveckling (kurs och egna uppdrag), driftteam för ett levande onlinespel eller produktteam för en hårdvarulinje
function roleBlock(G, team) {
  const showOps = opsOpen(G) || team.role === 'ops';
  const showHw = hwTeamOpen(G) || team.role === 'hw';
  const showRes = resOpen(G) || team.role === 'res';
  const showShop = shopOpen(G) || team.role === 'shop';
  const showEng = engOpen(G) || team.role === 'eng';
  if (!showOps && !showHw && !showRes && !showShop && !showEng) return '';
  const picking = S.pick && S.pick.tid === team.id ? S.pick.kind : null;
  let pick = '';
  if (picking === 'ops') {
    const games = liveGames(G);
    pick = `<div class="lbl" style="margin:10px 0 4px">${t('tm.ops.pick')}</div><div class="tm-mem">${
      games.length
        ? games
            .map((g) => {
              const ok = canOps(G, team, g.id);
              const cur = team.role === 'ops' && team.target === g.id;
              return `<button class="tm-chip add ${cur ? 'on' : ''}" data-act="tm-pickgame" data-tid="${team.id}" data-id="${g.id}" ${ok === true || cur ? '' : 'disabled'} data-tip="${esc(ok === true ? t('tm.ops.needTip') : t('tm.err.' + ok))}"><span class="ell">${esc(g.title)}</span><b class="num">${icon('user')}${opsNeed(G, g)}</b></button>`;
            })
            .join('')
        : `<span class="faint" style="font-size:12px">${t('tm.ops.none')}</span>`
    }</div>`;
  } else if (picking === 'hw') {
    const lines = hwLines(G);
    pick = `<div class="lbl" style="margin:10px 0 4px">${t('tm.hw.pick')}</div><div class="tm-mem">${
      lines.length
        ? lines
            .map((ty) => {
              const ok = canHwTeam(G, team, ty);
              const cur = team.role === 'hw' && team.target === ty;
              return `<button class="tm-chip add ${cur ? 'on' : ''}" data-act="tm-pickline" data-tid="${team.id}" data-k="${ty}" ${ok === true || cur ? '' : 'disabled'} data-tip="${esc(ok === true ? t('tm.hw.needTip') : t('tm.err.' + ok))}"><span class="ell">${t('hw.type.' + ty)}</span><b class="num">${icon('user')}${HW_NEED[ty]}</b></button>`;
            })
            .join('')
        : `<span class="faint" style="font-size:12px">${t('tm.hw.none')}</span>`
    }</div>`;
  }
  else if (picking === 'res') {
    pick = `<div class="lbl" style="margin:10px 0 4px">${t('tm.res.pick')}</div><div class="tm-mem">${RES_FOCUS.map((f) => {
      const ok = canRes(G, team, f);
      const cur = team.role === 'res' && team.target === f;
      return `<button class="tm-chip add ${cur ? 'on' : ''}" data-act="tm-pickres" data-tid="${team.id}" data-k="${f}" ${ok === true || cur ? '' : 'disabled'} data-tip="${esc(ok === true ? t('tm.res.f.' + f + 'Tip') : t('tm.err.' + ok))}"><span class="ell">${t('tm.res.f.' + f)}</span><b class="num">${icon('user')}${RES_NEED[f]}</b></button>`;
    }).join('')}</div>`;
  }
  const none = !holds(team);
  const btn = (k, ic, on, tip, dis = '') => `<button class="btn sm ${on ? 'on' : ''}" data-act="tm-role" data-tid="${team.id}" data-k="${k}" ${dis} ${tip ? `data-tip="${esc(t(tip))}"` : ''}>${icon(ic)}${t('tm.role.' + k)}</button>`;
  return `<div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--line)"><div class="lbl" style="margin:0 0 6px">${t('tm.role')}</div>
    <div class="row wrap" style="gap:6px">${btn('game', 'gamepad', none, '', team.mission && !none ? 'disabled' : '')}${showOps ? btn('ops', 'globe', team.role === 'ops', 'tm.role.opsTip') : ''}${showHw ? btn('hw', 'cpu', team.role === 'hw', 'tm.role.hwTip') : ''}${showRes ? btn('res', 'flask', team.role === 'res', 'tm.role.resTip') : ''}${showShop ? btn('shop', 'cart', team.role === 'shop', 'tm.role.shopTip', team.role !== 'shop' && canShop(G, team) !== true ? 'disabled' : '') : ''}${showEng ? btn('eng', 'cog', team.role === 'eng', 'tm.role.engTip', team.role !== 'eng' && canEng(G, team) !== true ? 'disabled' : '') : ''}</div>${pick}</div>`;
}
// Ett produktteam: vilken linje, hur väl det räcker till och vad det ger
function hwBlock(G, team) {
  const head = `<div class="lbl" style="margin:12px 0 6px">${t('tm.role.hw')}</div>`;
  const inf = hwInfo(G, team);
  if (!inf) return `<div>${head}<div class="hint" style="margin:0">${icon('info')} ${t('tm.err.hwType')}</div></div>`;
  const pct = Math.round(inf.eff * 100);
  const e = inf.eff;
  const gives = t('tm.hw.gives', { a: Math.round(HW_TEAM_MT * e * 100), c: Math.round(HW_TEAM_COST * e * 100), w: Math.round(HW_TEAM_TIME * e * 100) });
  const line = inf.proj ? t('tm.hw.proj', { name: esc(inf.proj.name), state: t('tm.hw.st.' + inf.proj.state) }) : inf.cur ? t('tm.hw.cur', { name: esc(inf.cur.name) }) : t('tm.hw.nocur');
  return `<div>${head}<div class="hint" style="margin:0 0 8px">${t('tm.hw.help')}</div>
    <div class="sf-spot-row on" style="display:block"><div class="row" style="gap:8px"><b class="ell" style="flex:1;min-width:0">${t('tm.hw.on', { line: t('hw.type.' + inf.type) })}</b><span class="tag" style="--c:var(--good)" data-tip="${esc(t('tm.ops.effTip'))}">${t('tm.ops.eff', { n: pct })}</span></div>
      <div style="margin:8px 0 4px">${bar(pct, 'var(--good)')}</div>
      <div class="faint" style="font-size:12px">${line}</div>
      <div class="faint" style="font-size:12px;margin-top:2px">${t('tm.hw.need', { need: inf.need, n: inf.n })}</div>
      <div class="faint" style="font-size:12px;margin-top:2px" data-tip="${esc(t('tm.ops.rutinTip'))}">${t('tm.ops.rutin', { n: inf.rutin, m: RUTIN_MAX })}</div>
      <div class="muted" style="font-size:12px;margin-top:6px">${gives}</div>
      <div class="row" style="margin-top:8px"><span class="sp"></span><button class="btn sm" data-act="tm-endrole" data-tid="${team.id}" data-tip="${esc(t('tm.ops.endTip'))}">${t('tm.hw.end')}</button></div></div>
    ${toggleRow('tm-hwrev', team.id, team.autoRev !== false, t('tm.hw.autorev'), t('tm.hw.autorevHelp'))}
    ${toggleRow('tm-repeat', team.id, !!team.repeat, t('tm.hw.repeat'), t('tm.hw.repeatHelp'))}</div>`;
}
// Ett forskningsteam: inriktning, hur väl det räcker till och vad det ger (teknik: forskningspoäng, recept: receptnivån)
function resBlock(G, team) {
  const head = `<div class="lbl" style="margin:12px 0 6px">${t('tm.role.res')}</div>`;
  const inf = resInfo(G, team);
  if (!inf) return `<div>${head}<div class="hint" style="margin:0">${icon('info')} ${t('tm.err.resFocus')}</div></div>`;
  const pct = Math.round(inf.eff * 100);
  let gives;
  if (inf.focus === 'tech') gives = `<div class="muted" style="font-size:12px;margin-top:6px">${t('tm.res.tech', { n: Math.round(RES_TECH * inf.eff * 100 * 10) / 10 })} ${t('tm.res.rp', { rp: Math.round(inf.rp), more: Math.round(RES_RP * inf.eff * 100) })}</div>`;
  else {
    const lv = inf.level;
    const mark = (n, txt) => `<div class="faint" style="font-size:12px;margin-top:2px;${lv >= n ? 'color:var(--good)' : ''}">${lv >= n ? icon('check') : icon('lock')} ${txt}</div>`;
    const more = Math.max(0, lv - 4);
    gives = `<div style="margin-top:8px">${bar((lv / RCP_MAX) * 100, 'var(--rp)')}<div class="row" style="margin-top:4px"><b>${t('tm.res.level', { n: lv, m: RCP_MAX })}</b></div>
      <div class="faint" style="font-size:12px;margin-top:2px">${lv >= RCP_MAX ? t('tm.res.max') : inf.weeksLeft ? t('tm.res.next', { w: inf.weeksLeft }) : ''}</div>
      <div class="muted" style="font-size:12px;margin-top:2px">${t('tm.res.know', { n: Math.round(recipeKnow(G) * 10) / 10 })}</div>
      <div style="margin-top:6px">${mark(1, t('tm.res.l1'))}${mark(2, t('tm.res.l2'))}${mark(3, t('tm.res.l3'))}${mark(4, t('tm.res.l4'))}${mark(5, t('tm.res.l5') + (more ? ` · ${more}/6` : ''))}</div></div>`;
  }
  return `<div>${head}<div class="hint" style="margin:0 0 8px">${t('tm.res.help')}</div>
    <div class="sf-spot-row on" style="display:block"><div class="row" style="gap:8px"><b class="ell" style="flex:1;min-width:0">${t('tm.res.on.' + inf.focus)}</b><span class="tag" style="--c:var(--good)" data-tip="${esc(t('tm.ops.effTip'))}">${t('tm.ops.eff', { n: pct })}</span></div>
      <div style="margin:8px 0 4px">${bar(pct, 'var(--good)')}</div>
      <div class="faint" style="font-size:12px">${t('tm.res.need', { need: inf.need, n: inf.n })}</div>
      <div class="faint" style="font-size:12px;margin-top:2px" data-tip="${esc(t('tm.ops.rutinTip'))}">${t('tm.ops.rutin', { n: inf.rutin, m: RUTIN_MAX })}</div>
      ${gives}
      <div class="row" style="margin-top:8px"><span class="sp"></span><button class="btn sm" data-act="tm-endrole" data-tid="${team.id}" data-tip="${esc(t('tm.ops.endTip'))}">${t('tm.res.end')}</button></div></div></div>`;
}
// Ett motorteam: hur väl det räcker till och vad det ger (motorerna ställer du in i Uppdrag > Motorer)
function engBlock(G, team) {
  const head = `<div class="lbl" style="margin:12px 0 6px">${t('tm.role.eng')}</div>`;
  const inf = engInfo(G, team);
  const pct = Math.round(inf.eff * 100);
  const gives = t('tm.eng.gives', { a: Math.round(ENG_BONUS * inf.eff * 100), b: inf.eff > 0 ? Math.round((1 / inf.eff) * 10) / 10 : '–' });
  const busy = inf.proj ? `<div class="faint" style="font-size:12px;margin-top:2px">${t('tm.eng.busy', { name: esc(inf.proj.name), n: Math.round(Math.min(1, inf.proj.w / inf.proj.need) * 100) })}</div>` : '';
  return `<div>${head}<div class="hint" style="margin:0 0 8px">${t('tm.eng.help')}</div>
    <div class="sf-spot-row on" style="display:block"><div class="row" style="gap:8px"><b class="ell" style="flex:1;min-width:0">${t('tm.eng.on')}</b><span class="tag" style="--c:var(--good)" data-tip="${esc(t('tm.ops.effTip'))}">${t('tm.ops.eff', { n: pct })}</span></div>
      <div style="margin:8px 0 4px">${bar(pct, 'var(--good)')}</div>
      <div class="faint" style="font-size:12px">${t('tm.eng.need', { need: inf.need, n: inf.n })}</div>
      <div class="faint" style="font-size:12px;margin-top:2px" data-tip="${esc(t('tm.ops.rutinTip'))}">${t('tm.ops.rutin', { n: inf.rutin, m: RUTIN_MAX })}</div>${busy}
      <div class="muted" style="font-size:12px;margin-top:6px">${gives}</div>
      <div class="row wrap" style="margin-top:8px;gap:8px"><button class="btn sm" data-act="tm-engshop">${icon('cog')}${t('tm.eng.open')}</button><span class="sp"></span><button class="btn sm" data-act="tm-endrole" data-tid="${team.id}" data-tip="${esc(t('tm.ops.endTip'))}">${t('tm.eng.end')}</button></div></div></div>`;
}
// Ett butiksteam: hur väl det räcker till och vad det ger (kampanjerna ställer du in i fliken Egen butik)
function shopBlock(G, team) {
  const head = `<div class="lbl" style="margin:12px 0 6px">${t('tm.role.shop')}</div>`;
  const inf = shopInfo(G, team);
  const pct = Math.round(inf.eff * 100);
  const gives = t('tm.shop.gives', { a: Math.round(SHOP_LIFT * inf.eff * 100), b: Math.round(SHOP_FEE * inf.eff * 100), c: Math.round(SHOP_THEME * inf.eff * 100) });
  return `<div>${head}<div class="hint" style="margin:0 0 8px">${t('tm.shop.help')}</div>
    <div class="sf-spot-row on" style="display:block"><div class="row" style="gap:8px"><b class="ell" style="flex:1;min-width:0">${t('tm.shop.on')}</b><span class="tag" style="--c:var(--good)" data-tip="${esc(t('tm.ops.effTip'))}">${t('tm.ops.eff', { n: pct })}</span></div>
      <div style="margin:8px 0 4px">${bar(pct, 'var(--good)')}</div>
      <div class="faint" style="font-size:12px">${t('tm.shop.need', { need: inf.need, n: inf.n })}</div>
      <div class="faint" style="font-size:12px;margin-top:2px" data-tip="${esc(t('tm.ops.rutinTip'))}">${t('tm.ops.rutin', { n: inf.rutin, m: RUTIN_MAX })}</div>
      <div class="muted" style="font-size:12px;margin-top:6px">${gives}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm" data-act="tm-shopstore">${icon('cart')}${t('tm.shop.open')}</button><span class="sp"></span><button class="btn sm" data-act="tm-endrole" data-tid="${team.id}" data-tip="${esc(t('tm.ops.endTip'))}">${t('tm.shop.end')}</button></div></div></div>`;
}
// Ett driftteam: vilket spel, hur väl det räcker till och vad det ger
function opsBlock(G, team) {
  const head = `<div class="lbl" style="margin:12px 0 6px">${t('tm.role.ops')}</div>`;
  const inf = opsInfo(G, team);
  if (!inf) return `<div>${head}<div class="hint" style="margin:0">${icon('info')} ${t('tm.err.opsGame')}</div></div>`;
  const pct = Math.round(inf.eff * 100);
  const gives = t('tm.ops.gives', { a: Math.round(TM_DECAY * inf.eff * 100), b: Math.round(TM_OUTAGE * inf.eff * 100), c: Math.round(TM_COST * inf.eff * 100), d: Math.round(TM_RENO * inf.eff * 100) });
  return `<div>${head}<div class="hint" style="margin:0 0 8px">${t('tm.ops.help')}</div>
    <div class="sf-spot-row on" style="display:block"><div class="row" style="gap:8px"><b class="ell" style="flex:1;min-width:0">${t('tm.ops.on', { title: esc(inf.game.title) })}</b><span class="tag" style="--c:var(--good)" data-tip="${esc(t('tm.ops.effTip'))}">${t('tm.ops.eff', { n: pct })}</span></div>
      <div style="margin:8px 0 4px">${bar(pct, 'var(--good)')}</div>
      <div class="faint" style="font-size:12px">${t('tm.ops.need', { need: inf.need, n: inf.n })}</div>
      <div class="faint" style="font-size:12px;margin-top:2px" data-tip="${esc(t('tm.ops.rutinTip'))}">${t('tm.ops.rutin', { n: inf.rutin, m: RUTIN_MAX })}</div>
      <div class="muted" style="font-size:12px;margin-top:6px">${gives}</div>
      <div class="row" style="margin-top:8px"><span class="sp"></span><button class="btn sm" data-act="tm-endrole" data-tid="${team.id}" ${team.mission ? 'disabled' : ''} data-tip="${esc(t('tm.ops.endTip'))}">${t('tm.ops.end')}</button></div></div>
    ${autoOpen(G) ? toggleRow('tm-repeat', team.id, !!team.repeat, t('tm.ops.repeat'), t('tm.ops.repeatHelp')) : ''}
    ${team.mission ? missionBlock(G, team) : ''}</div>`;
}
// Personalavdelningen: planen (antal spelteam och storlek) och läget
function stepper(act, key, val, label, tip) {
  return `<div class="row" style="gap:6px"><span class="faint" style="font-size:12px" ${tip ? `data-tip="${esc(tip)}"` : ''}>${label}</span><button class="btn sm" data-act="${act}" data-k="${key}" data-d="-1">−</button><b class="num" style="min-width:26px;text-align:center">${val}</b><button class="btn sm" data-act="${act}" data-k="${key}" data-d="1">+</button></div>`;
}
function hrPanel(G) {
  if (!hrOpen(G)) return '';
  const p = hrPlan(G);
  const open = hrOpenSeats(G);
  const desks = capacity(G) - seated(G);
  const cash = G.money >= hrReserve(G);
  const status = !p.teams && !open ? t('hr.off') : open ? t('hr.open', { n: open }) : t('hr.full');
  const warn = open && desks <= 0 ? t('hr.noDesks') : open && !cash ? t('hr.noCash', { v: money(Math.round(hrReserve(G))) }) : '';
  return `<div class="card hrcard" style="padding:12px 14px;margin-bottom:14px">
    <div class="row" style="gap:10px;margin-bottom:6px"><span class="rn-i" style="--c:var(--good)">${icon('team')}</span><div style="flex:1;min-width:0"><b class="h3">${t('hr.title')}</b><div class="faint" style="font-size:12px">${status}</div></div><span class="chip">${icon('team')}${t('hr.hired', { n: p.hired || 0 })}</span></div>
    <div class="hint" style="margin:0 0 8px">${t('hr.help')}</div>
    <div class="row wrap" style="gap:16px">${stepper('hr-plan', 'teams', p.teams, t('hr.teams'), t('hr.teamsTip'))}${stepper('hr-plan', 'size', p.size, t('hr.size'), t('hr.sizeTip', { min: HR_MIN, max: TEAM_SIZE }))}</div>
    ${warn ? `<div class="hint" style="margin:8px 0 0;color:var(--warn)">${icon('info')} ${warn}</div>` : ''}
  </div>`;
}
// Ett kompakt team (stora studios): namn, storlek, uppgift och läge på en rad
function teamRow(G, team) {
  const mem = membersOf(G, team);
  const m = team.mission;
  const what = team.role ? t('tm.role.' + team.role) : m ? t('tm.mis.running', { title: esc(m.J.title) }) : t('tm.idle');
  const want = team.want && team.want > mem.length ? ` / ${team.want}` : '';
  return `<div class="card tmrow" style="padding:10px 12px"><div class="row" style="gap:10px"><span class="rn-i" style="--c:var(--fans)">${icon('team')}</span><div style="flex:1;min-width:0"><b class="ell">${esc(L(teamName(team)))}</b>${team.hr ? ` <span class="tag" style="--c:var(--good)">${t('hr.tag')}</span>` : ''}<div class="faint ell" style="font-size:12px">${what}</div></div>
    <span class="chip">${icon('team')}${mem.length}${want}</span>${m ? `<div style="width:70px">${bar(missionProgress(m) * 100, 'var(--good)', 'thin')}</div>` : ''}<button class="btn sm" data-act="tm-open" data-tid="${team.id}">${t('tm.open')}</button></div></div>`;
}
function groupsView(G) {
  const teams = teamsOf(G);
  const compact = teams.length > COMPACT_TEAMS;
  const MAXT = teamMax(G);
  return `<div class="hint" style="margin-bottom:12px">${icon('info')} ${t('tm.help')}</div>
    ${hrPanel(G)}
    <div class="row wrap" style="gap:8px;margin-bottom:14px">
      ${G.u.flags.training ? `<span class="chip">${icon('book')}${t('staff.trainSlots')} ${trainingNow(G)}/${trainingSlots(G)}</span>` : `<span class="chip faint">${icon('lock')}${t('staff.trainLocked')}</span>`}
      <span class="sp"></span>
      <span class="chip">${icon('team')}${t('tm.count', { n: teams.length, m: MAXT })}</span>
      <button class="btn primary" data-act="tm-new" ${teams.length >= MAXT ? 'disabled' : ''} data-tip="${teams.length >= MAXT ? esc(t('tm.max', { n: MAXT })) : ''}">${icon('plus')}${t('tm.new')}</button>
    </div>
    ${teams.length ? (compact
      ? `<div class="col" style="gap:8px">${teams.map((x) => (S.openTeam === x.id ? `<div class="grid sgrid" style="grid-template-columns:1fr"><div><button class="btn sm" data-act="tm-open" data-tid="${x.id}" style="margin-bottom:8px">${icon('arrow')}${t('tm.close')}</button>${crew(G, x)}</div></div>` : teamRow(G, x))).join('')}</div>`
      : `<div class="grid sgrid">${teams.map((x) => crew(G, x)).join('')}</div>`) : `<div class="hint">${t('tm.none')}</div>`}`;
}

// Uppdrag för ett självgående team: välj sort (och spel), starta, följ framstegen
function toggleRow(act, tid, on, title, help) {
  return `<div class="ltier autoseason ${on ? 'on' : ''}" style="margin-top:8px"><span class="rn-i" style="--c:${on ? 'var(--good)' : 'var(--muted)'}">${icon('refresh')}</span><div style="flex:1;min-width:0"><b>${title}</b><div class="faint" style="font-size:11.5px">${help}</div></div><button class="switch ${on ? 'on' : ''}" data-act="${act}" data-tid="${tid}" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="${esc(title)}"><i></i></button></div>`;
}
function missionBlock(G, team) {
  if (team.role === 'ops' && !team.mission) return '';
  const head = `<div class="lbl" style="margin:0 0 6px">${t('tm.mis')}</div>`;
  if (!autoOpen(G)) return `<div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--line)">${head}<div class="hint" style="margin:0">${icon('lock')} ${t('tm.mis.locked')}</div></div>`;
  const m = team.mission;
  const sp = samspel(team);
  const stats = `<div class="faint" style="font-size:12px;margin-top:8px" data-tip="${esc(t('tm.mis.statsTip'))}">${t('tm.mis.stats', { n: sp, m: SAMSPEL_MAX, g: (team.games || []).length, b: team.best ? team.best.toFixed(1) : '–' })}</div>`;
  const toggles = team.role === 'ops' ? '' : toggleRow('tm-repeat', team.id, !!team.repeat, t('tm.mis.repeat'), t('tm.mis.repeatHelp')) + toggleRow('tm-atrain', team.id, team.autoTrain !== false, t('tm.mis.train'), t('tm.mis.trainHelp'));
  let body;
  if (m) {
    const J = m.J;
    const pct = missionProgress(m) * 100;
    body = `<div class="sf-spot-row on" style="display:block"><div class="row" style="gap:8px"><b class="ell" style="flex:1;min-width:0">${t('tm.mis.running', { title: esc(J.title) })}</b><span class="tag" style="--c:var(--accent)">${t('tm.mis.' + m.kind)}</span></div>
      <div style="margin:8px 0 4px">${bar(pct, 'var(--good)')}</div>
      <div class="faint" style="font-size:12px">${J.phase >= 3 ? t('tm.mis.polish') : t('tm.mis.dev')} · ${t('tm.mis.left', { n: missionWeeksLeft(m) })}</div>
      <div class="row" style="margin-top:8px"><span class="sp"></span><button class="btn sm danger" data-act="tm-cancel" data-tid="${team.id}" data-tip="${esc(t('tm.mis.cancelTip'))}">${S.cancelFor === team.id ? t('tm.confirm') : t('tm.mis.cancel')}</button></div></div>`;
  } else {
    const sel = S.mk[team.id] || {};
    const kinds = MISSION_KINDS.map((k) => {
      const first = eligibleBases(G, k)[0];
      const ok = canMission(G, team, k, first ? first.id : undefined);
      return `<button class="btn sm ${sel.kind === k ? 'on' : ''}" data-act="tm-kind" data-tid="${team.id}" data-k="${k}" ${ok === true ? '' : 'disabled'} data-tip="${esc(ok === true ? t('tm.mis.' + k + 'Tip') : t('tm.err.' + ok))}">${t('tm.mis.' + k)}</button>`;
    }).join('');
    let pickRow = '';
    let go = '';
    if (sel.kind && sel.kind !== 'new') {
      const bases = eligibleBases(G, sel.kind);
      pickRow = `<div class="lbl" style="margin:10px 0 4px">${t('tm.mis.pick')}</div><div class="tm-mem">${bases.map((g) => `<button class="tm-chip add ${sel.base === g.id ? 'on' : ''}" data-act="tm-base" data-tid="${team.id}" data-id="${g.id}"><span class="ell">${esc(g.title)}</span><b class="num">${g.live ? icon('globe') : g.score.toFixed(1)}</b></button>`).join('')}</div>`;
    }
    if (sel.kind && (sel.kind === 'new' || sel.base)) {
      const ok = canMission(G, team, sel.kind, sel.base);
      const q = ok === true ? missionQuote(G, team, sel.kind, sel.base) : null;
      go = `<div class="row wrap" style="gap:10px;margin-top:10px"><button class="btn primary" data-act="tm-start" data-tid="${team.id}" ${ok === true && q ? '' : 'disabled'} data-tip="${ok === true ? (q ? '' : esc(t('tm.err.plan'))) : esc(t('tm.err.' + ok))}">${icon('rocket')}${t('tm.mis.start')}</button>${q ? `<span class="muted num" style="font-size:12px">${t('tm.mis.quote', { cost: money(q.cost), w: q.weeks, scope: L(SCOPES[q.scope].name) })}</span>` : ''}</div>`;
    }
    const small = membersOf(G, team).length < MISSION_MIN ? `<div class="hint" style="margin:8px 0 0">${icon('info')} ${t('tm.err.smallMission')}</div>` : '';
    body = `<div class="hint" style="margin:0 0 8px">${t('tm.mis.help')}</div><div class="row wrap" style="gap:6px">${kinds}</div>${pickRow}${go}${small}`;
  }
  return `<div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--line)">${head}${body}${stats}${toggles}</div>`;
}

// Filtrerad och sorterad personallista och aktuell sida (alla på en sida när studion är liten)
function pageOf(G) {
  let list = G.staff.slice();
  if (list.length <= PAGE) return { list, pages: 1 };
  const f = FILTER_FN[S.filter] || FILTER_FN.all;
  list = list.filter((x) => f(G, x));
  if (SORT_FN[S.sort]) list.sort(SORT_FN[S.sort]);
  else list.reverse();
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  if (S.focus) {
    const i = list.findIndex((x) => x.id === S.focus);
    if (i >= 0) S.page = Math.floor(i / PAGE);
  }
  S.page = clamp(S.page, 0, pages - 1);
  return { list: list.slice(S.page * PAGE, S.page * PAGE + PAGE), pages, total: list.length };
}
function staffBar(G) {
  const cnt = (k) => G.staff.filter((x) => FILTER_FN[k](G, x)).length;
  return `<div class="row wrap" style="gap:6px;margin-bottom:8px">${FILTERS.map((k) => `<button class="btn sm ${S.filter === k ? 'on' : ''}" data-act="s-filter" data-id="${k}">${t('staff.f.' + k)} <b class="num">${cnt(k)}</b></button>`).join('')}</div>
    <div class="row wrap" style="gap:6px;margin-bottom:14px"><span class="faint" style="font-size:12px">${t('staff.sortBy')}</span>${SORTS.map((k) => `<button class="btn sm ${S.sort === k ? 'on' : ''}" data-act="s-sort" data-id="${k}">${t('staff.s.' + k)}</button>`).join('')}</div>`;
}
function pager(G) {
  const { pages, total } = pageOf(G);
  if (pages <= 1) return `<div class="faint" style="text-align:center;margin-top:12px;font-size:12px">${t('staff.shown', { n: total })}</div>`;
  return `<div class="row" style="justify-content:center;gap:10px;margin-top:14px"><button class="btn sm" data-act="s-page" data-id="-1" ${S.page <= 0 ? 'disabled' : ''}>${icon('arrow')}</button><span class="chip">${t('staff.page', { n: S.page + 1, m: pages })}</span><button class="btn sm" data-act="s-page" data-id="1" ${S.page >= pages - 1 ? 'disabled' : ''}>${icon('arrow')}</button></div>`;
}

// Öppnar personalfönstret på fliken Team (från översikten)
export function showTeams() {
  S.tab = 'groups';
  UI.open('staff');
}
regWin({
  id: 'staff',
  icon: 'team',
  color: 'var(--fans)',
  size: 'xl',
  title: () => t('staff.title'),
  sub: (G) => `${seated(G)}/${capacity(G)} ${t('staff.desks')}${seatCap(G) || outCount(G) ? ' · ' + t('staff.seats', { n: outCount(G), m: seatCap(G) }) : ''} · ${t('staff.payroll')} ${money(payroll(G))}${t('ui.perMonth')}`,
  headExtra: (G) => `<div class="tabs"><button class="tab ${S.tab === 'team' ? 'on' : ''}" data-act="s-tab" data-id="team">${icon('user')}${t('staff.tabTeam')}</button>${G && teamsOpen(G) ? `<button class="tab ${S.tab === 'groups' ? 'on' : ''}" data-act="s-tab" data-id="groups">${icon('team')}${t('staff.tabGroups')}</button>` : ''}<button class="tab ${S.tab === 'hire' ? 'on' : ''}" data-act="s-tab" data-id="hire">${icon('plus')}${t('staff.tabHire')}</button></div>`,
  render(G, arg) {
    if (arg && arg.focus) {
      S.tab = 'team';
      S.focus = arg.focus;
      setTimeout(() => $('#sc-' + arg.focus)?.scrollIntoView({ block: 'center' }), 30);
    }
    if (S.tab === 'hire') {
      const d = dateOf(G.t);
      return `<div class="row" style="margin-bottom:14px;gap:12px"><div class="hint" style="flex:1">${icon('info')} ${tn('staff.hireHelp', capacity(G) - seated(G))}</div><span class="chip">${icon('calendar')}${t('staff.refresh', { n: 4 - d.week })}</span></div>
        <div class="grid sgrid">${G.candidates.map((c) => candCard(G, c)).join('')}</div>
        ${seated(G) >= capacity(G) ? `<div class="hint" style="margin-top:14px;color:var(--warn)">${icon('building')} ${t('staff.full')}</div>` : ''}`;
    }
    if (S.tab === 'groups' && teamsOpen(G)) return groupsView(G);
    const trainNow = trainingNow(G);
    const mentor = workers(G).some((w) => w.trait === 'mentor');
    const big = G.staff.length > PAGE;
    return `${sceneHTML('studio', G)}<div class="row wrap" style="gap:8px;margin-bottom:14px">
        <span class="chip">${icon('coffee')}${t('staff.avgMood')} ${Math.round(G.staff.reduce((s, x) => s + x.mood, 0) / G.staff.length)}</span>
        ${G.u.flags.training ? `<span class="chip">${icon('book')}${t('staff.trainSlots')} ${trainNow}/${trainingSlots(G)}</span>` : `<span class="chip faint">${icon('lock')}${t('staff.trainLocked')}</span>`}
      </div>
      ${big ? staffBar(G) : ''}
      <div class="grid sgrid">${pageOf(G).list.map((s) => teamCard(G, s, mentor)).join('')}</div>
      ${big ? pager(G) : ''}`;
  },
  onClose() {
    S.addFor = null;
    S.disbandFor = null;
    S.cancelFor = null;
    S.trainFor = null;
    S.fireFor = null;
    S.pick = null;
    S.focus = null;
  },
});

act('s-tab', (el) => {
  S.tab = el.dataset.id;
  UI.refresh();
});
act('s-hire', (el) => {
  const G = UI.app.G;
  const r = hire(G, +el.dataset.id);
  if (r !== true) errToast(r);
  else sfx.play('coin');
  UI.refresh();
});
act('s-raise', (el) => {
  const G = UI.app.G;
  const s = G.staff.find((x) => x.id === +el.dataset.id);
  raise(G, +el.dataset.id);
  toast(t('toast.raise', { name: `<b>${esc(s.name)}</b>` }), 'good');
  UI.refresh();
});
act('s-fire', (el) => {
  const G = UI.app.G;
  const id = +el.dataset.id;
  if (S.fireFor !== id) {
    S.fireFor = id;
    UI.refresh();
    setTimeout(() => {
      if (S.fireFor === id) {
        S.fireFor = null;
        UI.refresh();
      }
    }, 3000);
    return;
  }
  fire(G, id);
  S.fireFor = null;
  UI.refresh();
});
act('s-trainopen', (el) => {
  const id = +el.dataset.id;
  S.trainFor = S.trainFor === id ? null : id;
  UI.refresh();
});
act('s-train', (el) => {
  const G = UI.app.G;
  const r = train(G, +el.dataset.id, el.dataset.k);
  if (r === true) {
    sfx.play('research');
    S.trainFor = null;
  } else errToast(r);
  UI.refresh();
});

act('s-filter', (el) => {
  S.filter = el.dataset.id;
  S.page = 0;
  UI.refresh();
});
act('s-sort', (el) => {
  S.sort = el.dataset.id;
  S.page = 0;
  UI.refresh();
});
act('s-page', (el) => {
  S.page += +el.dataset.id;
  UI.refresh();
});
act('tm-open', (el) => {
  const id = +el.dataset.tid;
  S.openTeam = S.openTeam === id ? null : id;
  UI.refresh();
});
act('hr-plan', (el) => {
  const G = UI.app.G;
  const p = hrPlan(G);
  const d = +el.dataset.d;
  if (el.dataset.k === 'teams') setHrPlan(G, p.teams + d, p.size);
  else setHrPlan(G, p.teams, p.size + d);
  UI.refresh();
});
act('tm-want', (el) => {
  const G = UI.app.G;
  const team = teamsOf(G).find((x) => x.id === +el.dataset.tid);
  if (!team) return;
  const cur = team.want || 0;
  const d = +el.dataset.d;
  // från av går första steget till minst storleken teamet redan har (och HR_MIN), nedåt från HR_MIN stänger av
  const next = d > 0 ? (cur ? cur + 1 : Math.max(HR_MIN, team.members.length + 1)) : cur <= HR_MIN ? 0 : cur - 1;
  setWant(G, team.id, next);
  UI.refresh();
});
act('tm-new', () => {
  const G = UI.app.G;
  const r = createTeam(G);
  if (typeof r === 'string') errToast(r);
  else {
    S.addFor = r.id;
    sfx.play('coin');
  }
  UI.refresh();
});
act('tm-addopen', (el) => {
  const id = +el.dataset.tid;
  S.addFor = S.addFor === id ? null : id;
  UI.refresh();
});
act('tm-add', (el) => {
  const r = addMember(UI.app.G, +el.dataset.tid, +el.dataset.id);
  if (typeof r === 'string') errToast(r);
  UI.refresh();
});
act('tm-rm', (el) => {
  removeMember(UI.app.G, +el.dataset.tid, +el.dataset.id);
  UI.refresh();
});
act('tm-disband', (el) => {
  const id = +el.dataset.tid;
  if (S.disbandFor !== id) {
    S.disbandFor = id;
    UI.refresh();
    setTimeout(() => {
      if (S.disbandFor === id) {
        S.disbandFor = null;
        UI.refresh();
      }
    }, 3000);
    return;
  }
  disbandTeam(UI.app.G, id);
  S.disbandFor = null;
  UI.refresh();
});
act('tm-train', (el) => {
  const r = trainTeam(UI.app.G, +el.dataset.tid, el.dataset.k);
  if (r === true) sfx.play('research');
  else errToast(r);
  UI.refresh();
});

act('tm-kind', (el) => {
  const tid = +el.dataset.tid;
  const k = el.dataset.k;
  const cur = S.mk[tid] || {};
  S.mk[tid] = cur.kind === k ? {} : { kind: k, base: null };
  UI.refresh();
});
act('tm-base', (el) => {
  const tid = +el.dataset.tid;
  const cur = S.mk[tid] || {};
  S.mk[tid] = { ...cur, base: cur.base === +el.dataset.id ? null : +el.dataset.id };
  UI.refresh();
});
act('tm-start', (el) => {
  const tid = +el.dataset.tid;
  const sel = S.mk[tid] || {};
  const r = startMission(UI.app.G, tid, sel.kind, sel.base);
  if (r === true) {
    sfx.play('research');
    S.mk[tid] = {};
  } else errToast(r);
  UI.refresh();
});
act('tm-cancel', (el) => {
  const tid = +el.dataset.tid;
  if (S.cancelFor !== tid) {
    S.cancelFor = tid;
    UI.refresh();
    setTimeout(() => {
      if (S.cancelFor === tid) {
        S.cancelFor = null;
        UI.refresh();
      }
    }, 3000);
    return;
  }
  cancelMission(UI.app.G, tid);
  S.cancelFor = null;
  UI.refresh();
});
act('tm-repeat', (el) => {
  const team = UI.app.G.teams.find((x) => x.id === +el.dataset.tid);
  if (team) team.repeat = !team.repeat;
  UI.refresh();
});
act('tm-atrain', (el) => {
  const team = UI.app.G.teams.find((x) => x.id === +el.dataset.tid);
  if (team) team.autoTrain = team.autoTrain === false;
  UI.refresh();
});

act('tm-role', (el) => {
  const G = UI.app.G;
  const tid = +el.dataset.tid;
  const team = G.teams.find((x) => x.id === tid);
  if (!team) return;
  const k = el.dataset.k;
  if (k === 'game') {
    if (holds(team)) {
      const r = endRole(G, tid);
      if (typeof r === 'string') errToast(r);
    }
    S.pick = null;
  } else if (k === 'shop') {
    // butiksteamet har ingen lista att välja ur: ett klick räcker
    const r = team.role === 'shop' ? true : assignShop(G, tid);
    if (r === true) {
      if (team.role === 'shop') sfx.play('research');
    } else errToast(r);
    S.pick = null;
  } else if (k === 'eng') {
    // motorteamet har ingen lista att välja ur: ett klick räcker
    const r = team.role === 'eng' ? true : assignEng(G, tid);
    if (r === true) {
      if (team.role === 'eng') sfx.play('research');
    } else errToast(r);
    S.pick = null;
  } else S.pick = S.pick && S.pick.tid === tid && S.pick.kind === k ? null : { tid, kind: k };
  UI.refresh();
});
act('tm-shopstore', () => {
  UI.open('store');
});
act('tm-engshop', () => showEngines());
act('tm-pickgame', (el) => {
  const r = assignOps(UI.app.G, +el.dataset.tid, +el.dataset.id);
  if (r === true) {
    sfx.play('research');
    S.pick = null;
  } else errToast(r);
  UI.refresh();
});
act('tm-pickline', (el) => {
  const r = assignHw(UI.app.G, +el.dataset.tid, el.dataset.k);
  if (r === true) {
    sfx.play('research');
    S.pick = null;
  } else errToast(r);
  UI.refresh();
});
act('tm-pickres', (el) => {
  const r = assignRes(UI.app.G, +el.dataset.tid, el.dataset.k);
  if (r === true) {
    sfx.play('research');
    S.pick = null;
  } else errToast(r);
  UI.refresh();
});
act('tm-endrole', (el) => {
  const r = endRole(UI.app.G, +el.dataset.tid);
  if (typeof r === 'string') errToast(r);
  UI.refresh();
});
act('tm-hwrev', (el) => {
  const team = UI.app.G.teams.find((x) => x.id === +el.dataset.tid);
  if (team) team.autoRev = team.autoRev === false;
  UI.refresh();
});

act('tm-lead', (el) => {
  setLead(UI.app.G, +el.dataset.tid, +el.dataset.id);
  UI.refresh();
});
