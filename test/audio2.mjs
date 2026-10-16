import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('file://' + resolve('dist/index.html'));
await page.waitForTimeout(500);
await page.mouse.click(10, 10);
const r = await page.evaluate(async () => {
  let max = 0;
  const sample = () => (max = Math.max(max, window.__audioLevel()));
  const iv = setInterval(sample, 10);
  document.querySelector('[data-act="tt-help"]').click();
  await new Promise((res) => setTimeout(res, 700));
  clearInterval(iv);
  return max;
});
console.log('sfx peak rms:', r.toFixed(4));
await browser.close();
