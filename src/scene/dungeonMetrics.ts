/*
 * The size of things in a dungeon, as data: how wide a world a phone on its
 * side shows (so how big an art pixel is), how big a tile is, and how many
 * art pixels each of today's distances becomes. Every distance in the
 * dungeon's rules (`battle.ts`, `foes.ts`, `dungeon.ts`) is written at the
 * first scale and passed through `far`; every tile through `DUNGEON.tile`.
 *
 * The dungeons are played at the C scale the town moved to (`C_SCALE`): a
 * world 360 across on 24-pixel tiles, every distance half as long again, so
 * a person crosses a room in the same time and a heavy blow's mark is the
 * same size against him. Every time stays as it was. The first scale
 * (`FIRST_SCALE`: 270 across, 16-pixel tiles) is kept as the numbers the
 * rules were written in: `far` turns them into this scale's.
 */
import { TOWN_SIZE, type SceneSize } from './scale';

export interface DungeonMetrics {
  /** The world a phone on its side shows across its short side, in art pixels. */
  readonly scene: SceneSize;
  /** A tile's side, in art pixels. */
  readonly tile: number;
  /** How many art pixels each first-scale art pixel of distance is. */
  readonly distance: number;
}

/** The first scale: what the dungeons have always been. */
export const FIRST_SCALE: DungeonMetrics = { scene: TOWN_SIZE, tile: 16, distance: 1 };

/** The C scale, as the town has it. */
export const C_SCALE: DungeonMetrics = {
  scene: { width: 360, minHeight: 213, slack: 12 },
  tile: 24,
  distance: 1.5,
};

/** The scale the dungeons are played at. */
export const DUNGEON: DungeonMetrics = C_SCALE;

/** A first-scale distance (art pixels, or art pixels a second) at the dungeons' scale. */
export const far = (px: number): number => px * DUNGEON.distance;
