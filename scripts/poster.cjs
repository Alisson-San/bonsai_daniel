// Regenerates public/images/hero-poster-{dark,light}[-large].webp, the stills of the 3D hero shown while the live
// scene loads (the plain ones up to 800px wide, the -large ones above). Run after changing the scene:
// npm run build && npm run preview, then node scripts/poster.cjs [url]. Needs Playwright with Chromium
// (npx playwright install chromium) and ImageMagick. THREE_DIR=<unpacked three@0.180.0 package> serves Three.js
// from disk instead of the CDN.
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const url = process.argv[2] || 'http://localhost:4173/';
const sizes = [
  { suffix: '', viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { suffix: '-large', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
];

async function serveThreeFromDisk(page, dir) {
  const core = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.core.min.js', module = 'https://cdn.jsdelivr.net/npm/three@0.180.0/+esm';
  await page.route(/cdn\.jsdelivr\.net/, route => {
    const target = route.request().url();
    let body;
    if (target === module) body = fs.readFileSync(`${dir}/build/three.module.min.js`, 'utf8').replace(/from"\.\/three\.core\.min\.js"/g, `from"${core}"`);
    else if (target === core) body = fs.readFileSync(`${dir}/build/three.core.min.js`);
    else if (target.includes('RoomEnvironment')) body = fs.readFileSync(`${dir}/examples/jsm/environments/RoomEnvironment.js`, 'utf8').replace(/from 'three'/g, `from '${module}'`);
    else return route.abort();
    return route.fulfill({ body, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
  });
}

(async () => {
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  for (const { suffix, ...device } of sizes) for (const theme of ['dark', 'light']) {
    // Reduced motion renders one still frame instead of animating, which a software renderer cannot keep up with.
    const page = await browser.newPage({ ...device, reducedMotion: 'reduce' });
    if (process.env.THREE_DIR) await serveThreeFromDisk(page, process.env.THREE_DIR);
    await page.addInitScript(value => localStorage.setItem('bourscheid-theme', value), theme);
    await page.goto(url);
    await page.waitForSelector('.hero-spatial.is-ready', { timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    // Only the WebGL canvas, on a transparent page.
    await page.addStyleTag({ content: 'html,body,.site,.hero,.hero-spatial,.hero-stage{background:none!important}.hero-stage::before,.hero-spatial::before,.hero-copy,.site-header,.falling-leaves{visibility:hidden!important}' });
    await page.waitForTimeout(300);
    // The box the camera fits the composition into: the largest box of the poster's aspect centred in the stage.
    const box = await page.evaluate(() => {
      const stage = document.querySelector('.hero-stage').getBoundingClientRect(), aspect = Number(document.getElementById('bonsai-3d-hero').dataset.posterAspect);
      const width = Math.min(stage.width, stage.height * aspect), height = width / aspect;
      return { x: stage.left + (stage.width - width) / 2, y: stage.top + (stage.height - height) / 2, width, height };
    });
    const png = `public/images/hero-poster-${theme}${suffix}.png`;
    await page.screenshot({ path: png, clip: box, omitBackground: true });
    // The scene's faint glow leaves a few percent of alpha everywhere; dropping it keeps the file several times smaller.
    execFileSync('convert', [png, '-channel', 'A', '-fx', 'u<0.04?0:u', '+channel', '-quality', '78', '-define', 'webp:alpha-quality=70', '-define', 'webp:alpha-filter=best', '-define', 'webp:method=6', `public/images/hero-poster-${theme}${suffix}.webp`]);
    fs.rmSync(png);
    await page.close();
  }
  await browser.close();
})();
