/**
 * Every foe's sizes at the C scale, as data (B10a): what a scene needs to
 * place, space, tap and reach a foe without measuring a sprite. Written out
 * from the drawings (`measureFoe2`) and held to them by
 * `tests/art/dungeonArt2.test.ts`, so a redrawn foe whose sizes move fails
 * until this table is brought up to date. Facing right; mirror `front` and
 * `back` for left.
 */
import { foe2Frame } from './cast2';

export interface Foe2Size {
  /** The standing canvas (idle, frame 0), outline included. */
  readonly w: number;
  readonly h: number;
  /** Where it stands on that canvas: the middle of its feet on the ground row. */
  readonly anchor: { readonly x: number; readonly y: number };
  /** Rows from the ground up to the top of what is drawn, standing. */
  readonly tall: number;
  /** Columns drawn ahead of the anchor and behind it, standing (facing right). */
  readonly front: number;
  readonly back: number;
  /** Columns drawn ahead of the anchor in its blow (`strike`): how far its weapon or jaws reach. */
  readonly strike: number;
  /** A tap box for it, centred on the anchor and standing on the ground: its body, not its weapon. */
  readonly box: { readonly w: number; readonly h: number };
  /** Half the width of its contact shadow. */
  readonly shadow: number;
  /** Rows of air its standing picture leaves between its lowest drawn row and its feet (a bird aloft). */
  readonly hover: number;
}

/** The sizes worked out from a foe's drawings. */
export function measureFoe2(id: string): Foe2Size | null {
  const idle = foe2Frame(id, 'idle', 0);
  const strike = foe2Frame(id, 'strike', 0);
  if (!idle || !strike) return null;
  const g = idle.picture.grid;
  const ax = idle.feet.x;
  let top = g.h;
  let bottom = -1;
  let x0 = g.w;
  let x1 = -1;
  const widths: number[] = [];
  for (let y = 0; y < g.h; y++) {
    let a = -1;
    let b = -1;
    for (let x = 0; x < g.w; x++)
      if (g.d[y * g.w + x]) {
        if (a < 0) a = x;
        b = x;
      }
    if (a < 0) continue;
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
    x0 = Math.min(x0, a);
    x1 = Math.max(x1, b);
    // A row's body: its longest unbroken run, so a pole held clear of it is not counted.
    let run = 0;
    let best = 0;
    for (let x = a; x <= b; x++) {
      run = g.d[y * g.w + x] ? run + 1 : 0;
      best = Math.max(best, run);
    }
    widths.push(best);
  }
  const sg = strike.picture.grid;
  let sx1 = -1;
  for (let y = 0; y < sg.h; y++)
    for (let x = sg.w - 1; x > sx1; x--) if (sg.d[y * sg.w + x]) sx1 = x;
  widths.sort((p, q) => p - q);
  const body = widths[Math.floor(widths.length * 0.75)] ?? 0;
  const tall = idle.feet.y - top;
  return {
    w: g.w,
    h: g.h,
    anchor: { x: ax, y: idle.feet.y },
    tall,
    front: x1 - ax,
    back: ax - x0,
    strike: sx1 - strike.feet.x,
    box: { w: Math.min(x1 - x0 + 1, Math.max(12, body + 2)), h: Math.max(12, idle.feet.y - top) },
    shadow: Math.max(6, Math.round(body / 2)),
    hover: Math.max(0, idle.feet.y - 1 - bottom),
  };
}

// The table below is written out by `measureFoe2` (B10a); keep it in step with the drawings.
export const FOE2_SIZES: Readonly<Record<string, Foe2Size>> = {
  dock_rat: {
    w: 48,
    h: 24,
    anchor: { x: 24, y: 23 },
    tall: 20,
    front: 22,
    back: 24,
    strike: 23,
    box: { w: 40, h: 20 },
    shadow: 19,
    hover: 0,
  },
  sand_crab: {
    w: 40,
    h: 26,
    anchor: { x: 20, y: 24 },
    tall: 24,
    front: 19,
    back: 20,
    strike: 19,
    box: { w: 40, h: 24 },
    shadow: 20,
    hover: 0,
  },
  smuggler: {
    w: 56,
    h: 72,
    anchor: { x: 28, y: 70 },
    tall: 64,
    front: 15,
    back: 20,
    strike: 27,
    box: { w: 28, h: 64 },
    shadow: 13,
    hover: 0,
  },
  deckhand: {
    w: 56,
    h: 72,
    anchor: { x: 28, y: 70 },
    tall: 70,
    front: 15,
    back: 21,
    strike: 26,
    box: { w: 24, h: 70 },
    shadow: 11,
    hover: 0,
  },
  powder_monkey: {
    w: 56,
    h: 72,
    anchor: { x: 28, y: 70 },
    tall: 70,
    front: 14,
    back: 14,
    strike: 22,
    box: { w: 26, h: 70 },
    shadow: 12,
    hover: 0,
  },
  giant_crab: {
    w: 84,
    h: 52,
    anchor: { x: 42, y: 50 },
    tall: 50,
    front: 41,
    back: 42,
    strike: 41,
    box: { w: 69, h: 50 },
    shadow: 34,
    hover: 0,
  },
  ships_parrot: {
    w: 46,
    h: 40,
    anchor: { x: 22, y: 39 },
    tall: 33,
    front: 13,
    back: 11,
    strike: 23,
    box: { w: 17, h: 33 },
    shadow: 8,
    hover: 0,
  },
  brinebeard: {
    w: 104,
    h: 112,
    anchor: { x: 48, y: 110 },
    tall: 104,
    front: 51,
    back: 32,
    strike: 53,
    box: { w: 56, h: 104 },
    shadow: 27,
    hover: 0,
  },
  thieving_gull: {
    w: 40,
    h: 32,
    anchor: { x: 20, y: 30 },
    tall: 26,
    front: 17,
    back: 17,
    strike: 17,
    box: { w: 25, h: 26 },
    shadow: 12,
    hover: 0,
  },
  bramble_boar: {
    w: 68,
    h: 44,
    anchor: { x: 32, y: 42 },
    tall: 39,
    front: 33,
    back: 29,
    strike: 35,
    box: { w: 56, h: 39 },
    shadow: 27,
    hover: 0,
  },
  footpad: {
    w: 56,
    h: 72,
    anchor: { x: 28, y: 70 },
    tall: 67,
    front: 15,
    back: 19,
    strike: 27,
    box: { w: 25, h: 67 },
    shadow: 12,
    hover: 0,
  },
  grey_wolf: {
    w: 70,
    h: 46,
    anchor: { x: 32, y: 44 },
    tall: 42,
    front: 35,
    back: 30,
    strike: 37,
    box: { w: 46, h: 42 },
    shadow: 22,
    hover: 0,
  },
  marsh_troll: {
    w: 82,
    h: 92,
    anchor: { x: 38, y: 90 },
    tall: 78,
    front: 36,
    back: 31,
    strike: 41,
    box: { w: 53, h: 78 },
    shadow: 26,
    hover: 0,
  },
  goblin_poacher: {
    w: 56,
    h: 72,
    anchor: { x: 28, y: 70 },
    tall: 55,
    front: 15,
    back: 18,
    strike: 24,
    box: { w: 29, h: 55 },
    shadow: 14,
    hover: 0,
  },
  bramble_wyrm: {
    w: 96,
    h: 60,
    anchor: { x: 46, y: 58 },
    tall: 49,
    front: 48,
    back: 43,
    strike: 49,
    box: { w: 44, h: 49 },
    shadow: 21,
    hover: 0,
  },
};
