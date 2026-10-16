// Ljuslabb: samma byggnad och scen som i spelet, med nuvarande canvas-ljus och det nya WebGL-ljuset sida vid sida.
import { Scene } from '../render/scene.js';
import { newGame } from '../sim/state.js';
import { makeCompetitors } from '../sim/market.js';
import { initWorld } from '../sim/clock.js';
import { makeCandidate } from '../sim/people.js';
import { startProject } from '../sim/dev.js';
import { glSupported } from '../render/gl/fx.js';

const $ = (s, r = document) => r.querySelector(s);
const root = document.getElementById('app');
root.innerHTML = `
  <div id="stage"><canvas id="c2d"></canvas></div>
  <div class="panel title"><h1>Ljuslabb</h1><p>Samma scen, två ljussättningar. Dra i knappen för att jämföra.</p></div>
  <div class="tag l" id="tagL">Nuvarande · Canvas 2D</div>
  <div class="tag r" id="tagR">Nytt · WebGL HD-2D</div>
  <div id="split"><div class="knob" id="knob">⇆</div></div>
  <div class="panel bar" id="bar">
    <div class="grp time"><label for="tod">Tid på dygnet</label>
      <div class="row center">
        <input id="tod" type="range" min="0" max="1" step="0.005" value="0.77" aria-label="Tid på dygnet">
        <div class="row" id="todBtns">
          <button class="btn" data-tod="0.27">Gryning</button>
          <button class="btn" data-tod="0.5">Dag</button>
          <button class="btn" data-tod="0.76">Solnedgång</button>
          <button class="btn" data-tod="0.93">Natt</button>
          <button class="btn" id="auto">Spela upp</button>
        </div>
      </div></div>
    <div class="grp"><label>Väder</label>
      <div class="row" id="wx"><button class="btn on" data-w="clear">Klart</button><button class="btn" data-w="rain">Regn</button><button class="btn" data-w="snow">Snö</button></div></div>
    <div class="grp"><label>Byggnad</label>
      <div class="row" id="tiers"></div></div>
    <div class="grp"><label>Vy</label>
      <div class="row" id="view"><button class="btn on" data-v="split">Delad</button><button class="btn" data-v="gl">WebGL</button><button class="btn" data-v="2d">Canvas</button></div></div>
    <div class="grp"><label for="bloom">Glöd</label>
      <div class="row center"><input id="bloom" type="range" min="0" max="1.4" step="0.02" value="0.8" aria-label="Glöd" style="width:120px"></div></div>
  </div>
  <div class="panel hint">Reflektioner i vägen, mjuk skärpedjup i skylinen, ljus som beräknas per pixel och glöd runt lampor, fönster och skärmar.</div>
  <div class="err" id="err"><div class="panel" style="padding:22px 26px;max-width:420px"><h2 style="margin:0 0 8px;font-family:var(--disp);font-weight:400;font-size:30px">WebGL saknas</h2><p style="margin:0;color:var(--muted)">Den här webbläsaren kan inte köra WebGL2, så jag kan bara visa det nuvarande canvasljuset.</p></div></div>
`;

const names = ['Garage', 'Litet kontor', 'Tvåvåning', 'Studiohus', 'Fabrik', 'Torn'];
const years = [1982, 1986, 1992, 2000, 2008, 2016];
const staffN = [2, 5, 10, 15, 24, 36];
$('#tiers').innerHTML = names.map((n, i) => `<button class="btn ${i === 2 ? 'on' : ''}" data-t="${i}">${n}</button>`).join('');

const G = newGame({ studio: 'Nordlys Games', seed: 5 });
makeCompetitors(G);
initWorld(G);
G.office.fac = { coffee: { lvl: 2, slot: 0 }, lab: { lvl: 1, slot: 1 } };
const canvas = $('#c2d');
const scene = new Scene(canvas);
scene.setGame(G);
let tod = 0.77;
let auto = false;
let wx = 'clear';
let view = 'split';
let splitX = 0.5;
let vw = 0;
let vh = 0;

function setTier(t) {
  G.office.tier = t;
  G.t = (years[t] - 1980) * 192 + 20;
  while (G.staff.length < staffN[t]) {
    const c = makeCandidate(G, 0);
    delete c.fee;
    G.staff.push(c);
  }
  G.staff.length = Math.min(G.staff.length, staffN[t]);
  if (t >= 2) Object.assign(G.office.fac, { qa: { lvl: 1, slot: 2 }, gameroom: { lvl: 2, slot: 3 } });
  if (t >= 3) Object.assign(G.office.fac, { training: { lvl: 2, slot: 4 }, marketing: { lvl: 1, slot: 5 } });
  if (!G.job) startProject(G, { title: 'Lab', topic: G.u.topics[0], genre: 'action', platform: 'pc', scope: 'small', audience: 'everyone' });
  scene.rebuildLayout(true);
  scene.world.setYear(years[t]);
  layout();
  for (const b of $('#tiers').children) b.classList.toggle('on', +b.dataset.t === t);
}

function layout() {
  vw = innerWidth;
  vh = innerHeight;
  const bar = $('#bar').getBoundingClientRect();
  const free = vh - bar.height - 28;
  scene.resize(vw, vh, { top: 64, bottom: Math.max(110, vh - free + 8) });
  applyView();
}

function applyView() {
  const gl = scene.glCanvas;
  const split = $('#split');
  const tagL = $('#tagL');
  const tagR = $('#tagR');
  const x = Math.round(vw * splitX);
  if (gl) gl.classList.add('gl');
  if (view === 'split' && gl) {
    scene.setGL(true, { dual: true });
    scene.glCanvas.style.clipPath = `inset(0 0 0 ${x}px)`;
    split.style.display = '';
    split.style.left = x + 'px';
    tagL.style.opacity = 1;
    tagR.style.opacity = 1;
    tagL.style.left = Math.max(16, Math.min(x - 190, x - 16 - 175)) + 'px';
    tagR.style.left = Math.min(vw - 190, x + 16) + 'px';
  } else if (view === 'gl' && gl !== undefined) {
    scene.setGL(true, { dual: false });
    if (scene.glCanvas) scene.glCanvas.style.clipPath = 'none';
    split.style.display = 'none';
    tagL.style.opacity = 0;
    tagR.style.opacity = 1;
    tagR.style.left = '16px';
    tagR.style.top = '';
  } else {
    scene.setGL(false);
    split.style.display = 'none';
    tagL.style.opacity = 1;
    tagR.style.opacity = 0;
    tagL.style.left = '16px';
  }
  for (const b of $('#view').children) b.classList.toggle('on', b.dataset.v === view);
}

let glOk = glSupported();
if (!glOk) {
  $('#err').classList.add('on');
  view = '2d';
  for (const b of $('#view').children) if (b.dataset.v !== '2d') b.disabled = true;
}
// WebGL-canvasen skapas första gången läget slås på
if (glOk) {
  if (!scene.setGL(true, { dual: true })) {
    glOk = false;
    view = '2d';
    $('#err').classList.add('on');
  }
}

setTier(2);
scene.todLock = tod;
scene.world.tod = tod;

$('#tod').addEventListener('input', (e) => {
  tod = +e.target.value;
  auto = false;
  $('#auto').classList.remove('on');
  scene.todLock = tod;
});
$('#todBtns').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'auto') {
    auto = !auto;
    b.classList.toggle('on', auto);
    scene.todLock = auto ? null : tod;
    scene.speed = 3;
    return;
  }
  auto = false;
  $('#auto').classList.remove('on');
  tod = +b.dataset.tod;
  $('#tod').value = tod;
  scene.todLock = tod;
});
$('#wx').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  wx = b.dataset.w;
  scene.weatherLock = wx === 'clear' ? { type: 'clear', amt: 0, snap: true } : { type: wx, amt: 1 };
  for (const x of $('#wx').children) x.classList.toggle('on', x === b);
});
$('#tiers').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) setTier(+b.dataset.t);
});
$('#view').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  view = b.dataset.v;
  applyView();
});
$('#bloom').addEventListener('input', (e) => {
  scene.glBloom = +e.target.value;
});
scene.glBloom = 0.8;

// dra i delningslinjen
let drag = false;
const move = (cx) => {
  splitX = Math.max(0.06, Math.min(0.94, cx / vw));
  applyView();
};
$('#knob').addEventListener('pointerdown', (e) => {
  drag = true;
  e.target.setPointerCapture(e.pointerId);
});
addEventListener('pointermove', (e) => drag && move(e.clientX));
addEventListener('pointerup', () => (drag = false));
$('#stage').addEventListener('pointerdown', (e) => {
  if (view === 'split') move(e.clientX);
});
addEventListener('resize', layout);
document.fonts?.ready.then(layout);

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt;
  scene.update(dt);
  scene.draw();
  if (auto && acc > 0.2) {
    acc = 0;
    $('#tod').value = scene.world.tod;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__lab = { scene, G, setTier };
