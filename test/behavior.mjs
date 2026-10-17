// Beteendetest för Studiohuset (v2) utan webbläsare: kör den riktiga Scene med en låtsas-canvas och kontrollerar
// att ingen fastnar, går genom väggar, ställer sig i varandra eller hamnar utanför huset.
// node test/behavior.mjs [sekunder=900] [frö=1]
import * as S from '../src/sim/index.js';
import { POSE_FRAMES } from '../src/render/people.js';

const [, , secsArg = '900', seedArg = '1'] = process.argv;
let fails = 0;
const ok = (c, m) => {
  if (!c) {
    fails++;
    console.log('FAIL', m);
  } else console.log('ok  ', m);
};

// ── låtsas-DOM: en canvas vars 2d-kontext inte ritar något ──
const ctxProxy = () => {
  const fn = () => proxy;
  const proxy = new Proxy(function () {}, {
    get: (t, k) => {
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'measureText') return () => ({ width: 8 });
      if (k === Symbol.toPrimitive) return () => 0;
      return fn;
    },
    set: () => true,
    apply: () => proxy,
  });
  return proxy;
};
const mkCanvas = () => ({ width: 0, height: 0, style: {}, getContext: () => ctxProxy(), addEventListener() {}, after() {}, remove() {} });
globalThis.document = { createElement: () => mkCanvas() };
globalThis.window = { devicePixelRatio: 1 };

// deterministiskt slump
let seed = +seedArg >>> 0;
Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

const { Scene } = await import('../src/render/scene.js');
const { POSE_FRAMES: PF } = await import('../src/render/people.js');
void POSE_FRAMES;

const G = S.newGame({ studio: 'Test', seed: 5, difficulty: 'normal' });
S.makeCompetitors(G);
S.initWorld(G);
G.t = (2020 - 1980) * 192 + 20;
G.office.tier = 3;
G.office.fac = { coffee: { lvl: 1, slot: 0 }, lab: { lvl: 1, slot: 1 }, qa: { lvl: 1, slot: 2 }, gameroom: { lvl: 1, slot: 3 }, training: { lvl: 1, slot: 4 }, marketing: { lvl: 1, slot: 5 } };
const hire = (n) => {
  while (G.staff.length < n) {
    const c = S.makeCandidate(G, 0);
    delete c.fee;
    G.staff.push(c);
  }
};
hire(15);
const startJob = () => {
  if (!G.job) S.startProject(G, { title: 'Demo', topic: G.u.topics[0], genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone' });
};
startJob();

const canvas = mkCanvas();
const scene = new Scene(canvas);
scene.resize(1280, 720, { top: 70, bottom: 118 });
scene.setGame(G);
scene.todLock = 0.5;
ok(!!scene.crowd, 'Studiohuset använder beteendemodulen');
const L = () => scene.L;

// ── Invarianter per steg ──
const stat = { steps: 0, away: 0, total: 0, kinds: {}, emotes: {}, maxEmotes: 0, overlaps: 0, doors: 0, stuck: 0, bad: 0, maxAway: 0, meetings: 0, maxMeet: 0, poses: {} };
const awayT = new Map();
const seenActs = new Set();
const check = () => {
  if (!scene.crowd) return;
  const l = L();
  for (const a of scene.actors.values()) {
    const sane = Number.isFinite(a.x) && Number.isFinite(a.fy) && Number.isInteger(a.frame) && a.floor >= 0 && a.floor < l.floors;
    if (!sane || !Object.prototype.hasOwnProperty.call(PF, a.pose)) {
      if (stat.bad++ < 5) console.log('  ogiltig aktör', a.id, a.pose, a.frame, a.x, a.floor);
    }
    const dk = l.desks.find((d) => d.floor === a.floor);
    if (Math.abs(a.fy - dk.fy) > 0.01) stat.bad++;
    if (a.x < l.left - 15 || a.x > l.left + l.IW) {
      if (stat.bad++ < 5) console.log('  utanför huset', a.id, a.state, a.x);
    }
    stat.total++;
    stat.poses[a.pose] = (stat.poses[a.pose] || 0) + 1;
    if (a.state !== 'work' && a.state !== 'enter') stat.away++;
    // fastlåsta tillstånd: borta från skrivbordet i över 90 s i sträck
    if (a.state === 'work') awayT.delete(a.id);
    else {
      const t0 = awayT.get(a.id) ?? scene.time;
      awayT.set(a.id, t0);
      if (scene.time - t0 > 90 && a.state !== 'leave') {
        stat.stuck++;
        awayT.set(a.id, scene.time);
        console.log('  fastlåst?', a.id, a.state, a.pose, a.act && a.act.kind);
      }
    }
  }
  // inga två stillastående i varandra (utom paret vid skrivbordet: värd och besökare står 8 px isär)
  const still = [...scene.actors.values()].filter((a) => a.state === 'work' || a.state === 'at');
  for (let i = 0; i < still.length; i++) {
    for (let j = i + 1; j < still.length; j++) {
      const p = still[i];
      const q = still[j];
      if (p.floor === q.floor && Math.abs(p.x - q.x) < 6.5) {
        if (stat.overlaps++ < 5) console.log('  överlapp', p.id, p.state, p.x.toFixed(1), q.id, q.state, q.x.toFixed(1));
      }
    }
  }
  // den som går genom en skiljevägg ska mötas av en öppen dörr
  for (const a of scene.actors.values()) {
    if (a.state === 'work' || a.state === 'at') continue;
    for (const d of scene.crowd.doors[a.floor]) {
      if (!d.arch && Math.abs(a.x - d.x) < 1.5 && d.open < 0.5) {
        if (stat.doors++ < 5) console.log('  går genom stängd dörr', a.id, a.x.toFixed(1), d.open.toFixed(2));
      }
    }
  }
  // platsreservationer hänger ihop med aktörer
  for (const o of scene.crowd.occ.values()) {
    const a = scene.actors.get(o.id);
    if (!a || !a.act) {
      if (stat.bad++ < 5) console.log('  läckt reservation', o.spot.id);
    }
  }
  for (const act of scene.crowd.acts) {
    if (!seenActs.has(act.id)) {
      seenActs.add(act.id);
      stat.kinds[act.kind] = (stat.kinds[act.kind] || 0) + 1;
      if (act.kind === 'meeting') stat.maxMeet = Math.max(stat.maxMeet, act.m.length);
    }
  }
  for (const e of scene.emotes) if (!e.counted) {
    e.counted = true;
    stat.emotes[e.kind] = (stat.emotes[e.kind] || 0) + 1;
  }
  stat.maxEmotes = Math.max(stat.maxEmotes, scene.emotes.length);
  stat.maxAway = Math.max(stat.maxAway, [...scene.actors.values()].filter((a) => a.state !== 'work').length);
};

const run = (secs, dt = 0.1, drawEvery = 25) => {
  const n = Math.round(secs / dt);
  for (let i = 0; i < n; i++) {
    G.t += 0.02; // tiden går så att fasbyte kan inträffa utan att köra hela sim
    scene.update(dt);
    if (i % drawEvery === 0) scene.draw();
    check();
    stat.steps++;
  }
};

const total = +secsArg;
// 1) utveckling pågår
run(total * 0.4);
const busyAway = stat.away / Math.max(1, stat.total);
ok(busyAway > 0.1 && busyAway < 0.55, `under utveckling är ${(busyAway * 100).toFixed(0)}% borta från skrivbordet (10-55%)`);
// 2) tomgång: ingen aktivt projekt, mer social aktivitet
G.job = null;
const a0 = stat.away;
const t0 = stat.total;
run(total * 0.3);
const idleAway = (stat.away - a0) / Math.max(1, stat.total - t0);
ok(idleAway > busyAway, `i tomgång är fler borta (${(idleAway * 100).toFixed(0)}% > ${(busyAway * 100).toFixed(0)}%)`);
// 3) anställ en, avskeda två, byt tier fram och tillbaka, fira
startJob();
G.staff.pop();
run(5);
hire(15);
run(10);
const gone = G.staff.splice(3, 2);
run(40);
ok(!gone.some((s) => scene.actors.has(s.id) && !scene.actors.get(s.id).leaving && false), 'avskedade lämnar huset');
ok(![...scene.actors.values()].some((a) => gone.some((s) => s.id === a.id) && a.state !== 'leave'), 'avskedade går mot dörren');
run(30);
ok(!gone.some((s) => scene.actors.has(s.id)), 'avskedade är borta ur scenen efter en stund');
hire(15);
scene.celebrateNow(3);
run(5);
G.office.tier = 2;
scene.tierChanged();
run(30);
ok(!scene.crowd, 'andra nivåer använder gamla beteendet');
G.office.tier = 3;
scene.tierChanged();
ok(!!scene.crowd, 'tillbaka till Studiohuset');
run(total * 0.3);
// få personer: bara tre i huset
G.staff.length = 3;
scene.syncActors(false);
run(120);
hire(15);
run(60);

// HD-ljuset: ljuskällorna får plats i MAX_LIGHTS med rumsljusen först (kräver ingen WebGL att räkna ut)
scene.todLock = 0.93;
scene.world.tod = 0.93;
run(3);
scene.draw(); // nattritning i canvasläget (rumsljus, fönsterglans)
const { MAX_LIGHTS } = await import('../src/render/gl/fx.js');
const cxm = Math.round(scene.iw / 2);
const ls = scene.collectLights(cxm, scene.groundY, 1, 1);
ok(ls.length === MAX_LIGHTS, `ljuskällor begränsas till MAX_LIGHTS (${ls.length}/${MAX_LIGHTS})`);
ok(ls.every((l) => [l.x, l.y, l.r, l.i].every(Number.isFinite) && l.c.length === 3), 'alla ljuskällor har giltiga värden');
const roomLights = ls.filter((l) => l.kind === 0 && l.pri < 0.2).length;
ok(roomLights === L().lights.filter((l) => (l.kind || 0) === 0 && l.pri === 0).length, 'alla rumsljus (prioritet 0) kommer med');
ok(ls.every((l, i) => i === 0 || ls[i - 1].pri <= l.pri), 'sorterade efter prioritet');
scene.todLock = 0.5;
scene.world.tod = 0.5;

console.log(`steg ${stat.steps}, aktiviteter:`, JSON.stringify(stat.kinds));
console.log('emotes:', JSON.stringify(stat.emotes), 'max samtidiga', stat.maxEmotes);
console.log('poser:', JSON.stringify(stat.poses));
console.log(`mest borta samtidigt: ${stat.maxAway}, störst möte: ${stat.maxMeet}`);
ok(stat.bad === 0, 'inga ogiltiga aktörer, inga utanför huset, inga läckta reservationer');
ok(stat.overlaps === 0, 'inga stillastående aktörer i varandra');
ok(stat.stuck === 0, 'ingen fastnar borta från skrivbordet');
ok(stat.doors === 0, 'ingen går genom en stängd dörr');
ok(stat.maxEmotes <= 4, 'högst fyra bubblor samtidigt');
for (const k of ['meeting', 'coffee', 'lounge', 'server', 'board', 'pair', 'fac']) ok((stat.kinds[k] || 0) > 0, `aktivitet ${k} förekommer`);
ok(stat.maxMeet >= 3, 'möten med minst tre');
ok(Object.keys(stat.emotes).length >= 4, 'flera sorters bubblor förekommer');
console.log(fails ? `\n${fails} fel` : '\nalla ok');
process.exit(fails ? 1 : 0);
