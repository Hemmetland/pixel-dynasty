// Listar alla i18n-nycklar som används i koden (statiska + kända dynamiska).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const out = new Set();
function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js') && !p.endsWith('strings.js')) {
      const s = readFileSync(p, 'utf8');
      for (const m of s.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) out.add(m[1]);
      for (const m of s.matchAll(/(?:tr\(G,\s*)'([a-zA-Z0-9_.]+)'/g)) out.add(m[1]);
      for (const m of s.matchAll(/note\(G,\s*'([a-zA-Z0-9_.]+)'/g)) out.add(m[1]);
      for (const m of s.matchAll(/'((?:dock|dev|wiz|ui|hud|stat|tip|res|staff|studio|mkt|fin|lib|work|mk|ach|menu|set|help|title|ng|intro|tut|rep|ins|ev|aw|expo|year|over|end|toast|err|misc|focus|phase|compat)\.[a-zA-Z0-9_.]+)'/g)) out.add(m[1]);
    }
  }
}
walk('src');
const keys = [...out].sort();
if (process.argv.includes('--missing')) {
  const { STRINGS } = await import('../src/data/strings.js');
  const miss = keys.filter((k) => !STRINGS[k]);
  console.log(miss.join('\n'));
  console.log('\nMissing:', miss.length, 'of', keys.length);
} else console.log(keys.join('\n'));
