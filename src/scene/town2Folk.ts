/*
 * The townsfolk who stroll, as rules: where each is (`stroll.ts`, on their
 * own clocks), how they stand and step (`figures2.ts`'s poses), a tap that
 * stops one and sends the hero to talk to them, and turning to each other
 * when he gets there. Pure: the clocks are values the Town tab keeps, moved
 * on by the scene's time, and held still while someone is being talked to.
 */
import { TOWNSFOLK2_STRIDE } from '../art/character2';
import { TOWN2_TILE } from '../art/town2/town';
import { breathFrame, strideFrame, walkFacing, type Pose2 } from './figures2';
import { cheapest } from './path';
import { facingToward, walkUp, type Facing, type Play } from './play';
import {
  PERSONAL,
  crowding,
  giveWay,
  roundOf,
  strollAt,
  strollPast,
  type Round,
  type Strolling,
} from './stroll';
import { route } from './path';
import type { TileMap } from './tileMap';
import { grown, type Box, type Scene } from './things';
import { cellAt, isSolid, type Point } from './tileMap';
import { personTap, standBeside, STROLLERS2, talkGap, town2Scene } from './town2';
import type { Walking } from './town2Art';

const T = TOWN2_TILE;

/** Each stroller's round, in the order of `STROLLERS2`. */
export const ROUNDS: readonly Round[] = STROLLERS2.map((p) => roundOf(p.stroll, T));

/**
 * Each stroller's own clock: how far into their time they are, in
 * milliseconds; and, where any has been waiting for the hero to get out of
 * the way, how long (`waited`, absent for none).
 */
export type FolkClocks = readonly number[] & { readonly waited?: readonly number[] };

/** The clocks as the page opens. */
export const startFolk = (): FolkClocks => STROLLERS2.map(() => 0);

/** Whether the hero is talking to someone, or on his way to. */
export const talkingTo = (play: Play, id: string): boolean =>
  play.heading === id || play.open === id;

/** Whether a stroller may step onto ground beside her route: anywhere the town lets anyone walk. */
const walkable = (p: Point): boolean => !isSolid(town2Scene().map, cellAt(p, T));

/**
 * The clocks after `ms`: each runs on unless its stroller is being talked
 * to, and gives way to the hero (`strollPast`): a stroller he stands in the
 * way of steps round him (`giveWay`), or where the ground beside her way is
 * blocked, stops at the edge of his room, waits, and turns back.
 */
export function folkOn(clocks: FolkClocks, ms: number, play: Play): FolkClocks {
  if (ms <= 0) return clocks;
  const waited: number[] = [];
  const next = clocks.map((c, i) => {
    if (talkingTo(play, STROLLERS2[i]!.id)) {
      waited.push(0);
      return c;
    }
    const went = strollPast(ROUNDS[i]!, c, ms, clocks.waited?.[i] ?? 0, play.walker.at, walkable);
    waited.push(went.waited);
    return went.clock;
  });
  return waited.some((w) => w > 0) ? Object.assign(next, { waited }) : next;
}

/** A copy of a map with `cells` solid as well: for planning a walk round someone standing. */
function withSolid(map: TileMap, cells: readonly { col: number; row: number }[]): TileMap {
  const solid = (Object.keys(map.kinds) as string[]).find((k) => map.kinds[k]!.solid);
  if (!solid) return map;
  const tiles = map.tiles.map((line) => [...line]);
  for (const c of cells) if (tiles[c.row]?.[c.col] !== undefined) tiles[c.row]![c.col] = solid;
  return { ...map, tiles };
}

/**
 * The hero walking for `ms` among people who stroll (`others`, their feet):
 * he never walks into anyone's room (`PERSONAL`). Where his walk would, he
 * stops at its edge and his way is planned again round them, if there is
 * one; otherwise he waits there, and they, giving way to him too, turn back.
 * Walking away from someone, or past them, is never stopped.
 */
export function walkAmong(
  walk: (play: Play, ms: number) => Play,
  map: TileMap,
  play: Play,
  ms: number,
  others: readonly Point[],
): Play {
  const next = walk(play, ms);
  const from = play.walker.at;
  const inWay = (at: Point) =>
    others.find((o) => {
      const e = crowding(at, o);
      return e < 1 && e < crowding(from, o);
    });
  const who = inWay(next.walker.at);
  if (!who) return next;
  let lo = 0;
  let hi = ms;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (inWay(walk(play, mid).walker.at)) hi = mid;
    else lo = mid;
  }
  const stopped = walk(play, lo);
  const goal = play.walker.path.at(-1);
  if (!goal) return stopped;
  // Round them: their tile, and the tiles either side their room reaches, are not to be walked through.
  const c = cellAt(who, T);
  const reach = Math.ceil(PERSONAL.rx / T);
  const blocked = [];
  for (let dc = -reach; dc <= reach; dc++) blocked.push({ col: c.col + dc, row: c.row });
  const here = cellAt(stopped.walker.at, T);
  const there = cellAt(goal, T);
  const round = withSolid(
    map,
    blocked.filter(
      (b) =>
        !(b.col === here.col && b.row === here.row) &&
        !(b.col === there.col && b.row === there.row),
    ),
  );
  const path = route(round, stopped.walker.at, goal);
  const end = path.at(-1);
  if (!end || cellAt(end, T).col !== there.col || cellAt(end, T).row !== there.row)
    return { ...stopped, walker: { ...stopped.walker, path: stopped.walker.path } };
  // The last point as it was (a talking spot is not a tile's middle).
  const last = path.length > 0 ? [...path.slice(0, -1), goal] : [goal];
  return { ...stopped, walker: { at: stopped.walker.at, path: last } };
}

/**
 * Where each stroller is now, by their clocks, stepping round the hero (at
 * `play`) as they pass him (`giveWay`); not round him once he is coming to
 * talk to them, when they have stopped for him.
 */
export const strolling = (clocks: FolkClocks, play?: Play): Strolling[] =>
  ROUNDS.map((r, i) => {
    const clock = clocks[i] ?? 0;
    if (!play || talkingTo(play, STROLLERS2[i]!.id)) return strollAt(r, clock);
    return giveWay(r, clock, play.walker.at, walkable) ?? strollAt(r, clock);
  });

/** How out of step a stroller's breath is with the townsfolk who stand. */
const PHASE = 450;

/** Which way someone at `at` faces while the hero, at `hero`, talks to them: toward him. */
const toward = (at: Point, hero: Point, side: Facing): Facing =>
  hero.x < at.x - 2 ? 'left' : hero.x > at.x + 2 ? 'right' : side;

/** Each stroller as the town draws them this frame: walking a stride, or standing and breathing. */
export function strollersNow(clocks: FolkClocks, play: Play, now: number): Walking[] {
  return strolling(clocks, play).map((s, i) => {
    const p = STROLLERS2[i]!;
    const talking = talkingTo(play, p.id);
    const pose: Pose2 =
      s.walking && !talking
        ? {
            walking: true,
            facing: walkFacing(s.way, s.side),
            frame: strideFrame(s.walked, TOWNSFOLK2_STRIDE),
          }
        : {
            walking: false,
            facing: talking ? toward(s.at, play.walker.at, s.side) : s.side,
            frame: breathFrame(now, (i + 3) * PHASE),
          };
    return { figure: p.figure, feet: s.at, pose };
  });
}

const inside = (b: Box, p: Point): boolean =>
  p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;

/**
 * Which stroller, if any, a tap at `point` picks, where they are drawn
 * (stepping round the hero at `play`, if given): one whose own box holds it
 * (the nearer the front, where two do), or failing that one whose box grown
 * to a thumb (`min`) does, unless the tap is inside something else's own box.
 */
export function strollerAt(
  clocks: FolkClocks,
  scene: Scene,
  point: Point,
  min: number,
  play?: Play,
): number | null {
  const now = strolling(clocks, play);
  let best: number | null = null;
  now.forEach((s, i) => {
    if (inside(personTap(s.at), point) && (best === null || s.at.y >= now[best]!.at.y)) best = i;
  });
  if (best !== null) return best;
  if (scene.things.some((t) => t.tap && inside(t.tap, point))) return null;
  let nearest = Infinity;
  now.forEach((s, i) => {
    const box = grown(personTap(s.at), min);
    if (!inside(box, point)) return;
    const d = Math.hypot(s.at.x - point.x, s.at.y - point.y);
    if (d < nearest) {
      nearest = d;
      best = i;
    }
  });
  return best;
}

/**
 * A tap on stroller `i`: they stop where they are (their clock holds while
 * the hero is on his way and while they talk), and he sets off for the
 * nearer of the places to talk to them from, either side, far enough off
 * that the two do not overlap.
 */
export function talkToStroller(scene: Scene, play: Play, clocks: FolkClocks, i: number): Play {
  const p = STROLLERS2[i]!;
  if (play.open === p.id) return play;
  const at = strolling(clocks)[i]!.at;
  const feet = { x: Math.round(at.x), y: Math.round(at.y) };
  const gap = talkGap(p.figure);
  const stands = ([-1, 1] as const)
    .map((side) => standBeside(scene.map, feet, side, gap))
    .filter((s): s is Point => s !== null);
  const spot = cheapest(
    scene.map,
    play.walker.at,
    stands.map((s) => cellAt(s, T)),
  );
  const stand = spot && stands.find((s) => cellAt(s, T).col === spot.col);
  return walkUp(scene.map, play, p.id, spot, stand ?? null);
}

/**
 * After a step of time: the hero, arriving to talk to a stroller, turns to
 * face where they actually stand (the scene knows them only by their words).
 */
export function faceStroller(before: Play, after: Play, clocks: FolkClocks): Play {
  if (!before.heading || after.heading || after.open !== before.heading) return after;
  const i = STROLLERS2.findIndex((p) => p.id === before.heading);
  if (i < 0) return after;
  const at = strolling(clocks)[i]!.at;
  const facing = facingToward(before.facing, after.walker.at, at.x);
  return facing === after.facing ? after : { ...after, facing };
}
