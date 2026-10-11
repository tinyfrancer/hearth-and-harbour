/**
 * The ferry's pieces on the quay (B15; Cody: "make it more apparent we need
 * to click the boat"): a painted sign on a post by the mooring and a lantern
 * on a pole for the rowing boat's bow. Each a town piece by id
 * (`boat_sign`, `boat_lantern`), drawn as the town's props are: to metres,
 * shaded as solids and lit from the upper left; their lamps light at dusk.
 */
import type { Glow } from '../raster';
import { cell, put, tgrid, type Cell } from './cells';
import type { Drawn } from './props';
import { m } from './scale';
import { clamp, cyl } from './texture';

const C = cell;

/** Rows of characters at (x, y): '.' empty, anything else a pin. */
function rowsAt(
  g: ReturnType<typeof tgrid>,
  x: number,
  y: number,
  rows: readonly string[],
  pins: Readonly<Record<string, Cell>>,
): void {
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const c = pins[r[i]!];
      if (c) put(g, x + i, y + j, c);
    }
  });
}

/** A small ship's lantern: a cap, a cage of four panes, a candle; lit panes in `lamp`. */
function lantern(g: ReturnType<typeof tgrid>, x: number, y: number): void {
  rowsAt(
    g,
    x,
    y,
    ['..ab..', '.aabb.', 'abbbbc', 'aLlLlc', 'aLFlLc', 'aLWlLc', 'abbbbc', '.bccc.'],
    {
      a: C('iron', 2),
      b: C('iron', 3),
      c: C('iron', 5),
      L: C('lamp', 2),
      l: C('lamp', 1),
      F: C('fire', 1),
      W: C('plaster', 1),
    },
  );
}

/**
 * The ferry's sign: a painted board on a post, a rowing boat with its oars
 * out over blue water on a cream ground and a red border, a small lantern
 * hung from an iron arm over it that lights at dusk. About 1.8 m to the top
 * of the post; the board 0.85 m across.
 */
export function boatSign(): Drawn {
  const W = m(1.1);
  const H = m(1.85);
  const g = tgrid(W, H);
  const px = Math.round(W * 0.3);
  const pw = 4;
  // The post: squared timber, lit face and shadow face, set in the quay with a lip of stone.
  for (let y = 4; y < H; y++)
    for (let i = 0; i < pw; i++)
      put(g, px + i, y, C('wood', i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 3 : 4));
  for (let i = -1; i <= pw; i++) put(g, px + i, H - 1, C('stone', i < 1 ? 2 : 4));
  // The iron arm out over the board, the lantern hung from it.
  for (let x = px + pw; x < W - 3; x++) put(g, x, 6, C('iron', x === px + pw ? 2 : 3));
  put(g, px + pw, 7, C('iron', 3));
  put(g, px + pw + 1, 8, C('iron', 4));
  const lx = W - 9;
  put(g, lx + 2, 7, C('iron', 3));
  lantern(g, lx, 8);
  // The board, hung below the lantern from the post: a red frame, cream ground, the picture.
  const bx = 1;
  const by = 18;
  const bw = W - 2;
  const bh = m(0.55);
  for (let y = by; y < by + bh; y++)
    for (let x = bx; x < bx + bw; x++) {
      const edge = x === bx || y === by || x === bx + bw - 1 || y === by + bh - 1;
      const rim = x === bx + 1 || y === by + 1 || x === bx + bw - 2 || y === by + bh - 2;
      let c: Cell;
      if (edge) c = C('crimson', y === by || x === bx ? 2 : 4);
      else if (rim) c = C('crimson', y === by + 1 || x === bx + 1 ? 1 : 3);
      else c = C('cream', y < by + 4 ? 0 : 1);
      put(g, x, y, c);
    }
  // The picture: a rowing boat with its oars raised, on a band of blue water. B16: bolder (it was
  // thin lines at true size): a dark hull filling the board, the boat's own white and red strake,
  // thick oars, two rows of sea.
  const ix = bx + Math.round((bw - 30) / 2);
  const iy = by + 3;
  rowsAt(
    g,
    ix,
    iy,
    [
      'OO..........................OO',
      '.OO........................OO.',
      '..OO......................OO..',
      '...OO....................OO...',
      'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
      '.wwwwwwwwwwwwwwwwwwwwwwwwwwww.',
      '..rrrrrrrrrrrrrrrrrrrrrrrrrr..',
      '...hhhhhhhhhhhhhhhhhhhhhhhh...',
      '.....hhhhhhhhhhhhhhhhhhhh.....',
      '.......kkkkkkkkkkkkkkkk.......',
      'ssssssssssssssssssssssssssssss',
      '.SS..SSS..SS..SSS..SS..SSS..S.',
    ],
    {
      O: C('pinewood', 3),
      k: C('wood', 5),
      w: C('sail', 0),
      r: C('crimson', 2),
      h: C('wood', 3),
      s: C('sea', 3),
      S: C('sea', 2),
    },
  );
  // The board's cords up to the post.
  put(g, bx + 3, by - 1, C('linen', 3));
  put(g, bx + bw - 4, by - 1, C('linen', 3));
  const glows: Glow[] = [{ x: lx + 3, y: 12, radius: m(1.6), strength: 0.55 }];
  return { grid: g, glows };
}

/**
 * A lantern on a pole for the rowing boat's bow: a slim ash pole lashed at
 * its foot, a ship's lantern at its top that lights at dusk (so the boat
 * shows across the harbour), a ribbon of red at the top.
 */
export function boatLantern(): Drawn {
  // B16: the pole a staff's length taller with a red pennant flying from its head (the boat had
  // nothing standing above the quay's edge to catch the eye from across the square).
  const W = 24;
  const lift = 14;
  const H = m(1.25) + lift;
  const g = tgrid(W, H);
  const cx = 5;
  for (let y = 1; y < H; y++)
    for (let i = 0; i < 2; i++) {
      const nx = i === 0 ? -0.6 : 0.6;
      put(g, cx + i, y, C('pinewood', clamp(cyl(nx, 2, 1.2), 1, 4)));
    }
  // A gilt knob on the staff's head.
  put(g, cx, 0, C('gold', 1));
  put(g, cx + 1, 0, C('gold', 3));
  // The pennant, long and tapering, rippling out to the right; lit along its top.
  rowsAt(
    g,
    cx + 2,
    1,
    [
      'RRRRRRRRR........',
      'rrrrrrrrrrrrRR...',
      'rrrrrrrrrrrrrrrrr',
      'sssssssssssss....',
      'ssssss...........',
    ],
    { R: C('crimson', 1), r: C('crimson', 2), s: C('crimson', 3) },
  );
  // Lashing at the foot.
  for (const y of [H - 6, H - 4]) for (let i = -1; i < 3; i++) put(g, cx + i, y, C('linen', 2));
  lantern(g, cx - 2, lift + 1);
  put(g, cx + 1, lift, C('iron', 2));
  const glows: Glow[] = [{ x: cx + 1, y: lift + 5, radius: m(1.4), strength: 0.6 }];
  return { grid: g, glows };
}
