/**
 * Captain Brinebeard at the C scale, the grotto's boss, on a canvas of his
 * own: a head and more taller than the hero and half as wide again, a purple
 * coat heavy with brass braid, a beard of grey-green brine with shells and a
 * starfish caught in it, a great tricorn, his own anchor.
 *
 * Three phases, each a different man to look at, so the fight's turns read
 * across the room:
 * 1. The captain: hat, coat buttoned over his belly, the anchor slung on his
 *    back, his cutlass levelled to call the cannon.
 * 2. The tide: both arms flung up to call the sea, coat and beard streaming
 *    wet, eyes lit sea-green, the water already round his boots.
 * 3. The anchor: hat gone and hair wild, the coat torn off one shoulder, the
 *    anchor in both hands, eyes red, roaring.
 *
 * He is drawn by pose rather than by moving whole parts: each frame says
 * where his body, head and hands are, and the arms are drawn from shoulder
 * to elbow to hand to meet them, so a swing bends the arm as it should.
 */
import { cell, darker, hash, put, tgrid, type Cell, type TGrid } from '../town2/cells';
import type { Mat } from '../town2/ramps';
import type { Glow } from '../raster';
import { outlineIn } from '../figure2/engine';
import { cyl } from '../town2/texture';
import { dome, lim, litBy, paint, rod, sprite } from './kit';

export const BOSS_W = 104;
export const BOSS_H = 112;
/** Where he stands: the middle of his boots on the ground row. */
export const BOSS_ANCHOR = { x: 48, y: 110 } as const;

export type BossPhase = 1 | 2 | 3;

/** One frame: where his parts are. Hands are absolute; the rest are offsets from standing. */
export interface BossKey {
  readonly body: readonly [number, number];
  readonly head: readonly [number, number];
  /** The near hand (viewer's left) and the far hand (right, toward where he faces). */
  readonly near: readonly [number, number];
  readonly far: readonly [number, number];
  /** Each boot's offset (walking). */
  readonly bootNear: readonly [number, number];
  readonly bootFar: readonly [number, number];
  /** The cutlass's direction from the far hand (phase 1), the anchor's from the hands (phase 3). */
  readonly aim: readonly [number, number];
  readonly roar?: boolean;
}

const G = 109; // the ground row before the outline

/* ----------------------------------------------------------------- pieces */

/** An arm from shoulder to hand, through an elbow pushed out to one side: a sleeve, a braided cuff, a fist. */
function arm(
  g: TGrid,
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  out: number,
  sleeve: Mat,
  far: boolean,
  bare: boolean,
  open = false,
): void {
  const mx = (sx + hx) / 2;
  const my = (sy + hy) / 2;
  const len = Math.hypot(hx - sx, hy - sy) || 1;
  // The elbow bends outward, more the shorter the reach.
  const bend = Math.max(0, 22 - len) * 0.5 + 2;
  const ex = mx + (-(hy - sy) / len) * bend * out;
  const ey = my + ((hx - sx) / len) * bend * out;
  const steps = far ? [3, 4, 5] : [1, 2, 3, 4];
  const m: Mat = bare ? 'skin' : sleeve;
  rod(g, sx, sy, ex, ey, 9, m, steps);
  rod(g, ex, ey, hx, hy, 8, m, steps);
  if (!bare) {
    // The cuff: brass braid round the wrist.
    const cx = hx + (ex - hx) * 0.28;
    const cy = hy + (ey - hy) * 0.28;
    rod(g, cx - 1, cy - 1, cx + 1, cy + 1, 7, 'bronze', far ? [2, 3, 4] : [1, 2, 3]);
  }
  if (open) {
    // An open hand, fingers spread to the sky.
    dome(g, hx + 0.5, hy + 0.5, 3.4, 3, 'skin', far ? 3 : 2, 2);
    for (const [dx, dy] of [
      [-3, -3],
      [-1, -4],
      [1, -4],
      [3, -3],
    ] as const) {
      put(g, hx + dx, hy + dy, cell('skin', far ? 3 : 2));
      put(g, hx + dx, hy + dy - 1, cell('skin', far ? 2 : 1));
    }
  } else dome(g, hx + 0.5, hy + 0.5, 3.6, 3.4, 'skin', far ? 3 : 2, 2);
}

/** A cutlass from the hand along `aim`: a brass cup guard, a broad curved blade, a nicked edge. */
function cutlass(g: TGrid, hx: number, hy: number, ax: number, ay: number): void {
  const len = Math.hypot(ax, ay) || 1;
  const ux = ax / len;
  const uy = ay / len;
  // The blade's back is to the light side.
  for (let i = 3; i <= 24; i++) {
    const curve = Math.sin((i / 24) * Math.PI * 0.6) * 2.2;
    const x = hx + ux * i - uy * curve;
    const y = hy + uy * i + ux * curve;
    const w = i > 20 ? 2 : 3;
    for (let j = 0; j < w; j++) {
      const t = j === 0 ? 0 : j === 1 ? 2 : 4;
      put(
        g,
        Math.round(x - uy * (j - 1)),
        Math.round(y + ux * (j - 1)),
        cell('iron', hash(i, j, 5) < 0.08 ? 5 : t),
      );
    }
  }
  dome(g, hx + ux * 2 + 0.5, hy + uy * 2 + 0.5, 3, 3, 'bronze', 2, 2);
}

/**
 * His anchor, from the ring to the crown: a wooden stock across by the ring,
 * an iron shank, arms curving back from the crown with spade flukes. Big:
 * an arm's length and more.
 */
function anchor(g: TGrid, rx: number, ry: number, cx: number, cy: number, dim = 0): void {
  const len = Math.hypot(cx - rx, cy - ry) || 1;
  const ux = (cx - rx) / len;
  const uy = (cy - ry) / len;
  // Arms: a curve back from the crown either side.
  for (const side of [-1, 1]) {
    let px = cx;
    let py = cy;
    for (let i = 1; i <= 14; i++) {
      const t = i / 14;
      const back = t * t * 9;
      const x = cx + side * -uy * t * 14 - ux * back;
      const y = cy + side * ux * t * 14 - uy * back;
      rod(g, px, py, x, y, 4, 'iron', [2 + dim, 3 + dim, 4 + dim]);
      px = x;
      py = y;
    }
    // The fluke, a spade at the arm's end.
    dome(g, px + 0.5, py + 0.5, 3.4, 3.4, 'iron', 2.6 + dim, 2);
    put(g, Math.round(px - ux * 4), Math.round(py - uy * 4), cell('iron', 1 + dim));
  }
  rod(g, rx, ry, cx, cy, 5, 'iron', [1 + dim, 2 + dim, 3 + dim, 4 + dim]);
  dome(g, cx + 0.5, cy + 0.5, 3.5, 3.5, 'iron', 2.8 + dim, 2);
  // The stock, wood, across the shank below the ring.
  const sx = rx + ux * 5;
  const sy = ry + uy * 5;
  rod(g, sx + uy * 13, sy - ux * 13, sx - uy * 13, sy + ux * 13, 4, 'bark', [
    1 + dim,
    2 + dim,
    4 + dim,
  ]);
  // The ring.
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    put(
      g,
      Math.round(rx - ux * 3 + Math.cos(t) * 3.4),
      Math.round(ry - uy * 3 + Math.sin(t) * 3.4),
      cell('iron', (t > Math.PI ? 2 : 4) + dim),
    );
  }
  // Rust.
  for (let i = 0; i < 10; i++) {
    const t = hash(i, 3, 61);
    put(g, Math.round(rx + (cx - rx) * t + 1), Math.round(ry + (cy - ry) * t), cell('tile', 4));
  }
}

/** A boot: heavy, cuffed, a brass buckle. */
function boot(g: TGrid, x: number, y: number, far: boolean): void {
  const d = far ? 1 : 0;
  paint(g, x, y, 15, 12, (xx, yy) => {
    const lx = xx - x;
    const ly = yy - y;
    if (ly < 3) return lx < 13 ? cell('tar', (ly === 0 ? 1 : 2) + d + (lx > 10 ? 1 : 0)) : 0;
    if (ly < 9)
      return lx > 1 && lx < 12 ? cell('tar', 2 + d + (lx > 8 ? 1 : 0) + (lx < 3 ? -1 : 0)) : 0;
    if (lx > 14 - (ly === 11 ? 0 : 1)) return 0;
    return cell('tar', ly === 11 ? 5 : 2 + d + (lx > 10 ? 1 : 0));
  });
  put(g, x + 5, y + 1, cell('bronze', 1 + d));
  put(g, x + 6, y + 1, cell('bronze', 2 + d));
}

/* ------------------------------------------------------------------ the man */

/** His look by phase: the coat's ramp, what is on his head, his eyes. */
interface PhaseLook {
  readonly coat: Mat;
  readonly wet: number;
  readonly hat: boolean;
  readonly torn: boolean;
  readonly eyes: 'cold' | 'sea' | 'fury';
  readonly slung: boolean;
}
const LOOKS: Readonly<Record<BossPhase, PhaseLook>> = {
  1: { coat: 'midnight', wet: 0, hat: true, torn: false, eyes: 'cold', slung: true },
  2: { coat: 'midnight', wet: 1, hat: true, torn: false, eyes: 'sea', slung: true },
  3: { coat: 'midnight', wet: 1, hat: false, torn: true, eyes: 'fury', slung: false },
};

function draw(phase: BossPhase, k: BossKey): { grid: TGrid; glows: Glow[] } {
  const look = LOOKS[phase];
  const g = tgrid(BOSS_W, BOSS_H);
  const [bx, by] = k.body;
  const [hx, hy] = [k.head[0] + bx, k.head[1] + by];
  const glows: Glow[] = [];
  const C = 48 + bx; // the body's middle column
  const coat = look.coat;
  const w = look.wet;

  // The slung anchor, on his back: the stock and ring above his near shoulder, the crown by his far boot.
  if (look.slung) anchor(g, C - 22, 22 + by, C + 27, 99 + by, 1);

  // The far arm when it is behind him (reaching back).
  const farBehind = k.far[0] < C;
  const shoulderN = [C - 17, 46 + by] as const;
  const shoulderF = [C + 17, 46 + by] as const;
  if (farBehind)
    arm(g, shoulderF[0], shoulderF[1], k.far[0], k.far[1], -1, coat, true, false, phase === 2);

  // Legs and boots: dark breeches into the boots, the far leg a step behind.
  const [fbx, fby] = k.bootFar;
  const [nbx, nby] = k.bootNear;
  rod(g, C + 6, 80 + by, C + 8 + fbx, G - 12 + fby, 11, 'cloth', [3, 4, 5]);
  boot(g, C + 2 + fbx, G - 11 + fby, true);
  rod(g, C - 6, 80 + by, C - 8 + nbx, G - 12 + nby, 12, 'cloth', [2, 3, 4]);
  boot(g, C - 15 + nbx, G - 11 + nby, false);

  // The coat: broad shoulders, the belly pushing it out, skirts flaring to the knee, a vent and folds.
  paint(g, C - 30, 40 + by, 61, 56, (x, y) => {
    const ly = y - (40 + by);
    const lx = x - C;
    const half =
      ly < 6
        ? 17 + ly * 1.4
        : ly < 26
          ? 24 + Math.sin(((ly - 6) / 20) * Math.PI) * 4
          : 24 + (ly - 26) * 0.2 + (ly > 34 ? (ly - 34) * 0.15 : 0);
    if (Math.abs(lx + 0.5) > half) return 0;
    // Torn off the near shoulder in the last phase: the shirt shows.
    if (look.torn && lx < -6 && ly < 14 + Math.round(Math.sin(lx) * 2)) return 0;
    const nx = (lx + 0.5) / half;
    let t = 2.6 - (litBy(nx * 0.9, ly < 10 ? -0.4 : 0) - 0.3) * 2.4;
    // Folds down the skirts, a lit lip beside each.
    if (ly > 30) {
      for (const f of [-14, -4, 9, 18]) {
        const fx = f + (ly - 30) * (f / 40);
        if (Math.abs(lx - fx) < 0.6) t += 1.2;
        else if (Math.abs(lx - fx + 1) < 0.6) t -= 0.8;
      }
    }
    // The front edges open from the belt down, the breeches showing between.
    if (ly > 30 && Math.abs(lx - 2) < (ly - 30) * 0.35) return 0;
    if (ly >= 55) t += 1;
    return cell(coat, lim(t + w + (hash(x, y, 71) < 0.04 ? 1 : 0), 1, 5));
  });
  // The front: wide lapels turned back in a lighter purple, a gold waistcoat
  // between them over the belly, buttoned.
  paint(g, C - 16, 44 + by, 33, 24, (x, y) => {
    const ly = y - (40 + by);
    const lx = x - C - 1;
    const open = 2 + ly * 0.42;
    if (Math.abs(lx) < open) {
      const t = 2.4 + (lx > 0 ? 1 : 0) + (Math.abs(lx) > open - 1.2 ? 1 : 0);
      return cell('ochre', lim(t + w, 1, 5));
    }
    if (Math.abs(lx) < open + 5 && !(look.torn && lx < 0)) {
      const edge = Math.abs(lx) < open + 1;
      return edge
        ? cell('bronze', lx < 0 ? 1 : 3)
        : cell('violet', lim((lx < 0 ? 1.6 : 3) + w, 1, 5));
    }
    return 0;
  });
  for (const y of [54, 59]) dome(g, C + 1.5, y + by + 0.5, 1.3, 1.3, 'bronze', 1.4, 2);
  // The torn edge and the shirt under it.
  if (look.torn) {
    paint(g, C - 26, 40 + by, 22, 16, (x, y) => {
      const ly = y - (40 + by);
      const lx = x - C;
      if (lx >= -6 || ly >= 14 + Math.round(Math.sin(lx) * 2)) return 0;
      if (Math.abs(lx + 0.5) > 17 + Math.min(ly, 6) * 1.4) return 0;
      return cell('cream', 2 + (((ly + 1) >> 1) % 2) + (lx > -12 ? 0 : 1));
    });
    for (let x = C - 26; x < C - 5; x++) {
      const y = 40 + by + 14 + Math.round(Math.sin(x - C) * 2);
      put(g, x, y, cell(coat, 1));
      if (hash(x, 1, 72) < 0.4) put(g, x, y + 1, cell(coat, 4));
    }
  }
  // Brass braid down the coat's front edges and along the hem; big buttons.
  for (let ly = 28; ly < 56; ly++) {
    const y = 40 + by + ly;
    const off = ly > 30 ? (ly - 30) * 0.35 : 0;
    put(g, Math.round(C + 2 - off - 1), y, cell('bronze', 2));
    put(g, Math.round(C + 2 + off + 1), y, cell('bronze', 3));
  }
  for (const [x, y] of [
    [C - 4, 74],
    [C - 6, 82],
  ] as const) {
    dome(g, x + 0.5, y + by + 0.5, 1.6, 1.6, 'bronze', 1.6, 2);
  }
  for (let x = C - 30; x <= C + 30; x++) {
    const y = 95 + by;
    if (g.d[y * BOSS_W + x]) put(g, x, y, cell('bronze', 3));
  }
  // The belt over the belly: wide leather, a brass buckle like a plate.
  paint(g, C - 26, 64 + by, 53, 5, (x, y) => {
    if (!g.d[y * BOSS_W + x]) return 0;
    return cell('leather', y === 64 + by ? 2 : x > C + 14 ? 4 : 3);
  });
  sprite(g, C - 5, 63 + by, ['aaaaaaa', 'abbbbbc', 'ab.K.bc', 'abbbbbc', 'acccccc'], {
    a: ['bronze', 0],
    b: ['bronze', 2],
    c: ['bronze', 4],
    K: ['leather', 4],
  });

  // The beard: a great grey-green fall over the chest in strands, each lit on
  // its left, darker on the side away from the light, ending in points of its
  // own length; strands of weed run through it.
  const bc = C + 1 + hx - bx;
  for (let lx = -17; lx <= 17; lx++) {
    const strand = Math.floor((lx + 40) / 2);
    const len =
      30 +
      Math.round(Math.cos((lx / 17) * 1.4) * 8) +
      Math.floor(hash(strand, 1, 73) * 5) -
      (Math.abs(lx) > 13 ? 8 : 0);
    const weed = hash(strand, 2, 73) < 0.1;
    for (let ly = 0; ly < len; ly++) {
      const half = ly < 8 ? 9 + ly * 1.0 : 17;
      const wave = Math.round(Math.sin(ly / 5 + strand) * 0.8);
      const x = bc + lx + wave;
      if (Math.abs(lx) > half) continue;
      const left = (lx + 40) % 2 === 0;
      let t =
        2 + (lx > 4 ? 1 : 0) + (lx > 11 ? 1 : 0) + (left ? -0.6 : 0.5) + (ly > len - 4 ? 0.8 : 0);
      t += w * 0.5;
      put(
        g,
        x,
        30 + hy + ly,
        weed && !left ? cell('weed', lim(t + 0.6, 2, 5)) : cell('hairgrey', lim(t, 1, 5)),
      );
    }
  }
  // Shells and a starfish in it.
  sprite(g, C - 6 + hx - bx, 50 + hy, ['.ab', 'abc'], {
    a: ['shell', 1],
    b: ['shell', 2],
    c: ['shell', 4],
  });
  sprite(g, C + 7 + hx - bx, 57 + hy, ['ab', 'bc'], {
    a: ['shell', 1],
    b: ['shell', 3],
    c: ['shell', 4],
  });
  sprite(g, C + 1 + hx - bx, 45 + hy, ['..a..', 'aabaa', '.bcb.', '.b.b.'], {
    a: ['crab', 1],
    b: ['crab', 2],
    c: ['crab', 3],
  });
  // Drips off the beard when the sea has him.
  if (w)
    for (let i = 0; i < 6; i++) {
      const x = C - 10 + hx - bx + Math.floor(hash(i, phase, 74) * 22);
      const y = 70 + hy + Math.floor(hash(i, 2, 74) * 4);
      put(g, x, y, cell('shoal', 1));
    }

  // The head: a broad red face, a nose like a knot of rope, brows like ledges, small hard eyes.
  const fx = C - 9 + hx - bx;
  const fy = 24 + hy;
  sprite(
    g,
    fx,
    fy,
    [
      '..ssssssssssssss....',
      '.sssssssssssssstu...',
      'sBBBBBsssssBBBBBBuv.',
      'ssBBBBBsssBBBBBBtuv.',
      'stsKKKKssssKKKKsuuv.',
      'stsWWIIsooWWIIWsuuvw',
      'sttsWWWsoorsWWWtuuvw',
      '.tttsssoorrrsssttuvw',
      '.ttttssorrrrrssttuv.',
      '..tttbbbbrrbbbbbtuv.',
      '..ttbbbbbbbbbbbbbv..',
      '...bbbbMMMMMMbbbbb..',
      '....bbbbbbbbbbbbb...',
    ],
    {
      s: ['skin', 1],
      t: ['skin', 2],
      u: ['skin', 3],
      v: ['skin', 4],
      w: ['skin', 5],
      o: ['madder', 1],
      r: ['madder', 2],
      B: ['hairgrey', 5],
      b: ['hairgrey', 2],
      K: ['eye', 4],
      W: ['eye', 1],
      I: ['eye', 3],
      M: ['shade', 3],
    },
  );
  // His ear, and a gold ring in it.
  sprite(g, fx - 2, fy + 5, ['.uu', 'utu', 'uvu', '.g.'], {
    u: ['skin', 3],
    t: ['skin', 2],
    v: ['skin', 4],
    g: ['gold', 1],
  });
  // The eyes by phase: cold and pale; lit sea-green; red with fury.
  const eyeAt = [
    [fx + 5, fy + 5],
    [fx + 12, fy + 5],
  ] as const;
  for (const [ex, ey] of eyeAt) {
    if (look.eyes === 'sea') {
      put(g, ex, ey, cell('shoal', 0));
      put(g, ex + 1, ey, cell('shoal', 0));
      put(g, ex, ey + 1, cell('shoal', 1));
      put(g, ex + 1, ey + 1, cell('shoal', 1));
    } else if (look.eyes === 'fury') {
      put(g, ex + 1, ey, cell('ember', 3));
      put(g, ex + 2, ey, cell('ember', 4));
      put(g, ex, ey, cell('crimson', 1));
    }
  }
  if (look.eyes === 'fury')
    glows.push({ x: fx + 9.5, y: fy + 5.5, radius: 9, strength: 0.35, always: true });
  // The mouth: a sneer with a gold tooth, or roaring.
  if (k.roar)
    sprite(g, fx + 6, fy + 11, ['MMMMMMM', 'MaMMMaM', 'MMrrrMM', '.MMMMM.'], {
      M: ['shade', 3],
      a: ['cream', 1],
      r: ['crimson', 4],
    });
  else put(g, fx + 9, fy + 11, cell('gold', 1));

  // What is on his head: the great tricorn with brass edging and a skull, or wild hair.
  if (look.hat) {
    const hx0 = fx - 12;
    const hy0 = fy - 16;
    paint(g, hx0, hy0, 46, 20, (x, y) => {
      const lx = x - hx0;
      const ly = y - hy0;
      // The crown: a dome; the brim: turned up in three points, wide either side.
      const crown = Math.hypot((lx - 22) / 11, (ly - 9) / 9) <= 1 && ly <= 14;
      const brimTop =
        12 -
        Math.round(Math.abs(lx - 22) * 0.38) -
        (Math.abs(lx - 22) > 17 ? Math.abs(lx - 22) - 17 : 0);
      const brim =
        ly >= brimTop && ly <= 17 - Math.round(Math.abs(lx - 22) * 0.12) && Math.abs(lx - 22) <= 21;
      if (!crown && !brim) return 0;
      if (brim && (ly === brimTop || ly === brimTop + 1))
        return cell('bronze', ly === brimTop ? 1 : 3);
      const nx = (lx - 22) / 22;
      const t = 2.6 - (litBy(nx, crown && !brim ? (ly - 9) / 9 : 0.2) - 0.3) * 2 + (brim ? 0.6 : 0);
      return cell('felt', lim(t + w, 1, 5));
    });
    // The skull and bones, painted on the front.
    sprite(g, hx0 + 19, hy0 + 5, ['.aaa.', 'aaaaa', 'aKaKa', '.aaa.', 'b.a.b', '.b.b.', 'b...b'], {
      a: ['plaster', 1],
      K: ['felt', 6],
      b: ['plaster', 3],
    });
    // A purple plume, ragged.
    rod(g, hx0 + 10, hy0 + 8, hx0 + 2, hy0, 3, 'plum', [1, 2, 4]);
    rod(g, hx0 + 6, hy0 + 4, hx0, hy0 + 3, 2, 'plum', [2, 3]);
  } else {
    // Wild grey hair, flung back off his head in locks, lit on top.
    paint(g, fx - 1, fy - 5, 22, 7, (x, y) => {
      const lx = x - fx;
      const d = Math.hypot((lx - 9.5) / 11, (y - fy - 1) / 5.5);
      return d <= 1 && y <= fy + 1 ? cell('hairgrey', y < fy - 2 ? 1 : lx > 13 ? 3 : 2) : 0;
    });
    for (let i = 0; i < 9; i++) {
      const x0 = fx + 1 + i * 2.2;
      const y0 = fy - 3 + Math.abs(i - 4) * 0.4;
      const len = 7 + hash(i, 1, 76) * 7;
      const x1 = x0 - len * 0.9;
      const y1 = y0 - len * 0.45 + Math.sin(i * 1.7) * 2;
      rod(g, x0, y0, x1, y1, 2, 'hairgrey', i % 2 ? [2, 4] : [1, 3]);
    }
  }

  // The near arm and the far arm, what each holds.
  const farHolds = phase === 1;
  const both = phase === 3;
  if (both) {
    // The anchor in both hands: drawn behind the near arm, in front of the far.
    if (!farBehind) arm(g, shoulderF[0], shoulderF[1], k.far[0], k.far[1], 1, coat, true, false);
    const [ax, ay] = k.aim;
    anchor(g, k.near[0] - ax * 6, k.near[1] - ay * 6, k.near[0] + ax * 40, k.near[1] + ay * 40);
    arm(g, shoulderN[0], shoulderN[1], k.near[0], k.near[1], -1, coat, false, true);
  } else {
    if (!farBehind)
      arm(g, shoulderF[0], shoulderF[1], k.far[0], k.far[1], 1, coat, true, false, phase === 2);
    if (farHolds) cutlass(g, k.far[0], k.far[1], k.aim[0], k.aim[1]);
    arm(g, shoulderN[0], shoulderN[1], k.near[0], k.near[1], -1, coat, false, false, phase === 2);
  }

  // The sea round his boots while he calls it.
  if (phase === 2)
    paint(g, C - 30, G - 5, 61, 6, (x, y) => {
      const d = Math.hypot((x + 0.5 - C) / 29, (y + 0.5 - (G - 1)) / 3.4);
      if (d > 1 || d < 0.55) return 0;
      if (g.d[y * BOSS_W + x] && y < G - 2) return 0;
      return cell('shoal', hash(x, y, 75) < 0.45 ? 0 : d > 0.85 ? 2 : 1);
    });

  return { grid: outlineIn(g), glows };
}

/* ------------------------------------------------------------------- frames */

const at = (x: number, y: number) => [x, y] as const;
const still = {
  body: at(0, 0),
  head: at(0, 0),
  bootNear: at(0, 0),
  bootFar: at(0, 0),
};

/** His standing keys by phase: the hands where each phase holds them. */
const STANDING: Readonly<Record<BossPhase, BossKey>> = {
  // The cutlass levelled forward and up, the other fist on his hip.
  1: { ...still, near: at(26, 66), far: at(76, 46), aim: at(10, -6) },
  // Both arms up and out, calling the sea.
  2: { ...still, near: at(18, 18), far: at(80, 16), aim: at(0, -1) },
  // The anchor gripped low across him, its crown out in front.
  3: { ...still, near: at(36, 58), far: at(46, 55), aim: at(-0.4, -0.92) },
};

export type BossPose = 'idle' | 'walk' | 'windup' | 'strike' | 'hurt' | 'fall';
export const BOSS_FRAMES: Readonly<Record<BossPose, number>> = {
  idle: 2,
  walk: 4,
  windup: 1,
  strike: 1,
  hurt: 1,
  fall: 2,
};

const shift = (p: readonly [number, number], dx: number, dy: number) => at(p[0] + dx, p[1] + dy);

function keyFor(phase: BossPhase, pose: BossPose, f: number): BossKey {
  const s = STANDING[phase];
  switch (pose) {
    case 'idle':
      return f === 0
        ? s
        : {
            ...s,
            body: at(0, -1),
            head: at(0, 0),
            near: shift(s.near, 0, -1),
            far: shift(s.far, 0, -1),
          };
    case 'walk': {
      // A heavy roll: each boot forward in turn, the body dropping onto it.
      const step = [3, 0, -3, 0][f]!;
      const bob = [1, 0, 1, 0][f]!;
      return {
        ...s,
        body: at(0, bob),
        head: at(f === 0 ? 1 : f === 2 ? -1 : 0, 0),
        bootNear: at(step, step < 0 ? -2 : 0),
        bootFar: at(-step, step > 0 ? -2 : 0),
        near: shift(s.near, -step * 0.5, bob),
        far: shift(s.far, step * 0.5, bob),
      };
    }
    case 'windup':
      if (phase === 1)
        return {
          ...s,
          far: at(70, 26),
          aim: at(4, -10),
          body: at(-1, 0),
          head: at(-1, 0),
          roar: true,
        };
      if (phase === 2)
        return { ...s, near: at(22, 10), far: at(76, 8), body: at(0, -1), roar: true };
      return {
        ...s,
        near: at(30, 54),
        far: at(40, 50),
        aim: at(-0.82, -0.58),
        body: at(-3, 0),
        head: at(-2, 0),
        roar: true,
      };
    case 'strike':
      if (phase === 1)
        return { ...s, far: at(84, 66), aim: at(8, 8), body: at(2, 1), head: at(2, 1), roar: true };
      if (phase === 2)
        return {
          ...s,
          near: at(30, 72),
          far: at(70, 72),
          body: at(0, 2),
          head: at(0, 2),
          roar: true,
        };
      return {
        ...s,
        near: at(62, 64),
        far: at(70, 60),
        aim: at(0.95, 0.3),
        body: at(4, 1),
        head: at(3, 1),
        roar: true,
      };
    case 'hurt':
      return {
        ...s,
        body: at(-2, 1),
        head: at(-3, 0),
        near: shift(s.near, -3, -2),
        far: shift(s.far, -2, 2),
        roar: true,
      };
    case 'fall':
      return {
        ...s,
        body: at(-2, 6),
        head: at(-3, 4),
        near: at(24, 84),
        far: at(66, 82),
        bootNear: at(-2, 0),
        bootFar: at(4, 0),
        aim: phase === 3 ? at(1, 0.15) : s.aim,
      };
  }
}

export interface BossFrame {
  readonly grid: TGrid;
  readonly glows: readonly Glow[];
  readonly anchor: { readonly x: number; readonly y: number };
}

const frames = new Map<string, BossFrame>();

/** Brinebeard in a phase and pose, facing right; kept once drawn. Fall's second frame lies on his back. */
export function bossFrame(phase: BossPhase, pose: BossPose, frame: number): BossFrame {
  const f = Math.abs(Math.floor(frame)) % BOSS_FRAMES[pose];
  const key = `${phase} ${pose} ${f}`;
  let made = frames.get(key);
  if (!made) {
    if (pose === 'fall' && f === 1) {
      const { grid } = draw(phase, keyFor(phase, 'fall', 0));
      const lying = tgrid(grid.h, grid.w);
      for (let y = 0; y < grid.h; y++)
        for (let x = 0; x < grid.w; x++)
          lying.d[(grid.w - 1 - x) * lying.w + y] = grid.d[y * grid.w + x]!;
      let low = 0;
      for (let i = 0; i < lying.d.length; i++) if (lying.d[i]) low = Math.floor(i / lying.w);
      made = { grid: lying, glows: [], anchor: { x: 96, y: low } };
    } else {
      const { grid, glows } = draw(phase, keyFor(phase, pose, f));
      made = { grid, glows, anchor: BOSS_ANCHOR };
    }
    frames.set(key, made);
  }
  return made;
}

void darker;
void cyl;
void (0 as unknown as Cell);
