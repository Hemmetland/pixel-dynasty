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
// Prefix som koden bygger på med ett id (t('hw.type.' + id) och liknande). De räknas inte som saknade så länge det finns
// minst en nyckel med prefixet; varje id kontrolleras av testerna eller i strings.js.
const DYN = [
  'arch.', 'compat.', 'diff.', 'expo.d', 'expo.o', 'fin.c.', 'help.', 'hw.arch.', 'hw.cls.', 'hw.clsTip.', 'hw.pd.', 'hw.pk.', 'hw.q.', 'hw.qTip.',
  'hw.tab.', 'hw.type.', 'hw.typeD.', 'ins.', 'ins.audience.', 'ins.bugs.', 'ins.compat.', 'ins.focus.', 'ins.platform.', 'mkt.tab.', 'skill.',
  'staff.train.', 'tut.',
];
if (process.argv.includes('--missing')) {
  const { STRINGS } = await import('../src/data/strings.js');
  const all = Object.keys(STRINGS);
  const dyn = keys.filter((k) => DYN.includes(k));
  const miss = keys.filter((k) => !STRINGS[k] && !DYN.includes(k));
  const empty = dyn.filter((p) => !all.some((k) => k.startsWith(p) && k !== p));
  console.log([...miss, ...empty.map((p) => p + ' (prefix utan nycklar)')].join('\n'));
  console.log('\nMissing:', miss.length + empty.length, 'of', keys.length, `(${dyn.length} known dynamic prefixes)`);
} else console.log(keys.join('\n'));
