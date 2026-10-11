/**
 * The hero at work (B13, for next wave's idle menu; Cody: "idle animation:
 * maybe something in the afk menu showing our character mining/fletching/
 * fighting/etc"). One short loop per skill, side-on and facing right, on the
 * walk's skeleton posed per frame (`SidePose`, as the blow is): where each
 * foot stands, how far the hips drop and the body leans, where each wrist is
 * from its shoulder and what each hand holds. The outfit is worn as it is
 * (helm, coat, greaves, any look), but what is in the hands is the work's own
 * tool, a generic one, not the item equipped: the weapon and the shield are
 * put down for it.
 *
 * Tools are drawn upright in the fist as every held thing is (held.ts: the
 * grip under the fingers, the rest in front) and turned about it by the
 * blow's quarter turns (strike.ts); the long, thin ones (a rod and its line, a
 * ladle) are laid along a line each frame. What the work is done on (a log on
 * a block, an ore rock, an anvil, a pot on a fire) is a separate small prop
 * with its foot and its place as data, so the menu can compose it.
 */
import { DEPTH } from '../depth';
import { cell, outlined, put, tgrid, type TGrid } from '../town2/cells';
import type { Mat } from '../town2/ramps';
import type { Glow } from '../raster';
import { FIST2 } from './body';
import type { Part2, Pins } from './engine';
import { HELD2, gripPart, straightBlade } from './held';
import { SIDE_SHOULDER, type SideDress, type SidePose } from './side';
import { turnHeld, type Turn } from './strike';
import { mirrored } from './views';
import type { Pt, Sheet } from './rig2';

/** The skills that have their own loop, in the order the player meets them; combat reuses the blow. */
export const ACTIVITY_IDS = [
  'woodcutting',
  'fishing',
  'mining',
  'foraging',
  'cooking',
  'smithing',
  'crafting',
  'fletching',
  'alchemy',
  'thieving',
  'melee',
  'ranged',
  'defence',
  'vitality',
] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];

/** Combat's loops are the blow (`melee`, `ranged`, `defence`) and the breath (`vitality`), not poses here. */
export const COMBAT_ACTIVITIES: Readonly<Partial<Record<ActivityId, 'strike' | 'idle'>>> = {
  melee: 'strike',
  ranged: 'strike',
  defence: 'strike',
  vitality: 'idle',
};

const front = (x: number, y: number, mat: Mat, rows: readonly string[], pins?: Pins): Part2 => ({
  at: [x, y],
  depth: DEPTH.HELD_FRONT,
  mat,
  rows,
  pins,
});

/** A straight haft of wood up through the fist, from `top` to `bottom`, lit on its left. */
function haft(mat: Mat, top: number, bottom: number): Part2 {
  const rows: string[] = [];
  for (let y = top; y <= bottom; y++) rows.push('24');
  return { at: [15, top], depth: DEPTH.HELD_FRONT, mat, rows };
}

const hatchet = (): readonly Part2[] => HELD2.find((g) => g.id === 'bronze_hatchet')!.parts;

/** The tools, upright in the fist. */
const TOOLS: Readonly<Record<string, () => readonly Part2[]>> = {
  hatchet,
  // A miner's pick: an iron head curving down to a point at each end, on a long haft.
  pick: () => [
    haft('wood', 24, 46),
    front(7, 21, 'iron', [
      '....0111122334....',
      '.01112222222233344',
      '01..............45',
      '0................5',
    ]),
    gripPart('wood'),
  ],
  // A smith's hammer: a squared iron head, its face lit, on a short haft.
  hammer: () => [
    haft('wood', 31, 46),
    front(12, 26, 'iron', ['0111223', '0112234', '1122334', '.44455.']),
    gripPart('wood'),
  ],
  // A small knife for whittling and cutting: a short blade above the fist.
  knife: () => [
    straightBlade('iron', { from: 38, tip: 32, per: 30, steps: [1, 0, 3] }),
    front(14, 38, 'iron', ['1233']),
    gripPart('wood'),
  ],
  // A glass flask, a coloured draught swirling in it, held up in the fist.
  flask: () => [
    front(14, 29, 'glass', ['.cc.', '.12.', '.12.', '0123', '1ll3', '1ll4', '.34.'], {
      c: ['wood', 2],
      l: ['teal', 1],
    }),
  ],
  // A shaft for an arrow, held in the off hand to be whittled.
  shaft: () => [front(16, 30, 'pinewood', ['1', '1', '2', '2', '2', '3', '3', '3', '3'])],
  // A wicker basket on the arm, a few berries in it.
  basket: () => [
    front(10, 42, 'wood', ['1rr.rR..', '12222234', '.122234.', '..1234..'], {
      r: ['crimson', 2],
      R: ['crimson', 4],
    }),
  ],
  // A small leather purse, lifted.
  purse: () => [front(14, 42, 'leather', ['.gg.', '1222', '1223', '.33.'], { g: ['gold', 2] })],
  // A needle and thread: a pale linen strand from a small iron needle.
  needle: () => [front(15, 34, 'iron', ['0', '1', '2', '2'])],
};

/** Held things lean forward in profile: the front drawing turned about the fist's middle column (sideDress.ts). */
const FIST_AXIS = 2 * (FIST2.at[0] + 2);

const toolParts = new Map<string, readonly Part2[]>();
const tool = (id: string): readonly Part2[] => {
  let p = toolParts.get(id);
  if (!p) {
    p = TOOLS[id]!().map((q) => mirrored(q, FIST_AXIS));
    toolParts.set(id, p);
  }
  return p;
};

/** One frame of a loop: as the blow's beats (strike.ts). Wrists are from the shoulder. */
interface Beat {
  readonly lean: number;
  readonly bob: number;
  readonly feet?: readonly [number, number];
  readonly weapon: Pt;
  readonly off: Pt;
  readonly turn?: Turn;
  readonly offTurn?: Turn;
  readonly weaponHand?: 'fist' | 'open';
  readonly offHand?: 'fist' | 'open' | 'none';
  readonly bend?: 1 | -1;
  readonly offBend?: 1 | -1;
  /** What the weapon hand holds this frame, if not the loop's tool (the purse once it is taken). */
  readonly tool?: string;
  /** A line drawn from the weapon fist (a rod, a ladle): its far end, from the shoulder, and its line's end. */
  readonly rod?: { tip: Pt; line?: Pt; mat: Mat };
}

interface Loop {
  readonly tool?: string;
  readonly offTool?: string;
  readonly frameMs: number;
  readonly beats: readonly Beat[];
}

const STAND: readonly [number, number] = [34, 22];
const WIDE: readonly [number, number] = [36, 20];

// Each loop's work lands on its prop: the hatchet's bit on the log's top (about
// (49, 45) on the hero's canvas), the pick's point on the rock (55, 49), the
// hammer on the anvil's face (47, 46), the ladle in the pot (50, 54).
const LOOPS: Readonly<Record<string, Loop>> = {
  // Raised behind the head, brought over, the bit into the log, wrenched free.
  woodcutting: {
    tool: 'hatchet',
    frameMs: 140,
    beats: [
      { lean: -1, bob: 0, feet: WIDE, weapon: [-3, -12], off: [6, 6], turn: { q: 0, lean: -0.6 } },
      { lean: 1, bob: 1, feet: WIDE, weapon: [8, -6], off: [6, 7], turn: { q: 1, lean: -0.5 } },
      { lean: 2, bob: 2, feet: WIDE, weapon: [10, 9], off: [7, 8], turn: { q: 1, lean: 0.5 } },
      { lean: 2, bob: 2, feet: WIDE, weapon: [9, 10], off: [7, 8], turn: { q: 1, lean: 0.6 } },
      { lean: 0, bob: 0, feet: WIDE, weapon: [3, 0], off: [6, 7], turn: { q: 0, lean: 0.4 } },
    ],
  },
  // The rod held out over the water, its line down to the float; a twitch, a pull, cast again.
  fishing: {
    frameMs: 220,
    beats: [
      {
        lean: 0,
        bob: 0,
        feet: STAND,
        weapon: [9, 4],
        off: [7, 8],
        rod: { tip: [27, -14], line: [31, 37], mat: 'pinewood' },
      },
      {
        lean: 0,
        bob: 0,
        feet: STAND,
        weapon: [9, 5],
        off: [7, 8],
        rod: { tip: [27, -12], line: [31, 37], mat: 'pinewood' },
      },
      {
        lean: 0,
        bob: 1,
        feet: STAND,
        weapon: [9, 6],
        off: [7, 9],
        rod: { tip: [26, -8], line: [31, 38], mat: 'pinewood' },
      },
      {
        lean: -1,
        bob: 0,
        feet: STAND,
        weapon: [6, 0],
        off: [7, 7],
        rod: { tip: [18, -22], line: [27, 32], mat: 'pinewood' },
      },
    ],
  },
  // Both hands on the pick: up over the shoulder, down onto the rock.
  mining: {
    tool: 'pick',
    frameMs: 140,
    beats: [
      {
        lean: -1,
        bob: 0,
        feet: WIDE,
        weapon: [-2, -12],
        off: [0, -6],
        turn: { q: 0, lean: -0.5 },
        offHand: 'open',
      },
      {
        lean: 1,
        bob: 1,
        feet: WIDE,
        weapon: [7, -6],
        off: [5, -1],
        turn: { q: 1, lean: -0.5 },
        offHand: 'open',
      },
      {
        lean: 1,
        bob: 1,
        feet: WIDE,
        weapon: [9, 9],
        off: [8, 9],
        turn: { q: 1, lean: 0.6 },
        offHand: 'open',
      },
      {
        lean: 1,
        bob: 2,
        feet: WIDE,
        weapon: [8, 10],
        off: [7, 10],
        turn: { q: 1, lean: 0.7 },
        offHand: 'open',
      },
    ],
  },
  // Stooped to the bush, a hand reaching in and back to the basket on the other arm.
  foraging: {
    offTool: 'basket',
    frameMs: 200,
    beats: [
      {
        lean: 1,
        bob: 3,
        feet: STAND,
        weapon: [11, 6],
        off: [4, 9],
        weaponHand: 'open',
        offHand: 'fist',
      },
      {
        lean: 2,
        bob: 4,
        feet: STAND,
        weapon: [13, 8],
        off: [4, 9],
        weaponHand: 'fist',
        offHand: 'fist',
      },
      {
        lean: 1,
        bob: 3,
        feet: STAND,
        weapon: [8, 10],
        off: [4, 9],
        weaponHand: 'fist',
        offHand: 'fist',
      },
      {
        lean: 0,
        bob: 2,
        feet: STAND,
        weapon: [4, 11],
        off: [4, 9],
        weaponHand: 'open',
        offHand: 'fist',
      },
    ],
  },
  // A ladle stirred round the pot on the fire, a taste, stirred again.
  cooking: {
    frameMs: 180,
    beats: [
      {
        lean: 1,
        bob: 1,
        feet: STAND,
        weapon: [10, 8],
        off: [6, 6],
        rod: { tip: [20, 27], mat: 'wood' },
      },
      {
        lean: 1,
        bob: 1,
        feet: STAND,
        weapon: [12, 8],
        off: [6, 6],
        rod: { tip: [23, 27], mat: 'wood' },
      },
      {
        lean: 1,
        bob: 1,
        feet: STAND,
        weapon: [13, 7],
        off: [6, 6],
        rod: { tip: [25, 26], mat: 'wood' },
      },
      {
        lean: 0,
        bob: 0,
        feet: STAND,
        weapon: [7, -2],
        off: [6, 6],
        rod: { tip: [10, 7], mat: 'wood' },
      },
    ],
  },
  // The hammer up and down on the anvil, the other hand steadying the work.
  smithing: {
    tool: 'hammer',
    frameMs: 130,
    beats: [
      {
        lean: 0,
        bob: 0,
        feet: STAND,
        weapon: [2, -11],
        off: [12, 9],
        turn: { q: 0, lean: -0.3 },
        offHand: 'fist',
      },
      {
        lean: 1,
        bob: 1,
        feet: STAND,
        weapon: [9, -3],
        off: [12, 9],
        turn: { q: 1, lean: -0.3 },
        offHand: 'fist',
      },
      {
        lean: 1,
        bob: 1,
        feet: STAND,
        weapon: [9, 10],
        off: [12, 9],
        turn: { q: 1, lean: 0.7 },
        offHand: 'fist',
      },
      {
        lean: 0,
        bob: 0,
        feet: STAND,
        weapon: [8, 4],
        off: [12, 9],
        turn: { q: 0, lean: 0.6 },
        offHand: 'fist',
      },
    ],
  },
  // Leant over the bench, a needle drawn up and back down through the cloth.
  crafting: {
    tool: 'needle',
    frameMs: 200,
    beats: [
      { lean: 1, bob: 2, feet: STAND, weapon: [12, 9], off: [12, 10], offHand: 'open' },
      { lean: 1, bob: 2, feet: STAND, weapon: [11, 5], off: [12, 10], offHand: 'open' },
      { lean: 1, bob: 2, feet: STAND, weapon: [9, 0], off: [12, 10], offHand: 'open' },
      { lean: 1, bob: 2, feet: STAND, weapon: [11, 6], off: [12, 10], offHand: 'open' },
    ],
  },
  // A shaft held up in one hand, the knife drawn along it in strokes away from the body.
  fletching: {
    tool: 'knife',
    offTool: 'shaft',
    frameMs: 170,
    beats: [
      {
        lean: 0,
        bob: 0,
        feet: STAND,
        weapon: [8, 6],
        off: [11, 4],
        offHand: 'fist',
        turn: { q: 1, lean: 0 },
      },
      {
        lean: 0,
        bob: 0,
        feet: STAND,
        weapon: [11, 4],
        off: [11, 4],
        offHand: 'fist',
        turn: { q: 1, lean: 0 },
      },
      {
        lean: 0,
        bob: 0,
        feet: STAND,
        weapon: [14, 2],
        off: [11, 4],
        offHand: 'fist',
        turn: { q: 1, lean: 0 },
      },
      {
        lean: 0,
        bob: 0,
        feet: STAND,
        weapon: [10, 7],
        off: [11, 4],
        offHand: 'fist',
        turn: { q: 1, lean: 0 },
      },
    ],
  },
  // A flask lifted to the eye, swirled, and tipped over the dish on the table.
  alchemy: {
    tool: 'flask',
    frameMs: 200,
    beats: [
      { lean: 0, bob: 0, feet: STAND, weapon: [9, 0], off: [10, 9], offHand: 'open' },
      { lean: 0, bob: 0, feet: STAND, weapon: [10, -4], off: [10, 9], offHand: 'open' },
      { lean: 0, bob: 0, feet: STAND, weapon: [11, -2], off: [10, 9], offHand: 'open' },
      {
        lean: 2,
        bob: 2,
        feet: STAND,
        weapon: [13, 5],
        off: [10, 9],
        offHand: 'open',
        turn: { q: 1, lean: 0.6 },
      },
    ],
  },
  // Crouched and creeping to the stall, a hand to the purse on it, and away with it.
  thieving: {
    frameMs: 200,
    beats: [
      {
        lean: -1,
        bob: 3,
        feet: [33, 20],
        weapon: [5, 8],
        off: [4, 2],
        weaponHand: 'open',
        offHand: 'open',
      },
      {
        lean: 1,
        bob: 3,
        feet: [35, 21],
        weapon: [13, 9],
        off: [4, 3],
        weaponHand: 'open',
        offHand: 'open',
      },
      {
        lean: 1,
        bob: 3,
        feet: [35, 21],
        weapon: [13, 9],
        off: [4, 3],
        weaponHand: 'fist',
        offHand: 'open',
        tool: 'purse',
      },
      {
        lean: -1,
        bob: 3,
        feet: [33, 20],
        weapon: [5, 8],
        off: [4, 2],
        weaponHand: 'fist',
        offHand: 'open',
        tool: 'purse',
      },
    ],
  },
};

/** Frames in an activity's loop (combat's are the blow's four or the breath's two). */
export function activityFrameCount(id: string): number {
  return LOOPS[id]?.beats.length ?? 0;
}

/** How long each frame of an activity is shown, in milliseconds. */
export function activityFrameMs(id: string): number {
  return LOOPS[id]?.frameMs ?? 110;
}

const fistMove = (w: Pt, lean: number, bob: number): [number, number] => [
  Math.round(SIDE_SHOULDER[0] + lean + w[0]) - 2 - FIST2.at[0],
  Math.round(SIDE_SHOULDER[1] + bob + w[1]) - FIST2.at[1],
];

/** A line of pixels from a to b. */
function line(a: Pt, b: Pt): Pt[] {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  return Array.from({ length: n + 1 }, (_, i) => [
    Math.round(a[0] + ((b[0] - a[0]) * i) / n),
    Math.round(a[1] + ((b[1] - a[1]) * i) / n),
  ]);
}

/** The pose for frame `f` of an activity, facing right; null for one with no pose here (combat). */
export function activityPose(dress: SideDress, id: string, f: number): SidePose | null {
  const loop = LOOPS[id];
  if (!loop) return null;
  const b = loop.beats[((f % loop.beats.length) + loop.beats.length) % loop.beats.length]!;
  const wm = fistMove(b.weapon, b.lean, b.bob);
  const om = fistMove(b.off, b.lean, b.bob);
  const held = b.tool ?? loop.tool;
  const holds = held ? turnHeld(tool(held), b.turn ?? { q: 0, lean: 0 }, wm[0], wm[1]) : undefined;
  const offHolds = loop.offTool
    ? turnHeld(tool(loop.offTool), b.offTurn ?? { q: 0, lean: 0 }, om[0], om[1])
    : undefined;
  void dress;
  const rod = b.rod;
  return {
    feet: b.feet ?? STAND,
    bob: b.bob,
    lean: b.lean,
    weapon: {
      wrist: b.weapon,
      hand: b.weaponHand ?? 'fist',
      bend: b.bend,
      ...(holds ? { holds } : {}),
    },
    off: {
      wrist: b.off,
      hand: b.offHand ?? (offHolds ? 'fist' : 'open'),
      bend: b.offBend ?? 1,
      ...(offHolds ? { holds: offHolds } : {}),
    },
    ...(rod
      ? {
          extra: (sheet: Sheet, at: { weapon: { wrist: Pt; depth: number } }) => {
            const hand: Pt = [Math.round(at.weapon.wrist[0]), Math.round(at.weapon.wrist[1]) + 2];
            const tip: Pt = [
              SIDE_SHOULDER[0] + b.lean + rod.tip[0],
              SIDE_SHOULDER[1] + b.bob + rod.tip[1],
            ];
            const d = at.weapon.depth + 8;
            line(hand, tip).forEach(([x, y], i, all) =>
              sheet.add(x, y, cell(rod.mat, i < all.length / 2 ? 2 : 3), d, 'held'),
            );
            if (rod.line) {
              // The line, slack, from the rod's tip down to the float on the water.
              const end: Pt = [SIDE_SHOULDER[0] + rod.line[0], SIDE_SHOULDER[1] + rod.line[1]];
              line(tip, end).forEach(([x, y]) => sheet.add(x, y, cell('linen', 1), d - 1, 'held'));
            } else {
              // The ladle's bowl at the end.
              sheet.add(tip[0], tip[1], cell('iron', 2), d, 'held');
              sheet.add(tip[0] + 1, tip[1], cell('iron', 3), d, 'held');
              sheet.add(tip[0], tip[1] + 1, cell('iron', 4), d, 'held');
            }
          },
        }
      : {}),
  };
}

// ------------------------------------------------------------------- props

/** What an activity is done on, as a picture with its foot and its place beside the hero. */
export interface ActivityProp {
  readonly grid: TGrid;
  readonly glows: readonly Glow[];
  /** The middle of its foot on its base row, in its own pixels. */
  readonly foot: { readonly x: number; readonly y: number };
  /** Where its foot stands from the hero's anchor (the middle of the soles), in art pixels. */
  readonly at: { readonly x: number; readonly y: number };
  /** Drawn in front of the hero (a pot, a strongbox the hand reaches into), or behind. */
  readonly front: boolean;
}

/** A canvas for a prop, drawn into by the shapes below, outlined when done. */
class Canvas {
  readonly g: TGrid;
  constructor(w: number, h: number) {
    this.g = tgrid(w, h);
  }
  set(x: number, y: number, m: Mat, step: number): void {
    put(this.g, Math.round(x), Math.round(y), cell(m, Math.max(0, Math.min(5, Math.round(step)))));
  }
  /** An upright solid lit from the left: a lit edge, the field, a shadow third, a dark edge. */
  upright(x0: number, y0: number, w: number, h: number, m: Mat, base = 2): void {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const t = (x - x0) / Math.max(1, w - 1);
        this.set(x, y, m, base - 1 + (t < 0.18 ? 0 : t < 0.6 ? 1 : t < 0.86 ? 2 : 3));
      }
  }
  /** A cylinder lying across, lit along its top. */
  lying(x0: number, y0: number, w: number, h: number, m: Mat): void {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const t = (y - y0) / Math.max(1, h - 1);
        this.set(x, y, m, t < 0.2 ? 1 : t < 0.55 ? 2 : t < 0.85 ? 3 : 4);
      }
  }
  /** A filled ellipse, lit toward its upper left. */
  dome(cx: number, cy: number, rx: number, ry: number, m: Mat, base = 2): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        const lit = -(dx * 0.7 + dy * 0.7);
        this.set(
          x,
          y,
          m,
          base + (lit > 0.45 ? -1 : lit < -0.35 ? 1 : 0) + (d > 0.8 && lit < 0 ? 1 : 0),
        );
      }
  }
  done(): TGrid {
    return outlined(this.g);
  }
}

const PROPS: Readonly<Record<string, () => ActivityProp>> = {
  // A log on a chopping block, its cut end showing its rings.
  woodcutting: () => {
    const c = new Canvas(22, 26);
    c.upright(3, 8, 16, 18, 'bark');
    c.dome(10.5, 8, 7.5, 2, 'wood', 1);
    for (let x = 6; x <= 15; x += 3) c.set(x, 8, 'wood', 3);
    c.lying(1, 1, 18, 6, 'bark');
    c.dome(19, 4, 2, 3, 'wood', 1);
    c.set(19, 4, 'wood', 3);
    return { grid: c.done(), glows: [], foot: { x: 11, y: 25 }, at: { x: 22, y: 0 }, front: false };
  },
  // A boulder with veins of ore glinting in it.
  mining: () => {
    const c = new Canvas(26, 22);
    c.dome(13, 12, 12, 10, 'stone', 2);
    for (const [x, y] of [
      [8, 7],
      [9, 8],
      [15, 10],
      [16, 11],
      [11, 14],
      [19, 15],
      [6, 13],
    ] as const) {
      c.set(x, y, 'bronze', 1);
      c.set(x + 1, y, 'bronze', 3);
    }
    return { grid: c.done(), glows: [], foot: { x: 13, y: 21 }, at: { x: 26, y: 0 }, front: false };
  },
  // The water's edge: a stretch of shallows with the float and its rings.
  fishing: () => {
    const c = new Canvas(34, 9);
    c.dome(17, 4, 16, 4, 'sea', 2);
    for (let x = 9; x <= 25; x++) if (x < 14 || x > 20) c.set(x, 4, 'sea', 0);
    c.set(17, 3, 'crimson', 2);
    c.set(17, 4, 'linen', 1);
    return { grid: c.done(), glows: [], foot: { x: 17, y: 4 }, at: { x: 30, y: -6 }, front: false };
  },
  // A bramble with berries.
  foraging: () => {
    const c = new Canvas(22, 22);
    c.dome(11, 12, 10, 9, 'leaf', 2);
    c.dome(7, 9, 5, 4, 'leaf', 2);
    c.dome(15, 8, 5, 4, 'leaf', 2);
    for (const [x, y] of [
      [5, 10],
      [12, 6],
      [16, 12],
      [9, 15],
      [14, 17],
      [18, 9],
    ] as const) {
      c.set(x, y, 'crimson', 1);
      c.set(x + 1, y, 'crimson', 3);
    }
    return { grid: c.done(), glows: [], foot: { x: 11, y: 21 }, at: { x: 21, y: 0 }, front: false };
  },
  // A pot on three stones over a fire.
  cooking: () => {
    const c = new Canvas(20, 20);
    c.upright(3, 3, 14, 9, 'iron', 2);
    c.dome(10, 3, 7, 1.5, 'iron', 4);
    c.lying(2, 2, 16, 1, 'iron');
    for (const [x, y, w] of [
      [8, 13, 4],
      [7, 14, 6],
      [6, 15, 8],
    ] as const)
      for (let i = 0; i < w; i++) c.set(x + i, y, 'fire', i === 0 || i === w - 1 ? 2 : 1);
    c.set(9, 15, 'fire', 0);
    c.set(10, 14, 'fire', 0);
    c.dome(3, 17, 3, 2, 'stone', 3);
    c.dome(16, 17, 3, 2, 'stone', 3);
    c.lying(5, 17, 10, 2, 'bark');
    return {
      grid: c.done(),
      glows: [{ x: 10, y: 14, radius: 14, strength: 0.5, always: true }],
      foot: { x: 10, y: 19 },
      at: { x: 22, y: 0 },
      front: true,
    };
  },
  // An anvil on its block, a bar glowing on it.
  smithing: () => {
    const c = new Canvas(24, 24);
    c.upright(5, 10, 14, 14, 'wood', 2);
    c.upright(8, 5, 8, 5, 'iron', 2);
    c.lying(2, 1, 20, 4, 'iron');
    for (let x = 0; x < 3; x++) c.set(x, 2 + Math.floor(x / 2), 'iron', 2);
    for (let x = 9; x < 15; x++) c.set(x, 0, 'fire', x === 9 || x === 14 ? 2 : 1);
    return {
      grid: c.done(),
      glows: [{ x: 12, y: 0, radius: 9, strength: 0.6, always: true }],
      foot: { x: 12, y: 23 },
      at: { x: 20, y: 0 },
      front: false,
    };
  },
  // A bench with a length of cloth laid over it.
  crafting: () => {
    const c = new Canvas(24, 26);
    c.lying(0, 2, 24, 3, 'wood');
    for (const x of [2, 20]) c.upright(x, 5, 2, 21, 'wood', 3);
    for (let x = 3; x < 15; x++) {
      c.set(x, 1, 'linen', x < 6 ? 0 : 1);
      c.set(x, 2, 'linen', 2);
    }
    for (let y = 3; y < 9; y++) c.set(4, y, 'linen', y % 2 ? 2 : 3);
    return { grid: c.done(), glows: [], foot: { x: 12, y: 25 }, at: { x: 22, y: 0 }, front: false };
  },
  // A bundle of shafts and a heap of feathers on a stump.
  fletching: () => {
    const c = new Canvas(16, 24);
    c.upright(2, 12, 12, 12, 'bark');
    c.dome(8, 12, 6, 1.5, 'wood', 1);
    for (const x of [4, 6, 8, 10])
      for (let y = 1; y < 11; y++) c.set(x + (y < 4 ? 1 : 0), y, 'pinewood', 2);
    c.dome(12, 9, 2, 1.5, 'linen', 1);
    return { grid: c.done(), glows: [], foot: { x: 8, y: 23 }, at: { x: 21, y: 0 }, front: false };
  },
  // A small table with a stand of flasks and a dish smoking.
  alchemy: () => {
    const c = new Canvas(24, 32);
    c.lying(0, 8, 24, 3, 'wood');
    for (const x of [2, 20]) c.upright(x, 11, 2, 21, 'wood', 3);
    for (const [x, m] of [
      [3, 'teal'],
      [8, 'violet'],
      [13, 'teal'],
    ] as const) {
      c.set(x + 1, 1, 'wood', 2);
      c.set(x + 1, 2, 'glass', 2);
      c.upright(x, 3, 3, 5, 'glass', 2);
      c.set(x + 1, 5, m, 1);
      c.set(x + 1, 6, m, 2);
    }
    c.upright(17, 6, 5, 2, 'iron', 2);
    c.set(19, 3, 'smoke', 1);
    c.set(20, 1, 'smoke', 1);
    return { grid: c.done(), glows: [], foot: { x: 12, y: 31 }, at: { x: 22, y: 0 }, front: false };
  },
  // A stall's counter of crates, a fat purse left on it.
  thieving: () => {
    const c = new Canvas(22, 26);
    c.upright(0, 4, 22, 22, 'wood', 2);
    for (let x = 0; x < 22; x++) {
      c.set(x, 4, 'wood', 1);
      c.set(x, 14, 'wood', 4);
    }
    for (const y of [5, 15]) for (let yy = y; yy < y + 9; yy++) c.set(10, yy, 'wood', 4);
    c.dome(8, 2, 3, 2, 'leather', 2);
    c.set(8, 0, 'gold', 1);
    return { grid: c.done(), glows: [], foot: { x: 11, y: 25 }, at: { x: 22, y: 0 }, front: true };
  },
};

const props = new Map<string, ActivityProp>();

/** The prop an activity is done on, or null (combat's loops have none). Kept once made. */
export function activityPropOf(id: string): ActivityProp | null {
  const make = PROPS[id];
  if (!make) return null;
  let p = props.get(id);
  if (!p) {
    p = make();
    props.set(id, p);
  }
  return p;
}

/** Every activity's tools and props, for a test to hold them drawable. */
export const ACTIVITY_TOOLS = Object.keys(TOOLS);
