/**
 * The hero's blow (B12; lane C faked it with a lunge and a glint): a short
 * attack in four frames, the same in every facing — the wind-up, the swing,
 * the blow landing (`STRIKE_HIT`), the recovery — for every weapon class and
 * every outfit. A blade, an axe, a cudgel or the anchor is swung; a bow is
 * raised, drawn and loosed; empty hands punch. The weapon stays in the right
 * hand, the shield arm is braced, the body turns and leans into the blow.
 *
 * Across, the figure is the walk's skeleton (side.ts) in a pose instead of a
 * step: feet planted apart, the hips dropping and moving forward as the blow
 * lands, each wrist placed and its elbow found. Toward the camera and away,
 * it is the front or back figure (views.ts) with the weapon arm drawn again
 * along its bones in the outfit's own sleeves (rig2.ts, `drawLimb`).
 *
 * The weapon is its own drawing, turned about the fist: by quarter turns,
 * exactly (no pixel resampled), then leant by sliding each row (or column)
 * sideways, as the carry does (carry.ts), so a blade's edge and midrib stay
 * unbroken; and foreshortened where it is longer than the canvas has room
 * for, as if pointing partly toward the viewer. That is how reach is kept on
 * the 56 x 72 canvas, anchor unchanged: a knight's long sword at full stretch
 * is drawn shorter, never cut off.
 */
import { DEPTH } from '../depth';
import { cell, matOf, stepOf, type Cell } from '../town2/cells';
import type { Mat } from '../town2/ramps';
import { FIG_H, FIG_W, FIST2, OPEN_HAND2 } from './body';
import { CARRY_PIVOT, foreshorten } from './carry';
import { pixels, type Bone, type Part2, type Pin } from './engine';
import { SIDE_SHOULDER, type SideArm, type SideArmAt, type SideDress, type SidePose } from './side';
import { drawLimb, joint, Sheet, type Cover, type Pt } from './rig2';
import { BACK_DEPTH, above, fromPixels, rowsOf } from './views';
import { STAND2, type Boned, type Key2 } from './walk';

/** Frames in a blow, and the one where it lands. */
export const STRIKE_FRAMES = 4;
export const STRIKE_HIT = 2;

/** How a blow is made: swung (blades, axes, the cudgel, the anchor), loosed from a bow, or punched. */
export type StrikeKind = 'swing' | 'bow' | 'unarmed';

/** The kind of blow for a held weapon's gear id (none: a punch). */
export const strikeKind = (weaponGear: string | null | undefined): StrikeKind =>
  !weaponGear ? 'unarmed' : /bow/.test(weaponGear) ? 'bow' : 'swing';

// ------------------------------------------------------------ turning a weapon

/**
 * How a weapon is turned about the fist: `q` quarter turns toward the blow
 * (0 upright as drawn, 1 pointing forward, 2 point down, 3 pointing back),
 * then `lean` columns (or rows) slid per pixel along it, + toward the blow
 * when upright or point down, + downward when it lies along the ground.
 */
export interface Turn {
  readonly q: 0 | 1 | 2 | 3;
  readonly lean: number;
}

const [PX, PY] = CARRY_PIVOT;

/** A point of the upright drawing, turned. Quarter turns keep the lit edge on the top or the left. */
function turnPoint(x: number, y: number, t: Turn): [number, number] {
  const dx = x - PX;
  const dy = y - PY;
  let nx: number;
  let ny: number;
  switch (t.q) {
    case 0:
      [nx, ny] = [dx, dy];
      nx += Math.round(t.lean * -dy);
      break;
    case 1:
      [nx, ny] = [-dy, dx];
      ny += Math.round(t.lean * nx);
      break;
    case 2:
      [nx, ny] = [dx, -dy];
      nx += Math.round(t.lean * ny);
      break;
    default:
      [nx, ny] = [dy, dx];
      ny += Math.round(t.lean * -nx);
  }
  return [PX + nx, PY + ny];
}

/** The fist's own pixels, where a grip may show. */
const FINGERS = new Set(pixels(FIST2).map(([x, y]) => y * 1000 + x));

function turnedAt(parts: readonly Part2[], t: Turn, keep: number): Part2[] {
  return parts.map((p) => {
    const px: [number, number, string][] = [];
    for (const [y, row] of rowsOf(p)) for (const [x, ch] of row) px.push([x, y, ch]);
    const seen = new Set<number>();
    const out: [number, number, string][] = [];
    for (const [x, y, ch] of foreshorten(px, keep)) {
      const [nx, ny] = turnPoint(x, y, t);
      // The grip only under the fingers, and nothing else over them: the fist shows whole.
      if ((p.depth === DEPTH.GRIP) !== FINGERS.has(ny * 1000 + nx)) continue;
      const k = ny * 1000 + nx;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push([nx, ny, ch]);
    }
    return fromPixels(p, out);
  });
}

/**
 * A held thing's parts turned about the fist, foreshortened only as much as
 * it takes to stay a pixel inside the canvas once the fist is moved by
 * (`dx`, `dy`).
 */
export function turnHeld(parts: readonly Part2[], t: Turn, dx: number, dy: number): Part2[] {
  // Room for the outline and for the body's turn of a column either way, and its drop.
  const fits = (x: number, y: number) =>
    x + dx >= 3 && x + dx <= FIG_W - 4 && y + dy >= 2 && y + dy <= FIG_H - 5;
  const inside = (ps: readonly Part2[]) => ps.every((p) => pixels(p).every(([x, y]) => fits(x, y)));
  // Shorter first (down to half its length), then less leant, then shorter again.
  for (const lean of [1, 0.75, 0.5, 0.25, 0])
    for (let keep = 1; keep >= (lean === 0 ? 0.2 : 0.5); keep -= 0.05) {
      const turned = turnedAt(parts, { q: t.q, lean: t.lean * lean }, keep);
      if (inside(turned)) return turned;
    }
  // Out of room even so: the far end is left off, as if it pointed away out of sight.
  return turnedAt(parts, { q: t.q, lean: 0 }, 0.2).map((p) => {
    const px: [number, number, string][] = [];
    for (const [y, row] of rowsOf(p))
      for (const [x, ch] of row) if (fits(x, y)) px.push([x, y, ch]);
    return fromPixels(p, px);
  });
}

// ------------------------------------------------------------ across

/** The fist's move for a wrist placed `w` from the shoulder, for a pose leaning `lean` and dropped `bob`. */
const fistMove = (w: Pt, lean: number, bob: number): [number, number] => [
  Math.round(SIDE_SHOULDER[0] + lean + w[0]) - 2 - FIST2.at[0],
  Math.round(SIDE_SHOULDER[1] + bob + w[1]) - FIST2.at[1],
];

/** The stance: the front foot planted ahead, the back foot behind, the hips between. */
const FEET: readonly [number, number] = [36, 20];

interface Beat {
  readonly lean: number;
  readonly bob: number;
  readonly weapon: Pt;
  readonly off: Pt;
  readonly turn?: Turn;
  readonly behind?: boolean;
  readonly weaponHand?: 'fist' | 'open';
  readonly offHand?: 'fist' | 'open';
  readonly bend?: 1 | -1;
}

/**
 * Each kind's four beats across, facing right: the body's lean and drop,
 * each wrist from its shoulder, how the weapon is turned. A swing is cocked
 * high behind the head (the blade down the back, behind the body), brought
 * over the top, laid out level at the full stretch of the arm as it lands,
 * and let fall to the carry; a bow is raised, drawn to the cheek, loosed
 * (the hand flung back, open), lowered; a punch is cocked at the chest and
 * driven out at the shoulder's height, the other fist up by the chin.
 */
const BEATS: Readonly<Record<StrikeKind, readonly Beat[]>> = {
  swing: [
    { lean: -1, bob: 0, weapon: [-7, -11], off: [7, 7], turn: { q: 2, lean: -0.8 }, behind: true },
    { lean: 0, bob: 0, weapon: [13, -6], off: [8, 5], turn: { q: 0, lean: 0.9 } },
    { lean: 2, bob: 1, weapon: [12, 4], off: [6, 7], turn: { q: 2, lean: 0.6 } },
    { lean: 1, bob: 0, weapon: [9, 9], off: [6, 8], turn: { q: 2, lean: 0.75 } },
  ],
  bow: [
    { lean: 0, bob: 0, weapon: [8, 3], off: [10, 3] },
    { lean: 1, bob: 0, weapon: [2, -6], off: [13, 0], bend: -1 },
    { lean: 1, bob: 0, weapon: [-4, -5], off: [13, 0], weaponHand: 'open', bend: -1 },
    { lean: 0, bob: 0, weapon: [2, 11], off: [9, 7], weaponHand: 'open' },
  ],
  unarmed: [
    { lean: -1, bob: 0, weapon: [3, 6], off: [7, -1], offHand: 'fist' },
    { lean: 0, bob: 0, weapon: [9, 1], off: [6, 0], offHand: 'fist' },
    { lean: 2, bob: 1, weapon: [13, -1], off: [4, 2], offHand: 'fist' },
    { lean: 1, bob: 0, weapon: [6, 6], off: [6, 0], offHand: 'fist' },
  ],
};

/** The bow's parts with or without its own straight string (drawn back, the string is drawn as a V). */
const bowParts = (parts: readonly Part2[], string: boolean): Part2[] =>
  parts.filter((p) => string || p.depth !== DEPTH.HELD_BEHIND);

/** The string's cell: the bow's own string colour. */
function stringCell(parts: readonly Part2[]): Cell {
  const s = parts.find((p) => p.depth === DEPTH.HELD_BEHIND);
  const px = s ? pixels(s)[0] : undefined;
  return px ? px[2] : cell('linen', 1);
}

/** A straight line of pixels from a to b. */
function line(a: Pt, b: Pt): Pt[] {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++)
    out.push([
      Math.round(a[0] + ((b[0] - a[0]) * i) / n),
      Math.round(a[1] + ((b[1] - a[1]) * i) / n),
    ]);
  return out;
}

/** The bow's two tips, where they landed. */
function tips(parts: readonly Part2[], dx: number, dy: number): [Pt, Pt] {
  const px = parts
    .filter((p) => p.depth !== DEPTH.HELD_BEHIND && p.depth !== DEPTH.GRIP)
    .flatMap((p) => pixels(p).map(([x, y]) => [x + dx, y + dy] as const));
  const top = px.reduce((a, b) => (b[1] < a[1] ? b : a));
  const bottom = px.reduce((a, b) => (b[1] > a[1] ? b : a));
  return [top, bottom];
}

/** An arrow along a row: fletching at the nock, a shaft, an iron head. */
function arrow(sheet: Sheet, from: Pt, to: Pt, depth: number, fletch: Mat): void {
  const pts = line(from, to);
  pts.forEach(([x, y], i) => {
    const head = i >= pts.length - 2;
    sheet.add(
      x,
      y,
      head ? cell('iron', i === pts.length - 1 ? 3 : 1) : cell('wood', 2),
      depth,
      'held',
    );
    if (i < 3) sheet.add(x, y - 1, cell(fletch, 1 + (i % 2)), depth, 'held');
  });
}

/** The pose for frame `f` of a blow across, facing right (walking left, sideFrame swaps the arms and mirrors). */
export function sideStrikePose(dress: SideDress, f: number): SidePose {
  const kind = strikeKind(dress.heldId);
  const b = BEATS[kind][((f % STRIKE_FRAMES) + STRIKE_FRAMES) % STRIKE_FRAMES]!;
  const upright = dress.heldUpright ?? [];
  const shield = dress.shield.length > 0;
  const weaponMove = fistMove(b.weapon, b.lean, b.bob);
  const offMove = fistMove(b.off, b.lean, b.bob);
  let weapon: SideArm;
  let off: SideArm;
  let extra: SidePose['extra'];
  if (kind === 'bow') {
    const drawn = f === 1;
    const bow = turnHeld(bowParts(upright, !drawn), { q: 0, lean: 0 }, offMove[0], offMove[1]);
    weapon = { wrist: b.weapon, hand: b.weaponHand ?? 'fist', bend: b.bend };
    off = { wrist: b.off, hand: 'fist', holds: bow, bend: 1 };
    const string = stringCell(upright);
    extra = (sheet, at) => {
      const [top, bottom] = tips(bow, offMove[0], offMove[1]);
      const hand: Pt = [Math.round(at.weapon.wrist[0]), Math.round(at.weapon.wrist[1]) + 2];
      const depth = Math.max(at.weapon.depth, at.off.depth) - 1;
      if (drawn)
        for (const [x, y] of [...line(top, hand), ...line(hand, bottom)])
          sheet.add(x, y, string, depth, 'held');
      if (f <= 1) {
        // Nocked: from the string hand forward past the bow's belly.
        const tip: Pt = [Math.max(...[top[0], bottom[0]]) + 5, hand[1]];
        arrow(sheet, hand, [Math.min(FIG_W - 2, tip[0]), hand[1]], depth + 0.5, 'crimson');
      }
    };
  } else if (kind === 'swing') {
    weapon = {
      wrist: b.weapon,
      hand: 'fist',
      holds: turnHeld(upright, b.turn!, weaponMove[0], weaponMove[1]),
      bend: b.bend,
    };
    off = shield ? { wrist: b.off, hand: 'none' } : { wrist: b.off, hand: b.offHand ?? 'open' };
  } else {
    weapon = { wrist: b.weapon, hand: 'fist', bend: b.bend };
    off = shield
      ? { wrist: b.off, hand: 'none' }
      : { wrist: b.off, hand: b.offHand ?? 'open', bend: 1 };
  }
  void offMove;
  return {
    feet: FEET,
    bob: b.bob,
    lean: b.lean,
    weapon,
    off,
    heldBehind: b.behind,
    extra,
  };
}

// ------------------------------------------------------------ toward and away

/** Characters for parts made from drawn dots. */
const CHARS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-/:;<=>?@[]^_{|}~',
  ...Array.from({ length: 300 }, (_, i) => String.fromCharCode(0xc0 + i)),
];

/** Everything drawn on a sheet as figure parts, one per depth and tag, each pixel pinned to its cell. */
function sheetParts(sheet: Sheet, bone: Bone): Boned[] {
  const groups = new Map<string, { depth: number; tag: string; px: [number, number, Cell][] }>();
  for (const d of sheet.dots) {
    const k = `${d.depth}|${d.tag}|${d.cast}`;
    let g = groups.get(k);
    if (!g) groups.set(k, (g = { depth: d.depth, tag: d.tag, px: [] }));
    g.px.push([d.x, d.y, d.c]);
  }
  const out: Boned[] = [];
  for (const g of groups.values()) {
    const xs = g.px.map((p) => p[0]);
    const ys = g.px.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const rows = Array.from({ length: Math.max(...ys) - y0 + 1 }, () =>
      Array<string>(Math.max(...xs) - x0 + 1).fill('.'),
    );
    const pins: Record<string, Pin> = {};
    const chars = new Map<Cell, string>();
    for (const [x, y, c] of g.px) {
      let ch = chars.get(c);
      if (!ch) {
        ch = CHARS[chars.size]!;
        chars.set(c, ch);
        pins[ch] = [matOf(c)!, stepOf(c)];
      }
      rows[y - y0]![x - x0] = ch;
    }
    const hand = g.tag === 'fist' || g.tag === 'hand';
    out.push({
      part: {
        at: [x0, y0],
        depth: g.depth,
        rows: rows.map((r) => r.join('')),
        pins,
        cast: !hand,
        shaded: !hand,
      },
      bone,
      tag: g.tag,
    });
  }
  return out;
}

/** What a front or back blow needs of the outfit: the sleeves down the arm, the weapon as drawn, a shield. */
export interface FrontKit {
  readonly arm: readonly Cover[];
  readonly weaponArm: readonly Cover[];
  /** The weapon's parts as drawn standing, upright in the fist (FIST2's place). */
  readonly held: readonly Part2[];
  readonly kind: StrikeKind;
  readonly shield: boolean;
}

/** The arm's bones toward the camera and away. */
const F_UPPER = 9;
const F_FORE = 7;
/** The shoulders, standing: the right (sword) arm on the viewer's left toward the camera, on the right from behind. */
const F_SHOULDER: Readonly<Record<'down' | 'up', { weapon: Pt; off: Pt }>> = {
  down: { weapon: [20, 27], off: [36, 27] },
  up: { weapon: [36, 27], off: [20, 27] },
};

interface FrontBeat {
  readonly weapon: Pt;
  readonly off?: Pt;
  readonly turn?: Turn;
  readonly behind?: boolean;
  readonly hand?: 'fist' | 'open';
  readonly key: Partial<Key2>;
}

const legsApart = (bob: number, shift: number): Partial<Key2> => ({
  bob,
  shift,
  near: { dx: -2, lift: 0, knee: -1 },
  far: { dx: 2, lift: 0, knee: 1 },
  armFar: { dx: 0, dy: -3 },
});

/**
 * Toward the camera, a sweep from the hero's right side across his front:
 * the weapon cocked out to the side, swept down and in, the blow landing
 * pointing at the viewer below the fist (foreshortened as it must be), and
 * eased back. From behind, the same sweep seen from the back: out to the
 * right, up past the shoulder, the blow landing ahead (up the screen) with
 * the arm and blade behind the body, the blade showing beyond the head. A bow
 * is raised, drawn and loosed square to the target, its stave end-on; a punch
 * is driven straight out from the chest, the other fist by the chin.
 */
const FRONT_BEATS: Readonly<
  Record<'down' | 'up', Readonly<Record<StrikeKind, readonly FrontBeat[]>>>
> = {
  down: {
    swing: [
      { weapon: [13, 13], turn: { q: 0, lean: -0.25 }, key: legsApart(0, -1) },
      { weapon: [14, 22], turn: { q: 0, lean: -0.6 }, key: legsApart(0, 0) },
      { weapon: [22, 40], turn: { q: 2, lean: 0.35 }, key: legsApart(1, 1) },
      { weapon: [17, 39], turn: { q: 2, lean: -0.5 }, key: legsApart(0, 0) },
    ],
    bow: [
      { weapon: [27, 35], off: [31, 34], key: legsApart(0, 0) },
      { weapon: [23, 31], off: [31, 31], key: legsApart(0, 0) },
      { weapon: [13, 30], off: [31, 31], hand: 'open', key: legsApart(0, 0) },
      { weapon: [17, 38], off: [33, 37], hand: 'open', key: legsApart(0, 0) },
    ],
    unarmed: [
      { weapon: [19, 35], off: [35, 28], key: legsApart(0, -1) },
      { weapon: [23, 32], off: [35, 28], key: legsApart(0, 0) },
      { weapon: [26, 29], off: [36, 30], key: legsApart(1, 1) },
      { weapon: [21, 35], off: [35, 28], key: legsApart(0, 0) },
    ],
  },
  up: {
    swing: [
      { weapon: [42, 31], turn: { q: 1, lean: 0.35 }, key: legsApart(0, 1) },
      { weapon: [43, 26], turn: { q: 0, lean: 0.8 }, key: legsApart(0, 0) },
      { weapon: [33, 24], turn: { q: 0, lean: -0.8 }, behind: true, key: legsApart(1, -1) },
      { weapon: [39, 38], turn: { q: 2, lean: 0.2 }, key: legsApart(0, 0) },
    ],
    bow: [
      { weapon: [29, 35], off: [25, 34], behind: true, key: legsApart(0, 0) },
      { weapon: [37, 29], off: [25, 31], behind: true, key: legsApart(0, 0) },
      { weapon: [44, 29], off: [25, 31], behind: true, hand: 'open', key: legsApart(0, 0) },
      { weapon: [39, 38], off: [23, 37], behind: true, hand: 'open', key: legsApart(0, 0) },
    ],
    unarmed: [
      { weapon: [37, 35], off: [23, 25], key: legsApart(0, 1) },
      { weapon: [33, 32], off: [23, 25], behind: true, key: legsApart(0, 0) },
      { weapon: [30, 29], off: [22, 27], behind: true, key: legsApart(1, -1) },
      { weapon: [35, 35], off: [23, 25], key: legsApart(0, 0) },
    ],
  },
};

/** A bow seen end-on, aimed at the viewer or away: its limbs drawn in to a stave a few columns wide about the grip. */
function endOn(parts: readonly Part2[]): Part2[] {
  return parts
    .filter((p) => p.depth !== DEPTH.HELD_BEHIND)
    .map((p) => {
      const px: [number, number, string][] = [];
      const seen = new Set<number>();
      for (const [y, row] of rowsOf(p))
        for (const [x, ch] of row) {
          const nx = PX + Math.round((x - PX) * 0.25);
          if (seen.has(y * 1000 + nx)) continue;
          seen.add(y * 1000 + nx);
          px.push([nx, y, ch]);
        }
      return fromPixels(p, px);
    });
}

/**
 * The parts for frame `f` of a blow toward the camera or away: the figure
 * (`boned`, from views.ts) without the arms the blow moves, the arms drawn
 * along their bones in the outfit's sleeves, the fists, the weapon turned
 * about the fist; and the key for the legs, the drop and the turn of the body.
 */
export function frontStrike(
  boned: readonly Boned[],
  kit: FrontKit,
  facing: 'down' | 'up',
  f: number,
): { boned: Boned[]; key: Key2 } {
  const beat =
    FRONT_BEATS[facing][kit.kind][((f % STRIKE_FRAMES) + STRIKE_FRAMES) % STRIKE_FRAMES]!;
  const key: Key2 = { ...STAND2, ...beat.key };
  // A bow takes both hands (a shield is not drawn with it); a punch keeps a shield braced.
  const bothArms = kit.kind === 'bow' || (kit.kind === 'unarmed' && !kit.shield);
  // Toward the camera the sword arm is the near bone; from behind (views.ts), the far one.
  const weaponBones: Bone[] = facing === 'down' ? ['near', 'nearHeld'] : ['far', 'farHeld'];
  const offBones: Bone[] = facing === 'down' ? ['far', 'farHeld'] : ['near', 'nearHeld'];
  const moved = (b: Boned) =>
    weaponBones.includes(b.bone) || (bothArms && offBones.includes(b.bone));
  const out: Boned[] = [];
  for (const b of boned) {
    if (!moved(b)) {
      out.push(b);
      continue;
    }
    // The shoulder's top stays (a pauldron, the sleeve's head); the arm below it is drawn again.
    if (b.tag === 'arm' || b.tag === 'body' || b.tag === 'skirt') {
      const top = above(b.part, 29);
      if (top.rows.length) out.push({ ...b, part: top });
    }
  }
  const sheet = new Sheet();
  const shoulders = F_SHOULDER[facing];
  const behind = beat.behind ?? false;
  const armDepth = behind ? BACK_DEPTH.HELD + 8 : facing === 'up' ? BACK_DEPTH.CLOAK + 0.5 : 58;
  const drawArm = (
    shoulder: Pt,
    wrist: Pt,
    covers: readonly Cover[],
    depth: number,
    bend: 1 | -1,
  ) => {
    const elbow = joint(shoulder, wrist, F_UPPER, F_FORE, bend);
    drawLimb(
      sheet,
      {
        pts: [shoulder, elbow, wrist],
        widths: [5, 4, 4],
        base: { mat: 'skin', from: 0, to: 99 },
        covers,
      },
      depth,
      'arm',
    );
  };
  const hand = (wrist: Pt, depth: number, tag: string, open = false) => {
    const dx = Math.round(wrist[0]) - 2 - FIST2.at[0];
    const dy = Math.round(wrist[1]) - FIST2.at[1];
    for (const [x, y, c] of pixels(open ? OPEN_HAND2 : FIST2))
      sheet.add(x + dx, y + dy, c, depth, tag, false, false);
    return [dx, dy] as const;
  };
  const side = facing === 'down' ? -1 : 1;
  drawArm(shoulders.weapon, beat.weapon, [...kit.arm, ...kit.weaponArm], armDepth, side);
  const open = beat.hand === 'open';
  const [dx, dy] = hand(
    beat.weapon,
    armDepth + 1,
    open || kit.kind === 'unarmed' ? 'hand' : 'fist',
    open,
  );
  if (kit.kind === 'swing') {
    for (const p of turnHeld(kit.held, beat.turn!, dx, dy))
      for (const [x, y, c] of pixels(p))
        sheet.add(
          x + dx,
          y + dy,
          c,
          behind ? BACK_DEPTH.HELD + p.depth / 100 : armDepth + (p.depth === DEPTH.GRIP ? 0.5 : 2),
          p.depth === DEPTH.GRIP ? 'grip' : 'held',
        );
  }
  if (bothArms && beat.off) {
    // From behind, the off hand is up in front (a guard by the chin, a bow held out): behind the body.
    const offDepth = behind || facing === 'up' ? BACK_DEPTH.HELD + 6 : armDepth - 0.5;
    drawArm(shoulders.off, beat.off, kit.arm, offDepth, -side as 1 | -1);
    const [ox, oy] = hand(beat.off, offDepth + 1, kit.kind === 'bow' ? 'fist' : 'hand');
    if (kit.kind === 'bow') {
      for (const p of endOn(kit.held))
        for (const [x, y, c] of pixels(p))
          sheet.add(
            x + ox,
            y + oy,
            c,
            behind ? BACK_DEPTH.HELD + 1 : offDepth + (p.depth === DEPTH.GRIP ? 0.5 : 2),
            p.depth === DEPTH.GRIP ? 'grip' : 'held',
          );
      if (f <= 1 && facing === 'down') {
        // The arrow nocked, end-on: its head toward the viewer, a glint of iron over the grip.
        const at: Pt = [Math.round(beat.off[0]) - 1, Math.round(beat.off[1]) - 1];
        sheet.add(at[0], at[1], cell('iron', 1), offDepth + 3, 'held');
        sheet.add(at[0] + 1, at[1], cell('iron', 3), offDepth + 3, 'held');
      }
    }
  }
  return { boned: [...out, ...sheetParts(sheet, 'body')], key };
}

export type { SideArmAt };
