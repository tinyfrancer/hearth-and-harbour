/*
 * The size of things in a dungeon, as data: how wide a world a phone on its
 * side shows (so how big an art pixel is), how big a tile is, and how many
 * art pixels each of today's distances becomes. Every distance in the
 * dungeon's rules (`battle.ts`, `foes.ts`, `dungeon.ts`) is written at the
 * first scale and passed through `far`; every tile through `DUNGEON.tile`.
 *
 * Today the dungeons are still at the first scale (`FIRST_SCALE`): a world
 * 270 across on 16-pixel tiles, everything exactly as it was. The C scale
 * the town moved to is `C_SCALE`: 360 across, 24-pixel tiles, every
 * distance half as long again, so a person crosses a room in the same time
 * and a heavy blow's mark is the same size against him. Moving the dungeons
 * to it is setting `DUNGEON` to `C_SCALE`, once their rooms are re-cut on the
 * new tiles and their art is drawn (the steps are in `docs/status/lane-c.md`).
 */
import { TOWN_SIZE, type SceneSize } from './scale';
import { TILE } from './tileMap';

export interface DungeonMetrics {
  /** The world a phone on its side shows across its short side, in art pixels. */
  readonly scene: SceneSize;
  /** A tile's side, in art pixels. */
  readonly tile: number;
  /** How many art pixels each first-scale art pixel of distance is. */
  readonly distance: number;
}

/** The first scale: what the dungeons have always been. */
export const FIRST_SCALE: DungeonMetrics = { scene: TOWN_SIZE, tile: TILE, distance: 1 };

/** The C scale, as the town has it: next wave's, not yet in force. */
export const C_SCALE: DungeonMetrics = {
  scene: { width: 360, minHeight: 213, slack: 12 },
  tile: 24,
  distance: 1.5,
};

/** The scale the dungeons are played at. */
export const DUNGEON: DungeonMetrics = FIRST_SCALE;

/** A first-scale distance (art pixels, or art pixels a second) at the dungeons' scale. */
export const far = (px: number): number => px * DUNGEON.distance;
