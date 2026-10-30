// Beteende för Studiohuset (v2): personalen använder L.rooms/L.stations för möten, kaffe, lounge, serverbesök, whiteboard,
// parprogrammering och pauser. Ren logik utan DOM (körs även i Node, se test/behavior.mjs). Scene äger aktörerna
// (scene.actors) och ritningen, den här modulen flyttar dem och väljer pose.
//
// Aktörens tillstånd: 'work' (vid skrivbordet), 'enter' / 'leave' (in från och ut genom fasaddörren), 'go' (på väg till en
// plats), 'at' (framme, aktiviteten pågår) och 'walkto' (tillbaka till skrivbordet). Alla rör sig bara på sin egen våning.
// Skiljeväggar mellan rum är automatiska glasdörrar som glider upp när någon närmar sig (se drawDoors).

import { clamp } from '../core/util.js';
import { getSprite } from './sprites.js';

const WALK = 26; // px/s, som det gamla beteendet
const GAP = 10; // två personer står aldrig närmare än så vid stationerna
const DOOR_R = 11; // dörren öppnas när någon går närmare än så
const ARRIVE_MAX = 16; // s: längsta väntan på att alla i en grupp kommit fram
const WALK_MAX = 70; // s: en vandring som tar längre än så avbryts (inga fastlåsta tillstånd)

const rand = (S, lo, hi) => lo + S.rnd() * (hi - lo);
const pickOf = (S, arr) => arr[Math.floor(S.rnd() * arr.length)];
const shuffle = (S, arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(S.rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Samma regel som drawShellV2 (rooms.js): lobbyns öppna valv är redan en dörröppning, övriga väggar får glidande dörrar.
const archBetween = (a, b) => b.type !== 'facility' && a.type !== 'server' && b.type !== 'server' && a.type === 'lobby';

// Hur personalen fördelas på skrivborden: tre per våning först (mitten, nere, uppe), sedan resten. Då räcker även små team
// för ett möte (tre på samma våning) och alla våningar får liv.
export function deskOrder(L) {
  if (!L.v2) return L.desks.map((d) => d.idx);
  const per = [];
  for (let f = 0; f < L.floors; f++) per.push(L.desks.filter((d) => d.floor === f).map((d) => d.idx));
  const floors = L.floors === 3 ? [1, 0, 2] : per.map((_, f) => f);
  const out = [];
  for (const [lo, hi] of [[0, 3], [3, 99]]) for (const f of floors) for (let k = lo; k < Math.min(hi, per[f].length); k++) out.push(per[f][k]);
  return out;
}

// Navigationsdata per våning (beräknas en gång per layout).
export function makeNav(L) {
  const floors = [];
  for (let f = 0; f < L.floors; f++) {
    const rooms = L.rooms.filter((r) => r.floor === f).sort((a, b) => a.x0 - b.x0);
    const dk = L.desks.find((d) => d.floor === f);
    floors.push({
      f,
      fy: dk ? dk.fy : -4 - f * L.pitch,
      rooms,
      parts: rooms.slice(1).map((r, i) => ({ x: r.x0, arch: archBetween(rooms[i], r) })),
      st: L.stations.filter((s) => s.floor === f),
    });
  }
  return { floors, order: deskOrder(L) };
}

export function makeCrowd(scene, rnd = Math.random) {
  const L = scene.L;
  const nav = makeNav(L);
  const n = L.floors;
  return {
    nav,
    rnd,
    acts: [],
    occ: new Map(), // plats-id -> { spot, id } (reserverade platser)
    nextId: 1,
    floorT: Array.from({ length: n }, () => 1 + rnd() * 3),
    meetT: Array.from({ length: n }, () => 10 + rnd() * 25),
    dueT: Array.from({ length: n }, () => 0), // hur länge ett möte väntat på att bli av
    kick: 0, // sekunder kvar: sätts när ett projekt byter fas, då prioriteras nästa möte på mötesvåningen
    jobKey: undefined,
    emoT: 6 + rnd() * 6,
    doors: nav.floors.map((fl) => fl.parts.map((p) => ({ x: p.x, arch: p.arch, open: 0, hold: 0 }))),
  };
}

// ── Platser ──
const stationsIn = (S, f, type) => S.nav.floors[f].st.filter((s) => s.room === `f${f}-${type}`);
const crowded = (S, s) => {
  for (const o of S.occ.values()) if (o.spot.floor === s.floor && Math.abs(o.spot.x - s.x) < GAP) return true;
  return false;
};
const isFree = (S, s) => !!s && !crowded(S, s);
const take = (S, s, a) => S.occ.set(s.id, { spot: s, id: a.id });
const sitsAt = (s) => s.kind === 'seat' || s.kind === 'sofa';

// den som lyssnar och står antecknar, med den ritade posen
const notes = () => (getSprite('char.notes') ? 'notes' : 'stand');

// Anläggningar (slots) på en våning: samma punkt som det gamla beteendet (slot.x + 14).
function facSpots(S, scene, f) {
  const out = [];
  for (const [id, fc] of Object.entries(scene.G.office.fac)) {
    const slot = scene.L.slots[fc.slot];
    if (!slot || slot.floor !== f) continue;
    const pose = { coffee: 'drink', gameroom: 'cheer', training: notes(), lab: 'laptop', qa: 'laptop', marketing: 'present', server: 'laptop' }[id] || 'stand';
    // spelrummet: med den ritade spelposen står man vänd mot arkadmaskinen (som ritas på slot.x+3 till +16) med händerna på panelen
    if (id === 'gameroom' && getSprite('char.play')) out.push({ id: `fac-${id}`, kind: 'fac', fid: id, x: slot.x + 21, fy: slot.fy, floor: f, dir: -1, pose: 'play', room: `f${f}-facility${fc.slot}` });
    else out.push({ id: `fac-${id}`, kind: 'fac', fid: id, x: slot.x + 14, fy: slot.fy, floor: f, dir: 1, pose, room: `f${f}-facility${fc.slot}` });
  }
  return out;
}

// ── Aktiviteter ──
// slots(): platser i fyllnadsordning med roll. min/max: antal deltagare. dur: sekunder. w: [under utveckling, i tomgång].
// face: 'partner' = de som står vänder sig mot varandra, annars platsens egen riktning.
const KINDS = {
  meeting: {
    min: 3, max: 5, dur: [18, 30], w: [1.2, 1.7], face: 'fixed',
    slots(S, f) {
      const st = stationsIn(S, f, 'meeting');
      const present = st.find((s) => s.kind === 'stand' && s.pose === 'present');
      const seats = st.filter((s) => s.kind === 'seat');
      const stand = st.find((s) => s.kind === 'stand' && s !== present);
      const board = st.find((s) => s.kind === 'board');
      return [[present, 'present'], [seats[0], 'seat'], [seats[1], 'seat'], [stand, 'stand'], [board, 'board']];
    },
  },
  lounge: {
    min: 2, max: 3, dur: [11, 22], w: [1.2, 2.6], face: 'fixed',
    slots(S, f) {
      const st = stationsIn(S, f, 'lounge');
      const sofa = st.filter((s) => s.kind === 'sofa');
      return [[sofa[0], 'sofa'], [sofa[1], 'sofa'], [sofa[2], 'sofa'], [st.find((s) => s.kind === 'stand'), 'stand']];
    },
  },
  lobby: {
    min: 2, max: 2, dur: [8, 15], w: [0.7, 1.6], face: 'partner',
    slots(S, f) {
      const st = stationsIn(S, f, 'lobby');
      return [[st.find((s) => s.kind === 'reception'), 'talk'], [st.find((s) => s.kind === 'stand'), 'talk']];
    },
  },
  // receptionisten tar ett samtal (bara med den ritade telefonposen), vänd som platsen så att disken är framför
  phone: {
    min: 1, max: 1, dur: [7, 13], w: [0.5, 0.9], face: 'fixed',
    slots(S, f) {
      if (!getSprite('char.phone')) return [];
      return [[stationsIn(S, f, 'lobby').find((s) => s.kind === 'reception'), 'phone']];
    },
  },
  coffee: {
    min: 1, max: 2, dur: [8, 14], w: [2.2, 2], face: 'partner',
    slots(S, f) {
      const st = stationsIn(S, f, 'kitchen');
      return [[st.find((s) => s.kind === 'coffee'), 'coffee'], [st.find((s) => s.kind === 'stand'), 'talk']];
    },
  },
  server: {
    min: 1, max: 2, dur: [10, 17], w: [1.2, 0.8], face: 'fixed',
    slots(S, f) {
      const st = stationsIn(S, f, 'server');
      const lap = [st.find((s) => s.pose === 'laptop'), 'laptop'];
      // med den ritade skruvposen skruvar den andra i racket, och ibland är det det enda som behövs
      if (!getSprite('char.fix')) return [lap, [st.find((s) => s.pose !== 'laptop'), 'watch']];
      const fix = [st.find((s) => s.pose !== 'laptop'), 'fix'];
      return S.rnd() < 0.4 ? [fix, lap] : [lap, fix];
    },
  },
  board: {
    min: 2, max: 3, dur: [13, 24], w: [1.4, 1.2], face: 'fixed',
    slots(S, f) {
      const st = stationsIn(S, f, 'whiteboard');
      const b = st.filter((s) => s.kind === 'board');
      return [[b[0], 'board'], [b[1], 'board'], [st.find((s) => s.kind === 'stand'), 'stand']];
    },
  },
  window: {
    min: 1, max: 1, dur: [6, 12], w: [0.6, 1.3], face: 'fixed',
    slots(S, f) {
      const st = S.nav.floors[f].st.filter((s) => s.kind === 'window');
      return st.length ? [[pickOf(S, st), 'window']] : [];
    },
  },
  sofa: {
    min: 1, max: 1, dur: [15, 28], w: [0.4, 1.2], face: 'fixed',
    slots(S, f) {
      const st = stationsIn(S, f, 'lounge').filter((s) => s.kind === 'sofa');
      return st.length ? [[pickOf(S, st), 'laptop']] : [];
    },
  },
  // handslag när en affär blir klar (startas av Scene.deal, aldrig av slumpen): framför mötesbordet, annars i lobbyn.
  // Paret står 16 px isär så att de ritade händerna möts mitt emellan.
  deal: {
    min: 2, max: 2, dur: [5, 7], w: [0, 0], face: 'fixed',
    slots(S, f) {
      if (!getSprite('char.shake')) return [];
      const at = stationsIn(S, f, 'meeting').find((s) => s.kind === 'stand' && s.pose === 'present') || stationsIn(S, f, 'lobby').find((s) => s.kind === 'stand');
      if (!at) return [];
      return [[{ ...at, id: `${at.id}-deal1`, x: at.x - 8, dir: 1, pose: 'shake' }, 'shake'], [{ ...at, id: `${at.id}-deal2`, x: at.x + 8, dir: -1, pose: 'shake' }, 'shake']];
    },
  },
  fac: {
    min: 1, max: 2, dur: [6, 12], w: [0.5, 0.9], face: 'partner',
    slots(S, f, scene) {
      const sp = facSpots(S, scene, f);
      if (!sp.length) return [];
      const s = pickOf(S, sp);
      return [[s, 'fac'], [{ ...s, id: s.id + '-2', x: s.x + 15, dir: -1, pose: 'stand' }, 'talk']];
    },
  },
};

function floorActors(scene, f) {
  const out = [];
  for (const a of scene.actors.values()) if (a.floor === f && !a.leaving) out.push(a);
  return out;
}
const isFreeActor = (scene, a, trainingOf, force) => a.state === 'work' && !a.act && (force || a.cool <= 0) && a.hello <= 0 && !trainingOf(a) && !a.leaving;

// Skrivbordet till vänster om värden har plats för en besökare som står bakom stolen
function pairSpot(scene, S, host) {
  const L = scene.L;
  const d = L.desks[host.desk];
  const room = S.nav.floors[host.floor].rooms.find((r) => r.type === 'dev' && d.x >= r.x0 && d.x < r.x1);
  if (!room) return null;
  const x = d.x + 5 - 10;
  if (x < room.x0 + 12) return null;
  return { id: `pair-${host.id}`, kind: 'pair', x, fy: d.fy, floor: host.floor, dir: 1, pose: 'present', room: room.id };
}

function weightOf(S, kind, busy) {
  const k = KINDS[kind];
  return k.w[busy ? 0 : 1] ?? 1;
}

// Väljer och startar högst en ny aktivitet på våningen.
function schedule(S, scene, f, busy, crunch, trainingOf) {
  const fa = floorActors(scene, f);
  if (!fa.length) return false;
  const away = fa.filter((a) => a.state === 'go' || a.state === 'at' || a.state === 'walkto').length;
  const maxAway = busy ? (crunch ? 1 : Math.max(1, Math.floor(fa.length * 0.3 + 0.2))) : Math.max(1, Math.round(fa.length * 0.6));
  const free = shuffle(S, fa.filter((a) => isFreeActor(scene, a, trainingOf, S.force)));
  if (!free.length) return false;
  const hasRoom = stationsIn(S, f, 'meeting').length > 0;
  const kicked = S.kick > 0 && hasRoom;
  // dags för möte: inget annat startas på våningen förrän de som är borta kommit tillbaka och mötet kan börja
  const due = hasRoom && !crunch && !S.force && S.meetT[f] <= 0 && fa.length >= KINDS.meeting.min;
  if (due && away > 0 && !kicked) return false;
  const cand = [];
  let pairHost = null;
  for (const kind of Object.keys(KINDS)) {
    const K = KINDS[kind];
    let slots;
    if (S.only && kind !== S.only) continue;
    if (!weightOf(S, kind, busy) && S.only !== kind) continue; // handslaget startas bara av Scene.deal
    if (kind === 'meeting') {
      if (!kicked && !S.force && (S.meetT[f] > 0 || away > 0)) continue;
    } else if ((away >= maxAway && !S.force) || (due && !kicked)) continue;
    if (crunch && kind !== 'coffee' && kind !== 'server' && kind !== 'pair') continue;
    slots = [];
    for (const [s, role] of K.slots(S, f, scene)) {
      // upptagna platser och platser för nära en redan vald hoppas över
      if (!isFree(S, s) || slots.some(([c]) => Math.abs(c.x - s.x) < GAP)) continue;
      slots.push([s, role]);
    }
    const n = Math.min(K.max, slots.length, free.length);
    if (n < K.min) continue;
    let w = weightOf(S, kind, busy);
    if (kind === 'meeting') w = kicked ? 50 : due ? 100 : w * 2.5; // dags för möte
    cand.push({ kind, slots, w, n });
  }
  // parprogrammering: en kollega går bort till någons skrivbord
  if ((away < maxAway || S.force) && free.length >= 2 && (!S.only || S.only === 'pair')) {
    const hosts = shuffle(S, fa.filter((a) => a.state === 'work' && !a.act && a.hello <= 0 && !trainingOf(a)));
    for (const h of hosts) {
      const sp = pairSpot(scene, S, h);
      if (sp && isFree(S, sp) && free.some((a) => a !== h)) {
        pairHost = { h, sp };
        break;
      }
    }
    if (pairHost) cand.push({ kind: 'pair', slots: [[pairHost.sp, 'visit']], w: busy ? 2 : 0.5, n: 1, pairHost, dur: [11, 19] });
  }
  if (!cand.length) return false;
  let tot = 0;
  for (const c of cand) tot += c.w;
  let r = S.rnd() * tot;
  let pick = cand[cand.length - 1];
  for (const c of cand) {
    r -= c.w;
    if (r <= 0) {
      pick = c;
      break;
    }
  }
  const K = KINDS[pick.kind];
  let n = pick.n;
  if (S.force && S.nForce) n = Math.min(n, S.nForce);
  else if (pick.kind === 'lounge') n = Math.min(n, S.rnd() < 0.6 ? 2 : 3);
  else if (pick.kind === 'meeting') n = Math.min(n, 3 + Math.floor(S.rnd() * 3));
  else if (pick.kind === 'coffee' || pick.kind === 'server' || pick.kind === 'fac') n = Math.min(n, S.rnd() < 0.55 ? 1 : 2);
  else if (pick.kind === 'board') n = Math.min(n, S.rnd() < 0.5 ? 2 : 3);
  const slots = pick.slots.slice(0, n);
  let people = free.filter((a) => !pick.pairHost || a !== pick.pairHost.h);
  if (people.length < slots.length) return false;
  people = people.slice(0, slots.length);
  const act = {
    id: S.nextId++, kind: pick.kind, floor: f, state: 'gather', t: 0, gT: 0, age: 0,
    dur: rand(S, ...(pick.dur || K.dur)), speaker: 0, spT: 0, m: [], face: K ? K.face : 'fixed',
  };
  if (pick.pairHost) {
    const h = pick.pairHost.h;
    const hm = { a: h, s: null, role: 'host', i: 0, host: true, listen: 'sit' };
    act.m.push(hm);
    h.act = act;
    h.m = hm;
  }
  slots.forEach(([s, role], i) => {
    const a = people[i];
    const m = { a, s, role, i: act.m.length, listen: pickOf(S, ['sitIdle', 'sitIdle', 'drink', 'sit']) };
    act.m.push(m);
    take(S, s, a);
    a.act = act;
    a.m = m;
    a.state = 'go';
    a.carry = role === 'laptop' && pick.kind === 'server';
  });
  if (pick.kind === 'meeting') {
    S.meetT[f] = busy ? rand(S, 70, 120) : rand(S, 40, 70);
    S.dueT[f] = 0;
    S.kick = 0;
  }
  S.acts.push(act);
  return true;
}

// Slutför en aktivitet: alla går tillbaka till sina skrivbord.
function endAct(S, scene, act) {
  for (const m of act.m) {
    const a = m.a;
    if (m.s) S.occ.delete(m.s.id);
    if (a.act === act) {
      a.act = null;
      a.m = null;
      a.carry = a.carry && a.state !== 'leave'; // laptopen följer med tillbaka till skrivbordet
      a.cup = a.state !== 'leave' && (act.kind === 'coffee' || (act.kind === 'window' && m.listen === 'drink')); // och kaffemuggen
      a.cool = rand(S, 10, 26);
      if (!m.host && a.state !== 'leave') a.state = 'walkto';
    }
  }
  // idéer efter ett möte eller whiteboard
  if ((act.kind === 'meeting' || act.kind === 'board') && act.m.length && S.rnd() < 0.45) scene.emote(pickOf(S, act.m).a.id, 'bulb');
  S.acts = S.acts.filter((x) => x !== act);
}

// Tar bort en aktör ur sin aktivitet (avskedad, flyttad till annat skrivbord eller laget byts ut).
export function detach(S, scene, a) {
  if (!S) return;
  const act = a.act;
  if (act) {
    const m = act.m.find((x) => x.a === a);
    if (m && m.s) S.occ.delete(m.s.id);
    act.m = act.m.filter((x) => x.a !== a);
    // utan värd eller utan gäster är parprogrammeringen slut
    if (!act.m.filter((x) => !x.host).length || (m && m.host)) endAct(S, scene, act);
  }
  a.act = null;
  a.m = null;
  a.carry = false;
  a.cup = false;
}

// ── Poser ──
function frameOf(a, pose) {
  const t = a.t;
  switch (pose) {
    case 'walk': return Math.floor(t * 7 * a.spd) % 4;
    case 'laptop': return a.state === 'at' ? (Math.floor(t * 0.45) % 2) * 2 : Math.floor(t * 7 * a.spd) % 4; // står stilla vid racket
    case 'type': return Math.floor(t * 8 + a.id) % 4;
    case 'talk': return Math.floor(t * 4.2 + a.id) % 4;
    case 'present': return Math.floor(t * 3 + a.id) % 4;
    case 'drink': return [0, 1, 2, 2, 2, 1][Math.floor(t * 1.7 + a.id) % 6];
    case 'tired': return Math.floor(t * 1.4 + a.id) % 4;
    case 'wave': return Math.floor(t * 5) % 4;
    case 'cheer': return Math.floor(t * 5) % 2;
    case 'sit': return Math.floor(t * 6.5 + a.id) % 2;
    default: return Math.floor(t * 1.5 + a.id) % 2;
  }
}
function setPose(a, pose, seated) {
  a.pose = pose;
  a.seated = seated;
  a.frame = frameOf(a, pose);
}

// Vem som pratar just nu: en deltagare i taget, presentatören oftare.
function pickSpeaker(S, act) {
  const ms = act.m;
  const lead = ms.findIndex((m) => m.role === 'present' || m.role === 'host' || m.role === 'board' || m.role === 'laptop' || m.role === 'coffee');
  if (lead >= 0 && S.rnd() < 0.5) return lead;
  return Math.floor(S.rnd() * ms.length);
}

// Pose för en deltagare i en pågående aktivitet. speak = den här pratar nu.
function scriptPose(S, act, m, a) {
  const speak = act.speaker === m.i;
  const seated = !!m.s && sitsAt(m.s);
  switch (act.kind) {
    case 'meeting':
      if (m.role === 'present') return setPose(a, speak ? 'present' : 'stand', false);
      if (m.role === 'board') return setPose(a, speak ? 'present' : 'stand', false);
      if (m.role === 'seat') return setPose(a, speak ? 'talk' : m.listen === 'drink' ? 'drink' : 'sit', true);
      return setPose(a, speak ? 'talk' : notes(), false);
    case 'lounge':
      if (m.role === 'stand') return setPose(a, speak ? 'talk' : 'stand', false);
      return setPose(a, speak ? 'talk' : m.listen === 'sit' ? 'sitIdle' : m.listen, true);
    case 'lobby':
      return setPose(a, speak ? 'talk' : 'stand', false);
    case 'phone':
      return setPose(a, 'phone', false);
    case 'coffee':
      if (m.role === 'coffee') return setPose(a, speak && act.m.length > 1 ? 'talk' : 'drink', false);
      return setPose(a, speak ? 'talk' : 'drink', false);
    case 'server':
      if (m.role === 'laptop') return setPose(a, speak && act.m.length > 1 ? 'talk' : 'laptop', false);
      if (m.role === 'fix') return setPose(a, speak && act.m.length > 1 ? 'talk' : 'fix', false);
      return setPose(a, speak ? 'talk' : 'stand', false);
    case 'board':
      if (m.role === 'stand') return setPose(a, speak ? 'talk' : notes(), false);
      return setPose(a, speak ? 'present' : 'stand', false);
    case 'window':
      return setPose(a, m.listen === 'drink' ? 'drink' : 'stand', false);
    case 'sofa':
      return setPose(a, 'laptop', true);
    case 'fac':
      if (m.role === 'talk') return setPose(a, speak ? 'talk' : 'stand', false);
      return setPose(a, m.s.pose === 'cheer' ? (Math.floor(a.t * 0.6) % 2 ? 'cheer' : 'stand') : m.s.pose, false);
    case 'deal':
      return setPose(a, 'shake', false);
    case 'pair':
      if (m.host) return setPose(a, speak ? 'talk' : 'type', true);
      return setPose(a, speak ? 'talk' : 'present', false);
    default:
      return setPose(a, 'stand', seated);
  }
}

function faceTo(act, m, a) {
  if (act.m.length < 2 || m.s?.pose === 'play') return m.s ? m.s.dir : a.dir;
  if (act.face !== 'partner' && act.kind !== 'pair') return m.s ? m.s.dir : a.dir;
  if (act.kind === 'pair') return 1;
  // vänd mot den som pratar, annars mot närmaste kollega
  const sp = act.m[act.speaker];
  let o = sp && sp.a !== a ? sp.a : null;
  if (!o) {
    let best = 1e9;
    for (const q of act.m) if (q.a !== a && Math.abs(q.a.x - a.x) < best) {
      best = Math.abs(q.a.x - a.x);
      o = q.a;
    }
  }
  if (!o || Math.abs(o.x - a.x) < 1) return a.dir;
  return o.x > a.x ? 1 : -1;
}

function stepAct(S, scene, act, dt) {
  act.age += dt;
  const here = act.m.filter((m) => m.host || m.a.state === 'at');
  const need = act.m.length;
  if (act.state === 'gather') {
    act.gT += dt;
    if (here.length >= need || (here.length >= 1 && act.gT > ARRIVE_MAX) || act.age > ARRIVE_MAX * 2) {
      act.state = 'run';
      act.spT = 0;
    }
  } else {
    act.t += dt;
    act.spT -= dt;
    if (act.spT <= 0) {
      act.speaker = pickSpeaker(S, act);
      act.spT = rand(S, 2.4, 5.2);
    }
    if (act.t >= act.dur || act.age > act.dur + ARRIVE_MAX * 3) return endAct(S, scene, act);
  }
  for (const m of here) {
    const a = m.a;
    if (m.host) {
      if (act.state === 'run') scriptPose(S, act, m, a);
      continue;
    }
    if (act.state === 'run') {
      scriptPose(S, act, m, a);
      a.dir = faceTo(act, m, a);
    } else {
      setPose(a, m.s && sitsAt(m.s) ? 'sitIdle' : 'stand', !!m.s && sitsAt(m.s));
      a.dir = m.s ? m.s.dir : a.dir;
    }
  }
}

// ── Vid skrivbordet ──
// en kort sträckpaus stående vid stolen (två varv av den ritade posen), bara med spriten
const stretch = () => (getSprite('char.stretch') ? ['stretch', 8 / 3] : null);
function deskPose(S, a, st, dt, typing, crunch) {
  a.deskT -= dt;
  if (a.deskT <= 0 || !a.deskPose) {
    const mood = st ? st.mood : 70;
    const r = S.rnd();
    let pose;
    let dur;
    if (typing) {
      if (crunch) [pose, dur] = r < 0.78 ? ['type', rand(S, 5, 12)] : r < 0.9 ? ['tired', 2.8] : ['drink', 2.4];
      else if (r < 0.64) [pose, dur] = ['type', rand(S, 5, 13)];
      else if (r < 0.78) [pose, dur] = (r >= 0.75 && stretch()) || ['sit', rand(S, 2, 4.5)];
      else if (r < 0.88) [pose, dur] = ['think', rand(S, 2.2, 4.5)];
      else if (r < 0.95 || mood >= 55) [pose, dur] = ['drink', 3.4];
      else [pose, dur] = ['tired', 2.8];
    } else if (mood < 28 && r < 0.55) [pose, dur] = ['sleep', rand(S, 5, 10)];
    else if (r < 0.34) [pose, dur] = (r >= 0.3 && stretch()) || ['sitIdle', rand(S, 2, 5)];
    else if (r < 0.52) [pose, dur] = ['think', rand(S, 2.5, 5)];
    else if (r < 0.68) [pose, dur] = ['read', rand(S, 3, 7)];
    else if (r < 0.8) [pose, dur] = ['type', rand(S, 3, 6)];
    else if (r < 0.9) [pose, dur] = ['drink', 3.4];
    else [pose, dur] = [mood < 50 ? 'tired' : 'sitIdle', 2.8];
    a.deskPose = pose;
    a.deskT = dur;
    a.stretchT0 = a.t;
  }
  setPose(a, a.deskPose, a.deskPose !== 'stretch');
}

// ── Rörelse ──
function walk(a, tx, dt) {
  const v = WALK * a.spd * dt;
  const d = tx - a.x;
  a.dir = d >= 0 ? 1 : -1;
  a.seated = false;
  a.pose = a.carry ? 'laptop' : 'walk';
  a.frame = frameOf(a, a.pose);
  a.walkT += dt;
  if (Math.abs(d) <= v || a.walkT > WALK_MAX) {
    a.x = tx;
    return true;
  }
  a.x += Math.sign(d) * v;
  return false;
}

const trainerOf = (scene, staff) => (a) => {
  const st = staff.get(a.id);
  return !!st && st.trainUntil > scene.G.t;
};

// Startar en viss aktivitet på en våning direkt (tester, utvecklarsidor och skärmdumpar). n = antal deltagare (valfritt).
export function forceAct(scene, kind, f, n = 0) {
  const S = scene.crowd;
  const G = scene.G;
  S.only = kind;
  S.force = true;
  S.nForce = n;
  const ok = schedule(S, scene, f, !!G.job, false, trainerOf(scene, new Map(G.staff.map((s) => [s.id, s]))));
  S.only = null;
  S.force = false;
  S.nForce = 0;
  return ok;
}

// Hur en aktör ska hanteras på v2-layouten. Anropas av Scene.updateActors varje bildruta.
export function updateCrowd(scene, dt) {
  const S = scene.crowd;
  const G = scene.G;
  const L = scene.L;
  const busy = !!G.job;
  const typing = busy && !scene.paused;
  const crunch = busy && !!G.job.crunch;
  const staff = new Map(G.staff.map((s) => [s.id, s]));
  const trainingOf = trainerOf(scene, staff);
  // projektet byter fas eller avslutas: kickoff-möte
  const jk = G.job ? `${G.job.id}:${G.job.phase}:${G.job.state}` : '';
  if (S.jobKey === undefined) S.jobKey = jk;
  else if (jk !== S.jobKey) {
    S.jobKey = jk;
    S.kick = 25;
  }
  scene.syncActors(false);
  S.kick = Math.max(0, S.kick - dt);
  for (let f = 0; f < S.meetT.length; f++) {
    S.meetT[f] -= dt;
    if (S.meetT[f] > 0) continue;
    // ett möte som inte blivit av på 40 s (för få lediga) skjuts upp en stund
    S.dueT[f] += dt;
    if (S.dueT[f] > 40) {
      S.dueT[f] = 0;
      S.meetT[f] = rand(S, 12, 30);
    }
  }

  // schemaläggning per våning
  for (let f = 0; f < S.nav.floors.length; f++) {
    S.floorT[f] -= dt;
    if (S.floorT[f] > 0) continue;
    const ok = schedule(S, scene, f, busy, crunch, trainingOf);
    S.floorT[f] = ok ? (busy ? rand(S, 6, 14) : rand(S, 2, 5)) : rand(S, 1.2, 2.5);
  }
  for (const act of S.acts.slice()) stepAct(S, scene, act, dt);

  for (const a of [...scene.actors.values()]) {
    const st = staff.get(a.id);
    a.t += dt;
    a.blink = (a.t * 10) % 40 < 1 ? 1 : 0;
    if (a.leaving && a.state !== 'leave') {
      detach(S, scene, a);
      a.state = 'leave';
    }
    a.cool = Math.max(0, a.cool - dt);
    if (a.emoCool > 0) a.emoCool -= dt;
    if (a.hello > 0) a.hello -= dt;
    const dk = L.desks[a.desk];
    const dx = dk ? dk.x + 5 : a.x;
    const lane = a.state === 'work' || a.state === 'at' ? 0 : 1;
    a.ly += clamp(lane - a.ly, -dt * 6, dt * 6);
    if (a.state === 'enter' || a.state === 'walkto' || a.state === 'leave' || a.state === 'go') {
      let tx = dx;
      if (a.state === 'leave') tx = L.left - 14;
      else if (a.state === 'go') tx = a.m ? a.m.s.x : dx;
      if (a.state === 'go' && !a.m) a.state = 'walkto';
      if (walk(a, tx, dt)) {
        a.walkT = 0;
        if (a.state === 'leave') {
          scene.actors.delete(a.id);
        } else if (a.state === 'go') {
          a.state = 'at';
          a.dir = a.m.s.dir;
          setPose(a, a.m.s && sitsAt(a.m.s) ? 'sitIdle' : 'stand', !!a.m.s && sitsAt(a.m.s));
        } else {
          if (a.state === 'enter') a.hello = 1.6;
          a.state = 'work';
          a.carry = false;
          a.box = false;
          a.cup = false;
          a.dir = 1;
          a.deskT = 0;
        }
      }
      continue;
    }
    a.walkT = 0;
    if (a.state === 'at') {
      if (!a.act) a.state = 'walkto';
      continue;
    }
    // vid skrivbordet
    a.x = dx;
    a.dir = 1;
    a.fy = dk ? dk.fy : a.fy;
    if (scene.celebrate > 0) {
      setPose(a, 'cheer', true);
      continue;
    }
    if (a.hello > 0) {
      setPose(a, 'wave', false);
      continue;
    }
    if (a.act && a.act.state === 'run' && a.m && a.m.host) continue; // värden spelas av aktivitetens manus
    if (trainingOf(a)) {
      setPose(a, 'read', true);
      continue;
    }
    deskPose(S, a, st, dt, typing, crunch);
  }
  updateDoors(S, scene, dt);
  emoteTick(S, scene, dt, busy, crunch, staff);
}

// ── Dörrar ──
function updateDoors(S, scene, dt) {
  for (let f = 0; f < S.doors.length; f++) {
    for (const d of S.doors[f]) {
      if (d.arch) continue;
      let near = false;
      for (const a of scene.actors.values()) {
        if (a.floor !== f || (a.state !== 'go' && a.state !== 'walkto' && a.state !== 'enter' && a.state !== 'leave')) continue;
        if (Math.abs(a.x - d.x) < DOOR_R) {
          near = true;
          break;
        }
      }
      if (near) d.hold = 0.35;
      else d.hold = Math.max(0, d.hold - dt);
      const target = d.hold > 0 ? 1 : 0;
      d.open += clamp(target - d.open, -dt * 4, dt * 7);
    }
  }
}

// Ritar glasdörrarna som glider upp: rutan i skiljeväggen byts mot bakgrunden bredvid (hämtad ur det statiska lagret).
// layer: statiska lagret, lw/lh dess storlek (husets origo i (lw/2, lh)).
export function drawDoors(A, S, cx, gy, layer, lw, lh) {
  if (!S || !layer) return;
  A.imageSmoothingEnabled = false;
  for (let f = 0; f < S.doors.length; f++) {
    const fy = S.nav.floors[f].fy;
    for (const d of S.doors[f]) {
      if (d.arch || d.open < 0.08) continue;
      const half = Math.max(1, Math.round(2.5 * d.open)); // öppningens halva bredd
      const top = fy - 34;
      const h = 34;
      const sy = lh + top;
      // vänster och höger bakgrundskolumn sträcks över glasets bredd (x-2..x+2)
      A.drawImage(layer, lw / 2 + d.x - 3, sy, 1, h, cx + d.x - half, gy + top, half, h);
      A.drawImage(layer, lw / 2 + d.x + 3, sy, 1, h, cx + d.x + 1, gy + top, half, h);
      if (half < 2) continue;
      // dörrposter: mörk list i kanten av öppningen
      A.fillStyle = 'rgba(14,16,24,0.55)';
      A.fillRect(cx + d.x - half, gy + top, 1, h);
      A.fillRect(cx + d.x + half, gy + top, 1, h);
    }
  }
}

// ── Emotes ──
// En dirigent väljer var tionde sekund en person och en bubbla som passar situationen. Låg frekvens, högst tre samtidigt.
const EMO_ACT = {
  meeting: [['question', 1], ['exclam', 1], ['bulb', 1.2]],
  lounge: [['heart', 1.6], ['exclam', 0.6], ['bulb', 0.5]],
  lobby: [['heart', 1], ['exclam', 1]],
  phone: [['exclam', 1], ['question', 0.8]],
  coffee: [['coffee', 4], ['heart', 0.5]],
  server: [['exclam', 2], ['sweat', 1.2], ['bulb', 0.5]],
  board: [['bulb', 2], ['question', 1]],
  pair: [['bulb', 1], ['exclam', 1], ['question', 0.7]],
  window: [['heart', 1], ['bulb', 0.6]],
  sofa: [['bulb', 1], ['coffee', 0.5]],
  fac: [['coffee', 1], ['heart', 1]],
};
function pickW(S, list) {
  let tot = 0;
  for (const [, w] of list) tot += w;
  let r = S.rnd() * tot;
  for (const [k, w] of list) {
    r -= w;
    if (r <= 0) return k;
  }
  return list[list.length - 1][0];
}
function emoteTick(S, scene, dt, busy, crunch, staff) {
  S.emoT -= dt;
  if (S.emoT > 0) return;
  S.emoT = rand(S, 7, 15);
  const all = shuffle(S, [...scene.actors.values()].filter((a) => !a.leaving && a.emoCool <= 0 && (a.state === 'work' || a.state === 'at')));
  for (const a of all) {
    const st = staff.get(a.id);
    const mood = st ? st.mood : 70;
    let list;
    if (a.act && a.state === 'at') list = EMO_ACT[a.act.kind];
    else if (a.pose === 'sleep') list = [['zzz', 1]];
    else if (a.pose === 'tired') list = [['zzz', crunch ? 0.6 : 1.4], ['sweat', crunch ? 2 : 0.4]];
    else if (!busy && mood < 35) list = [['zzz', 1.5], ['sweat', 0.5]];
    else if (crunch) list = [['sweat', 2], ['exclam', 0.6]];
    else if (busy) list = [['bulb', st && st.trait === 'spark' ? 1.5 : 0.6], ['question', 1], ['exclam', 0.8]];
    else list = [['heart', mood > 80 ? 1.4 : 0.4], ['bulb', 0.5], ['coffee', 0.7]];
    if (!list) continue;
    if (scene.emote(a.id, pickW(S, list))) {
      a.emoCool = rand(S, 25, 55);
      break;
    }
  }
}
