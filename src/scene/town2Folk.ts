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
import { roundOf, strollAt, strollOn, type Round, type Strolling } from './stroll';
import { grown, type Box, type Scene } from './things';
import { cellAt, type Point } from './tileMap';
import { personTap, standBeside, STROLLERS2, talkGap } from './town2';
import type { Walking } from './town2Art';

const T = TOWN2_TILE;

/** Each stroller's round, in the order of `STROLLERS2`. */
export const ROUNDS: readonly Round[] = STROLLERS2.map((p) => roundOf(p.stroll, T));

/** Each stroller's own clock: how far into their time they are, in milliseconds. */
export type FolkClocks = readonly number[];

/** The clocks as the page opens. */
export const startFolk = (): FolkClocks => STROLLERS2.map(() => 0);

/** Whether the hero is talking to someone, or on his way to. */
export const talkingTo = (play: Play, id: string): boolean =>
  play.heading === id || play.open === id;

/** The clocks after `ms`: each runs on unless its stroller is being talked to. */
export function folkOn(clocks: FolkClocks, ms: number, play: Play): FolkClocks {
  if (ms <= 0) return clocks;
  return clocks.map((c, i) => strollOn(c, ms, talkingTo(play, STROLLERS2[i]!.id)));
}

/** Where each stroller is now, by their clocks. */
export const strolling = (clocks: FolkClocks): Strolling[] =>
  ROUNDS.map((r, i) => strollAt(r, clocks[i] ?? 0));

/** How out of step a stroller's breath is with the townsfolk who stand. */
const PHASE = 450;

/** Which way someone at `at` faces while the hero, at `hero`, talks to them: toward him. */
const toward = (at: Point, hero: Point, side: Facing): Facing =>
  hero.x < at.x - 2 ? 'left' : hero.x > at.x + 2 ? 'right' : side;

/** Each stroller as the town draws them this frame: walking a stride, or standing and breathing. */
export function strollersNow(clocks: FolkClocks, play: Play, now: number): Walking[] {
  return strolling(clocks).map((s, i) => {
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
 * Which stroller, if any, a tap at `point` picks: one whose own box holds it
 * (the nearer the front, where two do), or failing that one whose box grown
 * to a thumb (`min`) does, unless the tap is inside something else's own box.
 */
export function strollerAt(
  clocks: FolkClocks,
  scene: Scene,
  point: Point,
  min: number,
): number | null {
  const now = strolling(clocks);
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
