/**
 * Thistlewood Burrow's four smaller creatures at the C scale (B20): the spore
 * puff, the cap guard, the bramble hound and the lantern moth. Drawn whole,
 * facing right, from masses shaded as solids and lit from the upper left,
 * outlined in each material's darkest step, every part on a bone so each
 * walks, winds up, strikes, recoils and falls by moving its parts, and each
 * has the moves its rules give it as specials (`burrowSpecial`).
 *
 * Each is meant to be seen in the dark as much as in a lantern's pool: a dim
 * silhouette that still says what it is (a round puffball, a shield of cap, a
 * long thorny dog, spread wings), with one thing that keeps its light in the
 * dark (`NIGHT_EXEMPT`): the puff's glowing spores, the guard's gills, the
 * hound's ember eyes, the moth's glowing eyes and the dust of its wings.
 *
 * - **The spore puff**: a puffball the height of a man's knee on two stubby
 *   root feet, warty pale skin freckled with glowing spores, a vent on its
 *   crown, small cross eyes and a pursed mouth. Its telegraph is the swell:
 *   it fills up round, its vent opening and glowing, eyes wide.
 * - **The cap guard**: a mushroom soldier a head shorter than the hero, a
 *   pale stalk of a body with a ring at its waist, its own brown cap for a
 *   head with a stern face under the brim, holding before it a great red cap
 *   spotted white, wider than itself, as a shield. It lifts the shield high to
 *   bash (its telegraph), braces it low to block, and turns slowly.
 * - **The bramble hound**: a lean hound grown of briar, thorns along its back
 *   and tail, leaves for ears, ember eyes. It crouches with its thorns raised
 *   (its telegraph), charges low and stretched, and sticks fast nose-down in
 *   the ground where its charge ends.
 * - **The lantern moth**: a great dusky moth, a wingspan of a stride, eye
 *   spots on its forewings, feathery antennae, glowing eyes. It hovers, rears
 *   with its wings high (its telegraph), dives, and at a lantern wraps its
 *   wings over the flame to smother it.
 */
import { hash, put, tgrid, type TGrid } from '../town2/cells';
import { outlineIn } from '../figure2/engine';
import { cell, type Mat2 } from './cave';
import { lim, paint, poly, rod, shaped, sprite } from './kit';
import { mass, shade } from './beasts';

type Pt = readonly [number, number];
type Bones = Readonly<Record<string, Pt>>;

/** What a creature is doing in a frame: its bones moved, and what its face and parts are doing. */
export interface BurrowPose {
  readonly at?: Bones;
  /** The puff: how full it is (0 standing, 1 swollen to bursting), and squashed (a hop's landing, its blow). */
  readonly swell?: number;
  readonly squash?: number;
  /** Eyes: open, wide (the telegraph), shut (struck), out (down). */
  readonly eyes?: 'open' | 'wide' | 'shut' | 'out';
  readonly open?: boolean;
  /** Down and drawn lying (the last frame of the fall). */
  readonly down?: boolean;
  /** The moth's wings. */
  readonly wings?: 'up' | 'mid' | 'down' | 'back' | 'high' | 'wrap';
  /** The guard's shield: before it, raised high, bashing low, braced, or turned to the viewer. */
  readonly shield?: 'carry' | 'high' | 'bash' | 'brace' | 'front' | 'quarter' | 'dropped';
  /** The hound's thorns raised (its crouch), its body stretched (the charge), stuck nose-down. */
  readonly hackles?: boolean;
  readonly stretch?: number;
  readonly stuck?: boolean;
  /** Spores spraying from the puff: 0 none, 1 a jet, 2 bursting, 3 a husk with the last of them. */
  readonly spray?: number;
}

interface Creature {
  readonly w: number;
  readonly h: number;
  readonly anchor: { readonly x: number; readonly y: number };
  draw(g: TGrid, p: BurrowPose): void;
}

const at = (p: BurrowPose, bone: string): Pt => p.at?.[bone] ?? [0, 0];

/** A bead of an eye with a glint, or squeezed shut, or crossed out. */
function beadEye(g: TGrid, x: number, y: number, how: BurrowPose['eyes'], glow?: Mat2): void {
  if (how === 'shut') {
    put(g, x - 1, y, cell('tar', 4));
    put(g, x, y, cell('tar', 4));
    put(g, x + 1, y - 1, cell('tar', 4));
    return;
  }
  if (how === 'out') {
    put(g, x - 1, y - 1, cell('tar', 4));
    put(g, x + 1, y + 1, cell('tar', 4));
    put(g, x + 1, y - 1, cell('tar', 4));
    put(g, x - 1, y + 1, cell('tar', 4));
    return;
  }
  const big = how === 'wide';
  put(g, x, y, cell('eye', 4));
  put(g, x + 1, y, cell('eye', 4));
  put(g, x, y + 1, cell('eye', 4));
  put(g, x + 1, y + 1, cell('eye', 4));
  if (big) {
    put(g, x - 1, y, cell('eye', 4));
    put(g, x, y - 1, cell('eye', 4));
    put(g, x + 1, y - 1, cell('eye', 4));
  }
  put(g, x, y, glow ? cell(glow, 1) : cell('eye', 0));
}

/* ------------------------------------------------------------- spore puff */

/**
 * The spore puff, on a canvas 40 x 38, standing at (20, 36): a puffball 20
 * across and 18 tall at rest, knee high.
 */
const SPORE_PUFF: Creature = {
  w: 40,
  h: 38,
  anchor: { x: 20, y: 36 },
  draw(g, p) {
    const G = 35;
    const [bx, by] = at(p, 'body');
    const [lx, ly] = at(p, 'left');
    const [rx2, ry2] = at(p, 'right');
    const sw = 1 + (p.swell ?? 0) * 0.32 + (p.squash ?? 0) * 0.16;
    const sh = 1 + (p.swell ?? 0) * 0.26 - (p.squash ?? 0) * 0.2;
    if (p.down) {
      // An empty skin on the floor, wrinkled, its vent agape, the last spores drifting off it.
      shaped(
        g,
        poly([
          [6, G],
          [8, G - 4],
          [14, G - 6],
          [24, G - 6],
          [31, G - 4],
          [34, G],
        ]),
        'puff',
        {
          base: 2.6,
          contrast: 1.2,
          radius: 2,
          tex: (x, y, t) => ((x * 3 + y) % 7 === 0 ? t + 2 : t),
        },
      );
      sprite(g, 18, G - 7, ['.aa.', 'abba'], { a: ['puff', 4], b: ['shade', 3] });
      for (const [x, y] of [
        [16, G - 11],
        [22, G - 13],
        [19, G - 16],
        [25, G - 9],
      ] as const)
        put(g, x, y, cell('spore', 2));
      beadEye(g, 26, G - 4, 'out');
      return;
    }
    const rx = 10 * sw;
    const ry = 9 * sh;
    const cx = 20 + bx;
    const cy = G - 2 - ry + by;
    // Feet first: two stubby roots, toes splayed.
    for (const [fx, fy, dx] of [
      [14 + lx, ly, -1],
      [25 + rx2, ry2, 1],
    ] as const) {
      rod(g, fx, cy + ry * 0.6, fx + dx, G - 1 + fy, 3, 'root', [2, 3, 4]);
      sprite(g, fx + dx - 2, G + fy - 1, ['abbc'], {
        a: ['root', 2],
        b: ['root', 3],
        c: ['root', 4],
      });
    }
    // The body: a puffball, warty skin lit on its upper left, its underside in shade.
    mass(g, cx, cy, rx, ry, 'puff', { base: 2.2, k: 1.9, lo: 0 });
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 0.82) continue;
        // Warts: a lit pixel over a shaded one, scattered by place on the skin.
        const u = Math.floor((x - cx + 40) / 3);
        const v = Math.floor((y - cy + 40) / 3);
        if (hash(u, v, 1201) < 0.3 && (x - cx + 40) % 3 === 1 && (y - cy + 40) % 3 === 1) {
          put(g, x, y, cell('puff', 1));
          put(g, x + 1, y + 1, cell('puff', 4));
        }
      }
    shade(g, cx + 2, cy + ry * 0.75, rx * 0.8, ry * 0.3, 1);
    // Glowing spores freckling its crown: they show in the dark.
    for (const [dx, dy] of [
      [-5, -5],
      [-1, -7],
      [4, -6],
      [-7, -1],
      [6, -2],
    ] as const)
      put(g, Math.round(cx + dx * sw), Math.round(cy + dy * sh), cell('spore', 1));
    // The vent on its crown: a puckered ring, open and glowing as it swells.
    const vx = Math.round(cx - 1);
    const vy = Math.round(cy - ry + 1);
    const opened = (p.swell ?? 0) > 0.5 || (p.spray ?? 0) > 0;
    sprite(g, vx - 2, vy, opened ? ['.abba.', 'abccba', '.abba.'] : ['.aba.', '.bcb.'], {
      a: ['puff', 3],
      b: ['puff', 4],
      c: opened ? ['spore', 0] : ['shade', 3],
    });
    // The face, toward the front: small eyes under a cross brow, a pursed mouth.
    const ex = Math.round(cx + rx * 0.3);
    const ey = Math.round(cy - 1);
    beadEye(g, ex, ey, p.eyes ?? 'open');
    beadEye(g, ex + 5, ey, p.eyes ?? 'open');
    if ((p.eyes ?? 'open') !== 'wide') {
      put(g, ex - 1, ey - 2, cell('puff', 5));
      put(g, ex, ey - 2, cell('puff', 5));
      put(g, ex + 6, ey - 2, cell('puff', 5));
      put(g, ex + 7, ey - 3, cell('puff', 5));
    }
    if (p.open) sprite(g, ex + 2, ey + 3, ['ab', 'bb'], { a: ['shade', 2], b: ['shade', 3] });
    else sprite(g, ex + 2, ey + 3, ['ab'], { a: ['puff', 5], b: ['puff', 4] });
    // Spores spraying: a jet from the vent, or bursting from the whole of it.
    const spray = p.spray ?? 0;
    if (spray > 0) {
      const n = spray === 1 ? 14 : spray === 2 ? 34 : 10;
      for (let i = 0; i < n; i++) {
        const a =
          spray === 1
            ? -Math.PI / 2 + (hash(i, 1, 1202) - 0.5) * 1.4
            : hash(i, 2, 1202) * Math.PI * 2;
        const d = (spray === 1 ? 3 : rx * 0.8) + hash(i, 3, 1202) * (spray === 3 ? 16 : 10);
        const x = Math.round((spray === 1 ? vx : cx) + Math.cos(a) * d);
        const y = Math.round((spray === 1 ? vy : cy) + Math.sin(a) * d * (spray === 1 ? 1.2 : 0.8));
        put(g, x, y, cell('spore', i % 3 === 0 ? 0 : i % 3 === 1 ? 2 : 3));
      }
    }
  },
};

/* --------------------------------------------------------------- cap guard */

/** The guard's shield-cap: a great red dome spotted white, gills on its inner side. */
function shieldCap(g: TGrid, cx: number, cy: number, how: NonNullable<BurrowPose['shield']>): void {
  if (how === 'front' || how === 'quarter') {
    // Turned to the viewer: a round disc, its face domed, spots, its rim's gills showing low.
    const rx = how === 'front' ? 15 : 12;
    const ry = 15;
    mass(g, cx, cy, rx, ry, 'crimson', { base: 2.4, k: 1.8 });
    for (const [dx, dy, r] of [
      [-6, -7, 2.2],
      [3, -9, 1.8],
      [8, -2, 2],
      [-9, 2, 1.6],
      [0, 0, 2.4],
      [5, 7, 1.6],
      [-4, 8, 1.4],
    ] as const)
      mass(g, cx + dx * (rx / 15), cy + dy, r, r * 0.85, 'cream', { base: 1.4, k: 1 });
    return;
  }
  // Seen from the side: a tall dome bulging outward (to the right), gills on its inside.
  const ry = 19;
  const rx = 12;
  const tilt = how === 'high' ? -0.35 : how === 'bash' ? 0.3 : how === 'dropped' ? 1.4 : 0;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const a = -Math.PI / 2 + (i / 16) * Math.PI;
    pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
  }
  pts.push([-2.5, ry - 1], [-2.5, -ry + 1]);
  const rot = (x: number, y: number): [number, number] => [
    cx + x * Math.cos(tilt) - y * Math.sin(tilt),
    cy + x * Math.sin(tilt) + y * Math.cos(tilt),
  ];
  const outline = pts.map(([x, y]) => rot(x, y));
  shaped(g, poly(outline), 'crimson', { base: 2.6, contrast: 1.7, radius: 4 });
  // Its gills: pale ribs along the inner face, and a short stem stub where it was cut.
  for (let j = -ry + 3; j <= ry - 3; j += 2) {
    const [x0, y0] = rot(-2, j);
    const [x1, y1] = rot(0, j);
    put(g, Math.round(x0), Math.round(y0), cell('stalk', 3));
    put(g, Math.round(x1), Math.round(y1), cell('stalk', 5));
  }
  // White spots on its face, round on the domed side.
  for (const [u, v, r] of [
    [4, -9, 1.6],
    [6, -1, 1.8],
    [3, 7, 1.5],
    [7, 9, 1.2],
    [2, 0, 1.2],
    [4, 13, 1.2],
    [5, -14, 1.2],
  ] as const) {
    const [x, y] = rot(u, v);
    mass(g, x, y, r, r, 'cream', { base: 1.3, k: 1 });
  }
}

/** A stubby limb of stalk-flesh, lit on its upper left. */
const stub = (g: TGrid, x0: number, y0: number, x1: number, y1: number, w: number, far: boolean) =>
  rod(g, x0, y0, x1, y1, w, 'stalk', far ? [3, 4, 4, 5] : [1, 2, 3, 4]);

/**
 * The cap guard, on a canvas 64 x 84, standing at (30, 82): a stalk of a
 * body 60 tall with its cap, its shield-cap held before it (room above for
 * the shield lifted over its head).
 */
const CAP_GUARD: Creature = {
  w: 64,
  h: 84,
  anchor: { x: 30, y: 82 },
  draw(g, p) {
    const G = 81;
    const [bx, by] = at(p, 'body');
    const [hx, hy] = at(p, 'head');
    const [fx, fy] = at(p, 'front');
    const [kx, ky] = at(p, 'back');
    const [sx, sy] = at(p, 'shield');
    const shield = p.shield ?? 'carry';
    if (p.down) {
      // Fallen on its back: the stalk lying along the floor, its cap rolled to the left,
      // feet up at the right, the shield dropped face down beside it.
      paint(g, 14, G - 10, 30, 9, (_x, y) =>
        cell('stalk', y === G - 10 ? 1 : y < G - 6 ? 2 : y < G - 3 ? 3 : 4),
      );
      for (let x = 22; x < 30; x++) put(g, x, G - 10 + (x % 2), cell('stalk', 4));
      mass(g, 10, G - 9, 9, 7, 'umber', { base: 2.4, k: 1.8 });
      for (let y = G - 14; y < G - 3; y += 2) put(g, 17, y, cell('stalk', 5));
      beadEye(g, 20, G - 8, 'out');
      stub(g, 42, G - 7, 48, G - 14, 4, false);
      stub(g, 38, G - 8, 42, G - 16, 4, true);
      shieldCap(g, 52, G - 6, 'dropped');
      return;
    }
    const lean = shield === 'high' ? -2 : shield === 'bash' ? 3 : shield === 'brace' ? 2 : 0;
    const crouch = shield === 'brace' ? 4 : 0;
    const front = shield === 'front' || shield === 'quarter';
    // Legs: two short pale stumps, the far one darker, splayed feet.
    stub(g, 27 + kx + bx, G - 16 + crouch, 24 + kx, G - 2 + ky, 6, true);
    stub(g, 33 + fx + bx, G - 16 + crouch, 36 + fx, G - 2 + fy, 6, false);
    sprite(g, 20 + kx, G - 2 + ky, ['abbbc', 'ccccc'], {
      a: ['stalk', 3],
      b: ['stalk', 4],
      c: ['stalk', 5],
    });
    sprite(g, 33 + fx, G - 2 + fy, ['abbbc', 'ccccc'], {
      a: ['stalk', 1],
      b: ['stalk', 2],
      c: ['stalk', 4],
    });
    // The far arm (behind the body), reaching to the shield's grip.
    const gx = (front ? 30 : 42) + sx;
    const gy =
      (shield === 'high' ? 26 : shield === 'bash' ? 56 : shield === 'brace' ? 60 : 52) + sy;
    if (!front) stub(g, 27 + bx + lean, 42 + by + crouch, gx - 4, gy + 2, 4, true);
    // The body: a pale stalk, a little swollen at the foot, the skirt of a ring at the waist.
    const top = 34 + by + crouch;
    paint(g, 20 + bx, top, 22, G - 14 - top, (x, y) => {
      const t = (y - top) / (G - 14 - top);
      const lx = 30 + bx + Math.round(lean * (1 - t));
      const half = 6.5 + t * 2.2;
      const nx = (x + 0.5 - lx) / half;
      if (Math.abs(nx) > 1) return 0;
      const fibre = (x + y * 0.2) % 4 < 0.6 ? 1 : 0;
      return cell('stalk', lim(2.2 + nx * 1.5 + fibre * 0.5, 1, 5));
    });
    // The ring (annulus) round its waist, a frilled skirt hanging from it.
    const ry0 = top + 14;
    for (let x = 21 + bx + lean; x <= 39 + bx + lean; x++) {
      put(g, x, ry0, cell('stalk', 1));
      put(g, x, ry0 + 1, cell('stalk', x % 2 ? 3 : 2));
      put(g, x, ry0 + 2, cell('stalk', (x + 1) % 3 === 0 ? 5 : 4));
    }
    // Its head: its own cap, a broad brown dome, gills under the brim, the face beneath them.
    const hcx = 30 + bx + hx + lean;
    const hcy = top - 3 + hy;
    mass(g, hcx, hcy - 4, 14, 9, 'umber', { base: 2.3, k: 1.8, below: hcy });
    for (let x = hcx - 13; x <= hcx + 13; x++) {
      put(g, x, hcy + 1, cell('stalk', (x - hcx) % 2 ? 4 : 5));
      put(g, x, hcy + 2, cell('umber', 5));
    }
    // A few pale scales on the cap, and the glowing edge of its gills (shows in the dark).
    for (const [dx, dy] of [
      [-7, -8],
      [-2, -11],
      [4, -9],
      [8, -6],
      [-10, -4],
    ] as const)
      put(g, hcx + dx, hcy + dy, cell('cream', 2));
    for (let x = hcx - 10; x <= hcx + 10; x += 4) put(g, x, hcy + 1, cell('glowcap', 3));
    // The face: stern beads under a hard brow, a grim set mouth.
    const fxx = front ? hcx - 3 : hcx + 3;
    beadEye(g, fxx, hcy + 5, p.eyes ?? 'open');
    beadEye(g, fxx + 5, hcy + 5, p.eyes ?? 'open');
    // A hard straight brow over both: it is on duty.
    for (let i = -1; i <= 7; i++) put(g, fxx + i, hcy + 4, cell('stalk', 5));
    sprite(g, fxx + 1, hcy + 9, p.open ? ['abba', 'bccb'] : ['aaaa'], {
      a: ['stalk', 5],
      b: ['shade', 3],
      c: ['shade', 2],
    });
    // The shield-cap and the near arm gripping it.
    if (front) {
      shieldCap(g, 30 + bx + sx, 58 + by + sy, shield);
      stub(g, 22 + bx, 46 + by, 26 + bx, 56 + by, 4, false);
    } else {
      shieldCap(g, gx + 3, gy, shield);
      stub(g, 32 + bx + lean, 44 + by + crouch, gx - 1, gy + 3, 5, false);
      sprite(g, gx - 2, gy + 1, ['ab', 'bc'], {
        a: ['stalk', 1],
        b: ['stalk', 2],
        c: ['stalk', 4],
      });
    }
  },
};

/* ----------------------------------------------------------- bramble hound */

/**
 * A strand of briar from (x0, y0) to (x1, y1): a rod of stem, lit on top,
 * thorns pale along its upper side every few pixels.
 */
function strand(
  g: TGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  base: number,
  thorny: boolean,
  k: number,
): void {
  rod(
    g,
    x0,
    y0,
    x1,
    y1,
    w,
    'briar',
    [base, base + 1, base + 2].map((v) => Math.min(5, v)),
  );
  if (!thorny) return;
  const len = Math.hypot(x1 - x0, y1 - y0);
  for (let i = 3; i < len - 1; i += 4) {
    const t = i / len;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t) - Math.ceil(w / 2);
    if (hash(i, k, 1301) < 0.75) {
      put(g, x, y, cell('cream', 2));
      put(g, x + 1, y - 1, cell('cream', 1));
    }
  }
}

/**
 * Thorns along a briar silhouette's upper and outer edges: where a briar
 * pixel has nothing above it (or beside it), now and then a thorn juts out,
 * leaning back, its tip pale. Above `floor` only.
 */
function spines(g: TGrid, share: number, floor: number): void {
  const add: [number, number, number, number][] = [];
  for (let y = 1; y < floor; y++)
    for (let x = 1; x < g.w - 1; x++) {
      const c = g.d[y * g.w + x]!;
      if (!c || c >> 3 !== cell('briar', 0) >> 3) continue;
      const up = !g.d[(y - 1) * g.w + x];
      const side = !g.d[y * g.w + x - 1] || !g.d[y * g.w + x + 1];
      if (!up && !side) continue;
      if (hash(x, y, 1311) > share) continue;
      const dx = up ? -1 : !g.d[y * g.w + x - 1] ? -1 : 1;
      add.push([x, y, dx, up ? -1 : 0]);
    }
  for (const [x, y, dx, dy] of add) {
    put(g, x + dx * (dy ? 0 : 1), y + dy, cell('briar', 2));
    put(g, x + dx, y + dy * 2 + (dy ? 0 : -1), cell('cream', 1));
  }
}

/** A vine leg: a twisted stem from hip to foot, a clawed root of a paw. */
function vineLeg(
  g: TGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  near: boolean,
  bend = 0,
): void {
  const mx = (x0 + x1) / 2 + bend;
  const my = (y0 + y1) / 2;
  strand(g, x0, y0, mx, my, near ? 5 : 4, near ? 2 : 3, false, 0);
  strand(g, mx, my, x1, y1 - 1, near ? 3 : 3, near ? 2 : 3, false, 0);
  sprite(g, Math.round(x1) - 2, Math.round(y1) - 1, ['abbc', 'c.c.'], {
    a: ['root', near ? 2 : 3],
    b: ['root', near ? 3 : 4],
    c: ['root', 5],
  });
}

/**
 * The bramble hound, on a canvas 84 x 52, standing at (44, 50): a long lean
 * body of twisted briar, its back and tail thorny, its head long and low.
 */
const BRAMBLE_HOUND: Creature = {
  w: 84,
  h: 52,
  // Its feet point a little forward of its middle, so its long head is not over a hero at the stand.
  anchor: { x: 44, y: 50 },
  draw(g, p) {
    const G = 49;
    const [bx, by] = at(p, 'body');
    const [hx, hy] = at(p, 'head');
    const [fx, fy] = at(p, 'front');
    const [kx, ky] = at(p, 'hind');
    const st = p.stretch ?? 0;
    if (p.down) {
      // On its side, legs out, thorns limp, eyes out.
      shaped(
        g,
        poly([
          [14, G],
          [18, G - 9],
          [40, G - 12],
          [56, G - 9],
          [62, G],
        ]),
        'briar',
        {
          base: 3,
          contrast: 1.4,
          radius: 3,
          tex: (x, y, t) => ((x + y * 2) % 5 === 0 ? t + 1 : t),
        },
      );
      for (const [x0, x1] of [
        [22, 16],
        [28, 24],
        [48, 54],
        [52, 60],
      ] as const)
        strand(g, x0, G - 8, x1, G - 15, 3, 3, false, 0);
      shaped(
        g,
        poly([
          [58, G],
          [60, G - 8],
          [70, G - 8],
          [78, G - 3],
          [78, G],
        ]),
        'briar',
        { base: 2.6, contrast: 1.4, radius: 2 },
      );
      beadEye(g, 66, G - 6, 'out');
      strand(g, 14, G - 4, 4, G - 10, 3, 3, true, 9);
      return;
    }
    const sx = 1 + st * 0.12;
    const B = (x: number, y: number): [number, number] => [40 + (x - 40) * sx + bx, y + by];
    // The tail first: a whip of bramble curling up behind, thorny.
    const [t0x, t0y] = B(20, 24);
    strand(g, t0x, t0y, t0x - 9 - st * 3, t0y - 8 + st * 6, 4, 2, true, 3);
    strand(
      g,
      t0x - 9 - st * 3,
      t0y - 8 + st * 6,
      t0x - 14 - st * 4,
      t0y - 14 + st * 9,
      3,
      2,
      true,
      4,
    );
    // Far legs.
    const [hfx, hfy] = B(26, 30);
    const [ffx, ffy] = B(52, 30);
    vineLeg(g, hfx + 2, hfy, 24 + kx + 2, G + ky, false, -4);
    vineLeg(g, ffx + 2, ffy, 52 + fx + 3, G + fy, false, 2);
    // The body: strands twisted together along its length, the gaps between them dark.
    const body = poly([
      B(16, 22),
      B(24, 17),
      B(40, 16),
      B(52, 15),
      B(60, 19),
      B(60, 28),
      B(50, 33),
      B(34, 34),
      B(20, 31),
    ]);
    shaped(g, body, 'briar', {
      base: 2.6,
      contrast: 1.6,
      radius: 5,
      tex: (x, y, t) => {
        // Strands of briar twisted along its length: each lit along its top, a dark gap under it.
        const u = y - by + Math.round((x - bx) * 0.3) + Math.round(Math.sin(x * 0.33) * 1.6);
        const s = ((u % 5) + 5) % 5;
        return s === 0 ? t - 1.1 : s === 4 ? t + 1.7 : t;
      },
    });
    shade(g, 40 + bx, 32 + by, 16, 2, 1);
    // Thorns along the back, longer with its hackles up.
    const thorn = p.hackles ? 5 : 3;
    for (let i = 0; i < 9; i++) {
      const [x, y] = B(22 + i * 4.5, 18 - Math.sin((i / 8) * Math.PI) * 2.5);
      const lean = p.hackles ? -1 : -2;
      for (let j = 0; j < thorn; j++)
        put(
          g,
          Math.round(x + (j * lean) / 3),
          Math.round(y - j),
          cell(j === thorn - 1 ? 'cream' : 'briar', j === thorn - 1 ? 1 : 3 - (j > 1 ? 1 : 0)),
        );
    }
    // A few dark berries in the tangle of its flank.
    for (const [u, v] of [
      [30, 26],
      [44, 28],
      [38, 22],
    ] as const) {
      const [x, y] = B(u, v);
      put(g, Math.round(x), Math.round(y), cell('plum', 4));
      put(g, Math.round(x) - 1, Math.round(y) - 1, cell('plum', 2));
    }
    // Near legs.
    vineLeg(g, hfx - 1, hfy + 1, 28 + kx, G + ky, true, -4);
    vineLeg(g, ffx - 2, ffy + 1, 50 + fx, G + fy, true, 2);
    // Thorns all over its outline: a briar's silhouette is spiny, never smooth.
    spines(g, p.hackles ? 0.5 : 0.36, G - 6);
    // Leaf tufts along its shoulders and haunches, and a few dark berries.
    for (const [u, v] of [
      [26, 18],
      [48, 16],
      [55, 20],
      [20, 24],
    ] as const) {
      const [x, y] = B(u, v);
      sprite(g, Math.round(x) - 1, Math.round(y) - 2, ['.ab', 'abc', '.c.'], {
        a: ['leaf', 1],
        b: ['leaf', 2],
        c: ['leaf', 4],
      });
    }
    // The head: long, low and wolfish, of tighter briar, leaves for ears, ember eyes.
    const hb = (x: number, y: number): [number, number] => [x + hx + bx + st * 3, y + hy + by];
    const neck = poly([hb(54, 17), hb(62, 13), hb(66, 20), hb(60, 28), hb(54, 27)]);
    shaped(g, neck, 'briar', { base: 2.4, contrast: 1.5, radius: 3 });
    const head = poly([
      hb(60, 12),
      hb(68, 10),
      hb(76, 15),
      hb(81, 19),
      hb(80, 22),
      hb(70, 24),
      hb(62, 22),
    ]);
    shaped(g, head, 'briar', {
      base: 2,
      contrast: 1.6,
      radius: 3,
      tex: (x, y, t) => ((x + y) % 4 === 0 ? t + 1 : t),
    });
    // The jaw: thorn teeth, open as it bites.
    const [jx, jy] = hb(68, 22);
    if (p.open) {
      sprite(g, jx, jy, ['abcbcbcb', '.dddddd.', '..aaaaa.'], {
        a: ['briar', 4],
        b: ['cream', 1],
        c: ['crimson', 4],
        d: ['shade', 3],
      });
    } else sprite(g, jx, jy, ['abababa.'], { a: ['briar', 5], b: ['cream', 2] });
    // Leaf ears laid back (flat in the charge).
    const [ex, ey] = hb(64, 9);
    sprite(
      g,
      ex,
      ey - (st > 0 ? -2 : 0),
      st > 0 ? ['aabbb', '.bbcc'] : ['..aab', '.abbc', 'abbc.', 'bcc..'],
      {
        a: ['leaf', 2],
        b: ['leaf', 3],
        c: ['leaf', 5],
      },
    );
    // Ember eyes under a thorny brow: they keep their glow in the dark.
    const [ix, iy] = hb(72, 14);
    if (p.eyes === 'shut') sprite(g, ix, iy, ['aaa'], { a: ['briar', 6] });
    else if (p.eyes === 'out') beadEye(g, ix, iy, 'out');
    else {
      sprite(g, ix, iy, p.eyes === 'wide' ? ['abb', 'bbc'] : ['abc'], {
        a: ['ember', 1],
        b: ['ember', 3],
        c: ['ember', 4],
      });
    }
    put(g, Math.round(ix - 1), Math.round(iy - 1), cell('cream', 2));
    put(g, Math.round(ix + 2), Math.round(iy - 2), cell('cream', 1));
    if (p.stuck) {
      // Snagged: earth heaped round its buried muzzle, clods thrown up.
      const [nx, ny] = hb(78, 22);
      shaped(
        g,
        poly([
          [nx - 9, G],
          [nx - 6, ny - 1],
          [nx + 1, ny - 3],
          [nx + 5, G],
        ]),
        'soil',
        { base: 2.8, contrast: 1.5, radius: 3 },
      );
      for (const [dx, dy] of [
        [-10, -6],
        [-3, -9],
        [3, -7],
      ] as const)
        sprite(g, nx + dx, ny + dy, ['ab', 'bc'], {
          a: ['soil', 2],
          b: ['soil', 3],
          c: ['soil', 5],
        });
    }
  },
};

/* ----------------------------------------------------------- lantern moth */

/**
 * A wing seen from above, from its root on the body to its tip: a forewing
 * (a long blade, its leading edge straight, its outer edge scalloped) or a
 * hindwing (a rounder lobe), shaded as a thin solid with bands across it and
 * the dust of its scales; an eye spot on a forewing.
 */
function mothWing(g: TGrid, root: Pt, tip: Pt, fore: boolean, far: boolean, k: number): void {
  const [rx, ry] = root;
  const [tx, ty] = tip;
  const len = Math.hypot(tx - rx, ty - ry) || 1;
  // Along the wing (u) and across it (v), toward the body's tail.
  const ux = (tx - rx) / len;
  const uy = (ty - ry) / len;
  const vx = -uy;
  const vy = ux;
  // Which side of the wing is toward the tail: the one away from the head (+x).
  const back = vx < 0 || (vx === 0 && vy > 0) ? 1 : -1;
  const width = fore ? len * 0.5 : len * 0.6;
  const pts: [number, number][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // The leading edge: nearly straight, from the root out to the tip.
    pts.push([rx + ux * len * t, ry + uy * len * t]);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    // The trailing edge: a forewing broadest at its outer edge, cut square there (a moth's
    // delta), a hindwing a round lobe; scalloped along the outer edge.
    const sw = fore
      ? t ** 0.55 * (t > 0.86 ? Math.max(0, 1 - (t - 0.86) * 5) : 1)
      : Math.sin(Math.PI * Math.min(1, t * 0.95)) ** 0.55;
    const scallop = t > 0.4 ? Math.sin(t * 22) * 0.6 : 0;
    const d = (width * sw + scallop) * back;
    pts.push([rx + ux * len * t + vx * d, ry + uy * len * t + vy * d]);
  }
  shaped(g, poly(pts), 'mothwing', {
    base: far ? 3.3 : fore ? 2 : 2.6,
    contrast: 1,
    radius: 2,
    tex: (x, y, t) => {
      const along = ((x - rx) * ux + (y - ry) * uy) / len;
      // Bands across the wing, a darker margin near its edge, the dust of its scales.
      const band = Math.floor(along * 5) % 2 === 1 ? 0.7 : 0;
      return t + band + (along > 0.82 ? 0.8 : 0) + (hash(x, y, 1401 + k) < 0.05 ? 1 : 0);
    },
  });
  if (fore) {
    const sx = rx + ux * len * 0.58 + vx * width * 0.42 * back;
    const sy = ry + uy * len * 0.58 + vy * width * 0.42 * back;
    const r = Math.max(2, len * 0.13);
    mass(g, sx, sy, r + 1, r + 0.6, 'ochre', { base: far ? 3 : 2, k: 1 });
    mass(g, sx, sy, r * 0.55, r * 0.5, 'tar', { base: 3, k: 0.6 });
    put(g, Math.round(sx), Math.round(sy) - 1, cell('glowcap', 1));
  }
}

/**
 * The lantern moth, on a canvas 70 x 72, its feet point (34, 50) just under
 * its body. Seen from above as the floor is, its wings spread round it (a
 * stride across), body to the right: head, glowing eyes, feathered
 * antennae. Drawn low: its hover is the scene's (lane C lifts it), so its
 * `hover` is 0; a wing beating down reaches below its feet point, as a
 * bird's does below its perch.
 */
const LANTERN_MOTH: Creature = {
  w: 70,
  h: 72,
  anchor: { x: 34, y: 50 },
  draw(g, p) {
    const G = 49;
    const [bx, by] = at(p, 'body');
    if (p.down) {
      // On its back on the floor, wings flat out and crumpled, legs curled up, eyes out.
      mothWing(g, [26, G - 4], [14, G - 2], true, true, 1);
      mothWing(g, [30, G - 4], [44, G - 1], true, false, 2);
      mass(g, 29, G - 4, 8, 3.2, 'mothwing', { base: 1.8, k: 1.4 });
      for (const x of [25, 28, 31, 34]) {
        put(g, x, G - 8, cell('tar', 4));
        put(g, x + 1, G - 9, cell('tar', 4));
      }
      beadEye(g, 37, G - 5, 'out');
      return;
    }
    const w = p.wings ?? 'mid';
    const cx = 34 + bx;
    const cy = 42 + by;
    // Each wing's tip from the shoulder, by the beat: [far fore, far hind, near fore, near hind].
    const T: Readonly<Record<NonNullable<BurrowPose['wings']>, readonly Pt[]>> = {
      mid: [
        [-15, -25],
        [-22, -14],
        [-15, 25],
        [-22, 14],
      ],
      up: [
        [-5, -30],
        [-12, -22],
        [-4, -12],
        [-11, -9],
      ],
      down: [
        [-6, -11],
        [-14, -8],
        [-6, 28],
        [-15, 21],
      ],
      high: [
        [-1, -38],
        [-9, -30],
        [4, -32],
        [-4, -26],
      ],
      back: [
        [-25, -11],
        [-28, -5],
        [-25, 11],
        [-28, 5],
      ],
      wrap: [
        [18, -18],
        [5, -20],
        [18, 16],
        [5, 19],
      ],
    };
    const [ff, fh, nf, nh] = T[w];
    const root = (dy: number): Pt => [cx - 2, cy + dy];
    // The far wings (above the body as the floor is seen), darker, behind it.
    mothWing(g, root(-1), [cx + fh![0], cy + fh![1]], false, true, 1);
    mothWing(g, root(-2), [cx + ff![0], cy + ff![1]], true, true, 2);
    // The body: the abdomen's rings behind, the furred thorax, legs tucked under.
    paint(g, cx - 15, cy - 3, 14, 8, (x, y) => {
      const nx = (x + 0.5 - (cx - 8)) / 7.5;
      const ny = (y + 0.5 - (cy + 1)) / 3.4;
      if (nx * nx + ny * ny > 1) return 0;
      const ring = (x - cx + 40) % 3 === 0;
      return cell('mothwing', lim(1.8 + ny * 1.4 + (ring ? 1 : 0), 1, 5));
    });
    mass(g, cx, cy, 5.5, 5, 'mothwing', { base: 1, k: 1.5, lo: 0, tex: 'fur', k2: 4 });
    // The near wings, over the body.
    mothWing(g, root(1), [cx + nh![0], cy + nh![1]], false, false, 3);
    mothWing(g, root(2), [cx + nf![0], cy + nf![1]], true, false, 4);
    // The head: a furred knob, two great glowing eyes, feathered antennae swept forward and up.
    const hx = cx + 6;
    mass(g, hx, cy, 3.4, 3.2, 'mothwing', { base: 1.2, k: 1.3, tex: 'fur', k2: 5 });
    if (p.eyes === 'shut') sprite(g, hx, cy - 2, ['aa.', '.aa'], { a: ['tar', 5] });
    else
      sprite(g, hx + 1, cy - 2, p.eyes === 'wide' ? ['abb', 'bbc', '.c.'] : ['ab', 'bc'], {
        a: ['ember', 0],
        b: ['ember', 2],
        c: ['ember', 4],
      });
    for (const s of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const x = hx + 3 + Math.round(i * 0.95);
        const y = cy - 2 + s * (1 + Math.round(i * 0.55)) - Math.round(i * 0.35);
        put(g, x, y, cell('mothwing', s < 0 ? 4 : 3));
        if (i > 1 && i % 2 === 0) {
          put(g, x - 1, y - 1, cell('mothwing', s < 0 ? 5 : 4));
          put(g, x - 1, y + 1, cell('mothwing', 5));
        }
      }
    }
    // Its wings' dust, shed as it rears or smothers: glowing motes (they show in the dark).
    if (w === 'wrap' || w === 'high')
      for (let i = 0; i < 8; i++)
        put(
          g,
          Math.round(cx - 4 + hash(i, 1, 1402) * 20),
          Math.round(cy + 4 + hash(i, 2, 1402) * 12),
          cell('glowcap', 2),
        );
  },
};

/* ------------------------------------------------------------------ poses */

type Drawn = 'idle' | 'walk' | 'windup' | 'strike' | 'hurt' | 'fall';

const PUFF_KEYS: Readonly<Record<Drawn, readonly BurrowPose[]>> = {
  idle: [{}, { squash: 0.15, at: { body: [0, 1] } }],
  walk: [
    { at: { body: [0, -2], left: [-1, -2], right: [1, 0] } },
    { squash: 0.3, at: { body: [0, 1] } },
    { at: { body: [0, -2], left: [1, 0], right: [-1, -2] } },
    { squash: 0.3, at: { body: [0, 1] } },
  ],
  windup: [{ swell: 1, eyes: 'wide', open: true, at: { body: [0, -1] } }],
  strike: [{ squash: 1, spray: 1, open: true, at: { body: [0, 2] } }],
  hurt: [{ squash: 0.4, eyes: 'shut', at: { body: [-3, 1], left: [-2, 0], right: [-1, 0] } }],
  fall: [{ squash: 0.8, eyes: 'out', spray: 3, at: { body: [0, 3] } }, { down: true }],
};

const GUARD_KEYS: Readonly<Record<Drawn, readonly BurrowPose[]>> = {
  idle: [{}, { at: { body: [0, 1], head: [0, 0], shield: [0, 1] } }],
  walk: [
    { at: { front: [2, -1], back: [-2, 0], body: [0, 0], shield: [1, 0] } },
    { at: { body: [0, -1], shield: [0, -1] } },
    { at: { front: [-2, 0], back: [2, -1], body: [0, 0], shield: [-1, 0] } },
    { at: { body: [0, -1], shield: [0, -1] } },
  ],
  // The telegraph: the shield lifted high over its head, the body rocked back on its heels.
  windup: [
    {
      shield: 'high',
      eyes: 'wide',
      open: true,
      at: { body: [-2, 0], front: [1, 0], back: [-2, 0], shield: [-2, 0] },
    },
  ],
  strike: [
    {
      shield: 'bash',
      open: true,
      at: { body: [3, 1], front: [5, 0], back: [-1, 0], shield: [6, 0] },
    },
  ],
  hurt: [{ eyes: 'shut', at: { body: [-3, 0], head: [-1, 0], shield: [-2, -1], front: [-1, 0] } }],
  fall: [
    { eyes: 'out', shield: 'bash', at: { body: [-2, 3], head: [-2, 2], shield: [0, 8] } },
    { down: true },
  ],
};

const HOUND_KEYS: Readonly<Record<Drawn, readonly BurrowPose[]>> = {
  idle: [{}, { at: { body: [0, 1], head: [0, 1] } }],
  walk: [
    { at: { front: [3, -2], hind: [-3, 0], body: [0, 0] } },
    { at: { front: [0, 0], hind: [0, -2], body: [0, -1], head: [0, -1] } },
    { at: { front: [-3, 0], hind: [3, -2], body: [0, 0] } },
    { at: { front: [0, -2], hind: [0, 0], body: [0, -1], head: [0, -1] } },
  ],
  // The telegraph: crouched low, haunches up, head down and forward, thorns raised, eyes blazing.
  windup: [
    {
      hackles: true,
      eyes: 'wide',
      at: { body: [-2, 4], head: [-1, 7], front: [-2, 0], hind: [-2, 0] },
    },
  ],
  strike: [
    { open: true, eyes: 'wide', at: { body: [3, 1], head: [3, 2], front: [6, -2], hind: [0, 0] } },
  ],
  hurt: [{ eyes: 'shut', at: { body: [-3, 0], head: [-4, -2], front: [-2, 0], hind: [-1, 0] } }],
  fall: [
    { eyes: 'out', at: { body: [-2, 4], head: [-3, 6], front: [-1, 0], hind: [0, 0] } },
    { down: true },
  ],
};

const MOTH_KEYS: Readonly<Record<Drawn, readonly BurrowPose[]>> = {
  idle: [{ wings: 'up' }, { wings: 'down', at: { body: [0, 1] } }],
  walk: [
    { wings: 'up', at: { body: [0, -1] } },
    { wings: 'mid' },
    { wings: 'down', at: { body: [0, 1] } },
    { wings: 'mid' },
  ],
  // The telegraph: reared back, wings raised high and wide, eyes blazing.
  windup: [{ wings: 'high', eyes: 'wide', at: { body: [-3, -3] } }],
  strike: [{ wings: 'back', eyes: 'wide', at: { body: [4, 2] } }],
  hurt: [{ wings: 'down', eyes: 'shut', at: { body: [-3, -1] } }],
  fall: [{ wings: 'down', eyes: 'out', at: { body: [0, 5] } }, { down: true }],
};

/** The specials, by id: each move the rules give it beyond the common poses. */
export const BURROW_SPECIALS: Readonly<
  Record<string, Readonly<Record<string, readonly BurrowPose[]>>>
> = {
  spore_puff: {
    // Filling up round before it bursts (its heavy blow), trembling at the last.
    swell: [
      { swell: 0.35, eyes: 'wide' },
      { swell: 0.7, eyes: 'wide', open: true },
      { swell: 1, eyes: 'wide', open: true, at: { body: [1, -1] } },
    ],
    // Its fall's burst: the skin splitting, spores everywhere, then the husk.
    burst: [
      { swell: 1.1, spray: 2, eyes: 'out' },
      { squash: 0.9, spray: 2, eyes: 'out', at: { body: [0, 3] } },
      { down: true },
    ],
  },
  cap_guard: {
    // Every blow from in front glances off: braced low behind the shield.
    block: [{ shield: 'brace', eyes: 'open', at: { shield: [-2, 0], body: [-1, 0] } }],
    // Turning to face him, slowly: through three-quarters to front-on.
    turn: [{ shield: 'quarter' }, { shield: 'front' }],
  },
  bramble_hound: {
    crouch: [
      {
        hackles: true,
        eyes: 'wide',
        at: { body: [-2, 4], head: [-1, 7], front: [-2, 0], hind: [-2, 0] },
      },
      {
        hackles: true,
        eyes: 'wide',
        at: { body: [-2, 5], head: [-1, 8], front: [-2, 0], hind: [-2, 0] },
      },
    ],
    // The charge: low and stretched, a gallop of four frames, ears laid flat.
    charge: [
      {
        stretch: 1,
        eyes: 'wide',
        at: { body: [0, 2], head: [2, 4], front: [7, -3], hind: [-6, 0] },
      },
      {
        stretch: 1,
        eyes: 'wide',
        at: { body: [0, 1], head: [2, 3], front: [2, 0], hind: [-1, -2] },
      },
      {
        stretch: 1,
        eyes: 'wide',
        at: { body: [0, 2], head: [2, 4], front: [-4, 0], hind: [5, -1] },
      },
      {
        stretch: 1,
        eyes: 'wide',
        at: { body: [0, 0], head: [2, 2], front: [3, -2], hind: [1, 0] },
      },
    ],
    // Stuck fast where it stopped, its muzzle buried, its hind legs scrabbling.
    stuck: [
      {
        stuck: true,
        eyes: 'shut',
        at: { body: [1, 4], head: [2, 13], front: [4, 0], hind: [-2, -2] },
      },
      {
        stuck: true,
        eyes: 'shut',
        at: { body: [1, 3], head: [2, 13], front: [4, 0], hind: [2, 0] },
      },
    ],
  },
  lantern_moth: {
    // At a lantern: hovering beside its flame, beating hard.
    hover: [
      { wings: 'up' },
      { wings: 'mid', at: { body: [0, 1] } },
      { wings: 'down', at: { body: [0, 1] } },
      { wings: 'mid' },
    ],
    // Smothering the flame: its wings wrapped forward over it, dust falling.
    snuff: [
      { wings: 'mid', eyes: 'wide', at: { body: [2, 0] } },
      { wings: 'wrap', eyes: 'wide', at: { body: [3, 1] } },
      { wings: 'wrap', at: { body: [3, 2] } },
    ],
  },
};

const CREATURES: Readonly<
  Record<string, readonly [Creature, Readonly<Record<Drawn, readonly BurrowPose[]>>]>
> = {
  spore_puff: [SPORE_PUFF, PUFF_KEYS],
  cap_guard: [CAP_GUARD, GUARD_KEYS],
  bramble_hound: [BRAMBLE_HOUND, HOUND_KEYS],
  lantern_moth: [LANTERN_MOTH, MOTH_KEYS],
};

/** The four smaller creatures' ids. */
export const BURROW_CREATURE_IDS: readonly string[] = Object.keys(CREATURES);

/** How many frames each drawn pose has, for one of them; null for any other id. */
export function burrowFrames(id: string): Readonly<Record<Drawn, number>> | null {
  const c = Object.hasOwn(CREATURES, id) ? CREATURES[id] : undefined;
  if (!c) return null;
  const k = c[1];
  return {
    idle: k.idle.length,
    walk: k.walk.length,
    windup: k.windup.length,
    strike: k.strike.length,
    hurt: k.hurt.length,
    fall: k.fall.length,
  };
}

function drawPose(c: Creature, p: BurrowPose): { grid: TGrid; feet: { x: number; y: number } } {
  const g = tgrid(c.w, c.h);
  c.draw(g, p);
  return { grid: outlineIn(g), feet: { ...c.anchor } };
}

/** A drawn frame of one of them facing right: its grid and where it stands; null for an unknown id. */
export function burrowFrame(
  id: string,
  pose: Drawn,
  frame: number,
): { grid: TGrid; feet: { x: number; y: number } } | null {
  const c = Object.hasOwn(CREATURES, id) ? CREATURES[id] : undefined;
  if (!c || !Object.hasOwn(c[1], pose)) return null;
  const keys = c[1][pose];
  const f = ((Math.floor(frame) % keys.length) + keys.length) % keys.length;
  return drawPose(c[0], keys[f]!);
}

/** A special of one of them (`BURROW_SPECIALS`) facing right, at a frame; null if it has none by that name. */
export function burrowSpecialFrame(
  id: string,
  special: string,
  frame: number,
): { grid: TGrid; feet: { x: number; y: number } } | null {
  const c = Object.hasOwn(CREATURES, id) ? CREATURES[id] : undefined;
  const moves = Object.hasOwn(BURROW_SPECIALS, id) ? BURROW_SPECIALS[id] : undefined;
  const keys = moves && Object.hasOwn(moves, special) ? moves[special] : undefined;
  if (!c || !keys) return null;
  const f = ((Math.floor(frame) % keys.length) + keys.length) % keys.length;
  return drawPose(c[0], keys[f]!);
}
