/**
 * The badger king (B20), Thistlewood Burrow's boss: an offended monarch. He
 * has the bulk of a real badger reared up on his hind legs, a barrel of
 * grizzled grey with black legs and belly, the white head with its two black
 * stripes, small round ears; and the dignity of a king, worn a little too
 * seriously: a small gold crown perched between his ears, a purple robe
 * trimmed with ermine over his shoulders falling behind him to the ground, a
 * crimson sash across his belly, his chin up and his eyes half-lidded at the
 * impertinence of it all. About two figures wide and a head over the hero.
 *
 * He stands tight to his feet: the robe and his back run behind them, so only
 * his belly, snout and claws are ahead (`front`), and a hero at the melee
 * stand is not drawn inside him.
 *
 * - **Phase 1**, in state: the slam. Its telegraph is both great clawed fists
 *   raised over his crown, robe flaring; the blow, both slammed into the
 *   floor before him, earth flying.
 * - **Phase 2**, going under: earth on his robe, his crown knocked askew. He
 *   dives head first into the floor (`burrow`), comes up through it
 *   (`erupt`), and if he comes up into a lantern's light stands dazzled
 *   (`stunned`), a paw over his eyes.
 * - **Phase 3**, outraged: fur bristling, the robe torn, the crown dented,
 *   teeth bared, his eyes gone ember red; quicker in everything.
 */
import { hash, put, tgrid, type TGrid } from '../town2/cells';
import { outlineIn } from '../figure2/engine';
import { cell } from './cave';
import { lim, paint, poly, rod, shaped, sprite } from './kit';
import { mass, shade } from './beasts';

type Pt = readonly [number, number];

/** What he is doing in a frame. */
export interface KingPose {
  readonly at?: Readonly<Record<string, Pt>>;
  /** Fists: at his sides, raised over his crown (the telegraph), slammed down, over his eyes. */
  readonly arms?: 'rest' | 'raised' | 'slam' | 'shade' | 'dig' | 'flung' | 'walk';
  readonly eyes?: 'lidded' | 'wide' | 'shut' | 'out';
  readonly open?: boolean;
  /** How far he is sunk into the floor, rows (going under and coming up). */
  readonly sunk?: number;
  /** Earth flying round him (the slam, the dive, the eruption). */
  readonly spray?: number;
  /** Diving head first (going under). */
  readonly dive?: boolean;
  readonly down?: boolean;
  readonly sit?: boolean;
}

export type KingPhase = 1 | 2 | 3;

/** His canvas and where he stands. */
export const KING_W = 100;
export const KING_H = 100;
const AX = 50;
const G = 97;
/**
 * Where he stands: his near foot, so his bulk, robe and back are behind it and
 * only his snout and belly ahead (27 columns), clear of a hero at the stand.
 */
export const KING_ANCHOR = { x: AX + 5, y: G + 1 } as const;

const at = (p: KingPose, bone: string): Pt => p.at?.[bone] ?? [0, 0];

/** A clawed paw: black fur, five great pale digging claws. */
function paw(g: TGrid, x: number, y: number, down: boolean): void {
  mass(g, x, y, 5, 4.2, 'badger', { base: 3.2, k: 1.6 });
  for (let i = 0; i < 4; i++) {
    const cx = x - 3 + i * 2;
    for (let j = 0; j < 4; j++)
      put(
        g,
        cx + (down ? 0 : j > 1 ? 1 : 0),
        y + (down ? 3 + j : -3 - j),
        cell('cream', j === 0 ? 1 : j < 3 ? 2 : 4),
      );
  }
}

/** The head: the white face, the two black stripes through the eyes to the ears, the black nose. */
function kingHead(g: TGrid, hx: number, hy: number, p: KingPose, phase: KingPhase): void {
  // A long cone of a head: a domed brow running down to a pointed snout, white.
  const head = poly([
    [hx - 13, hy - 3],
    [hx - 8, hy - 11],
    [hx + 2, hy - 12],
    [hx + 10, hy - 9],
    [hx + 18, hy - 5],
    [hx + 24, hy - 2],
    [hx + 23, hy + 2],
    [hx + 14, hy + 7],
    [hx + 2, hy + 10],
    [hx - 10, hy + 8],
  ]);
  shaped(g, head, 'hairgrey', { base: 1, contrast: 1.4, radius: 4, lo: 0 });
  // The black throat and jaw's underside.
  for (let x = hx - 10; x <= hx + 12; x++)
    for (let j = 0; j < 3; j++) {
      const y = hy + 8 - j + Math.round((x - hx) * 0.06);
      if (g.d[y * g.w + x]) put(g, x, y, cell('badger', j === 2 ? 4 : 5));
    }
  // The stripe: from the snout back over the eye to the ear, narrow at the nose, broad behind.
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const x = Math.round(hx + 21 - t * 33);
    const y = Math.round(hy - 2 - t * 5);
    const w = 1 + Math.round(t * 4.4);
    for (let j = 0; j < w; j++) {
      const yy = y + j - Math.floor(w / 2);
      if (g.d[yy * g.w + x]) put(g, x, yy, cell('badger', j === 0 ? 4 : 5));
    }
  }
  // Small round ears, white-tipped.
  sprite(g, hx - 13, hy - 10, ['.ww.', 'wkkw', 'kkkk', '.kk.'], {
    w: ['linen', 1],
    k: ['badger', 4],
  });
  // The eye in the stripe: half-lidded and haughty, wide in the telegraph, red in his rage.
  const ex = hx + 6;
  const ey = hy - 4;
  const eyes = p.eyes ?? 'lidded';
  if (eyes === 'shut') sprite(g, ex - 1, ey + 1, ['aaa'], { a: ['tar', 2] });
  else if (eyes === 'out') sprite(g, ex - 1, ey - 1, ['a.a', '.a.', 'a.a'], { a: ['linen', 1] });
  else {
    // His eyes shine back a lantern's light (eyeshine), so they show in the dark; red in his rage.
    const iris = phase === 3 ? (['ember', 3] as const) : (['ember', 1] as const);
    if (eyes === 'wide')
      sprite(g, ex - 1, ey - 1, ['.ab', 'abb', '.bb'], { a: [iris[0], iris[1]], b: ['eye', 4] });
    // Half-lidded: a heavy pale lid over a sliver of eye, looking down the snout at you.
    else
      sprite(g, ex - 2, ey - 1, ['cccc', 'cccc', 'dabb'], {
        a: [iris[0], iris[1]],
        b: ['eye', 4],
        c: ['hairgrey', 2],
        d: ['eye', 4],
      });
  }
  // The mouth: a firm line of disapproval; open, a row of teeth (bared in his rage).
  if (p.open || phase === 3)
    sprite(g, hx + 9, hy + 5, ['aaaaaaaaa', 'bcbcbcbc.', '.ddddd...'], {
      a: ['tar', 4],
      b: ['cream', 0],
      c: ['cream', 2],
      d: ['crimson', 4],
    });
  else sprite(g, hx + 11, hy + 6, ['aaaaaab'], { a: ['tar', 4], b: ['tar', 3] });
  // A frowning brow over the eye.
  sprite(g, ex - 3, ey - 3, p.eyes === 'wide' ? ['..aaa'] : ['aaaa.', '...aa'], {
    a: ['badger', 5],
  });
}

/** The crown: small, gold, three points with a red stone in the middle, perched between his ears. */
function crown(g: TGrid, x: number, y: number, phase: KingPhase, tilt: number): void {
  const rows =
    phase === 3
      ? [
          'a....b....',
          'aa...b..b.',
          'aab.bbb.bb',
          'abbbbbbbbb',
          'accrrcccc.',
          'acccccccc.',
          'dddddddd..',
        ]
      : ['a...a...a', 'ab.aab.ab', 'abbabbbab', 'abbbbbbbb', 'accrrcccc', 'accccccc.', 'dddddddd.'];
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const ch = r[i]!;
      if (ch === '.') continue;
      const c =
        ch === 'a'
          ? cell('gold', 0)
          : ch === 'b'
            ? cell('gold', 1)
            : ch === 'c'
              ? cell('gold', 2)
              : ch === 'r'
                ? cell('crimson', 1)
                : cell('gold', 4);
      put(g, x + i, y + j + Math.round((i - r.length / 2) * tilt), c);
    }
  });
}

/** The king, facing right, in a pose and phase: his grid before the outline. */
function king(p: KingPose, phase: KingPhase): TGrid {
  const g = tgrid(KING_W, KING_H);
  const [bx, by] = at(p, 'body');
  const [hx0, hy0] = at(p, 'head');
  const [lx, ly] = at(p, 'legs');
  const sunk = p.sunk ?? 0;
  const B = by + sunk;
  const arms = p.arms ?? 'rest';
  // The robe behind him: purple, falling from his shoulders to the floor behind his feet,
  // the ermine trim down its front edge and round the collar. Torn in his rage.
  const robe = poly([
    [AX - 8 + bx, 40 + B],
    [AX - 22 + bx, 48 + B],
    [AX - 34 + bx * 0.5, 80 + B],
    [AX - 40, G + 1],
    [AX - 6, G + 1],
    [AX - 2 + bx, 70 + B],
    [AX + 2 + bx, 44 + B],
  ]);
  shaped(g, robe, 'violet', {
    base: 3,
    contrast: 1.5,
    radius: 4,
    tex: (x, y, t) => {
      // Folds falling from the shoulders, spreading toward the hem.
      const fold = ((Math.round((x - AX) * (60 / Math.max(20, y - 30))) % 7) + 7) % 7;
      if (phase === 3 && y > G - 10 && hash(x >> 1, 0, 1701) < 0.45) return 9;
      return (
        t +
        (fold === 0 ? 1 : fold === 1 ? -0.5 : 0) +
        (phase >= 2 && y > G - 12 && hash(x, y, 1702) < 0.25 ? 1 : 0)
      );
    },
  });
  // Rags of a torn hem drop out (step 9 is cleared below).
  for (let i = 0; i < g.d.length; i++) if ((g.d[i]! & 7) === 7) g.d[i] = 0;
  // Ermine along the robe's hem, white with black tail-tips.
  for (let x = AX - 41; x <= AX - 5; x++)
    for (let j = 0; j < 3; j++) {
      const y = G - j;
      if (!g.d[y * KING_W + x]) continue;
      put(g, x, y, cell('hairgrey', j === 2 ? 0 : 1 + (j === 0 ? 1 : 0)));
      if (j === 1 && (x + 3) % 6 === 0) put(g, x, y, cell('tar', 3));
    }
  // Ermine down the robe's front edge: white with black tail-tips.
  for (let y = 46 + B; y <= G; y++) {
    const x = Math.round(AX - 4 + bx - (y - 46 - B) * 0.08);
    for (let i = -2; i <= 0; i++) put(g, x + i, y, cell('hairgrey', i === -2 ? 0 : 1));
    if ((y - B) % 7 === 0) put(g, x - 1, y, cell('tar', 3));
  }
  // Legs: short and thick, black, splayed feet with claws, under the barrel.
  for (const [x, far] of [
    [AX - 8 + lx, true],
    [AX + 6 - lx, false],
  ] as const) {
    rod(
      g,
      x + bx * 0.5,
      82 + B,
      x,
      G - 3 + (far ? ly : -ly) * 0,
      9,
      'badger',
      far ? [4, 5, 5, 5] : [3, 4, 4, 5],
    );
    sprite(g, x - 5, G - 2, ['abbbbbbc', 'dedeede.'], {
      a: ['badger', far ? 4 : 3],
      b: ['badger', far ? 5 : 4],
      c: ['badger', 5],
      d: ['cream', far ? 3 : 2],
      e: ['badger', 5],
    });
  }
  // The body: a great barrel, grizzled grey over the back, black over the belly and chest.
  const bcx = AX - 2 + bx;
  const bcy = 62 + B;
  for (let y = bcy - 24; y <= bcy + 24; y++)
    for (let x = bcx - 21; x <= bcx + 21; x++) {
      const nx = (x + 0.5 - bcx) / 20.5;
      const ny = (y + 0.5 - bcy) / 23.5;
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      const lit = -(nx * 0.55 + ny * 0.75);
      const belly = nx > 0.15 && ny > -0.35;
      let t = (belly ? 3.8 : 1.5) - lit * 1.5;
      // Grizzle: pale-tipped hairs over the grey back, in strokes, bristling in his rage.
      const s = hash(Math.floor((x + y * 0.6) / 2), y, 1703 + phase);
      if (!belly && s < 0.2) t -= 1.2;
      if (s > 0.9) t += 1;
      put(g, x, y, cell('badger', lim(t, belly ? 3 : 0, 5)));
    }
  if (phase === 3)
    // Fur standing up along his back: a ragged edge of tufts.
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * (0.95 + i * 0.045);
      const x = Math.round(bcx + Math.cos(a) * 21);
      const y = Math.round(bcy + Math.sin(a) * 24);
      put(g, x - 1, y - 1, cell('badger', 1));
      put(g, x - 2, y - 2, cell('badger', 2));
    }
  shade(g, bcx + 6, bcy + 18, 14, 4, 1);
  // The sash: crimson, from his left shoulder across his belly to his right hip, a gold clasp.
  for (let i = 0; i < 40; i++) {
    const t = i / 39;
    const x = Math.round(bcx - 12 + t * 30);
    const y = Math.round(bcy - 18 + t * 30);
    for (let j = 0; j < 5; j++) {
      const nx = (x + 0.5 - bcx) / 20.5;
      const ny = (y + j + 0.5 - bcy) / 23.5;
      if (nx * nx + ny * ny > 0.96) continue;
      put(g, x, y + j, cell('crimson', j === 0 ? 0 : j === 4 ? 3 : 1 + (i % 6 === 0 ? 1 : 0)));
    }
  }
  sprite(g, bcx + 2, bcy - 3, ['.aa.', 'abbc', '.cc.'], {
    a: ['gold', 0],
    b: ['gold', 2],
    c: ['gold', 4],
  });
  if (phase >= 2)
    // Earth on him from going under: clods on the robe and his shoulders.
    for (let i = 0; i < 10; i++) {
      const x = Math.round(bcx - 18 + hash(i, 1, 1704) * 28);
      const y = Math.round(bcy - 16 + hash(i, 2, 1704) * 34);
      if (!g.d[y * KING_W + x]) continue;
      put(g, x, y, cell('soil', 2));
      put(g, x + 1, y + 1, cell('soil', 4));
    }
  // The robe's ermine collar round his shoulders.
  for (let x = bcx - 16; x <= bcx + 6; x++) {
    const y = Math.round(bcy - 22 + Math.abs(x - bcx + 5) * 0.12);
    put(g, x, y, cell('hairgrey', 0));
    put(g, x, y + 1, cell('hairgrey', 1));
    put(g, x, y + 2, cell('hairgrey', 3));
    if (x % 6 === 0) put(g, x, y + 1, cell('tar', 3));
  }
  // Arms and great clawed paws.
  const shX = bcx + 8;
  const shY = bcy - 12;
  const armTo = (side: number): [number, number, boolean] => {
    switch (arms) {
      case 'raised':
        // Spread wide either side of his crown, claws up: no mistaking it.
        return side > 0 ? [bcx + 26, bcy - 46, false] : [bcx - 14, bcy - 50, false];
      case 'slam':
        return [bcx + 24 + side * 3, G - 6, true];
      case 'shade':
        return side > 0 ? [bcx + 20, bcy - 30, false] : [bcx + 10, bcy + 6, true];
      case 'dig':
        return [bcx + 22 + side * 4, G - 4, true];
      case 'flung':
        return [bcx + (side > 0 ? 30 : -24), bcy - 30, false];
      case 'walk':
        return [bcx + 14 + side * 3, bcy + 8 - side * 2, true];
      default:
        return side > 0 ? [bcx + 14, bcy + 4, true] : [bcx + 6, bcy + 8, true];
    }
  };
  for (const side of [-1, 1]) {
    const [tx, ty, down] = armTo(side);
    const sx = shX + (side < 0 ? -6 : 0);
    const sy = shY + (side < 0 ? 2 : 0);
    rod(g, sx, sy, tx, ty, side < 0 ? 8 : 9, 'badger', side < 0 ? [2, 3, 4, 5] : [0, 1, 2, 3, 4]);
    paw(g, tx, ty, down);
    if (side < 0 && arms === 'rest') continue;
  }
  // The head, on top and forward, and the crown on it.
  const hx = bcx + 10 + hx0;
  const hy = bcy - 28 + hy0;
  kingHead(g, hx, hy, p, phase);
  if (!p.dive) {
    const tilt = phase === 1 ? 0 : phase === 2 ? 0.25 : -0.3;
    crown(g, hx - 8 + (phase === 2 ? 2 : 0), hy - 18 + (phase === 2 ? 1 : 0), phase, tilt);
  }
  // Earth flying.
  const spray = p.spray ?? 0;
  if (spray > 0)
    for (let i = 0; i < 18 * spray; i++) {
      const a = Math.PI * (1.05 + hash(i, 3, 1705) * 0.9);
      const d = 6 + hash(i, 4, 1705) * 22;
      const ox = arms === 'slam' ? bcx + 26 : bcx + 6;
      const x = Math.round(ox + Math.cos(a) * d);
      const y = Math.round(G - 4 + Math.sin(a) * d * 0.9);
      if (y < 2 || y >= G) continue;
      put(g, x, y, cell('soil', 2));
      put(g, x + 1, y, cell('soil', 3));
      put(g, x, y + 1, cell('soil', 5));
    }
  // Sunk into the floor: everything below the floor's line gone, a ring of thrown earth round him.
  if (sunk > 0) {
    for (let y = G - 2; y < KING_H; y++) for (let x = 0; x < KING_W; x++) g.d[y * KING_W + x] = 0;
    for (let x = AX - 30; x <= AX + 30; x++) {
      const h = Math.round(4 - Math.abs(x - AX) * 0.1 + Math.sin(x * 0.7) * 1.2);
      for (let j = 0; j < h; j++)
        put(g, x, G - j, cell('soil', j === h - 1 ? 2 : 4 - (j > 1 ? 1 : 0)));
    }
  }
  return g;
}

/** Diving head first into the floor: his rump and robe up, his head and arms gone into the earth. */
function diving(f: number, phase: KingPhase): TGrid {
  const p: KingPose = {
    arms: 'dig',
    dive: true,
    eyes: 'shut',
    spray: 2,
    sunk: [10, 30, 58][f]!,
    at: { body: [6, 0], head: [6, 12] },
  };
  const g = king(p, phase);
  return g;
}

/** Laid flat on his back, crown rolled off, robe spread, eyes crossed out. */
function onHisBack(phase: KingPhase): { grid: TGrid; feet: { x: number; y: number } } {
  const g = tgrid(KING_W, KING_H);
  const gr = G;
  // The robe spread under him.
  shaped(
    g,
    poly([
      [10, gr],
      [16, gr - 10],
      [60, gr - 12],
      [84, gr - 6],
      [86, gr],
    ]),
    'violet',
    { base: 3.2, contrast: 1.3, radius: 3 },
  );
  // The barrel of him lying along, belly up (black), grey sides.
  mass(g, 46, gr - 14, 26, 12, 'badger', { base: 3.4, k: 1.4 });
  for (let x = 30; x < 64; x++)
    put(g, x, gr - 23 + Math.round(Math.abs(x - 46) * 0.08), cell('badger', 4));
  // The sash across him.
  for (let x = 36; x < 56; x++)
    for (let j = 0; j < 4; j++)
      put(g, x, gr - 20 + Math.round((x - 36) * 0.4) + j, cell('crimson', j === 0 ? 1 : 3));
  // Paws in the air, legs up.
  for (const [x0, x1] of [
    [38, 34],
    [52, 56],
    [64, 70],
  ] as const) {
    rod(g, x0, gr - 22, x1, gr - 34, 7, 'badger', [3, 4, 5]);
    paw(g, x1, gr - 36, false);
  }
  // The head lolling at the right, the stripe, eyes crossed out.
  kingHead(g, 80, gr - 10, { eyes: 'out', open: true }, phase);
  // The crown rolled off onto the floor beyond him.
  crown(g, 6, gr - 6, phase, 0.6);
  return { grid: outlineIn(g), feet: { x: KING_ANCHOR.x, y: gr + 1 } };
}

/** Sat down heavily (the fall's first frame): legs out before him, dazed. */
const SAT: KingPose = {
  sunk: 0,
  arms: 'rest',
  eyes: 'shut',
  open: true,
  at: { body: [-2, 8], head: [-2, 10] },
};

type Drawn = 'idle' | 'walk' | 'windup' | 'strike' | 'hurt' | 'fall';

const KEYS: Readonly<Record<Drawn, readonly KingPose[]>> = {
  idle: [{}, { at: { body: [0, 1], head: [0, 1] } }],
  walk: [
    { arms: 'walk', at: { legs: [3, 0], body: [0, 0] } },
    { arms: 'walk', at: { body: [0, -1], head: [0, -1] } },
    { arms: 'walk', at: { legs: [-3, 0], body: [0, 0] } },
    { arms: 'walk', at: { body: [0, -1], head: [0, -1] } },
  ],
  // The telegraph: both great fists raised over his crown, robe flaring, eyes wide.
  windup: [{ arms: 'raised', eyes: 'wide', open: true, at: { body: [-3, -2], head: [-3, -3] } }],
  strike: [
    { arms: 'slam', eyes: 'wide', open: true, spray: 1, at: { body: [4, 4], head: [6, 8] } },
  ],
  hurt: [{ eyes: 'shut', open: true, at: { body: [-4, 0], head: [-6, -1] } }],
  fall: [SAT, { down: true }],
};

/** His specials: going under, coming up, dazzled at a lantern. */
export const KING_SPECIALS: Readonly<Record<string, number>> = { burrow: 3, erupt: 3, stunned: 2 };

const made = new Map<string, { grid: TGrid; feet: { x: number; y: number } }>();

const PH = (phase: number): KingPhase =>
  Math.max(1, Math.min(3, Math.floor(phase) || 1)) as KingPhase;

/** How many frames each of his drawn poses has. */
export const KING_FRAMES: Readonly<Record<Drawn, number>> = {
  idle: KEYS.idle.length,
  walk: KEYS.walk.length,
  windup: 1,
  strike: 1,
  hurt: 1,
  fall: 2,
};

/** A frame of the king facing right in a phase (1 to 3): its grid and where he stands. */
export function kingFrame(
  pose: Drawn,
  frame: number,
  phase: number,
): { grid: TGrid; feet: { x: number; y: number } } {
  const ph = PH(phase);
  const keys = KEYS[pose];
  const f = ((Math.floor(frame) % keys.length) + keys.length) % keys.length;
  const key = `${pose} ${f} ${ph}`;
  let out = made.get(key);
  if (out) return out;
  const k = keys[f]!;
  out = k.down ? onHisBack(ph) : { grid: outlineIn(king(k, ph)), feet: { ...KING_ANCHOR } };
  made.set(key, out);
  return out;
}

/** One of his specials (`KING_SPECIALS`) facing right, at a frame and phase; null for another name. */
export function kingSpecial(
  special: string,
  frame: number,
  phase: number,
): { grid: TGrid; feet: { x: number; y: number } } | null {
  const n = KING_SPECIALS[special];
  if (!n) return null;
  const ph = PH(phase);
  const f = ((Math.floor(frame) % n) + n) % n;
  const key = `${special} ${f} ${ph}`;
  let out = made.get(key);
  if (out) return out;
  let g: TGrid;
  if (special === 'burrow') g = diving(f, ph);
  else if (special === 'erupt')
    g = king(
      {
        arms: f === 2 ? 'flung' : 'raised',
        eyes: f === 2 ? 'wide' : 'shut',
        open: true,
        spray: f === 0 ? 3 : f === 1 ? 2 : 1,
        sunk: [44, 20, 0][f]!,
      },
      ph,
    );
  else
    g = king(
      {
        arms: 'shade',
        eyes: 'shut',
        open: f === 1,
        at: { body: [f ? -1 : 1, 0], head: [f ? -2 : 0, 1] },
      },
      ph,
    );
  out = { grid: outlineIn(g), feet: { ...KING_ANCHOR } };
  made.set(key, out);
  return out;
}

/** Lets go of his kept frames. */
export function forgetKing(): void {
  made.clear();
}

void paint;
