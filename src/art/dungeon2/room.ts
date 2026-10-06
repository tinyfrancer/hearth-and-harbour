/**
 * A room of the grotto composed at the C scale from its tiles, props and
 * cast, as the gallery shows it: the art judged together, at dusk, at the
 * size it is played. Lane C lays out the real rooms; this is the art lane's
 * own test room and the reference for how the pieces sit together (which
 * rock is a face, which a top, what each tile is told of its neighbours).
 */
import { at, darker, stamp, tgrid, type Picture2, type TGrid } from '../town2/cells';
import type { Glow } from '../raster';
import {
  tile2Grid,
  TILE2,
  TILE2_WEARS,
  GROUND2_SHADOW,
  type Around,
  type Tile2Kind,
} from './tiles';

/** What each character in a room's rows is. `#` is rock: resolved to a face or a top by what is below it. */
const KEY: Readonly<Record<string, Tile2Kind | 'rock'>> = {
  '#': 'rock',
  '.': 'sand',
  ',': 'wet_sand',
  r: 'rock_floor',
  '~': 'shallows',
  '=': 'deep_water',
  p: 'planks',
  D: 'door_barred',
  O: 'door_open',
};

/** Open ground a wall's face looks out over: a floor or water, not a door (which is set in the face). */
const ground = (k: Tile2Kind | 'rock' | undefined) =>
  k !== undefined && k !== 'rock' && k !== 'door_barred' && k !== 'door_open';

/**
 * Every cell's tile kind. Rock with open ground (a floor, water or a door)
 * below it is the face (`wall_face`); rock above a face is the face's upper
 * half (`wall_face_high`), so a wall stands two tiles tall; all other rock is
 * the top (`wall_top`). The rule for lane C, in one place.
 */
export function roomKinds2(rows: readonly string[]): Tile2Kind[][] {
  const raw = rows.map((r) => [...r].map((ch) => KEY[ch] ?? 'rock'));
  const kinds: Tile2Kind[][] = raw.map((r) => r.map((k) => (k === 'rock' ? 'wall_top' : k)));
  for (let y = 0; y < raw.length; y++)
    for (let x = 0; x < raw[y]!.length; x++) {
      if (raw[y]![x] !== 'rock') continue;
      const below = raw[y + 1]?.[x];
      if (below === 'door_barred' || below === 'door_open') kinds[y]![x] = 'wall_face_high';
      else if (ground(below)) kinds[y]![x] = 'wall_face';
      else if (below === 'rock' && ground(raw[y + 2]?.[x])) kinds[y]![x] = 'wall_face_high';
    }
  return kinds;
}

/** What a cell's neighbours are, for `dungeonTile2`'s `around`. Off the map is rock. */
export function aroundOf(kinds: readonly (readonly string[])[], col: number, row: number): Around {
  const k = (dx: number, dy: number) => kinds[row + dy]?.[col + dx] ?? null;
  return {
    n: k(0, -1),
    s: k(0, 1),
    e: k(1, 0),
    w: k(-1, 0),
    ne: k(1, -1),
    nw: k(-1, -1),
    se: k(1, 1),
    sw: k(-1, 1),
  };
}

/** A cell's wear from its place, as a scene would choose it (mixed, so neighbours do not step through wears). */
export function wearAt(kind: Tile2Kind, col: number, row: number): number {
  let h = Math.imul(row * 97 + col * 31 + 7, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) % TILE2_WEARS[kind];
}

/** The room's ground: every tile joined to its neighbours. */
export function roomGround2(rows: readonly string[]): { grid: TGrid; kinds: Tile2Kind[][] } {
  const kinds = roomKinds2(rows);
  const g = tgrid(kinds[0]!.length * TILE2, kinds.length * TILE2);
  kinds.forEach((r, row) =>
    r.forEach((kind, col) =>
      stamp(
        g,
        tile2Grid(kind, wearAt(kind, col, row), aroundOf(kinds, col, row), { col, row }),
        col * TILE2,
        row * TILE2,
      ),
    ),
  );
  return { grid: g, kinds };
}

/** Something standing in a room: a picture, where its anchor is in it, and where it stands. */
export interface Stood {
  readonly picture: Picture2;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly x: number;
  readonly y: number;
  /** Half the width of its contact shadow, 0 for none (a thing in the air). */
  readonly shadow?: number;
  /** The row it sorts by, if not where it stands (a bird on a post sorts by the post's foot). */
  readonly sort?: number;
}

/**
 * The room composed: ground, contact shadows (the ground's own steps
 * darkened in an ellipse under each foot, as in town), then everything
 * standing sorted by where it stands, and every glow moved into the room.
 */
export function roomPicture2(rows: readonly string[], stood: readonly Stood[]): Picture2 {
  const { grid: g, kinds } = roomGround2(rows);
  for (const s of stood) {
    const rx = s.shadow ?? 0;
    if (!rx) continue;
    const kind = kinds[Math.floor(s.y / TILE2)]?.[Math.floor(s.x / TILE2)];
    const n = (kind && GROUND2_SHADOW[kind]) ?? 1;
    const ry = Math.max(2, Math.round(rx / 4));
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) {
        const d = (x / rx) ** 2 + (y / ry) ** 2;
        if (d > 1) continue;
        const px = s.x + x;
        const py = s.y + y;
        const c = at(g, px, py);
        if (c) g.d[py * g.w + px] = darker(c, d < 0.45 ? n : Math.max(1, n - 1));
      }
  }
  const glows: Glow[] = [];
  for (const s of [...stood].sort((a, b) => (a.sort ?? a.y) - (b.sort ?? b.y))) {
    const x0 = s.x - s.anchor.x;
    const y0 = s.y - s.anchor.y;
    stamp(g, s.picture.grid, x0, y0);
    for (const glow of s.picture.glows) glows.push({ ...glow, x: glow.x + x0, y: glow.y + y0 });
  }
  return { grid: g, glows };
}
