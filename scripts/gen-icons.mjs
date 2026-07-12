// Generate PWA app icons (dependency-free PNG encoder) — the "Signal" equalizer
// mark (one bar in the accent colour) on the ink background. Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const INK = [0x19, 0x1a, 0x1d], PAPER = [0xf5, 0xf4, 0xf2], ACCENT = [0xe1, 0x34, 0x1e];

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
function png(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Rounded-rect equalizer icon. pad = safe-zone padding (bigger for maskable).
function icon(size, pad = 0.17, rounded = false) {
  const buf = Buffer.alloc(size * size * 4);
  const px = (x, y, [r, g, b]) => { const i = (y * size + x) * 4; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255; };
  // background (optionally rounded for the non-maskable "any" icon)
  const rad = rounded ? size * 0.22 : 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (rounded) {
      const cx = Math.min(x, size - 1 - x), cy = Math.min(y, size - 1 - y);
      if (cx < rad && cy < rad && Math.hypot(rad - cx, rad - cy) > rad) { const i = (y * size + x) * 4; buf[i + 3] = 0; continue; }
    }
    px(x, y, INK);
  }
  // equalizer bars, vertically centred, one in accent
  const zone = size * (1 - 2 * pad), x0 = size * pad;
  const bars = 5, gap = zone * 0.055;
  const bw = (zone - gap * (bars - 1)) / bars;
  const rel = [0.42, 0.72, 1.0, 0.58, 0.5], accentBar = 2;
  const br = Math.max(2, Math.round(bw * 0.28)); // bar corner radius
  for (let b = 0; b < bars; b++) {
    const bh = Math.round(zone * rel[b]);
    const bx = Math.round(x0 + b * (bw + gap));
    const by = Math.round((size - bh) / 2);
    const w = Math.round(bw), col = b === accentBar ? ACCENT : PAPER;
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + w; x++) {
      const ex = Math.min(x - bx, bx + w - 1 - x), ey = Math.min(y - by, by + bh - 1 - y);
      if (ex < br && ey < br && Math.hypot(br - ex, br - ey) > br) continue; // round corners
      px(x, y, col);
    }
  }
  return png(size, buf);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', icon(192, 0.17));
writeFileSync('public/icon-512.png', icon(512, 0.17));
writeFileSync('public/icon-maskable-512.png', icon(512, 0.26)); // extra safe-zone padding
writeFileSync('public/apple-touch-icon.png', icon(180, 0.16, true)); // rounded, iOS
console.log('✓ wrote public/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png');
