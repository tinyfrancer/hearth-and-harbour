// Draws the home-screen icons from pixel grids and writes them as PNGs (and
// a pixel SVG for the browser tab), with no image library: `npm run icons`.
//
// The ship at sunset (Cody's choice, option 4 of the title-and-icon study,
// branch study/title-and-icon, `icons.ts`): a black cutter in the sun's disc
// over a banded dusk sky and gold glitter on the water. Harvested as its
// colour grids: the 36 x 36 drawing, and the same motif with its field grown
// to 48 x 48 for the maskable icon, so a launcher's mask never cuts the ship.
//
// Sizes: 180 for iPhones (36 x 5, exact); 192 and 512 (36 x 5 and 36 x 14,
// the field run out to the edge: neither divides by 36); maskable 192 and 512
// (48 x 4 exact, and 48 x 10 with the field run out); a 32-pixel favicon (the
// 36 drawing less a 2-pixel border of sky and sea) and an SVG favicon.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

// The study's ramps: skyLo (0 to 6), the sun's gilt (a to c), the sunset
// sea (p to v), and the hull's tar.
const COLOURS = {
  0: '#f6c47a',
  1: '#eea06c',
  2: '#dc8068',
  3: '#c0686e',
  4: '#9c5878',
  5: '#7c4c7a',
  6: '#5e4278',
  a: '#fffbe0',
  b: '#ffe9a0',
  c: '#ffd34d',
  p: '#ffe6a8',
  r: '#d88070',
  s: '#a8607a',
  t: '#7a4a78',
  u: '#523a6c',
  v: '#2e2450',
  '#': '#120a14',
};

// The ship at sunset, 36 x 36: the iPhone icon at 5 pixels a cell.
const GRID = [
  '666666666666666666666666666666666666',
  '666666666666666666666666666666666666',
  '666666666666666666####66666666666666',
  '6666666666655cccc#####cc666666666555',
  '55555555555cccbbb####bbccc5555555555',
  '5555555555ccbbbaa#aaaabbbcc555555555',
  '555555555cbbbaaaa#######bbbc55555555',
  '55444444cbbbaaa#a########bbbc4444445',
  '4444444ccbaaaaa#a#########abcc444444',
  '4444444cbbaaaa##a##########bbc444444',
  '444444cbbaaaa###a###########bbc44444',
  '333333cbaaaaa###a###########abc33333',
  '33333ccbaaaa####a###########abcc3333',
  '33333cbbaaa#####a###########abbc3333',
  '22222cbbaaa#####a###########abbc3322',
  '22222cbbaa######a###########abbc2222',
  '22222cbba#######a###########abbc2222',
  '22222cbba#######a###########abbc2222',
  '22211cbb########a###############1111',
  '11111cc#########a###############1111',
  '1###############a###############1111',
  '11111###########################0000',
  '000000#########################00000',
  '0000000#######################000000',
  'rrrrrrrr#####################rrrrrrr',
  'rrrrrrrrrppppppppppppppppppppprrrrrr',
  'ssssssssssssssccsccccrcrrrrrrrrrrsss',
  'ssssssssssssssbbbbsbbbbssssrssssssss',
  'sssssssssssssccsccccscccssssssssssss',
  'tttttttttttttbbbbtbbbbsbbssssssstttt',
  'ttttttttttttcttcccttcccttctttttttttt',
  'ttttttttttttbbbttbbbttbbbttttttttttt',
  'uuuuuuuuuuucuucccttcccttcccttttuuuuu',
  'uuuuuuuuuuubbbuubbbuubbbuubuuuuuuuuu',
  'vvvvvuuuuucuucccuucccuucccuuuuuuuvvv',
  'vvvvvvvvvvbbbvvbbbvvbbbvvbbbvvvvvvvv',
];

// The same ship with the field grown to 48 x 48: the motif keeps to the middle 36,
// inside the circle every launcher's mask keeps.
const MASKABLE = [
  '666666666666666666666666666666666666666666666666',
  '666666666666666666666666666666666666666666666666',
  '666666666666666666666666666666666666666666666666',
  '666666666666666666666666666666666666666666666666',
  '666665555555555666666655555555655555555555555555',
  '555555555555555555555555555555555555555555555555',
  '555555555555555555555555555555555555555555555555',
  '555555555555555555555555555555555555555555555555',
  '555555555555555555555555####55555555555555555544',
  '4444444444455554444cccc#####cc444455555444444444',
  '44444444444444444cccbbb####bbccc4444444444444444',
  '4444444444444444ccbbbaa#aaaabbbcc444444444444444',
  '444444444444444cbbbaaaa#######bbbc44444444444444',
  '33333333333333cbbbaaa#a########bbbc3444443344444',
  '3333333333333ccbaaaaa#a#########abcc333333333344',
  '3333333333333cbbaaaa##a##########bbc333333333333',
  '333333333333cbbaaaa###a###########bbc33333333333',
  '333333333333cbaaaaa###a###########abc33333333333',
  '33322222233ccbaaaa####a###########abcc2222222233',
  '22222222222cbbaaa#####a###########abbc2222222222',
  '22222222222cbbaaa#####a###########abbc2222222222',
  '22222222222cbbaa######a###########abbc2222222222',
  '22222222222cbba#######a###########abbc1111111122',
  '11111111111cbba#######a###########abbc1111111111',
  '11111111111cbb########a###############1111111111',
  '11111111111cc#########a###############1111111111',
  '1111111###############a###############1111111111',
  '11111111110###########################0000000000',
  '000000000000#########################00000000000',
  '0000000000000#######################000000000000',
  'rrrrrrrrrrrrrr#####################rrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrppppppppppppppppppppprrrrrrrrrrrr',
  'ssssssssrrrrrrrrrrrrrccrccccrrrrrsssssssssssssss',
  'ssssssssssssssssssrrrbbbbrbbbrssssssssssssssssss',
  'ssssssssssssssssssssccsccccsccssssssssssssssssss',
  'ssssssssssssssssssssbbbbsbbbbsssssssssssssssssss',
  'sssssssssssssstttttcctccccscccstttttttttttttssss',
  'tttttttttttttttttttbbbbtbbbbtbbttttttttttttttttt',
  'ttttttttttttttttttcctcccctcccctttttttttttttttttt',
  'ttttttttttttttttttbbbttbbbttbbbttttttttttttttttt',
  'ttttttttttttttttttttcccttcccttcctttttttttttttttt',
  'uuuuuutttttttttttbbbttbbbuubbbuuuutttttttttttttt',
  'uuuuuuuuuttttttttttcccuucccuucccuuuuuuuuuttttttt',
  'uuuuuuuuuuuuuuuubbbuubbbuubbbuubbuuuuuuuuuuuuuuu',
  'uuuuuuuuuuuuuuuuuucccuucccuucccuuuuuuuuuuuuuuuuu',
  'uuuuuuuuuuuuuuuubbvvbbbvvbbbvubbbuuuuuuuuuuvvvvu',
  'uuuuuvvvvuuuvvvvvcccvvcccvvcccvvccvvvvvvvvvvvvvv',
  'vvvvvvvvvvvvvvvbbvvbbbvvbbbvvbbbvvbvvvvvvvvvvvvv',
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

/**
 * A `size`-pixel PNG of `grid` at `per` pixels a cell, centred. What is left
 * over round it (when `size` is not a multiple) is the edge cells run out,
 * the sky up and the sea down, so the field reaches the edge; `inset` cells
 * are cut from each side first (the favicon's border).
 */
function png(grid, size, per, inset = 0) {
  const cells = grid.length - 2 * inset;
  const pad = Math.floor((size - cells * per) / 2);
  const cellAt = (pixel) =>
    inset + Math.min(cells - 1, Math.max(0, Math.floor((pixel - pad) / per)));
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 3 + 1);
    const line = grid[cellAt(y)];
    for (let x = 0; x < size; x += 1) {
      raw.set(rgb(COLOURS[line[cellAt(x)]]), row + 1 + x * 3);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** The grid as an SVG of crisp squares, a run of one colour to a rect: sharp at any size in a tab. */
function svg(grid) {
  const n = grid.length;
  const rects = [];
  grid.forEach((line, y) => {
    let x = 0;
    while (x < n) {
      let end = x + 1;
      while (end < n && line[end] === line[x]) end += 1;
      rects.push(
        `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${COLOURS[line[x]]}"/>`,
      );
      x = end;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">${rects.join('')}</svg>\n`;
}

for (const [name, grid] of [
  ['GRID', GRID],
  ['MASKABLE', MASKABLE],
]) {
  for (const row of grid) {
    if (row.length !== grid.length)
      throw new Error(`${name} row is not ${grid.length} wide: ${row}`);
    for (const ch of row) if (!COLOURS[ch]) throw new Error(`${name} has no colour for ${ch}`);
  }
}
mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/apple-touch-icon.png', png(GRID, 180, 5));
writeFileSync('public/icons/icon-192.png', png(GRID, 192, 5));
writeFileSync('public/icons/icon-512.png', png(GRID, 512, 14));
writeFileSync('public/icons/icon-maskable-192.png', png(MASKABLE, 192, 4));
writeFileSync('public/icons/icon-maskable-512.png', png(MASKABLE, 512, 10));
writeFileSync('public/icons/favicon-32.png', png(GRID, 32, 1, 2));
writeFileSync('public/icons/favicon.svg', svg(GRID));
console.log('icons written');
