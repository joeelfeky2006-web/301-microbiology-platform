// Renders brand/video/ad.html frame-by-frame, then muxes voiceover + music into an Instagram-ready MP4.
// Usage: NODE_PATH=<dir with puppeteer-core> node render_video.js <audio-dir> [out.mp4] [--stills]
//   <audio-dir> must contain vo_1..vo_5.wav and music.wav (see build_audio.sh).
const puppeteer = require('puppeteer-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const FPS = 30;
const DUR = 15;
const HTML = path.resolve(__dirname, '../ad.html');
// voiceover start times (s), matched to scene windows in ad.html
const VO_AT = [0.25, 1.85, 5.95, 10.6, 13.05];

(async () => {
  const [audioDir, out = path.resolve(__dirname, '../medatlas-ad-15s-9x16.mp4')] = process.argv.slice(2);
  const stills = process.argv.includes('--stills');
  const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'medatlas-frames-'));
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/local/bin/google-chrome',
    args: ['--no-sandbox', '--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto('file://' + HTML, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.ready);

  const times = stills ? [0.9, 2.6, 4.6, 7.6, 9.8, 11.8, 14.3] : [...Array(FPS * DUR).keys()].map((i) => i / FPS);
  for (const [i, t] of times.entries()) {
    await page.evaluate((s) => window.seek(s), t);
    const file = stills ? path.join(path.dirname(out), `still-${t.toFixed(1)}s.png`) : path.join(frames, `f${String(i).padStart(4, '0')}.jpg`);
    await page.screenshot(stills ? { path: file } : { path: file, type: 'jpeg', quality: 94 });
  }
  await browser.close();
  if (stills) return;

  const voIn = VO_AT.flatMap((_, i) => ['-i', path.join(audioDir, `vo_${i + 1}.wav`)]);
  const delays = VO_AT.map((s, i) => `[${i + 2}:a]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)},aformat=channel_layouts=stereo,volume=1.6[v${i}]`).join(';');
  const voMix = `${VO_AT.map((_, i) => `[v${i}]`).join('')}amix=inputs=${VO_AT.length}:normalize=0[vo]`;
  // music ducks under the voice
  const filter = `${delays};${voMix};[vo]asplit[vo1][vo2];[1:a]volume=0.55[mus];[mus][vo2]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=250[duck];[duck][vo1]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]`;
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%04d.jpg'),
    '-i', path.join(audioDir, 'music.wav'), ...voIn,
    '-filter_complex', filter, '-map', '0:v', '-map', '[aout]',
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(DUR), out,
  ], { stdio: 'inherit' });
  fs.rmSync(frames, { recursive: true, force: true });
  console.log('wrote', out);
})();
