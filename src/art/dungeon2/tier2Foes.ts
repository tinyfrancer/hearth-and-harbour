/**
 * Tier 2's creatures at the C scale (B19, docs/tier2-manifest.md): the
 * black bear, the dire wolf and the hill ogre of Thistlewood's Edge and the
 * moss golem of the Deepthorn. Drawn as the grotto's and the idle game's
 * creatures are (beasts.ts): masses shaded as solids, lit from the upper left,
 * fur in strokes, a seam where a part lies over the same stuff, features
 * placed by hand, every mass on a bone so they walk, wind up, strike, recoil
 * and fall.
 *
 * Size carries threat: the bear a heavy body at the hero's chest, the dire
 * wolf a wolf the size of a pony (the grey wolf's own shape drawn again at
 * 1.3 times, natively, not scaled up), the ogre two heads over the hero, the
 * golem a little less and twice as broad.
 *
 * The cast's machinery (cast2.ts) asks `TIER2_BEASTS` before beasts.ts, so
 * neither module imports the other's table.
 */
import { hash, put, tgrid, type TGrid } from '../town2/cells';
import { cell } from './cave';
import type { Mat2 as Mat } from './cave';
import { outlineIn } from '../figure2/engine';
import { furTex, lim, paint, poly, rod, seam, shaped, shifted, sprite } from './kit';
import {
  WOLF_BODY,
  WOLF_HEAD,
  WOLF_TAIL,
  eye,
  mass,
  shade,
  upturned,
  type Beast,
  type BeastPose,
} from './beasts';

type Pt = readonly [number, number];

/** A thick limb from (x0, y0) to (x1, y1) in `mat`, tapering, lit on its upper left. */
function limb(
  g: TGrid,
  mat: Mat,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w0: number,
  w1: number,
  base: number,
): (x: number, y: number) => boolean {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const inside = poly([
    [x0 - (nx * w0) / 2, y0 - (ny * w0) / 2],
    [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2],
    [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2],
    [x0 + (nx * w0) / 2, y0 + (ny * w0) / 2],
  ]);
  shaped(g, inside, mat, { base, contrast: 1.6, radius: Math.min(w0, w1) / 2 });
  return inside;
}

/** A heavy leg down to a paw with pale claws, its far side in shade. */
function bearLeg(
  g: TGrid,
  x0: number,
  y0: number,
  x1: number,
  ground: number,
  near: boolean,
): void {
  limb(g, 'bear', x0, y0, x1, ground - 2, 8, 7, near ? 2.8 : 3.8);
  sprite(g, x1 - 4, ground - 2, ['.aabbb.', 'abbbbcc', 'c.c.c..'], {
    a: ['bear', near ? 2 : 3],
    b: ['bear', near ? 3 : 4],
    c: ['cream', near ? 2 : 3],
  });
}

/* ------------------------------------------------------------- the black bear */

/**
 * The black bear: a heavy round body on short thick legs, a hump of muscle
 * over the shoulders, the head low, small round ears, a brown muzzle with a
 * wet black nose, small cross eyes under a frowning brow.
 */
const BLACK_BEAR: Beast = {
  w: 88,
  h: 51,
  anchor: { x: 38, y: 49 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const [fx, fy] = o('front');
    const [kx, ky] = o('hind');
    // Far legs, in shade.
    bearLeg(g, 56 + fx + bx, 32 + by, 57 + fx, 48 + fy, false);
    bearLeg(g, 21 + kx + bx, 32 + by, 20 + kx, 48 + ky, false);
    // The body: the rump, the barrel and the hump over the shoulders, fur in strokes.
    mass(g, 17 + bx, 30 + by, 10, 11, 'bear', { base: 3, tex: 'fur', below: 41 + by, k2: 1 });
    mass(g, 31 + bx, 30 + by, 17, 12, 'bear', { base: 3, tex: 'fur', below: 42 + by, k2: 2 });
    mass(g, 48 + bx, 26 + by, 13, 14, 'bear', { base: 2.6, tex: 'fur', below: 41 + by, k2: 3 });
    shade(g, 34 + bx, 41 + by, 16, 2, 1);
    // A short tail.
    sprite(g, 6 + bx, 25 + by, ['.ab', 'abb', '.bc'], {
      a: ['bear', 2],
      b: ['bear', 3],
      c: ['bear', 4],
    });
    // Near legs, lit.
    bearLeg(g, 26 + kx + bx, 33 + by, 25 + kx, 48 + ky, true);
    bearLeg(g, 52 + fx + bx, 33 + by, 53 + fx, 48 + fy, true);
    // The head, low and forward, with its ears.
    for (const [x, s] of [
      [59, 3],
      [66, 2.4],
    ] as const) {
      mass(g, x + hx, 17 + hy, 3.4, 3.4, 'bear', { base: s });
      put(g, x + hx, 17 + hy, cell('umber', 4));
    }
    mass(g, 64 + hx, 26 + hy, 10, 8.5, 'bear', { base: 2.4, tex: 'fur', k2: 5 });
    // The muzzle, brown, a nose like a wet stone.
    mass(g, 73 + hx, 29 + hy, 6, 4.6, 'umber', { base: 2.2, k: 1.6 });
    sprite(g, 77 + hx, 26 + hy, ['abb', 'bbc'], {
      a: ['tar', 1],
      b: ['tar', 3],
      c: ['tar', 5],
    });
    // A frowning brow over a small eye with a hot glint.
    rod(g, 63 + hx, 21 + hy, 70 + hx, 23 + hy, 1, 'bear', [5]);
    if (p.down) sprite(g, 66 + hx, 24 + hy, ['aaa'], { a: ['bear', 6] });
    else eye(g, 67 + hx, 23 + hy, 'bead');
    // The mouth: a line, or open to the back teeth when it strikes.
    if (p.open)
      sprite(g, 69 + hx, 32 + hy, ['aaaaaaaa', 'bcbcbcb.', 'ddddddd.', '.c.c.c..'], {
        a: ['tar', 4],
        b: ['crimson', 4],
        c: ['cream', 0],
        d: ['shade', 3],
      });
    else sprite(g, 69 + hx, 32 + hy, ['aaaaaaa'], { a: ['tar', 4] });
  },
};

/* ------------------------------------------------------------- the dire wolf */

/** How much bigger the dire wolf is than the grey wolf, drawn natively at that size. */
const K = 1.3;
const big = (pts: readonly Pt[], dx: number, dy: number): [number, number][] =>
  pts.map(([x, y]) => [x * K + dx, y * K + dy]);

/** A dire wolf's leg: thicker than the grey wolf's, a heavy paw, the hind one bent at the hock. */
function direLeg(g: TGrid, x: number, y: number, ground: number, near: boolean, hock = 0): void {
  const len = ground - y;
  for (let j = 0; j < len; j++) {
    const k = j / len;
    const w = k < 0.35 ? 7 : 5;
    const dx = hock
      ? Math.round(
          hock * Math.sin(Math.min(1, k / 0.55) * Math.PI * 0.5) -
            (k > 0.55 ? hock * ((k - 0.55) / 0.45) : 0),
        )
      : 0;
    for (let i = 0; i < w; i++) {
      const s = (near ? 1 : 3) + (i === 0 ? -1 : i === w - 1 ? 1 : 0) + (k > 0.4 ? 1 : 0);
      put(g, x + i - 2 - dx, y + j, cell('direfur', lim(s, 1, 5)));
    }
  }
  sprite(g, x - 3, ground - 1, ['abbbc', '.cccd'], {
    a: ['direfur', near ? 2 : 3],
    b: ['direfur', near ? 3 : 4],
    c: ['direfur', 5],
    d: ['direfur', 5],
  });
}

/**
 * The dire wolf: the grey wolf's lean shape drawn again at a pony's size in
 * shaggy charcoal, its ruff a thick mane over the shoulders and down the
 * throat, scars across the muzzle, pale eyes, a heavier brow.
 */
const DIRE_WOLF: Beast = {
  w: 98,
  h: 60,
  anchor: { x: 42, y: 58 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const [fx, fy] = o('front');
    const [kx, ky] = o('hind');
    const G = 57;
    shaped(g, poly(big(WOLF_TAIL, bx, by)), 'direfur', {
      base: 2.2,
      contrast: 1.6,
      radius: 4,
      tex: (x, y, t) => (y - by > 41 ? t + 2 : furTex(4, -0.6, 0.25)(x - bx, y - by, t)),
    });
    direLeg(g, Math.round(44 * K) + fx, Math.round(28 * K) + by, G + fy, false);
    direLeg(g, Math.round(15 * K) + kx, Math.round(26 * K) + by, G + ky, false, 4);
    shaped(g, poly(big(WOLF_BODY, bx, by)), 'direfur', {
      base: 1.2,
      lo: 1,
      contrast: 1.6,
      radius: 8,
      tex: (x, y, t) => {
        const ly = (y - by) / K;
        const lx = (x - bx) / K;
        const saddle = ly < 21 - (lx > 36 ? 3 : 0) ? 1 : 0;
        const belly = ly > 25 + (lx < 30 ? 1 : 0) ? -0.6 : 0;
        return furTex(6, 0.8, 0.26)(x - bx, y - by, t + saddle + belly);
      },
    });
    // The mane: ragged fur standing up over the shoulders, two rows deep.
    for (let x = 46; x <= 64; x++) {
      const top = Math.round(by + 17 - (x - 46) * 0.12 - (x % 3 === 1 ? 2 : x % 3 === 2 ? 1 : 0));
      put(g, x + bx, top, cell('direfur', x % 2 ? 2 : 3));
      put(g, x + bx, top + 1, cell('direfur', 3));
      if (x % 3 === 1) put(g, x + bx, top - 1, cell('direfur', 4));
    }
    shade(g, 39 + bx, 38 + by, 18, 2, 1);
    direLeg(g, Math.round(20 * K) + kx, Math.round(26 * K) + by, G + ky, true, 4);
    direLeg(g, Math.round(47 * K) + fx, Math.round(28 * K) + by, G + fy, true);
    const head = poly(big(WOLF_HEAD, hx, hy));
    shaped(g, head, 'direfur', {
      base: 0.8,
      lo: 0,
      contrast: 1.7,
      radius: 5,
      tex: (x, y, t) =>
        (y - hy) / K > 19 && (x - hx) / K > 52 ? t - 1 : furTex(8, 0.2, 0.16)(x - hx, y - hy, t),
    });
    seam(g, head, 1);
    // The mane down the throat, shaggy.
    for (let i = 0; i < 9; i++) {
      const x = 61 + hx + (i % 3);
      const y = 25 + hy + i;
      put(g, x, y, cell('direfur', 3 + (i % 2)));
      put(g, x - 1, y + 1, cell('direfur', 4));
    }
    // Ears, pricked and torn.
    sprite(
      g,
      65 + hx,
      8 + hy,
      ['.a....', '.ab...', 'aabb..', 'acbb..', 'acdb..', 'acdbb.', '.bbbe.'],
      {
        a: ['direfur', 1],
        b: ['direfur', 3],
        c: ['direfur', 4],
        d: ['direfur', 5],
        e: ['direfur', 5],
      },
    );
    sprite(g, 71 + hx, 9 + hy, ['.a..', 'aab.', 'abb.', 'acbb', 'acbb', '.bbd'], {
      a: ['direfur', 2],
      b: ['direfur', 4],
      c: ['direfur', 5],
      d: ['direfur', 5],
    });
    // A heavy brow over a pale eye.
    sprite(g, 72 + hx, 14 + hy, ['aaaa..', 'abca..', '.aa...'], {
      a: ['direfur', 5],
      b: ['cream', 0],
      c: ['eye', 4],
    });
    if (p.down) sprite(g, 73 + hx, 15 + hy, ['aaa'], { a: ['direfur', 6] });
    // Two pale scars across the muzzle.
    for (const [x, y] of [
      [77, 18],
      [78, 19],
      [79, 20],
      [80, 18],
      [81, 19],
    ] as const)
      put(g, x + hx, y + hy, cell('direfur', 1));
    sprite(g, 85 + hx, 20 + hy, ['abb', 'bbb'], { a: ['tar', 2], b: ['tar', 4] });
    if (p.open)
      sprite(
        g,
        72 + hx,
        26 + hy,
        ['aaaaaaaaaaa.', 'bwbwbwbwbw..', 'cccccccc....', '.w.w.w.w....'],
        { a: ['tar', 4], b: ['crimson', 4], c: ['shade', 3], w: ['cream', 0] },
      );
    else
      sprite(g, 72 + hx, 26 + hy, ['aaaaaaaaaaa', '.w.w.ww.w..'], {
        a: ['tar', 4],
        w: ['cream', 0],
      });
  },
};

/* --------------------------------------------------------------- the hill ogre */

const OGRE_BODY: readonly Pt[] = [
  [30, 38],
  [38, 30],
  [52, 28],
  [64, 32],
  [70, 44],
  [72, 60],
  [68, 74],
  [56, 82],
  [40, 82],
  [28, 74],
  [24, 60],
  [26, 46],
];
const OGRE_HEAD: readonly Pt[] = [
  [42, 15],
  [49, 8],
  [59, 8],
  [66, 15],
  [67, 25],
  [63, 32],
  [50, 33],
  [43, 28],
];

/**
 * The hill ogre: two heads over the hero, upright and slow, a great pot belly
 * over a hide loincloth on a rope, short thick legs, a small bald head with a
 * single tooth sticking up from his lip, tiny eyes, a nose like a turnip, a
 * tree-trunk club on his shoulder.
 */
const HILL_OGRE: Beast = {
  w: 96,
  h: 104,
  anchor: { x: 46, y: 102 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const [ax, ay] = o('arms');
    const [lx, ly] = o('legs');
    // The far arm, behind, in shade, its fist by the hip.
    limb(g, 'ogre', 64 + bx, 36 + by, 72 + ax, 56 + ay, 13, 11, 3.6);
    limb(g, 'ogre', 72 + ax, 56 + ay, 70 + ax, 72 + ay, 11, 10, 3.6);
    shaped(g, (x, y) => Math.hypot(x - 70 - ax, (y - 75 - ay) * 1.1) < 6, 'ogre', {
      base: 3.4,
      contrast: 1.6,
      radius: 3,
    });
    // Short thick legs on broad feet.
    limb(g, 'ogre', 54 + bx + lx, 76 + by, 56 + lx, 97 + ly, 15, 13, 3.2);
    limb(g, 'ogre', 36 + bx - lx, 76 + by, 34 - lx, 97 + ly, 16, 13, 2.4);
    for (const [x, d, s] of [
      [50 + lx, ly, 3],
      [26 - lx, ly, 2.2],
    ] as const)
      shaped(
        g,
        poly([
          [x, 96 + d],
          [x + 15, 96 + d],
          [x + 18, 100 + d],
          [x + 17, 102],
          [x - 1, 102],
          [x - 1, 98 + d],
        ]),
        'ogre',
        { base: s, contrast: 1.5, radius: 2, hi: 5 },
      );
    // The pot belly, paler where it bulges, a few hairs and pits.
    shaped(g, poly(shifted(OGRE_BODY, bx, by)), 'ogre', {
      base: 2.5,
      contrast: 2.1,
      radius: 13,
      tex: (x, y, t) => {
        const lx2 = x - bx;
        const ly2 = y - by;
        const pit = hash(Math.floor(lx2 / 2), Math.floor(ly2 / 2), 91);
        const belly = Math.hypot((lx2 - 48) / 17, (ly2 - 62) / 14) < 1 ? -0.9 : 0;
        return t + belly + (pit < 0.06 ? 1 : 0);
      },
    });
    put(g, 49 + bx, 63 + by, cell('ogre', 5));
    put(g, 50 + bx, 63 + by, cell('ogre', 4));
    // A loincloth of hide on a rope, ragged at its hem.
    paint(g, 28 + bx, 76 + by, 42, 12, (x, y) => {
      const r = x - 28 - bx;
      const hem = 82 + by + Math.round(Math.sin(r * 0.8) * 1.5 + (r > 14 && r < 26 ? 4 : 0));
      if (y > hem) return 0;
      if (y === 76 + by) return cell('linen', r % 3 === 0 ? 3 : 2);
      return cell(
        'hide',
        (y === 77 + by ? 2 : 3) + (r > 28 ? 1 : 0) + (hash(r, y, 93) < 0.1 ? 1 : 0),
      );
    });
    // The head, small on the great body, bald, its ears out.
    const head = poly(shifted(OGRE_HEAD, hx, hy));
    shaped(g, head, 'ogre', { base: 1.9, contrast: 1.9, radius: 6 });
    seam(g, head, 2);
    for (const [x, rows] of [
      [38, ['.aa', 'abb', 'abc', '.bc', '..c']],
      [66, ['aa.', 'bba', 'cba', 'cb.', 'c..']],
    ] as const)
      sprite(g, x + hx, 17 + hy, rows, { a: ['ogre', 2], b: ['ogre', 3], c: ['ogre', 4] });
    // The crown's light, a dent, a few hairs.
    sprite(g, 50 + hx, 10 + hy, ['aab', '.a.'], { a: ['ogre', 0], b: ['ogre', 1] });
    // Brows low, tiny eyes.
    rod(g, 47 + hx, 18 + hy, 53 + hx, 19 + hy, 2, 'ogre', [4, 5]);
    rod(g, 57 + hx, 19 + hy, 63 + hx, 18 + hy, 2, 'ogre', [4, 5]);
    if (p.down) sprite(g, 49 + hx, 21 + hy, ['aaa...aaa'], { a: ['ogre', 6] });
    else sprite(g, 50 + hx, 21 + hy, ['ab.....ab'], { a: ['gold', 1], b: ['eye', 4] });
    // A nose like a turnip.
    shaped(g, (x, y) => Math.hypot(x - 56 - hx, (y - 24 - hy) * 1.1) < 3.4, 'ogre', {
      base: 1.8,
      contrast: 2,
      radius: 2,
    });
    // A wide mouth, the one tooth up from the lower lip.
    if (p.open) paint(g, 48 + hx, 28 + hy, 14, 3, () => cell('shade', 4));
    else for (let x = 47; x <= 62; x++) put(g, x + hx, 29 + hy, cell('ogre', 6));
    sprite(g, 52 + hx, 26 + hy + (p.open ? 1 : 0), ['a', 'b', 'b'], {
      a: ['cream', 0],
      b: ['cream', 2],
    });
    // The near arm forward, its fist round the club's handle at the shoulder.
    limb(g, 'ogre', 30 + bx, 38 + by, 22 + ax, 58 + ay, 14, 12, 2.2);
    limb(g, 'ogre', 22 + ax, 58 + ay, 28 + ax, 44 + ay, 12, 10, 2);
    // The club: a trunk from his fist up over his shoulder, its heavy end behind his head.
    const club = poly([
      [27 + ax, 50 + ay],
      [33 + ax, 47 + ay],
      [20 + ax, 4 + ay],
      [8 + ax, 8 + ay],
    ]);
    shaped(g, club, 'bark', {
      base: 2.2,
      contrast: 1.7,
      radius: 4,
      tex: (x, y, t) => (hash(x, y, 95) < 0.07 ? t + 1 : t),
    });
    // Knots and the stub of a branch.
    sprite(g, 15 + ax, 16 + ay, ['ab', 'bc'], { a: ['bark', 1], b: ['bark', 4], c: ['bark', 5] });
    sprite(g, 22 + ax, 30 + ay, ['ab', 'bc'], { a: ['bark', 1], b: ['bark', 4], c: ['bark', 5] });
    shaped(g, (x, y) => Math.hypot(x - 29 - ax, (y - 46 - ay) * 1.1) < 5.6, 'ogre', {
      base: 1.9,
      contrast: 1.7,
      radius: 3,
    });
    for (const kx of [26, 29, 32]) put(g, kx + ax, 43 + ay, cell('ogre', 1));
  },
};

/* --------------------------------------------------------------- the moss golem */

/** A stone of the golem: a lumpy boulder lit from the upper left, moss cushioned on its top. */
function stone(
  g: TGrid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  moss = true,
): (x: number, y: number) => boolean {
  const inside = (x: number, y: number) => {
    const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
    const r = 1 + 0.12 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 5 + seed * 2);
    return Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry) < r;
  };
  shaped(g, inside, 'rock', {
    base: 2.4,
    contrast: 1.9,
    radius: Math.min(rx, ry) * 0.7,
    tex: (x, y, t) => {
      const b = hash(Math.floor(x / 2), Math.floor(y / 2), 101 + seed);
      return t + (b < 0.08 ? 1 : b > 0.94 ? -1 : 0);
    },
  });
  seam(g, inside, 1);
  if (moss)
    shaped(
      g,
      (x, y) =>
        inside(x, y) &&
        Math.hypot((x - cx + rx * 0.3) / (rx * 0.75), (y - cy + ry * 0.75) / (ry * 0.5)) < 1,
      'moss',
      { base: 2.4, contrast: 1.7, radius: 2 },
    );
  return inside;
}

/** A root lashing two stones, lit on its top. */
const root = (g: TGrid, x0: number, y0: number, x1: number, y1: number) =>
  rod(g, x0, y0, x1, y1, 2, 'bark', [2, 4]);

/**
 * The moss golem: a hulking figure of grey stones stacked into legs, a body
 * and arms, held together by moss and roots, a small stone for a head with
 * two eyes glowing green-gold in the cracks, ferns sprouting from its back.
 */
const MOSS_GOLEM: Beast = {
  w: 90,
  h: 100,
  anchor: { x: 42, y: 98 },
  draw(g, o, p) {
    const [bx, by] = o('body');
    const [hx, hy] = o('head');
    const [ax, ay] = o('arms');
    const [lx, ly] = o('legs');
    // The far arm, behind: shoulder, forearm, a fist of stone.
    stone(g, 66 + bx, 40 + by, 8, 7, 1);
    stone(g, 70 + ax, 56 + ay, 6, 8, 2, false);
    stone(g, 70 + ax, 72 + ay, 8, 7, 3);
    root(g, 64 + bx, 46 + by, 70 + ax, 50 + ay);
    // Legs: two stacks of stones.
    for (const [x, d, s] of [
      [54 + lx, ly, 4],
      [30 - lx, ly, 6],
    ] as const) {
      stone(g, x + 1, 78 + by, 9, 8, s);
      stone(g, x, 90 + Math.max(0, d), 11, 6.5, s + 1, false);
      root(g, x - 6, 84 + by, x + 7, 86 + d);
    }
    // The body: the hips, a great stone of a belly, the chest.
    stone(g, 42 + bx, 70 + by, 15, 7, 8, false);
    stone(g, 42 + bx, 56 + by, 19, 13, 9);
    stone(g, 46 + bx, 38 + by, 16, 10, 10);
    root(g, 26 + bx, 52 + by, 58 + bx, 64 + by);
    root(g, 30 + bx, 44 + by, 60 + bx, 47 + by);
    // Ferns from the back of its shoulders.
    for (const [x, y, d] of [
      [34, 28, -1],
      [38, 26, 0],
      [58, 27, 1],
    ] as const)
      for (let i = 0; i < 6; i++) {
        put(g, x + bx + d * i, y + by - i, cell('moss', 2 + (i % 2)));
        put(g, x + bx + d * i - 1, y + by - i + 1, cell('moss', 4));
      }
    // The head: a small stone sunk between the shoulders, its eyes glowing in the cracks.
    stone(g, 50 + hx, 22 + hy, 9, 8, 12);
    if (p.down) sprite(g, 47 + hx, 22 + hy, ['aaa..aaa'], { a: ['rock', 6] });
    else
      sprite(g, 47 + hx, 21 + hy, ['abb..abb', '.cc...cc'], {
        a: ['rock', 5],
        b: ['ember', 1],
        c: ['ember', 3],
      });
    // A crack for a mouth, opening when it strikes.
    if (p.open) paint(g, 47 + hx, 26 + hy, 8, 2, () => cell('shade', 4));
    else rod(g, 47 + hx, 27 + hy, 54 + hx, 26 + hy, 1, 'rock', [6]);
    // The near arm, forward: shoulder, forearm, a fist of stone the size of the head.
    stone(g, 26 + bx, 42 + by, 8, 7, 13);
    stone(g, 20 + ax, 57 + ay, 6, 8, 14, false);
    stone(g, 20 + ax, 73 + ay, 9, 8, 15);
    root(g, 24 + bx, 48 + by, 20 + ax, 52 + ay);
    root(g, 18 + ax, 64 + ay, 24 + ax, 67 + ay);
  },
};

/** The four creatures, by the monster tables' ids. */
export const TIER2_BEASTS: Readonly<Record<string, Beast>> = {
  black_bear: BLACK_BEAR,
  dire_wolf: DIRE_WOLF,
  hill_ogre: HILL_OGRE,
  moss_golem: MOSS_GOLEM,
};

/** How each lies when down: the bear and the wolf on their bellies, the ogre and the golem on their sides. */
const FALLEN2: Readonly<Record<string, { readonly how: 'belly' | 'side'; readonly drop: number }>> =
  {
    black_bear: { how: 'belly', drop: 12 },
    dire_wolf: { how: 'belly', drop: 17 },
    hill_ogre: { how: 'side', drop: 0 },
    moss_golem: { how: 'side', drop: 0 },
  };

/** A tier 2 creature in a pose, outlined, on its own canvas; null for any other id. */
export function tier2BeastGrid(id: string, pose: BeastPose = {}): TGrid | null {
  const b = TIER2_BEASTS[id];
  if (!b) return null;
  const g = tgrid(b.w, b.h);
  const at = pose.at ?? {};
  b.draw(g, (bone) => at[bone] ?? [0, 0], pose);
  return outlineIn(g);
}

const lowest = (g: TGrid): number => {
  for (let y = g.h - 1; y >= 0; y--) for (let x = 0; x < g.w; x++) if (g.d[y * g.w + x]) return y;
  return 0;
};

/** A tier 2 creature down, and where it lies: on its belly with its legs folded, or on its side. */
export function tier2Fallen(
  id: string,
  buckle: BeastPose,
): { grid: TGrid; feet: { x: number; y: number } } {
  const b = TIER2_BEASTS[id]!;
  const f = FALLEN2[id]!;
  if (f.how === 'side') {
    const g = tier2BeastGrid(id, { ...buckle, down: true })!;
    const out = tgrid(g.h, g.w);
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) out.d[(g.w - 1 - x) * out.w + y] = g.d[y * g.w + x]!;
    return { grid: out, feet: { x: Math.round(out.w / 2), y: lowest(out) } };
  }
  const at = buckle.at ?? {};
  const g = tgrid(b.w, b.h);
  b.draw(
    g,
    (bone) => {
      const [dx, dy] = at[bone] ?? [0, 0];
      return [dx, dy + f.drop];
    },
    { ...buckle, down: true },
  );
  for (let y = b.anchor.y; y < g.h; y++) g.d.fill(0, y * g.w, (y + 1) * g.w);
  return { grid: outlineIn(g), feet: { x: b.anchor.x, y: b.anchor.y } };
}

void upturned;
