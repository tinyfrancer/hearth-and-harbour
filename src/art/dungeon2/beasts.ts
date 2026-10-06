/**
 * The creatures at the C scale: the grotto's rat, crabs and parrot, and the
 * idle game's gull, boar, wolf, troll and wyrm. Each is drawn whole on a
 * canvas of its own, facing right, built from masses shaded as solids (fur
 * in strokes, shell in plates, scale in rows), lit from the upper left, and
 * outlined in each material's darkest step. Every mass moves with a bone, so
 * a creature walks, rears, strikes and recoils by moving its parts, and
 * nothing is rotated: lit edges stay whole.
 *
 * Size carries threat: the rat and the small crab well below the knee, the
 * gull and the parrot small, the boar and the wolf at the hip, the giant crab
 * as wide as a rowing boat, the troll a head over the hero, the wyrm long.
 */
import { darker, hash, put, tgrid, type Cell, type TGrid } from '../town2/cells';
import { cell } from './cave';
import type { Mat2 as Mat } from './cave';
import { outlineIn } from '../figure2/engine';
import { litBy, lim, paint, rod, sprite } from './kit';

/** How far each bone moves in a frame, and a few frame-wide flags. */
export interface BeastPose {
  readonly at?: Readonly<Record<string, readonly [number, number]>>;
  /** Mouth or beak open. */
  readonly open?: boolean;
  /** Wings: 'up', 'mid', 'down' or folded (undefined). */
  readonly wings?: 'up' | 'mid' | 'down';
  /** Down and out: eyes shut. */
  readonly down?: boolean;
}

export interface Beast {
  readonly w: number;
  readonly h: number;
  /** Where it stands: the middle of its feet on the ground row, from the top-left. */
  readonly anchor: { readonly x: number; readonly y: number };
  readonly draw: (g: TGrid, o: (bone: string) => readonly [number, number], p: BeastPose) => void;
}

/** A mass shaded as a solid: an ellipse domed and lit from the upper left, with fur strokes, plates or scales. */
export function mass(
  g: TGrid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  mat: Mat,
  o: {
    base?: number;
    k?: number;
    lo?: number;
    hi?: number;
    tex?: 'fur' | 'shell' | 'scale' | 'feather';
    k2?: number;
    /** Cut the mass off below this row (a belly on the ground, a neck into a body). */
    below?: number;
  } = {},
): void {
  const base = o.base ?? 3;
  const k = o.k ?? 2;
  paint(
    g,
    Math.floor(cx - rx - 1),
    Math.floor(cy - ry - 1),
    Math.ceil(rx * 2) + 3,
    Math.ceil(ry * 2) + 3,
    (x, y) => {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d > 1 || (o.below !== undefined && y > o.below)) return 0;
      let t = base - (litBy(nx * 0.92, ny * 0.92) - 0.3) * k * 1.6;
      const s = o.k2 ?? 0;
      if (o.tex === 'fur') {
        // Strokes lying back along the body, the light catching their tips.
        const stroke = hash(Math.floor((x + y * 0.5 + s) / 2), y, 7 + s);
        if (stroke < 0.18) t += 1;
        else if (stroke > 0.9 && t < base) t -= 1;
      } else if (o.tex === 'shell') {
        // Bumps and pits across a shell.
        const b = hash(Math.floor(x / 3), Math.floor(y / 3), 11 + s);
        if (b < 0.15 && (x + y) % 3 === 0) t += 1;
        if (b > 0.88 && (x + y) % 3 === 1) t -= 1;
      } else if (o.tex === 'scale') {
        // Rows of scales, each lit on its upper edge.
        const row = (y + Math.floor(x / 3)) % 3;
        if (row === 0) t -= 0.6;
        if (row === 2) t += 0.6;
      } else if (o.tex === 'feather') {
        const row = (y + Math.floor(x / 4)) % 3;
        if (row === 2) t += 0.7;
      }
      return cell(mat, lim(t, o.lo ?? 1, o.hi ?? 5));
    },
  );
}

/** Darkens what is already drawn in an ellipse (a cast shadow, a belly's underside). */
export function shade(g: TGrid, cx: number, cy: number, rx: number, ry: number, n = 1): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if ((x + 0.5 - cx) ** 2 / rx ** 2 + (y + 0.5 - cy) ** 2 / ry ** 2 > 1) continue;
      if (x < 0 || y < 0 || x >= g.w || y >= g.h) continue;
      const c = g.d[y * g.w + x]!;
      if (c) g.d[y * g.w + x] = darker(c, n);
    }
}

/** An eye: a dark bead with a glint, or a ringed eye (a bird's, a wolf's). */
export function eye(g: TGrid, x: number, y: number, kind: 'bead' | 'ring' | 'gold' = 'bead'): void {
  if (kind === 'bead') {
    put(g, x, y, cell('eye', 4));
    put(g, x + 1, y, cell('eye', 4));
    put(g, x, y + 1, cell('eye', 4));
    put(g, x + 1, y + 1, cell('eye', 4));
    put(g, x, y, cell('eye', 0));
  } else {
    const iris: Cell = kind === 'gold' ? cell('gold', 2) : cell('cream', 1);
    put(g, x, y, iris);
    put(g, x + 1, y, cell('eye', 4));
    put(g, x, y + 1, cell('eye', 4));
    put(g, x + 1, y + 1, kind === 'gold' ? cell('gold', 3) : cell('cream', 2));
  }
}

/** A leg as a rod from hip to foot, with a foot or paw at the bottom. */
function leg(
  g: TGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  mat: Mat,
  steps: readonly number[],
  paw?: Mat,
): void {
  rod(g, x0, y0, x1, y1, w, mat, steps);
  if (paw) paint(g, x1 - 1, y1, w + 2, 2, (_x, y) => cell(paw, y === y1 ? 2 : 4));
}

/* --------------------------------------------------------------- the dock rat */

const RAT: Beast = {
  w: 48,
  h: 24,
  anchor: { x: 24, y: 23 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const [fx, fy] = o('front');
    const [kx, ky] = o('hind');
    // The tail: a long bare sweep behind, pink going grey.
    for (let i = 0; i <= 26; i++) {
      const t = i / 26;
      const x = 12 + bx - t * 12;
      const y = 15 + by + Math.sin(t * Math.PI * 0.9) * 4 + t * 2;
      put(g, Math.round(x), Math.round(y), cell('shell', t < 0.3 ? 4 : 3));
      if (t < 0.5) put(g, Math.round(x), Math.round(y) + 1, cell('shell', 5));
    }
    // Far legs, dark, behind.
    leg(g, 30 + fx, 16 + by, 31 + fx, 20 + fy, 2, 'fur', [4, 5], 'shell');
    leg(g, 15 + kx, 16 + by, 13 + kx, 20 + ky, 2, 'fur', [4, 5], 'shell');
    // The body: a haunch and a back, fur in strokes, a pale belly.
    mass(g, 14 + bx, 13 + by, 8, 7, 'fur', { base: 3, tex: 'fur', below: 19 + by });
    mass(g, 22 + bx, 12 + by, 11, 7, 'fur', { base: 3, tex: 'fur', below: 19 + by });
    shade(g, 22 + bx, 18 + by, 10, 2, 1);
    // Near legs.
    leg(g, 14 + kx, 16 + by, 17 + kx, 21 + ky, 3, 'fur', [3, 4, 5], 'shell');
    leg(g, 29 + fx, 15 + by, 32 + fx, 21 + fy, 2, 'fur', [3, 4], 'shell');
    // The head: a wedge to a pointed snout, a round ear, a bead eye, a pink nose, teeth.
    mass(g, 33 + hx, 12 + hy, 6.5, 5, 'fur', { base: 2.8, tex: 'fur', k2: 3 });
    mass(g, 39 + hx, 13 + hy, 4.5, 3, 'fur', { base: 2.6, k2: 4 });
    put(g, 44 + hx, 13 + hy, cell('shell', 3));
    put(g, 44 + hx, 12 + hy, cell('shell', 2));
    paint(g, 29 + hx, 4 + hy, 6, 6, (x, y) => {
      const d = Math.hypot(x + 0.5 - (32 + hx), y + 0.5 - (7 + hy));
      return d > 2.9 ? 0 : cell(d < 1.6 ? 'shell' : 'fur', d < 1.6 ? 3 : y < 6 + hy ? 2 : 3);
    });
    eye(g, 36 + hx, 10 + hy);
    if (p.open) {
      put(g, 40 + hx, 15 + hy, cell('shade', 3));
      put(g, 41 + hx, 15 + hy, cell('shade', 3));
      put(g, 42 + hx, 16 + hy, cell('cream', 1));
      put(g, 41 + hx, 16 + hy, cell('cream', 1));
    } else {
      put(g, 42 + hx, 16 + hy, cell('cream', 1));
    }
    // Whiskers.
    put(g, 43 + hx, 11 + hy, cell('cream', 3));
    put(g, 45 + hx, 10 + hy, cell('cream', 3));
    put(g, 45 + hx, 14 + hy, cell('cream', 3));
  },
};

/* --------------------------------------------------------------- the sand crab */

function crabBody(
  g: TGrid,
  o: (bone: string) => readonly [number, number],
  p: BeastPose,
  s: number,
  cx: number,
  ground: number,
  barnacles: boolean,
): void {
  const [bx, by] = o('body');
  const [lx, ly] = o('legs');
  const [ax, ay] = o('claws');
  const R = 12 * s;
  const cy = ground - 9 * s + by;
  // Legs: three a side, jointed, spindly, out and down to points on the ground.
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const lift = (i + (side > 0 ? 1 : 0)) % 2 === 0 ? ly : -ly;
      const hip = cx + bx + side * (R * 0.55 + i * 2 * s);
      const knee = cx + bx + side * (R * 0.9 + i * 3.2 * s) + lx * side;
      const tipX = cx + bx + side * (R * 1.0 + i * 4.4 * s) + lx * side;
      const tipY = ground - Math.max(0, lift);
      const far = i === 0;
      rod(
        g,
        hip,
        cy + 2 * s,
        knee,
        cy - 2 * s - i * s,
        Math.max(2, Math.round(2 * s)),
        'crab',
        far ? [3, 4] : [2, 4],
      );
      rod(
        g,
        knee,
        cy - 2 * s - i * s,
        tipX,
        tipY,
        Math.max(1, Math.round(1.6 * s)),
        'crab',
        far ? [4, 5] : [3, 4],
      );
    }
  // The shell: a wide dome, bumpy, its rim lit, a pale belly under it.
  mass(g, cx + bx, cy + 2 * s, R * 0.95, 4 * s, 'cream', { base: 3, k: 1.2 });
  mass(g, cx + bx, cy, R, 7 * s, 'crab', {
    base: 2.8,
    tex: 'shell',
    k: 2.2,
    k2: Math.round(s * 7),
  });
  if (barnacles) {
    for (let i = 0; i < 9; i++) {
      const x = Math.round(cx + bx - R * 0.7 + hash(i, 1, 33) * R * 1.4);
      const y = Math.round(cy - 5 * s + hash(i, 2, 33) * 6 * s);
      put(g, x, y, cell('cavesand', 1));
      put(g, x + 1, y, cell('cavesand', 2));
      put(g, x, y + 1, cell('cavesand', 4));
    }
    // Weed hanging off the shell's back edge.
    for (let i = 0; i < 6; i++) {
      const x = Math.round(cx + bx - R * 0.85 + i * 2);
      for (let j = 0; j < 2 + (i % 3); j++)
        put(g, x, Math.round(cy + 3 * s) + j, cell('weed', 3 + (j % 2)));
    }
  }
  // Eyes on stalks.
  for (const side of [-1, 1]) {
    const x = Math.round(cx + bx + side * 3 * s);
    const top = Math.round(cy - 7 * s - 4 * s);
    for (let y = top + 2; y < Math.round(cy - 5 * s); y++) put(g, x, y, cell('crab', 3));
    eye(g, x, top);
  }
  // A mouth that works.
  if (p.open)
    paint(g, Math.round(cx + bx - 2), Math.round(cy + 3 * s), 4, 2, () => cell('shade', 3));
  // The claws: arms up from the shell's front corners, pincers raised, the near one bigger.
  for (const side of [-1, 1]) {
    const big = side > 0 ? 1.25 : 1;
    const ex = cx + bx + side * (R + 2 * s) + ax * (side > 0 ? 1 : 0.5);
    const ey = cy - 6 * s + ay;
    rod(
      g,
      cx + bx + side * R * 0.7,
      cy - 1 * s,
      ex,
      ey + 3 * s,
      Math.max(2, Math.round(2.4 * s)),
      'crab',
      [2, 3, 4],
    );
    mass(g, ex, ey, 3.4 * s * big, 4.4 * s * big, 'crab', { base: 2.4, k: 2.4 });
    // The pincer's two fingers, open a little, lit on top.
    const fx = ex + side * 1 * s;
    const fy = ey - 4.4 * s * big;
    rod(
      g,
      fx,
      fy + 1,
      fx + side * 2 * s,
      fy - 3 * s * big,
      Math.max(2, Math.round(2 * s)),
      'crab',
      [1, 3],
    );
    rod(
      g,
      fx - side * 2 * s,
      fy + 1,
      fx - side * 2.6 * s,
      fy - 2.2 * s * big,
      Math.max(2, Math.round(1.6 * s)),
      'crab',
      [2, 4],
    );
    put(g, Math.round(fx + side * 2 * s), Math.round(fy - 3 * s * big), cell('cream', 1));
  }
}

const SAND_CRAB: Beast = {
  w: 40,
  h: 26,
  anchor: { x: 20, y: 24 },
  draw: (g, o, p) => crabBody(g, o, p, 1, 20, 23, false),
};

const GIANT_CRAB: Beast = {
  w: 84,
  h: 52,
  anchor: { x: 42, y: 50 },
  draw: (g, o, p) => crabBody(g, o, p, 2.15, 42, 49, true),
};

/* ----------------------------------------------------------- the ship's parrot */

const PARROT: Beast = {
  w: 46,
  h: 40,
  anchor: { x: 22, y: 39 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const air = p.wings !== undefined;
    // The tail: long blue and red feathers down behind.
    rod(g, 19 + bx, 27 + by, 13 + bx, 37 + by - (air ? 4 : 0), 4, 'blue', [1, 2, 3, 4]);
    rod(g, 21 + bx, 27 + by, 17 + bx, 38 + by - (air ? 4 : 0), 2, 'crimson', [2, 4]);
    // Feet gripping, on the ground row while perched; tucked in flight.
    if (!air) {
      sprite(g, 20 + bx, 33 + by, ['a.a', 'aaa', 'bab'], { a: ['iron', 3], b: ['iron', 5] });
      sprite(g, 25 + bx, 33 + by, ['a.a', 'aaa', 'bab'], { a: ['iron', 2], b: ['iron', 4] });
    }
    // The far wing, open behind in flight.
    const wingRows = (far: boolean) => {
      const up = p.wings === 'up' ? -10 : p.wings === 'down' ? 6 : 0;
      const x0 = 22 + bx + (far ? 3 : -2);
      const y0 = 20 + by;
      for (let i = 0; i < 14; i++) {
        const t = i / 13;
        const x = x0 + (far ? 1 : -1) * t * 16;
        const y = y0 + up * t - t * 2;
        rod(g, x0, y0, x, y, 3, 'feather', far ? [3, 4, 5] : [1, 2, 3]);
        // The flight feathers, blue at the tips.
        if (t > 0.6)
          rod(g, x, y, x + (far ? 1 : -1), y + 6 - i * 0.2, 2, 'blue', far ? [3, 4] : [1, 3]);
      }
    };
    if (air) wingRows(true);
    // The body: red, upright, its breast lit.
    mass(g, 23 + bx, 22 + by, 6, 9, 'crimson', { base: 2.4, k: 2.2, tex: 'feather' });
    // The folded wing: green coverts, blue flights down the back.
    if (!air) {
      mass(g, 20 + bx, 23 + by, 4.5, 8, 'feather', { base: 2.8, k: 2, tex: 'feather', k2: 2 });
      rod(g, 18 + bx, 27 + by, 17 + bx, 32 + by, 3, 'blue', [2, 3, 4]);
    } else wingRows(false);
    // The head: round, red, a white face patch, a great hooked beak.
    mass(g, 26 + hx, 12 + hy, 5.5, 5, 'crimson', { base: 2.2, k: 2.2 });
    paint(g, 27 + hx, 10 + hy, 4, 4, (x, y) =>
      Math.hypot(x - 28.5 - hx, y - 11.5 - hy) < 2.2 ? cell('cream', 1) : 0,
    );
    eye(g, 28 + hx, 11 + hy, 'ring');
    sprite(
      g,
      30 + hx,
      10 + hy,
      p.open
        ? ['.aab.', 'aabbc', '.bbbc', '...cc', '.....', '.dd..', '..d..']
        : ['.aab.', 'aabbc', 'dbbbc', 'dd.cc', '.d..c'],
      { a: ['cream', 1], b: ['cream', 3], c: ['tar', 3], d: ['tar', 1] },
    );
  },
};

/* --------------------------------------------------------- the thieving gull */

const GULL: Beast = {
  w: 40,
  h: 32,
  anchor: { x: 20, y: 30 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    // Legs, yellow-pink, and webbed feet.
    rod(g, 18 + bx, 22 + by, 17, 29, 2, 'tan', [2, 3]);
    rod(g, 22 + bx, 22 + by, 23, 29, 2, 'tan', [1, 2]);
    sprite(g, 14, 29, ['aaaa..aaaa'], { a: ['tan', 3] });
    // The tail and the dark wingtips crossing behind.
    sprite(g, 4 + bx, 17 + by, ['aa.....', 'aaab...', '.aabbb.', '..cbbb.', '...c.c.'], {
      a: ['felt', 2],
      b: ['sail', 3],
      c: ['felt', 3],
    });
    // The body: white breast, grey back.
    mass(g, 19 + bx, 17 + by, 10, 7, 'sail', { base: 1.6, k: 1.6 });
    mass(g, 16 + bx, 15 + by, 8, 4.5, 'stone', { base: 2.2, k: 1.6, tex: 'feather' });
    // The head: white, a fierce yellow eye under a flat brow, the chip in its beak.
    mass(g, 27 + hx, 9 + hy, 5, 4.5, 'sail', { base: 1.4, k: 1.5 });
    eye(g, 28 + hx, 8 + hy, 'gold');
    put(g, 27 + hx, 7 + hy, cell('stone', 4));
    put(g, 28 + hx, 7 + hy, cell('stone', 4));
    put(g, 29 + hx, 7 + hy, cell('stone', 3));
    sprite(g, 31 + hx, 9 + hy, p.open ? ['aaab.', 'r....', 'aab..'] : ['aaaab', 'acr..'], {
      a: ['gold', 1],
      b: ['gold', 3],
      c: ['gold', 4],
      r: ['crimson', 2],
    });
    // The chip: a golden fried stick, stolen.
    if (!p.open)
      sprite(g, 33 + hx, 6 + hy, ['...a', '..ab', '.ab.', 'ab..'], {
        a: ['ochre', 1],
        b: ['ochre', 3],
      });
  },
};

/* --------------------------------------------------------------- the bramble boar */

const BOAR: Beast = {
  w: 66,
  h: 44,
  anchor: { x: 32, y: 42 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const [fx, fy] = o('front');
    const [kx, ky] = o('hind');
    // Far legs.
    leg(g, 44 + fx, 30 + by, 45 + fx, 39 + fy, 4, 'umber', [4, 5], 'tar');
    leg(g, 18 + kx, 30 + by, 16 + kx, 39 + ky, 5, 'umber', [4, 5], 'tar');
    // The body: a deep chest and a high back, bristles in strokes.
    mass(g, 30 + bx, 24 + by, 20, 11, 'umber', { base: 3, tex: 'fur', k: 2.2 });
    mass(g, 42 + bx, 23 + by, 11, 11, 'umber', { base: 3, tex: 'fur', k: 2.2, k2: 2 });
    // A ridge of bristles down the spine with brambles caught in it.
    for (let x = 14; x < 48; x++) {
      const top = Math.round(14 + by - Math.sin(((x - 14) / 34) * Math.PI) * 3);
      put(g, x + bx, top, cell('tar', x % 2 ? 2 : 3));
      if (x % 3 === 0) put(g, x + bx, top - 1, cell('tar', 3));
    }
    for (const [x, y] of [
      [20, 13],
      [31, 10],
      [41, 11],
    ] as const) {
      sprite(g, x + bx, y + by, ['.a.b', 'aaba', 'a.c.', '.a..'], {
        a: ['leaf', 3],
        b: ['leaf', 5],
        c: ['crimson', 2],
      });
    }
    shade(g, 31 + bx, 33 + by, 18, 3, 1);
    // Near legs.
    leg(g, 22 + kx, 30 + by, 21 + kx, 40 + ky, 5, 'umber', [3, 4, 5], 'tar');
    leg(g, 47 + fx, 30 + by, 49 + fx, 40 + fy, 4, 'umber', [2, 3, 4], 'tar');
    // The head: low and long, a disc of a snout, a small mean eye, tusks curling up.
    mass(g, 53 + hx, 24 + hy, 8, 7, 'umber', { base: 2.7, tex: 'fur', k2: 5 });
    mass(g, 60 + hx, 27 + hy, 4, 4, 'umber', { base: 2.5 });
    paint(g, 62 + hx, 24 + hy, 3, 6, (x, y) =>
      cell('shell', x === 62 + hx ? 3 : 4 + (y === 26 + hy ? 1 : 0)),
    );
    eye(g, 55 + hx, 21 + hy, 'gold');
    put(g, 54 + hx, 20 + hy, cell('tar', 2));
    put(g, 55 + hx, 20 + hy, cell('tar', 2));
    put(g, 56 + hx, 19 + hy, cell('tar', 2));
    // An ear back, pointed.
    sprite(g, 48 + hx, 15 + hy, ['..a', '.ab', 'abb', 'bbc'], {
      a: ['umber', 2],
      b: ['umber', 3],
      c: ['umber', 5],
    });
    sprite(
      g,
      58 + hx,
      26 + hy,
      p.open ? ['a...', 'ab..', '.a..', '....', 'c...'] : ['a...', 'ab..', '.ab.'],
      {
        a: ['cream', 1],
        b: ['cream', 3],
        c: ['shade', 3],
      },
    );
    // The tail, a little twist.
    sprite(g, 9 + bx, 19 + by, ['.a', 'a.', '.a', 'a.'], { a: ['umber', 3] });
  },
};

/* ----------------------------------------------------------------- the grey wolf */

const WOLF: Beast = {
  w: 68,
  h: 46,
  anchor: { x: 32, y: 44 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const [fx, fy] = o('front');
    const [kx, ky] = o('hind');
    // The tail: bushy, low, a dark tip.
    mass(g, 9 + bx, 27 + by, 6, 3.5, 'fur', { base: 2.6, tex: 'fur', k2: 4 });
    paint(g, 2 + bx, 27 + by, 4, 4, (x, y) =>
      Math.hypot(x - 4 - bx, y - 29 - by) < 2.2 ? cell('fur', 5) : 0,
    );
    // Far legs.
    leg(g, 45 + fx, 30 + by, 47 + fx, 41 + fy, 3, 'fur', [4, 5], 'fur');
    leg(g, 20 + kx, 30 + by, 17 + kx, 41 + ky, 3, 'fur', [4, 5], 'fur');
    // The body: lean, a deep chest, a tucked belly, the ruff at the shoulders.
    mass(g, 28 + bx, 25 + by, 16, 7.5, 'fur', { base: 2.8, tex: 'fur', k: 2.2 });
    mass(g, 42 + bx, 24 + by, 9, 9, 'fur', { base: 2.6, tex: 'fur', k: 2.2, k2: 2 });
    mass(g, 28 + bx, 30 + by, 13, 2.5, 'cream', { base: 3, k: 1 });
    shade(g, 30 + bx, 31 + by, 15, 2, 1);
    // Near legs: long, a paw each.
    leg(g, 22 + kx, 30 + by, 22 + kx, 42 + ky, 4, 'fur', [2, 3, 4], 'fur');
    leg(g, 45 + fx, 30 + by, 49 + fx, 42 + fy, 3, 'fur', [2, 3, 4], 'fur');
    // The head: pricked ears, a long muzzle, a pale eye, the lip drawn back.
    mass(g, 52 + hx, 17 + hy, 7, 6, 'fur', { base: 2.5, tex: 'fur', k2: 7 });
    mass(g, 59 + hx, 20 + hy, 6, 3, 'fur', { base: 2.4, k2: 8 });
    paint(g, 56 + hx, 21 + hy, 9, 3, (x, y) =>
      y === 22 + hy && x < 64 + hx ? cell('cream', 2) : 0,
    );
    sprite(g, 47 + hx, 7 + hy, ['..a.', '.ab.', 'abbc', 'abbc'], {
      a: ['fur', 2],
      b: ['fur', 4],
      c: ['fur', 5],
    });
    sprite(g, 52 + hx, 7 + hy, ['.a..', '.ab.', 'abbc', 'abbc'], {
      a: ['fur', 1],
      b: ['fur', 3],
      c: ['fur', 5],
    });
    eye(g, 55 + hx, 16 + hy, 'gold');
    put(g, 54 + hx, 15 + hy, cell('fur', 5));
    put(g, 56 + hx, 15 + hy, cell('fur', 5));
    put(g, 65 + hx, 19 + hy, cell('tar', 4));
    put(g, 65 + hx, 20 + hy, cell('tar', 4));
    if (p.open)
      sprite(g, 57 + hx, 22 + hy, ['abababa', 'ccccccc', '.a.a.a.'], {
        a: ['cream', 0],
        b: ['crimson', 3],
        c: ['shade', 3],
      });
    else sprite(g, 57 + hx, 22 + hy, ['a.a.a.c', 'cccccc.'], { a: ['cream', 0], c: ['shade', 3] });
  },
};

/* ---------------------------------------------------------------- the marsh troll */

const TROLL: Beast = {
  w: 80,
  h: 92,
  anchor: { x: 38, y: 90 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const [ax, ay] = o('arms');
    const [lx, ly] = o('legs');
    // Legs: short, bowed, huge feet.
    leg(g, 30 + lx, 66 + by, 26 + lx, 86 + ly, 8, 'troll', [3, 4, 5]);
    leg(g, 46 - lx, 66 + by, 50 - lx, 86 - ly, 8, 'troll', [2, 3, 4]);
    for (const [x, d] of [
      [20 + lx, 0],
      [45 - lx, 1],
    ] as const)
      paint(g, x, 84, 14, 5, (xx, y) =>
        cell('troll', (y === 84 ? 2 : 3) + d + (xx > x + 10 ? 1 : 0)),
      );
    // The far arm, hanging behind to the knuckles.
    rod(g, 52 + bx, 34 + by, 60 + ax, 56 + ay, 9, 'troll', [3, 4, 5]);
    rod(g, 60 + ax, 56 + ay, 62 + ax, 74 + ay, 8, 'troll', [3, 4, 5]);
    // The body: a great hunched back and belly, mossy, a loincloth of hide.
    mass(g, 38 + bx, 48 + by, 22, 22, 'troll', { base: 3, k: 2.4, tex: 'shell', k2: 5 });
    mass(g, 42 + bx, 56 + by, 15, 13, 'troll', { base: 2.6, k: 2, k2: 6 });
    paint(g, 25 + bx, 64 + by, 30, 9, (x, y) => {
      const r = (x - 25 - bx) / 30;
      if (y > 64 + by + 6 + Math.round(Math.sin(r * 9) * 1.5)) return 0;
      return cell('hide', y === 64 + by ? 2 : r > 0.65 ? 4 : 3);
    });
    for (let i = 0; i < 14; i++) {
      const x = Math.round(20 + bx + hash(i, 1, 41) * 36);
      const y = Math.round(30 + by + hash(i, 2, 41) * 14);
      sprite(g, x, y, ['ab', 'bc'], { a: ['moss', 1], b: ['moss', 3], c: ['moss', 4] });
    }
    // The near arm, forward, a fist the size of a head.
    rod(g, 24 + bx, 36 + by, 18 + ax, 58 + ay, 10, 'troll', [1, 2, 3, 4]);
    rod(g, 18 + ax, 58 + ay, 22 + ax, 74 + ay, 9, 'troll', [2, 3, 4]);
    mass(g, 22 + ax, 77 + ay, 7, 6, 'troll', { base: 2.3, k: 2.2 });
    // The head: sunk between the shoulders, heavy brows, a vast underbite with tusks.
    mass(g, 46 + hx, 24 + hy, 11, 10, 'troll', { base: 2.5, k: 2.4, k2: 9 });
    mass(g, 50 + hx, 31 + hy, 10, 6, 'troll', { base: 2.8, k: 2, k2: 10 });
    paint(g, 40 + hx, 19 + hy, 16, 3, (_x, y) =>
      y === 19 + hy ? cell('troll', 1) : cell('troll', 4),
    );
    eye(g, 45 + hx, 22 + hy, 'gold');
    eye(g, 51 + hx, 22 + hy, 'gold');
    // The nose, a lump.
    mass(g, 50 + hx, 26 + hy, 2.6, 2.4, 'troll', { base: 2, k: 2 });
    if (p.open) paint(g, 43 + hx, 31 + hy, 16, 4, (_x, y) => cell('shade', y === 31 + hy ? 4 : 3));
    else paint(g, 43 + hx, 31 + hy, 16, 1, () => cell('shade', 4));
    sprite(g, 44 + hx, 27 + hy, ['a.........a.', 'ab........ab', 'ab........ab', 'b..........b'], {
      a: ['cream', 1],
      b: ['cream', 3],
    });
    // Weed hanging from his crown.
    for (let i = 0; i < 7; i++) {
      const x = 38 + hx + i * 2;
      for (let j = 0; j < 3 + (i % 3); j++) put(g, x, 14 + hy + j, cell('weed', 2 + (j % 3)));
    }
  },
};

/* ---------------------------------------------------------------- the bramble wyrm */

const WYRM: Beast = {
  w: 96,
  h: 60,
  anchor: { x: 46, y: 58 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    // The body: a long coil low along the ground, thick in the middle, the tail tapering behind.
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = 6 + t * 66 + bx * t;
      const y = 48 - Math.sin(t * Math.PI * 1.6) * 7 - t * 8 + by * t;
      const r = 2 + Math.sin(t * Math.PI) * 7 + t * 2;
      pts.push([x, y, r]);
    }
    for (const [x, y, r] of pts)
      mass(g, x, y, r, r * 0.8, 'pine', { base: 3, k: 2, tex: 'scale', k2: Math.round(x) });
    // Its belly plates, pale, underneath.
    for (const [x, y, r] of pts) put(g, Math.round(x), Math.round(y + r * 0.7), cell('ochre', 3));
    // Thorns along its spine, with brambles wound through them.
    pts.forEach(([x, y, r], i) => {
      if (i % 4 || i < 4) return;
      sprite(g, Math.round(x) - 1, Math.round(y - r * 0.8) - 4, ['.a.', '.a.', 'aab', 'abb'], {
        a: ['bark', 2],
        b: ['bark', 4],
      });
      if (i % 12 === 0) put(g, Math.round(x) + 2, Math.round(y - r * 0.8) - 1, cell('crimson', 2));
    });
    // Short legs, clawed, two showing.
    rod(g, 30 + bx * 0.4, 46, 25 + bx * 0.4, 51, 5, 'pine', [3, 4, 5]);
    leg(g, 25 + bx * 0.4, 51, 28 + bx * 0.4, 56, 4, 'pine', [3, 4, 5], 'bark');
    rod(g, 58 + bx * 0.8, 40 + by * 0.8, 54 + bx * 0.8, 48, 6, 'pine', [2, 3, 4]);
    leg(g, 54 + bx * 0.8, 48, 58 + bx * 0.8, 56, 5, 'pine', [2, 3, 4], 'bark');
    // The neck curving up to a horned head, the jaw hinged open to strike.
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = 70 + bx + (78 + hx - 70 - bx) * t + Math.sin(t * Math.PI) * 4;
      const y = 36 + by + (24 + hy - 36 - by) * t;
      mass(g, x, y, 5.2 - t * 1.4, 4.6 - t, 'pine', { base: 2.8, k: 2, tex: 'scale', k2: i });
    }
    mass(g, 82 + hx, 20 + hy, 8, 6, 'pine', { base: 2.5, k: 2.2, tex: 'scale', k2: 3 });
    mass(g, 89 + hx, 22 + hy, 5, 3.5, 'pine', { base: 2.3, k: 2 });
    sprite(g, 74 + hx, 10 + hy, ['a....', 'ab...', '.ab..', '..abb', '...bb'], {
      a: ['bark', 1],
      b: ['bark', 3],
    });
    eye(g, 83 + hx, 17 + hy, 'gold');
    put(g, 82 + hx, 16 + hy, cell('pine', 5));
    put(g, 84 + hx, 16 + hy, cell('pine', 5));
    if (p.open) {
      paint(g, 84 + hx, 24 + hy, 10, 3, (_x, y) => cell(y === 24 + hy ? 'crimson' : 'shade', 3));
      sprite(g, 85 + hx, 24 + hy, ['a.a.a.a'], { a: ['cream', 0] });
      mass(g, 87 + hx, 28 + hy, 6, 2, 'pine', { base: 3, k: 1.5 });
    } else
      sprite(g, 85 + hx, 24 + hy, ['aaaaaaa', '.b.b.b.'], { a: ['shade', 4], b: ['cream', 1] });
  },
};

export const BEASTS: Readonly<Record<string, Beast>> = {
  dock_rat: RAT,
  sand_crab: SAND_CRAB,
  giant_crab: GIANT_CRAB,
  ships_parrot: PARROT,
  thieving_gull: GULL,
  bramble_boar: BOAR,
  grey_wolf: WOLF,
  marsh_troll: TROLL,
  bramble_wyrm: WYRM,
};

/** A creature drawn in a pose, outlined, on its own canvas. */
export function beastGrid(id: string, pose: BeastPose = {}): TGrid | null {
  const b = BEASTS[id];
  if (!b) return null;
  const g = tgrid(b.w, b.h);
  const at = pose.at ?? {};
  b.draw(g, (bone) => at[bone] ?? [0, 0], pose);
  return outlineIn(g);
}

/** A picture turned upside down: a creature fallen on its back. */
export function upturned(g: TGrid): TGrid {
  const out = tgrid(g.w, g.h);
  for (let y = 0; y < g.h; y++)
    out.d.set(g.d.subarray(y * g.w, (y + 1) * g.w), (g.h - 1 - y) * g.w);
  return out;
}

/**
 * How each creature lies when it is down: on its back, feet up (the crabs and
 * the birds: what a crab does), on its belly with its legs folded under it
 * and its chin on the ground (the four-footed and the wyrm: `drop` is how far
 * its body sinks to meet the ground), or on its side, turned a quarter (the
 * troll, as people fall).
 */
const FALLEN: Readonly<
  Record<string, { readonly how: 'back' | 'belly' | 'side'; readonly drop?: number }>
> = {
  dock_rat: { how: 'belly', drop: 4 },
  sand_crab: { how: 'back' },
  giant_crab: { how: 'back' },
  ships_parrot: { how: 'back' },
  thieving_gull: { how: 'back' },
  bramble_boar: { how: 'belly', drop: 9 },
  grey_wolf: { how: 'belly', drop: 13 },
  marsh_troll: { how: 'side' },
  bramble_wyrm: { how: 'belly', drop: 4 },
};

/** The lowest row with anything drawn on it. */
function lowest(g: TGrid): number {
  for (let y = g.h - 1; y >= 0; y--) for (let x = 0; x < g.w; x++) if (g.d[y * g.w + x]) return y;
  return 0;
}

/** A creature down, from its buckling pose: its picture and where it lies (its feet point, on the ground). */
export function fallenBeast(
  id: string,
  buckle: BeastPose,
): { grid: TGrid; feet: { x: number; y: number } } {
  const b = BEASTS[id]!;
  const f = FALLEN[id] ?? { how: 'back' };
  if (f.how === 'back') {
    const g = upturned(beastGrid(id, buckle)!);
    return { grid: g, feet: { x: b.anchor.x, y: lowest(g) } };
  }
  if (f.how === 'side') {
    const g = beastGrid(id, buckle)!;
    // A quarter turn anticlockwise: the head to the left, the back on the ground.
    const out = tgrid(g.h, g.w);
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) out.d[(g.w - 1 - x) * out.w + y] = g.d[y * g.w + x]!;
    return { grid: out, feet: { x: Math.round(out.w / 2), y: lowest(out) } };
  }
  // On its belly: every bone sunk by `drop`, nothing below the ground row (the legs fold under).
  const drop = f.drop ?? 0;
  const at = buckle.at ?? {};
  const g = tgrid(b.w, b.h);
  b.draw(
    g,
    (bone) => {
      const [dx, dy] = at[bone] ?? [0, 0];
      return [dx, dy + drop];
    },
    { ...buckle, down: true },
  );
  for (let y = b.anchor.y; y < g.h; y++) g.d.fill(0, y * g.w, (y + 1) * g.w);
  return { grid: outlineIn(g), feet: { x: b.anchor.x, y: b.anchor.y } };
}
