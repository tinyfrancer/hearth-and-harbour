import { FOES, foeGrid } from './grottoCast';
import { isPropId, propGrid } from './grottoProps';
import { GROTTO_TILES, isGrottoTileKind, wearOf } from './grottoTiles';
import { picture, type Picture } from './raster';

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

const foes = new Map<string, FoePicture>();

/** A monster's sprite by its id (`dock_rat`, `deckhand`, `brinebeard`), or null. */
export function foePicture(monsterId: string): FoePicture | null {
  if (!Object.hasOwn(FOES, monsterId)) return null;
  let made = foes.get(monsterId);
  if (!made) {
    const { grid, feet, glows } = foeGrid(FOES[monsterId]!);
    made = { picture: picture(grid, glows), feet };
    foes.set(monsterId, made);
  }
  return made;
}

const tiles = new Map<string, Picture>();

/**
 * A 16 x 16 floor or wall tile for a dungeon, by the dungeon's theme and the
 * tile's kind (the kinds each theme has are listed in `docs/lanes.md`).
 * `variant` asks for a different wear of the same kind, so a floor is not one
 * tile repeated; any whole number works and the same number gives the same tile.
 */
export function dungeonTile(theme: string, kind: string, variant = 0): Picture | null {
  if (theme !== 'grotto' || !isGrottoTileKind(kind)) return null;
  const def = GROTTO_TILES[kind];
  const wear = wearOf(variant, def.wears);
  const key = `${kind} ${wear}`;
  let made = tiles.get(key);
  if (!made) {
    made = picture(def.draw(wear));
    tiles.set(key, made);
  }
  return made;
}

/** Something standing in a dungeon room, with the row it meets the ground on. */
export interface PropPicture {
  picture: Picture;
  /** The row, from the top, where it meets the ground: sort standing things by it. */
  base: number;
}

const props = new Map<string, PropPicture>();

/** A prop by theme and id (`grotto`, `powder_keg`), or null. */
export function dungeonProp(theme: string, id: string): PropPicture | null {
  if (theme !== 'grotto' || !isPropId(id)) return null;
  let made = props.get(id);
  if (!made) {
    const { grid, base, glows } = propGrid(id);
    made = { picture: picture(grid, glows), base };
    props.set(id, made);
  }
  return made;
}
