/*
 * What happens in a scene, as pure rules: a tap sets the walker off, time
 * moves it, and arriving beside a thing opens it. The stage only feeds these
 * taps and time and shows the result, so all of it can be tested without a
 * canvas.
 */
import { approach, footprintCentreX, panelFor, thingAt, usable, type Scene } from './things';
import { centreOf, type Point } from './tileMap';
import { step, walkTo, type Walker } from './walker';

export type Facing = 'left' | 'right';

/** The walker in a scene and what they are doing. Not saved: it lasts as long as the page. */
export interface Play {
  readonly walker: Walker;
  /** Which way the walker faces: the way they last walked. */
  readonly facing: Facing;
  /** How far they have walked, in art pixels, which times the bob of their step. */
  readonly walked: number;
  /** The thing they are walking up to, which opens when they get there. */
  readonly heading: string | null;
  /** The thing whose panel is open. */
  readonly open: string | null;
  /** How many times each thing's panel has opened: which of its lines it says next. */
  readonly visits: Readonly<Record<string, number>>;
}

export function startPlay(at: Point): Play {
  return {
    walker: { at, path: [] },
    facing: 'right',
    walked: 0,
    heading: null,
    open: null,
    visits: {},
  };
}

/** A panel opening for `id`: one more visit to it. */
function opened(play: Play, id: string): Pick<Play, 'open' | 'visits'> {
  return { open: id, visits: { ...play.visits, [id]: (play.visits[id] ?? 0) + 1 } };
}

/** How many times `id`'s panel has opened, this one included if it is open. */
export function visitsTo(play: Play, id: string): number {
  return play.visits[id] ?? 0;
}

/**
 * How far sideways a walker must move, in art pixels, before they turn. Going
 * straight up or down keeps the way they faced.
 */
const TURN = 0.01;

/** Which way a walker faces after moving from `from` to `to`. */
export function facingAfter(facing: Facing, from: Point, to: Point): Facing {
  const dx = to.x - from.x;
  if (dx < -TURN) return 'left';
  if (dx > TURN) return 'right';
  return facing;
}

/** Which way to face something at `x` from `from`; straight ahead keeps the old way. */
export function facingToward(facing: Facing, from: Point, x: number): Facing {
  if (x < from.x - 2) return 'left';
  if (x > from.x + 2) return 'right';
  return facing;
}

/** Art pixels per half-step: the walker rises a pixel every other one. */
export const STRIDE = 6;

/** How far a walker is lifted off the ground mid-stride: one pixel every other half-step, while walking. */
export function bob(play: Play): number {
  if (play.walker.path.length === 0) return 0;
  return Math.floor(play.walked / STRIDE) % 2;
}

/**
 * A tap at `point` (art pixels in the scene). On something that can be used,
 * the walker sets off for the nearest spot beside it; anywhere else they walk
 * there, as near as the ground allows. Either way an open panel closes, unless
 * the tap was on the thing it is open for. `min` is the smallest a tap target
 * may be, in art pixels.
 */
export function tapAt(scene: Scene, play: Play, point: Point, min = 0): Play {
  const thing = thingAt(scene.things, point, min);
  if (thing && usable(thing)) {
    if (play.open === panelFor(thing)) return play;
    const spot = approach(scene.map, play.walker.at, thing);
    // Somewhere it cannot be reached from still says what it is.
    if (!spot)
      return {
        ...play,
        walker: { ...play.walker, path: [] },
        heading: null,
        ...opened(play, panelFor(thing)),
      };
    return {
      ...play,
      walker: walkTo(scene.map, { at: play.walker.at, path: [] }, centreOf(spot)),
      heading: thing.id,
      open: null,
    };
  }
  return { ...play, walker: walkTo(scene.map, play.walker, point), heading: null, open: null };
}

/** Time passing: the walker walks, turns the way they go, and opens what they were heading for. */
export function advancePlay(scene: Scene, play: Play, ms: number): Play {
  const moved = step(play.walker, ms);
  let { facing, walked } = play;
  if (moved !== play.walker) {
    facing = facingAfter(facing, play.walker.at, moved.at);
    walked += Math.hypot(moved.at.x - play.walker.at.x, moved.at.y - play.walker.at.y);
  }
  if (play.heading && moved.path.length === 0) {
    const thing = scene.things.find((t) => t.id === play.heading);
    if (thing) facing = facingToward(facing, moved.at, footprintCentreX(thing));
    const id = thing ? panelFor(thing) : play.heading;
    return { ...play, walker: moved, facing, walked, heading: null, ...opened(play, id) };
  }
  if (moved === play.walker) return play;
  return { ...play, walker: moved, facing, walked };
}

/** Closes whatever panel is open. */
export function closePanel(play: Play): Play {
  return play.open ? { ...play, open: null } : play;
}
