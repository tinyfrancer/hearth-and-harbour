/**
 * The rest of the town's buildings, structures and props, harvested from the
 * approved mock-up (docs/art-reference/town-mockup.html): the smithy, the
 * market stall, the pier, the ship, the rowing boat, the buoy, the rock and
 * its wreck, the signpost, the anvil, the net, the bucket, the crab, gulls
 * and chimney smoke. Same drawing code and numbers; colours became palette
 * steps. Drawn with the random source the mock-up's town was drawn with,
 * each comes out exactly as it did there (tests/art/harbour.test.ts).
 *
 * Where the mock-up painted something straight onto the town next to a
 * piece (the ship's waterline foam, the boat's mooring line, the foam round
 * the pier's piles), it is drawn into the piece, so the piece carries it.
 */
import { blit, ellipse, get, grid, line, outline, parseSprite, rect, scaled, set } from './grid';
import type { Grid } from './grid';
import type { Shade } from './palette';
import { picture, type Glow, type Picture } from './raster';
import { shingles, stone, windowPanes } from './scenery';

type Rand = () => number;

/**
 * The smithy: stone walls under a slate roof, the forge glowing in its open
 * front, tools on the wall, an anvil, a window and a horseshoe. 98 x 90.
 * The forge is always lit, more strongly at dusk.
 */
export function smithy(rand: Rand): Picture {
  const c = grid(96, 88);
  const glows: Glow[] = [];
  stone(c, rand, 4, 42, 88, 44, 10, 5);
  // The open front and the dark inside.
  rect(c, 11, 47, 53, 39, 'wood4');
  rect(c, 13, 49, 49, 37, 'shade1');
  // The forge: brick, the fire, and its hood.
  rect(c, 18, 62, 24, 24, 'red3');
  for (let y = 65; y < 86; y += 4) rect(c, 18, y, 24, 1, 'wood4');
  for (let y = 62; y < 86; y += 4)
    for (let x = 20 + (((y / 4) | 0) % 2) * 4; x < 42; x += 8) rect(c, x, y, 1, 4, 'wood4');
  rect(c, 21, 66, 18, 11, 'shade1');
  rect(c, 22, 69, 16, 8, 'fire3');
  rect(c, 24, 70, 12, 6, 'fire2');
  rect(c, 27, 71, 6, 4, 'fire1');
  for (const [x, y] of [
    [25, 67],
    [31, 66],
    [35, 68],
  ] as const)
    set(c, x, y, 'fire2');
  // Noted where the mock-up noted it, without the outline's shift.
  glows.push({ x: 31, y: 73, radius: 18, strength: 0.35, byDay: true });
  glows.push({ x: 31, y: 73, radius: 34, strength: 0.6 });
  rect(c, 16, 56, 28, 6, 'stone3');
  rect(c, 19, 51, 22, 5, 'stone3');
  rect(c, 16, 56, 28, 1, 'stone2');
  // Tongs and hammers hanging up.
  for (const [x, y, h] of [
    [48, 52, 8],
    [52, 52, 11],
    [56, 52, 7],
  ] as const) {
    rect(c, x, y, 1, h, 'metal3');
    rect(c, x - 1, y + h - 2, 3, 2, 'metal2');
  }
  // The anvil inside.
  rect(c, 46, 74, 12, 3, 'metal3');
  rect(c, 46, 74, 12, 1, 'metal2');
  rect(c, 49, 77, 6, 5, 'metal3');
  rect(c, 47, 82, 10, 4, 'stone3');
  windowPanes(c, glows, 71, 54, 12, 12, 2, 2, 16);
  // A horseshoe nailed up for luck.
  for (const [x, y] of [
    [68, 74],
    [68, 75],
    [68, 76],
    [69, 77],
    [70, 77],
    [71, 76],
    [71, 75],
    [71, 74],
  ] as const)
    set(c, x, y, 'metal1');
  // Chimney, then the roof over it.
  stone(c, rand, 66, 0, 16, 24, 6, 4);
  rect(c, 64, 0, 20, 3, 'stone3');
  rect(c, 79, 3, 3, 21, 'stone3');
  shingles(c, rand, 0, 95, 9, 42, 0.32, ['slate1', 'slate2', 'slate3']);
  return picture(outline(c), glows);
}

/** The market stall: a striped awning on posts over a counter of fish, apples, cheese and bottles. 62 x 44. */
export function stall(): Grid {
  const c = grid(60, 42);
  const s = scaled(c, 1.5);
  s.rect(2, 8, 2, 18, 'wood3');
  s.rect(36, 8, 2, 18, 'wood3');
  s.rect(3, 16, 34, 9, 'wood2');
  s.rect(3, 16, 34, 1, 'wood1');
  s.rect(3, 24, 34, 1, 'wood4');
  for (let x = 8; x < 36; x += 7) s.rect(x, 17, 1, 7, 'wood3');
  for (let y = 0; y < 13; y++) {
    const ins = Math.round((12 - y) * 0.5);
    for (let x = ins; x < 60 - ins; x++) {
      const pale = ((x / 7) | 0) % 2;
      set(c, x, y, pale ? (y > 9 ? 'plaster2' : 'plaster1') : y > 9 ? 'red3' : 'red2');
    }
  }
  for (let x = 0; x < 60; x++) {
    const pale = ((x / 7) | 0) % 2;
    set(c, x, 13, pale ? 'plaster2' : 'red3');
    if (x % 7 > 1 && x % 7 < 5) set(c, x, 14, pale ? 'plaster2' : 'red3');
  }
  for (const [x, k] of [
    [8, 'sea1'],
    [14, 'sea2'],
    [20, 'sea1'],
  ] as const) {
    rect(c, x, 21, 4, 2, k);
    set(c, x + 4, 20, k);
    set(c, x + 4, 22, k);
    set(c, x + 1, 21, 'ink1');
  }
  for (const [x, y, k] of [
    [27, 21, 'red1'],
    [31, 21, 'red2'],
    [29, 18, 'red1'],
  ] as const) {
    rect(c, x, y, 3, 3, k);
    set(c, x, y, 'white1');
  }
  for (const [x, k] of [
    [37, 'gold1'],
    [42, 'gold2'],
  ] as const) {
    rect(c, x, 21, 4, 3, k);
    rect(c, x, 21, 4, 1, 'sand1');
  }
  for (const [x, k] of [
    [48, 'pine1'],
    [51, 'blue2'],
    [54, 'red2'],
  ] as const) {
    rect(c, x, 20, 2, 4, k);
    set(c, x, 19, 'metal2');
  }
  return outline(c);
}

/** A signpost with an arrow, and a board below. 22 x 24. */
export function signpost(): Grid {
  const c = grid(20, 22);
  rect(c, 8, 3, 3, 19, 'wood3');
  rect(c, 9, 3, 1, 19, 'wood4');
  rect(c, 0, 3, 17, 6, 'wood1');
  rect(c, 0, 8, 17, 1, 'wood3');
  for (const [x, y] of [
    [17, 4],
    [17, 5],
    [18, 5],
    [17, 6],
    [17, 7],
    [18, 6],
  ] as const)
    set(c, x, y, 'wood1');
  rect(c, 3, 5, 9, 1, 'wood4');
  rect(c, 3, 7, 6, 1, 'wood4');
  rect(c, 2, 12, 15, 5, 'wood2');
  rect(c, 4, 14, 8, 1, 'wood4');
  return outline(c);
}

/** An anvil on a wooden block. 19 x 14. */
export function anvil(): Grid {
  const c = grid(17, 12);
  rect(c, 0, 0, 17, 4, 'metal3');
  rect(c, 0, 0, 17, 1, 'metal1');
  rect(c, 0, 1, 17, 1, 'metal2');
  rect(c, 13, 1, 4, 2, 'metal3');
  rect(c, 5, 4, 7, 3, 'metal3');
  rect(c, 2, 7, 13, 5, 'wood3');
  rect(c, 2, 7, 13, 1, 'wood2');
  return outline(c);
}

/** A fishing net spread on the ground to dry: lines only, no outline. 31 x 14. */
export function net(): Grid {
  const c = grid(31, 14);
  for (let i = 0; i < 7; i++) line(c, i * 4, 0, 6 + i * 4, 11, 'wood4');
  for (let i = 0; i < 4; i++) line(c, 0, 2 + i * 3, 28, 4 + i * 3, 'wood4');
  return c;
}

/**
 * A wooden bucket, its inside showing the cobbles. In the mock-up it stands
 * at the head of the pier, which hides all but its rim. 11 x 8.
 */
export function bucket(): Grid {
  const c = grid(11, 8);
  ellipse(c, 5, 4, 5, 3, 'wood2');
  ellipse(c, 5, 4, 3, 1.5, 'cobble2');
  ellipse(c, 5, 3, 5, 3, 'wood1');
  ellipse(c, 5, 3, 3, 1.4, 'cobble2');
  return c;
}

/** A crab, claws up. 13 x 9. */
export function crab(): Grid {
  return outline(
    parseSprite(
      [
        'cc.......cc',
        'ccc.....ccc',
        '.cc.rrr.cc.',
        '..rrrrrrr..',
        '.rrrkrkrrr.',
        '..rrrrrrr..',
        '.r.r.r.r.r.',
      ],
      { c: 'red1', r: 'red2', k: 'ink1' },
    ),
  );
}

/** A gull in flight: a white chevron with a grey body. No outline. 8 x 4. */
export function gull(): Grid {
  const c = grid(8, 4);
  for (const [a, b] of [
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 0],
    [-1, -1],
    [4, -1],
    [-2, -1],
    [5, -1],
  ] as const)
    set(c, a + 2, b + 1, 'white1');
  set(c, 3, 3, 'stone2');
  return c;
}

/** A puff of chimney smoke: (x, y) its middle and r its size, in the picture's pixels. */
export type Puff = readonly [x: number, y: number, r: number];

/** Smoke rising in puffs, each grey with a pale top. No outline; it drifts over what is behind it. */
export function smoke(w: number, h: number, puffs: readonly Puff[]): Grid {
  const c = grid(w, h);
  for (const [x, y, s] of puffs) {
    ellipse(c, x, y, s, s * 0.7, 'smoke1');
    ellipse(c, x - 1, y - 1, s * 0.5, s * 0.35, 'white1');
  }
  return c;
}

/** The tavern's smoke, in the mock-up's puffs. 18 x 18; its chimney is below its left half. */
export function tavernSmoke(): Grid {
  return smoke(18, 18, [
    [5, 14, 4.5],
    [9, 8, 3.6],
    [14, 3, 3],
  ]);
}

/** The smithy's smoke, blowing the same way. 22 x 24. */
export function smithySmoke(): Grid {
  return smoke(22, 24, [
    [5, 20, 4.5],
    [9, 13, 3.8],
    [14, 7, 3.2],
    [18, 2, 2.6],
  ]);
}

/** Default length of the pier, in art pixels, as the mock-up drew it. */
export const PIER_LENGTH = 126;

/**
 * The pier: planks across with nail marks, dark posts every 30 rows, and
 * foam where the water meets its piles on both sides. The deck is 38 wide
 * (with its outline) and starts 3 pixels in; 44 x (length + 2).
 */
export function pier(rand: Rand, length = PIER_LENGTH): Grid {
  const d = grid(36, length);
  rect(d, 0, 0, 36, length, 'wood1');
  for (let y = 4; y < length; y += 5) {
    rect(d, 0, y, 36, 1, 'wood3');
    for (let x = 5 + (((y / 5) | 0) % 3) * 7; x < 34; x += 17) rect(d, x, y - 4, 1, 4, 'wood2');
  }
  rect(d, 32, 0, 4, length, 'wood2');
  rect(d, 0, 0, 2, length, 'wood2');
  sprinkle60(d, rand, length);
  const post = (y: number) => {
    rect(d, 0, y, 5, 6, 'wood4');
    rect(d, 31, y, 5, 6, 'wood4');
  };
  for (let y = 0; y < length; y += 30) {
    post(y);
    rect(d, 1, y, 3, 1, 'wood1');
    rect(d, 32, y, 3, 1, 'wood1');
  }
  post(length - 6);
  const c = grid(44, length + 2);
  blit(c, outline(d), 3, 0);
  for (let y = 28; y < length - 2; y += 15) {
    rect(c, 0, y, 3, 1, 'foam1');
    rect(c, 41, y + 2, 3, 1, 'foam1');
  }
  return c;
}

/** Worn planks: up to 60 light boards darkened, wherever they fall. */
function sprinkle60(d: Grid, rand: Rand, length: number): void {
  for (let i = 0; i < 60; i++) {
    const x = 3 + ((rand() * 28) | 0);
    const y = (rand() * (length - 2)) | 0;
    if (get(d, x, y) === 'wood1') set(d, x, y, 'wood2');
  }
}

/**
 * The pirates' ship at anchor: one mast, a patched sail, rigging, a black
 * flag with a white skull, a lit cabin window, gun ports and foam along its
 * waterline. 90 x 104.
 */
export function ship(): Picture {
  const c = grid(88, 102);
  const s = scaled(c, 1.5);
  const glows: Glow[] = [];
  s.rect(26, 2, 2, 48, 'wood3');
  rect(c, 41, 3, 1, 72, 'wood4');
  s.rect(10, 13, 34, 1, 'wood4');
  for (let x = 16; x < 65; x++) {
    const d = 4 + Math.round(2 * Math.abs(Math.sin(x * 0.5)));
    rect(c, x, 21, 1, d, x % 5 === 0 ? 'sail2' : 'sail1');
    if (x % 10 === 3) rect(c, x, 20, 1, d + 1, 'wood3');
  }
  line(c, 39, 4, 5, 74, 'metal3');
  line(c, 42, 4, 76, 74, 'metal3');
  line(c, 39, 21, 13, 74, 'metal3');
  line(c, 42, 21, 66, 74, 'metal3');
  for (let y = 30; y < 74; y += 6) {
    const t = (y - 21) / 53;
    line(c, Math.round(39 - 26 * t), y, 39, y, 'metal3');
  }
  s.rect(28, 2, 10, 7, 'flag1');
  s.rect(36, 4, 3, 6, 'flag1');
  rect(c, 46, 5, 5, 4, 'white1');
  rect(c, 47, 9, 3, 1, 'white1');
  set(c, 47, 6, 'flag1');
  set(c, 49, 6, 'flag1');
  s.rect(2, 42, 13, 9, 'wood2');
  rect(c, 3, 63, 20, 2, 'wood1');
  rect(c, 8, 67, 6, 6, 'wood4');
  rect(c, 9, 68, 4, 4, 'glass2');
  set(c, 9, 68, 'glass1');
  // Noted where the mock-up noted it, without the outline's shift.
  glows.push({ x: 12, y: 71, radius: 18, strength: 0.45 });
  rect(c, 3, 74, 20, 1, 'wood4');
  line(c, 76, 73, 86, 64, 'wood3');
  line(c, 76, 74, 86, 65, 'wood4');
  for (let i = 0; i < 23; i++) {
    const a = Math.round(3 + i * 0.9);
    const b = Math.round(78 - i * 0.5);
    const k: Shade =
      i < 2
        ? 'wood1'
        : i === 5 || i === 6
          ? 'red2'
          : i > 17
            ? 'shade1'
            : i % 4 === 0
              ? 'wood3'
              : 'wood4';
    rect(c, a, 75 + i, b - a + 1, 1, k);
    if (i > 1 && i < 16) set(c, a, 75 + i, 'wood3');
  }
  for (const x of [20, 30, 40, 50, 60]) {
    rect(c, x, 84, 2, 2, 'shade1');
    set(c, x, 84, 'metal3');
  }
  for (let x = 6; x < 76; x += 5) rect(c, x, 72, 1, 3, 'wood2');
  rect(c, 4, 72, 74, 1, 'wood1');
  const out = outline(c);
  for (let x = 6; x < 78; x += 3) rect(out, x, 99 + (x % 2), 2, 1, 'foam1');
  return picture(out, glows);
}

/**
 * A rowing boat with its oars shipped, and its mooring line running up 8
 * rows to a ring on the quay (the line's top is at column 27, row 0). 35 x 23.
 */
export function rowboat(): Grid {
  const b = grid(33, 13);
  const s = scaled(b, 1.5);
  s.ellipse(11, 4.5, 10.5, 3.8, 'wood2');
  s.ellipse(11, 4, 8.5, 2.3, 'wood4');
  s.rect(10, 1, 2, 7, 'wood1');
  s.rect(4, 3, 1, 3, 'wood1');
  rect(b, 24, 5, 2, 4, 'wood1');
  line(b, 6, 7, 20, 2, 'wood3');
  const c = grid(35, 23);
  blit(c, outline(b), 0, 8);
  line(c, 27, 0, 27, 10, 'wood4');
  return c;
}

/** A striped buoy with foam round its foot. 11 x 13. */
export function buoy(): Grid {
  const b = grid(7, 11);
  rect(b, 1, 3, 5, 7, 'red2');
  rect(b, 1, 6, 5, 2, 'white1');
  rect(b, 5, 3, 1, 7, 'red3');
  rect(b, 3, 0, 1, 3, 'wood4');
  const c = grid(11, 13);
  blit(c, outline(b), 2, 0);
  rect(c, 0, 11, 10, 1, 'foam1');
  return c;
}

/**
 * Out to sea: a rock with a skull's face, and the wreck of a ship on it,
 * its mast askew and a rag of sail, with foam round it. 68 x 47.
 */
export function wreckRock(rand: Rand): Grid {
  const rk = grid(66, 45);
  const s = scaled(rk, 1.5);
  s.ellipse(13, 19, 12, 9, 'stone3');
  s.ellipse(12, 17, 10, 7, 'stone2');
  s.ellipse(9, 14, 5, 3, 'stone1');
  s.ellipse(32, 22, 10, 6, 'stone3');
  s.ellipse(31, 21, 8, 4.5, 'stone2');
  s.ellipse(28, 19, 3, 1.6, 'stone1');
  for (let i = 0; i < 40; i++) {
    const x = 2 + ((rand() * 60) | 0);
    const y = 14 + ((rand() * 30) | 0);
    if (get(rk, x, y) === 'stone2') set(rk, x, y, 'stone3');
  }
  // The face.
  rect(rk, 11, 25, 4, 4, 'shade1');
  rect(rk, 20, 25, 4, 4, 'shade1');
  rect(rk, 10, 24, 5, 1, 'shade1');
  rect(rk, 20, 24, 5, 1, 'shade1');
  for (const [x, y] of [
    [14, 34],
    [16, 33],
    [18, 34],
    [20, 33],
    [22, 34],
  ] as const)
    rect(rk, x, y, 2, 2, 'shade1');
  rect(rk, 17, 29, 2, 3, 'stone3');
  // The wreck.
  line(rk, 36, 33, 54, 0, 'wood3');
  line(rk, 37, 33, 55, 0, 'wood4');
  line(rk, 38, 33, 56, 0, 'wood4');
  line(rk, 44, 12, 60, 17, 'wood3');
  line(rk, 44, 13, 60, 18, 'wood4');
  for (let x = 47; x < 58; x++) {
    const h = 6 + ((x * 7) % 5);
    rect(rk, x, Math.round(14 + (x - 44) * 0.3), 1, h, x % 3 ? 'sail2' : 'sail1');
  }
  const c = outline(rk);
  for (let x = 0; x < 66; x += 2)
    if (rand() < 0.6) rect(c, x, 44 + ((rand() * 2) | 0), 2, 1, 'foam1');
  return c;
}
