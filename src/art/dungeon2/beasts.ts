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
import { furTex, litBy, lim, paint, poly, rod, seam, shaped, shifted, sprite } from './kit';
import { blob, form, marks, stroke, tone, type Pts } from './heads';

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
  splay = 1,
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
      const knee = cx + bx + side * (R * 0.9 + i * 3.2 * s * splay) + lx * side;
      const tipX = cx + bx + side * (R * (0.6 + 0.4 * splay) + i * 4.4 * s * splay) + lx * side;
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
  // Eyes on stalks (B11: B10a's stalks were a pixel wide with a bead on top): thick stalks lit on
  // the near side, white eyeballs with the pupil toward the foe, and a hard lid slanting down to the
  // middle, so even the sand crab glares.
  for (const side of [-1, 1]) {
    const x = cx + bx + side * 3.2 * s;
    const r = Math.max(1.6, 1.75 * s);
    const ey = cy - 7 * s - 3.4 * s;
    rod(
      g,
      x - side * 0.4 * s,
      cy - 5 * s,
      x,
      ey + r,
      Math.max(2, Math.round(1.25 * s)),
      'crab',
      [2, 3, 4],
    );
    const ball = (px: number, py: number) => Math.hypot(px + 0.5 - x, py + 0.5 - ey) < r;
    paint(
      g,
      Math.floor(x - r - 1),
      Math.floor(ey - r - 1),
      Math.ceil(r * 2) + 3,
      Math.ceil(r * 2) + 3,
      (px, py) => {
        if (!ball(px, py)) return 0;
        const lid = py + 0.5 < ey - r * 0.2 - (px + 0.5 - x) * side * 0.6;
        if (lid) return cell('crab', py + 0.5 < ey - r * 0.6 ? 1 : 3);
        return cell('sail', px + 0.5 < x - r * 0.3 ? 1 : 2);
      },
    );
    // The pupil, toward the way it faces (right) and a little low; a glint.
    const pr = Math.max(1, Math.round(r * 0.45));
    paint(g, Math.round(x + r * 0.3 - pr / 2), Math.round(ey - pr / 2 + r * 0.15), pr, pr, () =>
      cell('eye', 4),
    );
    put(g, Math.round(x - r * 0.45), Math.round(ey + r * 0.2), cell('eye', 0));
  }
  // The carapace's grooves, an M across the shell's front, and its lit front rim.
  for (const side of [-1, 1])
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      put(
        g,
        Math.round(cx + bx + side * (1 + t * R * 0.55)),
        Math.round(cy - 3 * s + Math.sin(t * Math.PI) * -2 * s + t * 3 * s),
        cell('crab', 4),
      );
    }
  for (let i = -8; i <= 8; i++)
    put(
      g,
      Math.round(cx + bx + (i * R) / 10),
      Math.round(cy + 5.6 * s - Math.abs(i) * 0.25 * s),
      cell('crab', 1),
    );
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
    // Teeth along the fixed finger's inner edge, and the dark crease where the fingers hinge.
    for (let k = 1; k <= Math.round(2 * s); k++)
      put(
        g,
        Math.round(fx - side * 0.6 * s),
        Math.round(fy - k * 1.1),
        cell('cream', k % 2 ? 1 : 3),
      );
    put(g, Math.round(fx - side * 0.5), Math.round(fy + 1), cell('crab', 5));
    put(g, Math.round(fx - side * 0.5 + 1), Math.round(fy + 1), cell('crab', 5));
  }
}

const SAND_CRAB: Beast = {
  w: 40,
  h: 26,
  anchor: { x: 20, y: 24 },
  draw: (g, o, p) => crabBody(g, o, p, 1, 20, 23, false),
};

/**
 * The giant crab, on the same canvas, drawn at 1.7 times the sand crab with
 * its legs drawn in under the shell (B12: at 2.15 with the sand crab's splay,
 * its legs reached 41 columns ahead of its feet, so the hero at strike reach,
 * 36, stood inside it). Still nearly twice a person's width.
 */
const GIANT_CRAB: Beast = {
  w: 84,
  h: 52,
  anchor: { x: 42, y: 50 },
  draw: (g, o, p) => crabBody(g, o, p, 1.7, 42, 49, true, 0.35),
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
      b: ['smoke', 3],
      c: ['felt', 3],
    });
    // The body: white breast, grey back.
    mass(g, 19 + bx, 17 + by, 10, 7, 'smoke', { base: 1.4, k: 1.6 });
    mass(g, 16 + bx, 15 + by, 8, 4.5, 'stone', { base: 2.2, k: 1.6, tex: 'feather' });
    // The head: white, a fierce yellow eye under a flat brow, the chip in its beak.
    mass(g, 27 + hx, 9 + hy, 5, 4.5, 'smoke', { base: 1.1, k: 1.5 });
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

/**
 * The bramble boar: built like a wedge, all of him behind his head. High
 * humped shoulders, a back that falls to a narrow rump, a long low head with
 * a disc of a snout, a small red-rimmed eye under a hard brow, tusks curling
 * up from the lower jaw, a crest of black bristles down the spine with
 * brambles caught in it, thin legs on black hooves, a twist of a tail.
 */
const BOAR_BODY: readonly (readonly [number, number])[] = [
  [7, 22],
  [11, 16],
  [19, 13],
  [29, 10],
  [37, 8],
  [43, 9],
  [48, 13],
  [51, 19],
  [51, 27],
  [47, 32],
  [40, 34],
  [28, 35],
  [17, 33],
  [10, 29],
];
const BOAR_HEAD: readonly (readonly [number, number])[] = [
  [43, 13],
  [49, 13],
  [55, 17],
  [60, 22],
  [63, 26],
  [64, 30],
  [61, 33],
  [55, 33],
  [49, 31],
  [45, 27],
  [43, 20],
];
/** A thin leg: a ham or a shoulder at the top tapering to the hock, then the cannon to a hoof. */
function hoofLeg(g: TGrid, x: number, y: number, ground: number, near: boolean, ham = false): void {
  const len = ground - 1 - y;
  const top = ham ? 5 : 4;
  for (let j = 0; j < len; j++) {
    const w = j < len * 0.45 ? top - Math.round((j / (len * 0.45)) * (top - 2)) : 2;
    for (let i = 0; i < w; i++) {
      const s = (near ? 2 : 3) + (i === 0 ? -1 : i === w - 1 ? 1 : 0) + (j > len * 0.45 ? 1 : 0);
      put(g, x + i - Math.floor(w / 2), y + j, cell('umber', lim(s, 1, 5)));
    }
  }
  // A cloven hoof: lit on its front, the split between the toes dark.
  sprite(g, x - 1, y + len, ['aab', 'bdc'], {
    a: ['tar', near ? 1 : 2],
    b: ['tar', 3],
    c: ['tar', 4],
    d: ['tar', 6],
  });
}

const BOAR: Beast = {
  w: 68,
  h: 44,
  anchor: { x: 32, y: 42 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const [fx, fy] = o('front');
    const [kx, ky] = o('hind');
    // Far legs, in shade.
    hoofLeg(g, 42 + fx, 30 + by, 41 + fy, false);
    hoofLeg(g, 15 + kx, 28 + by, 41 + ky, false, true);
    // The body, its bristle coat in strokes.
    shaped(g, poly(shifted(BOAR_BODY, bx, by)), 'umber', {
      base: 2.4,
      contrast: 2,
      radius: 8,
      // Grizzled: the light catches the bristles' tips over the shoulders.
      tex: (x, y, t) => {
        const f = furTex(3, 0.7, 0.2)(x - bx, y - by, t);
        return y - by < 20 && hash(x - bx, y - by, 66) < 0.12 ? f - 1 : f;
      },
    });
    // The belly's shadow and the dark under the chest.
    shade(g, 29 + bx, 34 + by, 16, 2.2, 1);
    // Grizzled light along the top of the hump, where the bristles' tips catch it.
    for (let x = 18; x <= 42; x += 2) {
      const t = (x - 12) / 34;
      const top = Math.round(by + 20 - 12 * Math.sin(t * Math.PI * 0.62)) + 2;
      put(g, x + bx, top, cell('umber', 1));
      if (x % 4 === 0) put(g, x + bx + 1, top + 1, cell('umber', 1));
    }
    // A crest of bristles down the spine, standing up in tufts.
    for (let x = 12; x <= 46; x++) {
      const t = (x - 12) / 34;
      const top = Math.round(
        by + 20 - 12 * Math.sin(t * Math.PI * 0.62) - (t > 0.75 ? (1 - t) * 6 : 0),
      );
      const tall = 1 + Math.round(hash(x, 5, 61) * 2) + (x % 3 === 0 ? 1 : 0);
      for (let j = 1; j <= tall; j++) put(g, x + bx, top - j, cell('tar', j === tall ? 4 : 3));
      put(g, x + bx, top, cell('tar', 2));
    }
    // Brambles caught in the bristles: a hooked stem, a leaf, a berry.
    for (const [x, y] of [
      [18, 10],
      [30, 6],
      [40, 5],
    ] as const)
      sprite(g, x + bx, y + by, ['.b.c', 'bab.', '.ad.'], {
        a: ['leaf', 3],
        b: ['leaf', 5],
        c: ['crimson', 2],
        d: ['crimson', 4],
      });
    // Near legs, lit.
    hoofLeg(g, 20 + kx, 29 + by, 41 + ky, true, true);
    hoofLeg(g, 46 + fx, 30 + by, 41 + fy, true);
    // The head, long and low.
    // The fold of the neck where the head comes out of the shoulders, in shadow.
    shade(g, 45 + bx, 24 + by, 3, 9, 1);
    const head = poly(shifted(BOAR_HEAD, hx, hy));
    shaped(g, head, 'umber', {
      base: 2.2,
      contrast: 2,
      radius: 5,
      tex: (x, y, t) => {
        const f = furTex(9, 0.3, 0.16)(x - hx, y - hy, t);
        // A paler jowl under the eye, as a wild boar has.
        return Math.hypot((x - hx - 52) / 5, (y - hy - 26) / 3.5) < 1 ? f - 1 : f;
      },
    });
    // The cheek's line, where the head comes out of the shoulder: a curve, dark, lit on its far side.
    for (let y = 14; y <= 31; y++) {
      const x = Math.round(47 - 2.6 * Math.sin((Math.PI * (y - 14)) / 17));
      put(g, x + hx, y + hy, cell('umber', 5));
      if (head(x + hx + 1, y + hy)) put(g, x + hx + 1, y + hy, cell('umber', 2));
    }
    void head;
    // The snout's disc, pink and wet, two nostrils.
    sprite(g, 61 + hx, 26 + hy, ['.ab.', 'abbc', 'adbd', 'abbc', '.cc.'], {
      a: ['shell', 2],
      b: ['shell', 3],
      c: ['shell', 4],
      d: ['shade', 3],
    });
    // The mouth's line, open when he charges.
    for (let x = 52; x <= 60; x++) put(g, x + hx, 31 + hy + (x < 55 ? 0 : 0), cell('tar', 4));
    if (p.open)
      sprite(g, 53 + hx, 32 + hy, ['abbbbba', '.aaaaa.'], { a: ['tar', 5], b: ['crimson', 4] });
    // Tusks, curling up from the lower jaw and back.
    sprite(g, 56 + hx, 24 + hy, ['...a', '..ab', '..ab', '.ab.', 'aab.', 'abc.', 'bc..'], {
      a: ['cream', 0],
      b: ['cream', 2],
      c: ['cream', 3],
    });
    // A small, mean eye under a hard brow.
    sprite(g, 49 + hx, 16 + hy, ['aaaab.', '.acgda', '.acdda', '..eee.'], {
      a: ['tar', 4],
      b: ['tar', 3],
      c: ['crimson', 2],
      g: ['eye', 0],
      d: ['eye', 4],
      e: ['umber', 4],
    });
    if (p.down) sprite(g, 52 + hx, 19 + hy, ['aaa'], { a: ['tar', 4] });
    // An ear laid back, pointed, its inside dark.
    sprite(g, 46 + hx, 6 + hy, ['.a..', '.ab.', 'aab.', 'acdb', 'acdb', 'acdb', '.bbe'], {
      a: ['umber', 1],
      b: ['umber', 4],
      c: ['shell', 3],
      d: ['shell', 4],
      e: ['umber', 5],
    });
    // The tail, a twist with a tuft.
    sprite(g, 4 + bx, 19 + by, ['.a.', 'a..', '.a.', '..a', '.bb', 'bb.'], {
      a: ['umber', 3],
      b: ['tar', 3],
    });
  },
};

/* ----------------------------------------------------------------- the grey wolf */

/**
 * The grey wolf: lean and long-legged, head low and forward, ears pricked, a
 * long muzzle with the lip drawn back, pale eyes, a ruff thick over the
 * shoulders, a darker saddle down the back, the belly tucked, the brush held
 * low with a dark tip.
 */
const WOLF_BODY: readonly (readonly [number, number])[] = [
  [11, 21],
  [16, 18],
  [26, 17],
  [36, 15],
  [42, 13],
  [47, 14],
  [50, 19],
  [50, 27],
  [46, 31],
  [40, 30],
  [32, 27],
  [24, 28],
  [16, 29],
  [11, 27],
];
const WOLF_HEAD: readonly (readonly [number, number])[] = [
  [46, 14],
  [50, 11],
  [55, 10],
  [59, 12],
  [62, 15],
  [67, 17],
  [67, 20],
  [63, 22],
  [57, 23],
  [52, 22],
  [48, 20],
];
const WOLF_TAIL: readonly (readonly [number, number])[] = [
  [13, 20],
  [9, 23],
  [5, 28],
  [3, 33],
  [5, 35],
  [8, 32],
  [12, 27],
  [15, 24],
];
/** A long leg: the upper part thick and lit, a slender lower part, a dark paw. */
function pawLeg(g: TGrid, x: number, y: number, ground: number, near: boolean, hock = 0): void {
  const len = ground - y;
  for (let j = 0; j < len; j++) {
    const k = j / len;
    const w = k < 0.35 ? 4 : 3;
    // A hind leg bends back at the hock.
    const dx = hock
      ? Math.round(
          hock * Math.sin(Math.min(1, k / 0.55) * Math.PI * 0.5) -
            (k > 0.55 ? hock * ((k - 0.55) / 0.45) : 0),
        )
      : 0;
    for (let i = 0; i < w; i++) {
      const s = (near ? 1 : 3) + (i === 0 ? -1 : i === w - 1 ? 1 : 0) + (k > 0.4 ? 1 : 0);
      put(g, x + i - 1 - dx, y + j, cell('fur', lim(s - 1, 0, 5)));
    }
  }
  sprite(g, x - 2, ground - 1, ['abbc', '.ccd'], {
    a: ['fur', near ? 2 : 3],
    b: ['fur', near ? 3 : 4],
    c: ['fur', 5],
    d: ['fur', 5],
  });
}

const WOLF: Beast = {
  w: 70,
  h: 46,
  anchor: { x: 32, y: 44 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const [fx, fy] = o('front');
    const [kx, ky] = o('hind');
    // The brush, low, its tip dark.
    shaped(g, poly(shifted(WOLF_TAIL, bx, by)), 'fur', {
      base: 2.0,
      contrast: 1.6,
      radius: 3,
      tex: (x, y, t) => (y - by > 31 ? t + 2 : furTex(4, -0.6, 0.2)(x - bx, y - by, t)),
    });
    // Far legs, in shade.
    pawLeg(g, 44 + fx, 28 + by, 43 + fy, false);
    pawLeg(g, 15 + kx, 26 + by, 43 + ky, false, 3);
    // The body: grey, a dark saddle along the back, the belly and chest pale.
    shaped(g, poly(shifted(WOLF_BODY, bx, by)), 'fur', {
      base: 0.7,
      contrast: 1.5,
      radius: 6,
      tex: (x, y, t) => {
        const ly = y - by;
        const lx = x - bx;
        const saddle = ly < 21 - (lx > 36 ? 3 : 0) ? 1 : 0;
        const belly = ly > 25 + (lx < 30 ? 1 : 0) || (lx > 43 && ly > 22) ? -1 : 0;
        if (belly) return lim(t - 1.5, 0, 1);
        return furTex(5, 0.8, 0.18)(lx, ly, t + saddle + belly);
      },
    });
    // The ruff: a ragged edge of thick fur standing up over the shoulders.
    for (let x = 38; x <= 47; x++) {
      const top = Math.round(by + 14 - (x - 38) * 0.15 - (x % 3 === 1 ? 1 : 0));
      put(g, x + bx, top, cell('fur', x % 2 ? 2 : 3));
      if (x % 3 === 1) put(g, x + bx, top - 1, cell('fur', 3));
    }
    shade(g, 30 + bx, 29 + by, 14, 1.6, 1);
    // Near legs, lit.
    pawLeg(g, 20 + kx, 26 + by, 43 + ky, true, 3);
    pawLeg(g, 47 + fx, 28 + by, 43 + fy, true);
    // The head, long, the muzzle paler beneath.
    shaped(g, poly(shifted(WOLF_HEAD, hx, hy)), 'fur', {
      base: 0.6,
      contrast: 1.6,
      radius: 4,
      tex: (x, y, t) =>
        y - hy > 19 && x - hx > 52 ? t - 1 : furTex(8, 0.2, 0.12)(x - hx, y - hy, t),
    });
    // The cheek's ruff edge behind the jaw.
    for (const [x, y] of [
      [49, 15],
      [48, 16],
      [48, 17],
      [49, 18],
      [48, 19],
      [50, 20],
    ] as const)
      put(g, x + hx, y + hy, cell('fur', 4));
    // Ears pricked, the near one in front, dark inside.
    sprite(g, 50 + hx, 3 + hy, ['.a...', '.ab..', 'aabb.', 'acbb.', 'acdb.', 'acdbb', '.bbbe'], {
      a: ['fur', 1],
      b: ['fur', 3],
      c: ['fur', 4],
      d: ['fur', 5],
      e: ['fur', 5],
    });
    sprite(g, 54 + hx, 4 + hy, ['.a..', 'aab.', 'abb.', 'acbb', 'acbb', '.bbd'], {
      a: ['fur', 2],
      b: ['fur', 4],
      c: ['fur', 5],
      d: ['fur', 5],
    });
    // A pale eye, slanted, under a dark brow.
    sprite(g, 56 + hx, 12 + hy, ['aa...', '.bca', '..a.'], {
      a: ['fur', 5],
      b: ['gold', 1],
      c: ['eye', 4],
    });
    if (p.down) sprite(g, 57 + hx, 13 + hy, ['aaa'], { a: ['fur', 5] });
    // A pale throat and chest under the jaw, as a grey wolf has, catching the lantern light.
    for (const [x, y, n] of [
      [50, 21, 5],
      [49, 22, 6],
      [48, 23, 6],
      [47, 24, 5],
      [47, 25, 4],
      [47, 26, 3],
    ] as const)
      for (let i = 0; i < n; i++)
        if (g.d[(y + hy) * g.w + x + i + hx])
          put(g, x + i + hx, y + hy, cell('cream', i === 0 ? 2 : 3));
    put(g, 57 + hx, 12 + hy, cell('eye', 0));
    // The nose, black, at the muzzle's tip.
    sprite(g, 65 + hx, 16 + hy, ['ab', 'bb'], { a: ['tar', 2], b: ['tar', 4] });
    // The mouth: the lip drawn back over teeth, open when it bites.
    if (p.open)
      sprite(g, 56 + hx, 20 + hy, ['aaaaaaaa.', 'bwbwbwb..', 'cccccc...', '.w.w.w...'], {
        a: ['tar', 4],
        b: ['crimson', 4],
        c: ['shade', 3],
        w: ['cream', 0],
      });
    else
      sprite(g, 56 + hx, 20 + hy, ['aaaaaaaaa', '.w.w.ww..'], { a: ['tar', 4], w: ['cream', 0] });
  },
};

/* ---------------------------------------------------------------- the marsh troll */

/**
 * The marsh troll: a head over the hero and three times as broad, hunched,
 * the head sunk low and forward between shoulders like boulders, arms long
 * enough to drag the knuckles, a pot belly, short bowed legs on flat feet.
 * A heavy brow over small yellow eyes, a lump of a nose, an underbite with
 * two tusks, ears drooping, moss on the shoulders and weed for hair.
 */
const TROLL_TORSO: readonly (readonly [number, number])[] = [
  [20, 34],
  [26, 25],
  [36, 20],
  [48, 19],
  [57, 23],
  [62, 31],
  [62, 45],
  [58, 57],
  [52, 66],
  [28, 66],
  [22, 57],
  [19, 45],
];
const TROLL_HEAD: readonly (readonly [number, number])[] = [
  [41, 22],
  [46, 15],
  [54, 14],
  [60, 18],
  [63, 25],
  [62, 31],
  [56, 34],
  [47, 34],
  [42, 30],
];
const TROLL_JAW: readonly (readonly [number, number])[] = [
  [43, 29],
  [63, 28],
  [65, 33],
  [61, 39],
  [50, 40],
  [44, 37],
];
/** A thick limb from (x0, y0) to (x1, y1), its width tapering, lit on its upper left. */
function limb(
  g: TGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w0: number,
  w1: number,
  base: number,
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const pts: [number, number][] = [
    [x0 - (nx * w0) / 2, y0 - (ny * w0) / 2],
    [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2],
    [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2],
    [x0 + (nx * w0) / 2, y0 + (ny * w0) / 2],
  ];
  shaped(g, poly(pts), 'troll', { base, contrast: 1.6, radius: Math.min(w0, w1) / 2 });
}

const TROLL: Beast = {
  w: 82,
  h: 92,
  anchor: { x: 38, y: 90 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const [ax, ay] = o('arms');
    const [lx, ly] = o('legs');
    // The far arm, behind, in shade: shoulder, elbow, a fist by the knee.
    limb(g, 58 + bx, 30 + by, 67 + ax, 50 + ay, 11, 9, 3.4);
    limb(g, 67 + ax, 50 + ay, 66 + ax, 70 + ay, 9, 8, 3.4);
    shaped(
      g,
      poly(
        shifted(
          [
            [60, 68],
            [72, 68],
            [74, 75],
            [70, 80],
            [61, 79],
            [59, 74],
          ],
          ax,
          ay,
        ),
      ),
      'troll',
      {
        base: 3.2,
        contrast: 1.6,
        radius: 3,
      },
    );
    // Short bowed legs and broad flat feet.
    limb(g, 47 - lx + bx, 62 + by, 50 - lx, 84 + ly, 11, 9, 3.2);
    limb(g, 30 + lx + bx, 62 + by, 27 + lx, 84 + ly, 12, 9, 2.4);
    for (const [x, d, s] of [
      [44 - lx, ly, 3],
      [18 + lx, ly, 2],
    ] as const)
      shaped(
        g,
        poly([
          [x, 83 + d],
          [x + 14, 83 + d],
          [x + 17, 87 + d],
          [x + 16, 89],
          [x - 1, 89],
          [x - 1, 85 + d],
        ]),
        'troll',
        {
          base: s,
          contrast: 1.5,
          radius: 2,
          hi: 5,
        },
      );
    // The torso: the hunched back, shoulders like boulders, the belly.
    shaped(g, poly(shifted(TROLL_TORSO, bx, by)), 'troll', {
      base: 2.6,
      contrast: 2.2,
      radius: 11,
      tex: (x, y, t) => {
        const lx2 = x - bx;
        const ly2 = y - by;
        // Warts and pits in the hide, a paler belly.
        const pit = hash(Math.floor(lx2 / 2), Math.floor(ly2 / 2), 71);
        const belly = Math.hypot((lx2 - 42) / 13, (ly2 - 52) / 11) < 1 ? -0.8 : 0;
        return t + belly + (pit < 0.08 ? 1 : pit > 0.95 ? -1 : 0);
      },
    });
    // The navel and the belly's fold.
    put(g, 43 + bx, 55 + by, cell('troll', 5));
    for (let x = 32; x <= 52; x++)
      put(g, x + bx, 60 + by + Math.round(Math.abs(x - 42) / 7), cell('troll', 4));
    // A loincloth of hide on a rope, its hem ragged.
    paint(g, 25 + bx, 62 + by, 31, 10, (x, y) => {
      const r = x - 25 - bx;
      const hem = 66 + by + Math.round(Math.sin(r * 0.9) * 1.5 + (r > 12 && r < 20 ? 3 : 0));
      if (y > hem) return 0;
      if (y === 62 + by) return cell('linen', r % 3 === 0 ? 3 : 2);
      return cell(
        'hide',
        (y === 63 + by ? 2 : 3) + (r > 20 ? 1 : 0) + (hash(r, y, 73) < 0.1 ? 1 : 0),
      );
    });
    // Moss in cushions on the shoulders.
    for (const [x, y, r] of [
      [30, 25, 3],
      [36, 22, 2.5],
      [55, 24, 2.5],
      [24, 33, 2],
    ] as const)
      shaped(g, (xx, yy) => Math.hypot(xx - x - bx, (yy - y - by) * 1.3) < r, 'moss', {
        base: 2.6,
        contrast: 1.8,
        radius: 2,
      });
    // The head, sunk between the shoulders.
    const head = poly(shifted(TROLL_HEAD, hx, hy));
    shaped(g, head, 'troll', { base: 1.8, contrast: 2, radius: 6 });
    seam(g, head, 2);
    // Ears drooping at the sides.
    sprite(g, 38 + hx, 23 + hy, ['.aa.', 'abbc', 'abcc', '.bcc', '..cd'], {
      a: ['troll', 2],
      b: ['troll', 3],
      c: ['troll', 4],
      d: ['troll', 5],
    });
    // The jaw: an underbite, open when he roars.
    const jaw = poly(shifted(TROLL_JAW, hx, hy + (p.open ? 2 : 0)));
    shaped(g, jaw, 'troll', { base: 2.2, contrast: 1.8, radius: 4 });
    seam(g, jaw, 2);
    if (p.open) paint(g, 46 + hx, 30 + hy, 15, 2, () => cell('shade', 4));
    else for (let x = 45; x <= 61; x++) put(g, x + hx, 30 + hy, cell('troll', 6));
    // Tusks up from the underbite.
    for (const tx of [47, 59])
      sprite(g, tx + hx, 26 + hy + (p.open ? 2 : 0), ['a.', 'ab', 'ab', 'bc'], {
        a: ['cream', 0],
        b: ['cream', 2],
        c: ['cream', 3],
      });
    // A brow like a ledge, small yellow eyes under it.
    for (let x = 45; x <= 61; x++) {
      put(g, x + hx, 20 + hy, cell('troll', 1));
      put(g, x + hx, 21 + hy, cell('troll', x > 57 ? 5 : 4));
    }
    if (p.down) {
      sprite(g, 48 + hx, 23 + hy, ['aaa....aaa'], { a: ['troll', 6] });
    } else {
      sprite(g, 48 + hx, 22 + hy, ['abc....abc'], {
        a: ['gold', 1],
        b: ['eye', 4],
        c: ['troll', 5],
      });
    }
    // The nose, a lump.
    shaped(g, (x, y) => Math.hypot(x - 55 - hx, (y - 25 - hy) * 1.2) < 3, 'troll', {
      base: 2,
      contrast: 2,
      radius: 2,
    });
    // Weed hanging from his crown like hair.
    for (let i = 0; i < 8; i++) {
      const x = 44 + hx + i * 2;
      const n = 3 + ((i * 7) % 4);
      for (let j = 0; j < n; j++)
        put(g, x + (j > 2 ? -1 : 0), 13 + hy + j, cell('weed', 2 + (j % 3)));
    }
    // The near arm, forward: a shoulder like a boulder, the forearm to a fist the size of a head.
    const upper = poly([
      [25 + bx - 6, 32 + by],
      [25 + bx + 6, 32 + by],
      [14 + ax + 5, 52 + ay],
      [14 + ax - 5, 52 + ay],
    ]);
    limb(g, 25 + bx, 32 + by, 14 + ax, 52 + ay, 13, 11, 2.2);
    seam(g, upper, 1);
    limb(g, 14 + ax, 52 + ay, 16 + ax, 70 + ay, 11, 9, 2.1);
    shaped(
      g,
      poly(
        shifted(
          [
            [9, 68],
            [23, 67],
            [25, 74],
            [21, 80],
            [11, 80],
            [8, 75],
          ],
          ax,
          ay,
        ),
      ),
      'troll',
      {
        base: 2.1,
        contrast: 1.8,
        radius: 3,
      },
    );
    // Knuckles.
    for (const kx of [11, 15, 19]) put(g, kx + ax, 69 + ay, cell('troll', 1));
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
    // Its belly plates, pale, underneath, each its own plate with a dark seam between.
    pts.forEach(([x, y, r], i) => {
      put(g, Math.round(x), Math.round(y + r * 0.7), cell('ochre', i % 3 === 0 ? 4 : 2));
      put(g, Math.round(x), Math.round(y + r * 0.7) - 1, cell('ochre', i % 3 === 0 ? 4 : 3));
    });
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
    // A slit gold eye under a hard brow ridge, a nostril at the snout's end.
    sprite(g, 81 + hx, 15 + hy, ['aaaab', '.cdc.', '.ced.'], {
      a: ['pine', 5],
      b: ['pine', 4],
      c: ['gold', 1],
      d: ['eye', 4],
      e: ['gold', 3],
    });
    put(g, 92 + hx, 20 + hy, cell('pine', 6));
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

/**
 * The troll down (B11; B10a turned his standing picture a quarter and it read
 * as a heap): drawn lying on his back, head to the left with his jaw and
 * tusks to the sky and his eyes shut, the great belly a mound, one knee up,
 * the near arm flung out along the ground with its fist open, weed spilling
 * from his head. On a canvas of its own, his middle on the ground.
 */
function trollLying(): { grid: TGrid; feet: { x: number; y: number } } {
  const g = tgrid(98, 50);
  const T = (pts: Pts, base: number, light: readonly [number, number] = [20, 10]) =>
    form(g, blob(pts), 'troll', {
      cx: light[0],
      cy: light[1],
      rx: 40,
      ry: 30,
      base,
      k: 1.5,
      rim: 4,
    });
  // The far leg, straight along the ground behind, in shade.
  T(
    [
      [62, 38],
      [80, 40],
      [92, 41],
      [92, 47],
      [70, 47],
      [60, 45],
    ],
    3.4,
  );
  // The torso: his back on the ground, the belly a mound.
  T(
    [
      [20, 42],
      [22, 31],
      [31, 21],
      [45, 15],
      [58, 16],
      [67, 25],
      [70, 37],
      [67, 47],
      [24, 47],
    ],
    2.4,
    [40, 10],
  );
  tone(
    g,
    blob([
      [34, 20],
      [48, 16],
      [58, 20],
      [56, 28],
      [40, 28],
    ]),
    -1,
    ['troll'],
  );
  put(g, 47, 22, cell('troll', 5));
  // The loincloth on its rope at his hips.
  form(
    g,
    blob([
      [60, 22],
      [68, 28],
      [70, 40],
      [64, 44],
      [60, 34],
    ]),
    'hide',
    { cx: 60, cy: 20, rx: 12, ry: 20, base: 2.6, k: 1.2, rim: 1 },
  );
  // The near leg, the knee up, the foot flat.
  T(
    [
      [62, 30],
      [72, 20],
      [80, 18],
      [84, 24],
      [76, 30],
      [68, 38],
    ],
    2.2,
  );
  T(
    [
      [78, 19],
      [84, 22],
      [88, 34],
      [88, 42],
      [82, 42],
      [80, 30],
    ],
    2.6,
  );
  T(
    [
      [80, 41],
      [94, 41],
      [97, 45],
      [96, 47],
      [79, 47],
    ],
    2.6,
  );
  // The head, back on the ground, the face to the sky.
  T(
    [
      [4, 44],
      [3, 34],
      [7, 26],
      [16, 22],
      [25, 27],
      [27, 38],
      [22, 47],
      [6, 47],
    ],
    2.1,
    [8, 18],
  );
  // The ear, drooping to the ground.
  T(
    [
      [6, 36],
      [0, 40],
      [1, 46],
      [7, 44],
    ],
    3,
  );
  // Weed spilling from his crown onto the ground.
  for (let i = 0; i < 6; i++)
    stroke(
      g,
      [
        [3 + i, 30 + i * 2],
        [-1 + i, 47],
      ],
      'weed',
      2 + (i % 3),
    );
  // The jaw jutting up, two tusks to the sky, the brow's ledge, the eyes shut, a lump of a nose.
  form(
    g,
    blob([
      [8, 26],
      [14, 20],
      [22, 21],
      [24, 26],
      [16, 28],
    ]),
    'troll',
    { cx: 10, cy: 18, rx: 12, ry: 8, base: 2, k: 1.4, rim: 2 },
  );
  marks(g, 11, 15, ['a....a', 'ab...ab', 'ab...ab', 'bc...bc'], {
    a: ['cream', 0],
    b: ['cream', 2],
    c: ['cream', 3],
  });
  stroke(
    g,
    [
      [12, 24],
      [21, 25],
    ],
    'shade',
    3,
  );
  stroke(
    g,
    [
      [19, 28],
      [24, 34],
    ],
    'troll',
    5,
  );
  marks(g, 17, 30, ['KK..', '..KK'], { K: ['troll', 6] });
  marks(g, 20, 35, ['KK.', '.KK'], { K: ['troll', 6] });
  form(
    g,
    blob([
      [22, 29],
      [26, 30],
      [26, 34],
      [23, 34],
    ]),
    'troll',
    {
      cx: 22,
      cy: 28,
      rx: 4,
      ry: 4,
      base: 1.6,
      k: 1.6,
      rim: 1,
    },
  );
  // Moss on the shoulder.
  form(
    g,
    blob([
      [25, 28],
      [30, 25],
      [33, 29],
      [28, 31],
    ]),
    'moss',
    {
      cx: 25,
      cy: 24,
      rx: 6,
      ry: 5,
      base: 2.2,
      k: 1.5,
      rim: 1,
    },
  );
  // The near arm flung out along the ground, the fist fallen open.
  T(
    [
      [26, 32],
      [34, 30],
      [40, 42],
      [34, 46],
    ],
    2.2,
  );
  T(
    [
      [34, 41],
      [52, 42],
      [54, 47],
      [34, 47],
    ],
    2.4,
  );
  T(
    [
      [52, 40],
      [60, 39],
      [63, 44],
      [61, 47],
      [52, 47],
    ],
    2.2,
  );
  for (const x of [55, 58, 61]) put(g, x, 41, cell('troll', 1));
  const out = outlineIn(g);
  return { grid: out, feet: { x: 46, y: lowest(out) } };
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
  if (id === 'marsh_troll') return trollLying();
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
