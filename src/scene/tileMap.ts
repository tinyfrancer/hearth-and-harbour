/**
 * A scene's ground as data: a grid of tile kinds, each of which says whether
 * it can be walked on. Nothing here looks at a picture, so the art can be
 * redrawn without moving a wall.
 */

/** The side of one tile, in art pixels. */
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
  return { width: map.cols * TILE, height: map.rows * TILE };
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

export function cellAt(point: Point): Cell {
  return { col: Math.floor(point.x / TILE), row: Math.floor(point.y / TILE) };
}

export function centreOf(cell: Cell): Point {
  return { x: cell.col * TILE + TILE / 2, y: cell.row * TILE + TILE / 2 };
}
