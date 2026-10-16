// Generate the PWA app icons (dependency-free PNG encoder): the "Gatefold"
// record-label mark (ink disc, grooves, mustard label with a petrol-teal
// quarter, spindle hole) on paper. Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const PAPER = [0xec, 0xe7, 0xdc], INK = [0x24, 0x26, 0x1f], GROOVE = [0x4a, 0x4c, 0x42];
const MUSTARD = [0xd4, 0x9a, 0x12], TEAL = [0x1f, 0x5c, 0x5a];

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

// Colour of the mark at (u, v), in the mark's own 40-unit space centred on 20,20.
function markColor(u, v) {
  const dx = u - 20, dy = v - 20, d = Math.hypot(dx, dy);
  if (d > 19) return null; // outside the disc: background
  if (d <= 1.8) return PAPER; // spindle hole
  if (d <= 7.8) return dx >= 0 && dy <= 0 ? TEAL : MUSTARD; // label, teal top-right quarter
  if (Math.abs(d - 14.5) <= 0.4 || Math.abs(d - 11.5) <= 0.4) return GROOVE;
  return INK;
}

// `scale` = disc diameter as a share of the icon (smaller for maskable safe zone).
function icon(size, scale) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 4; // supersampling per axis, for smooth edges
  const unit = (size * scale) / 38; // 38 units = disc diameter
  const off = size / 2 - 20 * unit;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const u = (x + (sx + 0.5) / SS - off) / unit;
        const v = (y + (sy + 0.5) / SS - off) / unit;
        const c = markColor(u, v) || PAPER;
        r += c[0]; g += c[1]; b += c[2];
      }
      const i = (y * size + x) * 4, n = SS * SS;
      buf[i] = Math.round(r / n); buf[i + 1] = Math.round(g / n); buf[i + 2] = Math.round(b / n); buf[i + 3] = 255;
    }
  }
  return png(size, buf);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', icon(192, 0.78));
writeFileSync('public/icon-512.png', icon(512, 0.78));
writeFileSync('public/icon-maskable-512.png', icon(512, 0.62)); // stays inside the maskable safe zone
writeFileSync('public/apple-touch-icon.png', icon(180, 0.74)); // full-bleed paper, iOS rounds the corners
console.log('wrote public/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png');
