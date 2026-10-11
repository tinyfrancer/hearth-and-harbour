// Screenshots of the study's pages, for the review sheets:
//   node study/title-and-icon/shoot.mjs out-dir job [job ...]
// where a job is `view[&query]:file.png:width:height:dpr`. Needs the dev
// server (npx vite --port 5191) and Playwright outside the repo (set PW to
// its index.mjs). Waits for the page to set window.ready.
const PW =
  process.env.PW ??
  '/tmp/claude-0/-home-claude/5abe8086-2e01-47f3-b9bb-66e87e0fd915/scratchpad/node_modules/playwright-core/index.mjs';
const { chromium } = await import(PW);
const PORT = process.env.PORT ?? '5191';
const [out, ...jobs] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const job of jobs) {
  const [view, file, w = '390', h = '844', dpr = '3'] = job.split(':');
  const page = await browser.newPage({
    viewport: { width: Number(w), height: Number(h) },
    deviceScaleFactor: Number(dpr),
  });
  page.on('pageerror', (e) => console.error('pageerror', view, e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('console', view, m.text()));
  await page.goto(`http://localhost:${PORT}/study/title-and-icon/index.html?v=${view}`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}/${file}`, fullPage: true });
  console.log('wrote', file);
  await page.close();
}
await browser.close();
