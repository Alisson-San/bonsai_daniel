// Regenerates public/images/hero-poster-{dark,light}.webp, the still of the 3D hero shown on phones
// while the live scene loads. Run after changing the scene: npm run build && npm run preview, then
// node scripts/poster.cjs [url]. Needs Playwright with Chromium (npx playwright install chromium).
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const url = process.argv[2] || 'http://localhost:4173/';

(async () => {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  for (const theme of ['dark', 'light']) {
    // Phone width: below 800px the stage keeps one aspect ratio, so the still lines up with the live scene.
    const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.addInitScript(value => localStorage.setItem('bourscheid-theme', value), theme);
    await page.goto(url);
    await page.waitForSelector('.hero-spatial.is-ready', { timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    // Only the WebGL canvas, on a transparent page.
    await page.addStyleTag({ content: 'html,body,.site,.hero,.hero-spatial,.hero-stage{background:none!important}.hero-stage::before,.hero-spatial::before,.hero-copy,.site-header,.falling-leaves{visibility:hidden!important}' });
    await page.waitForTimeout(300);
    const box = await page.locator('.hero-stage').boundingBox();
    const png = `public/images/hero-poster-${theme}.png`;
    await page.screenshot({ path: png, clip: box, omitBackground: true });
    // The scene's faint glow leaves a few percent of alpha everywhere; dropping it keeps the file ~40 KB instead of ~340 KB.
    execFileSync('convert', [png, '-channel', 'A', '-fx', 'u<0.04?0:u', '+channel', '-quality', '78', '-define', 'webp:alpha-quality=70', '-define', 'webp:alpha-filter=best', '-define', 'webp:method=6', `public/images/hero-poster-${theme}.webp`]);
    execFileSync('rm', [png]);
    await page.close();
  }
  await browser.close();
})();
