const puppeteer = require('puppeteer-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const FPS = 30, DUR = 22;
const HTML = path.resolve(__dirname, '../howto-exam-vault.html');
(async () => {
  const out = process.argv[2] || path.resolve(__dirname, '../howto-exam-vault-22s-9x16.mp4');
  const music = process.argv[3];
  const stills = process.argv.includes('--stills');
  const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'howto-frames-'));
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/local/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto('file://' + HTML, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.ready);
  const times = stills ? [0.8, 3.5, 8.5, 12.5, 16.5, 20.5] : [...Array(FPS * DUR).keys()].map((i) => i / FPS);
  for (const [i, t] of times.entries()) {
    await page.evaluate((s) => window.seek(s), t);
    const file = stills ? path.join(path.dirname(out), `howto-still-${t.toFixed(1)}s.png`) : path.join(frames, `f${String(i).padStart(4, '0')}.jpg`);
    await page.screenshot(stills ? { path: file } : { path: file, type: 'jpeg', quality: 92 });
  }
  await browser.close();
  if (stills) return;
  const args = ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%04d.jpg')];
  if (music) args.push('-i', music, '-filter_complex', '[1:a]volume=0.7,afade=t=in:st=0:d=0.4,afade=t=out:st=20.8:d=1.2,loudnorm=I=-14:TP=-1.5:LRA=11[a]', '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
  else args.push('-an');
  args.push('-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'fast', '-movflags', '+faststart', '-t', String(DUR), out);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  fs.rmSync(frames, { recursive: true, force: true });
  console.log('wrote', out);
})();
