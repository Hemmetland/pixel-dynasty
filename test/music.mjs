// Musiken utan ljud: en låtsas-WebAudio räknar tonerna per stämning, och musikregin provas som ren funktion.
const mkParam = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
const node = (extra = {}) => ({ connect() {}, disconnect() {}, ...extra });
const counts = { osc: 0, noise: 0 };
class FakeCtx {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.sampleRate = 8000;
    this.destination = node();
  }
  resume() {}
  createGain() { return node({ gain: mkParam() }); }
  createBiquadFilter() { return node({ frequency: mkParam(), Q: mkParam(), type: '' }); }
  createDynamicsCompressor() { return node({ threshold: mkParam(), ratio: mkParam() }); }
  createAnalyser() { return node({ fftSize: 0 }); }
  createConvolver() { return node({ buffer: null }); }
  createBuffer(c, len) { return { getChannelData: () => new Float32Array(len) }; }
  createOscillator() { counts.osc++; return node({ frequency: mkParam(), type: '', start() {}, stop() {} }); }
  createBufferSource() { counts.noise++; return node({ buffer: null, loop: false, start() {}, stop() {} }); }
}
globalThis.window = { AudioContext: FakeCtx, addEventListener() {} };
const { music, MOODS, LAYERS } = await import('../src/audio/sfx.js');
const { pickMood, newDirector, INTERLUDE_AFTER, INTERLUDE_LEN, PAUSE_CALM } = await import('../src/audio/director.js');

let fails = 0;
const ok = (c, m) => {
  if (!c) {
    fails++;
    console.log('FAIL', m);
  } else console.log('ok  ', m);
};

// ── stämningarna ──
ok(Object.keys(MOODS).join() === 'title,play,calm,drive,report,award,sad', 'sju stämningar, med en lugn och en hetsig');
ok(Object.values(MOODS).every((m) => Object.keys(m.mix).every((k) => LAYERS[k])), 'varje stämning använder bara lager som finns');
ok(MOODS.calm.bpm < MOODS.play.bpm && MOODS.play.bpm < MOODS.drive.bpm && MOODS.calm.drums === 0 && MOODS.award.bpm < 108, 'lugn är långsammast och utan trummor, och galan är inte längre 108 slag');

// Tonerna per minut: kör schemaläggaren i låtsastid (klockan går vidare mellan stämningarna)
let T = 0;
function perMinute(mood, minutes = 4) {
  music.stop();
  music.setMood(mood);
  counts.osc = counts.noise = 0;
  music.start();
  const ctx = music._ctx();
  const layers = {};
  const end = T + minutes * 60;
  for (; T < end; T += 0.05) {
    ctx.currentTime = T;
    const s = music._tick();
    if (s) layers[s.layer] = (layers[s.layer] || 0) + 1;
  }
  music.stop();
  return { osc: counts.osc / minutes, noise: counts.noise / minutes, layers };
}
const dens = {};
for (const m of Object.keys(MOODS)) dens[m] = perMinute(m);
const total = (m) => dens[m].osc + dens[m].noise;
console.log('   toner + slag per minut:', Object.keys(dens).map((m) => `${m} ${Math.round(total(m))}`).join(', '));
ok(total('calm') < total('play') * 0.7, 'lugn musik har klart färre toner än vanlig spelmusik');
ok(total('play') < total('drive'), 'övertidsmusiken är tätast');
ok(dens.calm.noise < dens.play.noise * 0.2, 'lugn musik har knappt några trumslag');
ok(Object.keys(dens.play.layers).length >= 3 && Object.keys(dens.calm.layers).length >= 2, 'avsnitten växlar mellan flera lager (play: ' + Object.keys(dens.play.layers).join('/') + ')');

// Byte av stämning sker på en takt, och music.mood() visar vad som är på väg
music.stop();
music.setMood('play');
music.start();
const ctx = music._ctx();
ctx.currentTime = T;
music._tick();
music.setMood('calm');
ok(music.mood() === 'calm', 'music.mood() visar den nya stämningen direkt');
let switched = false;
for (let t = T; t < T + 60 && !switched; t += 0.05) {
  ctx.currentTime = t;
  switched = music._tick().mood === 'calm';
}
ok(switched, 'stämningen byts inom ett avsnitt');
music.stop();

// ── musikregin ──
const base = { mode: 'play', over: false, prompt: false, paused: false, crunch: false, speed: 2, style: 'auto' };
let D = newDirector();
ok(pickMood(D, { ...base, now: 0, mode: 'title' }) === 'title', 'titelskärmen har sin stämning');
ok(pickMood(D, { ...base, now: 1, over: true }) === 'sad', 'konkurs ger den vemodiga');
ok(pickMood(D, { ...base, now: 2, prompt: true }) === null, 'en ruta med egen stämning får vara ifred');
D = newDirector();
ok(pickMood(D, { ...base, now: 10 }) === 'play', 'vanlig fart ger spelmusik');
ok(pickMood(D, { ...base, now: 11, speed: 1 }) === 'calm', 'lägsta fart ger lugn musik');
D = newDirector();
ok(pickMood(D, { ...base, now: 0, paused: true }) === 'play' && pickMood(D, { ...base, now: PAUSE_CALM - 1, paused: true }) === 'play', 'en kort paus ändrar inget');
ok(pickMood(D, { ...base, now: PAUSE_CALM + 1, paused: true }) === 'calm', 'en längre paus lugnar musiken');
ok(pickMood(D, { ...base, now: PAUSE_CALM + 2 }) === 'play', 'när spelet går igen kommer spelmusiken tillbaka');
D = newDirector();
ok(pickMood(D, { ...base, now: 100, crunch: true }) === 'drive', 'övertid ger den hetsiga musiken');
ok(pickMood(D, { ...base, now: 101, crunch: true, paused: true }) !== 'drive', 'men inte medan spelet står stilla');
D = newDirector();
const seq = [];
for (let t = 0; t <= INTERLUDE_AFTER + INTERLUDE_LEN + 60; t += 5) seq.push([t, pickMood(D, { ...base, now: t })]);
const firstCalm = seq.find((x) => x[1] === 'calm');
const back = seq.find((x) => x[0] > firstCalm[0] && x[1] === 'play');
ok(firstCalm && firstCalm[0] >= INTERLUDE_AFTER && firstCalm[0] < INTERLUDE_AFTER + 10, 'efter ' + INTERLUDE_AFTER + ' sekunder spelmusik kommer en lugn stund (vid ' + (firstCalm && firstCalm[0]) + ' s)');
ok(back && back[0] - firstCalm[0] >= INTERLUDE_LEN && back[0] - firstCalm[0] < INTERLUDE_LEN + 10, 'den varar ungefär ' + INTERLUDE_LEN + ' sekunder och sedan kommer spelmusiken tillbaka (efter ' + (back && back[0] - firstCalm[0]) + ' s)');
D = newDirector();
const calmOnly = [0, 50, 200, 400].map((t) => pickMood(D, { ...base, now: t, style: 'calm', crunch: t === 200 }));
ok(calmOnly.every((x) => x === 'calm'), 'stilen Lugn ger alltid lugn musik');
D = newDirector();
const lively = [];
for (let t = 0; t <= 600; t += 5) lively.push(pickMood(D, { ...base, now: t, style: 'lively', speed: 1 }));
ok(lively.every((x) => x === 'play'), 'stilen Livlig har inga lugna stunder, inte ens på lägsta fart');
console.log(fails ? fails + ' fel' : 'Alla musiktester gick bra');
process.exit(fails ? 1 : 0);
