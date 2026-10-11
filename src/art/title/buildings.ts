/**
 * The tavern, the smithy and your house seen across the water, drawn again at
 * about a fifth of their size in the town (7.5 art pixels a metre at the quay;
 * the house, further up the hill, a little less). Each keeps what makes it
 * itself at a glance: the tavern's red tiles, jettied timber upper storey and
 * gull-and-anchor sign; the smithy's slate, rubble walls with cut quoins, the
 * open forge glowing under its oak lintel, the log store and the horseshoe;
 * the house's thick thatch with its eyebrow window, limewash, blue door and
 * shutters. Lit from the upper left, each course and plank shaded as a solid,
 * outlined in its own darkest step (`outlined`), as in the town.
 *
 * The study drew all three from one generic painter (study/title-and-icon/
 * far.ts); at this size what tells them apart is in the details, so each has
 * its own here. Sizes come from metres: a door is 2 m (15 pixels), a storey
 * about 2.6 m.
 */
import { darker, hash, outlined, put, at, type TGrid } from '../town2/cells';
import { tc, type TitleMat } from './ramps';
import type { Halo } from './light';

const C = (m: TitleMat, t: number): number => tc(m, t);

/** A light that flickers: its pixels and its two looks. */
export interface Flicker {
  readonly x: number;
  readonly y: number;
  readonly a: number;
  readonly b: number;
  /** Which light it belongs to (pixels of one light change together). */
  readonly id: number;
}

export interface Building {
  readonly id: 'tavern' | 'smithy' | 'house';
  /** The drawing, outlined. Its bottom row is the ground line the building stands on. */
  readonly g: TGrid;
  /** The first and last columns of the walls' foot, in the drawing. */
  readonly footL: number;
  readonly footR: number;
  readonly halos: readonly Halo[];
  readonly flicker: readonly Flicker[];
  /** The tops of its chimneys, for smoke; `dark` for a forge's. */
  readonly chimneys: readonly { x: number; y: number; dark: boolean }[];
}

const grid = (w: number, h: number): TGrid => ({ w, h, d: new Int16Array(w * h) });

function fill(
  g: TGrid,
  x0: number,
  y0: number,
  w: number,
  h: number,
  f: (x: number, y: number) => number,
) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(g, x, y, f(x, y));
}

function dimBox(g: TGrid, x0: number, y0: number, w: number, h: number, n: number) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const c = at(g, x, y);
      if (c) put(g, x, y, darker(c, n, 6));
    }
}

/**
 * A window: frame in `frame`, a sill below, glass lit or a dark pane with its
 * glint, a mullion cross. Returns the lit glass pixels for flickering.
 */
function windowAt(
  g: TGrid,
  x0: number,
  y0: number,
  w: number,
  h: number,
  lit: boolean,
  o: { frame?: TitleMat; sill?: TitleMat; cross?: boolean; id?: number } = {},
): Flicker[] {
  const frame = o.frame ?? 'wood';
  const out: Flicker[] = [];
  for (let j = -1; j <= h; j++)
    for (let i = -1; i <= w; i++) {
      const edge = i < 0 || j < 0 || i === w || j === h;
      if (edge) {
        put(g, x0 + i, y0 + j, C(frame, j < 0 || i < 0 ? 3 : 4));
        continue;
      }
      const cross = o.cross !== false && (i === Math.floor(w / 2) || j === Math.floor(h / 2));
      if (cross) put(g, x0 + i, y0 + j, C(frame, 4));
      else if (lit) {
        // Brightest high in the glass, a deeper amber under the head where the reveal shades it.
        const t = j === 0 ? 3 : j < h / 2 ? (i < w / 2 ? 0 : 1) : 2;
        put(g, x0 + i, y0 + j, C('glass', t));
        if (j > 0)
          out.push({
            x: x0 + i,
            y: y0 + j,
            a: C('glass', t),
            b: C('glass', Math.min(4, t + 1)),
            id: o.id ?? 0,
          });
      } else put(g, x0 + i, y0 + j, C('pane', j === 0 ? 5 : i === 0 && j === 1 ? 2 : 4));
    }
  // The sill catches the light.
  for (let i = -2; i <= w + 1; i++)
    put(g, x0 + i, y0 + h + 1, C(o.sill ?? 'stone', i < w / 2 ? 1 : 2));
  return out;
}

/** A stone chimney stack from `top` down to `bottom`, `w` wide: courses, lit left, a cap and a dark pot. */
function chimney(g: TGrid, x0: number, top: number, bottom: number, w: number, k: number) {
  for (let y = top + 1; y < bottom; y++)
    for (let i = 0; i < w; i++) {
      const row = y - top;
      const joint =
        row % 3 === 0 ||
        (i === Math.floor(w / 2) + (Math.floor(row / 3) & 1 ? -2 : 1) && row % 3 !== 0);
      let t = i === 0 ? 1 : i === w - 1 ? 4 : 2 + (hash(i, Math.floor(row / 3), k) < 0.3 ? 1 : 0);
      if (joint && i > 0 && i < w - 1) t = 4;
      put(g, x0 + i, y, C('stone', t));
    }
  for (let i = -1; i <= w; i++) put(g, x0 + i, top, C('stone', i < w / 2 ? 1 : 2));
  for (let i = 1; i < w - 1; i++) put(g, x0 + i, top - 1, C('shade', 2));
}

/** Rubble walling: irregular courses of stones, each lit on its top and left, joints dark. */
function rubble(x: number, y: number, k: number): number {
  const row = Math.floor(y / 3);
  const off = Math.floor(hash(row, 0, k) * 6);
  const len = 4 + Math.floor(hash(Math.floor((x + off) / 5), row, k + 1) * 3);
  const sx = (x + off) % len;
  const sy = y % 3;
  let t = 2 + (hash(Math.floor((x + off) / len), row, k + 2) < 0.35 ? 1 : 0);
  if (sx === 0 || sy === 2) t = 5;
  else if (sy === 0) t = Math.max(1, t - 1);
  return C('stone', t);
}

// The tavern -----------------------------------------------------------------

/** The tavern: 114 pixels across its walls (15 m), two storeys under red tile, five bays. */
export function tavernSmall(k = 3): Building {
  const W = 114;
  const wx = 4;
  const gw = wx + W + 16;
  const yR = 12; // the ridge
  const roofH = 27;
  const yE = yR + roofH; // the eave
  const upH = 18;
  const yJ = yE + upH; // the jetty beam
  const downH = 19;
  const yP = yJ + 2 + downH; // the plinth's top
  const H = yP + 3;
  const g = grid(gw, H);
  const flick: Flicker[] = [];
  const halos: Halo[] = [];
  const bays = 5;
  const bayX = (i: number) => wx + Math.round((i * (W - 2)) / bays);

  // Ground storey: plaster between posts, the plinth below.
  fill(g, wx, yJ + 2, W, downH, (x, y) =>
    C('plaster', 2 + (hash(x >> 3, y >> 2, k) < 0.14 ? 1 : 0) + (x > wx + W - 3 ? 1 : 0)),
  );
  fill(g, wx - 1, yP, W + 2, 3, (x, y) =>
    C('stone', y === yP ? 1 : 3 + ((x + (y & 1) * 3) % 7 === 0 ? 1 : 0)),
  );
  // Upper storey, jettied out a pixel each side over its beam.
  fill(g, wx - 1, yE, W + 2, upH, (x, y) =>
    C('plaster', 1 + (hash(x >> 3, y >> 2, k + 1) < 0.16 ? 1 : 0) + (x > wx + W - 2 ? 1 : 0)),
  );
  // Framing: a post at every bay line, rails top and bottom, braces in the upper storey.
  for (let i = 0; i <= bays; i++) {
    const px = Math.min(bayX(i), wx + W - 2);
    for (let y = yE; y < yP; y++) {
      put(g, px, y, C('wood', 3));
      put(g, px + 1, y, C('wood', 4));
    }
    if (i < bays) {
      const nx = bayX(i + 1);
      const h = upH - 3;
      for (let j = 0; j < h; j++) {
        // Braces rising from the posts toward the middle of each bay, mirrored bay to bay.
        const f = j / h;
        const bx = i % 2 === 0 ? px + 2 + Math.round(f * 5) : nx - 1 - Math.round(f * 5);
        put(g, bx, yJ - 1 - j, C('wood', 4));
      }
    }
  }
  for (let x = wx - 1; x < wx + W + 1; x++) {
    put(g, x, yE, C('wood', 3));
    put(g, x, yJ, C('wood', 2));
    put(g, x, yJ + 1, C('wood', 4));
  }
  // The jetty's shadow on the storey below.
  dimBox(g, wx, yJ + 2, W, 1, 2);
  dimBox(g, wx, yJ + 3, W, 1, 1);
  // Upper windows: lit in the three middle bays, the end rooms dark behind teal shutters.
  for (let i = 0; i < bays; i++) {
    const mid = Math.round((bayX(i) + bayX(i + 1)) / 2);
    const lit = i > 0 && i < 4;
    flick.push(...windowAt(g, mid - 3, yE + 5, 7, 7, lit, { sill: 'wood', id: 10 + i }));
    if (!lit)
      for (let j = 0; j < 7; j++) {
        put(g, mid - 6, yE + 5 + j, C('teal', 2));
        put(g, mid + 5, yE + 5 + j, C('teal', 3));
      }
    if (lit) halos.push({ x: mid + 0.5, y: yE + 8.5, r: 8, strength: 0.13, bands: 2 });
  }
  // Ground floor: four big lit windows and the door in the middle bay.
  for (let i = 0; i < bays; i++) {
    const mid = Math.round((bayX(i) + bayX(i + 1)) / 2);
    if (i === 2) continue;
    flick.push(...windowAt(g, mid - 4, yJ + 5, 9, 8, true, { sill: 'stone', id: 20 + i }));
    halos.push({ x: mid + 0.5, y: yJ + 9, r: 8, strength: 0.14, bands: 2 });
  }
  {
    const mid = Math.round((bayX(2) + bayX(3)) / 2);
    const dh = 15;
    const dx = mid - 4;
    for (let j = 0; j < dh; j++)
      for (let i = 0; i < 9; i++) {
        const y = yP - dh + j;
        const edge = i === 0 || i === 8 || j === 0;
        const plank = i % 3 === 1;
        put(g, dx + i, y, edge ? C('wood', 5) : C('wood', plank ? 4 : i < 4 ? 2 : 3));
      }
    // A lit pane in the door and the lantern beside it.
    for (const [i, j] of [
      [3, 3],
      [4, 3],
      [3, 4],
      [4, 4],
    ] as const)
      put(g, dx + i, yP - dh + j, C('glass', 1));
    put(g, dx + 11, yP - dh + 2, C('iron', 3));
    for (let j = 0; j < 3; j++) put(g, dx + 11, yP - dh + 3 + j, C('lamp', j === 0 ? 0 : 1));
    flick.push({ x: dx + 11, y: yP - dh + 4, a: C('lamp', 1), b: C('lamp', 2), id: 29 });
    halos.push({ x: dx + 11.5, y: yP - dh + 5, r: 11, strength: 0.26, bands: 3 });
  }
  // The sign on its bracket at the far end: a gull over an anchor.
  {
    const ax = wx + W;
    const ay = yJ + 4;
    for (let i = 0; i < 11; i++) put(g, ax + i, ay, C('iron', i === 10 ? 2 : 3));
    put(g, ax + 1, ay + 1, C('iron', 3));
    put(g, ax + 2, ay + 2, C('iron', 3));
    const bx = ax + 2;
    const by = ay + 2;
    fill(g, bx, by, 9, 10, (x, y) =>
      x === bx || y === by
        ? C('wood', 2)
        : x === bx + 8 || y === by + 9
          ? C('wood', 4)
          : C('navy', 3),
    );
    const pic = [
      '.s...s.',
      '..s.s..',
      '...s...',
      '...g...',
      '.ggggg.',
      '...g...',
      '.g.g.g.',
      '..ggg..',
    ];
    pic.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === 's') put(g, bx + 1 + i, by + 1 + j, C('linen', 1));
        if (ch === 'g') put(g, bx + 1 + i, by + 1 + j, C('gold', j < 5 ? 1 : 2));
      }),
    );
    put(g, bx + 3, by - 1, C('iron', 3));
    put(g, bx + 6, by - 1, C('iron', 3));
  }
  // The roof: red tile in courses, each lit and shading the next, hipped back at the ends.
  const over = 3;
  for (let j = 0; j < roofH; j++) {
    const y = yE - 1 - j;
    const inset = Math.round(j * 0.62);
    const x0 = wx - over + inset;
    const x1 = wx + W + over - inset;
    const course = j % 3;
    for (let x = x0; x < x1; x++) {
      const scal = (x + (Math.floor(j / 3) % 2) * 2) % 4;
      let t = course === 0 ? 4 : course === 1 ? 2 : 1;
      if (course === 1 && scal === 0) t = 3;
      if (course === 2 && hash(x >> 1, j, k + 4) < 0.08) t = 2;
      // The hips: the left one toward the light, the right one away.
      if (x < x0 + 2 + (j >> 3)) t = Math.max(0, t - 1);
      else if (x >= x1 - 2 - (j >> 3)) t = Math.min(5, t + 2);
      put(g, x, y, C('tile', t));
    }
  }
  for (
    let x = wx - over + Math.round(roofH * 0.62);
    x < wx + W + over - Math.round(roofH * 0.62);
    x++
  ) {
    put(g, x, yR - 1, C('tile', x % 3 === 0 ? 0 : 1));
  }
  // Moss in cushions low on the slope.
  for (const [mx, mj] of [
    [22, 2],
    [58, 5],
    [87, 3],
    [40, 11],
  ] as const) {
    put(g, wx + mx, yE - 1 - mj, C('moss', 2));
    put(g, wx + mx + 1, yE - 1 - mj, C('moss', 3));
    put(g, wx + mx, yE - mj, C('moss', 4));
    put(g, wx + mx + 1, yE - mj, C('moss', 5));
  }
  // The eave's shadow on the upper storey.
  dimBox(g, wx - 1, yE + 1, W + 2, 1, 2);
  dimBox(g, wx - 1, yE + 2, W + 2, 1, 1);
  // The chimney, and its shadow down the roof to its right.
  const chx = wx + 76;
  chimney(g, chx, 1, yR + 7, 8, k);
  for (let j = 0; j < 6; j++)
    for (let i = 0; i < 3; i++) {
      const c = at(g, chx + 8 + i + (j >> 1), yR + 1 + j);
      if (c) put(g, chx + 8 + i + (j >> 1), yR + 1 + j, darker(c, 2));
    }
  return {
    id: 'tavern',
    ...feet(outlined(g)),
    halos: halos.map(shift1),
    flicker: flick.map(shiftF),
    chimneys: [{ x: chx + 4 + 1, y: 0 + 1, dark: false }],
  };
}

// The smithy -----------------------------------------------------------------

/** The smithy: 98 pixels across (13 m), rubble and slate, the forge open on the left. */
export function smithySmall(k = 11): Building {
  const W = 98;
  const lean = 15;
  const wx = lean + 2;
  const gw = wx + W + 14;
  const yR = 14;
  const roofH = 22;
  const yE = yR + roofH;
  const wallH = 30;
  const H = yE + wallH;
  const g = grid(gw, H);
  const flick: Flicker[] = [];
  const halos: Halo[] = [];

  fill(g, wx, yE, W, wallH, (x, y) => rubble(x - wx, y - yE, k));
  // Cut quoins at both corners: long and short blocks in turn, paler and squarer than the rubble.
  for (let y = yE; y < H; y++) {
    const blk = Math.floor((y - yE) / 3);
    const sy = (y - yE) % 3;
    const long = blk % 2 === 0;
    for (const [x0, dir] of [
      [wx, 1],
      [wx + W - 1, -1],
    ] as const)
      for (let i = 0; i < (long ? 5 : 3); i++)
        put(
          g,
          x0 + dir * i,
          y,
          C('stone', sy === 2 ? 4 : sy === 0 || (dir > 0 && i === 0) ? 1 : 2),
        );
  }
  // The open forge: an oak lintel over a dark bay, the hearth glowing at the back.
  const fx = wx + 7;
  const fw = 32;
  const ft = yE + 7;
  fill(g, fx, ft, fw, H - ft, (x, y) => C('shade', y < ft + 4 ? 3 : x > fx + fw - 6 ? 2 : 1));
  fill(g, fx - 2, ft - 3, fw + 4, 3, (_x, y) => C('wood', y === ft - 3 ? 2 : y === ft - 1 ? 4 : 3));
  {
    // The hearth: a brick base, the fire in it, the hood above, an anvil before it.
    const hx = fx + 4;
    const hy = H - 7;
    fill(g, hx, hy, 12, 7, (x, y) => C('tile', y === hy ? 3 : 4 + ((x + y) % 3 === 0 ? 1 : 0)));
    fill(g, hx + 2, hy - 2, 8, 3, (x, y) => C('fire', y === hy - 2 ? 1 : (x + y) % 2 ? 2 : 3));
    for (let i = 2; i < 10; i++)
      flick.push({ x: hx + i, y: hy - 2, a: C('fire', 1), b: C('fire', 2), id: 40 });
    fill(g, hx - 1, ft + 2, 14, 2, () => C('iron', 4));
    fill(g, hx + 3, ft + 4, 6, hy - ft - 6, () => C('iron', 5));
    const ax = fx + 21;
    const ay = H - 6;
    fill(g, ax, ay, 8, 2, (x) => C('iron', x < ax + 4 ? 2 : 3));
    put(g, ax, ay, C('fire', 2));
    put(g, ax + 1, ay, C('fire', 2));
    fill(g, ax + 2, ay + 2, 4, 2, () => C('iron', 4));
    fill(g, ax + 1, ay + 4, 6, 2, () => C('wood', 4));
    halos.push({ x: hx + 6, y: hy - 2, r: 24, strength: 0.42, bands: 3, rgb: [255, 120, 48] });
  }
  // The log store, a lean-to against the left wall: log ends stacked under a slate roof.
  {
    const top = yE + 5;
    for (let x = 1; x < wx; x++) {
      const rise = Math.round(((wx - x) / wx) * 7);
      for (let y = top + rise; y < top + rise + 2; y++)
        put(g, x, y, C('slate', y === top + rise ? 2 : 4));
      for (let y = top + rise + 2; y < H; y++) put(g, x, y, C('shade', 2));
    }
    for (let y = top + 9; y < H - 1; y += 3)
      for (let x = 3 + ((y / 3) & 1); x < wx - 2; x += 3) {
        put(g, x, y, C('wood', 1));
        put(g, x + 1, y, C('wood', 3));
        put(g, x, y + 1, C('wood', 3));
        put(g, x + 1, y + 1, C('wood', 4));
      }
    for (let y = top + 7; y < H; y++) put(g, 1, y, C('wood', 3));
  }
  // The door and the window, right of the forge.
  {
    const dx = wx + 60;
    const dh = 15;
    for (let j = 0; j < dh; j++)
      for (let i = 0; i < 8; i++) {
        const edge = i === 0 || i === 7 || j === 0;
        put(
          g,
          dx + i,
          H - dh + j,
          edge ? C('wood', 5) : C('wood', i % 3 === 2 ? 4 : i < 4 ? 2 : 3),
        );
      }
    for (const j of [3, 11]) for (let i = 1; i < 6; i++) put(g, dx + i, H - dh + j, C('iron', 3));
    fill(g, dx - 1, H - dh - 2, 10, 2, (_x, y) => C('wood', y === H - dh - 2 ? 2 : 4));
    flick.push(...windowAt(g, wx + 78, yE + 9, 7, 7, true, { sill: 'stone', id: 41 }));
    halos.push({ x: wx + 81.5, y: yE + 12.5, r: 8, strength: 0.14, bands: 2 });
  }
  // The horseshoe on its bracket.
  {
    const ax = wx + W;
    const ay = yE + 6;
    for (let i = 0; i < 9; i++) put(g, ax + i, ay, C('iron', 3));
    put(g, ax + 1, ay + 1, C('iron', 3));
    const bx = ax + 1;
    const by = ay + 2;
    fill(g, bx, by, 9, 9, (x, y) =>
      x === bx || y === by
        ? C('wood', 2)
        : x === bx + 8 || y === by + 8
          ? C('wood', 4)
          : C('wood', 3),
    );
    const shoe = ['.i...i.', '.i...i.', '.i...i.', '.i...i.', '..iii..'];
    shoe.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === 'i') put(g, bx + 1 + i, by + 1 + j, C('iron', i < 3 ? 1 : 2));
      }),
    );
  }
  // Slate: hard dark lines under each course, joints staggered, hipped ends.
  const over = 3;
  for (let j = 0; j < roofH; j++) {
    const y = yE - 1 - j;
    const inset = Math.round(j * 0.58);
    const x0 = wx - over + inset;
    const x1 = wx + W + over - inset;
    const course = j % 3;
    for (let x = x0; x < x1; x++) {
      let t = course === 0 ? 5 : course === 2 ? 2 : 3;
      const joint = (x + Math.floor(j / 3) * 3) % 6 === 0;
      if (course !== 0 && joint) t = 4;
      if (course === 2 && hash(x >> 2, j, k) < 0.18) t = 1;
      if (x < x0 + 2 + (j >> 3)) t = Math.max(1, t - 1);
      else if (x >= x1 - 2 - (j >> 3)) t = Math.min(5, t + 1);
      put(g, x, y, C('slate', t));
    }
  }
  for (
    let x = wx - over + Math.round(roofH * 0.58);
    x < wx + W + over - Math.round(roofH * 0.58);
    x++
  )
    put(g, x, yR - 1, C('slate', 1));
  for (const [mx, mj] of [
    [70, 2],
    [34, 4],
  ] as const) {
    put(g, wx + mx, yE - 1 - mj, C('moss', 2));
    put(g, wx + mx + 1, yE - 1 - mj, C('moss', 3));
    put(g, wx + mx, yE - mj, C('moss', 4));
  }
  dimBox(g, wx, yE, W, 1, 2);
  dimBox(g, wx, yE + 1, W, 1, 1);
  // The forge's chimney, broad, above the hearth.
  const chx = wx + 12;
  chimney(g, chx, 1, yR + 8, 10, k);
  for (let j = 0; j < 6; j++)
    for (let i = 0; i < 3; i++) {
      const c = at(g, chx + 10 + i + (j >> 1), yR + 1 + j);
      if (c) put(g, chx + 10 + i + (j >> 1), yR + 1 + j, darker(c, 2));
    }
  return {
    id: 'smithy',
    ...feet(outlined(g)),
    halos: halos.map(shift1),
    flicker: flick.map(shiftF),
    chimneys: [{ x: chx + 5 + 1, y: 1, dark: true }],
  };
}

// Your house -----------------------------------------------------------------

/** Your house: 58 pixels across (8.5 m at the hill's distance), limewash under thick thatch. */
export function houseSmall(k = 23): Building {
  const W = 58;
  const over = 5;
  const wx = over + 2;
  const gw = wx + W + over + 2;
  const yR = 10;
  const roofH = 25;
  const yE = yR + roofH;
  const wallH = 20;
  const yP = yE + wallH;
  const H = yP + 3;
  const g = grid(gw, H);
  const flick: Flicker[] = [];
  const halos: Halo[] = [];

  fill(g, wx, yE - 2, W, wallH + 2, (x, y) => {
    let t = 2 + (hash(x >> 2, y >> 2, k) < 0.15 ? 1 : 0);
    if (x > wx + W - 3) t += 1;
    return C('limewash', t);
  });
  fill(g, wx - 1, yP, W + 2, 3, (x, y) =>
    C('stone', y === yP ? 1 : 3 + ((x * 3 + y) % 5 === 0 ? 1 : 0)),
  );
  // Two windows with blue shutters, a box of flowers under the left one.
  for (const [wx0, id] of [
    [wx + 8, 50],
    [wx + W - 15, 51],
  ] as const) {
    flick.push(...windowAt(g, wx0, yE + 4, 7, 7, true, { frame: 'wood', sill: 'limewash', id }));
    for (let j = 0; j < 7; j++) {
      put(g, wx0 - 3, yE + 4 + j, C('blue', 2));
      put(g, wx0 - 2, yE + 4 + j, C('blue', 3));
      put(g, wx0 + 8, yE + 4 + j, C('blue', 2));
      put(g, wx0 + 9, yE + 4 + j, C('blue', 3));
    }
    halos.push({ x: wx0 + 3.5, y: yE + 7.5, r: 8, strength: 0.13, bands: 2 });
  }
  fill(g, wx + 7, yE + 13, 9, 2, (_x, y) => C('wood', y === yE + 13 ? 3 : 4));
  for (let i = 0; i < 9; i += 2) put(g, wx + 7 + i, yE + 12, C('flower', i % 4 === 0 ? 2 : 3));
  // The blue door in the middle, its brass knob, a lit fanlight.
  {
    const dx = wx + Math.round(W / 2) - 4;
    const dh = 13;
    for (let j = 0; j < dh; j++)
      for (let i = 0; i < 8; i++) {
        const edge = i === 0 || i === 7 || j === 0;
        put(
          g,
          dx + i,
          yP - dh + j,
          edge ? C('wood', 4) : C('blue', i % 3 === 2 ? 4 : i < 4 ? 2 : 3),
        );
      }
    put(g, dx + 5, yP - 6, C('gold', 1));
    for (let i = 1; i < 7; i++) put(g, dx + i, yP - dh - 1, C('glass', i < 4 ? 0 : 1));
    put(g, dx, yP - dh - 1, C('wood', 4));
    put(g, dx + 7, yP - dh - 1, C('wood', 4));
    halos.push({ x: dx + 4, y: yP - dh, r: 8, strength: 0.14, bands: 2 });
  }
  // Thatch: thick, its hips rounded, combed in strands, a cut ridge, eaves that drip.
  const shape = (j: number) => {
    // The inset at height j above the eave: rounded, steepening toward the ridge.
    const f = j / roofH;
    return Math.round(roofH * 0.5 * Math.pow(f, 1.25) + (f > 0.85 ? (f - 0.85) * 30 : 0));
  };
  for (let j = 0; j < roofH; j++) {
    const y = yE - 1 - j;
    const inset = shape(j);
    const x0 = wx - over + inset;
    const x1 = wx + W + over - inset;
    for (let x = x0; x < x1; x++) {
      // Combed strands: each column its own tone for a few rows at a time, so
      // the thatch reads as straw laid downward, with a darker line at each course.
      const strand = hash(x, Math.floor((j + (x % 3) * 2) / 7), k + 5);
      let t = strand < 0.28 ? 1 : strand < 0.8 ? 2 : 3;
      if (j % 7 === 6 && hash(x >> 1, j, k) < 0.7) t = 3;
      if (x < x0 + 2) t = Math.max(0, t - 1);
      else if (x >= x1 - 3) t = Math.min(5, t + 2);
      put(g, x, y, C('thatch', t));
    }
  }
  // The eave: a thick lip in shadow, tufts dripping below it.
  for (let x = wx - over; x < wx + W + over; x++) {
    put(g, x, yE - 1, C('thatch', 3));
    put(g, x, yE, C('thatch', 4));
    if ((x * 7 + k) % 3 === 0) put(g, x, yE + 1, C('thatch', 4));
  }
  // The ridge, cut in points along its foot.
  const rTop = yE - roofH;
  for (let x = wx - over + shape(roofH - 1); x < wx + W + over - shape(roofH - 1); x++) {
    put(g, x, rTop, C('thatch', 1));
    put(g, x, rTop + 1, C('thatch', 1));
    put(g, x, rTop + 2, C('thatch', x % 4 < 2 ? 1 : 3));
    if (x % 4 === 0) put(g, x, rTop + 3, C('thatch', 3));
  }
  // The eyebrow window: the thatch lifts over a small lit window above the door.
  {
    const ex = wx + Math.round(W / 2);
    const ey = yE - 9;
    for (let i = -10; i <= 10; i++) {
      const lift = Math.round(Math.sqrt(Math.max(0, 100 - i * i)) * 0.6);
      // The lifted thatch: a lit roll over the window, its shadow under it.
      put(g, ex + i, ey - lift - 2, C('thatch', 0));
      put(g, ex + i, ey - lift - 1, C('thatch', 1));
      put(g, ex + i, ey - lift, C('thatch', 2));
      if (Math.abs(i) < 9) put(g, ex + i, ey - lift + 1, C('thatch', 4));
      if (Math.abs(i) < 7) put(g, ex + i, ey - lift + 2, C('thatch', 5));
    }
    flick.push(...windowAt(g, ex - 3, ey - 1, 6, 4, true, { sill: 'thatch', cross: true, id: 52 }));
    halos.push({ x: ex, y: ey, r: 8, strength: 0.15, bands: 2 });
  }
  dimBox(g, wx, yE + 1, W, 1, 2);
  dimBox(g, wx, yE + 2, W, 1, 1);
  const chx = wx + W - 12;
  chimney(g, chx, 1, yR + 8, 6, k);
  return {
    id: 'house',
    ...feet(outlined(g)),
    halos: halos.map(shift1),
    flicker: flick.map(shiftF),
    chimneys: [{ x: chx + 3 + 1, y: 1, dark: false }],
  };
}

/** The drawing and where its foot is: the extent of the row above the outline's bottom. */
function feet(g: TGrid): { g: TGrid; footL: number; footR: number } {
  const y = g.h - 2;
  let l = g.w;
  let r = -1;
  for (let x = 0; x < g.w; x++) {
    const c = at(g, x, y);
    if (c && (c & 7) !== 6) {
      l = Math.min(l, x);
      r = x;
    }
  }
  return { g, footL: l, footR: r + 1 };
}

// `outlined` adds a pixel on every side; move what was measured before it.
const shift1 = (h: Halo): Halo => ({ ...h, x: h.x + 1, y: h.y + 1 });
const shiftF = (f: Flicker): Flicker => ({ ...f, x: f.x + 1, y: f.y + 1 });
