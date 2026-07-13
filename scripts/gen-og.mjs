// Generate the default Open Graph share image public/og-default.png (1200×630),
// dependency-free — the "Signal" equalizer mark + PROGDEALER wordmark on ink.
// Run: node scripts/gen-og.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const W = 1200, H = 630;
const INK = [0x19, 0x1a, 0x1d], PAPER = [0xf5, 0xf4, 0xf2], ACCENT = [0xe1, 0x34, 0x1e];

// ---- minimal PNG encoder (truecolour+alpha) ----
const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const buf = Buffer.alloc(W * H * 4);
const px = (x, y, [r, g, b]) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
};
const rect = (x, y, w, h, col) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(xx, yy, col); };

// background
rect(0, 0, W, H, INK);

// ---- equalizer mark (5 bars, middle one accent), centred, upper area ----
(() => {
  const rel = [0.42, 0.72, 1.0, 0.58, 0.5], accent = 2;
  const zoneH = 150, maxH = zoneH, cy = 210;
  const bw = 26, gap = 16, bars = rel.length;
  const totalW = bars * bw + (bars - 1) * gap;
  const x0 = Math.round((W - totalW) / 2);
  for (let b = 0; b < bars; b++) {
    const bh = Math.round(maxH * rel[b]);
    const bx = x0 + b * (bw + gap);
    const by = Math.round(cy - bh / 2);
    rect(bx, by, bw, bh, b === accent ? ACCENT : PAPER);
  }
})();

// ---- 5×7 bitmap wordmark "PROGDEALER" (PROG paper, DEALER accent) ----
const FONT = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
};
(() => {
  const word = 'PROGDEALER';
  const paperCount = 4; // "PROG"
  const s = 13;                         // pixel scale per font cell
  const glyphW = 5 * s, glyphGap = 1 * s, glyphH = 7 * s;
  const totalW = word.length * glyphW + (word.length - 1) * glyphGap;
  let x = Math.round((W - totalW) / 2);
  const y = 355;
  for (let n = 0; n < word.length; n++) {
    const g = FONT[word[n]];
    const col = n < paperCount ? PAPER : ACCENT;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
      if (g[r][c] === '1') rect(x + c * s, y + r * s, s, s, col);
    }
    x += glyphW + glyphGap;
  }
  // accent baseline under the wordmark
  rect(Math.round((W - totalW) / 2), y + glyphH + 22, totalW, 6, ACCENT);
})();

mkdirSync('public', { recursive: true });
writeFileSync('public/og-default.png', png(W, H, buf));
console.log('✓ wrote public/og-default.png (1200×630)');
