/**
 * The pixel engine: a picture is a grid of palette steps (or nothing), drawn
 * into with a few primitives. Harvested from the approved mock-up
 * (docs/art-reference/town-mockup.html), with the same rounding, so harvested
 * drawings come out pixel for pixel as they were approved.
 *
 * Everything here is pure arithmetic on arrays; nothing touches a canvas.
 */
import { isShade, type Shade } from './palette';

export type Cell = Shade | null;

export interface Grid {
  readonly w: number;
  readonly h: number;
  /** Row by row, `w * h` cells. Drawing writes into it. */
  readonly d: Cell[];
}

export function grid(w: number, h: number): Grid {
  return { w, h, d: new Array<Cell>(w * h).fill(null) };
}

/** Sets one pixel, rounding the position the way the mock-up does. Off-grid is ignored. */
export function set(g: Grid, x: number, y: number, c: Cell): void {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c;
}

export function get(g: Grid, x: number, y: number): Cell {
  return x >= 0 && y >= 0 && x < g.w && y < g.h ? (g.d[y * g.w + x] ?? null) : null;
}

export function clear(g: Grid, x: number, y: number): void {
  set(g, x, y, null);
}

export function rect(g: Grid, x: number, y: number, w: number, h: number, c: Shade): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(g, x + i, y + j, c);
}

export function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number, c: Shade): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const a = (x - cx) / rx;
      const b = (y - cy) / ry;
      if (a * a + b * b <= 1) set(g, x, y, c);
    }
}

export function line(g: Grid, x0: number, y0: number, x1: number, y1: number, c: Shade): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) set(g, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
}

/** Draws `s` onto `g` with its top-left at (x, y); empty cells let `g` show through. */
export function blit(g: Grid, s: Grid, x: number, y: number): void {
  for (let j = 0; j < s.h; j++)
    for (let i = 0; i < s.w; i++) {
      const c = s.d[j * s.w + i];
      if (c) set(g, x + i, y + j, c);
    }
}

/** Turns up to `n` random pixels of one step into another inside a box: wear, flecks, moss. */
export function sprinkle(
  g: Grid,
  rand: () => number,
  n: number,
  box: { x: number; y: number; w: number; h: number },
  from: Shade,
  to: Shade,
): void {
  for (let i = 0; i < n; i++) {
    const x = box.x + ((rand() * box.w) | 0);
    const y = box.y + ((rand() * box.h) | 0);
    if (get(g, x, y) === from) set(g, x, y, to);
  }
}

/**
 * The automatic outline: a copy one pixel bigger on every side, with ink in
 * every empty pixel that touches a filled one along an edge (not a corner).
 * Applied to a whole object at once, so nobody draws outlines by hand.
 */
export function outline(s: Grid, ink: Shade = 'ink1'): Grid {
  const g = grid(s.w + 2, s.h + 2);
  blit(g, s, 1, 1);
  const add: number[] = [];
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (get(g, x, y)) continue;
      if (get(g, x, y - 1) || get(g, x + 1, y) || get(g, x - 1, y) || get(g, x, y + 1))
        add.push(y * g.w + x);
    }
  for (const i of add) g.d[i] = ink;
  return g;
}

/**
 * The soft ground shadow under a standing thing: a flat ellipse in the
 * ground's own dark step, drawn on the ground before the thing stands on it.
 * (cx, cy) is where its feet meet the ground.
 */
export function groundShadow(
  g: Grid,
  cx: number,
  cy: number,
  ground: Shade,
  rx = 10,
  ry = 2.6,
): void {
  ellipse(g, cx, cy, rx, ry, ground);
}

/**
 * Draws a shape given in coordinates `factor` times smaller than the grid,
 * which is how the mock-up drew its larger props from smaller sketches.
 */
export function scaled(g: Grid, factor: number) {
  const at = (v: number): number => Math.round(v * factor);
  return {
    rect: (x: number, y: number, w: number, h: number, c: Shade): void =>
      rect(g, at(x), at(y), Math.max(1, at(x + w) - at(x)), Math.max(1, at(y + h) - at(y)), c),
    ellipse: (cx: number, cy: number, rx: number, ry: number, c: Shade): void =>
      ellipse(g, cx * factor, cy * factor, rx * factor, ry * factor, c),
  };
}

/** Which palette step each character in a sprite stands for. '.' and ' ' are always empty. */
export type Legend = Readonly<Record<string, Shade>>;

/**
 * Reads a sprite drawn as rows of characters. Rows may be ragged: the sprite
 * is as wide as its longest row and short rows are empty past their end, so
 * trailing dots can be left off. A character the legend does not know is a
 * mistake in the drawing, and says where it is.
 */
export function parseSprite(rows: readonly string[], legend: Legend): Grid {
  for (const [ch, shade] of Object.entries(legend)) {
    if (ch.length !== 1) throw new Error(`Legend key "${ch}" must be one character.`);
    if (!isShade(shade)) throw new Error(`Legend maps "${ch}" to unknown step "${shade}".`);
  }
  const width = rows.reduce((w, row) => Math.max(w, row.length), 0);
  const g = grid(width, rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      const shade = legend[ch];
      if (!shade) throw new Error(`Unknown character "${ch}" at row ${y}, column ${x}.`);
      g.d[y * width + x] = shade;
    });
  });
  return g;
}
