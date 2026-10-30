import { esc, icon, t, tn, L, UI, act, regWin, bar, money, errToast } from './core.js';
import { GENRE } from '../data/genres.js';
import { TOPIC } from '../data/topics.js';
import { pixIcon } from './icons.js';
import { sfx } from '../audio/sfx.js';
import { fmtNum } from '../core/util.js';
import { lang } from '../core/i18n.js';
import { yearOf, yfOf, WEEKS_PER_YEAR } from '../sim/const.js';
import { HW_TYPES, HW_CLASSES, HW_QUALITY, HW_ARCH, HW_PARTNERS, HW_PARTNER, PLAT_FEES } from '../data/hardware.js';
import {
  canHw, LAB_MAX, labSlots, labCost, labRent, upgradeLab, chiefPerf, chiefRisk, chiefRating, chiefCandidates, setChief, recallChief,
  openTypes, partnerOpen, relOf, partnerCap, cryptoOn, chipsOn, hasArch, designCost, protoCost, designWeeks, protoRisk, designPerf, baseCompat,
  defectOf, canDesign, startDesign, pauseDesign, cancelDesign, resolveProto, hwName, draftOf, scoreOf, unitCost, suggestPrice, priceSteps,
  stepPrice, weeklyDemand, suggestPartner, orderOptions, orderCost, orderMore, marketSize, launch, setPrice, setAuto, setPartner, setDriver, driverCost, discontinue, resolveIssue,
  resolveBench, pipelineOf, productProfit, hwNet, brandOf, RECALL, CLEAR, isPlat, archOpen, partnerFits, minOrder, platOf, supportOf, platRoyalty, setPlatFee,
  ownGames, PER_WEIGHT, drvMax, exclOffers, boughtFor, exclPrice, exclWeeks, canBuyExcl, buyExclusive, BUY_MIN, BUY_GAP, partnerAllowed, exclPartner, exclOf, resolveOffer, resolvePatent, ISSUE_WEEKS, digitalOf, platDigital, PLAT_CUT,
} from '../sim/hardware.js';

// Fönstret Hårdvara: Utveckling (labbet, chefen, designprojekt och nya designer), Produkter (det som tillverkas och
// säljs, med pris, partner, order och beslut) och Partners (tillverkarna och deras läge).
const HS = { tab: 'dev', type: null, cls: 'mid', qual: 'normal', arch: 'std', opt: undefined, pick: false, confirm: null, launch: {}, old: false };
const COL = '#d99a5b';
const pct = (v) => Math.round(v * 100);
const dec = (v, d = 1) => v.toFixed(d).replace('.', lang === 'sv' ? ',' : '.');
const tone = (v) => (v >= 60 ? 'var(--good)' : v >= 35 ? 'var(--warn)' : 'var(--bug)');
const scoreTone = (s) => (s >= 7.5 ? 'var(--good)' : s >= 6 ? 'var(--gold)' : 'var(--bug)');
const G_ = () => UI.app.G;
const tyIcon = (type) => icon(HW_TYPES[type].ic);
// produktens ikon i kortens huvud: pixelkonst 'ui.hw.<typ>' om den finns, annars linjeikonen
const tyPix = (type) => pixIcon(`ui.hw.${type}`, HW_TYPES[type].ic, 32);
// tillverkarna som kan ta produkttypen; de som är låsta av en annan partners ensamrätt visas avstängda
const fitPartners = (G, type) => HW_PARTNERS.filter((p) => partnerOpen(G, p.id) && partnerFits(type, p.id)).map((p) => ({ v: p.id, label: esc(p.name), off: !partnerAllowed(G, type, p.id) }));
const offP = (it) => it.off;
function lockTip(G, type, id) {
  const ex = exclPartner(G, type);
  return ex && ex !== id ? t('hw.exclLock', { partner: esc(HW_PARTNER[ex].name), y: yearOf(exclOf(G, ex).until) }) : partnerTip(G, id);
}

function seg(items, cur, actName, extra = '', tip, dis) {
  return `<div class="seg wrap-seg">${items
    .map((it, i) => `<button class="${cur === it.v ? 'on' : ''}" data-act="${actName}" data-v="${esc(String(it.v))}" ${extra} ${tip ? `data-tip="${esc(tip(it, i))}"` : ''} ${dis && dis(it) ? 'disabled' : ''}>${it.label}</button>`)
    .join('')}</div>`;
}
const stat = (k, v, tip) => `<div class="hw-stat"${tip ? ` data-tip="${esc(tip)}"` : ''}><div class="k">${t(k)}</div><b class="num">${v}</b></div>`;
const tag = (text, c) => `<span class="tag" style="--c:${c}">${text}</span>`;
function confirmRow(kind, id, label, warn) {
  return `<div class="row wrap" style="gap:6px;margin-top:8px"><span class="hint" style="flex:1 1 180px">${warn}</span><button class="btn sm" data-act="hw-yes" data-k="${kind}" data-id="${id}">${label}</button><button class="btn sm ghost" data-act="hw-no">${t('grp.cancel')}</button></div>`;
}
function specTags(P) {
  const tags = [tag(t('hw.cls.' + P.cls), 'var(--accent)')];
  if (P.qual === 'high') tags.push(tag(t('hw.q.high'), 'var(--good)'));
  if (P.arch) tags.push(tag(t('hw.arch.' + P.arch), 'var(--design)'));
  if (P.opt != null) {
    const e = G_().engines.find((x) => x.id === P.opt);
    if (e) tags.push(tag(t('hw.optTag', { name: esc(e.name) }), 'var(--gold)'));
  }
  return tags.join('');
}
const head = (P, right = '') =>
  `<div class="row" style="gap:10px;min-width:0"><span class="hw-ic" style="--c:${HW_TYPES[P.type].color}">${tyPix(P.type)}</span><div style="flex:1;min-width:0"><b class="h3 ell">${esc(P.name)}</b><div class="row wrap" style="gap:5px;margin-top:3px"><span class="faint" style="font-size:12px">${t('hw.type.' + P.type)}</span>${specTags(P)}</div></div>${right}</div>`;

// ── Utveckling ──────────────────────────────────────────────────
function labCtl(G, H) {
  const c = labCost(G);
  const up = H.lab < LAB_MAX
    ? `<button class="btn sm" data-act="hw-lab" ${G.money < c ? 'disabled' : ''} data-tip="${esc(t('hw.labUpTip'))}">${icon('building')}${t('hw.labUp', { v: money(c) })}</button>`
    : `<span class="faint" style="font-size:12px">${t('hw.labMax')}</span>`;
  let chief;
  if (H.chief) {
    chief = `<div class="row wrap" style="gap:8px">${icon('user')}<span style="flex:1 1 200px"><b>${esc(H.chief.name)}</b> <span class="faint">· ${t('hw.chiefRating', { n: chiefRating(G, H.chief) })}</span><div class="faint" style="font-size:12px">${t('hw.chiefFx', { p: dec(chiefPerf(G) * 100), r: dec(chiefRisk(G) * 100) })}</div></span><button class="btn sm ghost" data-act="hw-recall" data-tip="${esc(t('hw.recallTip'))}">${t('grp.recall')}</button></div>`;
  } else if (!HS.pick) {
    chief = `<div class="row wrap" style="gap:8px"><span class="hint" style="flex:1 1 200px">${t('hw.chiefNone')}</span><button class="btn sm" data-act="hw-pick">${icon('crown')}${t('hw.chiefPick')}</button></div>`;
  } else {
    const cands = chiefCandidates(G).slice(0, 4);
    chief = cands.length
      ? `<div class="col" style="gap:6px">${cands.map((st) => `<div class="row" style="gap:8px"><span class="ell" style="flex:1;min-width:0"><b>${esc(st.name)}</b> <span class="faint">· ${t('hw.chiefRating', { n: chiefRating(G, st) })}</span></span><button class="btn sm" data-act="hw-chief" data-id="${st.id}">${t('grp.choose')}</button></div>`).join('')}<p class="hint">${t('hw.chiefHelp')}</p></div>`
      : `<p class="hint">${t('grp.noCand')}</p>`;
  }
  return `<div class="card" style="margin-top:14px"><div class="row wrap" style="gap:8px;margin-bottom:8px"><div class="lbl">${t('hw.labT')}</div><span class="pips">${[1, 2, 3].map((i) => `<i class="${i <= H.lab ? 'on' : ''}"></i>`).join('')}</span><span class="faint" style="font-size:12px">${t('hw.labInfo', { n: labSlots(H), v: money(labRent(G, H)) })}</span><span class="sp"></span>${up}</div>
    <div class="divider"></div><div class="lbl" style="margin:8px 0 6px">${t('hw.chief')}</div>${chief}</div>`;
}

function projCard(G, J) {
  if (J.state === 'design') {
    const left = J.weeks - J.done;
    const stop = HS.confirm === `cancel:${J.id}`;
    const right = `<div style="text-align:right;flex:none"><b class="num">${tn('hw.weeksLeft', left)}</b><div class="faint" style="font-size:11.5px">${money(J.budget / J.weeks)}${t('ui.perWeek')}</div></div>`;
    return `<div class="card hw-card" style="--c:${HW_TYPES[J.type].color}">${head(J, right)}
      <div style="margin:10px 0 6px">${bar((J.done / J.weeks) * 100, J.paused ? 'var(--muted)' : COL)}</div>
      ${J.leak ? `<p class="hint" style="margin:4px 0 6px">${icon('megaphone')} ${t('hw.leaked')}</p>` : ''}
      <div class="row wrap" style="gap:8px"><span class="faint" style="font-size:12px;flex:1 1 200px">${J.paused ? t('hw.paused') : t('hw.paid', { v: money(J.paid), m: money(J.budget) })} · ${t('hw.protoNext', { v: money(J.proto), pct: Math.round(protoRisk(G, J) * (J.redo ? 50 : 100)) })}</span>
        <span class="row" style="gap:8px;margin-left:auto"><button class="btn sm ghost" data-act="hw-pause" data-id="${J.id}" data-v="${J.paused ? 0 : 1}">${icon(J.paused ? 'play' : 'pause')}${t(J.paused ? 'hw.resume' : 'hw.pause')}</button>
        <button class="btn sm ghost" data-act="hw-cancel" data-id="${J.id}">${icon('x')}${t('hw.cancel')}</button></span></div>
      ${stop ? confirmRow('cancel', J.id, t('hw.cancelYes'), t('hw.cancelWarn', { v: money(J.paid) })) : ''}</div>`;
  }
  if (J.state === 'fail') {
    const extra = Math.round(J.budget * 0.2);
    return `<div class="card hw-card hw-alert" style="--c:var(--bug)">${head(J)}
      <p class="hint" style="margin:10px 0 8px">${icon('bug')} ${t('hw.failText')}</p>
      <div class="row wrap" style="gap:8px"><button class="btn sm" data-act="hw-proto" data-id="${J.id}" data-v="redo" ${G.money < extra ? 'disabled' : ''} data-tip="${esc(t('hw.redoTip'))}">${icon('refresh')}${t('hw.redo', { v: money(extra), n: Math.round(J.weeks * 0.25) })}</button>
        <button class="btn sm ghost" data-act="hw-proto" data-id="${J.id}" data-v="ship" data-tip="${esc(t('hw.shipTip'))}">${t('hw.ship')}</button></div></div>`;
  }
  return launchCard(G, J);
}

// Ett färdigt projekt: välj partner, pris och första order, sedan lansering
function launchCard(G, J) {
  const L = (HS.launch[J.id] ||= { partner: suggestPartner(G, J), price: suggestPrice(J.type, J.cls), units: 0, auto: true });
  if (!partnerOpen(G, L.partner) || !partnerAllowed(G, J.type, L.partner)) L.partner = suggestPartner(G, J);
  const D = draftOf(G, J, L.partner, L.price);
  const d = weeklyDemand(G, D, L.price);
  const opts = orderOptions(G, D, L.partner, d, true);
  if (!opts.includes(L.units)) L.units = opts[Math.min(1, opts.length - 1)];
  const unit = unitCost(G, D, L.partner);
  const cost = orderCost(G, D, L.units, L.partner);
  const pp = HW_PARTNER[L.partner];
  const s = scoreOf(G, D);
  const partners = fitPartners(G, J.type);
  const prices = priceSteps(J.type, J.cls).map((v) => ({ v, label: '$' + v }));
  const units = opts.map((v) => ({ v, label: fmtNum(v) }));
  const weeks = d > 0 ? Math.round(L.units / d) : 0;
  const right = `<div style="text-align:right;flex:none"><div class="disp" style="font-size:26px;color:${scoreTone(s)}">${dec(s)}</div><div class="faint" style="font-size:11px">${t('hw.expScore')}</div></div>`;
  return `<div class="card hw-card hw-ready" style="--c:var(--good)">${head(J, right)}
    <p class="hint" style="margin:8px 0 10px">${icon('check')} ${t(J.bad ? 'hw.readyBad' : 'hw.ready')}${isPlat(J.type) ? ' ' + t('hw.platReady') : ''}${J.leak ? ' ' + t('hw.leakReady') : ''}</p>
    <div class="hw-ctl">
      <div class="hw-wide"><div class="lbl" style="margin-bottom:6px">${t('hw.partner')}</div>${seg(partners, L.partner, 'hw-lp', `data-id="${J.id}"`, (it) => lockTip(G, J.type, it.v), offP)}</div>
      <div class="hw-wide"><div class="lbl" style="margin-bottom:6px">${t('hw.price')}</div>${seg(prices, L.price, 'hw-lpr', `data-id="${J.id}"`)}<p class="hint" style="margin-top:6px">${t('hw.priceHelp', { v: '$' + suggestPrice(J.type, J.cls) })}</p></div>
      <div><div class="lbl" style="margin-bottom:6px">${t('hw.firstOrder')}</div>${seg(units, L.units, 'hw-lu', `data-id="${J.id}"`)}<p class="hint" style="margin-top:6px">${t('hw.orderHelp', { n: fmtNum(minOrder(D, L.partner, true)), w: pp.lead })}</p></div>
      <div><div class="lbl" style="margin-bottom:6px">${t('hw.auto')}</div><div class="seg"><button class="${L.auto ? 'on' : ''}" data-act="hw-la" data-id="${J.id}" data-v="1">${t('hw.autoOn')}</button><button class="${L.auto ? '' : 'on'}" data-act="hw-la" data-id="${J.id}" data-v="0">${t('hw.autoOff')}</button></div><p class="hint" style="margin-top:6px">${t('hw.autoHelp')}</p></div>
    </div>
    <div class="hw-stats" style="margin-top:12px">${stat('hw.s.demand', `~${fmtNum(Math.round(d))}${t('ui.perWeek')}`, t('hw.s.demandTip'))}${stat('hw.s.unit', money(unit))}${stat('hw.s.margin', money(L.price - unit))}${stat('hw.s.compat', Math.round(D.compat), t('hw.s.compatTip'))}${stat('hw.s.defect', t('dist.pct', { n: dec(D.defect * 100) }))}${stat('hw.s.cover', tn('hw.weeksN', weeks))}</div>
    <div class="row wrap" style="gap:8px;margin-top:12px"><span class="hint" style="flex:1 1 220px">${t('hw.launchHelp', { w: pp.lead })}</span><button class="btn primary" data-act="hw-launch" data-id="${J.id}" ${G.money < cost ? 'disabled' : ''}>${icon('rocket')}${t('hw.launch', { v: money(cost) })}</button></div></div>`;
}

function partnerTip(G, id) {
  const p = HW_PARTNER[id];
  return t('hw.partnerTip', { c: pct(p.cost), d: dec(p.defect * 100), w: p.lead, n: fmtNum(p.min), cap: fmtNum(Math.round(partnerCap(G, id))) });
}

function designForm(G, H) {
  const types = openTypes(G);
  if (!types.includes(HS.type)) HS.type = types[types.length - 1];
  const engines = G.engines.slice(-3);
  if (HS.opt === undefined || (HS.opt != null && !engines.some((e) => e.id === HS.opt))) HS.opt = engines.length ? engines[engines.length - 1].id : null;
  if (!archOpen(G, HS.type, HS.arch)) HS.arch = 'std';
  const spec = { type: HS.type, cls: HS.cls, qual: HS.qual, arch: hasArch(HS.type) ? HS.arch : null, opt: HS.opt };
  const cost = designCost(G, spec);
  const weeks = designWeeks(G, spec);
  const ok = canDesign(G, spec);
  const best = fitPartners(G, spec.type).pop()?.v || 'halden';
  const D = { type: spec.type, cls: spec.cls, qual: spec.qual, perf0: designPerf(G, spec), compat: baseCompat(G, spec), defect: defectOf(spec, best), t: null };
  const s = scoreOf(G, D);
  const tyItems = types.map((id) => ({ v: id, label: `${tyIcon(id)}${t('hw.type.' + id)}` }));
  const clsItems = HW_CLASSES.map((c) => ({ v: c.id, label: t('hw.cls.' + c.id) }));
  const qItems = HW_QUALITY.map((q) => ({ v: q.id, label: t('hw.q.' + q.id) }));
  const aItems = HW_ARCH.map((a) => ({ v: a.id, label: t('hw.arch.' + a.id) }));
  const oItems = [{ v: 'none', label: t('hw.optNone') }, ...engines.map((e) => ({ v: e.id, label: esc(e.name) }))];
  const ty = HW_TYPES[HS.type];
  return `<div class="card" style="margin-top:14px"><div class="row wrap" style="gap:8px;margin-bottom:10px"><div class="lbl">${t('hw.new')}</div><span class="sp"></span><b class="ell">${esc(hwName(H, HS.type, HS.cls))}</b></div>
    <div class="hw-ctl">
      <div class="hw-wide"><div class="lbl" style="margin-bottom:6px">${t('hw.type')}</div>${seg(tyItems, HS.type, 'hw-ft')}<p class="hint" style="margin-top:6px">${t('hw.typeD.' + HS.type)} ${t('hw.market', { n: fmtNum(Math.round(marketSize(HS.type, yfOf(G.t), G.t) / WEEKS_PER_YEAR)) })}</p></div>
      <div><div class="lbl" style="margin-bottom:6px">${t('hw.cls')}</div>${seg(clsItems, HS.cls, 'hw-fc', '', (it) => t('hw.clsTip.' + it.v))}</div>
      <div><div class="lbl" style="margin-bottom:6px">${t('hw.q')}</div>${seg(qItems, HS.qual, 'hw-fq', '', (it) => t('hw.qTip.' + it.v))}</div>
      ${hasArch(HS.type) ? `<div><div class="lbl" style="margin-bottom:6px">${t('hw.arch')}</div>${seg(aItems, HS.arch, 'hw-fa', '', (it) => t(archOpen(G, HS.type, it.v) ? 'hw.archTip.' + it.v : 'hw.archSoc'), (it) => !archOpen(G, HS.type, it.v))}</div>` : ''}
      <div><div class="lbl" style="margin-bottom:6px">${t('hw.opt')}</div>${engines.length ? seg(oItems, HS.opt == null ? 'none' : HS.opt, 'hw-fo') : `<p class="hint">${t('hw.optNoEngine')}</p>`}<p class="hint" style="margin-top:6px">${t('hw.optHelp')}</p></div>
    </div>
    <div class="hw-stats" style="margin-top:12px">${stat('hw.s.design', money(cost))}${stat('hw.s.weeks', tn('hw.weeksN', weeks))}${stat('hw.s.proto', money(protoCost(G, spec)))}${stat('hw.s.risk', t('dist.pct', { n: Math.round(protoRisk(G, spec) * 100) }), t('hw.s.riskTip'))}${stat('hw.s.score', '~' + dec(s), t('hw.s.scoreTip'))}${stat('hw.s.price', '$' + suggestPrice(HS.type, HS.cls))}</div>
    <div class="row wrap" style="gap:8px;margin-top:12px"><span class="hint" style="flex:1 1 220px">${t('hw.startHelp', { v: money(cost / weeks) })} ${t('hw.life', { n: String(ty.life).replace('.', lang === 'sv' ? ',' : '.') })}</span><button class="btn primary" data-act="hw-start" ${ok === true ? '' : 'disabled'}>${icon('flask')}${t('hw.start')}</button></div></div>`;
}

function devTab(G, H) {
  const live = H.products.filter((p) => p.state !== 'ended');
  const lm = G.t - H.t0 < 4 ? H.m : H.lm;
  const net = lm.rev + (lm.lic || 0) - lm.design - lm.proto - lm.make - lm.war - lm.roy - lm.drv - lm.lab - lm.issue;
  const projects = H.projects.length ? `<div class="col" style="gap:10px">${H.projects.map((J) => projCard(G, J)).join('')}</div>` : `<p class="hint">${t('hw.noProjects')}</p>`;
  const full = H.projects.length >= labSlots(H);
  return `<p class="hint" style="margin-bottom:12px">${icon('gpu')} ${t('hw.help')}</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <div class="counter" style="--c:${tone(H.rep)}" data-tip="${esc(t('hw.repTip', { pct: pct(brandOf(H)) }))}"><div class="v num">${Math.round(H.rep)}</div><div class="k">${t('hw.rep')}</div><div style="margin-top:6px">${bar(H.rep, tone(H.rep), 'thin')}</div></div>
      <div class="counter" style="--c:${COL}"><div class="v num">${H.projects.length}/${labSlots(H)}</div><div class="k">${t('hw.slots')}</div></div>
      <div class="counter" style="--c:var(--accent)"><div class="v num">${live.length}</div><div class="k">${t('hw.onMarket')}</div></div>
      <div class="counter" style="--c:${net >= 0 ? 'var(--good)' : 'var(--bug)'}" data-tip="${esc(t('hw.netTip'))}"><div class="v num">${money(net)}</div><div class="k">${t('hw.netMonth')}</div></div>
    </div>
    ${labCtl(G, H)}
    <div class="lbl" style="margin:18px 0 8px">${t('hw.projects')}</div>${projects}
    ${full ? `<p class="hint" style="margin-top:10px">${t(H.lab < LAB_MAX ? 'hw.fullUp' : 'hw.full')}</p>` : designForm(G, H)}`;
}

// ── Produkter ───────────────────────────────────────────────────
function issueRow(G, P) {
  if (P.issue && P.issue.kind === 'heat') {
    return `<div class="hw-issue"><p class="hint">${icon('fire')} ${t('hw.heat')}</p><div class="row wrap" style="gap:8px;margin-top:6px"><button class="btn sm" data-act="hw-issue" data-id="${P.id}" data-v="recall" ${G.money < P.issue.value ? 'disabled' : ''}>${t('hw.heatFix', { v: money(P.issue.value) })}</button><button class="btn sm ghost" data-act="hw-issue" data-id="${P.id}" data-v="ignore" data-tip="${esc(t('hw.heatIgnoreTip'))}">${t('hw.heatIgnore')}</button></div></div>`;
  }
  if (P.issue) {
    return `<div class="hw-issue"><p class="hint">${icon('bug')} ${t('hw.batch', { n: fmtNum(P.issue.units) })}</p><div class="row wrap" style="gap:8px;margin-top:6px"><button class="btn sm" data-act="hw-issue" data-id="${P.id}" data-v="recall">${t('hw.recall', { v: money(P.issue.value * RECALL) })}</button><button class="btn sm ghost" data-act="hw-issue" data-id="${P.id}" data-v="ignore" data-tip="${esc(t('hw.ignoreTip'))}">${t('hw.ignore')}</button></div></div>`;
  }
  if (P.bench === 'offer') {
    return `<div class="hw-issue"><p class="hint">${icon('eye')} ${t('hw.bench')}</p><div class="row wrap" style="gap:8px;margin-top:6px"><button class="btn sm ghost" data-act="hw-bench" data-id="${P.id}" data-v="1" data-tip="${esc(t('hw.cheatTip'))}">${t('hw.cheat')}</button><button class="btn sm" data-act="hw-bench" data-id="${P.id}" data-v="0">${t('hw.honest')}</button></div></div>`;
  }
  return '';
}

function spark(hist, c) {
  if (hist.length < 2) return '';
  const max = Math.max(1, ...hist);
  const w = 100;
  const pts = hist.map((v, i) => `${((i / (hist.length - 1)) * w).toFixed(1)},${(28 - (v / max) * 26).toFixed(1)}`).join(' ');
  return `<svg class="hw-spark" viewBox="0 0 ${w} 30" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}

// En egen plattform: installerad bas, vikt, andra förlags stöd, licensintäkt och avgiften
function platBlock(G, P) {
  const pl = platOf(G, P);
  const base = pl ? P.base || 0 : 0;
  const fees = PLAT_FEES.map((f) => ({ v: f, label: t('dist.pct', { n: pct(f) }) }));
  const roy = platRoyalty(G, P);
  return `<div class="divider" style="margin:12px 0"></div><div class="row wrap" style="gap:8px;margin-bottom:8px"><div class="lbl">${t('hw.platT')}</div>${pl ? tag(esc(pl.name), HW_TYPES[P.type].color) : ''}<span class="sp"></span><span class="faint" style="font-size:12px">${t('hw.platGen', { n: pl ? pl.tier : '–' })}</span></div>
    <div class="hw-stats">
      ${stat('hw.s.base', fmtNum(Math.round(base)), t('hw.s.baseTip', { n: fmtNum(PER_WEIGHT) }))}
      ${stat('hw.s.weight', pl ? dec(pl.weight) : '–', t('hw.s.weightTip'))}
      ${stat('hw.s.support', t('dist.pct', { n: pct(supportOf(G, P)) }), t('hw.s.supportTip'))}
      ${stat('hw.s.lic', `${money(roy)}${t('ui.perWeek')}`, t('hw.s.licTip'))}
      ${stat('hw.s.ownGames', String(ownGames(G, P)), t('hw.s.ownGamesTip'))}
      ${stat('hw.s.licTot', money(P.lic || 0))}
      ${digitalOf(G) ? stat('hw.s.digital', t('dist.pct', { n: pct(digitalOf(G)) }), t('hw.s.digitalTip', { pct: pct(PLAT_CUT) })) + stat('hw.s.storeW', `${money(platDigital(G, P))}${t('ui.perWeek')}`, t('hw.s.storeWTip')) : ''}
    </div>
    ${!digitalOf(G) && !G.u.flags.store ? `<p class="hint" style="margin-top:8px">${icon('cart')} ${t('hw.storeHint')}</p>` : ''}
    <div class="hw-ctl" style="margin-top:12px"><div class="hw-wide"><div class="lbl" style="margin-bottom:6px">${t('hw.fee')}</div>${seg(fees, P.fee, 'hw-fee', `data-id="${P.id}"`, (it) => t('hw.feeTip', { s: pct(supportOf(G, P, it.v)), v: money(platRoyalty(G, P, it.v)) }))}<p class="hint" style="margin-top:6px">${t('hw.feeHelp')}</p></div></div>
    ${P.state === 'market' ? exBlock(G, P, pl) : ''}`;
}
// Köp andra förlags nästa spel som exklusiva till plattformen (ryktena), och de som redan är köpta
function exBlock(G, P, pl) {
  const row = (c, right) => `<div class="hw-exrow"><span class="dotc" style="background:${c.color}"></span><div style="min-width:0"><b class="ell">${esc(c.name)}</b><div class="faint ell" style="font-size:12px">${L(GENRE[c.next.genre].name)} · ${L(TOPIC[c.next.topic].name)} · ${t('hw.exIn', { n: Math.max(0, exclWeeks(G, c)) })}</div></div>${right}</div>`;
  const bought = boughtFor(G, P).map((c) => row(c, tag(t('hw.exBought'), 'var(--good)')));
  const offers = exclOffers(G, P).map((c) => {
    const ok = canBuyExcl(G, P, c);
    const tip = ok === 'small' ? t('hw.exSmall', { n: BUY_MIN }) : ok === 'wait' ? t('hw.exWait', { n: BUY_GAP - (G.t - P.exT) }) : t('hw.exTip', { name: esc(pl ? pl.name : P.name) });
    return row(c, `<button class="btn sm" data-act="hw-ex" data-id="${P.id}" data-v="${esc(String(c.id))}" ${ok === true ? '' : 'disabled'} data-tip="${esc(tip)}">${t('hw.exBuy', { v: money(exclPrice(G, c)) })}</button>`);
  });
  if (!bought.length && !offers.length) return '';
  return `<div class="lbl" style="margin:14px 0 6px">${t('hw.exT')}</div><p class="hint" style="margin-bottom:8px">${t('hw.exHelp')}</p><div class="col" style="gap:6px">${bought.join('')}${offers.join('')}</div>`;
}

function productCard(G, P) {
  const plat = isPlat(P.type);
  const market = P.state === 'market';
  const s = market ? scoreOf(G, P) : scoreOf(G, P, G.t);
  const unit = unitCost(G, P, P.partner);
  const pipe = pipelineOf(G, P);
  const sold = P.hist.length ? P.hist[P.hist.length - 1] : 0;
  const cover = P.dem > 0.5 ? Math.round(P.stock / P.dem) : 0;
  const next = G.hw.orders.filter((o) => o.p === P.id).reduce((a, o) => Math.min(a, o.at), Infinity);
  const state = market
    ? tag(t('hw.onSale', { y: yearOf(P.t) }), 'var(--good)')
    : tag(next < Infinity ? tn('hw.inProd', Math.max(0, next - G.t)) : t('hw.inProd0'), 'var(--warn)');
  const right = `<div style="text-align:right;flex:none"><div class="disp" style="font-size:26px;color:${scoreTone(s)}" data-tip="${esc(t('hw.scoreTip'))}">${dec(s)}</div><div class="faint" style="font-size:11px">${market ? t('hw.score') : t('hw.expScore')}</div></div>`;
  const opts = orderOptions(G, P);
  const stop = HS.confirm === `end:${P.id}`;
  const partners = fitPartners(G, P.type);
  const so = market && P.stock < 1 && P.dem > 1;
  return `<div class="card hw-card" style="--c:${HW_TYPES[P.type].color}">${head(P, right)}
    <div class="row wrap" style="gap:6px;margin-top:8px">${state}${so ? tag(t('hw.soldOut'), 'var(--bug)') : ''}${P.cheat > G.t ? tag(t('hw.cheating'), 'var(--warn)') : ''}${P.leakT > G.t ? tag(t('hw.leakTag'), 'var(--warn)') : ''}<span class="sp"></span>${market ? spark(P.hist, HW_TYPES[P.type].color) : ''}</div>
    ${issueRow(G, P)}
    <div class="hw-stats" style="margin-top:10px">
      ${stat('hw.s.share', t('dist.pct', { n: dec(P.share * 100, P.share < 0.1 ? 1 : 0) }), t('hw.s.shareTip'))}
      ${stat('hw.s.sold', `${fmtNum(sold)}${t('ui.perWeek')}`)}
      ${stat('hw.s.stock', fmtNum(Math.round(P.stock)) + (cover ? ` · ${tn('hw.weeksN', cover)}` : ''), t('hw.s.stockTip'))}
      ${stat('hw.s.pipe', fmtNum(Math.round(pipe)))}
      ${stat('hw.s.unit', money(unit))}
      ${stat('hw.s.compat', Math.round(P.compat), t('hw.s.compatTip'))}
      ${stat('hw.s.total', fmtNum(Math.round(P.sold)))}
      ${stat('hw.s.profit', `<span class="${productProfit(P) >= 0 ? 'up' : 'down'}">${money(productProfit(P))}</span>`, t('hw.s.profitTip'))}
    </div>
    <div class="hw-ctl" style="margin-top:12px">
      <div><div class="lbl" style="margin-bottom:6px">${t('hw.price')}</div><div class="row" style="gap:8px"><button class="btn sm ghost" data-act="hw-price" data-id="${P.id}" data-v="-1" aria-label="${t('hw.cheaper')}">${icon('minus')}</button><b class="num" style="min-width:64px;text-align:center">$${P.price}</b><button class="btn sm ghost" data-act="hw-price" data-id="${P.id}" data-v="1" aria-label="${t('hw.dearer')}">${icon('plus')}</button><span class="faint" style="font-size:12px">${t('hw.margin', { v: money(P.price - unit) })}</span></div></div>
      <div><div class="lbl" style="margin-bottom:6px">${t('hw.auto')}</div><div class="seg"><button class="${P.auto ? 'on' : ''}" data-act="hw-auto" data-id="${P.id}" data-v="1">${t('hw.autoOn')}</button><button class="${P.auto ? '' : 'on'}" data-act="hw-auto" data-id="${P.id}" data-v="0">${t('hw.autoOff')}</button></div></div>
      <div class="hw-wide"><div class="lbl" style="margin-bottom:6px">${t('hw.order')}</div><div class="row wrap" style="gap:6px">${opts.map((n) => `<button class="btn sm" data-act="hw-order" data-id="${P.id}" data-v="${n}" ${G.money < orderCost(G, P, n) ? 'disabled' : ''} data-tip="${esc(t('hw.orderTip', { v: money(orderCost(G, P, n)), w: HW_PARTNER[P.partner].lead }))}">${icon('truck')}${fmtNum(n)}</button>`).join('')}</div></div>
      <div class="hw-wide"><div class="lbl" style="margin-bottom:6px">${t('hw.partner')}</div>${seg(partners, P.partner, 'hw-pp', `data-id="${P.id}"`, (it) => lockTip(G, P.type, it.v), (it) => it.off && it.v !== P.partner)}<p class="hint" style="margin-top:6px">${t('hw.switchWarn')}</p></div>
      ${G.u.flags[plat ? 'hw_devkit' : 'hw_driver'] ? `<div class="hw-wide"><div class="lbl" style="margin-bottom:6px">${t(plat ? 'hw.devkit' : 'hw.driver')}</div><div class="row wrap" style="gap:8px"><div class="seg"><button class="${P.drv ? '' : 'on'}" data-act="hw-drv" data-id="${P.id}" data-v="0">${t('hw.drvOff')}</button><button class="${P.drv ? 'on' : ''}" data-act="hw-drv" data-id="${P.id}" data-v="1" ${!P.drv && P.compat >= drvMax(P) ? 'disabled' : ''}>${t('hw.drvOn', { v: money(driverCost(G, P)) })}</button></div></div><p class="hint" style="margin-top:6px">${t(P.compat >= drvMax(P) ? 'hw.drvDone' : plat ? 'hw.dkHelp' : 'hw.drvHelp')}</p></div>` : ''}
    </div>
    ${plat ? platBlock(G, P) : ''}
    <div class="row wrap" style="gap:8px;margin-top:10px"><span class="sp"></span><button class="btn sm ghost" data-act="hw-end" data-id="${P.id}">${t('hw.end')}</button></div>
    ${stop ? confirmRow('end', P.id, t('hw.endYes'), t('hw.endWarn', { pct: pct(CLEAR) })) : ''}</div>`;
}

function econ(G, H) {
  const early = G.t - H.t0 < 4;
  const rows = (o) => [
    ['hw.e.rev', o.rev],
    ['hw.e.lic', o.lic || 0],
    ['hw.e.design', -o.design],
    ['hw.e.proto', -o.proto],
    ['hw.e.make', -o.make],
    ['hw.e.war', -o.war],
    ['hw.e.roy', -o.roy],
    ['hw.e.drv', -o.drv],
    ['hw.e.lab', -o.lab],
    ['hw.e.issue', -o.issue],
    ['hw.e.excl', -(o.excl || 0)],
  ];
  const net = (o) => o.rev + (o.lic || 0) - o.design - o.proto - o.make - o.war - o.roy - o.drv - o.lab - o.issue - (o.excl || 0);
  const cell = (v) => `<b class="num ${v >= 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${money(v)}</b>`;
  const cur = early ? H.m : H.lm;
  const a = rows(cur);
  const b = rows(H.tot);
  const body = a.map(([k], i) => (Math.abs(b[i][1]) < 1 ? '' : `<div class="dist-erow"><span>${t(k)}</span>${cell(a[i][1])}${cell(b[i][1])}</div>`)).join('');
  return `<div class="card" style="margin-top:18px"><div class="lbl" style="margin-bottom:8px">${t('hw.econ')}</div><div class="dist-econ"><div class="dist-erow faint"><span></span><span>${t(early ? 'dist.monthSoFar' : 'dist.month')}</span><span>${t('dist.since', { year: yearOf(H.t0) })}</span></div>${body}
    <div class="divider"></div><div class="dist-erow"><span><b>${t('dist.net')}</b></span>${cell(net(cur))}${cell(hwNet(G))}</div></div><p class="hint" style="margin-top:8px">${t('hw.econHelp')}</p></div>`;
}

function prodTab(G, H) {
  const live = H.products.filter((p) => p.state !== 'ended');
  const ended = H.products.filter((p) => p.state === 'ended');
  const list = live.length ? `<div class="col" style="gap:10px">${live.map((P) => productCard(G, P)).join('')}</div>` : `<div class="empty">${icon('box')}<div class="hint" style="max-width:420px">${t('hw.noProducts')}</div></div>`;
  const old = ended.length
    ? `<div class="card" style="margin-top:14px"><div class="row" style="gap:8px"><div class="lbl">${tn('hw.ended', ended.length)}</div><span class="sp"></span><button class="btn sm ghost" data-act="hw-old">${t(HS.old ? 'hw.hide' : 'hw.show')}</button></div>
      ${HS.old ? `<div class="col" style="gap:6px;margin-top:8px">${ended.slice().reverse().map((P) => `<div class="hw-orow"><span class="hw-ic sm" style="--c:${HW_TYPES[P.type].color}">${tyIcon(P.type)}</span><b class="ell">${esc(P.name)}</b><span class="faint num">${yearOf(P.t ?? P.tReady)}–${yearOf(P.endT)}</span><span class="num">${fmtNum(Math.round(P.sold))}</span><b class="num ${productProfit(P) >= 0 ? 'up' : 'down'}">${money(productProfit(P))}</b></div>`).join('')}</div>` : ''}</div>`
    : '';
  return suitCard(G, H) + list + old + econ(G, H);
}
// Studionivåns beslut: patentstämningen (Produkter) och partnerns exklusivitetserbjudande (Partners)
function suitCard(G, H) {
  const v = H.suit;
  if (!v) return '';
  return `<div class="card hw-card hw-alert" style="--c:var(--bug);margin-bottom:12px"><div class="row" style="gap:10px">${icon('shield')}<b class="h3">${t('hw.patentT')}</b></div>
    <p class="hint" style="margin:8px 0">${t('hw.patentText', { w: ISSUE_WEEKS })}</p>
    <div class="row wrap" style="gap:8px"><button class="btn sm" data-act="hw-patent" data-v="settle" ${G.money < v.settle ? 'disabled' : ''}>${t('hw.patentSettle', { v: money(v.settle) })}</button><button class="btn sm ghost" data-act="hw-patent" data-v="trial" data-tip="${esc(t('hw.patentTrialTip', { v: money(v.loss) }))}">${t('hw.patentTrial')}</button></div></div>`;
}
function offerCard(G, H) {
  const o = H.offer;
  if (!o) return '';
  const name = esc(HW_PARTNER[o.partner].name);
  return `<div class="card hw-card hw-ready" style="--c:var(--gold);margin-bottom:12px"><div class="row wrap" style="gap:10px">${icon('mail')}<b class="h3">${t('hw.offerT', { partner: name })}</b>${tag(t('hw.type.' + o.type), HW_TYPES[o.type].color)}</div>
    <p class="hint" style="margin:8px 0">${t('hw.offerText', { partner: name, n: 3, w: ISSUE_WEEKS })}</p>
    <div class="row wrap" style="gap:8px"><button class="btn sm" data-act="hw-offer" data-v="1">${t('hw.offerYes')}</button><button class="btn sm ghost" data-act="hw-offer" data-v="0">${t('hw.offerNo')}</button></div></div>`;
}

// ── Partners ────────────────────────────────────────────────────
function partnersTab(G, H) {
  const glob = [];
  if (chipsOn(G.t)) glob.push(`<p class="hint">${icon('fire')} ${t('hw.chipsNow')}</p>`);
  if (cryptoOn(G.t)) glob.push(`<p class="hint">${icon('trend')} ${t('hw.cryptoNow')}</p>`);
  const cards = HW_PARTNERS.map((p) => {
    const open = partnerOpen(G, p.id);
    const S = H.partners[p.id];
    const rel = relOf(G, p.id);
    const orders = H.orders.filter((o) => o.partner === p.id);
    const status = [];
    if (S && S.short > G.t) status.push(tag(tn('hw.shortage', S.short - G.t), 'var(--bug)'));
    if (S && S.fxUntil > G.t) status.push(tag(t(S.fx > 1 ? 'hw.fxUp' : 'hw.fxDown'), S.fx > 1 ? 'var(--warn)' : 'var(--good)'));
    if (orders.length) status.push(tag(tn('hw.orders', orders.length), 'var(--accent)'));
    const ex = exclOf(G, p.id);
    if (ex) status.push(tag(t('hw.exclTag', { type: t('hw.type.' + ex.type), y: yearOf(ex.until) }), 'var(--gold)'));
    return `<div class="card hw-partner ${open ? '' : 'off'}">
      <div class="row wrap" style="gap:8px"><b class="h3">${esc(p.name)}</b><span class="faint" style="font-size:12px">${t('hw.pk.' + p.kind)}</span><span class="sp"></span>${open ? status.join('') : tag(t('hw.from', { y: p.from }), 'var(--muted)')}</div>
      <p class="hint" style="margin:6px 0 8px">${t('hw.pd.' + p.id)}</p>
      <div class="hw-stats">${stat('hw.p.cost', t('dist.pct', { n: pct(p.cost) }))}${stat('hw.p.defect', '+' + t('dist.pct', { n: dec(p.defect * 100) }))}${stat('hw.p.lead', tn('hw.weeksN', p.lead))}${stat('hw.p.min', fmtNum(p.min))}${stat('hw.p.cap', `${fmtNum(Math.round(partnerCap(G, p.id)))}${t('ui.perWeek')}`, t('hw.p.capTip'))}${p.perf ? stat('hw.p.perf', '+' + t('dist.pct', { n: pct(p.perf) })) : ''}</div>
      ${open ? `<div class="row" style="gap:10px;margin-top:10px"><span class="faint" style="font-size:12px;min-width:90px">${t('hw.rel')}</span><div style="flex:1">${bar(rel, tone(rel), 'thin')}</div><span class="num faint" style="font-size:12px">${Math.round(rel)}</span></div>${rel > 70 ? `<p class="hint" style="margin-top:4px">${t('hw.relGood')}</p>` : ''}` : ''}</div>`;
  }).join('');
  return `${offerCard(G, H)}<p class="hint" style="margin-bottom:12px">${icon('truck')} ${t('hw.partnersHelp')} ${t('hw.relHelp')}</p>${glob.join('')}<div class="col" style="gap:10px">${cards}</div>`;
}

// Beslut som väntar på spelaren (för dockan): misslyckade och färdiga projekt, felbatcher, benchmarkfrestelser,
// exklusivitetserbjudanden och patentstämningar
export function hwDecisions(G) {
  const H = G.hw;
  if (!H) return 0;
  return H.projects.filter((p) => p.state !== 'design').length + H.products.filter((p) => p.issue || p.bench === 'offer').length + (H.offer ? 1 : 0) + (H.suit ? 1 : 0);
}

const TABS = ['dev', 'prod', 'partners'];
regWin({
  id: 'hardware',
  icon: 'gpu',
  color: COL,
  size: 'xl',
  title: () => t('hw.title'),
  canOpen: (G) => (canHw(G) && G.hw ? true : t('hw.locked')),
  sub: (G) => (G.hw ? t('hw.sub', { y: yearOf(G.hw.t0) }) : ''),
  headExtra: () => `<div class="tabs">${TABS.map((k) => `<button class="tab ${HS.tab === k ? 'on' : ''}" data-act="hw-tab" data-id="${k}">${t('hw.tab.' + k)}</button>`).join('')}</div>`,
  render(G) {
    const H = G.hw;
    return HS.tab === 'prod' ? prodTab(G, H) : HS.tab === 'partners' ? partnersTab(G, H) : devTab(G, H);
  },
  onOpen(G) {
    // ett beslut väntar: öppna fliken där det finns
    if (G.hw && (G.hw.suit || G.hw.products.some((p) => p.issue || p.bench === 'offer'))) HS.tab = 'prod';
    else if (G.hw && G.hw.offer) HS.tab = 'partners';
    else if (G.hw && G.hw.projects.some((p) => p.state !== 'design')) HS.tab = 'dev';
  },
});

const refresh = (r, ok = 'click') => {
  if (r === true) sfx.play(ok);
  else if (r && r !== false) errToast(r === 'slots' ? 'hw.full' : r === 'min' ? 'hw.minErr' : r);
  UI.refresh();
};
act('hw-fee', (el) => refresh(setPlatFee(G_(), +el.dataset.id, +el.dataset.v)));
act('hw-tab', (el) => {
  HS.tab = el.dataset.id;
  HS.confirm = null;
  UI.refresh();
});
act('hw-lab', () => refresh(upgradeLab(G_()), 'fanfare'));
act('hw-pick', () => {
  HS.pick = true;
  UI.refresh();
});
act('hw-chief', (el) => {
  HS.pick = false;
  refresh(setChief(G_(), +el.dataset.id), 'good');
});
act('hw-recall', () => refresh(recallChief(G_()) === 'capacity' ? t('err.capacity') : true));
act('hw-ft', (el) => {
  HS.type = el.dataset.v;
  UI.refresh();
});
act('hw-fc', (el) => {
  HS.cls = el.dataset.v;
  UI.refresh();
});
act('hw-fq', (el) => {
  HS.qual = el.dataset.v;
  UI.refresh();
});
act('hw-fa', (el) => {
  HS.arch = el.dataset.v;
  UI.refresh();
});
act('hw-fo', (el) => {
  HS.opt = el.dataset.v === 'none' ? null : +el.dataset.v;
  UI.refresh();
});
act('hw-start', () => refresh(startDesign(G_(), { type: HS.type, cls: HS.cls, qual: HS.qual, arch: HS.arch, opt: HS.opt }), 'research'));
act('hw-pause', (el) => refresh(pauseDesign(G_(), +el.dataset.id, el.dataset.v === '1')));
act('hw-cancel', (el) => {
  HS.confirm = `cancel:${el.dataset.id}`;
  UI.refresh();
});
act('hw-no', () => {
  HS.confirm = null;
  UI.refresh();
});
act('hw-yes', (el) => {
  const G = G_();
  const id = +el.dataset.id;
  HS.confirm = null;
  refresh(el.dataset.k === 'cancel' ? cancelDesign(G, id) : discontinue(G, id));
});
act('hw-proto', (el) => refresh(resolveProto(G_(), +el.dataset.id, el.dataset.v)));
const L_ = (el) => HS.launch[+el.dataset.id];
act('hw-lp', (el) => {
  L_(el).partner = el.dataset.v;
  UI.refresh();
});
act('hw-lpr', (el) => {
  L_(el).price = +el.dataset.v;
  UI.refresh();
});
act('hw-lu', (el) => {
  L_(el).units = +el.dataset.v;
  UI.refresh();
});
act('hw-la', (el) => {
  L_(el).auto = el.dataset.v === '1';
  UI.refresh();
});
act('hw-launch', (el) => {
  const L = L_(el);
  const r = launch(G_(), +el.dataset.id, L);
  if (r === true) {
    delete HS.launch[+el.dataset.id];
    HS.tab = 'prod';
  }
  refresh(r, 'fanfare');
});
act('hw-price', (el) => {
  const P = G_().hw.products.find((p) => p.id === +el.dataset.id);
  if (P) refresh(setPrice(G_(), P.id, stepPrice(P.price, +el.dataset.v)));
});
act('hw-auto', (el) => refresh(setAuto(G_(), +el.dataset.id, el.dataset.v === '1')));
act('hw-order', (el) => {
  const G = G_();
  const P = G.hw.products.find((p) => p.id === +el.dataset.id);
  if (!P) return;
  refresh(orderMore(G, P.id, +el.dataset.v), 'coin');
});
act('hw-pp', (el) => refresh(setPartner(G_(), +el.dataset.id, el.dataset.v)));
act('hw-drv', (el) => refresh(setDriver(G_(), +el.dataset.id, el.dataset.v === '1')));
act('hw-end', (el) => {
  HS.confirm = `end:${el.dataset.id}`;
  UI.refresh();
});
act('hw-issue', (el) => refresh(resolveIssue(G_(), +el.dataset.id, el.dataset.v)));
act('hw-bench', (el) => refresh(resolveBench(G_(), +el.dataset.id, el.dataset.v === '1')));
act('hw-ex', (el) => refresh(buyExclusive(G_(), +el.dataset.id, el.dataset.v), 'coin'));
act('hw-offer', (el) => refresh(resolveOffer(G_(), el.dataset.v === '1')));
act('hw-patent', (el) => refresh(resolvePatent(G_(), el.dataset.v)));
act('hw-old', () => {
  HS.old = !HS.old;
  UI.refresh();
});
