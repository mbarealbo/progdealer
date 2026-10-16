// Generate the default Open Graph share image public/og-default.png (1200x630)
// in the "Gatefold" look: a record sleeve with the vinyl sliding out, the
// wordmark and the tagline, set in the site's own fonts.
// Renders an HTML card with a local headless Chrome (no npm dependency):
//   node scripts/gen-og.mjs            (macOS default Chrome path)
//   CHROME=/path/to/chrome node scripts/gen-og.mjs
import { writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME}. Set CHROME=/path/to/chrome.`);
  process.exit(1);
}

const font = (p) => pathToFileURL(resolve('node_modules', p)).href;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Young Serif'; src: url('${font('@fontsource/young-serif/files/young-serif-latin-400-normal.woff2')}') format('woff2'); }
@font-face { font-family: 'Instrument Sans'; font-weight: 400 700; src: url('${font('@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2')}') format('woff2'); }
@font-face { font-family: 'IBM Plex Mono'; src: url('${font('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2')}') format('woff2'); }
html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #ECE7DC; }
body { display: flex; align-items: center; gap: 56px; padding: 0 64px; box-sizing: border-box; font-family: 'Instrument Sans', sans-serif; color: #24261F; }
.sleeve { position: relative; flex: 0 0 auto; width: 490px; height: 340px; }
.vinyl { position: absolute; left: 175px; top: 6px; width: 310px; height: 310px; border-radius: 50%; background: #24261F; }
.vinyl i { position: absolute; border-radius: 50%; border: 1px solid #45473D; }
.lbl { position: absolute; left: 103px; top: 103px; width: 104px; height: 104px; border-radius: 50%; background: #D49A12; overflow: hidden; }
.lbl::before { content: ''; position: absolute; left: 52px; top: 0; width: 52px; height: 52px; background: #1F5C5A; }
.hole { position: absolute; left: 150px; top: 150px; width: 10px; height: 10px; border-radius: 50%; background: #ECE7DC; }
.cover { position: absolute; left: 0; top: 0; width: 330px; height: 330px; overflow: hidden; background: #1F5C5A; box-shadow: 10px 10px 0 rgba(36, 38, 31, 0.16); }
.sun { position: absolute; right: -44px; bottom: -44px; width: 244px; height: 244px; border-radius: 50%; background: #D49A12; }
.cut { position: absolute; left: 0; right: 0; background: #1F5C5A; }
.cat { position: absolute; left: 16px; top: 14px; font-family: 'IBM Plex Mono', monospace; font-size: 14px; letter-spacing: 0.12em; color: #ECE7DC; }
.copy { flex: 1; min-width: 0; }
.eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 18px; letter-spacing: 0.16em; text-transform: uppercase; color: #5B5A50; }
h1 { margin: 18px 0 0; font-family: 'Young Serif', serif; font-weight: 400; font-size: 92px; line-height: 0.95; letter-spacing: -0.02em; }
p { margin: 22px 0 0; font-family: 'Young Serif', serif; font-size: 34px; white-space: nowrap; line-height: 1.1; color: #24261F; }
.rule { margin-top: 30px; padding-top: 14px; border-top: 2px solid #24261F; font-family: 'IBM Plex Mono', monospace; font-size: 15px; letter-spacing: 0.08em; white-space: nowrap; text-transform: uppercase; color: #4A4A41; }
</style></head><body>
<div class="sleeve">
  <div class="vinyl"><i style="inset:20px"></i><i style="inset:44px"></i><i style="inset:68px"></i><span class="lbl"></span><span class="hole"></span></div>
  <div class="cover"><div class="sun"></div>
    <div class="cut" style="bottom:99px;height:13px"></div><div class="cut" style="bottom:70px;height:11px"></div>
    <div class="cut" style="bottom:43px;height:9px"></div><div class="cut" style="bottom:20px;height:7px"></div>
    <span class="cat">PD-MAP</span></div>
</div>
<div class="copy">
  <div class="eyebrow">Side A · The map</div>
  <h1>ProgDealer</h1>
  <p>Every prog show, on the map.</p>
  <div class="rule">Live progressive concerts &amp; festivals worldwide</div>
</div>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'pd-og-'));
const page = join(dir, 'og.html');
writeFileSync(page, html);
execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  '--window-size=1200,630', '--virtual-time-budget=3000', `--screenshot=${resolve('public/og-default.png')}`, pathToFileURL(page).href,
], { stdio: 'ignore' });
console.log('wrote public/og-default.png');
