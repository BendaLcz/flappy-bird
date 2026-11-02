// Generates the PWA icons (PNG) without any dependencies: `npm run icons`.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "icons",
);
mkdirSync(outDir, { recursive: true });

// ---- tiny PNG encoder ----
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(size, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- the icon artwork, as a function of normalized (u, v) in [0, 1] ----
const inCircle = (u, v, cx, cy, r) => (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
const inEllipse = (u, v, cx, cy, rx, ry) =>
  ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;
function inTriangle(u, v, a, b, c) {
  const s = (p, q, r) =>
    (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const p = [u, v];
  const d1 = s(p, a, b);
  const d2 = s(p, b, c);
  const d3 = s(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));

function pixel(u, v) {
  const cy = 0.48;
  // bird (outline first, then fills)
  if (
    inTriangle(u, v, [0.33, 0.46], [0.15, 0.38], [0.18, 0.56]) &&
    !inCircle(u, v, 0.5, cy, 0.24)
  )
    return [58, 43, 0];
  if (inCircle(u, v, 0.58, 0.42, 0.027)) return [0, 0, 0];
  if (inCircle(u, v, 0.58, 0.42, 0.06)) return [255, 255, 255];
  if (inCircle(u, v, 0.58, 0.42, 0.075)) return [58, 43, 0];
  if (inTriangle(u, v, [0.7, 0.5], [0.87, 0.54], [0.7, 0.61]))
    return [242, 100, 31];
  if (inEllipse(u, v, 0.44, 0.53, 0.1, 0.065)) return [240, 180, 0];
  if (inEllipse(u, v, 0.53, 0.6, 0.12, 0.06)) return [255, 243, 176];
  if (inCircle(u, v, 0.5, cy, 0.24)) return [247, 210, 30];
  if (inCircle(u, v, 0.5, cy, 0.26)) return [58, 43, 0];
  // ground
  if (v > 0.88) return v < 0.91 ? [115, 191, 46] : [222, 216, 149];
  // sky
  return mix([78, 192, 202], [205, 239, 242], v / 0.88);
}

function render(size) {
  const SS = 3; // supersampling for smooth edges
  const rgb = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [pr, pg, pb] = pixel(
            (x + (sx + 0.5) / SS) / size,
            (y + (sy + 0.5) / SS) / size,
          );
          r += pr;
          g += pg;
          b += pb;
        }
      }
      const i = (y * size + x) * 3;
      rgb[i] = r / (SS * SS);
      rgb[i + 1] = g / (SS * SS);
      rgb[i + 2] = b / (SS * SS);
    }
  }
  return encodePng(size, rgb);
}

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  writeFileSync(join(outDir, name), render(size));
  console.log(`wrote public/icons/${name}`);
}
