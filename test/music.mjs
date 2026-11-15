// Musiken utan ljud: en låtsas-WebAudio räknar tonerna per stämning, och musikregin provas som ren funktion.
const mkParam = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; } });
const node = (extra = {}) => ({ connect() {}, disconnect() {}, ...extra });
const counts = { osc: 0, noise: 0 };
const made = [];
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
  createOscillator() { counts.osc++; const o = node({ frequency: mkParam(), type: '', start() {}, stop() {} }); made.push(o); return o; }
  createBufferSource() { counts.noise++; return node({ buffer: null, loop: false, start() {}, stop() {} }); }
}
globalThis.window = { AudioContext: FakeCtx, addEventListener() {} };
const { music, sfx, ambience, unlockAudio, MOODS, LAYERS } = await import('../src/audio/sfx.js');
const { pickMood, newDirector, ambienceMix, INTERLUDE_AFTER, INTERLUDE_LEN, PAUSE_CALM } = await import('../src/audio/director.js');

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
// ── ljudeffekternas röst per epok ──
unlockAudio();
const clickType = (year) => {
  music.setEra(year);
  made.length = 0;
  sfx.play('click');
  return made[made.length - 1] && made[made.length - 1].type;
};
ok(clickType(1985) === 'square' && clickType(1995) === 'triangle' && clickType(2010) === 'sine', 'ljudeffekterna går från fyrkantsvåg (80-tal) via triangel till sinus (2004 och framåt)');
music.setEra(1985);

// ── omgivningsljudet ──
const noon = { mode: 'play', over: false, night: 0, rain: 0, snow: 0, month: 5, paused: false };
const mixSum = (m) => m.city + m.cricket + m.rain + m.wind;
ok(mixSum(ambienceMix({ ...noon, mode: 'title' })) === 0 && mixSum(ambienceMix({ ...noon, over: true })) === 0, 'titelskärmen och konkursen är tysta');
const day = ambienceMix(noon);
ok(day.city > 0.5 && day.cricket === 0 && day.rain === 0 && day.wind === 0, 'en klar dag i juni: bara stadsbrus (' + day.city + ')');
const sNight = ambienceMix({ ...noon, night: 1 });
ok(sNight.cricket > 0.9 && sNight.city < day.city && sNight.city > 0, 'en sommarnatt ger syrsor och stillare stad');
const wNight = ambienceMix({ ...noon, night: 1, month: 0 });
ok(wNight.cricket === 0 && wNight.wind > 0 && wNight.wind < 0.4, 'en vinternatt har inga syrsor men lite blåst');
const rainy = ambienceMix({ ...noon, rain: 1 });
ok(rainy.rain > 0.8 && rainy.city < day.city && rainy.cricket === 0, 'regn hörs och dämpar staden');
const snowy = ambienceMix({ ...noon, snow: 1, month: 0 });
ok(snowy.wind > 0.7 && snowy.rain === 0 && snowy.city < day.city, 'snö ger blåst och dämpar staden');
ok(mixSum(ambienceMix({ ...noon, paused: true })) < mixSum(day), 'står spelet stilla blir det lite tystare');
const all = [];
for (const night of [0, 0.5, 1]) for (const rain of [0, 1]) for (const snow of [0, 1]) for (const month of [0, 5, 11]) for (const paused of [false, true]) all.push(ambienceMix({ ...noon, night, rain, snow, month, paused }));
ok(all.every((m) => Object.values(m).every((v) => v >= 0 && v <= 1)), 'alla nivåer håller sig mellan 0 och 1');
ok(JSON.stringify(ambienceMix({ ...noon, night: 0.3 })) === JSON.stringify(ambienceMix({ ...noon, night: 0.3 })), 'omgivningsljudet är en ren funktion');
ok(ambience.on() === false && ambience._levels() === null, 'omgivningsljudet börjar avstängt');
ambience.start();
ok(ambience.on() === true, 'start slår på omgivningsljudet');
ambience.set(ambienceMix({ ...noon, night: 1 }));
const lv = ambience._levels();
ok(lv.city > 0 && lv.cricket > 0 && lv.rain === 0 && lv.wind === 0, 'nivåerna följer mixen (stad ' + lv.city.toFixed(2) + ', syrsor ' + lv.cricket.toFixed(3) + ')');
ok(lv.cricket <= 0.08 && lv.city <= 0.4, 'nivåerna är låga (syrsor högst 0,08, stad högst 0,4)');
ambience.set(ambienceMix({ ...noon, rain: 1 }));
ok(ambience._levels().rain > 0.03 && ambience._levels().cricket === 0, 'regnet kommer in och syrsorna försvinner');
ambience.stop();
ok(ambience.on() === false && Object.values(ambience._levels()).every((v) => v === 0), 'stopp tystar allt');
ambience.set(ambienceMix(noon));
ok(Object.values(ambience._levels()).every((v) => v === 0), 'ett avslaget omgivningsljud ändras inte av set');
console.log(fails ? fails + ' fel' : 'Alla musiktester gick bra');
process.exit(fails ? 1 : 0);
