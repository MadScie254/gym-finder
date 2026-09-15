import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function pixel(x, y, size) {
  const scale = size / 512;
  const dx = x - 256 * scale;
  const dy = y - 256 * scale;
  const inCircle = dx * dx + dy * dy < (168 * scale) ** 2;
  const bar = y >= 226 * scale && y <= 286 * scale && x >= 86 * scale && x <= 426 * scale;
  const left = y >= 206 * scale && y <= 306 * scale && x >= 118 * scale && x <= 170 * scale;
  const right = y >= 206 * scale && y <= 306 * scale && x >= 342 * scale && x <= 394 * scale;
  const hole = dx * dx + dy * dy < (18 * scale) ** 2;
  if (hole && inCircle) return [12, 15, 14, 255];
  if (left || right) return [255, 248, 245, 255];
  if (bar) return [255, 42, 0, 255];
  if (inCircle) return [23, 28, 26, 255];
  return [12, 15, 14, 255];
}

function createPng(size) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y, size);
      const offset = y * stride + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(root, { recursive: true });
writeFileSync(join(root, "icon-192.png"), createPng(192));
writeFileSync(join(root, "icon-512.png"), createPng(512));
writeFileSync(join(root, "apple-touch-icon.png"), createPng(180));
console.log("Wrote PWA icons");
