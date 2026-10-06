/*
 * The town coming into view, and everything the Town tab needs to show it.
 *
 * `prepareTown` asks for the town once a page: the facts (the scene to walk
 * in, the lights) and the town painted for the time of day, worked out in a
 * worker (`town2Art.ts`'s painter). The Town tab shows a loading state until
 * the facts are in and then the stage, with the loading state over it until
 * the first still is held. The page starts asking as soon as it loads
 * (`townView.ts`), so by the time a player opens the tab it is usually there.
 */
import { WORLD2_WIDTH } from '../art/town2/scale';
import { TOWN2_TILE } from '../art/town2/town';
import type { GameState } from '../core/state';
import type { TimeOfDay } from './daylight';
import { scaleFor, type SceneSize } from './scale';
import { Gait, standing } from './gait';
import type { StageArt, WalkerFrame } from './stage';
import type { Scene } from './things';
import { centreOf, type Point } from './tileMap';
import { BOAT_LANDING2, TOWN2_START_CELL } from './town2';
import {
  FIGURE2_FEET,
  Hero2,
  painter,
  poser,
  town2Art,
  type Painter,
  type Town2Art,
} from './town2Art';
import { STEPS, type TownFacts } from './town2Facts';
import type { Size } from './camera';

/**
 * The town's scale: a world 360 art pixels across (3 device pixels an art
 * pixel on a 390-wide phone at 3x), at least 213 down, and a little slack
 * for a canvas trimmed to whole pixels on a 2.625x phone. The app is never
 * wider than 480 CSS pixels, so a tablet at 2x or a desktop at 1x shows 480
 * art pixels across at one CSS pixel each: the same size on screen as on a
 * phone, a little more town.
 */
export const TOWN2_SCENE: SceneSize = { width: WORLD2_WIDTH, minHeight: 213, slack: 12 };

/** How far above the hero's feet the camera looks: the middle of a 64-pixel figure. */
export const FOCUS_RISE2 = 30;

/** Where the hero first stands. */
export const START2: Point = centreOf(TOWN2_START_CELL, TOWN2_TILE);

/** Where the boat lands him back from a dungeon. */
export const LANDING2: Point = centreOf(BOAT_LANDING2, TOWN2_TILE);

let facts: TownFacts | null = null;
let art: Town2Art | null = null;
let hero: Hero2 | null = null;
/** How far the first painting has got, of `STEPS`. */
let step = 0;
let asked = false;

/**
 * Starts working the town out, for the time of day it will first be seen
 * in: once a page, however often it is asked. With no worker (tests) the
 * facts are worked out before this returns.
 */
export function prepareTown(time: TimeOfDay, paint: Painter = painter()): void {
  if (asked) return;
  asked = true;
  paint(time, true, {
    facts(f) {
      facts = f;
      art = town2Art(f, { paint, awaiting: time });
      hero?.lightBy(f.lights);
    },
    step(n) {
      step = Math.max(step, n);
    },
    done(p) {
      step = STEPS;
      art?.take(p);
    },
  });
}

/** Whether the scene can be walked yet: its facts are in. */
export function townReady(): boolean {
  return facts !== null;
}

/** How far the town is from showing, 0 to 1: honest steps of the work, for the loading state. */
export function townProgress(): number {
  if (art && !art.loading()) return 1;
  return (step + (facts ? 1 : 0)) / (STEPS + 1);
}

/** Whether the town is still coming into view: the loading state stays over it until it is. */
export function townLoading(): boolean {
  return !facts || (art?.loading() ?? true);
}

/** The hero at the C scale, dressed as the state says. */
export function wear2(state: GameState): void {
  hero ??= new Hero2(poser());
  if (facts) hero.lightBy(facts.lights);
  hero.wear(state);
}

/** An empty figure, for the moment before the hero can be painted. */
let empty: HTMLCanvasElement | null = null;
function nobody(): HTMLCanvasElement {
  empty ??= document.createElement('canvas');
  return empty;
}

/** What the stage is given to show the town. Only once `townReady()`. */
export function town2Stage(): {
  scene: Scene;
  art: StageArt;
  scaleOf: (device: Size) => number;
  focusRise: number;
  pixelated: true;
} {
  if (!facts || !art) throw new Error('The town is not ready to show.');
  hero ??= new Hero2(poser());
  hero.lightBy(facts.lights);
  const look = art;
  const me = hero;
  const gait = new Gait();
  /** This frame's answer, one object reused: a frame makes nothing. */
  const shown = { image: null as HTMLCanvasElement | null, feetX: FIGURE2_FEET.x };
  return {
    scene: facts.scene,
    art: {
      still: look.still,
      standers: look.standers,
      shadowAt: look.shadowAt,
      life: look.life,
      heroFeet: FIGURE2_FEET,
      // Standing still as drawn: only for a stage that does not ask for his pose.
      walkerAt: (feet, facing, palette) =>
        me.at(feet, standing(facing, 0), look.held() ?? palette.name) ?? nobody(),
      // Drawn in the held still's time of day, so he matches the town around him during a flip.
      walkerPose: (feet, play, palette, now) => {
        const pose = gait.pose(play, now);
        shown.image = me.at(feet, pose, look.held() ?? palette.name) ?? nobody();
        shown.feetX = me.anchorX(pose);
        return shown as WalkerFrame;
      },
    },
    scaleOf: scaleFor(TOWN2_SCENE),
    focusRise: FOCUS_RISE2,
    pixelated: true,
  };
}

/** The town's look, once its facts are in. */
export function art2Now(): Town2Art | null {
  return art;
}

/** The hero as the town draws him. */
export function hero2Now(): Hero2 | null {
  return hero;
}

/** Lets every picture go and starts afresh: the next `prepareTown` asks again. For tests. */
export function forget2(): void {
  art?.forget();
  art = null;
  facts = null;
  hero = null;
  step = 0;
  asked = false;
}
