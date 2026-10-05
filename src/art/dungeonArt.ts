import type { Picture } from './raster';

/**
 * Art for dungeons, asked for by plain id. Like the other doors, anything art
 * has not drawn yet is null, and the scene shows its own placeholder: a
 * dungeon can be built and played before its tiles and creatures exist.
 */

/** A creature or person to fight, drawn facing right, with where its feet stand. */
export interface FoePicture {
  picture: Picture;
  /** The point on the picture that stands on the ground, from its top-left. */
  feet: { x: number; y: number };
}

/** A monster's sprite by its id (`dock_rat`, `deckhand`, `brinebeard`), or null. */
export function foePicture(_monsterId: string): FoePicture | null {
  return null;
}

/**
 * A 16 x 16 floor or wall tile for a dungeon, by the dungeon's theme and the
 * tile's kind (the kinds each theme has are listed in `docs/lanes.md`).
 * `variant` asks for a different wear of the same kind, so a floor is not one
 * tile repeated; any whole number works and the same number gives the same tile.
 */
export function dungeonTile(_theme: string, _kind: string, _variant = 0): Picture | null {
  return null;
}

/** Something standing in a dungeon room, with the row it meets the ground on. */
export interface PropPicture {
  picture: Picture;
  /** The row, from the top, where it meets the ground: sort standing things by it. */
  base: number;
}

/** A prop by theme and id (`grotto`, `powder_keg`), or null. */
export function dungeonProp(_theme: string, _id: string): PropPicture | null {
  return null;
}
