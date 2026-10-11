/**
 * Old Snapper (B15), the tide-pool cave's boss: a giant old snapping turtle,
 * slow, grumpy and readable, the first boss a level-1 hero meets. Drawn
 * whole on a canvas of its own, facing right, from masses shaded as solids
 * and lit from the upper left, outlined in each material's darkest step,
 * every part on a bone so he walks, rears and snaps by moving his parts.
 *
 * What names him at a glance: a high domed shell like a mossy rock, its
 * plates grooved and ringed with age, the keel a row of knobs along its top
 * and its back edge sawn into points, kelp, barnacles and a starfish on it;
 * a big blunt head with a hooked beak of pale horn under a heavy brow, a
 * small cross gold eye, wattles under the chin and an old fishhook caught in
 * the corner of his mouth; thick scaly legs and a saw-crested tail. Longer
 * than a rowing boat is wide, two thirds of the hero's height: big, but
 * slower and plainer to read than the grotto's giant crab.
 *
 * He stands a little behind his front feet (`SNAPPER_ANCHOR`): his shell and
 * tail run back from there, so a hero at the melee stand meets his head, not his
 * shell, and is not drawn over him.
 *
 * The fight teaches dodging and bracing, so his wind-up is the plainest
 * telegraph in the game: he rears, the front of his shell tipped up and his
 * front feet off the ground, his head drawn up and back over the shell and
 * his jaws gaping pink. Then the neck shoots out low and the beak snaps shut
 * well ahead of him (his `strike` reach); struck, he pulls his head into his
 * shell; beaten, he tips onto his back, pale belly up and legs in the air.
 */
import { hash, put, tgrid, type TGrid } from '../town2/cells';
import { outlineIn } from '../figure2/engine';
import { cell } from './cave';
import { mass, shade } from './beasts';
import { lim, paint, poly, rod, shaped, sprite } from './kit';
import { blob } from './heads';

/** How far each part moves in a frame, and what the face is doing. */
export interface SnapperPose {
  readonly at?: Readonly<Record<string, readonly [number, number]>>;
  /** Jaws: shut, open a little, gaping (the wind-up). */
  readonly jaw?: 'shut' | 'open' | 'gape';
  /** Eyes open (cross), squeezed shut (struck) or crossed out (down). */
  readonly eyes?: 'open' | 'squeezed' | 'out';
  /** The neck pulled in under the shell's rim (struck), or stretched out (the snap). */
  readonly neck?: 'in' | 'long';
  /** Rows the shell's front is tipped up by, its back staying down (rearing). */
  readonly tip?: number;
}

/** The canvas and where he stands. */
export const SNAPPER_W = 108;
export const SNAPPER_H = 66;
const AX = 66;
/** The last row his feet are drawn on; the outline lies on the row below (the anchor's). */
const G = 63;
/**
 * Where he stands, on the ground row: a little behind his front feet, well
 * ahead of his shell's middle, so what is drawn ahead of it (his head, 27
 * columns) clears a hero at the melee stand (36) less the hero's own 13.
 */
export const SNAPPER_ANCHOR = { x: AX - 6, y: G + 1 } as const;

/** The shell's middle and its size, standing. */
const SX = AX - 21;
const SRX = 25;
const RIM = G - 12;
const TOP = G - 42;

type O = (bone: string) => readonly [number, number];

/** A thick scaly leg from under the shell down to a broad clawed foot; far legs a step darker. */
function leg(g: TGrid, hx: number, hy: number, fx: number, fy: number, near: boolean): void {
  const d = near ? 0 : 1.5;
  rod(
    g,
    hx,
    hy,
    fx,
    fy - 3,
    near ? 9 : 8,
    'turtleskin',
    [1 + d, 2 + d, 3 + d, 4 + d].map(Math.round),
  );
  // Big scales down the leg's front, each lit on its top.
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const x = Math.round(hx + (fx - hx) * t - 2);
    const y = Math.round(hy + (fy - 3 - hy) * t);
    put(g, x, y, cell('turtleskin', near ? 1 : 3));
    put(g, x + 1, y, cell('turtleskin', near ? 1 : 3));
    put(g, x, y + 1, cell('turtleskin', near ? 3 : 4));
    put(g, x + 1, y + 1, cell('turtleskin', near ? 4 : 5));
  }
  // The foot: broad and splayed, three dark claws forward on the ground.
  paint(g, fx - 5, fy - 3, 11, 3, (x, y) =>
    cell('turtleskin', lim((near ? 2 : 3.5) + (y === fy - 1 ? 1 : 0) + (x > fx + 2 ? 1 : 0), 1, 5)),
  );
  for (const dx of [0, 3, 6]) {
    put(g, fx + dx, fy, cell('tar', near ? 1 : 3));
    put(g, fx + dx + 1, fy, cell('tar', near ? 3 : 4));
  }
}

/**
 * The shell's plates at a pixel (from the dome's middle at the rim, its
 * half-width and height): grooves between marginals, costals and the
 * vertebrals along the keel, each plate a little proud at its heart with a
 * growth ring inside its groove. Returns steps to add.
 */
function plates(x: number, y: number, cx: number, rim: number, top: number): number {
  const rx = SRX;
  const ry = rim - top;
  const u = (x + 0.5 - cx) / rx;
  const v = (rim - (y + 0.5)) / ry;
  const r = Math.hypot(u, v);
  const th = Math.atan2(v, u);
  const px = (a: number) => Math.abs(th - a) * r * rx; // pixels from a ray
  if (v < 0.2) {
    // The marginals: small plates along the lower edge.
    if (Math.abs(v - 0.2) * ry < 0.8) return 2;
    if ((Math.round(x - cx) + 60) % 6 === 0) return 2;
    return (Math.round(x - cx) + 60) % 6 === 1 ? -0.5 : 0.3;
  }
  if (r > 0.94 && v < 0.55) {
    if (Math.abs(r - 0.94) * rx < 0.8) return 2;
    return 0.3;
  }
  const vert = r > 0.7 && v > 0.45;
  if (Math.abs(r - 0.7) * rx < 0.8 && v > 0.45) return 2;
  const rays = vert ? [1.0, 1.62, 2.22] : [0.66, 1.2, 1.78, 2.36];
  let near = Infinity;
  for (const a of rays) near = Math.min(near, px(a));
  if (near < 0.8) return 2;
  // A growth ring inside each groove, the plate's heart proud.
  const edge = Math.min(near, vert ? Math.abs(r - 0.7) * rx : Math.abs(v - 0.2) * ry + 2);
  if (edge > 1.6 && edge < 2.6) return 0.9;
  if (edge > 5) return -0.5;
  return 0;
}

/** Draws the shell, belly, tail and far legs into their own layer (so rearing can tip it). */
function bodyLayer(o: O): TGrid {
  const g = tgrid(SNAPPER_W, SNAPPER_H);
  const [bx, by] = o('body');
  const [ffx, ffy] = o('ff');
  const [fhx, fhy] = o('fh');
  const [tx, ty] = o('tail');
  const cx = SX + bx;
  const rim = RIM + by;
  const top = TOP + by;
  // Far legs, behind everything.
  leg(g, cx + 14, rim - 2, AX - 3 + ffx, G + ffy, false);
  leg(g, cx - 14, rim - 2, cx - 17 + fhx, G + fhy, false);
  tail(g, cx, rim, tx, ty);
  // The plastron's edge under the rim, pale and plated.
  paint(g, cx - 19, rim + 1, 40, 4, (x, y) => {
    const t = y - rim - 1;
    if (x < cx - 17 + t * 1.5 || x > cx + 21 - t * 1.5) return 0;
    if ((x - cx + 40) % 8 === 0 && t > 0) return cell('ochre', 4);
    return cell('ochre', t === 0 ? 3 : t === 1 ? 2 : 3);
  });
  // The silhouette: a dome, knobs along the keel, the back edge sawn into points.
  const pts: [number, number][] = [];
  const knobs = [0.28, 0.43, 0.58, 0.73];
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const a = Math.PI * (1 - t);
    const x = cx + Math.cos(a) * SRX;
    let y = rim - Math.sin(a) ** 0.7 * (rim - top - 3);
    for (const k of knobs) y -= Math.max(0, 1 - Math.abs(t - k) * 26) * 3;
    pts.push([x, y]);
  }
  pts.push([cx + SRX - 1, rim + 2], [cx - 13, rim + 2]);
  for (let i = 0; i < 4; i++) {
    const x = cx - 14 - i * 3.3;
    pts.push([x, rim + 5 - (i === 0 ? 1 : 0)], [x - 1.8, rim + 1]);
  }
  pts.push([cx - SRX, rim]);
  shaped(g, poly(pts), 'turtle', {
    base: 2.8,
    contrast: 1.5,
    radius: 6,
    tex: (x, y, t) => t + plates(x, y, cx, rim, top) + (hash(x, y, 811) < 0.04 ? 1 : 0),
  });
  // The keel's knobs, lit on top, shadowed under.
  for (const k of knobs) {
    const a = Math.PI * (1 - k);
    const x = Math.round(cx + Math.cos(a) * SRX);
    const y = Math.round(rim - Math.sin(a) ** 0.7 * (rim - top - 3)) - 2;
    sprite(g, x - 1, y, ['.a.', 'abc', 'bcc'], {
      a: ['turtle', 0],
      b: ['turtle', 2],
      c: ['turtle', 4],
    });
  }
  // Moss in a few low cushions in the sun, kelp hanging off the rim.
  for (const [mx, my, r] of [
    [-11, 6, 4],
    [-4, 3, 3],
    [-17, 11, 2.5],
  ] as const)
    mass(g, cx + mx, top + my, r, r * 0.65, 'moss', { base: 2.8, k: 2, lo: 1, hi: 5 });
  for (let i = 0; i < 8; i++) {
    const x = Math.round(cx - SRX + 6 + i * 5.6 + hash(i, 1, 812) * 2);
    const len = 3 + Math.floor(hash(i, 2, 812) * 4);
    for (let j = 0; j < len; j++)
      put(g, x + (j > 2 ? 1 : 0), rim + 2 + j, cell('kelp', j === 0 ? 2 : j === len - 1 ? 5 : 3));
  }
  // A clump of barnacles low on the flank, a limpet, a purple starfish clinging on.
  for (const [dx, dy] of [
    [9, -12],
    [12, -10],
    [10, -8],
    [13, -13],
    [15, -9],
  ] as const) {
    put(g, cx + dx, rim + dy, cell('cream', 0));
    put(g, cx + dx + 1, rim + dy, cell('cream', 2));
    put(g, cx + dx, rim + dy + 1, cell('cream', 3));
    put(g, cx + dx + 1, rim + dy + 1, cell('tar', 3));
  }
  sprite(g, cx - 19, rim - 10, ['.ab.', 'abbc', 'bccc'], {
    a: ['sail', 0],
    b: ['sail', 2],
    c: ['sail', 4],
  });
  sprite(g, cx - 6, rim - 15, ['...a...', '..aba..', 'aabbbcc', '.abbbc.', '.ab.cc.', 'a.....c'], {
    a: ['plum', 1],
    b: ['plum', 2],
    c: ['plum', 4],
  });
  put(g, cx - 3, rim - 12, cell('plum', 0));
  return g;
}

/** The tail: thick at the root, tapering, a saw crest along it. */
function tail(g: TGrid, cx: number, rim: number, tx: number, ty: number): void {
  const x0 = cx - SRX + 2;
  const y0 = rim + 2;
  const x1 = cx - SRX - 15 + tx;
  const y1 = G - 2 + ty;
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 1.5;
    const w = 7 - t * 5.5;
    for (let j = -w / 2; j <= w / 2; j += 0.5)
      put(
        g,
        Math.round(x),
        Math.round(y + j),
        cell('turtleskin', lim(3 + (j < -w / 4 ? -1 : j > w / 4 ? 1 : 0), 1, 5)),
      );
    if (i % 3 === 0 && i < 13) {
      put(g, Math.round(x), Math.round(y - w / 2 - 1), cell('turtle', 2));
      put(g, Math.round(x - 1), Math.round(y - w / 2 - 2), cell('turtle', 3));
      put(g, Math.round(x + 1), Math.round(y - w / 2 - 1), cell('turtle', 4));
    }
  }
}

/** The neck from under the shell's front to the head: thick and wrinkled, a knobbly crest. */
function neck(g: TGrid, x0: number, y0: number, hx: number, hy: number): void {
  rod(g, x0, y0, hx - 5, hy + 1, 10, 'turtleskin', [1, 2, 2, 3, 4]);
  const n = Math.max(2, Math.round(Math.hypot(hx - 5 - x0, hy + 1 - y0) / 4));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = Math.round(x0 + (hx - 5 - x0) * t);
    const y = Math.round(y0 + (hy + 1 - y0) * t);
    // Folds across the neck's underside, and a knob of skin on its crest.
    put(g, x, y + 2, cell('turtleskin', 4));
    put(g, x, y + 3, cell('turtleskin', 4));
    put(g, x - 1, y + 4, cell('turtleskin', 5));
    put(g, x + 1, y - 4, cell('turtleskin', 1));
    put(g, x + 2, y - 4, cell('turtleskin', 3));
  }
}

/**
 * The head: big and blunt, a hooked beak of pale horn under a heavy brow
 * that slants down to a small gold eye (cross), wattles under the chin, an
 * old fishhook in the corner of the mouth with its snapped line. `jaw` opens
 * the mouth: a little, or gaping pink with the tongue.
 */
export function snapperHead(
  g: TGrid,
  hx: number,
  hy: number,
  jaw: 'shut' | 'open' | 'gape',
  eyes: 'open' | 'squeezed' | 'out',
): void {
  const drop = jaw === 'gape' ? 9 : jaw === 'open' ? 3 : 0;
  // The lower jaw, behind: dropping open, pale horn along its edge.
  const lower = blob([
    [hx - 8, hy + 1],
    [hx + 2, hy + 2 + drop * 0.6],
    [hx + 10, hy + 2 + drop],
    [hx + 11, hy + 5 + drop],
    [hx + 3, hy + 7 + drop * 0.8],
    [hx - 7, hy + 7],
  ]);
  shaped(g, lower, 'turtleskin', { base: 3, contrast: 1.2, radius: 2 });
  if (drop) {
    // The mouth inside: pink, dark at the throat, a fat tongue.
    const mouth = blob([
      [hx - 4, hy + 1],
      [hx + 11, hy - 1],
      [hx + 11, hy + 1 + drop],
      [hx + 2, hy + 2 + drop * 0.7],
    ]);
    shaped(g, mouth, 'anemone', { base: 3, contrast: 1, radius: 2, lo: 2, hi: 5 });
    paint(g, hx - 3, hy, 5, 3 + Math.round(drop * 0.4), () => cell('anemone', 5));
    mass(g, hx + 5, hy + 2 + drop * 0.7, 3.5, 1.8, 'anemone', { base: 1.8, k: 1.5, lo: 1, hi: 3 });
  }
  for (let i = 0; i < 9; i++)
    put(g, hx + 2 + i, Math.round(hy + 2 + drop * (0.6 + i * 0.045)), cell('cream', i < 4 ? 2 : 3));
  // The skull: broad and blunt, a hump over the eyes, the cheek full.
  const skull = blob([
    [hx - 9, hy - 3],
    [hx - 5, hy - 9],
    [hx + 2, hy - 10],
    [hx + 9, hy - 7],
    [hx + 13, hy - 2],
    [hx + 12, hy + 1],
    [hx + 4, hy + 1],
    [hx - 8, hy + 4],
  ]);
  shaped(g, skull, 'turtleskin', { base: 2.4, contrast: 1.6, radius: 3 });
  // Scales on the crown, a fold of cheek.
  for (const [dx, dy] of [
    [-3, -8],
    [0, -9],
    [-6, -5],
    [-2, -6],
  ] as const) {
    put(g, hx + dx, hy + dy, cell('turtleskin', 1));
    put(g, hx + dx + 1, hy + dy + 1, cell('turtleskin', 4));
  }
  for (let i = 0; i < 4; i++)
    put(g, hx - 6 + i, hy - 1 + Math.round(i * 0.5), cell('turtleskin', 4));
  // The upper beak: pale horn, hooked down over the lower at its tip.
  sprite(
    g,
    hx + 6,
    hy - 4,
    [
      '...aab...',
      '..aabbc..',
      '.aabbbbc.',
      '.abbbbbcc',
      '..bbbccc.',
      '....ccc..',
      '.....cc..',
      '......c..',
    ],
    { a: ['cream', 1], b: ['cream', 2], c: ['cream', 4] },
  );
  // The mouth's line back to its corner, and the old hook caught there with its broken line.
  for (let x = hx - 4; x <= hx + 9; x++) put(g, x, hy + 1 + (x > hx + 6 ? 1 : 0), cell('shade', 2));
  sprite(g, hx - 7, hy, ['.ab', 'a..', 'a.c', '.aa'], {
    a: ['iron', 2],
    b: ['iron', 0],
    c: ['iron', 3],
  });
  for (let i = 0; i < 7; i++) put(g, hx - 8 - i, hy + 3 + Math.round(i * 0.7), cell('sail', 3));
  // The eye under a heavy brow that slants down toward the beak: cross.
  if (eyes === 'open')
    sprite(g, hx + 1, hy - 5, ['abb', 'bcd', '.dd'], {
      a: ['gold', 0],
      b: ['gold', 2],
      c: ['eye', 4],
      d: ['gold', 4],
    });
  else if (eyes === 'squeezed') sprite(g, hx, hy - 5, ['a...a', '.aaa.'], { a: ['shade', 2] });
  else sprite(g, hx + 1, hy - 6, ['a.a', '.a.', 'a.a'], { a: ['shade', 2] });
  sprite(g, hx - 2, hy - 8, ['aab.....', 'abbbbc..', '.bccccdd', '......d.'], {
    a: ['turtleskin', 0],
    b: ['turtleskin', 1],
    c: ['turtleskin', 3],
    d: ['turtleskin', 5],
  });
  put(g, hx + 11, hy - 4, cell('shade', 3));
  // Wattles: two little barbels under the chin.
  put(g, hx + 2, hy + 8 + drop, cell('turtleskin', 2));
  put(g, hx + 2, hy + 9 + drop, cell('turtleskin', 4));
  put(g, hx - 2, hy + 8, cell('turtleskin', 3));
  put(g, hx - 2, hy + 9, cell('turtleskin', 5));
}

/** Copies a layer down by `tip` rows at its front, tapering to none at its back: the shell tipped up. */
function tipped(src: TGrid, tip: number, into: TGrid): void {
  const back = SX - SRX - 16;
  const front = SX + SRX;
  for (let x = 0; x < src.w; x++) {
    const k = Math.max(0, Math.min(1, (x - back) / (front - back)));
    const dy = -Math.round(tip * k);
    for (let y = 0; y < src.h; y++) {
      const c = src.d[y * src.w + x]!;
      const ny = y + dy;
      if (c && ny >= 0 && ny < into.h) into.d[ny * into.w + x] = c;
    }
  }
}

/** Draws him in a pose, facing right, before his outline. */
function draw(g: TGrid, o: O, p: SnapperPose): void {
  const [bx, by] = o('body');
  const [nfx, nfy] = o('nf');
  const [nhx, nhy] = o('nh');
  const tip = p.tip ?? 0;
  const cx = SX + bx;
  const rim = RIM + by;
  const [hx0, hy0] = o('head');
  const pulledIn = p.neck === 'in';
  // Pulled in, the head is behind the shell's front edge: drawn first, the shell over it.
  if (pulledIn) snapperHead(g, cx + SRX - 2 + hx0, rim - 3 + hy0, 'shut', p.eyes ?? 'squeezed');
  tipped(bodyLayer(o), tip, g);
  // The neck comes out from under the shell's front; its root rises with the tip.
  const nx = cx + SRX - 6;
  const ny = rim - 5 - tip;
  const head: [number, number] =
    p.neck === 'in'
      ? [cx + SRX + 3, rim - 3]
      : p.neck === 'long'
        ? [AX + 26, G - 14]
        : [AX + 6, G - 19];
  const hx = head[0] + hx0;
  const hy = head[1] + hy0;
  if (!pulledIn) neck(g, nx, ny, hx, hy);
  // Near legs, under the shell's shadow at their tops.
  leg(g, cx + 12, rim - tip, AX - 6 + nfx, G + nfy, true);
  leg(g, cx - 12, rim, cx - 14 + nhx, G + nhy, true);
  shade(g, cx + 12, rim + 3 - tip, 6, 2, 1);
  shade(g, cx - 12, rim + 3, 6, 2, 1);
  if (!pulledIn) snapperHead(g, hx, hy, p.jaw ?? 'shut', p.eyes ?? 'open');
}

/** His poses, by the dungeon's pose names. */
const KEYS: Readonly<Record<string, readonly SnapperPose[]>> = {
  idle: [{}, { at: { body: [0, -1], head: [0, -1], tail: [0, -1], ff: [0, 0] } }],
  // Slow and heavy: a diagonal pair of feet forward at a time, the body rolling.
  walk: [
    { at: { nf: [3, -2], fh: [3, -2], ff: [-2, 0], nh: [-2, 0], head: [1, 0] } },
    { at: { nf: [1, 0], fh: [1, 0], body: [0, -1], head: [0, -1] } },
    { at: { ff: [3, -2], nh: [3, -2], nf: [-2, 0], fh: [-2, 0], head: [1, 0] } },
    { at: { ff: [1, 0], nh: [1, 0], body: [0, -1], head: [0, -1] } },
  ],
  // The telegraph: he rears, front feet off the ground, head drawn up and back, jaws gaping.
  windup: [
    {
      at: {
        body: [-2, 0],
        nf: [-6, -9],
        ff: [-6, -8],
        nh: [-2, 0],
        fh: [-2, 0],
        head: [-9, -20],
        tail: [0, 1],
      },
      tip: 8,
      jaw: 'gape',
    },
  ],
  // The snap: the neck shoots out low and the beak shuts far ahead of him.
  strike: [
    {
      at: { body: [2, 1], nf: [3, 0], ff: [2, 0], nh: [1, 0], fh: [1, 0], head: [0, 2] },
      neck: 'long',
    },
  ],
  // Struck: head pulled into the shell, eyes squeezed, the shell rocked back.
  hurt: [
    {
      at: { body: [-2, -1], nf: [-3, 0], ff: [-3, 0], nh: [-1, 0], fh: [-1, 0] },
      neck: 'in',
      eyes: 'squeezed',
    },
  ],
  // Buckling: legs giving, the shell down on the sand, the head drooping.
  fall: [
    {
      at: {
        body: [0, 4],
        nf: [3, 0],
        ff: [3, 0],
        nh: [-3, 0],
        fh: [-3, 0],
        head: [2, 10],
        tail: [0, 0],
      },
      jaw: 'open',
      eyes: 'out',
    },
    {},
  ],
};

export const SNAPPER_FRAMES = { idle: 2, walk: 4, windup: 1, strike: 1, hurt: 1, fall: 2 } as const;
export type SnapperDrawn = keyof typeof SNAPPER_FRAMES;

/** One frame drawn and outlined, standing. */
function standing(p: SnapperPose): TGrid {
  const g = tgrid(SNAPPER_W, SNAPPER_H);
  const at = p.at ?? {};
  draw(g, (bone) => at[bone] ?? [0, 0], p);
  return outlineIn(g);
}

/**
 * Down: tipped onto his back, the dome rocking on the sand, his pale
 * plastron up with its seams, legs and tail in the air, his head lolling to
 * the floor with its tongue out and his eyes crossed out.
 */
function onHisBack(): { grid: TGrid; feet: { x: number; y: number } } {
  const W = SNAPPER_W;
  const H = 48;
  const g = tgrid(W, H);
  const gr = H - 2;
  const cx = SX + 2;
  const h = 18; // the dome's depth, upside down
  const flat = gr - h; // the plastron's line
  // Legs up first (behind the plastron's edge): stubby, splayed, feet to the sky.
  for (const [x0, x1, far] of [
    [cx + 13, cx + 22, true],
    [cx - 13, cx - 22, true],
    [cx + 9, cx + 15, false],
    [cx - 9, cx - 15, false],
  ] as const) {
    rod(
      g,
      x0,
      flat + 1,
      x1,
      flat - 10,
      far ? 7 : 8,
      'turtleskin',
      far ? [3, 4, 4, 5] : [1, 2, 3, 4],
    );
    paint(g, x1 - 4, flat - 13, 9, 3, (_x, y) =>
      cell('turtleskin', (far ? 3 : 2) + (y === flat - 13 ? 0 : 1)),
    );
    for (const dx of [-3, 0, 3]) put(g, x1 + dx, flat - 14, cell('tar', far ? 3 : 1));
  }
  // The tail flopped over, up and back.
  rod(g, cx - SRX + 2, flat + 2, cx - SRX - 9, flat - 4, 5, 'turtleskin', [2, 3, 4]);
  rod(g, cx - SRX - 9, flat - 4, cx - SRX - 13, flat - 1, 3, 'turtleskin', [3, 4]);
  // The dome, upside down: its curve on the sand, the sawn back edge up behind.
  const dome = (x: number, y: number) => {
    const u = (x + 0.5 - cx) / SRX;
    if (Math.abs(u) > 1) return false;
    const depth = Math.sqrt(1 - u * u) ** 0.7 * h;
    return y + 0.5 >= flat && y + 0.5 <= flat + depth;
  };
  shaped(g, dome, 'turtle', {
    base: 3.2,
    contrast: 1.4,
    radius: 4,
    tex: (x, y, t) => {
      if ((Math.round(x - cx) + 60) % 7 === 0 && y > flat + 2) return t + 2;
      if (y === flat + 3) return t + 2;
      return t + (hash(x, y, 813) < 0.05 ? 1 : 0);
    },
  });
  // Moss and kelp crushed under him, poking out at the sides.
  for (let i = 0; i < 6; i++) put(g, cx - 20 + i * 8, gr, cell('kelp', 3 + (i % 2)));
  // The plastron: a broad pale plate on top, its seams across, lit as it faces the sky.
  const plastron = (x: number, y: number) =>
    y >= flat - 3 &&
    y <= flat + 1 &&
    x >= cx - SRX + 4 + (flat + 1 - y) &&
    x <= cx + SRX - 4 - (flat + 1 - y);
  shaped(g, plastron, 'ochre', {
    base: 1.8,
    contrast: 1,
    radius: 2,
    tex: (x, y, t) => ((x - cx + 60) % 9 === 0 ? t + 2 : y === flat + 1 ? t + 1 : t),
  });
  // The head lolling on the floor before him, the neck sagging out from the shell.
  const hx = cx + SRX + 14;
  const hy = gr - 8;
  rod(g, cx + SRX - 6, flat + 3, hx - 5, hy + 1, 9, 'turtleskin', [2, 3, 3, 4]);
  snapperHead(g, hx, hy, 'open', 'out');
  return { grid: outlineIn(g), feet: { x: SNAPPER_ANCHOR.x, y: gr + 1 } };
}

const made = new Map<string, { grid: TGrid; feet: { x: number; y: number } }>();

/** A frame of Old Snapper facing right: its grid and where he stands. */
export function snapperFrame(
  pose: SnapperDrawn,
  frame: number,
): { grid: TGrid; feet: { x: number; y: number } } {
  const n = SNAPPER_FRAMES[pose];
  const f = ((Math.floor(frame) % n) + n) % n;
  const key = `${pose} ${f}`;
  let out = made.get(key);
  if (out) return out;
  if (pose === 'fall' && f === 1) out = onHisBack();
  else out = { grid: standing(KEYS[pose]![f]!), feet: { ...SNAPPER_ANCHOR } };
  made.set(key, out);
  return out;
}

/** Lets go of his kept frames. */
export function forgetSnapper(): void {
  made.clear();
}
