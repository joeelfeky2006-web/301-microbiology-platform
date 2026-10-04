// Exports PNGs for every logo SVG plus app icons and social templates.
// Run from repo root: NODE_PATH=<dir with puppeteer-core> node brand/_source/export_assets.js
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BRAND = path.resolve(__dirname, '..');
const SVG_DIR = path.join(BRAND, 'logo/svg');
const PNG_DIR = path.join(BRAND, 'logo/png');
const ICONS = path.join(BRAND, 'icons');

function svgSize(file) {
  const m = fs.readFileSync(file, 'utf8').match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return [+m[1], +m[2]];
}

async function shot(page, html, out, w, h, { transparent = false } = {}) {
  await page.setViewport({ width: Math.round(w), height: Math.round(h), deviceScaleFactor: 1 });
  const tmp = path.join(require('os').tmpdir(), 'medatlas-export.html');
  fs.writeFileSync(tmp, html);
  await page.goto('file://' + tmp, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, omitBackground: transparent });
}

const imgPage = (src, w, h, bg = 'transparent', inset = 0) =>
  `<html><body style="margin:0;background:${bg};width:${w}px;height:${h}px;display:grid;place-items:center">` +
  `<img src="file://${src}" style="width:${w - 2 * inset}px;height:${h - 2 * inset}px;object-fit:contain"></body></html>`;

(async () => {
  fs.mkdirSync(PNG_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/local/bin/google-chrome',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage();

  for (const f of fs.readdirSync(SVG_DIR).filter((n) => n.endsWith('.svg'))) {
    const src = path.join(SVG_DIR, f);
    const [vw, vh] = svgSize(src);
    const long = /symbol|appicon/.test(f) ? 1024 : 2400;
    const k = long / Math.max(vw, vh);
    await shot(page, imgPage(src, vw * k, vh * k), path.join(PNG_DIR, f.replace('.svg', '.png')), vw * k, vh * k, { transparent: true });
  }

  const icon = path.join(ICONS, 'icon.svg');
  const small = path.join(ICONS, 'favicon-small.svg');
  const maskable = path.join(ICONS, 'icon-maskable.svg');
  const jobs = [
    [icon, 'icon-512.png', 512], [icon, 'icon-192.png', 192], [icon, 'favicon-48.png', 48],
    [small, 'favicon-32.png', 32], [small, 'favicon-16.png', 16],
    [maskable, 'icon-maskable-512.png', 512], [maskable, 'apple-icon-180.png', 180],
  ];
  for (const [src, out, s] of jobs) {
    await shot(page, imgPage(src, s, s), path.join(ICONS, out), s, s, { transparent: true });
  }

  const socialDir = path.join(BRAND, 'social');
  for (const f of fs.readdirSync(socialDir).filter((n) => n.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(socialDir, f), 'utf8');
    const [, w, h] = html.match(/data-size="(\d+)x(\d+)"/);
    await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(socialDir, f), { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(socialDir, 'png', f.replace('.html', '.png')) });
  }
  await browser.close();
})();
