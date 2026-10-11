/**
 * Pictures for dungeon replay (B17, for S16): an icon for each daily
 * modifier and each challenge, a medal for a challenge's state, and a seal
 * for a dungeon cleared (or cleared with every challenge).
 *
 * The game's ids are lane A's (`src/data/dungeons.ts`) and art never imports
 * them, so an icon is chosen by **kind**: a small matcher reads the id (a
 * challenge's `<dungeon>.<slug>` or a modifier's id) for words that say what
 * it does (`tough`, `fierce`, `swift`, `tide`, `no_food`, `untouched`, ...)
 * and picks the pictogram drawn for that kind; `modifierIconFor(effects)`
 * reads a modifier's effects instead, so the right picture follows the data
 * even for an id never seen here. Anything unrecognised gets a sensible
 * generic picture (a die for a modifier, a target for a challenge), never
 * nothing.
 *
 * Icons are 24 x 24 with their outline, like the item icons, in the town's
 * cells (rasterize with `DAY2`); the elements come at the item icons' whole
 * pixel scale (`iconScale`). Each pictogram is one object, lit from the upper
 * left, outlined in its own darkest step; a thing forbidden (no food, no
 * brace, no potion) sits inside a red ring with a bar across it.
 */
import { chartEmblem2, type ChartPiece2 } from './chart';
import { iconScale } from './icons';
import {
  at,
  cell,
  outlined,
  put,
  solid,
  stamp,
  tgrid,
  type Picture2,
  type TGrid,
} from './town2/cells';
import { DAY2, type Mat } from './town2/ramps';
import { pixelCanvas2 } from './town2/raster';

/** The drawing area inside an icon's outline, and the icon with it. */
const IN = 22;
export const DUNGEON_ICON_SIZE = IN + 2;

type Pins = Readonly<Record<string, readonly [Mat, number]>>;
type Inside = (x: number, y: number) => boolean;

function rows(g: TGrid, x0: number, y0: number, r: readonly string[], pins: Pins): void {
  r.forEach((line, j) => {
    for (let i = 0; i < line.length; i++) {
      const p = pins[line[i]!];
      if (p) put(g, x0 + i, y0 + j, cell(p[0], p[1]));
    }
  });
}

/** A shape painted as a solid, lit from the upper left by its bevel. */
function fill(
  g: TGrid,
  inside: Inside,
  mat: Mat,
  base = 2,
  contrast = 1.2,
  radius = 3,
  lo = 0,
  hi = 5,
): Uint8Array {
  return solid(g, 0, 0, g.w, g.h, inside, mat, { base, contrast, radius, lo, hi });
}

const disc =
  (cx: number, cy: number, r: number): Inside =>
  (x, y) =>
    (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r;

/** Inside a polygon, by pixel centres. */
function poly(pts: readonly (readonly [number, number])[]): Inside {
  return (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]!;
      const [xj, yj] = pts[j]!;
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

/** Distance from a point to a segment. */
function toSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return { d: Math.hypot(px - ax - t * dx, py - ay - t * dy), t };
}

/** A four-pointed sparkle: arms `r` long, white at the heart. */
function sparkle(g: TGrid, cx: number, cy: number, r: number, mat: Mat = 'gold'): void {
  for (let k = -r; k <= r; k++) {
    const a = Math.abs(k);
    const t = a === 0 ? 0 : a >= r ? 3 : a > r / 2 ? 2 : 1;
    put(g, cx + k, cy, cell(mat, t));
    put(g, cx, cy + k, cell(mat, t));
  }
  if (r >= 3) {
    put(g, cx - 1, cy - 1, cell(mat, 1));
    put(g, cx + 1, cy + 1, cell(mat, 2));
    put(g, cx + 1, cy - 1, cell(mat, 1));
    put(g, cx - 1, cy + 1, cell(mat, 2));
  }
}

/** The heart: two lobes and a point, filling the square. */
const heart =
  (dx = 0, dy = 0, s = 1): Inside =>
  (x, y) => {
    const px = (x + 0.5 - dx - 11) / s + 11;
    const py = (y + 0.5 - dy - 11) / s + 11;
    const r = 4.9;
    if ((px - 6.4) ** 2 + (py - 6.6) ** 2 <= r * r) return true;
    if ((px - 15.6) ** 2 + (py - 6.6) ** 2 <= r * r) return true;
    if (py < 7 || py > 20) return false;
    const half = 9.6 * Math.pow((20 - py) / 13, 0.9);
    return Math.abs(px - 11) <= half;
  };

/**
 * A red ring with a bar from its upper left to its lower right, over
 * whatever is drawn: the thing is forbidden. Its own dark rim on both sides
 * so it reads over the thing as well as off it.
 */
function forbid(g: TGrid): void {
  const c = 10.5;
  for (let y = 0; y < IN; y++)
    for (let x = 0; x < IN; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const d = Math.hypot(px - c - 0.5, py - c - 0.5);
      const bar = toSegment(px, py, 4.3, 4.3, 17.7, 17.7).d;
      const ring = d > 8.3 && d <= 11;
      const inBar = bar <= 1.6 && d <= 9.6;
      const rim = (!ring && d > 7.4 && d <= 8.3) || (!inBar && bar <= 2.5 && d <= 8.6);
      if (ring || inBar) {
        const lit = (px - py) * 0.06 + (py < c ? 0.4 : 0) - (d > 10.2 ? 0.6 : 0);
        put(g, x, y, cell('crimson', lit > 0.5 ? 1 : lit > -0.2 ? 2 : 3));
      } else if (rim && at(g, x, y)) put(g, x, y, cell('crimson', 5));
    }
}

/** A small object shrunk to sit inside the forbid ring: drawn on its own grid, then stamped. */
function inset(g: TGrid, draw: (s: TGrid) => void, x = 3, y = 3, w = 16, h = 16): void {
  const s = tgrid(w, h);
  draw(s);
  stamp(g, outlined(s), x - 1, y - 1);
}

// ------------------------------------------------------------------ pictograms

/** Every kind drawn, modifiers' and challenges' together. */
export const DUNGEON_ICON_KINDS = [
  // modifiers
  'tough',
  'fierce',
  'swift',
  'slow',
  'might',
  'frail',
  'loot',
  'coins',
  'xp',
  'tide',
  'hungry',
  'dark',
  'modifier',
  // challenges
  'time',
  'untouched',
  'nobrace',
  'nopotion',
  'unarmed',
  'dodge',
  'boss',
  'slayer',
  'challenge',
] as const;
export type DungeonIconKind = (typeof DUNGEON_ICON_KINDS)[number];

const DRAW: Readonly<Record<DungeonIconKind, (g: TGrid) => void>> = {
  // Foes are tougher: a heart bound with an iron band, rivets lit.
  tough(g) {
    const h = heart();
    fill(g, h, 'crimson', 2, 1.4, 3.2, 0, 4);
    for (let x = 0; x < IN; x++)
      for (const [y, t] of [
        [10, 1],
        [11, 2],
        [12, 2],
        [13, 4],
      ] as const)
        if (h(x, y)) put(g, x, y, cell('iron', t));
    for (const x of [3, 8, 13, 18])
      if (h(x, 11)) {
        put(g, x, 11, cell('iron', 0));
        put(g, x + 1, 12, cell('iron', 4));
      }
    put(g, 5, 4, cell('crimson', 0));
    put(g, 4, 5, cell('crimson', 0));
    put(g, 5, 5, cell('crimson', 1));
  },

  // Foes hit harder: three claw rakes across a burst.
  fierce(g) {
    const burst: Inside = (x, y) => {
      const a = Math.atan2(y + 0.5 - 11, x + 0.5 - 11);
      const r = Math.hypot(x + 0.5 - 11, y + 0.5 - 11);
      const spike = 0.5 + 0.5 * Math.cos(a * 7 + 0.4);
      return r <= 6.4 + 4.4 * spike ** 2;
    };
    fill(g, burst, 'fire', 2, 0.9, 2.5, 1, 4);
    for (const k of [-5.2, 0, 5.2]) {
      const ax = 17 + k * 0.62;
      const ay = 1.5 + k * 0.52;
      const bx = 4 + k * 0.62;
      const by = 19.5 + k * 0.52;
      for (let y = 0; y < IN; y++)
        for (let x = 0; x < IN; x++) {
          const { d, t } = toSegment(x + 0.5, y + 0.5, ax, ay, bx, by);
          const w = 2.3 * Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.7;
          if (d <= w) put(g, x, y, cell('crimson', d <= w - 1.1 ? 1 : 4));
        }
    }
  },

  // Foes are faster: a double chevron racing right, speed lines trailing.
  swift(g) {
    const chevron =
      (tip: number): Inside =>
      (x, y) => {
        const d = Math.abs(y + 0.5 - 11);
        const front = tip - d * 0.95;
        return d <= 8.4 && x + 0.5 <= front && x + 0.5 >= front - 4.6;
      };
    fill(g, chevron(22), 'crimson', 2, 1.3, 2);
    fill(g, chevron(14.5), 'crimson', 2, 1.3, 2);
    const lines: readonly (readonly [number, number])[] = [
      [5, 4],
      [11, 2],
      [17, 4],
    ];
    for (const [y, x1] of lines)
      for (let x = 0; x <= x1; x++) put(g, x, y, cell('crimson', x === x1 ? 2 : 3));
  },

  // Foes are slower: a large Z and a small one, half asleep.
  slow(g) {
    rows(
      g,
      9,
      1,
      [
        '111111111',
        '222222211',
        '......112',
        '.....112.',
        '....112..',
        '...112...',
        '..112....',
        '.112.....',
        '111111111',
        '222222222',
      ],
      { '1': ['blue', 1], '2': ['blue', 3] },
    );
    rows(g, 1, 12, ['111111', '....12', '...12.', '..12..', '.12...', '111111', '222222'], {
      '1': ['blue', 1],
      '2': ['blue', 3],
    });
    put(g, 15, 15, cell('blue', 2));
    put(g, 18, 18, cell('blue', 2));
  },

  // The hero hits harder: a sword raised, a spark at its edge.
  might(g) {
    // The blade from the guard up and right to its point, an edge, a midrib, a shadowed edge.
    for (let i = 0; i <= 12; i++) {
      const x = 7 + i;
      const y = 14 - i;
      put(g, x, y, cell('iron', 1));
      put(g, x - 1, y, cell('iron', 0));
      put(g, x, y + 1, cell('iron', 3));
      if (i < 12) put(g, x + 1, y + 1, cell('iron', 4));
    }
    put(g, 19, 2, cell('iron', 0));
    put(g, 20, 1, cell('iron', 0));
    // The guard across, gold, and the grip and pommel.
    for (let k = -3; k <= 3; k++) put(g, 6 + k, 15 + k, cell('gold', k < 0 ? 1 : k === 0 ? 2 : 3));
    for (let k = -3; k <= 2; k++) put(g, 7 + k, 16 + k, cell('gold', 4));
    for (let i = 0; i < 3; i++) {
      put(g, 4 - i, 17 + i, cell('leather', 2));
      put(g, 5 - i, 17 + i, cell('leather', 3));
    }
    put(g, 1, 20, cell('gold', 2));
    put(g, 2, 20, cell('gold', 3));
    put(g, 1, 21, cell('gold', 3));
    put(g, 0, 20, cell('gold', 1));
    sparkle(g, 16, 5, 3, 'gold');
    sparkle(g, 20, 9, 1, 'gold');
  },

  // The hero is frail: a heart split by a crack.
  frail(g) {
    fill(g, heart(), 'crimson', 2, 1.4, 3.2, 0, 4);
    const crack = [
      [11, 5],
      [11, 6],
      [10, 7],
      [10, 8],
      [11, 9],
      [12, 10],
      [12, 11],
      [11, 12],
      [10, 13],
      [10, 14],
      [11, 15],
      [11, 16],
      [11, 17],
    ] as const;
    for (const [x, y] of crack) {
      put(g, x, y, cell('crimson', 6));
      put(g, x + 1, y, cell('crimson', 4));
    }
    put(g, 5, 4, cell('crimson', 0));
    put(g, 4, 5, cell('crimson', 0));
  },

  // More loot: an open chest, gold heaped in it, a gleam.
  loot(g) {
    // The lid thrown back: its inside, dark, a band of iron at its rim.
    fill(
      g,
      poly([
        [3, 3],
        [19, 3],
        [20, 9],
        [2, 9],
      ]),
      'wood',
      4,
      0.6,
      1.5,
      3,
      5,
    );
    for (let x = 3; x <= 18; x++) put(g, x, 3, cell('iron', 2));
    // Gold heaped above the rim, coins lit on top.
    fill(
      g,
      (x, y) => (x + 0.5 - 11) ** 2 / 64 + (y + 0.5 - 11) ** 2 / 9 <= 1 && y <= 12,
      'gold',
      2,
      1,
      2,
      0,
      4,
    );
    for (const [x, y] of [
      [7, 9],
      [11, 8],
      [14, 9],
      [9, 10],
    ] as const) {
      put(g, x, y, cell('gold', 0));
      put(g, x + 1, y, cell('gold', 3));
    }
    // The body: planks lit on the left, two iron bands, a gold lock plate.
    for (let y = 12; y <= 20; y++)
      for (let x = 1; x <= 20; x++) {
        const t = x < 3 ? 1 : x > 17 ? 4 : y === 12 ? 1 : y === 16 ? 4 : 2;
        put(g, x, y, cell('wood', y === 20 ? 4 : t));
      }
    for (const bx of [4, 17])
      for (let y = 12; y <= 20; y++) put(g, bx, y, cell('iron', y === 12 ? 1 : 3));
    for (let y = 14; y <= 17; y++)
      for (let x = 9; x <= 12; x++) put(g, x, y, cell('gold', x === 9 ? 1 : x === 12 ? 4 : 2));
    put(g, 10, 16, cell('gold', 6));
    put(g, 11, 16, cell('gold', 6));
    sparkle(g, 17, 6, 2, 'gold');
  },

  // More coins: a stack of coins and one stood on its edge before it.
  coins(g) {
    for (let k = 0; k < 4; k++) {
      const top = 15 - k * 3;
      for (let y = top; y <= top + 4; y++)
        for (let x = 1; x <= 12; x++) {
          const ex = (x + 0.5 - 6.5) / 6;
          const face = ex * ex + ((y + 0.5 - top - 1.5) / 1.8) ** 2 <= 1;
          const side = Math.abs(ex) <= 1 && y >= top + 2;
          if (!face && !side) continue;
          const t = face ? (ex < -0.2 ? 0 : ex < 0.4 ? 1 : 2) : ex < -0.5 ? 2 : ex < 0.5 ? 3 : 4;
          put(g, x, y, cell('gold', face && y === top + 1 && Math.abs(ex) < 0.5 ? 1 : t));
        }
    }
    const c = disc(15, 14, 6.4);
    fill(g, c, 'gold', 2, 1.1, 2.5, 0, 4);
    for (let y = 0; y < IN; y++)
      for (let x = 0; x < IN; x++) {
        const d = Math.hypot(x + 0.5 - 15, y + 0.5 - 14);
        if (d > 4 && d <= 4.9) put(g, x, y, cell('gold', x + y < 29 ? 4 : 1));
      }
    for (let y = 11; y <= 16; y++) put(g, 15, y, cell('gold', y === 11 ? 1 : 4));
  },

  // More experience: an open book, a star rising from its pages.
  xp(g) {
    for (let y = 12; y <= 20; y++)
      for (let x = 1; x <= 20; x++) {
        const sag = Math.round(Math.abs(x + 0.5 - 11) < 3 ? 1 : 0);
        const top = 12 + sag - Math.round(Math.abs(x + 0.5 - 11) / 6);
        const bottom = 19 + sag - Math.round(Math.abs(x + 0.5 - 11) / 7);
        if (y < top || y > bottom + 1) continue;
        if (y > bottom) put(g, x, y, cell('blue', x < 11 ? 3 : 4));
        else if (x === 10 || x === 11) put(g, x, y, cell('parchment', 4));
        else {
          const left = x < 10;
          const t = left
            ? y % 2 && x > 2 && x < 9 && y > top
              ? 2
              : 1
            : y % 2 && x > 12 && x < 19 && y > top
              ? 3
              : 2;
          put(g, x, y, cell('parchment', t));
        }
      }
    // The star: five points, gold, lit on its upper left.
    const star = (x: number, y: number) => {
      const px = x + 0.5 - 11;
      const py = y + 0.5 - 6;
      const a = Math.atan2(py, px) + Math.PI / 2;
      const r = Math.hypot(px, py);
      const k = Math.abs(((((a / ((Math.PI * 2) / 5)) % 1) + 1) % 1) - 0.5) * 2;
      return r <= 2.6 + 3.6 * (1 - k) ** 1.6;
    };
    fill(g, star, 'gold', 2, 1.1, 1.6, 0, 4);
    put(g, 11, 6, cell('gold', 0));
    put(g, 4, 9, cell('gold', 1));
    put(g, 18, 8, cell('gold', 1));
  },

  // The tide: rising water, foam on its crests, an arrow up over it.
  tide(g) {
    const crest = (x: number, phase: number, base: number, amp: number) =>
      base - amp * Math.sin(((x + phase) / 11) * Math.PI * 2);
    for (let y = 0; y < IN; y++)
      for (let x = 0; x < IN; x++) {
        const top = crest(x, 0, 11.5, 1.8);
        if (y < Math.round(top)) continue;
        const band2 = Math.round(crest(x, 5, 16, 1.4));
        const depth = y - top;
        let t = depth < 1 ? 0 : depth < 2.2 ? 1 : depth < 5 ? 2 : depth < 8 ? 3 : 4;
        if (y === band2) t = 1;
        else if (y === band2 + 1) t = Math.max(t, 3);
        if (y === Math.round(crest(x, 2, 20, 1))) t = 2;
        put(g, x, y, cell('sea', t));
      }
    // The arrow: a white chevron and shaft rising out of the water.
    for (let j = 0; j < 5; j++)
      for (let i = -j; i <= j; i++) put(g, 11 + i, 1 + j, cell('sea', i < 0 ? 0 : 1));
    for (let y = 6; y <= 10; y++) {
      put(g, 10, y, cell('sea', 0));
      put(g, 11, y, cell('sea', 0));
      put(g, 12, y, cell('sea', 1));
    }
  },

  // No food: a joint of meat on its bone, forbidden.
  hungry(g) {
    inset(g, (s) => {
      // The meat low on the left, the bone rising up to the right to its knuckle.
      for (let i = 0; i < 6; i++) {
        put(s, 8 + i, 7 - i, cell('cream', 1));
        put(s, 9 + i, 7 - i, cell('cream', 2));
        put(s, 9 + i, 8 - i, cell('cream', 3));
      }
      rows(s, 12, 0, ['.ab.', 'abbc', '.bcc', 'abc.', 'bc..'], {
        a: ['cream', 0],
        b: ['cream', 1],
        c: ['cream', 3],
      });
      fill(
        s,
        (x, y) => (x + 0.5 - 6) ** 2 / 30 + (y + 0.5 - 10) ** 2 / 20 <= 1,
        'tan',
        2,
        1.4,
        2.5,
        0,
        4,
      );
      for (const [x, y] of [
        [3, 8],
        [4, 7],
        [6, 7],
      ] as const)
        put(s, x, y, cell('tan', 0));
      put(s, 5, 12, cell('tan', 4));
      put(s, 8, 11, cell('tan', 4));
    });
    forbid(g);
  },

  // Darker: a crescent moon, a cloud across its foot, two stars.
  dark(g) {
    const moon: Inside = (x, y) => disc(10, 11, 8.6)(x, y) && !disc(14.2, 8.2, 7.2)(x, y);
    fill(g, moon, 'lamp', 1, 1.2, 2.4, 0, 4);
    fill(
      g,
      (x, y) =>
        disc(8, 18, 3.4)(x, y) ||
        disc(12.5, 17, 3.8)(x, y) ||
        disc(16.5, 18.6, 2.8)(x, y) ||
        (y >= 18 && y <= 20 && x >= 5 && x <= 18),
      'midnight',
      3,
      1,
      2,
      1,
      5,
    );
    sparkle(g, 17, 3, 2, 'lamp');
    put(g, 20, 9, cell('lamp', 1));
  },

  // A modifier not drawn yet: a die, the day's throw.
  modifier(g) {
    const top = poly([
      [11, 1],
      [21, 6],
      [11, 11],
      [1, 6],
    ]);
    const left = poly([
      [1, 6],
      [11, 11],
      [11, 21.5],
      [1, 16],
    ]);
    const right = poly([
      [11, 11],
      [21, 6],
      [21, 16],
      [11, 21.5],
    ]);
    for (let y = 0; y < IN; y++)
      for (let x = 0; x < IN; x++) {
        if (top(x, y)) put(g, x, y, cell('cream', 0));
        else if (left(x, y)) put(g, x, y, cell('cream', 2));
        else if (right(x, y)) put(g, x, y, cell('cream', 3));
      }
    for (let x = 1; x <= 10; x++) put(g, x, Math.round(6 + (x - 1) / 2), cell('cream', 1));
    for (let x = 11; x <= 20; x++) put(g, x, Math.round(11 - (x - 11) / 2), cell('cream', 4));
    for (let y = 11; y <= 20; y++) put(g, 11, y, cell('cream', 4));
    const pip = (x: number, y: number) => {
      put(g, x, y, cell('crimson', 3));
      put(g, x + 1, y, cell('crimson', 4));
    };
    pip(10, 5);
    pip(4, 10);
    pip(7, 15);
    pip(14, 11);
    pip(16, 13);
    pip(18, 15);
  },

  // Beat the clock: an hourglass, its sand running.
  time(g) {
    for (const y of [0, 1, 20, 21])
      for (let x = 3; x <= 18; x++)
        put(g, x, y, cell('wood', y === 0 || y === 20 ? (x < 6 ? 1 : 2) : 4));
    for (let y = 2; y <= 19; y++) {
      put(g, 4, y, cell('wood', 2));
      put(g, 17, y, cell('wood', 4));
    }
    const half = (y: number) => {
      const t = Math.abs(y + 0.5 - 11) / 9;
      return 1 + 5.2 * Math.pow(t, 0.8);
    };
    for (let y = 2; y <= 19; y++) {
      const h = half(y);
      for (let x = 5; x <= 16; x++) {
        const dx = x + 0.5 - 11;
        if (Math.abs(dx) > h) continue;
        const edge = Math.abs(dx) > h - 1;
        const sand =
          (y >= 14 && Math.abs(dx) <= (y - 13) * 1.1) ||
          (y >= 6 && y <= 9 && y >= 6 + (9 - y) * 0 && Math.abs(dx) <= h - 1 && y >= 7) ||
          (y >= 10 && y <= 13 && Math.abs(dx) < 0.6);
        if (sand) put(g, x, y, cell('gold', dx < -0.5 ? 1 : dx > 1 ? 3 : 2));
        else put(g, x, y, cell('glass', edge ? (dx < 0 ? 1 : 3) : 0));
      }
    }
    put(g, 7, 4, cell('glass', 0));
    put(g, 7, 15, cell('glass', 0));
  },

  // Untouched: a heart whole and bright, sparkling.
  untouched(g) {
    fill(g, heart(1, 2, 0.84), 'crimson', 1.6, 1.4, 3, 0, 4);
    put(g, 6, 7, cell('crimson', 0));
    put(g, 5, 8, cell('crimson', 0));
    put(g, 6, 8, cell('crimson', 0));
    sparkle(g, 18, 3, 3, 'gold');
    sparkle(g, 2, 3, 1, 'gold');
  },

  // No bracing: the brace's shield, forbidden.
  nobrace(g) {
    inset(g, (s) => {
      const shield = poly([
        [2, 1],
        [14, 1],
        [14, 7],
        [8, 15.5],
        [2, 7],
      ]);
      fill(s, shield, 'plate', 1.4, 1.2, 2.2, 0, 4);
      for (let y = 1; y <= 13; y++) {
        put(s, 7, y, cell('gold', 1));
        put(s, 8, y, cell('gold', 3));
      }
    });
    forbid(g);
  },

  // No potions: a flask, forbidden.
  nopotion(g) {
    inset(g, (s) => {
      for (let y = 0; y <= 2; y++)
        for (let x = 6; x <= 9; x++)
          put(s, x, y, cell(y === 0 ? 'wood' : 'glass', x === 6 ? 1 : 2));
      for (let y = 3; y <= 5; y++)
        for (let x = 6; x <= 9; x++) put(s, x, y, cell('glass', x === 6 ? 0 : x === 9 ? 3 : 1));
      fill(s, disc(8, 10.5, 5.6), 'glass', 1, 0.8, 2, 0, 3);
      for (let y = 9; y < 16; y++)
        for (let x = 0; x < 16; x++)
          if (disc(8, 10.5, 4.8)(x, y) && y >= 9)
            put(s, x, y, cell('teal', y === 9 ? 0 : x < 6 ? 1 : 2));
      put(s, 5, 8, cell('glass', 0));
    });
    forbid(g);
  },

  // Bare-handed: a clenched fist.
  unarmed(g) {
    rows(
      g,
      3,
      2,
      [
        '..aab.aab.aab..',
        '.abbbcabbcabbc.',
        '.abbbcabbcabbcaa',
        'aabbbcabbcabbcabc',
        'abbbbcabbcabbcabc',
        'abcccccccccccbbbc',
        'abbbbbbbbbbbbcbbc',
        'abaaaaaaaaabbcbbc',
        'aabbbbbbbbbbccbc.',
        '.abbbbbbbbbbbcc..',
        '.abbbbbbbbbbbcc..',
        '..abbbbbbbbbccc..',
        '..dddddddddddd...',
        '..deeeeeeeeeef...',
        '..deeeeeeeeeef...',
        '..deeeeeeeeeef...',
        '..dddddddddddd...',
      ],
      {
        a: ['skin', 1],
        b: ['skin', 2],
        c: ['skin', 4],
        d: ['tan', 3],
        e: ['tan', 2],
        f: ['tan', 4],
      },
    );
  },

  // Step out of the blows: an arrow arching over a blow that lands where the hero was.
  dodge(g) {
    const burst: Inside = (x, y) => {
      const a = Math.atan2(y + 0.5 - 16, x + 0.5 - 11);
      const r = Math.hypot(x + 0.5 - 11, y + 0.5 - 16);
      return r <= 3.4 + 3 * (0.5 + 0.5 * Math.cos(a * 6)) ** 2;
    };
    fill(g, burst, 'crimson', 2, 1, 2, 0, 4);
    put(g, 11, 16, cell('fire', 1));
    for (let y = 0; y < IN; y++)
      for (let x = 0; x < IN; x++) {
        const px = x + 0.5 - 11;
        const py = y + 0.5 - 13;
        const r = Math.hypot(px, py);
        const a = Math.atan2(py, px);
        if (a > -Math.PI * 0.95 && a < -Math.PI * 0.14 && r >= 6.6 && r <= 9.6)
          put(g, x, y, cell('leaf', r < 7.6 ? 1 : r < 8.6 ? 2 : 3));
      }
    rows(g, 16, 7, ['aaaaaa', '.abbbb', '..abb.', '...b..'], { a: ['leaf', 1], b: ['leaf', 3] });
  },

  // Beat the boss: a skull wearing a crown.
  boss(g) {
    rows(
      g,
      2,
      0,
      [
        '..a...a...a...a...',
        '..aa.aaa.aaa.aa...',
        '..abaabbaabbaab...',
        '..abbbbbbbbbbbb...',
        '..cccccccccccccc..',
      ],
      { a: ['gold', 1], b: ['gold', 2], c: ['gold', 4] },
    );
    put(g, 8, 2, cell('crimson', 1));
    put(g, 12, 2, cell('crimson', 1));
    rows(
      g,
      2,
      5,
      [
        '...aaaaaaaaaaa....',
        '..aaabbbbbbbbbb...',
        '.aabbbbbbbbbbbbc..',
        '.abbbbbbbbbbbbbc..',
        '.abkkkkbbbkkkkbc..',
        '.abkkkkbbbkkkkbc..',
        '.abkkkkbbbkkkkbc..',
        '.aabkkbbbbbkkbcc..',
        '..abbbbbkbbbbbc...',
        '..acbbbkkkbbbcc...',
        '...accbbbbbccc....',
        '....ababababc.....',
        '....acacacacc.....',
        '.....cccccc.......',
      ],
      { a: ['cream', 0], b: ['cream', 1], c: ['cream', 3], k: ['shade', 1] },
    );
  },

  // Defeat every foe: two swords crossed.
  slayer(g) {
    for (const flip of [false, true]) {
      const X = (x: number) => (flip ? 21 - x : x);
      for (let i = 0; i <= 12; i++) {
        const x = 3 + i;
        const y = 15 - i;
        put(g, X(x), y, cell('iron', flip ? 2 : 1));
        put(g, X(x - 1), y, cell('iron', flip ? 3 : 0));
        put(g, X(x), y + 1, cell('iron', flip ? 4 : 3));
      }
      put(g, X(16), 2, cell('iron', 0));
      for (let k = -2; k <= 2; k++) put(g, X(4 + k), 16 + k, cell('gold', k < 0 ? 1 : 3));
      put(g, X(3), 18, cell('leather', 2));
      put(g, X(2), 19, cell('leather', 3));
      put(g, X(1), 20, cell('gold', 2));
      put(g, X(2), 20, cell('gold', 3));
    }
  },

  // A challenge not drawn yet: a target with an arrow in its heart.
  challenge(g) {
    for (let y = 0; y < IN; y++)
      for (let x = 0; x < IN; x++) {
        const d = Math.hypot(x + 0.5 - 10, y + 0.5 - 12);
        if (d > 9.6) continue;
        const ring = Math.floor(d / 2.4);
        const lit = x + y < 20;
        const red = ring % 2 === 0;
        put(g, x, y, cell(red ? 'crimson' : 'cream', red ? (lit ? 1 : 2) : lit ? 0 : 2));
      }
    for (let i = 0; i <= 8; i++) {
      put(g, 10 + i, 12 - i, cell('wood', 2));
      put(g, 11 + i, 12 - i, cell('wood', 4));
    }
    rows(g, 17, 0, ['..a.', '.aab', 'aab.', '.b..'], { a: ['cream', 0], b: ['cream', 3] });
  },
};

// ------------------------------------------------------------------- matching

const MODIFIER_WORDS: readonly (readonly [DungeonIconKind, RegExp])[] = [
  ['hungry', /hung|no_?food|nofood|famine|starv|no_?eat|ration/],
  ['dark', /dark|night|gloom|shadow|blind|dim|murk|fog|unlit/],
  // Before the tide: a slack tide is the sea at rest, its foes half asleep.
  ['slow', /slack|slow|sleep|drows|sluggish|lazy|calm|becalm/],
  ['tide', /tide|flood|wave|surge|brine/],
  ['coins', /coin|gold|purse|wealth|doubloon|money/],
  ['loot', /loot|bount|treasure|plunder|drop|chest|spoil|rich|picking/],
  ['xp', /xp|exp|learn|wisdom|insight|lesson|scholar|veteran|study/],
  ['frail', /frail|fragil|glass|brittle|weak|vulner|exposed/],
  ['might', /hero|might|keen|sharp|valou?r|bless|empower|champion|player/],
  ['tough', /tough|health|hardy|sturdy|armou?r|thick|stout|robust|hp|vigou?r|tank/],
  ['fierce', /fierce|damage|hit|hard|brutal|savage|feroc|vicious|deadly|strong|wrath|rage|angry/],
  ['swift', /swift|speed|fast|quick|haste|frenz|hurr|rapid|agile|nimble/],
];

const CHALLENGE_WORDS: readonly (readonly [DungeonIconKind, RegExp])[] = [
  [
    'untouched',
    /no_?damage|nodamage|untouch|unscath|unhurt|flawless|unharm|deathless|no_?hit|perfect|pristine|unbloodied/,
  ],
  ['nobrace', /brace|no_?block|no_?guard/],
  ['hungry', /no_?food|nofood|hung|no_?eat|fasting|starv|famine/],
  ['nopotion', /potion|sober|draught|tonic|no_?drink/],
  ['unarmed', /unarmed|fist|bare|no_?weapon|punch/],
  [
    'time',
    /time|under|swift|quick|speed|fast|clock|minute|\d+_?m(in)?\b|sec|hurr|rush|race|sprint|dash/,
  ],
  ['dodge', /dodge|evade|step|sidestep|duck|roll|nimble/],
  ['boss', /boss|captain|snapper|brinebeard|chief|king|queen/],
  ['slayer', /kill|slay|all_?foes|every|clean|purge|hunt|sweep|thorough|full_?clear|all/],
  ['tide', /tide|dry|flood|wave/],
  ['loot', /loot|treasure|chest|coin|gold|rich|plunder/],
];

const tokens = (id: string): string => id.toLowerCase().replace(/[\s-]+/g, '_');

/** The kind a modifier's id is drawn as ('modifier', the generic, if none fits). */
export function modifierKind(id: string): DungeonIconKind {
  const s = tokens(id);
  for (const [kind, re] of MODIFIER_WORDS) if (re.test(s)) return kind;
  return 'modifier';
}

/** The kind a challenge's id (`<dungeon>.<slug>`) is drawn as, by its slug ('challenge' if none fits). */
export function challengeKind(id: string): DungeonIconKind {
  const s = tokens(id);
  // Only the slug: the dungeon's own id may hold a word (the tide-pool cave's "tide").
  const slug = s.slice(s.lastIndexOf('.') + 1);
  for (const [kind, re] of CHALLENGE_WORDS) if (re.test(slug)) return kind;
  return 'challenge';
}

/**
 * The kind a modifier's effects call for, whatever its id: each effect's key
 * read for what it changes and for whom (`foeHealth` tough, `foeDamage`
 * fierce, `foeSpeed` swift, `heroDamage` might, `heroHealth` below 1 frail,
 * `loot`, `coins`, `xp`, `tide`, `food: false` hungry, `dark`), the one that
 * changes most winning. Takes an object of effects, or a list of them each
 * with a name (`kind`, `stat`, `id` or `type`) and an amount.
 */
export function modifierKindFor(effects: unknown): DungeonIconKind {
  const pairs: [string, unknown][] = [];
  if (Array.isArray(effects)) {
    for (const e of effects) {
      if (typeof e === 'string') pairs.push([e, true]);
      else if (e && typeof e === 'object') {
        const o = e as Record<string, unknown>;
        const name = [o.kind, o.stat, o.id, o.type, o.effect].find((v) => typeof v === 'string');
        const amount = [o.by, o.value, o.mult, o.amount, o.factor].find(
          (v) => typeof v === 'number' || typeof v === 'boolean',
        );
        if (typeof name === 'string') pairs.push([name, amount ?? true]);
        else pairs.push(...Object.entries(o));
      }
    }
  } else if (effects && typeof effects === 'object') pairs.push(...Object.entries(effects));
  let best: DungeonIconKind = 'modifier';
  let bestScore = 0;
  for (const [key, v] of pairs) {
    const k = tokens(key.replace(/([a-z])([A-Z])/g, '$1_$2'));
    const hero = /hero|player|you|self/.test(k);
    const foe = /foe|enem|monster|beast|mob|opponent/.test(k);
    const num = typeof v === 'number' ? v : null;
    // How much it changes: a multiplier's distance from 1, a count's from 0, a flag's 1.
    const score =
      num === null
        ? v === false || v === true
          ? 1
          : 0
        : Math.abs(num) > 0 && Math.abs(num) <= 4 && !/count|add|plus|bonus|extra/.test(k)
          ? Math.abs(Math.log(Math.abs(num)))
          : Math.min(2, Math.abs(num) / 10);
    let kind: DungeonIconKind | null = null;
    if (/food|eat|heal_?item|ration/.test(k))
      kind = v === false || num === 0 || /no/.test(k) ? 'hungry' : null;
    else if (/dark|light|vision|lantern|gloom|sight/.test(k)) kind = 'dark';
    else if (/tide|water|flood/.test(k)) kind = 'tide';
    else if (/coin|gold|money/.test(k)) kind = 'coins';
    else if (/loot|drop|treasure/.test(k)) kind = 'loot';
    else if (/xp|exp|experience/.test(k)) kind = 'xp';
    else if (/brace|block|guard/.test(k)) kind = null;
    else if (hero && /health|hp|life|armou?r|defen/.test(k))
      kind = num !== null && num < 1 ? 'frail' : 'tough';
    else if (hero && /damage|hit|attack|strength|power|might/.test(k)) kind = 'might';
    else if (/taken|incoming|frail|fragile/.test(k)) kind = 'frail';
    else if (/speed|haste|tempo|rate/.test(k)) kind = num !== null && num < 1 ? 'slow' : 'swift';
    else if (/interval|cooldown|delay|attack_?ms/.test(k))
      kind = num !== null && num > 1 ? 'slow' : 'swift';
    else if (/health|hp|life|tough|armou?r|defen/.test(k)) kind = 'tough';
    else if (/damage|hit|attack|strength|power|fierce/.test(k))
      kind = foe || !hero ? 'fierce' : 'might';
    if (kind && score > bestScore) {
      best = kind;
      bestScore = score;
    }
  }
  return best;
}

// --------------------------------------------------------------------- doors

const pics = new Map<string, Picture2>();

/** A kind's icon as a picture: 24 x 24 with its outline, in the town's cells. */
export function dungeonIconPicture(kind: DungeonIconKind): Picture2 {
  let p = pics.get(kind);
  if (!p) {
    const g = tgrid(IN, IN);
    DRAW[kind](g);
    p = { grid: outlined(g), glows: [] };
    pics.set(kind, p);
  }
  return p;
}

const ratio = (): number =>
  typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;

function iconElement(pic: Picture2): HTMLCanvasElement {
  const dpr = ratio();
  const canvas = pixelCanvas2(pic, DAY2, iconScale(dpr), dpr);
  canvas.classList.add('icon');
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

/** A modifier's icon as a picture, by its id (generic for an id with no fitting word). */
export function modifierIconPicture(id: string): Picture2 {
  return dungeonIconPicture(modifierKind(id));
}

/** A challenge's icon as a picture, by its id (generic for an id with no fitting word). */
export function challengeIconPicture(id: string): Picture2 {
  return dungeonIconPicture(challengeKind(id));
}

/**
 * A daily modifier's icon, 24 x 24 art pixels at the item icons' scale
 * (`iconScale`), as `itemIcon` gives (class `icon`, hidden from readers: its
 * name goes beside it). Chosen by the words in its id; never null.
 */
export function modifierIcon(id: string): HTMLCanvasElement {
  return iconElement(modifierIconPicture(id));
}

/** A challenge's icon (`<dungeon>.<slug>`), as `modifierIcon`; never null. */
export function challengeIcon(id: string): HTMLCanvasElement {
  return iconElement(challengeIconPicture(id));
}

/**
 * A modifier's icon from its effects (see `modifierKindFor`), so the picture
 * follows the data for an id never seen here. Prefer it to `modifierIcon`
 * when the effects are to hand.
 */
export function modifierIconFor(effects: unknown): HTMLCanvasElement {
  return iconElement(dungeonIconPicture(modifierKindFor(effects)));
}

/** The same as a picture. */
export function modifierIconForPicture(effects: unknown): Picture2 {
  return dungeonIconPicture(modifierKindFor(effects));
}

// -------------------------------------------------------------------- medals

export const CHALLENGE_MEDAL_STATES = ['todo', 'done', 'new'] as const;
export type ChallengeMedalState = (typeof CHALLENGE_MEDAL_STATES)[number];

/**
 * Frames of the `new` medal's sparkle and how long to show each: play them
 * once (0 to 5) when a challenge is first met; from the last frame on it is
 * the `done` medal exactly, so a frame past the end may be shown for ever.
 */
export const CHALLENGE_MEDAL_FRAMES = 6;
export const CHALLENGE_MEDAL_FRAME_MS = 90;

/** The medal's disc and ribbon, on the icon's 22 x 22. */
function medal(g: TGrid, won: boolean): void {
  // The ribbon: two tails in a V from the top corners down behind the disc.
  const ribbon: Mat = won ? 'crimson' : 'cloth';
  for (let y = 0; y <= 11; y++) {
    for (let i = 0; i < 5; i++) {
      put(g, 3 + i + Math.floor(y * 0.25), y, cell(ribbon, i === 0 ? 1 : i === 4 ? 4 : 2));
      put(g, 14 + i - Math.floor(y * 0.25), y, cell(ribbon, i === 0 ? 2 : i === 4 ? 5 : 3));
    }
  }
  for (let i = 0; i < 5; i++) {
    put(g, 6 + i + 3, 1, cell(won ? 'blue' : 'cloth', i < 2 ? 2 : 3));
  }
  const c = disc(11, 14, 7.6);
  const metal: Mat = won ? 'gold' : 'iron';
  fill(g, c, metal, won ? 2 : 2, 1.2, 2.6, won ? 0 : 1, 4);
  // The rim: a raised ring a step apart, and inside, a star (won) or a hollow (not yet).
  for (let y = 0; y < IN; y++)
    for (let x = 0; x < IN; x++) {
      const d = Math.hypot(x + 0.5 - 11, y + 0.5 - 14);
      if (d > 5 && d <= 5.9) put(g, x, y, cell(metal, x + y < 25 ? (won ? 4 : 5) : won ? 1 : 2));
    }
  if (won) {
    const star = (x: number, y: number) => {
      const px = x + 0.5 - 11;
      const py = y + 0.5 - 14;
      const a = Math.atan2(py, px) + Math.PI / 2;
      const r = Math.hypot(px, py);
      const k = Math.abs(((((a / ((Math.PI * 2) / 5)) % 1) + 1) % 1) - 0.5) * 2;
      return r <= 1.8 + 2.6 * (1 - k) ** 1.6;
    };
    for (let y = 0; y < IN; y++)
      for (let x = 0; x < IN; x++) if (star(x, y)) put(g, x, y, cell('gold', x + y < 24 ? 0 : 2));
  } else {
    for (let y = 0; y < IN; y++)
      for (let x = 0; x < IN; x++) if (disc(11, 14, 4.4)(x, y)) put(g, x, y, cell('iron', 3));
  }
}

/**
 * A challenge's medal on the icon's 24 x 24: `todo` a dull iron disc on a
 * grey ribbon, its face hollow; `done` a gold disc with a star on a red
 * ribbon; `new` the gold medal with a sparkle crossing it (`frame` 0 to 5,
 * then `done`).
 */
export function challengeMedalPicture(state: ChallengeMedalState, frame = 0): Picture2 {
  const f = Math.max(0, Math.min(CHALLENGE_MEDAL_FRAMES - 1, Math.floor(frame) || 0));
  if (state === 'new' && f === CHALLENGE_MEDAL_FRAMES - 1) return challengeMedalPicture('done');
  const key = `medal ${state} ${state === 'new' ? f : 0}`;
  let p = pics.get(key);
  if (!p) {
    const g = tgrid(IN, IN);
    medal(g, state !== 'todo');
    if (state === 'new') {
      // A glint sweeping down across the disc, and a sparkle blooming then fading at its edge.
      const sweep = -4 + f * 3.4;
      for (let y = 0; y < IN; y++)
        for (let x = 0; x < IN; x++) {
          if (!disc(11, 14, 7.6)(x, y)) continue;
          const k = x - 11 + (y - 14) - sweep;
          if (Math.abs(k) < 1) put(g, x, y, cell('gold', 0));
        }
      const r = [1, 3, 4, 3, 1][f]!;
      sparkle(g, 17, 9, r, 'gold');
      if (f >= 2 && f <= 3) sparkle(g, 4, 18, 1, 'gold');
    }
    p = { grid: outlined(g), glows: [] };
    pics.set(key, p);
  }
  return p;
}

/** A challenge's medal as an element like `challengeIcon`'s. */
export function challengeMedal(state: ChallengeMedalState, frame = 0): HTMLCanvasElement {
  return iconElement(challengeMedalPicture(state, frame));
}

// --------------------------------------------------------------------- seals

export const DUNGEON_SEAL_TIERS = ['cleared', 'all-challenges'] as const;
export type DungeonSealTier = (typeof DUNGEON_SEAL_TIERS)[number];

const seals = new Map<string, ChartPiece2>();

/**
 * A dungeon's seal for the chart and the results card: its chart emblem
 * (`chartEmblem2`) on chart paper in a round frame. `cleared`, a bronze rim;
 * `all-challenges`, a gold rim set with a laurel, a star over it and red
 * ribbon tails under it. An id with no emblem gets a compass star in the
 * frame. The anchor is the disc's middle (lay it beside a landing's marker,
 * or centred on a card). Day only, like the chart: rasterize with `DAY2`.
 */
export function dungeonSeal(id: string, tier: DungeonSealTier = 'cleared'): ChartPiece2 {
  const key = `${id} ${tier}`;
  let s = seals.get(key);
  if (s) return s;
  const gold = tier === 'all-challenges';
  const R = 13.5;
  const W = 31;
  const H = gold ? 38 : 31;
  const g = tgrid(W, H);
  const cx = 15.5;
  const cy = gold ? 17.5 : 15.5;
  // The ribbon tails, behind the disc.
  if (gold)
    for (const side of [-1, 1])
      for (let j = 0; j < 12; j++)
        for (let i = 0; i < 5; i++) {
          const x = Math.round(
            cx + side * (3 + j * 0.45) + (side < 0 ? -i : i) - (side < 0 ? 0 : 1),
          );
          const y = Math.round(cy + 7 + j);
          if (j === 11 && i % 2 === (side < 0 ? 0 : 1)) continue;
          put(g, x, y, cell('crimson', i === 0 ? 1 : i === 4 ? 4 : side < 0 ? 2 : 3));
        }
  const rim: Mat = gold ? 'gold' : 'bronze';
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > R) continue;
      const lit = (cx - x - 0.5 + (cy - y - 0.5)) / (R * 1.4);
      if (d > R - 3) {
        const inner = d <= R - 2;
        put(g, x, y, cell(rim, inner ? (lit > 0 ? 4 : 2) : lit > 0.25 ? 0 : lit > -0.25 ? 1 : 3));
      } else put(g, x, y, cell('parchment', lit > 0.3 ? 1 : lit < -0.4 ? 3 : 2));
    }
  if (gold) {
    // The laurel: leaves in pairs climbing each side of the rim.
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.62 + k * 0.105);
      for (const side of [-1, 1]) {
        const x = cx + side * Math.cos(a) * (R - 1.5) * -1;
        const y = cy + Math.sin(a) * (R - 1.5);
        put(g, x, y, cell('leaf', 2));
        put(g, x + side, y - 1, cell('leaf', 3));
      }
    }
    sparkle(g, Math.floor(cx), 1, 1, 'gold');
  }
  const emblem = chartEmblem2(id);
  if (emblem) {
    const e = emblem.picture.grid;
    stamp(g, e, Math.round(cx - e.w / 2), Math.round(cy - e.h / 2));
  } else {
    // A compass star: four long points and four short, ink on the paper.
    for (let k = -6; k <= 6; k++) {
      const t = Math.abs(k) > 3 ? 4 : 5;
      put(g, cx + k - 0.5, cy - 0.5, cell('ink', t));
      put(g, cx - 0.5, cy + k - 0.5, cell('ink', t));
    }
    for (let k = -3; k <= 3; k++) {
      put(g, cx + k - 0.5, cy + k - 0.5, cell('ink', 3));
      put(g, cx + k - 0.5, cy - k - 0.5, cell('ink', 3));
    }
    put(g, cx - 0.5, cy - 0.5, cell('crimson', 2));
  }
  const o = outlined(g);
  s = { picture: { grid: o, glows: [] }, anchor: { x: Math.round(cx) + 1, y: Math.round(cy) + 1 } };
  seals.set(key, s);
  return s;
}
