/*
 * Everything the Town tab needs to show the C-scale town, in one module
 * that `townView.ts` loads only when the preview is on (`preview.ts`). The
 * new town's code and lane B's art for it (most of a hundred kilobytes) then
 * stay out of what every player downloads until it is the town for everyone.
 */
import { WORLD2_WIDTH } from '../art/town2/scale';
import { TOWN2_TILE } from '../art/town2/town';
import type { GameState } from '../core/state';
import { scaleFor, type SceneSize } from './scale';
import type { StageArt } from './stage';
import type { Scene } from './things';
import { centreOf, type Point } from './tileMap';
import { BOAT_LANDING2, TOWN2_START_CELL, town2Scene } from './town2';
import { FIGURE2_FEET, Hero2, town2Art, type Town2Art } from './town2Art';
import type { Size } from './camera';

/**
 * The C-scale town's scale: a world 360 art pixels across (3 device pixels an
 * art pixel on a 390-wide phone at 3x), at least 213 down (the current town's
 * 160, in proportion), and a little slack for a canvas trimmed to whole
 * pixels on a 2.625x phone. The app is never wider than 480 CSS pixels, so a
 * tablet at 2x or a desktop at 1x shows 480 art pixels across at one CSS
 * pixel each: the same size on screen as on a phone, a little more town.
 */
export const TOWN2_SCENE: SceneSize = { width: WORLD2_WIDTH, minHeight: 213, slack: 12 };

/** How far above the hero's feet the camera looks: the middle of a 64-pixel figure. */
const FOCUS_RISE2 = 30;

/** Where the hero first stands. */
export const START2: Point = centreOf(TOWN2_START_CELL, TOWN2_TILE);

/** Where the boat lands him back from a dungeon. */
export const LANDING2: Point = centreOf(BOAT_LANDING2, TOWN2_TILE);

let art: Town2Art | null = null;
let hero: Hero2 | null = null;

/** The hero at the C scale, dressed as the state says. */
export function wear2(state: GameState): void {
  hero ??= new Hero2();
  hero.wear(state);
}

/** An empty figure, for the moment before the hero can be painted. */
let empty: HTMLCanvasElement | null = null;
function nobody(): HTMLCanvasElement {
  empty ??= document.createElement('canvas');
  return empty;
}

/** What the stage is given to show the C-scale town. */
export function town2Stage(): {
  scene: Scene;
  art: StageArt;
  scaleOf: (device: Size) => number;
  focusRise: number;
} {
  art ??= town2Art();
  hero ??= new Hero2();
  const look = art;
  const me = hero;
  return {
    scene: town2Scene(),
    art: {
      still: look.still,
      standers: look.standers,
      shadowAt: look.shadowAt,
      life: look.life,
      heroFeet: FIGURE2_FEET,
      // Drawn in the held still's time of day, so he matches the town around him during a flip.
      walkerAt: (feet, facing, palette) =>
        me.at(feet, facing, look.held() ?? palette.name) ?? nobody(),
    },
    scaleOf: scaleFor(TOWN2_SCENE),
    focusRise: FOCUS_RISE2,
  };
}

/** The town's look, while it is shown. */
export function art2Now(): Town2Art | null {
  return art;
}

/** Lets every picture go and starts afresh. For tests. */
export function forget2(): void {
  art?.forget();
  art = null;
  hero = null;
}
