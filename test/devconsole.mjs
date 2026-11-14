// Utvecklarkonsolen (src/ui/devconsole.js) i webbläsaren: dold tills fuskkod skrivs, kommandon, fuskmärkning och studiohallen.
// Kör mot dist/index.html (vanligt bygge, inte --release): node test/devconsole.mjs [bredd] [höjd]
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
mkdirSync('.shots-dev', { recursive: true });
const [W = '1280', H = '800'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, locale: 'sv-SE' });
const page = await ctx.newPage();
const errors = [];
let bad = 0;
const check = (c, m) => {
  if (!c) {
    bad++;
    errors.push('fail: ' + m);
  }
  console.log(c ? 'ok  ' : 'FAIL', m);
};
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const G = (f) => page.evaluate(f);
const newGame = async () => {
  await page.click('[data-act="tt-new"]');
  await page.waitForTimeout(200);
  await page.click('[data-act="ng-go"]');
  await page.waitForFunction(() => window.__G && window.__pd.mode === 'play', null, { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.__pd.settings.tutorial = false;
    window.__pd.setSpeed(0);
    window.__pd.G.pending.length = 0;
    window.__pd.promptActive = false;
  });
};
const run = async (cmd) => {
  await page.fill('#devcon input', cmd);
  await page.press('#devcon input', 'Enter');
  await page.waitForTimeout(60);
};
const last = () => page.evaluate(() => [...document.querySelectorAll('#devcon .dc-l')].slice(-1)[0]?.textContent || '');
const hall = () => page.evaluate(() => JSON.parse(localStorage.getItem('pixel-dynasty-hall-v1') || '[]').length);

await page.goto('file://' + resolve('dist/index.html'));
await page.waitForTimeout(500);

// dold för vanliga spelare
check(await G(() => !document.querySelector('#devpill') || getComputedStyle(document.querySelector('#devpill')).display === 'none'), 'ingen DEV-flagga för en vanlig spelare');
await page.keyboard.press('Backquote');
check(!(await page.$('#devcon')), 'backtick gör inget utan fuskkod');

await newGame();
check(await G(() => !window.__G.flags.cheat), 'nytt spel är inte fuskat');

// fuskkoden slår på läget, inte i textfält
await page.keyboard.type('fuskkod');
await page.waitForTimeout(100);
check(await G(() => getComputedStyle(document.querySelector('#devpill')).display !== 'none'), 'fuskkod visar DEV-flaggan');
check((await page.innerText('#devpill')).trim() === 'DEV', 'flaggan säger DEV tills något ändrats');

await page.evaluate(() => window.__pd.setSpeed(2));
await page.keyboard.press('Backquote');
await page.waitForTimeout(150);
check(await G(() => document.querySelector('#devcon').classList.contains('on')), 'backtick öppnar konsolen');
check(await G(() => window.__pd.speed === 0), 'spelet pausas medan konsolen är öppen');
check(await G(() => document.activeElement === document.querySelector('#devcon input')), 'inmatningsfältet har fokus');
await page.screenshot({ path: `.shots-dev/open-${W}x${H}.png` });

// kommandon som bara läser ändrar inte spelet
await run('help');
check(await G(() => document.querySelectorAll('#devcon .dc-l').length > 20), 'help listar kommandona');
await run('state');
check(await G(() => !window.__G.flags.cheat), 'state märker inte spelet som fuskat');
await run('bogus');
check(/Okänt|Unknown/.test(await last()), 'okänt kommando ger ett felmeddelande');

// pengar
const m0 = await G(() => window.__G.money);
await run('money 5m');
check((await G(() => window.__G.money)) === m0 + 5e6, 'money 5m lägger till fem miljoner');
await run('money =1k');
check((await G(() => window.__G.money)) === 1000, 'money =1k sätter pengarna');
await run('money -2.5k');
check((await G(() => window.__G.money)) === -1500, 'money -2.5k drar ifrån');
await run('money 10m');
check(await G(() => window.__G.flags.cheat === 1), 'ett ändrande kommando märker spelet som fuskat');
check((await page.innerText('#devpill')).includes('FUSK'), 'flaggan säger DEV · FUSK');
await run('fans 12345');
await run('rp 200');
check(await G(() => window.__G.fans >= 12345 && window.__G.rp >= 200), 'fans och rp');

// hoppa i tiden
const t0 = await G(() => window.__G.t);
await run('skip 1y auto');
const t1 = await G(() => window.__G.t);
check(t1 - t0 === 48, `skip 1y auto hoppar ett år (${t1 - t0} veckor)`);
check(await G(() => window.__G.pending.length === 0), 'inga rutor kvar efter auto');
await run('date 1985 auto');
check(await G(() => window.__sim.yearOf(window.__G.t) === 1985), 'date 1985 landar i 1985');
await run('date 1970');
check(/passerat|passed/.test(await last()), 'date bakåt ger ett fel');
await run('skip 3m');
check(await G(() => window.__G.t >= window.__sim.tOf(1985, 0, 0) + 11), 'skip 3m utan auto hoppar tre månader eller stannar vid första rutan');

// forskning, licenser, kontor, personal, upplåsning, prestationer
await run('research all');
check(await G(() => window.__G.research.done.length >= 50 && window.__G.research.active.length === 0), 'research all slutför hela trädet');
await run('license all');
check(await G(() => window.__G.licenses.length >= 5), 'license all ger licenser');
await run('office 3');
check(await G(() => window.__G.office.tier === 3), 'office 3 sätter kontorsnivån');
const staff0 = await G(() => window.__G.staff.length);
const moneyBeforeHire = await G(() => window.__G.money);
await run('hire 2');
check((await G(() => window.__G.staff.length)) === staff0 + 2, 'hire 2 anställer två');
check((await G(() => window.__G.money)) === moneyBeforeHire, 'anställningen kostar inget');
await run('unlock store');
check(await G(() => window.__G.u.flags.store === true), 'unlock store sätter flaggan');
await run('ach all');
check(await G(() => window.__G.ach.length > 20), 'ach all låser upp prestationer');
await run('set u.flags.testflag true');
check(await G(() => window.__G.u.flags.testflag === true), 'set sätter ett värde');
await run('get office.tier');
check((await last()) === '3', 'get läser ett värde');
await run('js G.office.tier + 1');
check((await last()) === '4', 'js kör kod med G i räckhåll');

// händelser och nyheter
await run('event list');
const evId = await G(() => window.__sim && document.querySelector('#devcon .dc-log').lastChild.textContent.split(/\s+/)[0].replace(/\(.*$/, ''));
await run('event ' + evId);
check(await G(() => window.__G.pending.some((p) => p.type === 'event' && p.ev)), `event ${evId} lägger en händelse i kön`);
await G(() => {
  window.__G.pending.length = 0;
  window.__pd.promptActive = false;
});
await run('news warn');
await page.waitForTimeout(150);
check(await G(() => document.querySelectorAll('#events .ev').length >= 1 || document.querySelectorAll('#events > *').length >= 1), 'news warn ger ett händelsekort');
await run('news plain');

// god-läget
await run('god on');
await run('money =0');
await page.waitForTimeout(900);
check((await G(() => window.__G.money)) >= 1e6, 'god håller kassan över en miljon');
await run('god off');

// stänga
await page.press('#devcon input', 'Escape');
await page.waitForTimeout(100);
check(await G(() => !document.querySelector('#devcon').classList.contains('on')), 'Esc stänger konsolen');
check(await G(() => window.__pd.speed === 2), 'farten är tillbaka efter att konsolen stängts');
await page.keyboard.press('Backquote');
await page.waitForTimeout(100);
check(await G(() => document.querySelector('#devcon').classList.contains('on')), 'backtick öppnar igen');
await page.keyboard.press('Backquote');
await page.waitForTimeout(100);
check(await G(() => !document.querySelector('#devcon').classList.contains('on')), 'backtick stänger igen');

// studiohallen: ett fuskat spel räknas inte, ett vanligt gör det (flags.ending gör att sparningen skriver in studion)
await G(() => {
  window.__pd.setSpeed(0);
  window.__G.flags.ending = 1;
  window.__pd.toTitle();
});
await page.waitForTimeout(500);
check((await hall()) === 0, 'ett fuskat spel som tar slut hamnar inte i studiohallen');
await newGame();
await G(() => {
  window.__G.flags.ending = 1;
  window.__pd.toTitle();
});
await page.waitForTimeout(500);
check((await hall()) === 1, 'ett ofuskat spel som tar slut hamnar i studiohallen');

// avstängt och påslaget igen, samt läget sparas mellan sidladdningar
await page.reload();
await page.waitForTimeout(500);
check(await G(() => getComputedStyle(document.querySelector('#devpill')).display !== 'none'), 'utvecklarläget ligger kvar efter omladdning');
await newGame();
await page.keyboard.press('Backquote');
await page.waitForTimeout(150);
await run('off');
check(await G(() => getComputedStyle(document.querySelector('#devpill')).display === 'none'), 'off döljer flaggan');
await page.keyboard.press('Backquote');
check(await G(() => !document.querySelector('#devcon').classList.contains('on')), 'backtick gör inget när läget är av');

check(errors.length === 0, errors.length ? errors.join('\n') : 'inga konsolfel');
await browser.close();
console.log(bad ? `\n${bad} fel` : '\nalla kontroller ok');
process.exit(bad ? 1 : 0);
