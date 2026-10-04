// Draws the home-screen icons from a pixel grid and writes them as PNGs, with
// no image library: `npm run icons`. Placeholder art in the approved palette
// (a hearth fire over harbour water); the art passes may redraw it.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const COLOURS = {
  '.': '#1e1a2a',
  y: '#ffe27a',
  o: '#ff8a30',
  r: '#d8442a',
  w: '#7a4a2c',
  W: '#52301e',
  l: '#6fd6ee',
  m: '#3fb2e2',
  b: '#2a86c9',
};

// 16 x 16. The picture sits in the middle 12, inside the safe zone a phone's
// icon mask keeps, so one drawing serves both the plain and maskable icons.
const GRID = [
  '................',
  '................',
  '.......o........',
  '......oo..o.....',
  '......oyo.......',
  '.....ooyoo......',
  '....rooyyor.....',
  '....royyyyor....',
  '....royyyyor....',
  '.....royyor.....',
  '...WwwwwwwwwW...',
  '................',
  '..ll..lll..ll...',
  '..mmllmmmllmml..',
  '..bbmmbbbmmbbm..',
  '................',
];

const rgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));

function crc32(bytes) {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function png(size) {
  const cell = size / GRID.length;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 3 + 1);
    for (let x = 0; x < size; x += 1) {
      const colour = rgb(COLOURS[GRID[Math.floor(y / cell)][Math.floor(x / cell)]]);
      raw.set(colour, row + 1 + x * 3);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const row of GRID) {
  if (row.length !== GRID.length) throw new Error(`icon row is not ${GRID.length} wide: ${row}`);
}
mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192));
writeFileSync('public/icons/icon-512.png', png(512));
// 180 is not a whole multiple of 16, so this one is drawn at 176 worth of
// cells: iOS scales it the last step.
writeFileSync('public/icons/apple-touch-icon.png', png(176));
console.log('icons written');
