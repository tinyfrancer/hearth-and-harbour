/**
 * Buildings, props and ground, harvested from the approved mock-up
 * (docs/art-reference/town-mockup.html) and trimmed to what the gallery shows:
 * the tavern, a barrel, a crate, a street lamp, a well, a notice board, a
 * pine, grass and cobbles. Same drawing code, same numbers; only the colours
 * became palette steps and the shared random source became a seed per
 * drawing, so the wear lands in different places than in the mock-up.
 */
import { blit, clear, grid, line, outline, rect, scaled, set, sprinkle, type Grid } from './grid';
import type { Shade } from './palette';
import { picture, type Glow, type Picture } from './raster';

type Rand = () => number;

/** A box in art pixels. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Grass with flecks of its light and dark steps, at the mock-up's density. */
export function grass(g: Grid, rand: Rand, box: Box): void {
  rect(g, box.x, box.y, box.w, box.h, 'grass2');
  const flecks = Math.round((box.w * box.h * 1500) / (270 * 138));
  for (let i = 0; i < flecks; i++) {
    const x = box.x + ((rand() * box.w) | 0);
    const y = box.y + ((rand() * box.h) | 0);
    const c: Shade = rand() < 0.5 ? 'grass1' : 'grass3';
    set(g, x, y, c);
    if (rand() < 0.4) set(g, x + 1, y, c);
    if (rand() < 0.2) set(g, x, y - 1, c);
  }
}

/**
 * The cobble at a spot: offset rows of stones with dark joints and a few pale
 * faces. Worked out from where it is, so cobbles painted in pieces still line up.
 */
export function cobbleAt(x: number, y: number): Shade {
  const row = (y / 6) | 0;
  const o = (row % 2) * 5;
  const joint = y % 6 === 0 || (x + o) % 10 === 0;
  let c: Shade = joint ? 'cobble3' : 'cobble2';
  if (!joint) {
    const k = ((((x + o) / 10) | 0) * 7 + row * 13) % 11;
    if (k === 0 || ((x + o) % 10 === 1 && y % 6 === 1)) c = 'cobble1';
  }
  return c;
}

/** Cobbles in offset rows with dark joints, a few pale stones and some grime. */
export function cobbles(g: Grid, rand: Rand, box: Box): void {
  for (let y = box.y; y < box.y + box.h; y++)
    for (let x = box.x; x < box.x + box.w; x++) {
      set(g, x, y, cobbleAt(x, y));
    }
  sprinkle(g, rand, Math.round((box.w * box.h * 160) / (264 * 92)), box, 'cobble2', 'cobble3');
}

/** Roof shingles in staggered rows, narrowing toward the ridge, with patched tiles. */
export function shingles(
  c: Grid,
  rand: Rand,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  slope: number,
  [c1, c2, c3]: readonly [Shade, Shade, Shade],
): void {
  for (let y = y0; y <= y1; y++) {
    const ins = Math.round((y1 - y) * slope);
    const a = x0 + ins;
    const b = x1 - ins;
    const band = ((y - y0) / 6) | 0;
    const ph = (y - y0) % 6;
    for (let x = a; x <= b; x++) {
      const j = (x + (band % 2) * 4) % 8;
      set(c, x, y, ph === 5 || j === 0 ? c3 : ph === 0 ? c1 : c2);
    }
    set(c, a, y, c1);
    set(c, a + 1, y, c1);
    set(c, b, y, c3);
  }
  for (let i = 0; i < 16; i++) {
    const y = y0 + 3 + ((rand() * (y1 - y0 - 8)) | 0);
    const ins = Math.round((y1 - y) * slope);
    const x = x0 + ins + 5 + ((rand() * (x1 - x0 - 2 * ins - 14)) | 0);
    rect(c, x, y, 3, 2, rand() < 0.6 ? c3 : c1);
  }
  const ins = Math.round((y1 - y0) * slope);
  rect(c, x0 + ins, y0, x1 - x0 - 2 * ins + 1, 2, c1);
  rect(c, x0, y1, x1 - x0 + 1, 2, c3);
}

/** Stone blocks in offset courses, a few faces catching the light. */
export function stone(
  c: Grid,
  rand: Rand,
  x: number,
  y: number,
  w: number,
  h: number,
  bw: number,
  bh: number,
) {
  rect(c, x, y, w, h, 'stone2');
  for (let j = 0; j < h; j++) {
    const row = (j / bh) | 0;
    for (let i = 0; i < w; i++)
      if (j % bh === 0 || (i + (row % 2) * (bw >> 1)) % bw === 0) set(c, x + i, y + j, 'stone3');
  }
  sprinkle(c, rand, ((w * h) / 14) | 0, { x, y, w, h }, 'stone2', 'stone1');
}

/**
 * A framed window of nx by ny panes with a sill. Its glow is noted against
 * the outlined drawing, hence the one-pixel shift.
 */
export function windowPanes(
  c: Grid,
  glows: Glow[],
  x: number,
  y: number,
  w: number,
  h: number,
  nx: number,
  ny: number,
  radius = 20,
): void {
  rect(c, x - 1, y - 1, w + 2, h + 2, 'wood4');
  rect(c, x, y, w, h, 'glass2');
  for (let i = 1; i < nx; i++) rect(c, x + Math.round((i * w) / nx), y, 1, h, 'wood4');
  for (let j = 1; j < ny; j++) rect(c, x, y + Math.round((j * h) / ny), w, 1, 'wood4');
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const px = x + Math.round((i * w) / nx) + (i ? 1 : 0);
      const py = y + Math.round((j * h) / ny) + (j ? 1 : 0);
      set(c, px, py, 'glass1');
      set(c, px + 1, py, 'glass1');
      set(c, px, py + 1, 'glass1');
    }
  rect(c, x - 2, y + h + 1, w + 4, 1, 'wood1');
  rect(c, x - 2, y + h + 2, w + 4, 1, 'wood3');
  glows.push({ x: 1 + x + w / 2, y: 1 + y + h / 2, radius, strength: 0.42 });
}

export function barrel(): Grid {
  const c = grid(11, 15);
  rect(c, 0, 0, 11, 15, 'wood2');
  rect(c, 0, 0, 3, 15, 'wood1');
  rect(c, 8, 0, 3, 15, 'wood3');
  for (const x of [3, 6]) rect(c, x, 1, 1, 13, 'wood3');
  rect(c, 0, 3, 11, 2, 'stone3');
  rect(c, 0, 3, 11, 1, 'metal3');
  rect(c, 0, 10, 11, 2, 'stone3');
  rect(c, 0, 10, 11, 1, 'metal3');
  rect(c, 1, 0, 9, 1, 'wood4');
  clear(c, 0, 0);
  clear(c, 10, 0);
  clear(c, 0, 14);
  clear(c, 10, 14);
  return outline(c);
}

export function crate(): Grid {
  const c = grid(13, 13);
  rect(c, 0, 0, 13, 13, 'wood1');
  rect(c, 0, 0, 13, 2, 'wood2');
  rect(c, 0, 11, 13, 2, 'wood3');
  rect(c, 0, 0, 2, 13, 'wood3');
  rect(c, 11, 0, 2, 13, 'wood3');
  line(c, 2, 2, 10, 10, 'wood3');
  line(c, 3, 2, 10, 9, 'wood2');
  for (const [x, y] of [
    [1, 1],
    [11, 1],
    [1, 11],
    [11, 11],
  ] as const)
    set(c, x, y, 'metal3');
  return outline(c);
}

/** A street lamp on a post; lit at dusk. */
export function lamp(): Picture {
  const c = grid(7, 27);
  rect(c, 3, 8, 1, 19, 'wood4');
  rect(c, 2, 25, 3, 2, 'wood4');
  rect(c, 0, 0, 7, 1, 'wood4');
  rect(c, 1, 1, 5, 1, 'metal3');
  rect(c, 1, 2, 5, 5, 'lamp1');
  rect(c, 3, 3, 1, 3, 'glass1');
  rect(c, 0, 7, 7, 1, 'wood4');
  rect(c, 2, 8, 3, 1, 'wood4');
  return picture(outline(c), [{ x: 4, y: 5, radius: 30, strength: 0.55 }]);
}

export function pine(rand: Rand): Grid {
  const t = grid(27, 39);
  for (let i = 0; i < 5; i++) {
    const top = i * 6;
    const hw = 4 + i * 2.2;
    for (let y = 0; y < 11; y++) {
      const w = Math.round((hw * (y + 1)) / 11);
      for (let x = -w; x <= w; x++) {
        if (y === 10 && (x + w) % 3 === 0) continue;
        set(t, 13 + x, top + y, x < -w / 3 ? 'pine1' : x > w / 3 ? 'pine3' : 'pine2');
      }
    }
  }
  sprinkle(t, rand, 30, { x: 3, y: 4, w: 21, h: 30 }, 'pine2', 'pine1');
  sprinkle(t, rand, 30, { x: 3, y: 4, w: 21, h: 30 }, 'pine2', 'pine3');
  rect(t, 12, 35, 3, 4, 'wood4');
  return outline(t);
}

export function well(): Grid {
  const c = grid(27, 30);
  const s = scaled(c, 1.5);
  s.rect(2, 0, 14, 3, 'red2');
  s.rect(2, 2, 14, 1, 'red3');
  for (let x = 4; x < 23; x += 3) set(c, x, 1, 'red3');
  s.rect(3, 3, 1, 9, 'wood3');
  s.rect(14, 3, 1, 9, 'wood3');
  s.rect(3, 5, 12, 1, 'wood2');
  s.rect(8, 6, 1, 4, 'wood4');
  rect(c, 10, 12, 5, 4, 'wood2');
  rect(c, 10, 12, 5, 1, 'metal3');
  s.ellipse(9, 14, 8, 5, 'stone2');
  s.ellipse(9, 13, 8, 4, 'stone1');
  s.ellipse(9, 13, 5, 2.2, 'shade1');
  for (let x = 3; x < 25; x += 4) rect(c, x, 24, 1, 3, 'stone3');
  rect(c, 2, 23, 23, 1, 'stone3');
  return outline(c);
}

export function noticeBoard(): Grid {
  const c = grid(24, 27);
  const s = scaled(c, 1.5);
  s.rect(1, 4, 2, 14, 'wood3');
  s.rect(13, 4, 2, 14, 'wood3');
  s.rect(0, 2, 16, 10, 'wood2');
  s.rect(0, 2, 16, 1, 'wood1');
  s.rect(0, 0, 16, 2, 'wood4');
  rect(c, 3, 6, 6, 8, 'plaster1');
  rect(c, 10, 7, 5, 6, 'plaster2');
  rect(c, 16, 6, 5, 9, 'plaster1');
  for (const [x, y] of [
    [5, 6],
    [12, 7],
    [18, 6],
  ] as const)
    set(c, x, y, 'red2');
  for (const [x, y, w] of [
    [4, 8, 4],
    [4, 10, 3],
    [4, 12, 4],
    [11, 9, 3],
    [11, 11, 2],
    [17, 8, 3],
    [17, 10, 3],
    [17, 12, 2],
  ] as const)
    rect(c, x, y, w, 1, 'stone3');
  return outline(c);
}

/** The tavern: timber and plaster under a patched red roof, with its hanging sign. 150 x 118. */
export function tavern(rand: Rand): Picture {
  const c = grid(148, 116);
  const glows: Glow[] = [];
  rect(c, 6, 58, 118, 50, 'plaster1');
  rect(c, 104, 58, 20, 50, 'plaster2');
  sprinkle(c, rand, 90, { x: 6, y: 58, w: 98, h: 44 }, 'plaster1', 'plaster2');
  stone(c, rand, 6, 101, 118, 8, 9, 4);
  for (const x of [6, 35, 64, 93, 122]) {
    rect(c, x, 58, 2, 43, 'wood3');
    rect(c, x + 1, 58, 1, 43, 'wood4');
  }
  rect(c, 6, 58, 118, 2, 'wood3');
  rect(c, 4, 80, 122, 3, 'wood3');
  rect(c, 4, 82, 122, 1, 'wood4');
  rect(c, 8, 83, 114, 1, 'plaster2');
  for (const [x0, y0, x1, y1] of [
    [9, 79, 33, 61],
    [10, 79, 34, 61],
    [120, 79, 96, 61],
    [119, 79, 95, 61],
  ] as const)
    line(c, x0, y0, x1, y1, 'wood3');
  [13, 42, 71, 100].forEach((x, i) => {
    windowPanes(c, glows, x + 2, 64, 13, 11, 2, 2);
    if (i % 3 === 0) {
      rect(c, x - 1, 63, 2, 13, 'teal2');
      rect(c, x + 17, 63, 2, 13, 'teal2');
    }
  });
  // A window box of flowers.
  rect(c, 43, 78, 17, 2, 'wood2');
  [45, 48, 52, 56].forEach((x, i) => {
    rect(c, x, 76, 2, 2, 'pine1');
    set(c, x, 75, i % 2 ? 'red1' : 'gold1');
  });
  windowPanes(c, glows, 14, 88, 19, 10, 3, 2, 22);
  windowPanes(c, glows, 96, 88, 19, 10, 3, 2, 22);
  // The door.
  rect(c, 54, 85, 20, 24, 'wood4');
  rect(c, 55, 86, 18, 23, 'wood2');
  for (const [x, y] of [
    [54, 85],
    [55, 85],
    [54, 86],
    [73, 85],
    [72, 85],
    [73, 86],
  ] as const)
    set(c, x, y, 'plaster1');
  for (const x of [59, 64, 68]) rect(c, x, 87, 1, 22, 'wood3');
  rect(c, 56, 96, 6, 1, 'metal3');
  rect(c, 56, 105, 6, 1, 'metal3');
  rect(c, 69, 99, 2, 2, 'gold1');
  rect(c, 60, 88, 8, 5, 'wood4');
  rect(c, 61, 89, 6, 3, 'glass2');
  rect(c, 52, 109, 24, 2, 'stone1');
  rect(c, 52, 111, 24, 1, 'stone3');
  // The lantern by the door.
  rect(c, 78, 88, 6, 1, 'wood4');
  rect(c, 79, 89, 4, 6, 'lamp1');
  rect(c, 80, 90, 2, 3, 'glass1');
  rect(c, 79, 95, 4, 1, 'wood4');
  glows.push({ x: 82, y: 93, radius: 22, strength: 0.5 });
  // A barrel with a tankard on it, and a bench.
  blit(c, barrel(), 36, 94);
  rect(c, 40, 91, 4, 4, 'gold1');
  rect(c, 40, 91, 4, 1, 'white1');
  set(c, 44, 92, 'gold2');
  set(c, 44, 93, 'gold2');
  rect(c, 84, 102, 10, 2, 'wood1');
  rect(c, 85, 104, 1, 5, 'wood3');
  rect(c, 92, 104, 1, 5, 'wood3');
  // Chimney, then the roof over it.
  stone(c, rand, 88, 0, 13, 22, 6, 4);
  rect(c, 86, 0, 17, 3, 'stone3');
  rect(c, 98, 3, 3, 19, 'stone3');
  shingles(c, rand, 0, 128, 10, 58, 0.33, ['red1', 'red2', 'red3']);
  // The hanging sign: a tankard.
  rect(c, 124, 64, 22, 2, 'wood4');
  rect(c, 144, 66, 1, 3, 'metal3');
  rect(c, 130, 66, 1, 3, 'metal3');
  rect(c, 127, 69, 19, 16, 'wood2');
  rect(c, 127, 69, 19, 1, 'wood1');
  rect(c, 127, 84, 19, 1, 'wood4');
  rect(c, 127, 69, 1, 16, 'wood3');
  rect(c, 132, 73, 7, 9, 'gold1');
  rect(c, 137, 73, 2, 9, 'gold2');
  rect(c, 132, 72, 7, 2, 'white1');
  rect(c, 139, 75, 3, 1, 'gold2');
  rect(c, 141, 76, 1, 3, 'gold2');
  rect(c, 139, 79, 3, 1, 'gold2');
  return picture(outline(c), glows);
}
