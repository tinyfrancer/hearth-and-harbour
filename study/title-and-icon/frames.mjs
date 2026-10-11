// Frames of an animated title for a GIF: node study/title-and-icon/frames.mjs <out-dir> <title id> <frames> [dpr]
// Each frame is the whole phone screen (picture and controls) at time i/frames of the title's loop.
// Needs the dev server (npx vite --port 5191) and Playwright outside the repo (PW env var).
const PW =
  process.env.PW ??
  '/tmp/claude-0/-home-claude/5abe8086-2e01-47f3-b9bb-66e87e0fd915/scratchpad/node_modules/playwright-core/index.mjs';
const { chromium } = await import(PW);
const [out, id, n = '24', dpr = '2'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: Number(dpr),
});
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto(
  `http://localhost:${process.env.PORT ?? '5191'}/study/title-and-icon/index.html?v=title&o=${id}`,
);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
const loop = await page.evaluate(() => window.loopMs);
const screen = await page.$('.hh-screen');
for (let i = 0; i < Number(n); i++) {
  const t = (i / Number(n)) * loop;
  await page.evaluate((time) => window.paintAt(time), t);
  await screen.screenshot({ path: `${out}/${id}-${String(i).padStart(3, '0')}.png` });
}
console.log('frames', id, n, 'loop', loop, 'ms per frame', loop / Number(n));
await browser.close();
