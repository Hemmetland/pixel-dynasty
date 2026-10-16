// Tar skärmdump av en sida: node test/shot.mjs <url|fil> <ut.png> [bredd] [höjd] [js att köra]
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
const [, , target, out, w = '1280', h = '720', script = '', wait = '600'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const [tp, tq] = target.split('?');
const url = target.startsWith('http') ? target : 'file://' + resolve(tp) + (tq ? '?' + tq : '');
await page.goto(url);
await page.waitForTimeout(+wait);
if (script) { await page.evaluate(script); await page.waitForTimeout(+wait); }
await page.screenshot({ path: out });
if (errors.length) console.log(errors.slice(0, 10).join('\n'));
await browser.close();
