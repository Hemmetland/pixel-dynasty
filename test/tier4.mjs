// Kontrakt- och ritningstest för nivå 4 ("Modern", rumssystemet) utan webbläsare.
// node test/tier4.mjs
// Kontrollerar layouten (våningar, skrivbord, anläggningsplatser, rum, stationer, namn på båda språk, ljus) och att allt som
// ritas (statiskt lager och dynamik) håller sig inom lagrets yta och ritas utan fel.
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => null }), documentElement: {} };
globalThis.window = { devicePixelRatio: 1 };
const { makeLayout, drawShell } = await import('../src/render/building.js');
const { drawRoomsDynamic } = await import('../src/render/rooms.js');
const { setLang } = await import('../src/core/i18n.js');

let fails = 0;
const ok = (c, m) => {
  console.log(c ? 'ok  ' : 'FEL ', m);
  if (!c) fails++;
};

const L = makeLayout(4);
ok(L.v2 && L.tier === 4, 'nivå 4 använder rumssystemet');
ok(L.floors === 4, 'fyra våningar');
ok(L.desks.length === 24 && [0, 1, 2, 3].every((f) => L.desks.filter((d) => d.floor === f).length === 6), '24 skrivbord, sex per våning');
ok(L.slots.length === 8 && [0, 1, 2, 3].every((f) => L.slots.filter((s) => s.floor === f).length === 2), '8 anläggningsplatser, två per våning');
ok(L.BW <= 480 && L.pitch === 54 && L.intH === 48 && L.roofH >= 48 && L.roofH <= 56, `BW ${L.BW} (högst 480), pitch 54, intH 48, takhöjd ${L.roofH} (ca 52)`);
ok(L.desks.every((d) => d.x >= L.left && d.x + 30 <= L.left + L.IW), 'alla skrivbord ryms i huset');
for (let f = 0; f < 4; f++) {
  const rs = L.rooms.filter((r) => r.floor === f).sort((a, b) => a.x0 - b.x0);
  const tiled = rs.every((r, i) => i === 0 || Math.abs(r.x0 - rs[i - 1].x1) < 1e-6) && Math.abs(rs[0].x0 - L.left) < 1e-6 && Math.abs(rs[rs.length - 1].x1 - (L.left + L.IW)) < 1e-6;
  ok(tiled, `våning ${f}: rummen täcker hela bredden utan glapp`);
}
const types = new Set(L.rooms.map((r) => r.type));
for (const t of ['lobby', 'meeting', 'kitchen', 'lounge', 'server', 'whiteboard', 'dev']) ok(types.has(t), `rumstyp ${t} finns`);
ok(new Set(L.rooms.filter((r) => r.type === 'dev').map((r) => r.floor)).size === 4, 'öppet kontor på varje våning');
// varje våning har ett eget innehåll: minst tre olika rumstyper och olika sammansättning
const mix = [0, 1, 2, 3].map((f) => L.rooms.filter((r) => r.floor === f && r.type !== 'facility').map((r) => r.type).sort().join('+'));
ok(new Set(mix).size === 4 && mix.every((m) => m.split('+').length >= 3), 'fyra olika rumsblandningar: ' + mix.join(' | '));

// stationer: inom rummet, rätt slag, minst 10 px mellan dem (utom fönsterplatsen som delar plats med soffan)
const kinds = new Set(L.stations.map((s) => s.kind));
for (const k of ['seat', 'stand', 'sofa', 'coffee', 'board', 'rack', 'reception', 'window']) ok(kinds.has(k), `stationstyp ${k} finns`);
let badSt = 0;
for (const s of L.stations) {
  const r = L.rooms.find((q) => q.id === s.room);
  if (!r || s.x < r.x0 + 2 || s.x > r.x1 - 2 || s.floor !== r.floor) badSt++;
}
ok(badSt === 0, 'alla stationer ligger inne i sitt rum');
let close = 0;
for (let i = 0; i < L.stations.length; i++) {
  for (let j = i + 1; j < L.stations.length; j++) {
    const a = L.stations[i];
    const b = L.stations[j];
    if (a.floor !== b.floor || a.kind === 'window' || b.kind === 'window') continue;
    if (Math.abs(a.x - b.x) < 10) close++;
  }
}
ok(close === 0, 'stationer står minst 10 px från varandra');
const spots = (f, type) => L.stations.filter((s) => s.room === `f${f}-${type}`);
ok(L.rooms.filter((r) => r.type === 'meeting').every((r) => {
  const st = spots(r.floor, 'meeting');
  return st.filter((s) => s.kind === 'seat').length >= 2 && st.some((s) => s.kind === 'stand' && s.pose === 'present') && st.some((s) => s.kind === 'board') && st.filter((s) => s.kind === 'stand').length >= 2;
}), 'mötesrummen har sittplatser, presentatör, tavla och en stående plats');
ok(L.rooms.filter((r) => r.type === 'lounge').every((r) => spots(r.floor, 'lounge').filter((s) => s.kind === 'sofa').length >= 3), 'loungen har tre sittplatser');
ok(L.rooms.filter((r) => r.type === 'whiteboard').every((r) => spots(r.floor, 'whiteboard').filter((s) => s.kind === 'board').length >= 2), 'designlabbet har två tavelplatser');
ok(L.rooms.filter((r) => r.type === 'server').every((r) => spots(r.floor, 'server').some((s) => s.pose === 'laptop') && spots(r.floor, 'server').some((s) => s.pose !== 'laptop')), 'serverhallen har laptopplats och stående plats');
ok(L.rooms.filter((r) => r.type === 'kitchen').every((r) => spots(r.floor, 'kitchen').some((s) => s.kind === 'coffee') && spots(r.floor, 'kitchen').some((s) => s.kind === 'stand')), 'kaféet/fikarummet har kaffeplats och stående plats');

// namn på båda språken och giltiga ljus
const named = L.rooms.filter((r) => r.name);
ok(named.length >= 10 && named.every((r) => Array.isArray(r.name) && r.name.length === 2 && r.name.every((n) => typeof n === 'string' && n.length > 1 && n.length * 4 + 5 <= r.w - 4)), `rumsnamn finns på svenska och engelska och ryms i rummet (${named.length} rum)`);
ok(L.lights.every((l) => [l.x, l.y, l.r, l.i].every(Number.isFinite) && l.c.length === 3 && l.x > -L.BW / 2 - 40 && l.x < L.BW / 2 + 40 && l.y <= 0), 'alla ljuskällor har giltiga värden och ligger vid huset');
ok(L.lights.every((l, i) => i === 0 || L.lights[i - 1].pri <= l.pri), 'ljuskällorna är sorterade efter prioritet');
ok(L.lights.filter((l) => l.pri === 0.5 && l.y < -200).length === 2, 'skylten och takvåningen har ljus med hög prioritet (kommer alltid med bland de 48)');
ok(L.anim.leds.length > 40 && L.anim.screens.length >= 6 && L.anim.fish.length >= 1 && L.anim.steam.length >= 3, `animationslistor: ${L.anim.leds.length} dioder, ${L.anim.screens.length} skärmar, ${L.anim.fish.length} akvarier, ${L.anim.steam.length} ångkällor`);

// ritning: inget utanför lagrets yta (mitten nere, bredd W+40, höjd H+40) och inga ogiltiga färger
function rec() {
  const st = [{ x: 0, y: 0, sx: 1 }];
  const box = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, n: 0, clears: 0 };
  const top = () => st[st.length - 1];
  const add = (x, y, w, h) => {
    const t = top();
    const xa = t.x + x * t.sx;
    const xb = t.x + (x + w) * t.sx;
    box.x0 = Math.min(box.x0, xa, xb);
    box.x1 = Math.max(box.x1, xa, xb);
    box.y0 = Math.min(box.y0, t.y + y);
    box.y1 = Math.max(box.y1, t.y + y + h);
    box.n++;
  };
  return {
    box,
    save() { st.push({ ...top() }); },
    restore() { st.pop(); },
    translate(x, y) { top().x += x * top().sx; top().y += y; },
    scale(sx) { top().sx *= sx; },
    beginPath() {},
    rect() {},
    clip() {},
    fillRect(x, y, w, h) { add(x, y, w, h); },
    clearRect() { box.clears++; },
    set fillStyle(v) { if (typeof v !== 'string' || !v) throw new Error('ogiltig färg ' + v); },
    set globalAlpha(v) { if (!(v >= 0 && v <= 1)) throw new Error('ogiltig alpha ' + v); },
    set globalCompositeOperation(v) { if (typeof v !== 'string') throw new Error('ogiltig operation'); },
  };
}
const halfW = (L.W + 40) / 2;
const layerH = L.H + 40;
const inside = (b) => b.x0 >= -halfW && b.x1 <= halfW && b.y0 >= -layerH && b.y1 <= 8;
for (const lng of ['sv', 'en']) {
  setLang(lng);
  for (const [label, fac] of [['tomma anläggningsplatser', {}], ['alla byggda', Object.fromEntries(['coffee', 'lab', 'qa', 'training', 'gameroom', 'marketing', 'server'].map((id, i) => [id, { lvl: 2, slot: i }]))]]) {
    const g = rec();
    let holes = null;
    let err = null;
    try {
      holes = drawShell(g, L, { era: 2, name: lng === 'sv' ? 'Ett riktigt långt studionamn AB' : 'Kitchen Table Studios', awards: 3, games: [{ c1: '#4a90e0', c2: '#2a5090' }], fac });
    } catch (e) {
      err = e;
    }
    ok(!err, `[${lng}] statiska lagret ritas utan fel (${label})${err ? ': ' + err.message : ''}`);
    if (err) continue;
    ok(inside(g.box), `[${lng}] allt ryms i lagret (${label}): x ${g.box.x0}..${g.box.x1} (±${halfW}), y ${g.box.y0}..${g.box.y1} (min ${-layerH})`);
    ok(holes.length >= 18 && holes.length <= 40, `[${lng}] ${holes.length} fönsterhål (rimligt antal, glas på alla våningar)`);
    ok(holes.every(([x, y, w, h, f]) => w > 6 && h > 10 && x >= L.left && x + w <= L.left + L.IW && f >= 0 && f < 4), `[${lng}] fönsterhålen ligger inne i huset`);
  }
}
for (const reduced of [false, true]) {
  const g = rec();
  let err = null;
  try {
    for (let t = 0; t < 12; t += 0.37) drawRoomsDynamic(g, 0, 0, L, t, 0.7, { occupied: new Map(), working: true, era: 2, reduced });
  } catch (e) {
    err = e;
  }
  ok(!err, `dynamiken ritas utan fel (${reduced ? 'minskad rörelse' : 'normalt'})${err ? ': ' + err.message : ''}`);
  if (!err) ok(g.box.x0 >= -halfW && g.box.x1 <= halfW && g.box.y0 >= -layerH, `dynamiken håller sig inom byggnadens yta (${g.box.x0}..${g.box.x1}, ${g.box.y0}..${g.box.y1})`);
}
console.log(fails ? `\n${fails} fel` : '\nAlla tester gick bra');
process.exit(fails ? 1 : 0);
