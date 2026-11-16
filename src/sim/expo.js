import { clamp, fmtNum, fmtFull } from '../core/util.js';
import { hashStr, seeded } from '../core/rng.js';
import { emit } from '../core/bus.js';
import { t } from '../core/i18n.js';
import { yearOf, priceOf, SCOPES } from './const.js';
import { spend, earn } from './studio.js';
import { promoPrice } from './dev.js';
import { addTalk, prGain, talkWeekly } from './hype.js';
import { buildsOf, buildById, logBuild } from './builds.js';
import { teamName } from './teams.js';
import { note } from './news.js';
import { liveGames } from './live.js';
import { scoreOf } from './hardware.js';
import { beat } from './life.js';
import { rivalOf } from './rival.js';
import { crisisOf } from './crisis.js';
import { releaseWeek } from './market.js';
import { KEYNOTES, DEMOS, TRAILERS, EXPO_PRIZES, EXPO_TALK, dropChance, rivalForm, CELEB_P, KEY_REACT, EXPO_VERDICT, EXPO_PRIZE_FANS, normPlan, planCosts, planCrowd, planBuzz, expoRoll, prizeBoard, verdictTier, recordShow } from './exposhow.js';

// Spelmässan: varje maj, efter forskningen Mässmonter. Spelaren väljer storlek på monter och vad som ska visas upp (ett
// pågående spel, nyligen släppta spel som ännu säljer, egna hårdvaruprodukter, ett onlinespel). Besökarna avgörs av
// mässans storlek det året, monterns storlek och hur starkt det som visas är; de ger fans och intäkter på plats, hype åt
// det pågående spelet, ett försäljningslyft på visade spel i åtta veckor och efterfrågan på visad hårdvara. All slump
// kommer ur fröet och året (aldrig G.rng), och att hoppa över mässan rör ingenting.
// v133: ovanpå monter och urval kan spelaren lägga ett program (exposhow.js): presentation på scen med löfte, demo eller smygsläpp,
// trailer, ett möte med en rival och en stunt. Mässan får också priser och pressens dom, som flyttar försäljningslyftet. Ett program
// med bara nollor ger samma mässa som förut (förutom priser och dom), och slumpföljden i runExpo är oförändrad.
export const BOOTHS = [
  null,
  { id: 1, slots: 1, base: 1500, share: 0.0075, hall: 0.05, hype: 8, show: 0.7 },
  { id: 2, slots: 2, base: 3500, share: 0.012, hall: 0.1, hype: 12, show: 1 },
  { id: 3, slots: 3, base: 6000, share: 0.02, hall: 0.18, hype: 16, show: 1.4 },
];
export const EXPO_LIFT_WEEKS = 8;
// Besökare på hela mässan: 3 000 år 1983, med 7,5 % tillväxt per år
export const expoAttendance = (year) => Math.round(3000 * Math.pow(1.075, Math.max(0, year - 1983)));
export function expoCost(G, level) {
  const B = BOOTHS[level];
  return B ? Math.round(promoPrice(G, B.base, B.share) / 50) * 50 : 0;
}

export function expoOffer(G) {
  if (!G.u.flags.expo) return false;
  G.pending.push({ type: 'expo', id: G.uid++ });
  return true;
}

// Styrkan hos det som visas, 0–1
const gameQ = (g) => clamp((g.score - 5.5) / 4, 0, 1);
function devQ(G, J) {
  const gs = G.games.slice(-3);
  const avg = gs.length ? gs.reduce((s, g) => s + g.score, 0) / gs.length : 6;
  return clamp(0.25 + (0.5 * J.hype) / 100 + (avg - 6) / 10, 0.1, 1);
}
const hwQ = (G, P) => clamp((scoreOf(G, P) - 5.5) / 4, 0, 1);
export const itemKey = (x) => x.k + ':' + x.id;

// Det som går att visa upp just nu, med styrka (q)
export function expoItems(G) {
  const out = [];
  for (const b of buildsOf(G)) if (b.J.state === 'dev') out.push({ k: 'dev', id: b.J.id, q: devQ(G, b.J), name: b.J.title, team: b.team ? teamName(b.team) : null });
  const selling = G.games.filter((g) => !g.ended && !g.live && !g.expansionOf).sort((a, b) => b.t - a.t).slice(0, 4);
  for (const g of selling) out.push({ k: 'game', id: g.id, q: gameQ(g), name: g.title });
  const ps = ((G.hw && G.hw.products) || []).filter((p) => p.state === 'market').slice(0, 3);
  for (const P of ps) out.push({ k: 'hw', id: P.id, q: hwQ(G, P), name: P.name, type: P.type });
  const lg = liveGames(G).sort((a, b) => b.live.subs - a.live.subs)[0];
  if (lg) out.push({ k: 'live', id: lg.id, q: clamp(lg.live.fresh / 100, 0, 1), name: lg.title });
  return out;
}
// Förslag: de starkaste sakerna (det pågående spelet väger lite extra, det bygger hype)
export function defaultPicks(items, slots) {
  return items
    .map((x) => ({ x, v: x.q + (x.k === 'dev' ? 0.3 : 0) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, slots)
    .map((e) => e.x);
}
export function expoBuzz(G, picks) {
  const q = picks.length ? picks.reduce((a, x) => a + x.q, 0) / picks.length : 0.3;
  return 0.6 + 0.9 * q + 0.14 * Math.log10(1 + G.fans / 150);
}
// Väntade besökare och kostnad för en monter, ett urval och ett program (för planeringsvyn). cost = monter + program.
export function expoForecast(G, level, picks, plan) {
  const B = BOOTHS[level];
  const att = expoAttendance(yearOf(G.t));
  const pl = normPlan(level, picks, plan);
  const buzz = expoBuzz(G, picks) + planBuzz(pl);
  const booth = expoCost(G, level);
  const parts = planCosts(booth, pl);
  return { attendance: att, buzz, visitors: Math.round(att * B.hall * buzz * planCrowd(pl)), cost: booth + parts.total, booth, parts, plan: pl };
}

// Genomför mässan. ids = nycklar (itemKey) för det som visas, annars förslaget. plan = programmet (se exposhow.js), annars inget extra.
// Resultatet läggs i G.expoLast och i historiken G.expoHist.
export function resolveExpo(G, promptId, level, ids, plan) {
  const i = G.pending.findIndex((p) => p.id === promptId && p.type === 'expo');
  if (i < 0) return false;
  const B = BOOTHS[level];
  if (!B) {
    G.pending.splice(i, 1);
    return true;
  }
  const all = expoItems(G);
  const picks = (ids ? ids.map((k) => all.find((x) => itemKey(x) === k)).filter(Boolean) : defaultPicks(all, B.slots)).slice(0, B.slots);
  const pl = normPlan(level, picks, plan);
  const parts = planCosts(expoCost(G, level), pl);
  const cost = expoCost(G, level) + parts.total;
  if (G.money < cost) return t('err.money'); // prompten ligger kvar så att ett annat val går att göra
  G.pending.splice(i, 1);
  spend(G, cost, 'marketing');
  const J = G.job && G.job.kind === 'game' ? G.job : null;
  if (J) J.cost += cost;
  G.expoLast = runExpo(G, B, picks, cost, pl, parts);
  const r = G.expoLast;
  recordShow(G, r);
  const won = r.prizes.filter((p) => p.win).length;
  if (won) note(G, 'news.expoPrize', { year: r.year, n: won }, 'good', true);
  note(G, 'news.expo', { year: r.year, n: fmtFull(r.visitors), fans: fmtNum(r.fans) }, 'good', true);
  emit('expoDone', { level, visitors: r.visitors });
  return true;
}

function runExpo(G, B, picks, cost, plan, parts) {
  const year = yearOf(G.t);
  const rng = seeded(hashStr(`${G.seed || 0}:expo:${year}`));
  const roll = (tag) => expoRoll(G, year, tag);
  const K = KEYNOTES[plan.keynote];
  const DM = DEMOS[plan.demo];
  const TR = TRAILERS[plan.trailer];
  const att = expoAttendance(year);
  const q = picks.length ? picks.reduce((a, x) => a + x.q, 0) / picks.length : 0.3;
  const hasDev = picks.some((x) => x.k === 'dev');
  const hwPicks = picks.filter((x) => x.k === 'hw');
  // det som kan gå åt ena eller andra hållet i programmet avgörs här, med nycklar som bara hör till mässan och året
  const trailerHit = TR.hit > 0 && roll('trailer') < TR.hit;
  const celeb = plan.stunt === 3 ? roll('celeb') < CELEB_P : null;
  const buzz = expoBuzz(G, picks) + TR.buzz + (trailerHit ? 0.06 : 0) + (celeb === true ? 0.12 : 0);
  const visitors = Math.max(20, Math.round(att * B.hall * buzz * planCrowd(plan) * (0.88 + 0.24 * rng())));
  const lines = [{ k: 'open', n: fmtFull(att) }];
  beat(G, 'expoOpen', { a: att, v: att > 20000 ? 1 : 0 });
  const items = [];
  let fanBonus = 0;
  let fanLoss = 0;
  let mood = 0; // hur programmet föll ut, -1 till 1 (går in i pressens dom)
  // presentationen på scen: publiken jublar, är artig eller tyst beroende på hur starkt det visade är
  let react = null;
  if (K) {
    const title = picks.length ? picks[0].name : G.studio;
    const ks = 0.6 * q + 0.4 * roll('keynote');
    react = ks >= KEY_REACT[1] ? 2 : ks < KEY_REACT[0] ? 0 : 1;
    lines.push({ k: 'keynote' + K.id, title }, { k: 'react' + react });
    beat(G, 'expoKeynote', { g: title, a: K.id, v: K.id - 1 });
    beat(G, 'expoCrowd', { a: visitors, v: 2 - react });
    if (react === 2) {
      fanBonus += 0.15 * K.id;
      mood += 0.4;
    } else if (react === 0) {
      fanLoss += 0.06 * K.id;
      mood -= 0.4;
    }
  }
  if (TR.id) {
    lines.push({ k: 'trailer' + TR.id });
    if (trailerHit) {
      lines.push({ k: 'trailerHit' });
      mood += 0.5;
    }
    beat(G, 'expoTrailer', { v: trailerHit ? 2 : TR.id - 1 });
  }
  const keyMult = 1 + 0.1 * (K ? K.id : 0); // scenen sätter också de visade sakerna i rampljuset
  const talks = {}; // Snacket (hype.js) som programmet ger varje spel i utveckling, per bygge och källa
  const tk = (id, k, v) => {
    if (v) (talks[id] || (talks[id] = {}))[k] = ((talks[id] || {})[k] || 0) + v;
  };
  let devSeen = 0; // fler än ett bygge kan visas: de får egna utfall (det första behåller de gamla slumpnycklarna)
  const contest = plan.stunt === 2 ? 1.25 : 1;
  for (const x of picks) {
    const row = { k: x.k, id: x.id, name: x.name, q: x.q };
    if (x.k === 'dev') {
      const bd = buildById(G, x.id);
      const J = bd && bd.J.state === 'dev' ? bd.J : null;
      const nth = devSeen++;
      if (bd && bd.team) row.team = teamName(bd.team);
      const ratio = J ? J.bugs / SCOPES[J.scope].bugs : 0;
      const u = J ? rng() : 1;
      const hv = clamp(buzz, 0.8, 1.4);
      let add = 0;
      if (J && plan.demo === 2) {
        // smygsläpp: demon ges till alla. Få buggar ger jubel (och gratis felsökning), många ger ett pinsamt hopkok
        const good = roll(nth ? 'drop:' + x.id : 'drop') < dropChance(ratio);
        row.drop = good ? 'hit' : 'flop';
        if (good) {
          add = B.hype * 1.6 * hv;
          tk(x.id, 'demo', EXPO_TALK.drop);
          fanBonus += 0.5;
          mood += 0.6;
          J.bugs *= 0.88;
          lines.push({ k: 'dropHit', title: x.name });
        } else {
          add = B.hype * 0.4 * hv;
          tk(x.id, 'demo', EXPO_TALK.dropFlop);
          J.hype = Math.max(0, J.hype - 3);
          fanLoss += 0.25;
          mood -= 0.6;
          J.bugs *= 0.94;
          lines.push({ k: 'dropFlop', title: x.name });
        }
        beat(G, 'expoDemo', { g: x.name, v: good ? 2 : 3 });
      } else if (J && u < clamp((ratio - 0.5) * 0.8, 0, 0.5) * (DM.crash ?? 1)) {
        J.hype = Math.max(0, J.hype - 5);
        tk(x.id, 'demo', EXPO_TALK.crash);
        row.crash = true;
        fanLoss += 0.3;
        mood -= 0.5;
        lines.push({ k: 'crash', title: x.name });
        beat(G, 'expoDemo', { g: x.name, v: 1 });
      } else if (J) {
        add = B.hype * hv * (DM.hype ?? 1);
        tk(x.id, 'demo', (EXPO_TALK.demo + EXPO_TALK.demoQ * x.q) * (DM.hype ?? 1));
        lines.push({ k: 'demo', title: x.name });
        beat(G, 'expoDemo', { g: x.name, v: 0 });
      }
      if (J && K) {
        // presentationen lägger på förväntan (och ett löfte som prövas vid släppet)
        add += B.hype * K.hype * hv * (react === 2 ? 1.2 : react === 0 ? 0.6 : 1);
        J.promise = { bar: K.bar, tone: K.id, pen: K.pen, keep: K.keep, y: year };
        row.promise = K.bar;
        tk(x.id, 'stage', EXPO_TALK.stage[K.id] * EXPO_TALK.react[react]);
        logBuild(G, J, 'stage', K.id, react);
      }
      if (J && TR.id) tk(x.id, 'trailer', trailerHit ? EXPO_TALK.trailerHit : EXPO_TALK.trailer[TR.id]);
      if (J && celeb === true) tk(x.id, 'celeb', EXPO_TALK.celeb);
      if (J) logBuild(G, J, 'demo', 0, row.drop === 'hit' ? 2 : row.drop === 'flop' ? 3 : row.crash ? 1 : 0);
      if (J && add > 0) {
        row.hype = prGain(J.hype, add); // själva uppmärksamheten räknas som reklam (till 100), det som växer vidare är Snacket
        J.hype += row.hype;
      }
    } else if (x.k === 'game') {
      const g = G.games.find((y) => y.id === x.id);
      if (g) {
        let lift = (0.04 + 0.1 * x.q) * B.show * clamp(buzz, 0.7, 1.5);
        if (rng() < 0.12 + 0.2 * x.q + TR.viral) {
          row.viral = true;
          lift *= 1.7;
          fanBonus += 0.5;
          lines.push({ k: 'viral', title: x.name });
        } else lines.push({ k: 'sold', title: x.name });
        row.lift = lift * keyMult * contest; // pressens dom läggs på efteråt
      }
    } else if (x.k === 'hw') {
      const P = ((G.hw && G.hw.products) || []).find((y) => y.id === x.id);
      if (P) {
        row.lift = 0.07 * B.show * clamp(buzz, 0.8, 1.4) * keyMult * contest;
        lines.push({ k: 'hw', name: x.name, n: fmtFull(Math.round(visitors * Math.min(0.8, 0.45 * Math.sqrt(picks.length) * ((0.3 + x.q) / picks.reduce((a, y) => a + 0.3 + y.q, 0))))) });
      }
    } else if (x.k === 'live') {
      const g = G.games.find((y) => y.id === x.id);
      if (g && g.live) {
        row.fresh = Math.round(6 * B.show);
        g.live.fresh = Math.min(100, g.live.fresh + row.fresh);
        lines.push({ k: 'live', title: x.name });
      }
    }
    items.push(row);
  }
  // rivalernas montrar: namn till hallens vy och en rad om vad en av dem visar
  const comps = (G.comps || []).filter((c) => !c.owned);
  const rival = comps.length ? comps[Math.floor(rng() * comps.length)] : null;
  const last = rival ? G.market.releases.filter((r) => r.comp === rival.id && r.t <= G.t).slice(-1)[0] : null;
  if (rival) lines.push(last && last.title ? { k: 'rival', studio: rival.name, title: last.title } : { k: 'rival0', studio: rival.name });
  // mötet med en rival i hallen: ärkerivalen om du har en, annars den som visas ovan
  let meet = null;
  const mr = plan.meet ? rivalOf(G) || rival : null;
  if (mr) {
    const C = crisisOf(G);
    if (plan.meet === 1) {
      C.heat = clamp(C.heat - 4, 0, 100);
      fanBonus += 0.1;
      meet = 'friend';
      lines.push({ k: 'meetFriend', studio: mr.name });
      const wk = mr.next ? releaseWeek(mr) - G.t : 0;
      if (wk > 0 && wk <= 24) lines.push(mr.next.title ? { k: 'intel', studio: mr.name, title: mr.next.title, n: wk } : { k: 'intel0', studio: mr.name, n: wk });
    } else {
      const win = roll('meet') < clamp(0.5 + (q - rivalForm(G, mr, year)), 0.15, 0.85);
      meet = win ? 'win' : 'lose';
      C.heat = clamp(C.heat + (win ? 3 : 1), 0, 100);
      if (win) {
        fanBonus += 0.35;
        mood += 0.4;
      } else {
        fanLoss += 0.15;
        mood -= 0.3;
      }
      lines.push({ k: win ? 'meetWin' : 'meetLose', studio: mr.name });
    }
    beat(G, 'expoMeet', { g: mr.name, v: meet === 'friend' ? 0 : meet === 'win' ? 1 : 2 });
  }
  // stunten
  let revMult = 1;
  if (plan.stunt === 1) {
    fanBonus += 0.25;
    revMult = 0.8;
    mood += 0.15;
    lines.push({ k: 'giveaway' });
    beat(G, 'expoStunt', { v: 0 });
  } else if (plan.stunt === 2) {
    fanBonus += 0.1;
    mood += 0.3;
    lines.push({ k: 'contest' });
    beat(G, 'expoStunt', { v: 1 });
  } else if (plan.stunt === 3) {
    if (celeb) {
      fanBonus += 0.6;
      mood += 0.5;
    } else {
      fanLoss += 0.15;
      mood -= 0.5;
    }
    lines.push({ k: celeb ? 'celebHit' : 'celebMiss' });
    beat(G, 'expoStunt', { v: celeb ? 2 : 3 });
  }
  if (visitors > att * B.hall * 1.25) lines.splice(1, 0, { k: 'queue' });
  if (year >= 2010 && G.fans > 20000 && rng() < 0.5) lines.push({ k: 'streamer' });
  if (buzz > 1.5) lines.push({ k: 'press' });
  // mässpriserna och pressens dom
  const Jh = picks.reduce((m, x) => (x.k === 'dev' ? Math.max(m, (buildById(G, x.id) || { J: { hype: 0 } }).J.hype) : m), 0);
  const prizes = prizeBoard(G, year, { level: B.id, plan, q, buzz, hype: Jh, hwQ: hwPicks.reduce((m, x) => Math.max(m, x.q), 0), hasDev, hasHw: hwPicks.length > 0, nPicks: picks.length, trailerHit: trailerHit ? 1 : 0, celeb });
  const won = prizes.filter((p) => p.win);
  won.forEach((p, n) => {
    lines.push({ k: 'prize_' + p.id });
    beat(G, 'expoPrize', { v: EXPO_PRIZES.indexOf(p.id), a: n + 1 });
  });
  // betyget: hur vi står mot rivalerna i prisklasserna, hur starkt det visade är och hur programmet föll ut
  const rel = prizes.reduce((a, p) => a + p.ours - p.theirs, 0) / Math.max(1, prizes.length);
  const R = 0.5 + 0.7 * rel + 0.25 * (q - 0.5) + 0.15 * clamp(mood, -1, 1);
  const tier = verdictTier(R);
  const vm = EXPO_VERDICT.lift[tier];
  lines.push({ k: 'verdict' + tier });
  beat(G, 'expoVerdict', { v: tier, a: Math.round(R * 100) });
  lines.push({ k: 'close', n: fmtFull(visitors) });
  beat(G, 'expoClose', { a: visitors, v: visitors > att * B.hall * 1.25 ? 1 : 0 });
  // domen flyttar försäljningslyftet och förväntan, sedan läggs lyften på de visade sakerna
  let dh = 0;
  let talkPct = 0; // vad programmet gav i Snack (första bygget), procent i veckan
  let firstTalk = null;
  for (const row of items) {
    if (row.k === 'game') {
      const g = G.games.find((y) => y.id === row.id);
      if (g && row.lift != null) {
        row.lift *= vm;
        g.expo = { until: G.t + EXPO_LIFT_WEEKS, mult: 1 + row.lift };
      }
    } else if (row.k === 'hw') {
      const P = ((G.hw && G.hw.products) || []).find((y) => y.id === row.id);
      if (P && row.lift != null) {
        row.lift *= vm;
        P.boost = Math.min(0.3, (P.boost || 0) + row.lift);
      }
    } else if (row.k === 'dev') {
      const bd = buildById(G, row.id);
      if (!bd) continue;
      const J = bd.J;
      dh = EXPO_VERDICT.hype[tier];
      J.hype = Math.max(0, J.hype + dh);
      tk(row.id, 'prize', EXPO_TALK.prize * won.length);
      tk(row.id, 'press', EXPO_TALK.verdict[tier]);
      const talk = talks[row.id] || {};
      for (const k of Object.keys(talk)) addTalk(J, k, talk[k]);
      row.talk = talk;
      row.talkPct = talkWeekly(J, Object.values(talk).reduce((a, v) => a + v, 0));
      if (!talkPct) talkPct = row.talkPct; // det första bygget står för resultatets sammanfattning
      if (!firstTalk) firstTalk = talk;
      logBuild(G, J, 'press', tier, won.length);
    }
  }
  const fans = Math.max(0, Math.round((visitors * 0.1 * (0.6 + 0.8 * q) * (1 + fanBonus) * (1 - Math.min(0.6, fanLoss)) + won.length * visitors * EXPO_PRIZE_FANS) * EXPO_VERDICT.fans[tier]));
  const revenue = Math.round(visitors * priceOf(year) * 0.2 * (0.5 + q) * revMult);
  G.fans += fans;
  earn(G, revenue, 'events');
  return {
    year, level: B.id, cost, attendance: att, visitors, fans, revenue, buzz, items, lines,
    rivals: comps.slice(0, 6).map((c) => ({ name: c.name, color: c.color })),
    t: G.t, plan, parts, prizes,
    verdict: { tier, r: Math.round(R * 100) / 100, lift: vm, hype: dh, fans: EXPO_VERDICT.fans[tier] },
    trailerHit, celeb, react, meet, talk: firstTalk || {}, talkPct,
  };
}
