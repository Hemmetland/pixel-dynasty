// Mäter progressionstakten: kör simulatorbotten över flera seeds och sammanfattar
// när kontoren byggs ut, hur pengarna växer och hur första spelen betygsätts.
// node test/pacing.mjs [--seeds=6] [--diff=normal] [--casual|--mid] [--ports] [--publish] [--lic] [--acq] [--group] [--store] [--hw] [--end=2020]
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith('--' + k + '=')) || '').split('=')[1] ?? d;
const N = +opt('seeds', 6);
const diff = opt('diff', 'normal');
const end = opt('end', '2020');
const casual = args.includes('--casual');
const mid = args.includes('--mid');
const ports = args.includes('--ports');
const publish = args.includes('--publish');
const lic = args.includes('--lic');
const acq = args.includes('--acq');
const group = args.includes('--group');
const store = args.includes('--store');
const hw = args.includes('--hw');

async function one(seed) {
  const a = [resolve(here, 'sim.mjs'), `--seed=${seed}`, `--diff=${diff}`, `--end=${end}`, '-v'];
  if (casual) a.push('--casual');
  if (mid) a.push('--mid');
  if (ports) a.push('--ports');
  if (publish) a.push('--publish');
  if (lic) a.push('--lic');
  if (acq) a.push('--acq');
  if (group) a.push('--group');
  if (hw) a.push('--hw');
  if (store) a.push('--store');
  const { stdout } = await run('node', a, { maxBuffer: 1 << 26 });
  const years = [];
  const rel = [];
  let over = null;
  for (const line of stdout.split('\n')) {
    let m = line.match(/^(\d{4}) \$(-?[\d,]+) fans ([\d,]+) staff (\d+) tier (\d) games (\d+) avg\(6\) (\S+) yrRev \$([\d,]+)/);
    if (m) years.push({ y: +m[1], money: +m[2].replace(/,/g, ''), fans: +m[3].replace(/,/g, ''), staff: +m[4], tier: +m[5], games: +m[6], rev: +m[8].replace(/,/g, '') });
    m = line.match(/release (\d{4}): .* score ([\d.]+) total \$(\d+)/);
    if (m) rel.push({ y: +m[1], score: +m[2], total: +m[3] });
    m = line.match(/GAME OVER (\d{4})/);
    if (m) over = +m[1];
  }
  const tierYear = [null, null, null, null, null, null];
  for (const r of years) for (let t = 1; t <= 5; t++) if (r.tier >= t && tierYear[t] == null) tierYear[t] = r.y;
  const at = (y) => years.find((r) => r.y === y);
  return { seed, over, tierYear, years, rel, at };
}

const seeds = Array.from({ length: N }, (_, i) => i + 1);
const res = [];
for (let i = 0; i < seeds.length; i += 3) res.push(...(await Promise.all(seeds.slice(i, i + 3).map(one))));

const med = (v) => { const s = v.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
console.log(`pacing: diff=${diff} ${casual ? 'casual' : mid ? 'mid' : 'optimal'} seeds=${N} end=${end}`);
console.log('seed  over  tier1 tier2 tier3 tier4 tier5 | first6 avg  | money@1981 @1983 @1985 @1990 @2000');
for (const r of res) {
  const first = r.rel.slice(0, 6);
  const fa = first.length ? (first.reduce((a, x) => a + x.score, 0) / first.length).toFixed(1) : '-';
  const m = (y) => { const a = r.at(y); return a ? '$' + Math.round(a.money / 1000) + 'k' : '-'; };
  console.log(`${String(r.seed).padEnd(5)} ${String(r.over ?? '-').padEnd(5)} ${r.tierYear.slice(1).map((y) => String(y ?? '-').padEnd(5)).join(' ')} | ${fa.padEnd(10)} | ${m(1981).padEnd(10)} ${m(1983).padEnd(5)} ${m(1985).padEnd(5)} ${m(1990).padEnd(5)} ${m(2000)}`);
}
// Sammanfattning mot målen: median per nivå, kassa vid årsskiften, första spelens snittbetyg, konkurser.
{
  const cash = (y) => med(res.map((r) => r.at(y)?.money));
  const firstAvg = res.map((r) => { const f = r.rel.slice(0, 6); return f.length ? f.reduce((a, x) => a + x.score, 0) / f.length : null; }).filter((x) => x != null);
  const overs = res.map((r) => r.over).filter((x) => x != null).sort((a, b) => a - b);
  const k = (v) => (v == null ? '-' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.round(v / 1000) + 'k');
  const reach5 = res.filter((r) => r.tierYear[5] != null && r.tierYear[5] <= 2018).length;
  console.log(`summary: cash med @1985 ${k(cash(1985))} @1990 ${k(cash(1990))} @2000 ${k(cash(2000))} | first6 avg ${firstAvg.length ? (firstAvg.reduce((a, x) => a + x, 0) / firstAvg.length).toFixed(2) : '-'} | tier5<=2018 ${reach5}/${N} | bankrupt<1990 ${overs.filter((y) => y < 1990).length} median bankrupt year ${overs.length ? overs[Math.floor(overs.length / 2)] : '-'}`);
}
if (args.includes('--curve')) {
  const k2 = (v) => (v == null ? '-' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.round(v / 1000) + 'k');
  const ys = [];
  for (let y = 1982; y <= 2020; y += 2) ys.push(y);
  console.log('curve year  ' + ys.map((y) => String(y).padEnd(7)).join(''));
  console.log('cash med    ' + ys.map((y) => k2(med(res.map((r) => r.at(y)?.money))).padEnd(7)).join(''));
  console.log('fans med    ' + ys.map((y) => k2(med(res.map((r) => r.at(y)?.fans))).padEnd(7)).join(''));
  console.log('games med   ' + ys.map((y) => String(med(res.map((r) => r.at(y)?.games)) ?? '-').padEnd(7)).join(''));
  console.log('staff med   ' + ys.map((y) => String(med(res.map((r) => r.at(y)?.staff)) ?? '-').padEnd(7)).join(''));
}
console.log(`median tier years: ${[1, 2, 3, 4, 5].map((t) => 't' + t + '=' + (med(res.map((r) => r.tierYear[t])) ?? '-')).join('  ')}  bankrupt: ${res.filter((r) => r.over).length}/${N}`);
