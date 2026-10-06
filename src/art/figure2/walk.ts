/**
 * Walking and breathing at the C scale, for every look, every piece of gear
 * and every townsperson, without a second drawing of any of them.
 *
 * A figure is drawn once, standing (dress.ts, folk.ts). Each of its parts
 * moves with a bone (engine.ts, `Bone`): the head, the body, the near and far
 * leg (split at the crotch), the near and far arm, what each hand holds, a
 * skirt and a cloak. A frame is a key: how far each foot is from where it
 * stands and how high it is lifted, where each knee is, how far each hand
 * swings, how far the body bobs, how far a hem and a cloak sway. Each bone is
 * bent by its joints a whole row at a time: a row of a leg between the hip
 * and the knee moves as one, sideways by the share of the knee's move it is
 * nearer to, and rows are dropped or repeated where a leg is shortened or
 * stretched. So a row of pixels stays a row of pixels, lit edges stay
 * unbroken, and a held thing moves rigidly with the wrist, its grip still
 * under the fingers. Nothing is rotated.
 *
 * The far leg is drawn behind everything but the cloak, so a near leg
 * stepping across it covers it and casts its step of shadow on it.
 */
import { DEPTH } from '../depth';
import { LINE, darker, isMat, type TGrid, tgrid } from '../town2/cells';
import { FIG_H, FIG_W } from './body';
import { outlineIn, pixels, type Bone, type Part2 } from './engine';

/** Which way a walker goes: toward the camera, or across (left is right mirrored). */
export type Facing2 = 'down' | 'right' | 'left';

/** A part and what it moves with. */
export interface Boned {
  readonly part: Part2;
  readonly bone: Bone;
}

/** Where a figure's joints are, standing. Rows and columns on the 56 x 72 canvas. */
export interface Rig2 {
  /** Rows of the hip, the knee, the ankle and the sole (the lowest drawn row before the outline). */
  readonly hip: number;
  readonly knee: number;
  readonly ankle: number;
  readonly sole: number;
  /** Leg pixels at or left of this column are the near leg's. */
  readonly split: number;
  /** Each foot's columns, standing, for tipping it heel or toe. */
  readonly feet: readonly [near: readonly [number, number], far: readonly [number, number]];
  /** The shoulders' row and each wrist's row: arms bend between them. */
  readonly shoulder: number;
  readonly wrists: readonly [near: number, far: number];
  /** How much each arm swings, 0 to 1 (an arm round a basket does not). */
  readonly swing: readonly [near: number, far: number];
  /** Where a skirt begins to sway and where its hem is. */
  readonly skirt: readonly [top: number, hem: number];
  /** Where a cloak hangs from and its hem. */
  readonly cloak: readonly [top: number, hem: number];
  /** The rows a breath lifts: the chest and shoulders above `chest[1]`, stretching to `chest[1]`. */
  readonly chest: readonly [top: number, bottom: number];
  /** A leg that does not bend at the knee (a peg). */
  readonly stiff?: 'near' | 'far';
  /** Half a step across, in art pixels (the stride per frame is half this). */
  readonly half: number;
}

/** The hero's joints (body.ts). */
export const HERO_RIG: Rig2 = {
  hip: 44,
  knee: 53,
  ankle: 61,
  sole: 69,
  split: 28,
  feet: [
    [20, 27],
    [29, 37],
  ],
  shoulder: 25,
  wrists: [38, 37],
  swing: [1, 0.5],
  skirt: [40, 54],
  cloak: [26, 67],
  chest: [6, 33],
  half: 14,
};

/** A foot's place in a frame, from where it stands: forward (+) or back, lifted, the knee's move, tipped. */
export interface LegKey {
  readonly dx: number;
  readonly lift: number;
  readonly knee: number;
  /** Rows the knee rises beyond its share of the lift (a knee brought up). */
  readonly kneeUp?: number;
  /** Heel up (+) or toe up (-), in rows at the far end of the foot. */
  readonly tilt?: number;
}
export interface ArmKey {
  readonly dx: number;
  readonly dy: number;
}
/** One frame. `bob` is down (+) or up (-) for everything above the hips. */
export interface Key2 {
  readonly bob: number;
  readonly near: LegKey;
  readonly far: LegKey;
  readonly armNear: ArmKey;
  readonly armFar: ArmKey;
  /** How far a skirt's hem moves, and a cloak's. */
  readonly sway: number;
  readonly cloak: number;
  /** Rows the chest and head rise (a breath). */
  readonly breath?: number;
  /** Columns each hip moves toward the other (walking across). */
  readonly hips?: number;
  /** Columns the head leads the body by, toward the walk. */
  readonly lean?: number;
  /** Columns each foot is lengthened toward the walk, toe first (walking across). */
  readonly toes?: number;
}

const still: LegKey = { dx: 0, lift: 0, knee: 0 };
const arm0: ArmKey = { dx: 0, dy: 0 };

/** Standing: every bone where it was drawn. */
export const STAND2: Key2 = {
  bob: 0,
  near: still,
  far: still,
  armNear: arm0,
  armFar: arm0,
  sway: 0,
  cloak: 0,
};

/** Frames in a walk cycle, in either facing. */
export const WALK2_FRAMES = 8;
/**
 * The hero's half step: at a step's contact the front foot is this far ahead
 * of where it stands and the back foot this far behind, so a planted foot
 * travels twice this in the four frames it is down.
 */
export const HERO_HALF_STEP = 14;
/** How far the ground passes under the hero each frame, in art pixels: the planted foot moves back this much. */
export const WALK2_STRIDE = HERO_HALF_STEP / 2;

/**
 * Walking right, a step with each leg: contact (heels apart, the body down),
 * the weight taken (lowest), passing (the free foot lifted past the planted
 * one), pushing off (the body highest, the back heel up), then the same with
 * the legs swapped. Arms swing against the legs. Across, the hips are drawn
 * closer together than standing (the pelvis turned to the walk), so the legs
 * scissor about one line rather than crossing.
 */
function sideStep(lead: 'near' | 'far', h: number): Key2[] {
  const leg = (front: LegKey, back: LegKey) =>
    lead === 'near' ? { near: front, far: back } : { near: back, far: front };
  const s = lead === 'near' ? -1 : 1;
  const r = (f: number) => Math.round(h * f);
  return [
    {
      bob: 1,
      ...leg(
        { dx: h, lift: 0, knee: r(0.45), tilt: -2 },
        { dx: -h, lift: 1, knee: -r(0.35), tilt: 3 },
      ),
      armNear: { dx: 3 * s, dy: -1 },
      armFar: { dx: -2 * s, dy: 0 },
      sway: -s,
      cloak: -2,
      hips: HIPS,
      lean: 1,
      toes: 2,
    },
    {
      bob: 1,
      ...leg(
        { dx: h / 2, lift: 0, knee: r(0.35) },
        { dx: -r(0.6), lift: 4, knee: -r(0.15), tilt: 2 },
      ),
      armNear: { dx: 2 * s, dy: 0 },
      armFar: { dx: -1 * s, dy: 0 },
      sway: -s,
      cloak: -3,
      hips: HIPS,
      lean: 1,
      toes: 2,
    },
    {
      bob: 0,
      ...leg({ dx: 0, lift: 0, knee: 1 }, { dx: 0, lift: 5, knee: r(0.3), kneeUp: 2 }),
      armNear: arm0,
      armFar: arm0,
      sway: 0,
      cloak: -2,
      hips: HIPS,
      lean: 1,
      toes: 2,
    },
    {
      bob: -1,
      ...leg(
        { dx: -h / 2, lift: 0, knee: -r(0.15), tilt: 2 },
        { dx: r(0.65), lift: 3, knee: r(0.55), kneeUp: 1, tilt: -1 },
      ),
      armNear: { dx: -2 * s, dy: 0 },
      armFar: { dx: 1 * s, dy: 0 },
      sway: s,
      cloak: -1,
      hips: HIPS,
      lean: 1,
      toes: 2,
    },
  ];
}
/** How far each hip moves toward the other when walking across. */
const HIPS = 3;

const sideKeys = new Map<number, Key2[]>();
/** Walking right (+ is forward) with this half step; left is this, mirrored. */
export function walkSide2(half: number): readonly Key2[] {
  let keys = sideKeys.get(half);
  if (!keys) sideKeys.set(half, (keys = [...sideStep('near', half), ...sideStep('far', half)]));
  return keys;
}
/** The hero's walk across. */
export const WALK_SIDE2: readonly Key2[] = walkSide2(HERO_HALF_STEP);

/**
 * Walking toward the camera: the feet stay under the hips and step by
 * lifting (a knee brought toward the viewer shortens the leg), the body
 * lowest as a foot lands and highest as the other passes, the arms swinging a
 * little against the legs.
 */
function downStep(lead: 'near' | 'far'): Key2[] {
  const leg = (planted: LegKey, free: LegKey) =>
    lead === 'near' ? { near: planted, far: free } : { near: free, far: planted };
  const s = lead === 'near' ? 1 : -1;
  return [
    {
      bob: 1,
      ...leg(still, { dx: 0, lift: 1, knee: 0 }),
      armNear: { dx: 0, dy: 0 },
      armFar: { dx: 0, dy: 0 },
      sway: 0,
      cloak: 0,
    },
    {
      bob: 1,
      ...leg(still, { dx: 0, lift: 3, knee: 0, kneeUp: 1 }),
      armNear: { dx: s, dy: s < 0 ? -1 : 0 },
      armFar: { dx: 0, dy: 0 },
      sway: s,
      cloak: s,
    },
    {
      bob: 0,
      ...leg(still, { dx: 0, lift: 4, knee: 0, kneeUp: 2 }),
      armNear: { dx: s, dy: -1 },
      armFar: { dx: 0, dy: s > 0 ? -1 : 0 },
      sway: s,
      cloak: s,
    },
    {
      bob: 0,
      ...leg(still, { dx: 0, lift: 2, knee: 0, kneeUp: 1 }),
      armNear: { dx: 0, dy: 0 },
      armFar: { dx: 0, dy: 0 },
      sway: 0,
      cloak: 0,
    },
  ];
}

/** Walking toward the camera. */
export const WALK_DOWN2: readonly Key2[] = [...downStep('far'), ...downStep('near')];

/** Frames of the standing breath, and the second: the chest and head a row up. */
export const IDLE2_FRAMES = 2;
export const IDLE2: readonly Key2[] = [STAND2, { ...STAND2, breath: 1 }];

// ------------------------------------------------------------ bending rows

/** A control point: source row, target row, sideways move at that row. */
type Ctl = readonly [s: number, t: number, dx: number];

/**
 * For every source row, the target rows it lands on and the sideways move of
 * each: worked back from target to source, so a stretched stretch repeats
 * rows and a shortened one drops them, and nothing is ever left with a hole.
 */
function rowMap(ctl: readonly Ctl[]): Map<number, [number, number][]> {
  const out = new Map<number, [number, number][]>();
  const first = ctl[0]!;
  const last = ctl[ctl.length - 1]!;
  for (let t = -24; t < FIG_H + 24; t++) {
    let s: number;
    let dx: number;
    if (t <= first[1]) {
      s = t - first[1] + first[0];
      dx = first[2];
    } else if (t >= last[1]) {
      s = t - last[1] + last[0];
      dx = last[2];
    } else {
      let i = 0;
      while (ctl[i + 1]![1] < t) i++;
      const [s0, t0, d0] = ctl[i]!;
      const [s1, t1, d1] = ctl[i + 1]!;
      const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      s = Math.round(s0 + (s1 - s0) * f);
      dx = Math.round(d0 + (d1 - d0) * f);
    }
    if (!out.has(s)) out.set(s, []);
    out.get(s)!.push([t, dx]);
  }
  return out;
}

const rigid = (dx: number, dy: number): Ctl[] => [[0, dy, dx]];

/** Each bone's rows, bent for a key. */
interface Bent {
  readonly maps: Record<string, Map<number, [number, number][]>>;
}

function legCtl(rig: Rig2, key: Key2, which: 'near' | 'far'): Ctl[] {
  const k = which === 'near' ? key.near : key.far;
  const hipT = rig.hip + key.bob;
  const ankleT = rig.ankle - k.lift;
  const share = (rig.knee - rig.hip) / (rig.ankle - rig.hip);
  const stiff = rig.stiff === which;
  const kneeT = Math.round(hipT + (ankleT - hipT) * share) - (stiff ? 0 : (k.kneeUp ?? 0));
  const kneeDx = stiff ? Math.round(k.dx * share) : k.knee;
  const hip = (key.hips ?? 0) * (which === 'near' ? 1 : -1);
  return [
    [rig.hip, hipT, hip],
    [rig.knee, kneeT, kneeDx + hip],
    [rig.ankle, ankleT, k.dx + hip],
  ];
}

function armCtl(rig: Rig2, key: Key2, which: 'near' | 'far'): Ctl[] {
  const a = which === 'near' ? key.armNear : key.armFar;
  const amp = rig.swing[which === 'near' ? 0 : 1];
  const dx = Math.round(a.dx * amp);
  const dy = Math.round(a.dy * amp);
  const wrist = rig.wrists[which === 'near' ? 0 : 1];
  const top = rig.shoulder + key.bob - (key.breath ?? 0);
  return [
    [rig.shoulder, top, 0],
    [wrist, wrist + key.bob - (key.breath ?? 0) + dy, dx],
  ];
}

/** How far a hand (and all it holds) is carried in a frame: [dx, dy]. */
export function handShift(rig: Rig2, key: Key2, which: 'near' | 'far'): readonly [number, number] {
  const c = armCtl(rig, key, which)[1]!;
  return [c[2], c[1] - c[0]];
}

function bend(rig: Rig2, key: Key2): Bent {
  const b = key.bob;
  const up = key.breath ?? 0;
  const body: Ctl[] = up
    ? [
        [rig.chest[0], rig.chest[0] + b - up, 0],
        [rig.chest[1] - 1, rig.chest[1] - 1 + b - up, 0],
        [rig.chest[1], rig.chest[1] + b, 0],
      ]
    : rigid(0, b);
  const [st, hem] = rig.skirt;
  const skirt: Ctl[] = [...(up ? body.slice(0, 2) : []), [st, st + b, 0], [hem, hem + b, key.sway]];
  const [ct, chem] = rig.cloak;
  const cloak: Ctl[] = [
    [ct, ct + b - up, 0],
    [Math.round((ct + chem) / 2), Math.round((ct + chem) / 2) + b, Math.round(key.cloak / 3)],
    [chem, chem + b, key.cloak],
  ];
  const nearArm = armCtl(rig, key, 'near');
  const farArm = armCtl(rig, key, 'far');
  const held = (c: Ctl[]) => rigid(c[1]![2], c[1]![1] - c[1]![0]);
  return {
    maps: {
      head: rowMap(rigid(key.lean ?? 0, b - up)),
      body: rowMap(body),
      skirt: rowMap(skirt),
      cloak: rowMap(cloak),
      near: rowMap(nearArm),
      far: rowMap(farArm),
      nearHeld: rowMap(held(nearArm)),
      farHeld: rowMap(held(farArm)),
      legN: rowMap(legCtl(rig, key, 'near')),
      legF: rowMap(legCtl(rig, key, 'far')),
    },
  };
}

/** Which bent bone a pixel of a part follows. */
function boneAt(bone: Bone, rig: Rig2, x: number, y: number): string {
  switch (bone) {
    case 'legs':
      return x <= rig.split ? 'legN' : 'legF';
    case 'trunk':
      return y < rig.hip ? 'body' : x <= rig.split ? 'legN' : 'legF';
    default:
      return bone;
  }
}

/** Depth for the far leg: behind everything but the cloak and quiver, in its own order. */
const FAR_LEG_DEPTH = DEPTH.HAIR_BACK + 0.5;

/**
 * The figure posed by `key`, not yet outlined: each part's pixels moved by
 * its bone, stacked by depth (the far leg pushed back), then the one-step
 * cast shadow as in `stack`.
 */
export function posed(boned: readonly Boned[], rig: Rig2, key: Key2): TGrid {
  const w = FIG_W;
  const h = FIG_H;
  const { maps } = bend(rig, key);
  type Px = { x: number; y: number; c: number; depth: number; casts: number; shaded: number };
  const all: { px: Px; order: number }[] = [];
  let order = 0;
  for (const { part, bone } of boned) {
    for (const [x, y, c] of pixels(part)) {
      const b = boneAt(bone, rig, x, y);
      const rows = maps[b]!.get(y);
      if (!rows) continue;
      const leg = b === 'legN' || b === 'legF';
      const k = b === 'legN' ? key.near : key.far;
      let tip = 0;
      if (leg && y > rig.ankle && k.tilt) {
        const [f0, f1] = rig.feet[b === 'legN' ? 0 : 1];
        const along = Math.max(0, Math.min(1, (x - f0) / (f1 - f0)));
        // The heel lifts and the toe stays down (or the toe lifts and the heel stays): half the foot is always on the ground.
        tip = -Math.round(
          k.tilt > 0
            ? (k.tilt * Math.max(0, 0.55 - along)) / 0.55
            : (-k.tilt * Math.max(0, along - 0.45)) / 0.55,
        );
      }
      const depth = b === 'legF' ? FAR_LEG_DEPTH + part.depth / 1000 : part.depth;
      // Walking across, a foot turns toward the walk: its front half moves
      // forward and its middle column is drawn again to fill the gap, so the
      // boot is longer, toe first, rather than square to the viewer.
      let xs: readonly number[] = [x];
      if (leg && y > rig.ankle && key.toes) {
        const [f0, f1] = rig.feet[b === 'legN' ? 0 : 1];
        const mid = Math.round((f0 + f1) / 2);
        if (x > mid) xs = [x + key.toes];
        else if (x === mid) xs = Array.from({ length: key.toes + 1 }, (_, i) => x + i);
      }
      for (const [t, dx] of rows)
        for (const sx of xs)
          all.push({
            px: {
              x: sx + dx,
              y: t + tip,
              c,
              depth,
              casts: part.cast === false ? 0 : 1,
              shaded: part.shaded === false ? 0 : 1,
            },
            order: order,
          });
      order++;
    }
  }
  all.sort((a, b) => a.px.depth - b.px.depth || a.order - b.order);
  const g = tgrid(w, h);
  const depthAt = new Float32Array(w * h).fill(-1e9);
  const casts = new Uint8Array(w * h);
  const shaded = new Uint8Array(w * h);
  for (const { px } of all) {
    if (px.x < 0 || px.y < 0 || px.x >= w || px.y >= h) continue;
    const i = px.y * w + px.x;
    g.d[i] = px.c;
    depthAt[i] = px.depth;
    casts[i] = px.casts;
    shaded[i] = px.shaded;
  }
  const out = g.d.slice();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const c = g.d[i]!;
      if (!c || isMat(c, 'eye') || !shaded[i]) continue;
      const front = (j: number) => g.d[j] !== 0 && casts[j] === 1 && depthAt[j]! > depthAt[i]!;
      if ((x > 0 && front(i - 1)) || (y > 0 && front(i - w))) out[i] = darker(c, 1);
    }
  g.d.set(out);
  return g;
}

/** Posed and outlined: a frame ready to stand on the ground. */
export const posedFigure = (boned: readonly Boned[], rig: Rig2, key: Key2): TGrid =>
  outlineIn(posed(boned, rig, key));

/** The key for a facing and frame (any whole number: it wraps). Left uses right's keys; the caller mirrors. */
export function walkKey(facing: Facing2, frame: number, half = HERO_HALF_STEP): Key2 {
  const keys = facing === 'down' ? WALK_DOWN2 : walkSide2(half);
  const n = keys.length;
  return keys[((Math.floor(frame) % n) + n) % n]!;
}

void LINE;
