/*
 * What happens in a scene, as pure rules: a tap sets the walker off, time
 * moves it, and arriving beside a thing opens it. The stage only feeds these
 * taps and time and shows the result, so all of it can be tested without a
 * canvas.
 */
import { clearLine } from './path';
import { approach, footprintCentreX, panelFor, thingAt, usable, type Scene } from './things';
import { cellAt, centreOf, tileOf, type Cell, type Point, type TileMap } from './tileMap';
import { stepBy, walkTo, type Walker } from './walker';

export type Facing = 'left' | 'right';

/**
 * Which way a walker is going, for a picture that has more than two sides:
 * across the screen, toward the camera (`down`) or away from it (`up`).
 */
export type Way = 'across' | 'down' | 'up';

/** The walker in a scene and what they are doing. Not saved: it lasts as long as the page. */
export interface Play {
  readonly walker: Walker;
  /** Which way the walker faces: the way they last walked. */
  readonly facing: Facing;
  /** How far they have walked, in art pixels, along the path: what times their step. */
  readonly walked: number;
  /**
   * How far they had walked when they last stopped: a walk's stride counts
   * from here, so every walk starts on the same foot. Absent is 0.
   */
  readonly strideFrom?: number;
  /** Which way they are going, kept steady through a diagonal (`wayAfter`). Absent is across. */
  readonly way?: Way;
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

/**
 * How steep a walk must be to turn from across to down (or up): 60 degrees
 * from the level; and how shallow, from down or up back to across: 30. A
 * diagonal in between keeps whichever it had, so a walk at 45 degrees, or a
 * path that wavers about one, never flickers between pictures.
 */
const STEEP = Math.tan((60 * Math.PI) / 180);
const SHALLOW = Math.tan((30 * Math.PI) / 180);

/** Which way a walker is going after moving by (`dx`, `dy`), from `way`. */
export function wayAfter(way: Way, dx: number, dy: number): Way {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < TURN && ay < TURN) return way;
  if (way === 'across') return ay > ax * STEEP ? (dy > 0 ? 'down' : 'up') : 'across';
  if (ay < ax * SHALLOW) return 'across';
  // Still steep: down or up by the way it goes now.
  return dy > 0 ? 'down' : 'up';
}

/** Which way to face something at `x` from `from`; straight ahead keeps the old way. */
export function facingToward(facing: Facing, from: Point, x: number): Facing {
  if (x < from.x - 2) return 'left';
  if (x > from.x + 2) return 'right';
  return facing;
}

/** How near the walker must come, in art pixels each way, for someone standing about to turn to him. */
export const NOTICE = 40;

/**
 * Which way someone standing with their feet at `at` faces: as drawn
 * (`right`) unless the walker is near and off to their left, when they turn
 * to look at him. A walker straight in front of them is looked at as drawn.
 */
export function turnedTo(at: Point, walker: Point, notice = NOTICE): Facing {
  if (Math.abs(walker.x - at.x) > notice || Math.abs(walker.y - at.y) > notice) return 'right';
  return walker.x < at.x - 2 ? 'left' : 'right';
}

/** Art pixels per half-step: the walker rises a pixel every other one. */
export const STRIDE = 6;

/** How far a walker is lifted off the ground mid-stride: one pixel every other half-step, while walking. */
export function bob(play: Play, stride = STRIDE): number {
  if (play.walker.path.length === 0) return 0;
  return Math.floor(play.walked / stride) % 2;
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
    if (!spot) return walkUp(scene.map, play, panelFor(thing), null, null);
    const i = thing.spots?.findIndex((s) => s.col === spot.col && s.row === spot.row) ?? -1;
    const stand = i >= 0 ? (thing.stand?.[i] ?? null) : null;
    return walkUp(scene.map, play, thing.id, spot, stand);
  }
  return { ...play, walker: walkTo(scene.map, play.walker, point), heading: null, open: null };
}

/**
 * Half the width of the hero's feet for the last step to where he stands to
 * talk to someone, in art pixels: a short step sideways within the tile
 * beside them, where his boots may come up to the edge of what stands next
 * to it (the smith's anvil) without the clearance a walk across town keeps.
 */
export const STAND_HALF = 1;

/**
 * Sets off to use `id`: to the tile `spot`, and on to the point `stand` if
 * one is given and the way there is clear (where someone is talked to from:
 * a step further off than the tile's middle, so the two do not overlap).
 * With no spot `id` cannot be reached, and opens where he stands: it still
 * says what it is.
 */
export function walkUp(
  map: TileMap,
  play: Play,
  id: string,
  spot: Cell | null,
  stand: Point | null,
): Play {
  if (!spot)
    return { ...play, walker: { ...play.walker, path: [] }, heading: null, ...opened(play, id) };
  const walker = walkTo(map, { at: play.walker.at, path: [] }, centreOf(spot, tileOf(map)));
  const end = walker.path.at(-1) ?? play.walker.at;
  const on =
    stand && (stand.x !== end.x || stand.y !== end.y) && clearLine(map, end, stand, STAND_HALF)
      ? { ...walker, path: [...walker.path, stand] }
      : walker;
  return { ...play, walker: on, heading: id, open: null };
}

/** Time passing: the walker walks, turns the way they go, and opens what they were heading for. */
export function advancePlay(scene: Scene, play: Play, ms: number): Play {
  const { walker: moved, distance } = stepBy(play.walker, ms, scene.speed);
  let { facing } = play;
  let stepped: Pick<Play, 'walked' | 'strideFrom' | 'way'> = play;
  if (moved !== play.walker) {
    const dx = moved.at.x - play.walker.at.x;
    const dy = moved.at.y - play.walker.at.y;
    facing = facingAfter(facing, play.walker.at, moved.at);
    const walked = play.walked + distance;
    // Stopped: the next walk's stride starts from here, and it sets off across.
    stepped =
      moved.path.length === 0
        ? { walked, strideFrom: walked, way: 'across' }
        : { walked, strideFrom: play.strideFrom ?? 0, way: wayAfter(play.way ?? 'across', dx, dy) };
  }
  if (play.heading && moved.path.length === 0) {
    const thing = scene.things.find((t) => t.id === play.heading);
    if (thing) facing = facingToward(facing, moved.at, footprintCentreX(thing, tileOf(scene.map)));
    const id = thing ? panelFor(thing) : play.heading;
    return { ...play, ...stepped, walker: moved, facing, heading: null, ...opened(play, id) };
  }
  if (moved === play.walker) return play;
  return { ...play, ...stepped, walker: moved, facing };
}

/** How long a finger must stay down, in ms, before a press on the ground becomes steering. */
export const HOLD_MS = 220;
/** How far a finger must move, in CSS pixels, before a press on the ground becomes steering. */
export const DRAG_CSS = 12;

/**
 * Whether a press on the ground has become steering: held a moment, or
 * dragged. Until then it is a tap, which walks to where it landed and no
 * further, however the camera moves under the finger.
 */
export function steering(heldMs: number, movedCss: number): boolean {
  return heldMs >= HOLD_MS || movedCss >= DRAG_CSS;
}

/**
 * A finger held on the ground at `point`: the walker heads for it, re-aiming
 * as it moves. `aimed` is the tile the last re-aim was for; while the finger
 * stays over the same tile the walk is left alone rather than planned again
 * every frame. Holding closes any panel, as a tap on the ground does.
 */
export function steer(
  scene: Scene,
  play: Play,
  point: Point,
  aimed: Cell | null,
): { play: Play; aimed: Cell } {
  const cell = cellAt(point, tileOf(scene.map));
  if (aimed && aimed.col === cell.col && aimed.row === cell.row) return { play, aimed };
  return {
    play: { ...play, walker: walkTo(scene.map, play.walker, point), heading: null, open: null },
    aimed: cell,
  };
}

/** Closes whatever panel is open. */
export function closePanel(play: Play): Play {
  return play.open ? { ...play, open: null } : play;
}
