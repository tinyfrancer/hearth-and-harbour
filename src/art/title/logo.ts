/**
 * The logotype as the title shows it: the output of `drawLogotype`
 * (logoDraw.ts) baked into logoData.ts as runs of named cells, so the first
 * frame does not wait for the letters to be sampled and lit. Decoded once.
 */
import { cellName, cellNamed } from './ramps';
import { LOGO_DATA } from './logoData';

/** A picture in cells, `w` by `h`. */
export interface Cells {
  readonly w: number;
  readonly h: number;
  readonly d: Int16Array;
}

/** A baked picture: its size, the cells it uses (`ramp:step`), and its runs. */
export interface Baked {
  readonly w: number;
  readonly h: number;
  readonly palette: readonly string[];
  readonly runs: string;
}

const DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Runs, row by row: each is one digit for the palette entry (0 for empty)
 * and one for its length less one, up to 64; a longer run is several.
 */
export function bake(g: Cells): Baked {
  const palette: string[] = [''];
  const index = new Map<number, number>([[0, 0]]);
  let runs = '';
  let i = 0;
  while (i < g.d.length) {
    const c = g.d[i] as number;
    let n = 1;
    while (i + n < g.d.length && g.d[i + n] === c && n < 64) n++;
    if (!index.has(c)) {
      index.set(c, palette.length);
      palette.push(cellName(c));
    }
    runs += DIGITS[index.get(c) as number]! + DIGITS[n - 1]!;
    i += n;
  }
  return { w: g.w, h: g.h, palette, runs };
}

export function unbake(b: Baked): Cells {
  const cells = b.palette.map((name) => (name ? cellNamed(name) : 0));
  const d = new Int16Array(b.w * b.h);
  let i = 0;
  for (let k = 0; k < b.runs.length; k += 2) {
    const c = cells[DIGITS.indexOf(b.runs[k]!)] as number;
    const n = DIGITS.indexOf(b.runs[k + 1]!) + 1;
    if (c) d.fill(c, i, i + n);
    i += n;
  }
  return { w: b.w, h: b.h, d };
}

let made: Cells | null = null;

/** HEARTH / & / HARBOUR in cells (title ramps), about 240 x 120. */
export function logotype(): Cells {
  made ??= unbake(LOGO_DATA);
  return made;
}
