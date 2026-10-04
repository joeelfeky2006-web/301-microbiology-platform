// Usage: node render.js <file.html|file.svg> <out.png|out.pdf> <width> <height> [deviceScale] [--transparent]
// Needs puppeteer-core and Chrome (CHROME env var, default /usr/local/bin/google-chrome).
const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const [src, out, w, h, scale = '1'] = process.argv.slice(2);
  const transparent = process.argv.includes('--transparent');
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/local/bin/google-chrome',
    args: ['--no-sandbox', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: +w, height: +h, deviceScaleFactor: +scale });
  await page.goto('file://' + path.resolve(src), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  if (out.endsWith('.pdf')) {
    await page.pdf({ path: out, width: `${w}px`, height: `${h}px`, printBackground: true, pageRanges: '1' });
  } else {
    await page.screenshot({ path: out, omitBackground: transparent, clip: { x: 0, y: 0, width: +w, height: +h } });
  }
  await browser.close();
})();
