/**
 * The hero walking across, seen from the side (B10b), on the skeleton of
 * rig2.ts. Facing right as drawn; walking left is the same figure with its
 * arms' jobs swapped (the shield arm toward the viewer, the sword arm beyond
 * the body), then mirrored, so the sword never changes hands.
 *
 * Eight frames a cycle, the same clock as the walk toward the camera: a foot
 * strikes with its heel (frame 0 for the near leg, 4 for the far), rolls flat,
 * and leaves from its toe; while it is down it moves back exactly
 * `WALK2_STRIDE` a frame, so it never slides. The knee is found from where the
 * foot must be, and the heel rises by itself when the hip has gone too far
 * ahead for a flat foot to reach.
 */
import { DEPTH } from '../depth';
import { cell, mirror, type TGrid } from '../town2/cells';
import type { Mat } from '../town2/ramps';
import { FIST2, OPEN_HAND2 } from './body';
import type { Part2 } from './engine';
import {
  along,
  drawLimb,
  joint,
  placed,
  Sheet,
  stackSheet,
  type Cover,
  type Limb,
  type Pt,
} from './rig2';

// ------------------------------------------------------------------ the body

/** The hip joint standing, the leg's bones, the ankle's row with the foot flat. */
export const SIDE_HIP: Pt = [28, 44];
export const THIGH = 11;
export const SHIN = 11;
export const ANKLE_ROW = 65;
/** The shoulder joint standing, and the arm's bones. */
export const SIDE_SHOULDER: Pt = [27, 26];
export const UPPER_ARM = 8;
export const FOREARM = 6;

/**
 * A boot in profile, toe to the right, in five poses: the heel striking (toe
 * up), flat, the heel rising, the heel high on the toe, and hanging in the
 * swing. Each says where its ankle is and which pixel meets the ground.
 */
export interface Foot2 {
  readonly rows: readonly string[];
  /** The ankle, where the shin ends, in the sprite's own rows. */
  readonly ankle: Pt;
  /** The pixel that bears the weight: the heel's (striking), the toe's (rising), or none (in the air). */
  readonly ground?: Pt;
}

export const FEET2: Readonly<Record<string, Foot2>> = {
  flat: {
    rows: ['.1223....', '.12233...', '0122233..', '012222334', '555555555'],
    ankle: [2, 0],
    ground: [0, 4],
  },
  heel: {
    rows: ['.1223..3.', '.1222334.', '012222345', '0122245..', '555......'],
    ankle: [2, 0],
    ground: [0, 4],
  },
  rise: {
    rows: ['.1223....', '01223....', '012233...', '5122333..', '.5122334.', '..55555..'],
    ankle: [2, 0],
    ground: [6, 5],
  },
  tip: {
    rows: ['.1223.', '01223.', '012233', '512233', '.51234', '..5234', '...55.'],
    ankle: [2, 0],
    ground: [4, 6],
  },
  hang: {
    rows: ['.1223...', '01223...', '0122333.', '51222334', '.5512345', '...555..'],
    ankle: [2, 0],
  },
};

/** Where each foot is in its cycle: down from heel strike (0) to toe off (4), then the swing. */
interface LegPhase {
  /** Down: where the flat foot's ankle would be, from the hip, in art pixels. */
  readonly ground?: number;
  /** In the air: the ankle from the hip, and the foot's pose. */
  readonly air?: Pt;
  readonly foot: readonly string[];
}

/**
 * The phases, by frame from this foot's heel strike. Down for five frames
 * (the double supports at each end shared with the other foot), moving back
 * `stride` a frame; through the air for three. A foot down tries its poses in
 * order and takes the first whose ankle the leg can reach.
 */
function legPhases(stride: number): LegPhase[] {
  const g0 = stride * 2 - 2;
  return [
    { ground: g0, foot: ['heel', 'flat'] },
    { ground: g0 - stride, foot: ['flat', 'rise'] },
    { ground: g0 - stride * 2, foot: ['flat', 'rise'] },
    { ground: g0 - stride * 3, foot: ['flat', 'rise', 'tip'] },
    { ground: g0 - stride * 4, foot: ['tip', 'rise'] },
    { air: [-Math.round(stride * 1.2), -4], foot: ['hang'] },
    { air: [1, -7], foot: ['hang'] },
    { air: [g0 - 2, -2], foot: ['heel'] },
  ];
}

/** How far the hips drop (+) or rise in each frame: lowest as the weight lands, highest passing. */
const BOB = [2, 1, 0, 0, 2, 1, 0, 0];

interface PosedLeg {
  readonly hip: Pt;
  readonly knee: Pt;
  readonly ankle: Pt;
  readonly foot: string;
  /** Where the foot sprite's ankle lands. */
  readonly footAt: Pt;
  /** Down: where the flat foot's ankle is on the ground. */
  readonly ground?: number;
}

function poseLeg(hip: Pt, phase: LegPhase): PosedLeg {
  const reach = THIGH + SHIN - 0.35;
  const footOf = (name: string): { ankle: Pt; at: Pt } | null => {
    const f = FEET2[name]!;
    if (phase.ground === undefined) {
      const a: Pt = [hip[0] + phase.air![0], ANKLE_ROW + phase.air![1]];
      return { ankle: a, at: a };
    }
    // The flat foot's heel and toe on the ground; the pose's own ground pixel lands where the flat foot has it.
    const flat = FEET2.flat!;
    const flatAnkle: Pt = [hip[0] + phase.ground, ANKLE_ROW];
    const g: Pt = f.ground ?? [0, 4];
    const flatG: Pt =
      g[0] > f.ankle[0]
        ? [flatAnkle[0] + (flat.rows[3]!.length - 1 - flat.ankle[0]), ANKLE_ROW + 4]
        : [flatAnkle[0] - flat.ankle[0], ANKLE_ROW + 4];
    const at: Pt = [flatG[0] - g[0] + f.ankle[0], flatG[1] - g[1] + f.ankle[1]];
    return { ankle: at, at };
  };
  let chosen = phase.foot[phase.foot.length - 1]!;
  let place = footOf(chosen)!;
  for (const name of phase.foot) {
    const p = footOf(name)!;
    if (Math.hypot(p.ankle[0] - hip[0], p.ankle[1] - hip[1]) <= reach) {
      chosen = name;
      place = p;
      break;
    }
  }
  const knee = joint(hip, place.ankle, THIGH, SHIN, 1);
  return {
    hip,
    knee,
    ankle: place.ankle,
    foot: chosen,
    footAt: place.at,
    ground: phase.ground === undefined ? undefined : hip[0] + phase.ground,
  };
}

// ------------------------------------------------------------------ dressing

/** What the walking figure wears, seen from the side, gathered from its gear. */
export interface SideDress {
  /** Rigid with the body: the torso and what is on it. */
  torso: Part2[];
  /** Rigid with the head. */
  head: Part2[];
  /** Down each leg from the hip, and each arm from the shoulder. */
  leg: Cover[];
  arm: Cover[];
  /** On the weapon arm only (a bracelet). */
  weaponArm: Cover[];
  /** The boot's material. */
  boot: Mat;
  bootPins?: Readonly<Record<string, readonly [Mat, number]>>;
  /** A skirt from the waist, kicked by the legs. */
  skirt?: SkirtSpec;
  /** A second, over the first (an apron over a dress). */
  skirt2?: SkirtSpec;
  /** Things on the joints: a pauldron at the shoulder, a couter at the elbow, a cop at the knee. */
  shoulderCap?: readonly string[];
  elbowCap?: readonly string[];
  kneeCap?: readonly string[];
  capMat?: Mat;
  /** What the weapon hand holds (front-view parts, carried rigidly with the fist), and the shield. */
  held: Part2[];
  shield: Part2[];
  /** A cloak behind. */
  cloak?: { mat: Mat };
  /** On the back (a quiver). */
  back: Part2[];
  /** What each arm does, if not swing (the townsfolk's busy hands). */
  nearJob?: ArmJob;
  farJob?: ArmJob;
  /** A peg for the near leg below the knee. */
  peg?: boolean;
  /** A walking stick in the near hand. */
  stick?: Mat;
  /** The body moved (columns, rows) from the hero's, the hips dropped (bent knees), the head moved from the body, the shoulder joint forward. */
  body?: readonly [number, number];
  hipDrop?: number;
  headAt?: readonly [number, number];
  shoulderDx?: number;
  capPins?: Readonly<Record<string, readonly [Mat, number]>>;
  /** What the off hand holds instead of a shield (a spyglass), about the fist. */
  offHeld?: Part2[];
}

export interface SkirtSpec {
  readonly mat: Mat;
  /** Rows of the waist (where it starts to swing) and the hem, standing. */
  readonly top: number;
  readonly hem: number;
  /** The columns it spans at the waist. */
  readonly x0: number;
  readonly x1: number;
  readonly steps?: readonly [number, number, number, number];
  /** Cut in tabs (a jerkin's skirt): every `tabs` columns a gap at the hem. */
  readonly tabs?: number;
  readonly depth: number;
  readonly pattern?: 'mail' | 'lames';
  /** An apron: hangs only in front, from the leading thigh. */
  readonly apron?: boolean;
}

// ------------------------------------------------------------------ the frame

/** Depths in the side view, back to front. */
export const SIDE = {
  FAR_ARM: -14,
  CLOAK: -13,
  FAR_LEG: -11,
  BACK: -9,
  NEAR_LEG: 10,
  FEET: 12,
  TORSO: 30,
  SKIRT: 36,
  NEAR_ARM: 52,
  FIST: 57,
  HELD: 60,
  HEAD: 65,
} as const;

export interface SideFrame {
  readonly sheet: Sheet;
  /** Where the weapon fist's top-left landed (FIST2's place), and whether that arm is the near one. */
  readonly fist: Pt;
  readonly weaponNear: boolean;
}

/** What an arm does while walking, if not swing freely. */
export interface ArmJob {
  /** Angles from straight down (+ toward the walk), in radians: the upper arm and the forearm. */
  readonly upper: number;
  readonly fore: number;
  /** How much of a free arm's swing it keeps, 0 to 1. */
  readonly swing?: number;
  /** What its hand does: closed on something, open, hidden (in a pocket, under a shield), a hook. */
  readonly hand?: 'fist' | 'open' | 'none' | 'hook';
  /** What it carries, placed about the fist as the front figure's fist (FIST2) has it. */
  readonly holds?: readonly Part2[];
  /** Upper arm and forearm lengths, if not the hero's. */
  readonly lengths?: readonly [number, number];
}

/** The hook a captain has for a hand: iron, curling forward. */
const HOOK = ['.12.', '.12.', '.13.', '1..3', '12.3', '.233'];

/**
 * One frame of the walk to the right. `swap` gives the near arm the shield's
 * job and the far arm the weapon's (walking left, before the mirror).
 */
export function sideFrame(
  dress: SideDress,
  frame: number,
  stride: number,
  swap: boolean,
): SideFrame {
  const sheet = new Sheet();
  const f = ((frame % 8) + 8) % 8;
  const bob = BOB[f]! + (dress.hipDrop ?? 0);
  const body = dress.body ?? [0, 0];
  const hip: Pt = [SIDE_HIP[0] + body[0], SIDE_HIP[1] + bob];
  const phases = legPhases(stride);
  const near = poseLeg(hip, phases[f]!);
  const far = poseLeg(hip, phases[(f + 4) % 8]!);

  // Legs: the far one a step darker and behind everything but the far arm and cloak.
  for (const [leg, depth, dark, isNear] of [
    [near, SIDE.NEAR_LEG, 0, true],
    [far, SIDE.FAR_LEG, 1, false],
  ] as const) {
    if (isNear && dress.peg) {
      drawPeg(sheet, leg, dress, depth);
      continue;
    }
    const limb: Limb = {
      pts: [leg.hip, leg.knee, leg.ankle],
      widths: [8, 6, 5],
      base: { mat: 'skin', from: 0, to: 99 },
      covers: dress.leg,
      far: dark,
    };
    drawLimb(sheet, limb, depth, 'leg');
    placed(sheet, FEET2[leg.foot]!.rows, FEET2[leg.foot]!.ankle, leg.footAt, {
      mat: dress.boot,
      pins: dress.bootPins,
      depth: depth + 2,
      tag: 'foot',
      darken: dark,
    });
    if (dress.kneeCap)
      placed(sheet, dress.kneeCap, [2, 2], leg.knee, {
        mat: dress.capMat ?? 'plate',
        depth: depth + 3,
        darken: dark,
      });
  }

  const by = bob + body[1];
  if (dress.skirt) drawSkirt(sheet, dress.skirt, by, [near, far], body[0]);
  if (dress.skirt2) drawSkirt(sheet, dress.skirt2, by, [near, far], body[0]);
  if (dress.cloak) drawCloak(sheet, dress.cloak.mat, by, f);

  // The torso and head, rigid with the hips' bob; the head leads by a column.
  const head = dress.headAt ?? [0, 0];
  for (const p of dress.torso) sheet.part(p, body[0], by);
  for (const p of dress.head) sheet.part(p, body[0] + 1 + head[0], by + head[1]);
  for (const p of dress.back) sheet.part(p, body[0], by, { depth: SIDE.BACK });

  // Arms swing against the legs: the near arm is back when the near leg is forward.
  const shoulder: Pt = [
    SIDE_SHOULDER[0] + body[0] + (dress.shoulderDx ?? 0),
    SIDE_SHOULDER[1] + by,
  ];
  const swing = Math.cos((f / 8) * Math.PI * 2);
  const hasWeapon = dress.held.length > 0;
  const hasShield = dress.shield.length > 0;
  const weaponArm = swap ? 'far' : 'near';
  const jobOf = (which: 'near' | 'far'): ArmJob => {
    const given = which === 'near' ? dress.nearJob : dress.farJob;
    if (given) return given;
    if (dress.offHeld && which !== weaponArm)
      return { upper: 0.05, fore: 0.35, swing: 0.5, hand: 'fist', holds: dress.offHeld };
    if (hasShield && which !== weaponArm)
      return { upper: 0.28, fore: 1.25, swing: 0.12, hand: 'none' };
    if (hasWeapon && which === weaponArm)
      return { upper: 0.1, fore: 0.5, swing: 0.5, hand: 'fist', holds: dress.held };
    return { upper: 0, fore: 0.15, swing: 1, hand: 'open' };
  };
  const arm = (which: 'near' | 'far') => {
    const job = jobOf(which);
    const s = (which === 'near' ? -swing : swing) * (job.swing ?? 0);
    const upper = job.upper + s * 0.5;
    const fore = job.fore + s * 0.5 + Math.max(0, s) * 0.6;
    const [lu, lf] = job.lengths ?? [UPPER_ARM, FOREARM];
    const elbow = along(shoulder, upper, lu);
    let wrist = along(elbow, fore, lf);
    if (job.holds?.length) {
      // A long blade must stay on the canvas: the hand does not rise above where it hangs standing.
      const top = Math.min(...job.holds.flatMap((p) => p.rows.map((_, j) => p.at[1] + j)));
      const highest = FIST2.at[1] - (top - 2);
      if (wrist[1] < highest) wrist = [wrist[0], highest];
      const bottom = Math.max(...job.holds.flatMap((p) => p.rows.map((_, j) => p.at[1] + j)));
      const lowest = FIST2.at[1] + (68 - bottom);
      if (wrist[1] > lowest) wrist = [wrist[0], lowest];
    }
    return { job, elbow, wrist };
  };
  for (const which of ['near', 'far'] as const) {
    const { job, elbow, wrist } = arm(which);
    const isNear = which === 'near';
    const depth = isNear ? SIDE.NEAR_ARM : SIDE.FAR_ARM;
    const dark = isNear ? 0 : 1;
    const weapon = hasWeapon && job.holds === dress.held;
    const covers = weapon ? [...dress.arm, ...dress.weaponArm] : dress.arm;
    drawLimb(
      sheet,
      {
        pts: [shoulder, elbow, wrist],
        widths: [5, 4, 4],
        base: { mat: 'skin', from: 0, to: 99 },
        covers,
        far: dark,
      },
      depth,
      'arm',
    );
    if (dress.shoulderCap)
      placed(sheet, dress.shoulderCap, [4, 3], shoulder, {
        mat: dress.capMat ?? 'plate',
        pins: dress.capPins,
        depth: depth + 1,
        darken: dark,
      });
    if (dress.elbowCap)
      placed(sheet, dress.elbowCap, [2, 1], elbow, {
        mat: dress.capMat ?? 'plate',
        depth: depth + 1,
        darken: dark,
      });
    const fistAt: Pt = [Math.round(wrist[0]) - 2, Math.round(wrist[1])];
    const dx = fistAt[0] - FIST2.at[0];
    const dy = fistAt[1] - FIST2.at[1];
    if (job.hand === 'fist')
      sheet.part(FIST2, dx, dy, { depth: depth + 5, tag: weapon ? 'fist' : 'hand', darken: dark });
    else if (job.hand === 'open')
      sheet.part(OPEN_HAND2, dx, dy, { depth: depth + 5, tag: 'hand', darken: dark });
    else if (job.hand === 'hook')
      placed(sheet, HOOK, [1, 0], [wrist[0], wrist[1] + 1], {
        mat: 'iron',
        depth: depth + 5,
        darken: dark,
      });
    for (const p of job.holds ?? []) {
      const d =
        p.depth === DEPTH.GRIP
          ? depth + 4
          : p.depth === DEPTH.HELD_BEHIND
            ? depth - 0.5
            : depth + 8;
      sheet.part(p, dx, dy, {
        depth: d,
        tag: weapon ? (p.depth === DEPTH.GRIP ? 'grip' : 'held') : 'prop',
        darken: dark,
      });
    }
    if (hasShield && job.hand === 'none' && which !== weaponArm) {
      // Strapped to the forearm: its face toward the viewer on the near arm, its edge beyond the chest on the far.
      // Beyond the body the shield is held out at the wrist, so its edge clears the chest.
      const mid: Pt = isNear
        ? [(elbow[0] + wrist[0]) / 2, (elbow[1] + wrist[1]) / 2]
        : [wrist[0] + 1, (elbow[1] + wrist[1]) / 2];
      for (const p of isNear ? dress.shield : edgeOn(dress.shield)) {
        const box = extent(p);
        sheet.part(p, Math.round(mid[0] - box.cx), Math.round(mid[1] - box.cy), {
          depth: depth + 10,
          tag: 'shield',
          darken: dark,
        });
      }
    }
    if (dress.stick && isNear) {
      // A walking stick from the fist to the ground, planted by the far foot as it bears the weight.
      const tip: Pt = [far.footAt[0] + 4, 69];
      drawLimb(
        sheet,
        {
          pts: [[wrist[0] - 0.5, wrist[1] + 4], tip],
          widths: [2, 2],
          base: { mat: dress.stick, from: 0, to: 99, steps: [2, 2, 3, 3] },
          covers: [],
        },
        depth + 4,
        'prop',
      );
    }
  }
  const weapon = arm(weaponArm);
  return {
    sheet,
    fist: [Math.round(weapon.wrist[0]) - 2, Math.round(weapon.wrist[1])],
    weaponNear: weaponArm === 'near',
  };
}

/**
 * A peg for a leg below the knee: the trouser tied off over the knee, a dark
 * turned cup, the shaft two pixels wide, an iron ferrule on the ground. Stiff:
 * the knee does not bend, the leg swings from the hip like a pendulum.
 */
function drawPeg(sheet: Sheet, leg: PosedLeg, dress: SideDress, depth: number): void {
  const tip: Pt =
    leg.ground !== undefined
      ? [leg.ground + 1, 69]
      : [leg.footAt[0] + 2, Math.min(69, leg.footAt[1] + 4)];
  const dx = tip[0] - leg.hip[0];
  const dy = tip[1] - leg.hip[1];
  const len = Math.hypot(dx, dy);
  const knee: Pt = [leg.hip[0] + (dx * THIGH) / len, leg.hip[1] + (dy * THIGH) / len];
  drawLimb(
    sheet,
    {
      pts: [leg.hip, knee],
      widths: [8, 6],
      base: dress.leg[0] ?? { mat: 'cloth', from: 0, to: 99 },
      covers: [],
    },
    depth,
    'leg',
  );
  drawLimb(
    sheet,
    {
      pts: [knee, [knee[0] + (tip[0] - knee[0]) * 0.25, knee[1] + (tip[1] - knee[1]) * 0.25], tip],
      widths: [5, 3, 2],
      base: { mat: 'wood', from: 0, to: 99, steps: [2, 3, 4, 4] },
      covers: [{ mat: 'iron', from: len - THIGH - 2.5, to: 99, steps: [1, 2, 3, 3] }],
    },
    depth + 1,
    'leg',
  );
}

/** A part's box and middle. */
export function extent(p: Part2) {
  let x0 = 99;
  let x1 = -99;
  let y0 = 99;
  let y1 = -99;
  p.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++)
      if (row[i] !== '.' && row[i] !== ' ') {
        x0 = Math.min(x0, p.at[0] + i);
        x1 = Math.max(x1, p.at[0] + i);
        y0 = Math.min(y0, p.at[1] + j);
        y1 = Math.max(y1, p.at[1] + j);
      }
  });
  return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/**
 * A shield seen on its edge, on the far arm: its face squeezed to a few
 * columns (its rim, its field, its device where it crosses the middle), so it
 * shows as a shield's edge beyond the chest rather than vanishing.
 */
function edgeOn(parts: readonly Part2[]): Part2[] {
  const main = parts[0];
  if (!main) return [];
  const w = Math.max(...main.rows.map((r) => r.length));
  const pick = [0, Math.floor(w / 3), Math.floor(w / 2), w - 1];
  return [
    {
      ...main,
      rows: main.rows.map((r) => pick.map((i) => r[i] ?? '.').join('')),
    },
  ];
}

/** Where a leg's middle is at row `y`, down its thigh and shin. */
function legX(leg: PosedLeg, y: number): number | null {
  const segs: [Pt, Pt][] = [
    [leg.hip, leg.knee],
    [leg.knee, leg.ankle],
  ];
  for (const [a, b] of segs) {
    const lo = Math.min(a[1], b[1]);
    const hi = Math.max(a[1], b[1]);
    if (y >= lo && y <= hi) {
      const t = hi === lo ? 0 : (y - a[1]) / (b[1] - a[1]);
      return a[0] + (b[0] - a[0]) * t;
    }
  }
  return null;
}

/**
 * A skirt below the belt, laid per frame: it hangs from the waist and is
 * pushed out by whichever thigh is ahead and whichever is behind, so a hem
 * kicks forward with the stride and trails behind the back leg. Lit from its
 * back edge, a fold falling behind the near thigh, its hem a step darker.
 */
function drawSkirt(
  sheet: Sheet,
  s: SkirtSpec,
  bob: number,
  legs: readonly PosedLeg[],
  bx = 0,
): void {
  const [lit, field, shadow, edge] = s.steps ?? [1, 2, 3, 4];
  const top = s.top + bob;
  const hem = s.hem + bob;
  for (let y = top; y <= hem; y++) {
    const f = (y - top) / Math.max(1, hem - top);
    const xs = legs.map((l) => legX(l, y)).filter((x): x is number => x !== null);
    let front = Math.round(Math.max(s.x1 + bx + f, ...xs.map((x) => x + 4.5)));
    let back = Math.round(Math.min(s.x0 + bx - f * 1.5, ...xs.map((x) => x - 4.5)));
    if (s.apron) {
      // An apron is a panel hanging in front of the belly, a few columns deep,
      // kicked forward a little by the leading knee rather than wrapping it.
      const kick = Math.max(0, Math.min(3, front - (s.x1 + bx + 5)));
      front = Math.round(s.x1 + bx + 1 + f * (2 + kick));
      back = front - (3 + Math.round(f * 2));
    }
    const nearX = legX(legs[0]!, y);
    for (let x = back; x <= front; x++) {
      const t = (x - back) / Math.max(1, front - back);
      let step = x === back ? lit : x === front ? edge : t < 0.6 ? field : t < 0.9 ? shadow : edge;
      if (nearX !== null && y > top + 2 && Math.round(nearX - 4) === x) step += 1;
      if (y === hem) step += 1;
      if (s.pattern === 'mail') step += (x + (y >> 1)) % 2 === 0 ? 0 : 1;
      if (s.pattern === 'lames') {
        const r = (y - top) % 3;
        step = r === 0 ? Math.max(0, step - 1) : r === 2 ? step + 2 : step;
      }
      if (s.tabs && y >= hem - 2 && (x - back) % (s.tabs + 1) === s.tabs) continue;
      sheet.add(x, y, cell(s.mat, Math.min(5, step)), s.depth, 'skirt');
    }
  }
}

/**
 * A cloak from the shoulders, hanging behind and trailing as the walker goes:
 * its hem lifts and sways with each step, its outer face lit along the back
 * edge, two long folds down it.
 */
function drawCloak(sheet: Sheet, mat: Mat, bob: number, f: number): void {
  const top = 23 + bob;
  const hem = Math.min(67, 66 + bob);
  const trail = 4 + 1.5 * Math.sin((f / 8) * Math.PI * 4);
  for (let y = top; y <= hem; y++) {
    const t = (y - top) / (hem - top);
    const back = Math.round(23 - t * 4 - trail * t ** 1.6);
    const front = Math.round(28 + t * 2);
    const lift = y === hem && (back + front) % 2 === 0;
    for (let x = back; x <= front; x++) {
      const a = (x - back) / Math.max(1, front - back);
      let step = x === back ? 1 : a < 0.35 ? 2 : a < 0.7 ? 3 : 4;
      if (
        y > top + 6 &&
        (x === Math.round(back + (front - back) * 0.3) ||
          x === Math.round(back + (front - back) * 0.62))
      )
        step += 1;
      if (y === hem) step += 1;
      void lift;
      sheet.add(x, y, cell(mat, Math.min(5, step)), SIDE.CLOAK, 'cloak');
    }
  }
}

/** One frame of the side walk, stacked and outlined; `left` swaps the arms' jobs and mirrors. */
export function sideWalkGrid(
  dress: SideDress,
  frame: number,
  stride: number,
  left: boolean,
): { grid: TGrid; tags: readonly (string | null)[]; fist: Pt; weaponNear: boolean } {
  const fr = sideFrame(dress, frame, stride, left);
  const { grid, tags } = stackSheet(fr.sheet);
  if (!left) return { grid, tags, fist: fr.fist, weaponNear: fr.weaponNear };
  const w = grid.w;
  const mtags = tags.map((_, i) => tags[Math.floor(i / w) * w + (w - 1 - (i % w))]!);
  return {
    grid: mirror(grid),
    tags: mtags,
    fist: [w - 1 - fr.fist[0] - 4, fr.fist[1]],
    weaponNear: fr.weaponNear,
  };
}
