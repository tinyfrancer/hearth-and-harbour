/**
 * A scene's ground as data: a grid of tile kinds, each of which says whether
 * it can be walked on. Nothing here looks at a picture, so the art can be
 * redrawn without moving a wall.
 */

/**
 * The side of one tile, in art pixels, unless a map says otherwise: the
 * current town and the dungeons. The C-scale town walks on 24-pixel tiles
 * (`TileMap.tile`).
 */
export const TILE = 16;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A tile's column and row. */
export interface Cell {
  readonly col: number;
  readonly row: number;
}

export interface TileKind {
  /** Solid tiles cannot be walked on or through. */
  readonly solid: boolean;
}

export interface TileMap<K extends string = string> {
  readonly cols: number;
  readonly rows: number;
  /** The kind of each tile, row by row. */
  readonly tiles: readonly (readonly K[])[];
  readonly kinds: Readonly<Record<K, TileKind>>;
  /** The side of one of its tiles, in art pixels: `TILE` when not given. */
  readonly tile?: number;
}

/** The side of one of a map's tiles, in art pixels. */
export function tileOf(map: Pick<TileMap, 'tile'>): number {
  return map.tile ?? TILE;
}

/**
 * Builds a map from rows of characters, one per tile, and a key from character
 * to kind. Rows must all be the same length, and every character must be in
 * the key: a typo in a room is an error, not a hole in a wall.
 */
export function parseMap<K extends string>(
  rows: readonly string[],
  key: Readonly<Record<string, K>>,
  kinds: Readonly<Record<K, TileKind>>,
): TileMap<K> {
  if (rows.length === 0) throw new Error('A map needs at least one row.');
  const cols = rows[0]!.length;
  const tiles = rows.map((line, row) => {
    if (line.length !== cols) {
      throw new Error(`Row ${row} is ${line.length} tiles wide; the first row is ${cols}.`);
    }
    return [...line].map((ch, col) => {
      const kind = key[ch];
      if (kind === undefined) throw new Error(`Unknown tile '${ch}' at column ${col}, row ${row}.`);
      return kind;
    });
  });
  return { cols, rows: rows.length, tiles, kinds };
}

/** The map's size in art pixels. */
export function mapSize(map: TileMap): { width: number; height: number } {
  const tile = tileOf(map);
  return { width: map.cols * tile, height: map.rows * tile };
}

export function inMap(map: TileMap, cell: Cell): boolean {
  return cell.col >= 0 && cell.row >= 0 && cell.col < map.cols && cell.row < map.rows;
}

/** Off the map counts as solid, so nothing walks out of it. */
export function isSolid(map: TileMap, cell: Cell): boolean {
  if (!inMap(map, cell)) return true;
  const kind = map.tiles[cell.row]![cell.col]!;
  return map.kinds[kind]!.solid;
}

/**
 * How near a tile's edge, in tiles, counts as on it: a point a rounding error
 * short of an edge is on the far side, so where someone stands exactly on an
 * edge (a reach from a tile's middle, say) never hangs on the last digit of a
 * sum, and the same ground at another scale gives the same tiles.
 */
export const EDGE = 1e-9;

/** The tile a point is on, for tiles `tile` art pixels on a side. */
export function cellAt(point: Point, tile = TILE): Cell {
  return { col: Math.floor(point.x / tile + EDGE), row: Math.floor(point.y / tile + EDGE) };
}

/** The middle of a tile, for tiles `tile` art pixels on a side. */
export function centreOf(cell: Cell, tile = TILE): Point {
  return { x: cell.col * tile + tile / 2, y: cell.row * tile + tile / 2 };
}
