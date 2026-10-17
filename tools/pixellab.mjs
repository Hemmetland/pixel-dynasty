// Liten kommandorad mot PixelLabs REST-API (v2). Token läses ur miljövariabeln PIXELLAB_API_TOKEN (aldrig i filer eller chatten).
//   node tools/pixellab.mjs balance
//   node tools/pixellab.mjs get /characters
//   node tools/pixellab.mjs post /create-image-pixflux '{"description":"...","image_size":{"width":64,"height":64}}'
//   node tools/pixellab.mjs job <job_id>            visar status för ett bakgrundsjobb
//   node tools/pixellab.mjs wait <job_id> [sek]     väntar tills jobbet är klart och skriver svaret
//   node tools/pixellab.mjs save <url|base64-fält-i-json-fil> <ut.png>
// Alla anrop skriver JSON till stdout (base64-bilder kortas av i loggen men sparas hela med "save"). Kolla "balance" före och efter
// större körningar: varje generering kostar krediter. Spec: https://api.pixellab.ai/v2/openapi.json, guide: https://api.pixellab.ai/v2/llms.txt
import { writeFile, readFile } from 'node:fs/promises';

const BASE = 'https://api.pixellab.ai/v2';
const token = process.env.PIXELLAB_API_TOKEN;
const [, , cmd, a, b, c] = process.argv;

async function api(method, path, body) {
  if (!token) throw new Error('PIXELLAB_API_TOKEN saknas i miljön (lägg den som hemlig miljövariabel, klistra aldrig in den i chatten).');
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json).slice(0, 600)}`);
  return json;
}

const short = (o) => JSON.stringify(o, (k, v) => (typeof v === 'string' && v.length > 200 ? v.slice(0, 60) + `…(${v.length} tecken)` : v), 2);

try {
  if (cmd === 'balance') console.log(short(await api('GET', '/balance')));
  else if (cmd === 'get') console.log(short(await api('GET', a)));
  else if (cmd === 'post') console.log(short(await api('POST', a, JSON.parse(b || '{}'))));
  else if (cmd === 'job') console.log(short(await api('GET', `/background-jobs/${a}`)));
  else if (cmd === 'wait') {
    const until = Date.now() + (+b || 300) * 1000;
    for (;;) {
      const j = await api('GET', `/background-jobs/${a}`);
      const st = String(j.status || j.state || '').toLowerCase();
      if (!st || ['completed', 'complete', 'done', 'succeeded', 'failed', 'error', 'cancelled'].includes(st) || Date.now() > until) { console.log(short(j)); break; }
      await new Promise((r) => setTimeout(r, 4000));
    }
  } else if (cmd === 'save') {
    let bytes;
    if (/^https?:/.test(a)) {
      const res = await fetch(a.includes('?') ? a : a + '?inline=true');
      if (!res.ok) throw new Error(`${a} -> ${res.status}`);
      bytes = Buffer.from(await res.arrayBuffer());
    } else {
      // a = sökväg till en JSON-fil, c = punktad väg till base64-fältet, t.ex. image.base64
      const j = JSON.parse(await readFile(a, 'utf8'));
      const v = c.split('.').reduce((o, k) => o && o[k], j);
      bytes = Buffer.from(String(v).replace(/^data:image\/\w+;base64,/, ''), 'base64');
    }
    await writeFile(b, bytes);
    console.log(`sparade ${b} (${bytes.length} byte)`);
  } else {
    console.log('Kommandon: balance | get <väg> | post <väg> <json> | job <id> | wait <id> [sek] | save <url|json-fil> <ut.png> [fält]');
  }
} catch (e) {
  console.error(String(e.message || e));
  process.exit(1);
}
