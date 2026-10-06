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
import { anchorOf, FIGURE2_SOLE_Y, heroPose } from './figures2';
import { advancePlay, startPlay, type Play } from './play';
import { scaleFor, type SceneSize } from './scale';
import type { StageArt } from './stage';
import type { Scene } from './things';
import { centreOf, type Point } from './tileMap';
import { BOAT_LANDING2, STROLLERS2, TOWN2_START_CELL } from './town2';
import {
  FIGURE2_FEET,
  Hero2,
  painter,
  town2Art,
  type Painter,
  type Town2Art,
  type Walking,
} from './town2Art';
import {
  faceStroller,
  folkOn,
  startFolk,
  strollerAt,
  strollersNow,
  talkToStroller,
  type FolkClocks,
} from './town2Folk';
import { STEPS, type KeptReport, type TownFacts } from './town2Facts';
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
      art = town2Art(f, {
        paint,
        awaiting: time,
        walking: walkingNow,
        walkers: STROLLERS2.length,
      });
      hero?.lightBy(f.lights);
    },
    step(n) {
      step = Math.max(step, n);
    },
    done(p) {
      step = STEPS;
      art?.take(p);
    },
    kept(report) {
      keptReport = report;
    },
  });
}

/** What became of keeping the town for the next visit, once the worker has said. */
let keptReport: KeptReport | null = null;

/** Whether this visit's town came from storage or was kept for the next, and how big it is kept. For scripts. */
export function townKept(): KeptReport | null {
  return keptReport;
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
  hero ??= new Hero2();
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
  drive: (play: Play, ms: number) => Play;
  tap: (point: Point, min: number, play: Play) => Play | null;
} {
  if (!facts || !art) throw new Error('The town is not ready to show.');
  hero ??= new Hero2();
  hero.lightBy(facts.lights);
  const look = art;
  const me = hero;
  const scene = facts.scene;
  return {
    scene,
    art: {
      still: look.still,
      standers: look.standers,
      shadowAt: look.shadowAt,
      life: look.life,
      heroFeet: FIGURE2_FEET,
      walkerAt: () => nobody(),
      // Drawn in the held still's time of day, so he matches the town around him during a flip.
      walkerPlaced: (play, feet, palette, now) => {
        lastPlay = play;
        lastNow = now;
        const pose = heroPose(play, now);
        const time = look.held() ?? palette.name;
        const image = me.at(feet, pose, time);
        me.warm(time);
        return (
          image && {
            image,
            x: feet.x - anchorOf(pose),
            y: feet.y - FIGURE2_SOLE_Y,
            base: feet.y,
          }
        );
      },
    },
    scaleOf: scaleFor(TOWN2_SCENE),
    focusRise: FOCUS_RISE2,
    pixelated: true,
    // The strollers stroll with the hero's time, and stop for him.
    drive: (play, ms) => {
      folk = folkOn(folk, ms, play);
      return faceStroller(play, advancePlay(scene, play, ms), folk);
    },
    tap: (point, min, play) => {
      const i = strollerAt(folk, scene, point, min);
      return i === null ? null : talkToStroller(scene, play, folk, i);
    },
  };
}

/** The strollers' clocks: where each is in their round. They last as long as the page. */
let folk: FolkClocks = startFolk();
/** The hero's walk and the scene's clock as of the last frame drawn: what the strollers turn to. */
let lastPlay: Play | null = null;
let lastNow = 0;

/** The strollers as the town draws them this frame: worked out once a frame, asked for several times. */
const walked = { folk: null as FolkClocks | null, play: null as Play | null, now: NaN };
let walkedNow: readonly Walking[] = [];
function walkingNow(): readonly Walking[] {
  if (walked.folk === folk && walked.play === lastPlay && walked.now === lastNow) return walkedNow;
  walked.folk = folk;
  walked.play = lastPlay;
  walked.now = lastNow;
  walkedNow = strollersNow(folk, lastPlay ?? NOBODY, lastNow);
  return walkedNow;
}
const NOBODY: Play = startPlay({ x: -1e6, y: -1e6 });

/** Where each stroller is, for tests and screenshot scripts. */
export function strollersAt(): readonly Point[] {
  return walkingNow().map((w) => w.feet);
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
  folk = startFolk();
  lastPlay = null;
  lastNow = 0;
}
